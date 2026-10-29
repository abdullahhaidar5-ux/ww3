#!/usr/bin/env python3
"""Round-trip check: decode vo/CODE.mp3, cut each cue with map/CODE.json, transcribe with Whisper-small, compare to the
intended text (fuzzy). Flags clips that do not sound like their text. Offline QA tool."""
import sys, os, json, subprocess, difflib, re, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phrases
from transformers import pipeline
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LANG = dict(US='en', EU=None, TR='tr', IL='he', UA='uk', RU='ru', IR='fa', SA='ar', AE='ar', EG='ar', RS='ar', DW='ar', PK='ur', IN='hi', CN='zh', KR='ko', KP='ko', CU='es')
EUL = dict(fr='fr', de='de', en='en')
asr = pipeline('automatic-speech-recognition', model='openai/whisper-small', device=-1)
norm = lambda s: re.sub(r'[\W_]+', '', s.lower())
for code in sys.argv[1:]:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{ROOT}/vo/{code}.mp3', '-ar', '16000', '-ac', '1', f'/tmp/claude-0/w/v_{code}.wav'], check=True)
    a, sr = sf.read(f'/tmp/claude-0/w/v_{code}.wav'); m = json.load(open(f'{ROOT}/tools/voices/map/{code}.json'))
    sc = []; bad = []
    for grp, src in (('l', phrases.P[code]), ('c', phrases.C[code])):
        for k, vs in enumerate(src):
            for i, t in enumerate(vs):
                lang = LANG[code] or EUL[t[0]]; txt = t if isinstance(t, str) else t[1]
                o, d = m[grp][k][i]; seg = a[int(o * sr): int((o + d) * sr)].astype(np.float32)
                r = asr({'raw': seg, 'sampling_rate': sr}, generate_kwargs={'language': lang, 'task': 'transcribe'})['text']
                s = difflib.SequenceMatcher(None, norm(txt), norm(r)).ratio(); sc.append(s)
                if s < .45: bad.append((grp, k, i, txt, r.strip(), round(s, 2)))
    print(code, 'mean match', round(float(np.mean(sc)), 2), 'weak', len(bad), '/', len(sc), flush=True)
    for b in bad: print('   ', b, flush=True)
