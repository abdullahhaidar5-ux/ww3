# audition XTTS male studio speakers for toughness: per language, 2 lines (combat shout + terse reply) in combat delivery
# -> naturalness (DNSMOS p808), read-back (Whisper CER), median pitch, vocal effort; writes /home/claude/vowork/aud_<lang>.json
import sys,json
from xt import synth,MALE
from score import score,tough
lang=sys.argv[1];texts=json.loads(sys.argv[2]);CAND=json.loads(sys.argv[3]) if len(sys.argv)>3 else MALE
res=[]
for spk in CAND:
    P=[];C=[];T=[];F=[]
    for i,t in enumerate(texts):
        w,sr=synth(t,lang,spk,temp=0.85,speed=1.12,seed=i+1)
        r=score(w,sr,lang,t);g=tough(w,sr);P.append(r['p808']);C.append(r['cer']);T.append(g['tough']);F.append(g['f0'])
    res.append(dict(spk=spk,p808=sum(P)/len(P),cer=sum(C)/len(C),tough=sum(T)/len(T),f0=sum(F)/len(F)))
    print('%-20s p808 %.2f cer %.2f tough %.2f f0 %.0f'%tuple(res[-1].values()),flush=True)
json.dump(res,open('/home/claude/vowork/aud_'+lang+'.json','w'))
