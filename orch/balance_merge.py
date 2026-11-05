#!/usr/bin/env python3
"""Merge balance.yml shard artifacts. usage: python3 orch/balance_merge.py <dir with bal-*-<id>/ folders or flat json/log files>"""
import json, glob, os, sys, subprocess, collections
d = sys.argv[1]
def files(prefix, ext='json'):
    return sorted(glob.glob(f'{d}/**/{prefix}*.{ext}', recursive=True))
def load(fs):
    out = []
    for f in fs:
        try: out += json.load(open(f))
        except Exception as e: print('skip', f, e)
    return out
def table(res, title):
    tab = collections.defaultdict(lambda: [0, 0.0, 0.0])
    lens = []
    for r in res:
        if r.get('result') == 'error' or 'facs' not in r: continue
        lens.append((r['t'] / 60, r['result']))
        for i, f in enumerate(r['facs']):
            t = tab[f]; t[0] += 1; t[2] += r['t'] / 60
            t[1] += 1 if r['winner'] == i else (.5 if r['winner'] < 0 else 0)
    print(f'\n== {title}: {len(res)} games, {sum(1 for r in res if r.get("result")=="error")} errors')
    for f, (g, w, l) in sorted(tab.items(), key=lambda x: -x[1][1] / x[1][0]):
        p = 100 * w / g; print(f'{f:3} {g:4}  {p:5.1f}%  avg {l/g:5.1f} min' + ('   <<<' if p < 40 or p > 60 else ''))
    kills = sorted(l for l, k in lens if k == 'kill')
    if lens:
        print(f'games decided by destruction {len(kills)}/{len(lens)}; median length {sorted(l for l,_ in lens)[len(lens)//2]:.1f} min; kills before 3 min: {sum(1 for l in kills if l<3)}; 12-25 min: {sum(1 for l in kills if 12<=l<=25)}')
    return tab
n = load(files('n')); h = load(files('h')); v = load(files('v'))
if n: table(n, 'Normal vs Normal')
if h: table(h, 'Hard vs Hard')
if v:
    w = g = 0
    for r in v:
        if r.get('result') == 'error' or 'diffs' not in r: continue
        g += 1; hi = r['diffs'].index(2); w += 1 if r['winner'] == hi else (.5 if r['winner'] < 0 else 0)
    print(f'\n== Hard vs Normal: Hard scored {w}/{g} = {100*w/max(1,g):.0f}%')
m = files('m')
if m:
    print('\n== map fairness'); print(subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'mapfair.mjs'), '--report'] + m, capture_output=True, text=True).stdout[-9000:])
for f in files('x', 'log') + files('x1', 'log'):
    print('\n==', f); print(open(f).read()[-2500:])
