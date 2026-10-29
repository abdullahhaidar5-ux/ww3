// usage: node extract.mjs path/to/09-audio.js -> JSON of {PHR_FAC, FCRY, ...any other const object literals of phrase lists}
import fs from 'fs';
const s=fs.readFileSync(process.argv[2],'utf8');
const out={};
for(const name of (process.argv[3]||'PHR_FAC,FCRY').split(',')){
  const i=s.indexOf('const '+name+'=');if(i<0)continue;
  let j=s.indexOf('=',i)+1,d=0,k=j;for(;k<s.length;k++){const c=s[k];if(c==='{'||c==='[')d++;else if(c==='}'||c===']'){d--;if(d===0){k++;break;}}else if(c==="'"||c==='"'){const q=c;k++;while(s[k]!==q){if(s[k]==='\\')k++;k++;}}}
  out[name]=eval('('+s.slice(j,k)+')');}
console.log(JSON.stringify(out));
