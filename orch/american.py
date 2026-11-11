#!/usr/bin/env python3
"""American spelling in player-facing text (Abdullah 2026-11-10 'American').
   python3 orch/american.py           fix every string literal / template text in src/ in place (comments, code identifiers,
                                      html tag names/classes/ids and the kept proper names are left alone)
   python3 orch/american.py --check   only list what is left (exit 1 if anything); the same list guards orch/decisions.mjs
   Word list: orch/american.json. Safe to re-run after a merge."""
import re,sys,json,glob,os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
C=json.load(open(os.path.join(R,'orch','american.json')))
M=dict(C['map'])
for st in C['ise']:
    st=st.rstrip('_')
    for a,b in (('ise','ize'),('ised','ized'),('ises','izes'),('ising','izing'),('isation','ization'),('isations','izations'),('iser','izer'),('isers','izers')): M[st+a]=st+b
SUF=sorted(C['suffix'],key=len,reverse=True)
alt='|'.join(sorted(map(re.escape,M),key=len,reverse=True))
WRE=re.compile(r"(?<![A-Za-z0-9_#.$\\/-])(%s)(%s)(?![A-Za-z0-9_(=])"%(alt,'|'.join(map(re.escape,SUF))),re.I)
KEEP=C['keep'];OKATTR={'title','aria-label','placeholder','alt','data-tip','data-title','data-tt','label'}
def case(src,dst):
    if src.isupper() and len(src)>1:return dst.upper()
    if src[0].isupper():return dst[0].upper()+dst[1:]
    return dst
skipped=[]
def fix_text(s,where):
    if not re.search(r'\s',s) and not re.fullmatch(r'[A-Z][a-z]+',s):   # single tokens are usually keys (a Capitalised word is a label); listed for a human instead
        if WRE.search(s) and not any(k in s for k in KEEP): skipped.append((where,'single word',s[:60]))
        return s
    def rep(m):
        i=m.start()
        for k in KEEP:
            for km in re.finditer(re.escape(k),s):
                if km.start()<=i<km.end():return m.group(0)
        lt=s.rfind('<',0,i);gt=s.rfind('>',0,i)
        if lt>gt and lt+1<len(s) and re.match(r'[A-Za-z/]',s[lt+1]):
            am=re.search(r'([A-Za-z][\w-]*)\s*=\s*(\\?["\'])(?:(?!\2).)*$',s[lt:i],re.S)
            if not am or am.group(1).lower() not in OKATTR:
                skipped.append((where,'inside html tag',s[max(0,i-30):i+30]));return m.group(0)
        w=m.group(1);suf=m.group(2);d=M[w.lower()]
        return case(w,d)+suf
    return WRE.sub(rep,s)
TOK=re.compile(r"'(?:\\.|[^'\\\n])*'|\"(?:\\.|[^\"\\\n])*\"|`|/\*.*?\*/|//[^\n]*",re.S)
def code(t,where):
    out=[];i=0
    while True:
        m=TOK.search(t,i)
        if not m:out.append(t[i:]);break
        out.append(t[i:m.start()]);g=m.group(0)
        if g=='`':
            j=m.end();seg=[];buf=j
            while j<len(t) and t[j]!='`':
                if t[j]=='\\':j+=2;continue
                if t.startswith('${',j):
                    seg.append(fix_text(t[buf:j],where));d=1;k=j+2
                    while k<len(t) and d:
                        if t[k]=='`':   # nested template inside the expression: skip to its end (processed by recursion below)
                            k+=1
                            while k<len(t) and t[k]!='`':k+=2 if t[k]=='\\' else 1
                        elif t[k]=='{':d+=1
                        elif t[k]=='}':d-=1
                        k+=1
                    seg.append('${'+code(t[j+2:k-1],where)+'}');j=k;buf=k;continue
                j+=1
            if j>=len(t):out.append(t[m.start():]);break   # unterminated (a lone backtick in a regex/string): leave the rest alone
            seg.append(fix_text(t[buf:j],where));out.append('`'+''.join(seg)+'`');i=j+1;continue
        if g[0] in '\'"':out.append(g[0]+fix_text(g[1:-1],where)+g[0])
        else:out.append(g)
        i=m.end()
    return ''.join(out)
chk='--check' in sys.argv;left=0;changed=0
for f in sorted(glob.glob(os.path.join(R,'src','*.js'))):
    b=os.path.basename(f)
    if b in C['skipFiles']:continue
    t=open(f,encoding='utf8').read();n=code(t,b)
    if n!=t:
        if len(n.split('\n'))!=len(t.split('\n')):sys.exit('line count changed in '+b)
        if chk:
            for x,(a,c) in enumerate(zip(t.split('\n'),n.split('\n'))):
                if a!=c:
                    k=next((q for q in range(min(len(a),len(c))) if a[q]!=c[q]),0);left+=1;print(f'src/{b}:{x+1}: …{a[max(0,k-30):k+25]}…')
        else:open(f,'w',encoding='utf8').write(n);changed+=1
if '--skipped' in sys.argv:
    for w,why,s in skipped:print('SKIP',w,why,repr(s))
if chk:
    print('AMERICAN',('FAIL: %d lines'%left) if left else 'PASS');sys.exit(1 if left else 0)
print('american.py: %d files changed, %d spots left alone (--skipped lists them)'%(changed,len(skipped)))
