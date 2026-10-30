#!/usr/bin/env python3
"""Clarity check of a shipped clip sheet: Whisper read-back error (CER, lower = clearer) of every clip in vo/CODE.mp3
at a git revision, with its VO_MAP from src/09-audio.js at the same revision.
usage: python3 tools/voices/clarity.py REV CODE [CODE...]     (REV e.g. HEAD or 456eeb9)"""
import sys, os, json, re, subprocess, tempfile, numpy as np, librosa
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'orch', 'vo')); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from score import score
import phrases as ph
LANG = dict(US='en', TR='tr', IL='he', UA='uk', RU='ru', IR='fa', SA='ar', AE='ar', EG='ar', RS='ar', DW='ar', PK='ur',
            IN='hi', CN='zh', KR='ko', KP='ko', CU='es')
rev = sys.argv[1]
js = subprocess.run(['git', '-C', R, 'show', f'{rev}:src/09-audio.js'], capture_output=True, text=True, check=True).stdout
M = json.loads(re.search(r'const VO_MAP=(\{.*?\});const VOB', js).group(1))
for c in sys.argv[2:]:
    with tempfile.NamedTemporaryFile(suffix='.mp3') as f:
        f.write(subprocess.run(['git', '-C', R, 'show', f'{rev}:vo/{c}.mp3'], capture_output=True, check=True).stdout); f.flush()
        w, _ = librosa.load(f.name, sr=16000)
    E = []
    for g, src in (('l', ph.P[c]), ('c', ph.C[c])):
        for k, vs in enumerate(src):
            got = M[c][g][k]
            if len(got) != len(vs):   # a dropped variant shifts the list: skip this kind
                continue
            for (o, d), t in zip(got, vs):
                lang, txt = (t if isinstance(t, (list, tuple)) else (LANG[c], t))
                E.append(score(w[int(o * 16000):int((o + d) * 16000)], 16000, lang, txt)['cer'])
    print(c, rev, 'clips', len(E), 'mean CER', round(float(np.mean(E)), 3), 'clear(<=.3)', round(float(np.mean(np.array(E) <= .3)), 2), flush=True)
