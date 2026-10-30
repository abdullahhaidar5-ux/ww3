# pick tough casts from audition results (/home/claude/vowork/aud_<lang>.json): rank p808 + 0.8*tough - 2*cer,
# give nations sharing a language different soldier voices where possible; commander = next best
import json,sys
c=json.load(open('cast.json'))
def rank(l): return [x['spk'] for x in sorted(json.load(open('/home/claude/vowork/aud_'+l+'.json')),key=lambda x:-(x['p808']+0.8*x['tough']-2*x['cer']))]
def put(nats,l,n):
    r=rank(l);i=0
    for f in nats:
        sold=r[i:i+n];i+=n;cmd=r[i%len(r)]
        yield f,sold,cmd
for f,s,m in put(['KR','KP'],'ko',2): c[f].update(sold=s,cmd=m)
for f,s,m in put(['CN'],'zh-cn',3): c[f].update(sold=s,cmd=m)
for f,s,m in put(['CU'],'es',3): c[f].update(sold=s,cmd=m)
for l in ('fr','de','en'):
    r=rank(l); r=[x for x in r if l!='en' or x not in c['US']['sold']]
    c['EU']['sold'][l]=r[:2]; c['EU']['cmd'][l]=r[2]
json.dump(c,open('cast.json','w'),indent=1,ensure_ascii=False)
for k in ('KR','KP','CN','CU','EU'): print(k,c[k]['sold'],c[k]['cmd'])
