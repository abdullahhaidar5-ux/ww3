#!/usr/bin/env python3
"""Deepen weak clips in place inside the vo sheets (same offsets/durations, so VO maps stay valid).
Weak = median F0 > F0_MAX or spectral centroid > CENT_MAX (from manly_measure.py). Fix = formant-preserving WORLD pitch-down toward
F0_TARGET (max 3 semitones), warmth shelf + brightness cut, soft compression, loudness back to the sheet's level.
usage: manly_fix.py MEAS.json CODE [CODE...]   (rewrites vo/CODE*.mp3, backups to /tmp/claude-0/vo_orig/)"""
import json, sys, os, subprocess, shutil, numpy as np, pyworld as pw, pyloudnorm as pl
from scipy.signal import butter, sosfilt
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 24000; F0_MAX = 115; CENT_MAX = 2400; F0_TARGET = 95; MAX_ST = 3.0; BR = '40k'
def load(p): return np.frombuffer(subprocess.run(['ffmpeg','-v','quiet','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True).stdout,dtype=np.float32).copy()
def save(y,p):
    subprocess.run(['ffmpeg','-v','quiet','-y','-f','f32le','-ar',str(SR),'-ac','1','-i','-','-b:a',BR,p],input=y.astype(np.float32).tobytes(),check=True)
def shelf(y, f, g_db, hi=False):
    sos = butter(2, f/(SR/2), 'high' if hi else 'low', output='sos'); a = 10**(g_db/20)-1
    return y + a*sosfilt(sos, y)
def fix(y, f0m, cent):
    x = y.astype(np.float64); n = len(x)
    st = 0.0
    if f0m and f0m > F0_MAX: st = min(MAX_ST, 12*np.log2(f0m/F0_TARGET))
    if st > 0.2:
        f0, t = pw.harvest(x, SR, f0_floor=60, f0_ceil=400, frame_period=5.0)
        sp = pw.cheaptrick(x, f0, t, SR); ap = pw.d4c(x, f0, t, SR)
        x = pw.synthesize(f0/2**(st/12), sp, ap, SR, 5.0)[:n]
        if len(x) < n: x = np.pad(x, (0, n-len(x)))
        x = shelf(x, 220, 2.0)             # low-mid warmth
    if cent > CENT_MAX: x = shelf(x, 2800, -3.0, hi=True)
    # light compression
    e = np.abs(x); thr = 0.25; g = np.where(e > thr, (thr + (e-thr)/3)/np.maximum(e,1e-9), 1.0); x = x*g
    return x, st
if __name__ == '__main__':
    meas = json.load(open(sys.argv[1])); meter = pl.Meter(SR); rep = {}
    os.makedirs('/tmp/claude-0/vo_orig', exist_ok=True)
    for code in sys.argv[2:]:
        for suf in ['','_r','_h']:
            name = f'{code}{suf}'; ap = f'{R}/vo/{name}.mp3'
            keys = [k for k in meas if k.split(':')[0] == name and ((meas[k]['f0'] and meas[k]['f0'] > F0_MAX) or meas[k]['cent'] > CENT_MAX)]
            if not keys: continue
            shutil.copy(ap, f'/tmp/claude-0/vo_orig/{name}.mp3'); y = load(ap); done = 0
            for k in keys:
                m = meas[k]; a, b = int(m['off']*SR), int((m['off']+m['len'])*SR); seg = y[a:b]
                try: l0 = meter.integrated_loudness(seg)
                except Exception: l0 = None
                z, st = fix(seg, m['f0'], m['cent'])
                if l0 and l0 > -50:
                    try: z = z*10**((l0 - meter.integrated_loudness(z.astype(np.float32)))/20)
                    except Exception: pass
                z = np.clip(z, -0.98, 0.98); fi = min(120, len(z)//4)
                w = np.ones(len(z)); w[:fi] = np.linspace(0,1,fi); w[-fi:] = np.linspace(1,0,fi)   # fade edges to hide splice
                y[a:b] = seg*(1-w) + z*w; done += 1; rep[k] = round(float(st),2)
            save(y, ap); print(name, 'fixed', done, 'of', len(keys), flush=True)
    json.dump(rep, open('/tmp/claude-0/fix_rep_%s.json' % sys.argv[2], 'w'))
