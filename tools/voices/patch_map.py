#!/usr/bin/env python3
"""Rewrite the VO_MAP line in src/09-audio.js from tools/voices/map/*.json (cue offsets inside vo/CODE.mp3)."""
import json, glob, os, re, sys
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ALL = sorted(glob.glob(R + '/tools/voices/map/*.json'))
M = {os.path.basename(f)[:-5]: json.load(open(f)) for f in ALL if not f.endswith(('_r.json','_h.json','_s.json'))}
V = {os.path.basename(f)[:-7]: json.load(open(f)) for f in ALL if f.endswith('_r.json')}   # role clips: vo/CODE_r.mp3
p = R + '/src/09-audio.js'; s = open(p, encoding='utf-8').read()
line = 'const VO_MAP=' + json.dumps(M, ensure_ascii=False, separators=(',', ':')) + ';const VOB={};'
s2, n = re.subn(r'^const VO_MAP=.*;$', lambda m: line, s, count=1, flags=re.M)
assert n == 1
vl = 'const VOR=' + json.dumps(V, ensure_ascii=False, separators=(',', ':')) + ';'
if re.search(r'^const VOR=', s2, re.M): s2 = re.sub(r'^const VOR=.*;$', lambda m: vl, s2, count=1, flags=re.M)
else: s2 = s2.replace(line, line + '\n// Role clips (2026-11-03): vo/CODE_r.mp3, VOR[fac][role] = [select[], move[], attack[]] of [offset,len]; rendered by orch/vo/roles.py\n' + vl, 1)
H = {os.path.basename(f)[:-7]: json.load(open(f)) for f in ALL if f.endswith('_h.json')}   # radio/hero clips: vo/CODE_h.mp3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import radio_lines as RL
T = {c: {k: (lambda t: t[1] if isinstance(t, tuple) else t)((RL.R[c][k][0] or RL.R[c][k][2])[0]) for k in RL.KEYS} for c in RL.R}
rl = 'const VOH=' + json.dumps(H, ensure_ascii=False, separators=(',', ':')) + ';const RADT=' + json.dumps(T, ensure_ascii=False, separators=(',', ':')) + ';const RADE=' + json.dumps(RL.EN, ensure_ascii=False, separators=(',', ':')) + ';'
if re.search(r'^const VOH=', s2, re.M): s2 = re.sub(r'^const VOH=.*;$', lambda m: rl, s2, count=1, flags=re.M)
else: s2 = s2.replace(vl, vl + '\n// Commander radio + hero lines (2026-11-05): vo/CODE_h.mp3, VOH[fac][key] = [calm[], [], shout[]] of [offset,len]; RADT = subtitle text per nation, RADE = English; tools/voices/radio_lines.py\n' + rl, 1)
S = {os.path.basename(f)[:-7]: {k: v[2] for k, v in json.load(open(f)).items()} for f in ALL if f.endswith('_s.json')}   # soldier shouts: vo/CODE_s.mp3 (src/09c-shouts.js)
p2 = R + '/src/09c-shouts.js'; t = open(p2, encoding='utf-8').read(); t2, n2 = re.subn(r'^const VOS=.*;$', lambda m: 'const VOS=' + json.dumps(S, ensure_ascii=False, separators=(',', ':')) + ';', t, count=1, flags=re.M); assert n2 == 1; open(p2, 'w', encoding='utf-8').write(t2)
open(p, 'w', encoding='utf-8').write(s2); print('shout sheets:', len(S)); print('VO_MAP nations:', len(M), 'role sheets:', len(V), 'radio sheets:', len(H))
