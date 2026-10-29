# rank XTTS male studio speakers for one language: naturalness (DNSMOS p808), intelligibility (Whisper CER), pitch
import sys,json,librosa,numpy as np
from xt import synth,MALE
from score import score
lang=sys.argv[1];texts=json.loads(sys.argv[2])
CAND=json.loads(sys.argv[3]) if len(sys.argv)>3 else MALE
res=[]
for spk in CAND:
    P=[];C=[];F=[]
    for i,t in enumerate(texts):
        w,sr=synth(t,lang,spk,seed=i)
        r=score(w,sr,lang,t);P.append(r['p808']);C.append(r['cer'])
        f0=librosa.yin(w,fmin=60,fmax=300,sr=sr);F.append(float(np.median(f0)))
    res.append((spk,np.mean(P),np.mean(C),np.mean(F)))
    print('%-20s p808 %.2f cer %.2f f0 %.0f'%res[-1],flush=True)
json.dump(res,open('/home/claude/vowork/pick_'+lang+'.json','w'))
