// Machine-wide gate for the headless-browser tests (smoke.mjs, mpsync.mjs).
// Parallel agents in different worktrees share one machine; two SwiftShader Chromiums at once can run it out of memory
// and get each other's runs OOM-killed. So each test takes this lock before it starts its browser and waits its turn.
//
// The lock is a file created atomically (O_EXCL) holding the owner's PID. A lock whose PID is no longer running is
// stale and gets taken over. Released on exit, on errors and on Ctrl-C / kill. `--no-lock` skips it.
// (Deliberately NOT /tmp/ww3-browser.lock: agents wrap runs in `flock /tmp/ww3-browser.lock`, and sharing that file
// would make this inner lock wait on the outer one forever.)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const LOCK = process.env.WW3_BROWSER_LOCK || path.join(os.tmpdir(), 'ww3-browser-gate.lock');
const TAKE = LOCK + '.takeover';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const readPid = f => { try { return parseInt(fs.readFileSync(f, 'utf8'), 10) || 0; } catch { return -1; } }; // -1: gone
const ageMs = f => { try { return Date.now() - fs.statSync(f).mtimeMs; } catch { return 0; } };

let held = false;
function release() {
  if (!held) return;
  held = false;
  try { if (readPid(LOCK) === process.pid) fs.unlinkSync(LOCK); } catch {}
}

// Waits until this process holds the lock. Returns immediately if `--no-lock` is on the command line.
export async function acquireBrowserLock(tag = path.basename(process.argv[1] || 'test')) {
  if (process.argv.includes('--no-lock')) { console.log(`browser lock: skipped (--no-lock)`); return; }
  process.on('exit', release);
  for (const [sig, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]])
    process.on(sig, () => { release(); process.exit(code); });
  const t0 = Date.now();
  let lastMsg = -Infinity, lastHolder = 0;
  for (;;) {
    try {
      fs.writeFileSync(LOCK, `${process.pid}\n${tag} ${process.cwd()}\n`, { flag: 'wx' });
      held = true;
      if (Date.now() - t0 > 1000) console.log(`browser lock: acquired after ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      return;
    } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const pid = readPid(LOCK);
    if (pid === -1) continue; // released between our attempt and the read: retry now
    // pid 0: file exists but empty/unreadable (owner mid-write, or a crash mid-write long ago)
    const stale = pid ? !alive(pid) : ageMs(LOCK) > 10000;
    if (stale) {
      // only one waiter may clear a stale lock, or a second one could delete the first one's fresh lock
      try {
        fs.writeFileSync(TAKE, String(process.pid), { flag: 'wx' });
        try { if (readPid(LOCK) === pid) { fs.unlinkSync(LOCK); console.log(`browser lock: took over stale lock from dead pid ${pid || '?'}`); } }
        finally { fs.unlinkSync(TAKE); }
        continue;
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        if (ageMs(TAKE) > 30000) try { fs.unlinkSync(TAKE); } catch {}
      }
    } else if (pid !== lastHolder || Date.now() - lastMsg > 30000) {
      lastHolder = pid; lastMsg = Date.now();
      let who = ''; try { who = fs.readFileSync(LOCK, 'utf8').split('\n')[1] || ''; } catch {}
      console.log(`waiting for browser lock held by pid ${pid}${who ? ` (${who})` : ''} — ${LOCK}`);
    }
    await sleep(1000 + Math.random() * 500);
  }
}

// Peak resident memory of this process plus all its descendants (the Chromium processes), sampled every 2 s from
// /proc. Linux only; returns null elsewhere. Call the returned function at the end for the peak in MB.
export function watchPeakMemory() {
  if (process.platform !== 'linux') return () => null;
  let peak = 0;
  const sample = () => {
    try {
      const kids = new Map();
      for (const d of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(d)) continue;
        try {
          const st = fs.readFileSync(`/proc/${d}/stat`, 'utf8');
          const ppid = +st.slice(st.lastIndexOf(')') + 2).split(' ')[1];
          if (!kids.has(ppid)) kids.set(ppid, []);
          kids.get(ppid).push(+d);
        } catch {}
      }
      let kb = 0;
      const todo = [process.pid];
      while (todo.length) {
        const p = todo.pop();
        try { const m = /VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${p}/status`, 'utf8')); if (m) kb += +m[1]; } catch {}
        todo.push(...(kids.get(p) || []));
      }
      peak = Math.max(peak, kb);
    } catch {}
  };
  sample();
  const iv = setInterval(sample, 2000); iv.unref();
  return () => { sample(); clearInterval(iv); return Math.round(peak / 1024); };
}
