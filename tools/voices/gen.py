#!/usr/bin/env python3
"""python3 tools/voices/gen.py CODE [CODE...]  -> vo/CODE.mp3 + tools/voices/map/CODE.json (cue list for VO_MAP)."""
import sys, os, json, hashlib, subprocess, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import engines as E, phrases, voices
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(E.W, 'clips'); os.makedirs(CACHE, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'tools/voices/map'), exist_ok=True)
GAP = int(.10 * E.SR)

def clip(text, vs, tag):
    h = hashlib.md5((text + json.dumps(vs, sort_keys=True)).encode()).hexdigest()[:16]
    fn = f'{CACHE}/{h}.npy'
    if os.path.exists(fn): return np.load(fn)
    a = E.render(text, vs, seed=int(h[:6], 16))
    np.save(fn, a); return a

def pick(code, i, lang=None):
    v = voices.V[code]
    return v[lang] if isinstance(v, dict) else v[i % len(v)]

def build(code):
    pcs, offs = [], 0.0
    L, Cc = [], []
    def add(a):
        nonlocal offs
        o = offs; d = len(a) / E.SR
        pcs.append(a); pcs.append(np.zeros(GAP, np.float32)); offs += d + GAP / E.SR
        return [round(o, 3), round(d, 3)]
    for k, vars_ in enumerate(phrases.P[code]):
        L.append([add(clip(t if isinstance(t, str) else t[1], pick(code, i, None if isinstance(t, str) else t[0]), code)) for i, t in enumerate(vars_)])
    for k, vars_ in enumerate(phrases.C[code]):
        Cc.append([add(clip(t if isinstance(t, str) else t[1], pick(code, i + k, None if isinstance(t, str) else t[0]), code)) for i, t in enumerate(vars_)])
    while len(Cc) < 8: Cc.append([])
    a = np.concatenate(pcs)
    out = os.path.join(ROOT, 'vo', code + '.mp3'); tmp = f'{E.W}/{code}.wav'
    sf.write(tmp, a, E.SR)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-ac', '1', '-ar', str(E.SR), '-c:a', 'libmp3lame', '-b:a', '32k', out], check=True)
    json.dump({'l': L, 'c': Cc}, open(os.path.join(ROOT, 'tools/voices/map', code + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(code, f'{len(a)/E.SR:.1f}s', os.path.getsize(out) // 1024, 'KB', sum(len(x) for x in L), 'lines', sum(len(x) for x in Cc), 'cries', flush=True)

if __name__ == '__main__':
    for c in sys.argv[1:]: build(c)
