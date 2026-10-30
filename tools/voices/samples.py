#!/usr/bin/env python3
"""Cut preview clips from vo/CODE.mp3 for Abdullah: orch/vo/samples/CODE-{select,attack,underfire}-SUFFIX.mp3
(first variant of select / attack / under fire). usage: python3 tools/voices/samples.py after RS DW IR"""
import sys, os, json, subprocess
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
suf = sys.argv[1]
for c in sys.argv[2:]:
    m = json.load(open(f'{R}/tools/voices/map/{c}.json'))
    for name, k in (('select', 0), ('attack', 2), ('underfire', 5)):
        o, d = m['l'][k][0]
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(o), '-t', str(d), '-i', f'{R}/vo/{c}.mp3', '-c:a', 'libmp3lame', '-b:a', '64k', f'{R}/orch/vo/samples/{c}-{name}-{suf}.mp3'], check=True)
    print(c, 'samples', suf)
