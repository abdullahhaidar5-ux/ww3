# audition Piper/MMS voices for toughness in tough delivery: python3 aud_piper.py fa '["text",...]' '["piper:fa_IR-amir-medium",...]'
import sys,json,numpy as np
import render as R
lang=sys.argv[1];texts=json.loads(sys.argv[2]);V=json.loads(sys.argv[3])
for v in V:
    eng,voice=v.split(':',1);P=[];C=[];T=[];F=[]
    for i,t in enumerate(texts):
        w=R.trim(R.synth(eng,voice,lang,t,0,'cry' if t.endswith('!') else 'sold'))
        r=R.score(w,R.SR,lang,t);g=R.tough(w,R.SR);P.append(r['p808']);C.append(r['cer']);T.append(g['tough']);F.append(g['f0'])
    print('%-32s p808 %.2f cer %.2f tough %.2f f0 %.0f'%(v,np.mean(P),np.mean(C),np.mean(T),np.mean(F)),flush=True)
