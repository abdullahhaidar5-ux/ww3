# extract player-visible-ish string literals from src (strip // and /* */ comments first), print file:line:string
import re,sys,glob
out=[]
for f in sorted(glob.glob('src/*.js')):
    t=open(f,encoding='utf8').read()
    # blank comments, keep newlines
    def blank(m):
        s=m.group(0)
        if s.startswith('/*') or s.startswith('//'): return re.sub(r'[^\n]',' ',s)
        return s
    t=re.sub(r"'(?:\\.|[^'\\\n])*'|\"(?:\\.|[^\"\\\n])*\"|`(?:\\.|[^`\\])*`|/\*.*?\*/|//[^\n]*",blank,t,flags=re.S)
    for m in re.finditer(r"'((?:\\.|[^'\\\n])*)'|\"((?:\\.|[^\"\\\n])*)\"|`((?:\\.|[^`\\])*)`",t,flags=re.S):
        s=m.group(1) or m.group(2) or m.group(3) or ''
        if len(s)<8 or ' ' not in s: continue
        if re.search(r'[{};=]|^\s*[.#]|px|rgba?\(|function|=>',s) and not re.search(r'[a-z]{3,} [a-z]{3,} [a-z]{3,}',s): continue
        ln=t.count('\n',0,m.start())+1
        out.append((f,ln,s.replace('\n',' ')))
for f,ln,s in out: print(f"{f}:{ln}:{s}")
