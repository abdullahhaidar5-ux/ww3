// THE ONE MODIFIER ENGINE (lane B2.5, EU4-style). Every grand-map bonus/penalty from ideas, estates, stability, war support, rallies,
// morale-style perks, named battles, war economy, inflation, corruption, autonomy... is a ROW here — never a new code path.
//   row = {id, src:'Zealous fervour', scope:'nation'|'army'|'province', stat:'warSupport', add:0.1 | mul:1.25, cond:'style:zeal', t:target, until:month}
//   static rows live in GMOD_ROWS (code, conditions by name); temporary/event rows live in GC.mod (saved with the campaign, deterministic).
//   gmod(scope,obj,stat,base=0)  -> (base+sum add)*product mul     gmodLines(scope,obj,stat) -> ['+10% from Zealous fervour', ...]
// obj = nation code | army object | province index.  Cached per month; gmodMonth(m) is the ONE monthly hook (expiry + cache reset).
const GMOD_COND={
  always:()=>true,
  style:(k,arg)=>{try{const n=grNat(k);return (MORALE_STYLE[n.fac]||MORALE_STYLE[k])===arg;}catch(e){return false;}}};
const GMOD_ROWS=[
  {id:'sty_zeal',src:'Zealous fervor',scope:'nation',stat:'warSupport',add:.10,cond:'style:zeal'},
  {id:'sty_prof',src:'Professional officers',scope:'nation',stat:'rallySpeed',mul:1.25,cond:'style:prof'},
  {id:'sty_home',src:'Home defenders',scope:'nation',stat:'homeMorale',mul:1.4,cond:'style:home'},
  {id:'sty_fire',src:'Firepower doctrine',scope:'nation',stat:'fireSupport',mul:1.1,cond:'style:fire'}];
const GMOD_HOOKS=[];   // monthly systems register here (ideas/power points, later stability, war support...): GMOD_HOOKS.push(fn)
const GMOD_C={m:-1,g:null,cache:new Map()};
function gmodKey(scope,obj){return scope==='army'?(obj&&(obj.id!==undefined?obj.id:obj.nm)):obj;}
function gmodCond(row,key){if(row.t!==undefined&&row.t!==key)return false;const c=row.cond||'always';const i=c.indexOf(':');const f=GMOD_COND[i<0?c:c.slice(0,i)];if(!f)return false;try{return !!f(key,i<0?'':c.slice(i+1));}catch(e){return false;}}
function gmodRows(scope,obj,stat){const key=gmodKey(scope,obj),out=[];
  for(const r of GMOD_ROWS)if(r.scope===scope&&(!stat||r.stat===stat)&&gmodCond(r,key))out.push(r);
  if(GC&&GC.mod)for(const r of GC.mod)if(r.scope===scope&&(!stat||r.stat===stat)&&(r.until===undefined||r.until>=GC.turn)&&gmodCond(r,key))out.push(r);
  return out;}
function gmod(scope,obj,stat,base){base=base||0;if(GMOD_C.g!==GC){GMOD_C.g=GC;GMOD_C.cache.clear();}const ck=scope+'|'+gmodKey(scope,obj)+'|'+stat+'|'+base,hit=GMOD_C.cache.get(ck);if(hit!==undefined)return hit;
  let a=0,m=1;for(const r of gmodRows(scope,obj,stat)){if(r.add)a+=r.add;if(r.mul)m*=r.mul;}const v=(base+a)*m;GMOD_C.cache.set(ck,v);return v;}
function gmodLines(scope,obj,stat){return gmodRows(scope,obj,stat).map(r=>(r.add?(r.add>0?'+':'')+Math.round(r.add*100)+'%':'x'+r.mul)+' from '+r.src+(r.until!==undefined?' (until month '+r.until+')':''));}
function gmodAdd(row){if(!GC)return;if(!GC.mod)GC.mod=[];GC.mod=GC.mod.filter(r=>r.id!==row.id);GC.mod.push(row);GMOD_C.cache.clear();}
function gmodRemove(id){if(!GC||!GC.mod)return;GC.mod=GC.mod.filter(r=>r.id!==id);GMOD_C.cache.clear();}
function gmodMonth(m){if(!GC)return;if(m===undefined)m=GC.turn;GMOD_C.m=m;GMOD_C.g=GC;if(GC.mod)GC.mod=GC.mod.filter(r=>r.until===undefined||r.until>=m);GMOD_C.cache.clear();for(const f of GMOD_HOOKS)try{f(m);}catch(e){console.error('monthly hook',e);}GMOD_C.cache.clear();}
// Nation panel tab: every modifier that applies to this nation, with its source.
const GMOD_STATS={warSupport:'War support',rallySpeed:'Rally speed',homeMorale:'Home-ground morale',fireSupport:'Fire support'};
npTab('mods','✨','Modifiers',(code,body)=>{const rows=gmodRows('nation',code);
  body.innerHTML='<div style="opacity:.8;margin-bottom:8px">Every bonus and penalty on this nation, and where it comes from.</div>'+(rows.length?rows.map(r=>'<div style="padding:5px 0;border-bottom:1px solid #2c4258"><b>'+(GMOD_STATS[r.stat]||r.stat)+'</b> '+(r.add?(r.add>0?'+':'')+Math.round(r.add*100)+'%':'x'+r.mul)+' <span style="opacity:.75">— '+r.src+(r.until!==undefined?', until month '+r.until:'')+'</span></div>').join(''):'<i>No modifiers.</i>');});
