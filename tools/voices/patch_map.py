#!/usr/bin/env python3
"""Rewrite the VO_MAP line in src/09-audio.js from tools/voices/map/*.json (cue offsets inside vo/CODE.mp3)."""
import json, glob, os, re
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ALL = sorted(glob.glob(R + '/tools/voices/map/*.json'))
M = {os.path.basename(f)[:-5]: json.load(open(f)) for f in ALL if not f.endswith('_r.json')}
V = {os.path.basename(f)[:-7]: json.load(open(f)) for f in ALL if f.endswith('_r.json')}   # role clips: vo/CODE_r.mp3
p = R + '/src/09-audio.js'; s = open(p, encoding='utf-8').read()
line = 'const VO_MAP=' + json.dumps(M, ensure_ascii=False, separators=(',', ':')) + ';const VOB={};'
s2, n = re.subn(r'^const VO_MAP=.*;$', lambda m: line, s, count=1, flags=re.M)
assert n == 1
vl = 'const VOR=' + json.dumps(V, ensure_ascii=False, separators=(',', ':')) + ';'
if re.search(r'^const VOR=', s2, re.M): s2 = re.sub(r'^const VOR=.*;$', lambda m: vl, s2, count=1, flags=re.M)
else: s2 = s2.replace(line, line + '\n// Role clips (2026-11-03): vo/CODE_r.mp3, VOR[fac][role] = [select[], move[], attack[]] of [offset,len]; rendered by orch/vo/roles.py\n' + vl, 1)
open(p, 'w', encoding='utf-8').write(s2); print('VO_MAP nations:', len(M), 'role sheets:', len(V))
