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
