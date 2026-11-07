#!/usr/bin/env python3
"""python3 manifest.py people.json ids.txt OUT.json  -- which pack asset each baked portrait used (needs $PACKS only for the skin pick)."""
import sys, os, json, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, HERE + '/bl')
import numpy as np, spec as SP, looks
P = {p['id']: p for p in json.load(open(sys.argv[1]))}; ids = [l.strip() for l in open(sys.argv[2]) if l.strip()]; M = {}
for i in ids:
    s = SP.make(P[i]); sk = looks.skin_for(s, np.random.default_rng(s['seed']))[0]
    M[i] = dict(file=re.sub(r'[^A-Za-z0-9_-]', '_', i) + '.webp', skin=os.path.basename(os.path.dirname(sk)) if sk else 'procedural',
                hair=s['hair'].get('proxy') or 'strand-' + s['hair']['style'], garment=s['cloth'].get('suitp') or s['cloth']['kind'], headgear=s.get('headgear'),
                brows='eyebrows01/mindfront_eyebrows_04', lashes='eyelashes01/mindfront_eyelashes_02')
json.dump(M, open(sys.argv[3], 'w'), indent=1); print(len(M), 'entries')
