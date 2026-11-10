// Extracts every player-visible-looking string literal from src/ into orch/out/strings.txt (file:line<TAB>text) for proofreading.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=[];
const lit=/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
for(const f of fs.readdirSync(path.join(R,'src')).filter(f=>f.endsWith('.js')).sort()){
  fs.readFileSync(path.join(R,'src',f),'utf8').split('\n').forEach((l,i)=>{
    const t=l.trim();if(t.startsWith('//')||t.startsWith('/*')||t.startsWith('*'))return;
    const c=l.replace(/\/\/ .*$/,'');let m;lit.lastIndex=0;
    while((m=lit.exec(c))){const s=(m[1]??m[2]??m[3]).replace(/<[^>]+>/g,'');if(/[A-Za-z]{3,} [A-Za-z]{2,}/.test(s)&&s.length>=8&&!/[{}();=]/.test(s.slice(0,20)))out.push(f+':'+(i+1)+'\t'+s.slice(0,300));}});}
fs.writeFileSync(path.join(R,'orch/out/strings.txt'),out.join('\n')+'\n');console.log(out.length,'strings');
