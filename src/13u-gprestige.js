// GREAT POWERS + PRESTIGE (lane G, B8 first cut). Prestige = score + 4/ally + 5/achievement + 3/mission (read-only formula, no new stored meter).
// The top 8 majors are the Great Powers (GC.gp, recomputed each turn); entering/leaving is news; great powers get a small war-support bonus through the ONE modifier engine.
const GP_N=8;
function gpPrestige(c){const N=GC.nat[c];if(!N||N.dead)return 0;return grScore(c)+4*gdAllies(c).length+5*((GC.ach&&GC.ach[c])||[]).length+3*((GC.mis&&GC.mis[c]&&GC.mis[c].done)||0);}
function gpRank(){const l=Object.keys(GC.nat).filter(c=>!GC.nat[c].dead&&grNat(c).major).map(c=>[c,gpPrestige(c)]);l.sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1));return l;}
function gpTurn(){if(!GC||!GC.nat)return;const r=gpRank(),top=r.slice(0,GP_N).map(x=>x[0]),old=GC.gp||null;
  if(old){for(const c of top)if(!old.includes(c)){grLog(gdNatName(c)+' rises to Great Power status.',c);if(c===GC.me)try{gevToast(['👑 You are now a Great Power']);}catch(e){}}for(const c of old)if(!top.includes(c))grLog(gdNatName(c)+' falls out of the Great Powers.',c);}
  GC.gp=top;}
GMOD_COND.great=(k)=>!!(GC&&GC.gp&&GC.gp.includes(k));
GMOD_ROWS.push({id:'gp_bonus',src:'Great Power',scope:'nation',stat:'warSupport',add:.03,cond:'great'});
npTab('gp','👑','Great powers',(code,body)=>{const r=gpRank();body.innerHTML='<div style="margin-bottom:8px">The top '+GP_N+' nations by prestige are Great Powers (+3% war support). Prestige = score + allies + achievements + missions.</div>';
  npTable(body,['#','Nation','Prestige','Status'],r.slice(0,24).map(([c,v],i)=>({c,k:v,cells:[i+1,'<b>'+gdNatName(c)+(c===GC.me?' ◀':'')+'</b>',v,i<GP_N?'<span style="color:#ffe6a8">Great Power</span>':'Major']})),x=>{NP.code=x.c;npDraw();});});
