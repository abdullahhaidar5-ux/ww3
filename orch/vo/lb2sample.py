#!/usr/bin/env python3
"""orch/out-lb2/sample.mp3 for Abdullah's phone (voices-lb2): the same 8 kinds of RS line - select, move, attack x2, unit ready,
base attacked, under fire, the 'Labbayk ya Hussein' war cry - first Saturday's voices (2026-11-14 sheet = what main plays now),
one beep, then the new re-record. usage: python3 orch/vo/lb2sample.py OLD_RS.mp3 OLD_RS.json  (new = vo/RS.mp3 + map)"""
import sys, os, json, subprocess, numpy as np, librosa, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 24000
PICK = [('l', 0, 0), ('l', 1, 0), ('l', 2, 0), ('l', 2, 1), ('l', 3, 0), ('l', 4, 0), ('l', 5, 0), ('c', 2, 0)]

def block(mp3, mp):
    a, _ = librosa.load(mp3, sr=SR); m = json.load(open(mp)); out = []
    for g, k, i in PICK:
        t, d = m[g][k][i]; out += [a[int(t * SR):int((t + d) * SR)], np.zeros(int(.3 * SR), np.float32)]
    return np.concatenate(out)

old = block(sys.argv[1], sys.argv[2])
new = block(os.path.join(ROOT, 'vo', 'RS.mp3'), os.path.join(ROOT, 'tools', 'voices', 'map', 'RS.json'))
n = int(.25 * SR); beep = (0.35 * np.sin(2 * np.pi * 1000 * np.arange(n) / SR)).astype(np.float32)
f = int(.01 * SR); beep[:f] *= np.linspace(0, 1, f); beep[-f:] *= np.linspace(1, 0, f)
w = np.concatenate([np.zeros(int(.2 * SR), np.float32), old, np.zeros(int(.3 * SR), np.float32), beep, np.zeros(int(.6 * SR), np.float32), new])
os.makedirs(os.path.join(ROOT, 'orch', 'out-lb2'), exist_ok=True)
tmp = '/tmp/lb2sample.wav'; sf.write(tmp, w, SR)
dst = os.path.join(ROOT, 'orch', 'out-lb2', 'sample.mp3')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', dst], check=True)
print(dst, round(len(w) / SR, 1), 's (old', round(len(old) / SR, 1), 's, new', round(len(new) / SR, 1), 's)')
