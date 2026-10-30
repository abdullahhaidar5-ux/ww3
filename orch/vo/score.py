import numpy as np,librosa,re,unicodedata
from speechmos import dnsmos
_W=None
def _w():
    global _W
    if _W is None:
        from faster_whisper import WhisperModel
        _W=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2)
    return _W
def norm(t):
    t=unicodedata.normalize('NFKC',t).lower()
    t=''.join(ch for ch in t if not unicodedata.category(ch).startswith(('P','Z','S','M')))
    return t
def cer(a,b):
    a,b=norm(a),norm(b)
    if not a: return 1.0
    d=list(range(len(b)+1))
    for i,ca in enumerate(a,1):
        p,d[0]=d[0],i
        for j,cb in enumerate(b,1):
            p,d[j]=d[j],min(d[j]+1,d[j-1]+1,p+(ca!=cb))
    return min(1.0,d[len(b)]/len(a))
def score(w,sr,lang,text):
    w=np.clip(np.asarray(w,dtype=np.float32),-1,1);w16=np.clip(librosa.resample(w,orig_sr=sr,target_sr=16000),-1,1)
    if len(w16)<16000: w16p=np.pad(w16,(0,16000-len(w16)))
    else: w16p=w16
    m=dnsmos.run(w16p,16000)
    wl={'zh-cn':'zh'}.get(lang,lang)
    segs,_=_w().transcribe(w16,language=wl,beam_size=1)
    hyp=''.join(s.text for s in segs)
    return dict(p808=float(m['p808_mos']),sig=float(m['sig_mos']),cer=cer(text,hyp),hyp=hyp)
def tough(w,sr):
    """toughness proxy: lower median pitch (Hz) + more vocal effort (energy 1-4 kHz vs 100-1000 Hz, dB) -> about -1..1"""
    w=np.asarray(w,dtype=np.float32)
    f0=librosa.yin(w,fmin=55,fmax=220,sr=sr,frame_length=2048,hop_length=256)
    rms=librosa.feature.rms(y=w,frame_length=2048,hop_length=256)[0]
    S=np.abs(librosa.stft(w,n_fft=1024,hop_length=256))**2;fr=librosa.fft_frequencies(sr=sr,n_fft=1024)
    n=min(len(f0),len(rms),S.shape[1]);v=rms[:n]>0.3*rms.max()
    f=float(np.median(f0[:n][v])) if v.any() else 150.0
    lo=S[(fr>=100)&(fr<1000)][:,:n][:,v].sum();hi=S[(fr>=1000)&(fr<4000)][:,:n][:,v].sum()
    tilt=float(10*np.log10((hi+1e-9)/(lo+1e-9)))
    t=0.5*float(np.clip((140-f)/40,-1,1))+0.5*float(np.clip((tilt+15)/10,-1,1))
    return dict(tough=t,f0=f,tilt=tilt)
