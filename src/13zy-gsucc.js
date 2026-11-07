// RG30 Leader succession (Lane G): heads of state age, step down or die. In autocracies and monarchies the designated heir takes
// over (an orderly transfer, a small dip in war support); with no heir a new leader comes to power after a sudden transfer (a bigger
// dip). Democracies change leaders by election (13zw), and IR/RS/DW/KP/RV run through their own leader systems (13v-gleader, 13zp).
// Effects are GMOD rows + the event log; the new person comes from the same people generator (fictional names).
const SUC_HAZ=1/300;            // about one transfer per 25 years of a single nation's rule (monthly chance)
const SUC_SKIP=['IR','RS','DW','KP','RV'];
function sucMonth(){if(!GC||!GC.nat||typeof pplRoster!=='function')return;
  const alive=Object.keys(GC.nat).filter(c=>!GC.nat[c].dead&&true).sort();
  for(const c of alive){const R=grRng((GC.seed|0)*613+GC.turn*29+c.charCodeAt(0)*7+c.charCodeAt(1));const hit=R()<SUC_HAZ;
    if(!hit||SUC_SKIP.includes(c)||(typeof elIsDem==='function'&&elIsDem(c)))continue;sucRun(c,R);}}
function sucRun(c,R){const r=pplRoster(c);if(!r||!r.leader)return;const old=r.leader,used={};const orderly=!!r.heir;
  if(orderly){r.leader=r.heir;r.heir=null;}else r.leader=pplMakePerson(c,'leader',0,R,'Head of state',used);
  if(PPL_HEIR[c])r.heir=pplMakePerson(c,'heir',0,R,PPL_HEIR[c],used);
  gmodAdd({id:'suc_'+c+'_'+GC.turn,src:'Succession',scope:'nation',stat:'warSupport',add:orderly?-.02:-.05,t:c,until:GC.turn+6});
  const S=GC.suc||(GC.suc={n:0});S.n=(S.n|0)+1;
  grLog(pplName(old)+' has left office. '+pplName(r.leader)+(orderly?' takes over as the designated successor.':' takes power after a sudden transfer, with no designated heir.'),c);}
GMOD_HOOKS.push(sucMonth);
