// 13zm-gmobil.js — lane B RG34: MOBILISATION (call up reserves). N.mob = 0 peacetime / 1 partial / 2 general, N.mobT = turn it last changed, N.mobM = months mobilised.
// Who reacts: neighbours that are not allies lose trust in you every month you stay mobilised and (AI) mobilise back; allies approve. Second order: reserves pulled from
// factories cut income, raise army upkeep and breed unrest; a long mobilisation with no war drags the economy further ("prolonged"); war support rises while the nation is under arms.
// Counter-play: a neighbour's mobilisation shows as an alert; you can answer with your own call-up, talks (Diplomacy tab) or a deterrent ally. Cost: Military points + 3-month lock.
// All effects are GMOD rows; the one-off call-up fills the manpower pool. Deterministic (state only), monthly via GMOD_HOOKS.
const GMB_COST=[0,30,60],GMB_FILL=[0,.15,.35],GMB_LOCK=3,GMB_NAME=['Peacetime footing','Partial mobilisation','General mobilisation'];
GMOD_COND.mob=(k,arg)=>{const N=GC&&GC.nat[k];if(!N)return false;const l=N.mob|0;return arg==='long'?(l>0&&(N.mobM|0)>12):l===+arg;};
GMOD_ROWS.push(
  {id:'mob1_man',src:GMB_NAME[1],scope:'nation',stat:'manpower',mul:1.25,cond:'mob:1'},{id:'mob1_inc',src:GMB_NAME[1],scope:'nation',stat:'income',mul:.96,cond:'mob:1'},
  {id:'mob1_up',src:GMB_NAME[1],scope:'nation',stat:'upkeep',mul:1.1,cond:'mob:1'},{id:'mob1_ws',src:GMB_NAME[1],scope:'nation',stat:'warSupport',add:.04,cond:'mob:1'},
  {id:'mob2_man',src:GMB_NAME[2],scope:'nation',stat:'manpower',mul:1.6,cond:'mob:2'},{id:'mob2_inc',src:GMB_NAME[2],scope:'nation',stat:'income',mul:.88,cond:'mob:2'},
  {id:'mob2_up',src:GMB_NAME[2],scope:'nation',stat:'upkeep',mul:1.3,cond:'mob:2'},{id:'mob2_ws',src:GMB_NAME[2],scope:'nation',stat:'warSupport',add:.1,cond:'mob:2'},
  {id:'mob2_un',src:GMB_NAME[2],scope:'nation',stat:'unrest',add:2,cond:'mob:2'},
  {id:'mobL_inc',src:'Prolonged mobilisation',scope:'nation',stat:'income',mul:.95,cond:'mob:long'},{id:'mobL_un',src:'Prolonged mobilisation',scope:'nation',stat:'unrest',add:2,cond:'mob:long'});
GMOD_STATS.unrest=GMOD_STATS.unrest||'Unrest';
function gmbLv(c){const N=GC&&GC.nat[c];return N?(N.mob|0):0;}
function gmbStyleFill(c){const s=typeof wsStyle==='function'?wsStyle(c):'prof';return s==='home'?1.1:s==='fire'?.75:1;} // home defenders muster fast, firepower-reliant armies lean on kit not bodies
function gmbSet(c,lv){const N=GC&&GC.nat[c];if(!N||N.dead)return 'Not available.';lv=lv|0;const cur=N.mob|0;if(lv===cur)return '';
  if(N.mobT!==undefined&&GC.turn-N.mobT<GMB_LOCK)return 'The reserves were just reorganised — wait '+(GMB_LOCK-(GC.turn-N.mobT))+' more month(s).';
  if(lv>cur){if(!N.pp)N.pp={pol:0,dip:0,mil:0};if(c===GC.me){if(N.pp.mil<GMB_COST[lv])return 'Needs '+GMB_COST[lv]+' Military points.';N.pp.mil-=GMB_COST[lv];}
    const E=N.e;if(E){const add=Math.round(geManCap(c)*(GMB_FILL[lv]-GMB_FILL[cur])*gmbStyleFill(c));E.man=Math.min(geManCap(c)*1.5,E.man+add);}}
  N.mob=lv;N.mobT=GC.turn;if(!lv)N.mobM=0;GMOD_C.cache.clear();
  grLog(GCM.nats.get(c).name+(lv?' orders '+GMB_NAME[lv].toLowerCase()+'.':' stands the reserves down.'),c);
  for(const o of Object.keys(GC.nat))if(o!==c&&!GC.nat[o].dead&&o===GC.me&&lv>cur&&gdNear(c,o)&&!grAllied(c,o)&&!grAtWar(c,o))grLog('Warning: '+GCM.nats.get(c).name+' is mobilising on our border.',o);
  return '';}
function gmbAlarmed(c){ // neighbours (non-allies, not at war) that are mobilised and do not like us
  return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&(GC.nat[o].mob|0)>0&&!grAllied(c,o)&&!grAtWar(c,o)&&gdNear(o,c));}
function gmbMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;if(N.mobMT===GC.turn)continue;N.mobMT=GC.turn;
    const lv=N.mob|0;if(lv){N.mobM=(N.mobM|0)+1;
      for(const o of Object.keys(GC.nat).sort()){if(o===c||GC.nat[o].dead||grAtWar(c,o))continue;
        if(grAllied(c,o))gdRel(c,o,1);else if(gdNear(c,o)&&gdOp(o,c)>-60)gdRel(c,o,lv===2?-4:-2);}}
    if(c===GC.me)continue;
    const foes=gdEnemies(c).sort(),inv=GC.armies.some(a=>foes.includes(a.o)&&GC.prov[a.at]&&GC.prov[a.at].o===c&&a.u.length);
    const threat=gmbAlarmed(c).length>0;let want=lv;
    if(inv)want=2;else if(foes.length||threat)want=Math.max(lv,1);else if(lv&&(GC.turn-(N.mobT||0))>=6)want=0;
    if(want!==lv)gmbSet(c,want);}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(gmbMonth);
npTab('mob','🎖','Mobilisation',(code,body,c)=>{const N=GC.nat[code],own=c.own&&code===GC.me,lv=N.mob|0;
  let h='<div style="font-size:26px;margin-bottom:6px"><b>'+GMB_NAME[lv]+'</b>'+(lv?' <span style="opacity:.7;font-size:16px">('+(N.mobM|0)+' months)</span>':'')+'</div>'+
   '<div style="opacity:.85;margin-bottom:8px">Call up the reserves for a bigger army fast. Partial: +25% manpower growth, +15% of the pool at once, income -4%, upkeep +10%. General: +60% growth, +35% of the pool, income -12%, upkeep +30%, unrest +2, war support +10. Neighbours who are not your allies grow wary every month you stay under arms — and may mobilise back. After a year with no peace the economy suffers more.</div>';
  const L=gmodLines('nation',code,'income').concat(gmodLines('nation',code,'manpower')).filter(s=>/mobilisation/i.test(s));if(L.length)h+='<div style="margin:8px 0;opacity:.85">'+L.join('<br>')+'</div>';
  const al=gmbAlarmed(code);if(al.length)h+='<div style="margin:8px 0;color:#ffb36b">Mobilised on our border: '+al.map(o=>GCM.nats.get(o).name).join(', ')+'</div>';
  body.innerHTML=h;
  if(own)[0,1,2].forEach(i=>{if(i===lv)return;const b=document.createElement('button');b.textContent=(i>lv?'Order ':'Stand down to ')+GMB_NAME[i].toLowerCase()+(i>lv?' (-'+GMB_COST[i]+' Military points)':'');
    b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer;margin:0 8px 6px 0';b.onclick=()=>{const e=gmbSet(code,i);if(e)grLog(e,code);npDraw();};body.appendChild(b);});
  if(own){const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Military points: '+Math.floor(N.pp?N.pp.mil:0);body.appendChild(p);}});
alAdd('mobn','🎖','Neighbour mobilising',c=>{const a=gmbAlarmed(c);return a.length?{n:a.length,tip:GCM.nats.get(a[0]).name+' is mobilised on our border — consider answering',go:()=>npOpen(c,'mob')}:null;});
