// builds orch/portraits/people.json: sample people (mixed nations/roles) from src/13l-people.js. usage: node make-people.mjs [N]
import fs from 'fs';import vm from 'vm';
const code='function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}function grRng(s){return mulberry((s|0)^0x5bd1e995)}var GC={seed:2026};function grNat(c){return {reg:"ME"}}'+fs.readFileSync(new URL('../../src/13l-people.js',import.meta.url),'utf8').split('/* Government tab')[0]+';this.api={pplRoster,pplName,pplGeneral}';
const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);const A=ctx.api;
const pick=[['IR','leader'],['RS','leader'],['DW','leader'],['KP','leader'],['SA','leader'],['US','leader'],['RU','leader'],['CN','leader'],['TR','leader'],['IL','leader'],['IR','heir'],['SA','heir'],['KP','heir'],['IR','m0'],['RS','m1'],['AE','leader'],['AE','heir'],['JP','leader'],['KR','m1'],['FR','m2'],['DE','leader'],['UA','m1'],['IN','leader'],['PK','m3'],['EG','leader'],['BR','m2'],['NG','leader'],['ID','m1'],['GB','m0'],['PL','m1'],['IQ','leader'],['SY','leader'],['JO','heir'],['KD','leader'],['AZ','leader'],['VN','leader'],['TH','m1'],['ET','leader'],['MX','m0'],['ZA','m2']];
const out=[];for(const [c,r] of pick){const R=A.pplRoster(c);let p=r==='leader'?R.leader:r==='heir'?R.heir:R.cab[+r[1]];if(p)out.push(JSON.parse(JSON.stringify(p)));}
// two generals each for a few
for(const [c,i] of [['IR',1],['RU',2],['US',3],['TR',4],['CN',5],['SA',6]]){out.push(JSON.parse(JSON.stringify(A.pplGeneral({id:i,o:c,nm:ctx.pplGenName(c,()=>0.37+i/20),lv:3+(i%2)}))));}
fs.writeFileSync(new URL('./people.json',import.meta.url),JSON.stringify(out));console.log(out.length,'people');
