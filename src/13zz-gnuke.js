// 13zz-gnuke.js — Lane G RG10 (first cut): NUCLEAR PROGRAMMES and the grand-map nuclear strike. Grand map only, never in battles.
// Nuclear powers start with a few warheads (GNK.start). Anyone else (and Iran, part-way) can start a programme: enrichment → test-ready →
// a test (world opinion drops, the first warhead appears) → one more warhead a year (max GNK.cap). Warheads cost upkeep every month.
// A strike (two-step confirm, human) or a last-resort AI strike wrecks one enemy province: its buildings and garrison are destroyed,
// armies there are lost, unrest and fallout last 3 years, the world's opinion of the launcher collapses, the victim proposes sanctions
// (UN, RG2), the launcher's war support splits, and a nuclear victim (AI) strikes back at the launcher's capital.
// Effects are GMOD rows + relations + the event log (grLog) — no separate battle code. State: GC.nuk (saved with the campaign).
// Neutral: no real places' casualty figures, no real leaders. Equal rules for every nation.
const GNK={start:{US:3,RU:3,CN:2,GB:1,FR:1,IN:1,PK:1,KP:1,IL:1},pre:{IR:2},
  names:['No programme','Enrichment','Test-ready','Warhead (tested)'],months:[0,6,6,0],
  cost:1500,upkeep:150,cap:6,fallout:36,strikeCost:0,aiGap:24};
function gnkN(c){if(!GC.nuk)GC.nuk={n:{},fo:{},pend:[]};const S=GC.nuk;if(!S.n[c]){const w=GNK.start[c]||0;S.n[c]={st:w?3:(GNK.pre[c]||0),p:0,w:w,last:-99};}return S.n[c];}
function gnkName(c){return typeof gdNatName==='function'?gdNatName(c):c;}
function gnkStart(c){const N=gnkN(c),A=GC.nat[c];if(N.st!==0)return 'The programme is already running.';if(A.cash<GNK.cost)return 'Costs $'+GNK.cost+'.';
  A.cash-=GNK.cost;N.st=1;N.p=0;grLog(gnkName(c)+' starts a nuclear programme.',c);return '';}
// one month: programme stages, tests, warhead growth, upkeep, fallout, AI decisions
function gnkMonth(){if(!GC||!GC.nat)return;const alive=Object.keys(GC.nat).filter(c=>!GC.nat[c].dead).sort();
  const R=grRng((GC.seed|0)*311+GC.turn*17);
  for(const c of alive){const N=gnkN(c),A=GC.nat[c];
    if(N.st>=1&&N.st<=2){N.p++;if(N.p>=GNK.months[N.st]){N.st++;N.p=0;if(N.st===3){N.w++;grLog('Nuclear test: '+gnkName(c)+' has tested a device.','');
        for(const o of alive)if(o!==c)gdRel(o,c,-12);}}}
    else if(N.st===3){N.p++;if(N.p%12===0&&N.w<GNK.cap){N.w++;}}
    if(N.w>0)A.cash-=N.w*GNK.upkeep;
    // a programme is seen: the world grows wary of it (slow, every month until it becomes a warhead)
    if(N.st>=1&&N.st<3)for(const o of alive)if(o!==c)gdRel(o,c,-1);
    // AI nations at war with a nuclear power may start their own programme (cascade); rare and seeded
    if(!A.ai)continue;
    if(N.st===0&&A.cash>2500&&alive.some(o=>o!==c&&GC.nat[o]&&(gnkN(o).w>0)&&grAtWar(c,o))&&R()<.03){N.st=1;N.p=0;grLog(gnkName(c)+' is reported to be starting a nuclear programme.',c);}
    // last resort: the capital is held by an enemy army and the nation has warheads → strike the occupied capital
    if(N.w>0&&N.st===3&&GC.turn-N.last>=GNK.aiGap){const cap=A.cap;if(cap>=0&&GC.prov[cap]&&GC.prov[cap].o!==c&&grAtWar(c,GC.prov[cap].o)&&GC.armies.some(a=>a.at===cap&&!a.fl&&grAtWar(a.o,c)))gnkLaunch(c,cap,true);}
  }
  for(const pi of Object.keys(GC.nuk.fo))if(GC.nuk.fo[pi]<GC.turn)delete GC.nuk.fo[pi];else if(GC.prov[pi])GC.prov[pi].un=Math.min(100,(GC.prov[pi].un||0)+3);
}
// the strike. pi must be an enemy land province of a nation at war with the launcher. ai: no confirm needed (its own decision)
function gnkLaunch(c,pi,ai,noRet){const N=gnkN(c),p=GCM.P[pi];if(!p||!p.land)return 'Not a land province.';const o=GC.prov[pi].o;
  if(N.w<1)return 'No warheads.';if(o===c||!grAtWar(c,o))return 'Only enemy provinces at war with you.';
  N.w--;N.last=GC.turn;const st=GC.prov[pi];st.un=Math.min(100,(st.un||0)+45);st.gar=[];
  for(const b of gmBuildings(pi))b[1]=100;                      /* every building in the province is destroyed (damage 100) */
  GC.armies=GC.armies.filter(a=>!(a.at===pi&&!a.fl));          /* armies in the province are lost */
  GC.nuk.fo[pi]=GC.turn+GNK.fallout;
  for(const x of Object.keys(GC.nat)){if(GC.nat[x].dead||x===c)continue;gdRel(x,c,grAllied(x,c)?-35:-22);}
  gmodAdd({id:'nuk_ws_'+c,src:'Nuclear strike',scope:'nation',stat:'warSupport',add:-.15,t:c,until:GC.turn+12});
  grLog('Nuclear strike on '+p.n+' by '+gnkName(c)+'. Fallout covers the province.',c);
  try{unPropose(o,'sanction',c,true);}catch(e){}
  if(!noRet&&gnkN(o).w>0&&grAtWar(o,c)){   /* a nuclear victim answers: an AI victim strikes the launcher's capital at once; a human gets a log line */
    if(GC.nat[o].ai&&GC.nat[c].cap>=0)gnkLaunch(o,GC.nat[c].cap,true,true);
    else grLog(gnkName(o)+' could answer with its own warheads.',o);}
  return '';}
// the picker: enemy land provinces next to our land, capitals first (up to 8)
function gnkTargets(c){const P=GCM.P,out=[],seen=new Set();const foes=new Set(gdEnemies(c));
  for(const f of foes){const cap=GC.nat[f].cap;if(cap>=0&&!seen.has(cap)){seen.add(cap);out.push(cap);}}
  for(const p of P){if(!p.land||!foes.has(GC.prov[p.i].o))continue;if(seen.has(p.i))continue;if(p.adj.some(j=>P[j]&&P[j].land&&GC.prov[j].o===c)){seen.add(p.i);out.push(p.i);}}
  return out.slice(0,8);}
function gnkPickTarget(c){const N=gnkN(c);if(N.w<1)return;const ts=gnkTargets(c);if(!ts.length){guModal('<h2 style="margin:0 0 8px;font-size:20px">☢ Launch</h2><div>No enemy province is within reach of our front.</div>',[['Close',()=>{}]]);return;}
  const bs=ts.map(pi=>[GCM.P[pi].n+' ('+(GC.nat[GC.prov[pi].o]&&GC.nat[GC.prov[pi].o].cap===pi?'capital':gnkName(GC.prov[pi].o))+')',()=>gnkConfirm(c,pi)]);bs.push(['Back',()=>npOpen(c,'nuke')]);
  guModal('<h2 style="margin:0 0 8px;font-size:20px">☢ Choose a target</h2><div style="opacity:.8;margin-bottom:6px">Enemy provinces in reach. The next screen asks you to confirm.</div>',bs);}
function gnkConfirm(c,pi){const o=GC.prov[pi].o;
  guModal('<h2 style="margin:0 0 8px;font-size:20px">Launch on '+GCM.P[pi].n+'?</h2><div style="line-height:1.5">This destroys the buildings and garrison there, kills armies in the province and leaves fallout for three years. Sanctions follow, the world turns against '+gnkName(c)+', and '+gnkName(o)+' may answer with its own warheads.</div>',
    [['Launch',()=>{const e=gnkLaunch(c,pi,false);if(e)grLog(e,c);try{guTop();grandMapRefresh();}catch(x){}npOpen(c,'nuke');},1],['Back',()=>gnkPickTarget(c)]]);}
// the nation-panel tab: stage, warheads, actions (own nation only); small menu buttons
function gnkRow(label,val){return '<div style="display:flex;justify-content:space-between;gap:24px;padding:3px 0;border-bottom:1px solid #26384a"><span style="opacity:.75">'+label+'</span><b>'+val+'</b></div>';}
function gnkBtn(label,fn){const b=document.createElement('button');b.textContent=label;b.style.cssText='font:15px system-ui,sans-serif;padding:6px 14px;margin:6px 8px 0 0;background:#1e3347;color:#e8f0f7;border:1px solid #4a6a88;border-radius:5px;cursor:pointer';b.onclick=fn;return b;}
if(typeof npTab==='function')npTab('nuke','☢','Nuclear',(code,body,c)=>{const own=code===GC.me,N=gnkN(code),A=GC.nat[code];
  const stage=GNK.names[N.st]||'';const nextM=N.st>=1&&N.st<=2?' (next stage in '+Math.max(0,GNK.months[N.st]-N.p)+' months)':'';
  body.innerHTML='<div style="font-size:17px;margin-bottom:6px"><b>Nuclear status</b></div><div style="max-width:520px">'
   +gnkRow('Programme',stage+nextM)+gnkRow('Warheads',N.w)+gnkRow('Upkeep per month',N.w||N.st>=1?'$'+(N.w*GNK.upkeep):'—')
   +gnkRow('Fallout zones',Object.keys(GC.nuk.fo).length)+'</div>'
   +'<div style="margin-top:10px;opacity:.8;max-width:520px">Every nuclear power pays upkeep for its warheads. A strike brings sanctions, world anger and fallout; a nuclear victim can answer. AI nations use a strike only as a last resort.</div>';
  if(own){const row=document.createElement('div');body.appendChild(row);
    if(N.st===0)row.appendChild(gnkBtn('Start a nuclear programme ($'+GNK.cost+')',()=>{const e=gnkStart(code);if(e)grLog(e,code);npOpen(code,'nuke');}));
    if(N.w>0&&N.st>=0)row.appendChild(gnkBtn('Launch a strike…',()=>gnkPickTarget(code)));}
});
GMOD_HOOKS.push(gnkMonth);
