// Friend-night playtest kit (queue item [qa], 2026-11-11).
//   node orch/playtest-digest.mjs --card      refresh the in-game Playtest card (src/08n-playtest.js) from the newest lines of
//                                             orch/HISTORY.md (10 things to try; at most 2 per branch). Then: python3 orch/build.py
//   node orch/playtest-digest.mjs [dir]       read the files friends sent back (ww3-playtest-*.json from the Playtest card and
//                                             ww3-report-*.json from Report a problem; default dir orch/playtest-in/) and write
//                                             the ranked top-10 list to orch/reports/playtest.md for the next night's queue.
//   node orch/playtest-digest.mjs --selftest  checks both paths on made-up files; prints PLAYTEST PASS / FAIL
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', '08n-playtest.js');
const A = '/*PLAYTEST-ITEMS*/', B = '/*PLAYTEST-END*/';
const idOf = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 8);

// ---- card: newest HISTORY lines -> 10 items ("YYYY-MM-DD text — branch")
export function pickItems(history, n = 10) {
  // HISTORY.md is append-only and written by many hands: "2026-11-10 text — orch/branch", "- branch 2026-11-08: text", "- branch: text".
  const out = [], per = {}, seen = new Set(); let date = '';
  const lines = history.split('\n').map(l => l.replace(/^[-*]\s+/, '').trim()).filter(l => l && !l.startsWith('#'));
  const dates = lines.map(l => { const m = /\d{4}-\d\d-\d\d/.exec(l.slice(0, 60)); if (m) date = m[0]; return date; });
  for (let li = lines.length - 1; li >= 0 && out.length < n; li--) {
    let l = lines[li], br = '';
    const tail = /\s+[—–-]+\s+(orch\/[\w.+-]+|[\w.+-]+)\s*$/.exec(l); if (tail) { br = tail[1]; l = l.slice(0, tail.index); }
    l = l.replace(/^\d{4}-\d\d-\d\d(\s+\d\d:\d\dZ?)?\s+/, '');
    const head = /^([^:]{1,48}):\s+/.exec(l.replace(/(\d\d):(\d\dZ?)/, '$1.$2'));   // "tag date time:" / "tag #1 (name) hash:" / "Tag:"
    if (head) { const h = head[1], w = h.trim().split(/\s+/).length; if (/\d{4}-\d\d-\d\d/.test(h) || w === 1 || (w <= 4 && /[#(\d]/.test(h))) { br = br || h; l = l.slice(head[0].length); } }
    br = (br.replace(/\(?\d{4}-\d\d-\d\d\)?|\d\d:\d\dZ?|#\w+/g, '').trim().split(/\s+/)[0] || '?').replace(/^orch\//, '');
    if (Date.parse(date) - Date.parse(dates[li]) > 7 * 864e5) break;                                  // this week only
    l = l.replace(/\s*\([^()]*(src\/|orch\/|\.m?js\b|[A-Z]{3,}_[A-Z]|\b[0-9a-f]{7,}\b)[^()]*\)/g, '');   // drop technical asides
    if (/NOT on main|not on main|[Nn]o code|note only|not reproduce|game untouched|CLAUDE\.md|audit\b|[Hh]andoff|workflow|gate\/|\bCI\b|re-baselin|draw calls|goes green|src\/|orch\/|\.m?js\b|[A-Z]{3,}_[A-Z]/.test(l)) continue;   // nothing a player can try
    let text = l.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 200) { const cut = text.slice(0, 200), e = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; ')); text = e > 70 ? cut.slice(0, e) : cut.replace(/\s+\S*$/, '') + '...'; }
    text = text.replace(/[.;,:]$/, ''); text = text[0].toUpperCase() + text.slice(1);
    const k = text.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/).slice(-4).join(' ');
    if (text.length < 30 || seen.has(k) || (per[br] = (per[br] || 0) + 1) > 2) continue; seen.add(k);
    out.push({ id: idOf(text), text, date: dates[li] });
  }
  return out;
}
export function writeCard(items, file = SRC) {
  const s = fs.readFileSync(file, 'utf8'); const i = s.indexOf(A), j = s.indexOf(B);
  if (i < 0 || j < i) throw new Error('markers not found in ' + file);
  const week = items.length ? items[0].date : '';
  const body = `\nconst PLAYTEST_WEEK=${JSON.stringify(week)};\nconst PLAYTEST_ITEMS=[\n` +
    items.map(x => ' ' + JSON.stringify([x.id, x.text]).replace(/<\/script/gi, '<\\/script')).join(',\n') + '];\n';
  fs.writeFileSync(file, s.slice(0, i + A.length) + body + s.slice(j));
}

// ---- digest: returned files -> ranked list
export function digest(files) {
  const it = {}, probs = []; let cards = 0;
  for (const f of files) {
    if (!f || typeof f !== 'object') continue;
    if (f.kind === 'ww3-playtest' && Array.isArray(f.items)) { cards++;
      for (const x of f.items) { if (!x || !x.id) continue; const r = it[x.id] || (it[x.id] = { text: String(x.text || ''), up: 0, down: 0, notes: [] });
        if (x.vote > 0) r.up++; else if (x.vote < 0) r.down++;
        const n = String(x.note || '').replace(/\s+/g, ' ').trim().slice(0, 200); if (n) r.notes.push((x.vote < 0 ? '(down) ' : x.vote > 0 ? '(up) ' : '') + n); }
      for (const e of f.errors || []) probs.push('error seen: ' + String(e).slice(0, 160)); }
    else if (f.kind === 'ww3-problem-report') { const t = String(f.text || '').replace(/\s+/g, ' ').trim(); if (t) probs.push(t.slice(0, 200) + (f.state ? ' [' + String(f.state).slice(0, 80) + ']' : '')); }
  }
  // most thumbs down first, then most notes, then fewest thumbs up; untouched items go last
  const rank = Object.values(it).filter(r => r.up + r.down + r.notes.length > 0)
    .sort((a, b) => (b.down - a.down) || (b.notes.length - a.notes.length) || (a.up - b.up) || a.text.localeCompare(b.text)).slice(0, 10);
  return { cards, rank, probs: [...new Set(probs)].slice(0, 20), untried: Object.values(it).filter(r => r.up + r.down + r.notes.length === 0).map(r => r.text) };
}
export function report(d, when) {
  const md = s => String(s).replace(/[|<>`*_\[\]]/g, ' ').replace(/\s+/g, ' ').trim();   // notes are friends' text: plain words only
  let s = `# Playtest digest — ${when}\n\nFrom ${d.cards} playtest card${d.cards === 1 ? '' : 's'} (made by \`node orch/playtest-digest.mjs\`; newest run replaces this file).\n` +
    'Ranked for the next night\'s queue: most thumbs down first, then most notes.\n\n';
  if (!d.cards && !d.probs.length) return s + 'No playtest files yet. Friends save one from Extras → Playtest card and send it to Abdullah; put them in `orch/playtest-in/`.\n';
  d.rank.forEach((r, i) => { s += `${i + 1}. [ ] **${r.down} down / ${r.up} up** — ${md(r.text)}\n`; for (const n of r.notes.slice(0, 6)) s += `   - ${md(n)}\n`; });
  if (d.probs.length) { s += '\n## Problems reported\n'; for (const p of d.probs) s += `- ${md(p)}\n`; }
  if (d.untried.length) { s += '\n## Nobody tried\n'; for (const t of d.untried) s += `- ${md(t)}\n`; }
  return s;
}
function readDir(dir) { const out = []; if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort()) { try { const s = fs.statSync(path.join(dir, n)); if (s.size > 8e6) continue; out.push(JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'))); } catch { } }
  return out; }

const arg = process.argv[2] || '';
if (arg === '--card') {
  const items = pickItems(fs.readFileSync(path.join(ROOT, 'orch', 'HISTORY.md'), 'utf8'));
  if (items.length < 10) { console.log('only ' + items.length + ' usable HISTORY lines - card not changed'); process.exit(1); }
  writeCard(items); console.log('Playtest card: 10 items, week of ' + items[0].date); for (const x of items) console.log(' - ' + x.text.slice(0, 110));
} else if (arg === '--selftest') {
  const fails = [], ck = (c, m) => { if (!c) fails.push(m); };
  const hist = Array.from({ length: 30 }, (_, i) => `2026-11-${String(10 + (i % 2)).padStart(2, '0')} A player can now try in a battle the new thing number ${i} — orch/b${i % 6}`).join('\n') + '\n2026-11-11 CI: gate fix — orch/x\n';
  const items = pickItems(hist); ck(items.length === 10, 'pickItems gave ' + items.length); ck(new Set(items.map(x => x.id)).size === 10, 'ids not unique');
  ck(!items.some(x => /gate fix/.test(x.text)), 'a CI line got on the card'); ck(items[0].text.includes('number 29'), 'newest line is not first');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-')); const f = path.join(tmp, 'c.js'); fs.writeFileSync(f, `x\n${A}\nold\n${B}\ny\n`); writeCard(items, f);
  const w = fs.readFileSync(f, 'utf8'); ck(w.startsWith('x\n') && w.endsWith(B + '\ny\n') && !w.includes('old') && w.includes('PLAYTEST_ITEMS=['), 'writeCard broke the file');
  const mk = (v, notes) => ({ kind: 'ww3-playtest', items: items.map((x, i) => ({ id: x.id, text: x.text, vote: v[i] | 0, note: notes[i] || '' })) });
  const d = digest([mk([1, -1, -1], ['', 'tank stuck | <b>']), mk([1, -1, 0, 1], []), { kind: 'ww3-problem-report', text: 'crash on start', state: 'menu' }, null, { kind: 'other' }]);
  ck(d.cards === 2 && d.rank.length === 4, 'digest counted ' + d.cards + ' cards, ' + d.rank.length + ' ranked'); ck(d.rank[0].down === 2 && d.rank[0].text === items[1].text, 'most thumbs-down is not first');
  ck(d.untried.length === 6 && d.probs.length === 1, 'untried/problems wrong');
  const r = report(d, 'test'); ck(/1\. \[ \] \*\*2 down \/ 0 up\*\*/.test(r) && r.includes('crash on start') && !r.includes('<b>'), 'report text wrong');
  ck(report(digest([]), 'test').includes('No playtest files yet'), 'empty report wrong');
  // the shipped card itself: 10 items, each with an id and readable text
  const m = /PLAYTEST_ITEMS=(\[[\s\S]*?\]);\n/.exec(fs.readFileSync(SRC, 'utf8')); let live = []; try { live = JSON.parse(m[1]); } catch { }
  ck(live.length === 10 && live.every(x => /^[0-9a-f]{8}$/.test(x[0]) && x[1].length >= 20), 'src/08n-playtest.js does not hold 10 items (run --card): ' + live.length);
  for (const x of fails) console.log('FAIL: ' + x); console.log(fails.length ? 'PLAYTEST FAIL' : 'PLAYTEST PASS'); process.exit(fails.length ? 1 : 0);
} else {
  const dir = path.resolve(arg || path.join(ROOT, 'orch', 'playtest-in')); const d = digest(readDir(dir));
  const out = path.join(ROOT, 'orch', 'reports', 'playtest.md'); fs.writeFileSync(out, report(d, new Date().toISOString().slice(0, 10)));
  console.log(`playtest digest: ${d.cards} cards, ${d.rank.length} ranked, ${d.probs.length} problems -> orch/reports/playtest.md`);
}
