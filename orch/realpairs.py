import re,sys,collections
W=collections.defaultdict(float);G=collections.defaultdict(int)
for l in open(sys.argv[1],errors='ignore'):
    m=re.match(r'\s*#\s*\d+\s+(\w+) vs (\w+)\s+\w+\s+(.*)',l)
    if not m:continue
    a,b,r=m.groups();k=tuple(sorted((a,b)));G[k]+=1
    w=re.search(r'won by (\w+)',r)
    if w:W[k]+=1 if w.group(1)==k[0] else 0
    else:W[k]+=.5
for k in sorted(G):print(f"{k[0]}-{k[1]}: {k[0]} {W[k]/G[k]*100:.0f}% / {k[1]} {100-W[k]/G[k]*100:.0f}% ({G[k]} games)")
