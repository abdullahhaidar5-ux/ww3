#!/usr/bin/env python3
"""Portrait tool, step 1: morph the MakeHuman base head/shoulders (CC0) to each person's race mix / gender / age.
Usage: mhmorph.py DATA_DIR specs.json out.json    (DATA_DIR: base.obj + <race>-<gender>-<young|old>.target from
https://github.com/makehumancommunity/makehuman/tree/master/makehuman/data , fetched by orch/portraits/fetch.sh)
Only used at build time; the game ships the baked sprites, not the meshes."""
import json, sys, numpy as np
D, SP, OUT = sys.argv[1].rstrip('/') + '/', sys.argv[2], sys.argv[3]
V = []; F = []; body = False; cur = None; EYE = {'l': [], 'r': []}
for ln in open(D + 'base.obj'):
    if ln.startswith('g '):
        cur = ln.strip()[2:]; body = cur == 'body'
    elif ln.startswith('v '): V.append([float(x) for x in ln.split()[1:4]])
    elif ln.startswith('f '):
        idx = [int(t.split('/')[0]) - 1 for t in ln.split()[1:]]
        if body: F.append(idx)
        elif cur in ('joint-l-eye', 'joint-r-eye'): EYE[cur[6]] += idx
V = np.array(V); T = {}
def tgt(r, g, a):
    k = (r, g, a)
    if k not in T:
        d = np.zeros_like(V)
        for ln in open(f'{D}{r}-{g}-{a}.target'):
            if ln[0] == '#' or not ln.strip(): continue
            p = ln.split(); d[int(p[0])] = [float(x) for x in p[1:4]]
        T[k] = d
    return T[k]
keep = np.where(V[:, 1] > 5.2)[0]; remap = -np.ones(len(V), int); remap[keep] = np.arange(len(keep))
Fk = [[int(remap[i]) for i in f] for f in F if all(remap[i] >= 0 for i in f)]
out = {'F': Fk, 'meshes': {}}
for s in json.load(open(SP)):
    old = min(1, max(0, (s['age'] - 25) / 65)); P = V.copy(); g = s['gender']
    for r, wr in s['race'].items():
        for gn, wg in (('male', g), ('female', 1 - g)):
            for an, wa in (('young', 1 - old), ('old', old)):
                w = wr * wg * wa
                if w > 0: P += w * tgt(r, gn, an)
    eyes = {k: P[sorted(set(v))].mean(0).round(4).tolist() for k, v in EYE.items()}
    out['meshes'][s['id']] = {'P': P[keep].round(4).flatten().tolist(), 'eyeL': eyes['l'], 'eyeR': eyes['r']}
json.dump(out, open(OUT, 'w'))
print('meshes', len(out['meshes']), 'verts', len(keep), 'faces', len(Fk))
