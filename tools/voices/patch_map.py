#!/usr/bin/env python3
"""Rewrite the VO_MAP line in src/09-audio.js from tools/voices/map/*.json (cue offsets inside vo/CODE.mp3)."""
import json, glob, os, re
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = {os.path.basename(f)[:-5]: json.load(open(f)) for f in sorted(glob.glob(R + '/tools/voices/map/*.json'))}
p = R + '/src/09-audio.js'; s = open(p, encoding='utf-8').read()
line = 'const VO_MAP=' + json.dumps(M, ensure_ascii=False, separators=(',', ':')) + ';const VOB={};'
s2, n = re.subn(r'^const VO_MAP=.*;$', lambda m: line, s, count=1, flags=re.M)
assert n == 1; open(p, 'w', encoding='utf-8').write(s2); print('VO_MAP nations:', len(M))
