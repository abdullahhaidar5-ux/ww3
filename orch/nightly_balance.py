#!/usr/bin/env python3
"""Nightly balance report. usage: nightly_balance.py <dir with shard json files> <reports-dir> [--date YYYY-MM-DD]
Writes <reports-dir>/balance-latest.md, appends to <reports-dir>/balance-history.json, and writes <reports-dir>/issue.md
(the body for the single 'Balance: nations outside 45-55%' issue; empty file when everyone is inside the band)."""
import json, glob, sys, os, collections, datetime
src, out = sys.argv[1], sys.argv[2]
date = sys.argv[sys.argv.index('--date') + 1] if '--date' in sys.argv else datetime.date.today().isoformat()
os.makedirs(out, exist_ok=True)
res = []
for f in sorted(glob.glob(f'{src}/**/*.json', recursive=True)):
    try: res += [r for r in json.load(open(f)) if isinstance(r, dict)]
    except Exception as e: print('skip', f, e)
tab = collections.defaultdict(lambda: [0, 0.0])
errs = 0
for r in res:
    if r.get('result') == 'error' or 'facs' not in r: errs += r.get('result') == 'error'; continue
    for i, f in enumerate(r['facs']):
        tab[f][0] += 1
        tab[f][1] += 1 if r['winner'] == i else (.5 if r['winner'] < 0 else 0)
rows = sorted(((f, g, 100 * w / g) for f, (g, w) in tab.items() if g), key=lambda x: -x[2])
off = [(f, g, p) for f, g, p in rows if p < 45 or p > 55]
md = [f'# Nightly balance report ({date})', '',
      f'Conquest, Balanced mode, Normal AI, AI vs AI, {len(res)} games ({errs} errors). Battle mode and Realistic are not covered by the headless tourney yet (see orch/HANDOFF-safetyH.md).', '',
      '| Nation | Games | Win % | |', '|---|---|---|---|']
for f, g, p in rows: md.append(f'| {f} | {g} | {p:.1f} | {"outside 45-55" if (p<45 or p>55) else ""} |')
open(f'{out}/balance-latest.md', 'w').write('\n'.join(md) + '\n')
hp = f'{out}/balance-history.json'
hist = json.load(open(hp)) if os.path.exists(hp) else []
hist = [h for h in hist if h.get('date') != date] + [{'date': date, 'games': len(res), 'errors': errs, 'win': {f: round(p, 1) for f, _, p in rows}}]
json.dump(hist[-60:], open(hp, 'w'), indent=0)
open(f'{out}/issue.md', 'w').write('' if not off else
    f'Nightly run {date}: {len(off)} nation(s) outside 45-55% overall win rate ({len(res)} games).\n\n' +
    '\n'.join(f'- {f}: {p:.1f}% ({g} games)' for f, g, p in off) + '\n\nFull table: `orch/reports/balance-latest.md` on the `reports` branch.\n')
print(f'{len(res)} games, {len(off)} outside the band')
