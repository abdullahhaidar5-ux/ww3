#!/usr/bin/env python3
"""Bake portraits: python3 bake.py people.json OUTDIR [ids...]  (needs `pip install bpy` + MakeHuman repo clone at $MHDATA).
Renders each person with Blender Cycles (bl/portrait.py), paints + frames it (bl/post.py) -> OUTDIR/<id>.webp (+ raw png)."""
import sys, os, json, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, HERE + '/bl')
import numpy as np
from PIL import Image
import spec as SP, portrait, post
NATC = {'IR': (.2, .5, .25), 'RS': (.9, .8, .1), 'DW': (.1, .45, .35), 'RV': (.25, .4, .25), 'US': (.2, .3, .6), 'RU': (.55, .15, .15), 'CN': (.7, .12, .1), 'KP': (.6, .1, .1), 'TR': (.7, .1, .1), 'IL': (.2, .4, .7), 'SA': (.1, .45, .2)}
def main():
    src, out = sys.argv[1], sys.argv[2]; ids = sys.argv[3:]
    os.makedirs(out, exist_ok=True); people = json.load(open(src)); seen = set()
    for p in people:
        if p['id'] in seen: continue
        seen.add(p['id'])
        if ids and p['id'] not in ids: continue
        s = SP.make(p); fn = re.sub(r'[^A-Za-z0-9_-]', '_', p['id'])
        raw = f'{out}/{fn}.png'
        if not os.path.exists(raw) or os.environ.get('REDO'):
            portrait.render(s, raw, res=(int(os.environ.get('RW', 480)), int(os.environ.get('RH', 600))), samples=int(os.environ.get('SPL', 32)))
        a = np.array(Image.open(raw).convert('RGBA'))
        nc = np.array(NATC.get(p['c'], (.5, .45, .3))); t = tuple(.13 + .22 * nc * (.6 + .4 * (nc.max() - nc) ) + np.random.default_rng(s['seed']).uniform(0, .04, 3))
        im = post.paint(a, t, tuple(x * .4 for x in t), seed=s['seed'], size=(336, 420), nation=NATC.get(p['c'], (.5, .45, .3)))
        im.save(f'{out}/{fn}.png.paint.png'); im.save(f'{out}/{fn}.webp', quality=82)
        print('baked', p['id'], flush=True)
if __name__ == '__main__': main()
