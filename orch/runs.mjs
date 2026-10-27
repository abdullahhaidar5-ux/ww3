// Per-run screenshot folders for the test harnesses (smoke.mjs, mpsync.mjs, migrate.mjs).
// Every run writes its screenshots to its own folder, orch/out/runs/<timestamp>-<name>/, so two runs back to back (or
// side by side) never overwrite each other. Each finished screenshot is also copied to orch/out/<file>, the "latest"
// path that ORCH, ORCH.md and other tooling already look at. Only the newest KEEP run folders are kept.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'orch', 'out');
export const RUNS = path.join(OUT, 'runs');
export const KEEP = 10;

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').replace(/\..*/, '');

// Make this run's folder and prune old ones. Returns { dir, rel, file(name), save(page, name, opts) }.
export function newRun(name) {
  fs.mkdirSync(RUNS, { recursive: true });
  let dir, n = 0;
  do dir = path.join(RUNS, `${stamp()}-${name}${n ? '-' + n : ''}`); while (fs.existsSync(dir) && ++n);
  fs.mkdirSync(dir, { recursive: true });
  pruneRuns();
  const rel = path.relative(ROOT, dir);
  return {
    dir, rel,
    file: f => path.join(dir, f),
    // screenshot into the run folder, then refresh orch/out/<f> (a failed screenshot throws, as page.screenshot does)
    async save(page, f, opts = {}) {
      const p = path.join(dir, f);
      await page.screenshot({ ...opts, path: p });
      latest(p, f);
    },
  };
}

// copy a run file to orch/out/<f> (the stable "latest" path)
export function latest(src, f) {
  try { fs.copyFileSync(src, path.join(OUT, f)); } catch {}
}

export function pruneRuns(keep = KEEP) {
  let ds;
  try { ds = fs.readdirSync(RUNS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort(); } catch { return; }
  for (const d of ds.slice(0, Math.max(0, ds.length - keep))) {
    try { fs.rmSync(path.join(RUNS, d), { recursive: true, force: true }); } catch {}
  }
}
