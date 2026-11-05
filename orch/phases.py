import json,sys
d=json.load(open(sys.argv[1]));a=d['all'];n=len(a)
idx=sorted(range(n),key=lambda i:-a[i])
med=sorted(a)[n//2]
print('frames',n,'median %.0f'%med,'max %.0f'%max(a))
print('phase: median / p95 / max ms')
for k,v in d['P'].items():
    s=sorted(v);print('  %-10s %6.1f %6.1f %6.1f'%(k,s[n//2],s[int(n*.95)],s[-1]))
print('worst 8 frames (ms: biggest phases)')
for i in idx[:8]:
    ph=sorted(((d['P'][k][i],k) for k in d['P']),reverse=True)[:3]
    print('  #%d %.0f  '%(i,a[i])+', '.join('%s %.0f'%(k,v) for v,k in ph))
