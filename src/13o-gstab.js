// B4 STABILITY, CORES, ESTATES (lane B, EU4-style). One module, all effects are ROWS in the modifier table (13k-gmod.js) — no bespoke effect code.
//   stability  N.stab -3..+3  (raise with Political points; falls on empty treasury / lost capital) -> income, war support, unrest rows
//   cores      st.cr = nations that have a core on the province; non-core provinces earn 30% less + extra unrest; coring takes 6 months of Political points
//   estates    N.est[id]={loy} (4 estates: Army, Clergy & Ideology, Business, Workers); privileges N.priv=[ids] each = a benefit row + a drawback row
// Monthly hook (GMOD_HOOKS) so it works before and after the real-time change. Deterministic: no random; the AI uses fixed rules. Saved inside GC.
const GS_COREMONTHS=6;
const GS_EST=[['army','Army','The officer corps and veterans'],['clergy','Clergy & Ideology','Religious and party institutions'],['biz','Business','Industrialists, traders and bankers'],['work','Workers','Factory hands, dockers and farmers']];
// privilege = [id, estate, name, benefit{stat,add|mul}, drawback{stat,add|mul}, plain text]
const GS_PRIV=[
  ['pv_a1','army','Veteran Land Grants',{stat:'manpower',mul:1.08},{stat:'income',mul:.97},'+8% manpower, -3% income'],
  ['pv_a2','army','Officers\' Academy',{stat:'warSupport',add:.03},{stat:'upkeep',mul:1.04},'+3% war support, +4% army upkeep'],
  ['pv_c1','clergy','Religious Schools',{stat:'ppPol',mul:1.08},{stat:'income',mul:.98},'+8% Political points, -2% income'],
  ['pv_c2','clergy','Pious Endowments',{stat:'unrest',add:-3},{stat:'income',mul:.97},'-3 unrest, -3% income'],
  ['pv_b1','biz','Trade Charters',{stat:'income',mul:1.05},{stat:'unrest',add:2},'+5% income, +2 unrest'],
  ['pv_b2','biz','Banking Licences',{stat:'income',mul:1.03},{stat:'warSupport',add:-.02},'+3% income, -2% war support'],
  ['pv_w1','work','Union Recognition',{stat:'unrest',add:-3},{stat:'income',mul:.97},'-3 unrest, -3% income'],
  ['pv_w2','work','Public Works',{stat:'manpower',mul:1.05},{stat:'upkeep',mul:1.03},'+5% manpower, +3% army upkeep']];
// loyal (>=60) / angry (<30) effect of each estate, and "overmighty" (influence > 40%)
const GS_EFX={army:[{stat:'manpower',mul:1.1},{stat:'manpower',mul:.9}],clergy:[{stat:'unrest',add:-3},{stat:'unrest',add:4}],
  biz:[{stat:'income',mul:1.05},{stat:'income',mul:.95}],work:[{stat:'income',mul:1.03},{stat:'income',mul:.94}]};
const GS_NAMES={};for(const e of GS_EST)GS_NAMES[e[0]]=e[1];
GMOD_STATS.unrest='Unrest';
function gsN(c){const N=GC&&GC.nat[c];if(!N)return null;if(!N.pp&&typeof gidN==='function')gidN(c);if(N.stab===undefined)N.stab=0;if(!N.priv)N.priv=[];if(!N.est){N.est={};for(const e of GS_EST)N.est[e[0]]={loy:50};}if(N.sdrop===undefined)N.sdrop=-9;return N;}
GMOD_COND.stab=(k,arg)=>{const N=GC&&GC.nat[k];return !!N&&(N.stab|0)===+arg;};
GMOD_COND.est=(k,arg)=>{const N=GC&&GC.nat[k];if(!N||!N.est)return false;const i=arg.indexOf(':'),id=arg.slice(0,i),w=arg.slice(i+1),E=N.est[id];if(!E)return false;
  return w==='hi'?E.loy>=60:w==='lo'?E.loy<30:w==='big'?gsInfl(k,id)>40:false;};
GMOD_COND.priv=(k,arg)=>{const N=GC&&GC.nat[k];return !!N&&!!N.priv&&N.priv.indexOf(arg)>=0;};
function gsRow(id,src,stat,v,cond){const r={id,src,scope:'nation',stat,cond};if(v.add)r.add=v.add;if(v.mul)r.mul=v.mul;GMOD_ROWS.push(r);}
for(let s=-3;s<=3;s++){if(!s)continue;const nm=(s>0?'Stability +':'Stability ')+s;
  gsRow('stab_i'+s,nm,'income',{mul:1+.03*s},'stab:'+s);gsRow('stab_w'+s,nm,'warSupport',{add:.02*s},'stab:'+s);gsRow('stab_u'+s,nm,'unrest',{add:-2*s},'stab:'+s);}
for(const e of GS_EST){const f=GS_EFX[e[0]];gsRow('est_hi_'+e[0],'Loyal '+e[1],f[0].stat,f[0],'est:'+e[0]+':hi');gsRow('est_lo_'+e[0],'Angry '+e[1],f[1].stat,f[1],'est:'+e[0]+':lo');
  gsRow('est_big_'+e[0],'Overmighty '+e[1],'unrest',{add:3},'est:'+e[0]+':big');}
for(const p of GS_PRIV){gsRow(p[0]+'b',p[2],p[3].stat,p[3],'priv:'+p[0]);gsRow(p[0]+'c',p[2]+' (drawback)',p[4].stat,p[4],'priv:'+p[0]);}
function gsInfl(c,id){const N=gsN(c);if(!N)return 25;let tot=0,mine=0;for(const e of GS_EST){const v=25+10*N.priv.filter(x=>GS_PRIV.some(p=>p[0]===x&&p[1]===e[0])).length;tot+=v;if(e[0]===id)mine=v;}return Math.round(mine/tot*100);}
// ---- stability
function gsStabCost(c){const N=gsN(c);return 40+20*((N.stab|0)+3);}
function gsRaise(c){const N=gsN(c);if(!N||N.dead)return 'Not available.';if(N.stab>=3)return 'Stability is already at its maximum.';const cost=gsStabCost(c);if(!N.pp||N.pp.pol<cost)return 'Needs '+cost+' Political points.';
  N.pp.pol-=cost;N.stab++;GMOD_C.cache.clear();if(c===GC.me)grLog('Stability raised to '+(N.stab>0?'+':'')+N.stab+'.',c);return '';}
function gsDrop(c,why){const N=gsN(c);if(!N||N.stab<=-3||GC.turn-N.sdrop<3)return;N.stab--;N.sdrop=GC.turn;GMOD_C.cache.clear();if(c===GC.me)grLog('Stability fell to '+N.stab+': '+why+'.',c);}
// ---- cores
function gsCores(st){if(!st.cr)st.cr=[st.o0];return st.cr;}
function gsIsCore(st){return gsCores(st).indexOf(st.o)>=0;}
function gsNonCore(c){return GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c&&!gsIsCore(GC.prov[p.i]));}
function gsCoreCost(c,pi){const n=gsNonCore(c).length;return Math.round((20+4*GCM.P[pi].dev)*(1+.05*n));}
function gsCoreStart(c,pi){const st=GC.prov[pi],N=gsN(c);if(!st||st.o!==c)return 'Not your province.';if(gsIsCore(st))return 'Already a core province.';if(st.coring)return 'Already being converted.';
  const cost=gsCoreCost(c,pi);if(!N.pp||N.pp.pol<cost)return 'Needs '+cost+' Political points.';N.pp.pol-=cost;st.coring={o:c,t:GC.turn+GS_COREMONTHS};if(c===GC.me)grLog('Began making '+GCM.P[pi].n+' a core province ('+GS_COREMONTHS+' months).',c);return '';}
// ---- monthly
function gsMonth(){if(!GC)return;
  for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(st.coring){if(st.coring.o!==st.o)delete st.coring;else if(st.coring.t<=GC.turn){gsCores(st).push(st.o);delete st.coring;if(st.o===GC.me)grLog(p.n+' is now a core province.',st.o);}}}
  for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;gsN(c);
    if(N.cash<0)gsDrop(c,'the treasury is empty');else if(N.cap<0)gsDrop(c,'the capital is lost');
    let war=false;try{war=Object.keys(GC.nat).some(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}catch(e){}
    const own=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c);let un=0;for(const p of own)un+=GC.prov[p.i].un;un=own.length?un/own.length:0;
    for(const e of GS_EST){const E=N.est[e[0]],pc=N.priv.filter(x=>GS_PRIV.some(p=>p[0]===x&&p[1]===e[0])).length;
      let t=50+10*pc+5*(N.stab|0);if(e[0]==='army')t+=war?8:0;else if(e[0]==='biz')t+=(N.inc|0)>0?8:-8;else if(e[0]==='work')t-=Math.max(-8,Math.min(14,(un-30)/3));else t-=(N.stab|0)<0?6:0;
      E.loy=Math.max(0,Math.min(100,Math.round((E.loy+(t-E.loy)*.2)*10)/10));}
    if(c!==GC.me&&N.pp){   // AI: fixed rules, only spends what ideas left over
      if(N.stab<1&&N.pp.pol>=gsStabCost(c)+25)gsRaise(c);
      const nc=gsNonCore(c).filter(p=>!GC.prov[p.i].coring).sort((a,b)=>b.dev-a.dev||a.i-b.i)[0];if(nc&&N.pp.pol>=gsCoreCost(c,nc.i)+15)gsCoreStart(c,nc.i);
      for(const p of GS_PRIV){const E=N.est[p[1]];if(E.loy<40&&N.priv.indexOf(p[0])<0&&!N.priv.some(x=>GS_PRIV.some(q=>q[0]===x&&q[1]===p[1]))){gsPriv(c,p[0],true);break;}}}}
  GMOD_C.cache.clear();}
function gsPriv(c,id,on){const N=gsN(c),p=GS_PRIV.find(x=>x[0]===id);if(!N||!p)return 'Not available.';const had=N.priv.indexOf(id)>=0;
  if(on){if(had)return '';N.priv.push(id);N.est[p[1]].loy=Math.min(100,N.est[p[1]].loy+10);if(c===GC.me)grLog('Granted "'+p[2]+'" to the '+GS_NAMES[p[1]]+' estate.',c);}
  else{if(!had)return '';N.priv=N.priv.filter(x=>x!==id);N.est[p[1]].loy=Math.max(0,N.est[p[1]].loy-15);if(c===GC.me)grLog('Revoked "'+p[2]+'"; the '+GS_NAMES[p[1]]+' estate is angry.',c);}
  GMOD_C.cache.clear();return '';}
GMOD_HOOKS.push(gsMonth);
alAdd('stab','⚖️','Stability',c=>{const N=gsN(c);if(!N)return null;if(N.stab<0)return {n:Math.abs(N.stab),bad:1,tip:'stability is below zero — raise it with Political points',go:()=>{try{npOpen(c,'stab');}catch(e){}}};
  const lo=GS_EST.filter(e=>N.est[e[0]].loy<30);return lo.length?{n:lo.length,bad:1,tip:lo.map(e=>e[1]).join(', ')+' unhappy — grant a privilege',go:()=>{try{npOpen(c,'stab');}catch(e){}}}:null;});
npTab('stab','⚖️','Stability & estates',(code,body,c)=>{const N=gsN(code),own=c.own&&code===GC.me;
  const btn=(t,fn,dis,tip)=>{const b=document.createElement('button');b.textContent=t;b.style.cssText='font-size:15px;padding:2px 12px;cursor:pointer';b.disabled=!!dis;if(tip)b.title=tip;b.onclick=()=>{const e=fn();if(e&&typeof grLog==='function')grLog(e,code);npDraw();};return b;};
  const pol=N.pp?Math.floor(N.pp.pol):0,mods=['income','warSupport','unrest'].map(s=>gmodLines('nation',code,s).join('<br>')).filter(x=>x);
  body.innerHTML='<div style="font-size:19px"><b>Stability '+(N.stab>0?'+':'')+N.stab+'</b> <span style="opacity:.7">(−3 to +3)</span></div>'+
    '<div style="opacity:.8;margin:2px 0 8px">Higher stability: more income, higher war support, calmer provinces. It falls when the treasury runs dry or the capital is lost. You have '+pol+' Political points.</div>';
  if(own)body.lastChild.appendChild(btn('Raise stability ('+(N.stab>=3?'max':gsStabCost(code)+' Political')+')',()=>gsRaise(code),N.stab>=3||pol<gsStabCost(code)));
  const h=document.createElement('div');h.style.cssText='font-size:18px;margin:14px 0 4px';h.innerHTML='<b>Estates</b>';body.appendChild(h);
  for(const e of GS_EST){const E=N.est[e[0]],inf=gsInfl(code,e[0]),box=document.createElement('div');box.style.cssText='margin:6px 0;padding:6px 10px;border:1px solid #34506a;border-radius:6px';
    box.innerHTML='<div><b>'+e[1]+'</b> <span style="opacity:.7">— '+e[2]+'</span></div><div>Loyalty <b style="color:'+(E.loy>=60?'#6fdc8c':E.loy<30?'#e0533f':'inherit')+'">'+Math.round(E.loy)+'</b> · Influence '+inf+'%'+(inf>40?' <span style="color:#e0a33f">overmighty</span>':'')+'</div>';
    for(const p of GS_PRIV.filter(x=>x[1]===e[0])){const has=N.priv.indexOf(p[0])>=0,row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:10px;padding:2px 0';
      row.innerHTML='<span style="flex:1">'+(has?'✔ ':'')+'<b>'+p[2]+'</b> <span style="opacity:.75">— '+p[5]+'</span></span>';
      if(own)row.appendChild(btn(has?'Revoke':'Grant',()=>gsPriv(code,p[0],!has),false,has?'Revoking angers the estate':'Raises the estate\'s loyalty and influence'));box.appendChild(row);}
    body.appendChild(box);}
  const nc=gsNonCore(code);const h2=document.createElement('div');h2.style.cssText='font-size:18px;margin:14px 0 4px';h2.innerHTML='<b>Core provinces</b> <span style="opacity:.7">— conquered land earns 30% less and is restless until it is made core ('+GS_COREMONTHS+' months)</span>';body.appendChild(h2);
  if(!nc.length)body.appendChild(Object.assign(document.createElement('div'),{textContent:'Every province you hold is a core province.'}));
  else npTable(body,['Province','Core cost','Status',''],nc.slice(0,14).map(p=>{const st=GC.prov[p.i];return {cells:[p.n,gsCoreCost(code,p.i)+' Political',st.coring?'ready in '+Math.max(0,st.coring.t-GC.turn)+' months':'not core',''],i:p.i};}),r=>npFly(r.i));
  if(own&&nc.length){const row=document.createElement('div');row.style.cssText='margin-top:6px';const t=nc.filter(p=>!GC.prov[p.i].coring).sort((a,b)=>b.dev-a.dev||a.i-b.i)[0];
    if(t)row.appendChild(btn('Make '+t.n+' core ('+gsCoreCost(code,t.i)+' Political)',()=>gsCoreStart(code,t.i),pol<gsCoreCost(code,t.i)));body.appendChild(row);}
  if(mods.length){const m=document.createElement('div');m.style.cssText='margin-top:14px;opacity:.85;font-size:14px';m.innerHTML='<b>Active effects</b><br>'+mods.join('<br>');body.appendChild(m);}});
