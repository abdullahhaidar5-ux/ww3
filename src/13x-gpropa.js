// 13x-gpropa.js — lane G B5c: PROPAGANDA WAR + WAR ECONOMY + GOVERNMENT <-> WAR SUPPORT. Everything rides the ONE war-support meter (wsOf, 13v-gwarsup) and the ONE modifier engine (GMOD).
// Reaction chain: you spend Diplomatic points to hit an enemy's morale at home -> its war support drops (style decides how much) -> recruits/income fall, unrest rises, forced peace nears;
// counter-play: the target can run counter-propaganda (halves hits for 6 months) and the world dislikes a propagandist a little; cost: 30 Diplomatic points + opinion.
// State: N.pgT[target]=month of last hit, N.pgC=month counter-propaganda ends, N.pgH=month last hit on us, N.gvT=month of last government check. All in GC.nat (saved). Deterministic.
const PG_COST=30, PG_CD=4, PG_HIT=12, PG_COUNTER=20, PG_CLEN=6;
// how much each style shrugs off enemy messaging (x hit): Zealous hard to shake, Professional resistant, Home defenders shaken when fighting abroad, Firepower-reliant hurt by casualty news
const PG_RES={zeal:.4,prof:.5,home:1,fire:1.25};
// war economy: high war support lifts output; same size for every style, different story (equal value)
const WE_ROWS=[['zeal','Volunteer labor'],['prof','Efficient war industry'],['home','Home-front drives'],['fire','Arms-industry output']];
GMOD_COND.pws=(k,arg)=>{if(!GC||!GC.nat[k])return false;return wsStyle(k)===arg&&wsOf(k)>=60;};
for(const [s,n] of WE_ROWS)GMOD_ROWS.push({id:'we_'+s,src:n+' (war support 60%+)',scope:'nation',stat:'income',mul:1.04,cond:'pws:'+s});
// government <-> war support: one data row per style (what high / low support does to the government)
const PG_GOV={zeal:{n:'Legitimacy',hi:'Fervor steadies the leadership: unrest eases in every province',lo:'The faithful grow restless: unrest creeps up'},
  prof:{n:'Approval',hi:'Voters and the staff approve: stability rises at the two-yearly review',lo:'The review goes badly: stability falls'},
  home:{n:'Unity',hi:'The nation is united: unrest eases',lo:'Home-front quarrels: unrest creeps up'},
  fire:{n:'World opinion',hi:'Clean wins impress the world: opinion of us improves',lo:'Bad news abroad: opinion of us sours'}};
function pgN(c){const N=GC&&GC.nat[c];if(!N)return null;if(!N.pgT)N.pgT={};return N;}
function pgCountered(c){const N=pgN(c);return !!N&&(N.pgC||0)>GC.turn;}
function pgCan(a,b){const N=pgN(a);if(!N||!N.pp)return 'Not available.';if(!GC.nat[b]||GC.nat[b].dead||!grAtWar(a,b))return 'Only at war with them.';
  const l=GC.turn-(N.pgT[b]===undefined?-99:N.pgT[b]);if(l<PG_CD)return 'Again in '+(PG_CD-l)+' months.';if(N.pp.dip<PG_COST)return 'Needs '+PG_COST+' Diplomatic points.';return '';}
function pgHitSize(a,b){const sk=wsStyle(b);let h=PG_HIT*(PG_RES[sk]||1);
  if(sk==='home'){const abroad=GC.armies.some(x=>x.o===b&&x.u.length&&GC.prov[x.at]&&GC.prov[x.at].o!==b);h*=abroad?1.5:.6;}
  if(sk==='fire'&&wsN(b).wsW>3)h*=1.2;if(pgCountered(b))h*=.5;return Math.round(h*10)/10;}
function pgRun(a,b){const e=pgCan(a,b);if(e)return e;const N=pgN(a),T=wsN(b),h=pgHitSize(a,b);N.pp.dip-=PG_COST;N.pgT[b]=GC.turn;T.ws=Math.max(0,T.ws-h);GC.nat[b].pgH=GC.turn;
  for(const c of Object.keys(GC.nat).sort())if(c!==a&&!GC.nat[c].dead&&c!==b)gdRel(c,a,-.5);try{gdRel(a,b,-6);}catch(x){}
  if(a===GC.me||b===GC.me)grLog((a===GC.me?'Our broadcasts hit '+gdNatName(b)+': their war support -'+h+'.':gdNatName(a)+' runs propaganda against us: war support -'+h+'.'),a);return '';}
function pgCounter(c){const N=pgN(c);if(!N||!N.pp)return 'Not available.';if(pgCountered(c))return 'Already running.';if(N.pp.dip<PG_COUNTER)return 'Needs '+PG_COUNTER+' Diplomatic points.';N.pp.dip-=PG_COUNTER;N.pgC=GC.turn+PG_CLEN;
  if(c===GC.me)grLog('Counter-propaganda: enemy messaging counts half for '+PG_CLEN+' months.',c);return '';}
function pgGov(c){const N=GC.nat[c],sk=wsStyle(c),v=wsOf(c);
  if(sk==='zeal'||sk==='home'){const d=v>=65?-1:v<30?1:0;if(d)for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c){GC.prov[p.i].un=Math.max(0,Math.min(100,GC.prov[p.i].un+d));}}
  else if(sk==='prof'){if(GC.turn%24===0&&N.gvT!==GC.turn){N.gvT=GC.turn;if(N.stab===undefined){N.stab=0;N.stP=0;}const d=v>=60?1:v<40?-1:0;N.stab=Math.max(-3,Math.min(3,N.stab+d));if(d&&c===GC.me)grLog('Two-yearly review: '+(d>0?'approval is high, stability rises.':'approval is low, stability falls.'),c);}}
  else if(sk==='fire'){const d=v>=70?.5:v<40?-.5:0;if(d)for(const o of Object.keys(GC.nat).sort())if(o!==c&&!GC.nat[o].dead)gdRel(o,c,d);}}
function pgMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;wsN(c);pgN(c);
    if(c!==GC.me&&N.pp){ // AI: counter if hit, else hit the enemy whose morale is most breakable, in sorted order
      if(N.pgH===GC.turn-1&&N.pp.dip>=PG_COUNTER+30)pgCounter(c);
      const foes=gdEnemies(c).sort();if(foes.length&&N.pp.dip>=PG_COST+40){let best=null,bh=0;for(const f of foes){if(pgCan(c,f))continue;const h=pgHitSize(c,f);if(h>bh+1e-9){bh=h;best=f;}}if(best&&bh>=6)pgRun(c,best);}}
    pgGov(c);}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(pgMonth);
npTab('prop','📢','Propaganda',(code,body,c)=>{const N=pgN(code),sk=wsStyle(code),G=PG_GOV[sk];const own=c.own&&code===GC.me;
  let h='<div style="opacity:.85;margin-bottom:8px">Messaging reaches the enemy home front. How far it gets depends on the target\'s national character: Zealous nations are hard to shake, Professional armies resist, Home defenders tire of fighting abroad, Firepower-reliant nations hate casualty news. Everyone is hit by the same size of effort; nobody has it easy.</div>'+
  '<div style="margin:8px 0"><b>War economy:</b> war support 60%+ gives +4% income ('+WE_ROWS.find(r=>r[0]===sk)[1]+'). Now: '+Math.round(wsOf(code))+'%.</div>'+
  '<div style="margin:8px 0"><b>'+G.n+':</b> '+G.hi+' (high), '+G.lo.charAt(0).toLowerCase()+G.lo.slice(1)+' (low).</div>'+
  '<div style="margin:8px 0">'+(pgCountered(code)?'Counter-propaganda is running until month '+N.pgC+'.':'No counter-propaganda running.')+'</div>';
  body.innerHTML=h;
  if(!own)return;
  const foes=gdEnemies(code).sort();const box=document.createElement('div');body.appendChild(box);
  if(!foes.length)box.innerHTML='<i>Not at war — nobody to broadcast against.</i>';
  for(const f of foes){const row=document.createElement('div');row.style.cssText='display:flex;gap:10px;align-items:center;margin:5px 0';const e=pgCan(code,f);
    row.innerHTML='<span style="min-width:170px">'+gdNatName(f)+' — war support '+Math.round(wsOf(f))+'%</span>';const b=document.createElement('button');b.textContent='Broadcast (-'+PG_COST+' Dip, about -'+pgHitSize(code,f)+')';b.style.cssText='font-size:15px;padding:4px 12px;cursor:pointer';b.disabled=!!e;b.title=e||'Spend Diplomatic points to lower their war support';
    b.onclick=()=>{const x=pgRun(code,f);if(x)grLog(x,code);npDraw();};row.appendChild(b);box.appendChild(row);}
  const cb=document.createElement('button');cb.textContent='Counter-propaganda (-'+PG_COUNTER+' Dip, '+PG_CLEN+' months)';cb.style.cssText='font-size:15px;padding:4px 12px;cursor:pointer;margin-top:8px';const ce=pgCountered(code)?'Already running':'';cb.disabled=!!ce||!N.pp||N.pp.dip<PG_COUNTER;cb.onclick=()=>{const x=pgCounter(code);if(x)grLog(x,code);npDraw();};body.appendChild(cb);
  const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Diplomatic points: '+Math.floor(N.pp?N.pp.dip:0);body.appendChild(p);});
alAdd('prop','📢','Propaganda',c=>{const N=GC.nat[c];return N&&N.pgH===GC.turn?{n:'!',tip:'enemy propaganda hit our war support — consider counter-propaganda',go:()=>npOpen(c,'prop')}:null;});
