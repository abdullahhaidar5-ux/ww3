# naturalness (DNSMOS P.808) + toughness of a nation's packed clips, from vo/<F>.mp3 and VO_MAP in src/09-audio.js
import sys,os,json,re,subprocess,numpy as np
from speechmos import dnsmos
import librosa
from score import tough
R=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
s=open(os.path.join(R,'src/09-audio.js'),encoding='utf-8').read()
M=json.loads(re.search(r'const VO_MAP=(\{.*?\});const VOB',s).group(1))
out={}
for f in sys.argv[1:]:
    w,_=librosa.load(os.path.join(R,'vo',f+'.mp3'),sr=16000)
    P=[];T=[];F=[];TL=[]
    for g in M[f].values():
        for kind in g:
            for a,d in kind:
                c=w[int(a*16000):int((a+d)*16000)]
                if len(c)<1600: continue
                P.append(dnsmos.run(np.pad(c,(0,max(0,16000-len(c)))),16000)['p808_mos'])
                t=tough(c,16000);T.append(t["tough"]);F.append(t["f0"]);TL.append(t["tilt"])
    out[f]=dict(p808=round(float(np.mean(P)),2),tough=round(float(np.mean(T)),2),f0=round(float(np.median(F))),n=len(P),tilt=round(float(np.mean(TL)),1))
    print(f,out[f],flush=True)
