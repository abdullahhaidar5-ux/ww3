#!/usr/bin/env python3
"""Measure every voice clip (sheets vo/CODE.mp3, _r role, _h radio): median F0, spectral centroid, LUFS, duration. Flags weak clips.
usage: manly_measure.py OUT.json [CODE ...]"""
import json, sys, glob, os, subprocess, numpy as np, parselmouth, librosa, pyloudnorm as pl
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 22050
def load(p):
    r = subprocess.run(['ffmpeg','-v','quiet','-i',p,'-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True)
    return np.frombuffer(r.stdout,dtype=np.float32)
def cues(m):
    def walk(x, path):
        if isinstance(x,list) and len(x)==2 and all(isinstance(v,(int,float)) for v in x): yield path,x
        elif isinstance(x,list):
            for i,v in enumerate(x): yield from walk(v,path+[i])
        elif isinstance(x,dict):
            for k,v in x.items(): yield from walk(v,path+[k])
    return list(walk(m,[]))
def meas(y, meter):
    if len(y)<SR*0.15: return None
    snd = parselmouth.Sound(y.astype(np.float64), SR)
    pt = snd.to_pitch(time_step=0.01, pitch_floor=60, pitch_ceiling=300)
    f = pt.selected_array['frequency']; f = f[f>0]
    f0 = float(np.median(f)) if len(f)>=5 else None
    c = float(np.median(librosa.feature.spectral_centroid(y=y,sr=SR)))
    try: l = float(meter.integrated_loudness(y))
    except Exception: l = None
    return dict(f0=f0, cent=c, lufs=l, dur=len(y)/SR, voiced=int(len(f)))
out = {}; meter = pl.Meter(SR)
codes = sys.argv[2:] or sorted({os.path.basename(f)[:2] for f in glob.glob(R+'/vo/*.mp3')})
for code in codes:
    for suf in ['','_r','_h']:
        mp = f'{R}/tools/voices/map/{code}{suf}.json'; ap = f'{R}/vo/{code}{suf}.mp3'
        if not (os.path.exists(mp) and os.path.exists(ap)): continue
        y = load(ap); m = json.load(open(mp))
        for path,(o,d) in cues(m):
            r = meas(y[int(o*SR):int((o+d)*SR)], meter)
            if r: out[f'{code}{suf}:'+'/'.join(map(str,path))] = dict(r, off=o, len=d)
    print(code, flush=True)
    json.dump(out, open(sys.argv[1],'w'))
