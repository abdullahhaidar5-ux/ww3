#!/usr/bin/env python3
"""Auto-balancer step (Lane D4). One hill-climbing nudge of the per-nation cost factor BAL[nation]['_'] in src/01-data.js.
usage: python3 orch/autobalance.py <dir with aitourney n*.json / h*.json shards> [--apply] [--step 0.04] [--min-games 40]
Win rate above 50% -> that nation's units get dearer, below -> cheaper: new = old * (1 + 0.5*(wr-0.5)*2*k) clipped to +-step.
Only the '_' (all-units) factor moves, so every tier is treated identically; no extra money for anyone. Nations with too few
games are left alone. Without --apply it only prints the table. Needs no model tokens: a human reviews the final table in the PR."""
import json, glob, re, sys, collections, os
args = sys.argv[1:]
if not args: sys.exit(__doc__)
d = args[0]
apply_ = '--apply' in args
def opt(name, default):
    return float(args[args.index(name) + 1]) if name in args else default
STEP, MING = opt('--step', 0.04), int(opt('--min-games', 40))
src = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', '01-data.js')
rows = []
for f in sorted(glob.glob(f'{d}/**/[nh]*.json', recursive=True)):
    try: rows += json.load(open(f))
    except Exception as e: print('skip', f, e)
tab = collections.defaultdict(lambda: [0, 0.0])
for r in rows:
    if r.get('result') == 'error' or 'facs' not in r: continue
    for i, fac in enumerate(r['facs']):
        t = tab[fac]; t[0] += 1; t[1] += 1 if r['winner'] == i else (.5 if r['winner'] < 0 else 0)
text = open(src, encoding='utf-8').read()
m = re.search(r'^const BAL=(\{.*\});\s*$', text, re.M)
if not m: sys.exit('BAL line not found')
bal = json.loads(m.group(1))
print(f'{len(rows)} games; step cap {STEP:.0%}, min {MING} games per nation')
changed = 0
for fac, (g, w) in sorted(tab.items(), key=lambda x: -x[1][1] / x[1][0]):
    wr = w / g
    if g < MING or fac not in bal:
        print(f'{fac:3} {g:4} {wr:6.1%}  skipped ({"few games" if g < MING else "no BAL row"})'); continue
    old = bal[fac].get('_', 1.0)
    new = round(old * (1 + max(-STEP, min(STEP, (wr - .5) * 0.5))), 3)
    if abs(wr - .5) < .03: new = old  # dead band: within 3 points is noise
    print(f'{fac:3} {g:4} {wr:6.1%}  _ {old} -> {new}')
    if new != old: bal[fac]['_'] = new; changed += 1
if apply_ and changed:
    line = 'const BAL=' + json.dumps(bal, separators=(',', ':')) + ';'
    open(src, 'w', encoding='utf-8').write(text[:m.start()] + line + text[m.end():])
    print(f'wrote {changed} changes to src/01-data.js (run python3 orch/build.py next)')
