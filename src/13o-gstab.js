// B4 CORES + ESTATES (lane B, EU4-style; ctabs3 2026-11-08: modern power groups per regime). Stability itself lives in 13m-grandstab.js (N.stab, gst*);
// this file only ADDS an unrest row per stability level. All effects are ROWS in the modifier table (13k-gmod.js) — no bespoke effect code.
//   cores      st.cr = nations that have a core on the province; non-core provinces earn 30% less + extra unrest; coring takes 6 months of Political points
//   estates    N.est[id]={loy,land,b,l0,ag} — each nation has ITS OWN set of power groups (GS_REG, realistic Nov 2026): Security services & army,
//              Clergy (only where real), Business elites, Labour & unions, Tribes & clans, Revolutionary Guard (Iran), The Party (one-party states).
//              land = % of the state's assets the group controls (EU4 "estate land"); the rest is state control (crown land).
//              Influence = land + privileges (+ loyal bonus). Privileges N.priv=[ids] each = a benefit row + a drawback row, and hand the group 5% land.
//              Agendas: each group asks for one thing at a time (12 months): done = loyalty +15 and a 12-month bonus; ignored = loyalty -10 and it grabs land.
//              Disloyal (<30) + influential (>=40) group = a crisis through THE ONE EVENT ENGINE (13p): coup plot, general strike, clerical protests,
//              capital flight, tribal revolt, Guard takeover, party revolt (at most one a year per nation). The AI faces the same rules.
// Monthly hook (GMOD_HOOKS) so it works before and after the real-time change. Deterministic: no random; the AI uses fixed rules. Saved inside GC.
const GS_COREMONTHS=6;
const GS_EST=[['army','Security services & army','Generals, intelligence chiefs and the police'],['clergy','Clergy','Religious institutions, seminaries and endowments'],
  ['biz','Business elites','Industrialists, bankers, oil and trading houses'],['work','Labor & unions','Factory hands, dockers, teachers and farm workers'],
  ['tribe','Tribes & clans','Tribal sheikhs, elders and clan networks'],['guard','Revolutionary Guard','A parallel army with its own business empire'],
  ['party','The Party','The ruling party apparatus, from politburo to factory cell']];
const GS_COL={army:'#7d8c5a',clergy:'#3f8f7a',biz:'#c9a35a',work:'#b4584a',tribe:'#a07850',guard:'#8a3b3b',party:'#c0392b',crown:'#3b6a96'};
// Realistic Nov 2026 start per nation: 'estate:land/loyalty'. Nations not listed = a market state with army, business and labour.
const GS_REG={
 US:'army:8/60,biz:30/60,work:6/40', GB:'army:5/60,biz:25/55,work:10/40', FR:'army:5/60,biz:22/50,work:12/35', DE:'army:4/55,biz:26/55,work:12/50',
 IT:'army:4/55,clergy:3/60,biz:24/50,work:10/45', ES:'army:4/55,biz:24/55,work:10/45', PL:'army:6/65,clergy:6/55,biz:20/55,work:8/45', GR:'army:6/60,clergy:6/60,biz:20/45,work:10/35',
 SE:'army:4/60,biz:24/60,work:14/55', JP:'army:4/60,biz:30/60,work:8/55', KR:'army:6/60,biz:32/55,work:10/40', TW:'army:6/60,biz:28/60,work:6/50',
 AU:'army:4/60,biz:28/60,work:12/50', CA:'army:4/60,biz:26/60,work:12/50', IN:'army:6/65,biz:25/65,work:8/40', BR:'army:6/50,biz:25/50,work:12/50',
 MX:'army:10/55,biz:24/50,work:8/50', AR:'army:4/50,biz:24/60,work:12/30', CO:'army:10/55,biz:22/50,work:8/45', CL:'army:6/55,biz:28/55,work:10/40',
 ZA:'army:4/50,biz:25/45,work:15/40', PH:'army:8/55,clergy:5/60,biz:28/55,work:6/45', ID:'army:10/60,clergy:6/60,biz:25/55,work:6/45', TH:'army:20/60,biz:25/60,work:5/40',
 UA:'army:12/70,biz:20/50,work:6/50', TR:'army:10/55,clergy:6/65,biz:22/45,work:6/35', IL:'army:15/50,clergy:8/70,biz:22/50,work:8/45',
 RU:'army:12/60,clergy:4/75,biz:25/50,work:4/45', AZ:'army:8/65,biz:30/70,work:3/45', KZ:'army:8/60,biz:30/55,work:4/40',
 IR:'army:6/55,clergy:18/65,biz:8/35,work:3/25,guard:25/75', SA:'army:8/65,clergy:12/50,biz:25/70,work:2/50,tribe:10/60', AE:'army:8/70,biz:30/75,work:1/55,tribe:8/65',
 OM:'army:10/70,biz:15/65,work:3/55,tribe:15/65', JO:'army:15/70,biz:15/55,work:4/40,tribe:20/65', EG:'army:30/75,clergy:6/55,biz:15/45,work:4/35',
 IQ:'army:8/50,clergy:10/50,biz:12/50,work:4/35,tribe:18/45', SY:'army:12/45,clergy:6/50,biz:10/45,work:3/30,tribe:15/40', KD:'army:15/60,biz:15/55,work:3/35,tribe:20/55',
 RS:'army:10/70,clergy:15/75,biz:10/40,work:4/35,tribe:8/50', DW:'army:12/65,clergy:15/70,biz:5/35,work:2/30,tribe:25/45', RV:'army:15/60,clergy:15/55,biz:8/45,work:3/35,tribe:12/50',
 LY:'army:15/40,biz:20/45,work:2/35,tribe:25/40', SD:'army:30/40,biz:8/35,work:2/25,tribe:20/35', AF:'army:10/60,clergy:25/75,biz:5/35,work:2/30,tribe:20/45',
 PK:'army:25/70,clergy:8/45,biz:15/45,work:4/35,tribe:8/45', DZ:'army:25/65,biz:15/55,work:4/40', MA:'army:8/70,clergy:6/65,biz:25/65,work:4/40,tribe:6/60',
 NG:'army:8/50,clergy:6/50,biz:20/50,work:5/35,tribe:10/50', ET:'army:15/55,biz:10/45,work:3/40,party:15/55', VE:'army:30/55,biz:5/25,work:3/25,party:15/55',
 CN:'army:10/70,biz:18/50,work:5/50,party:30/75', KP:'army:25/65,biz:2/40,work:2/45,party:35/75', VN:'army:10/65,biz:15/60,work:5/55,party:25/70', CU:'army:25/60,biz:3/30,work:3/30,party:25/60',
 OB:'army:20/70,clergy:15/70,work:3/45', BI:'army:20/65,clergy:15/65,tribe:20/50'};
// What the group is called in that country (titles only — never real organisations or people)
const GS_NM={IR:{army:'Army & intelligence',clergy:'Clerical establishment',biz:'Bazaar merchants'},SA:{clergy:'Religious authorities',biz:'Oil company & business families'},
 AE:{biz:'Sovereign funds & trading houses'},IQ:{clergy:'Shia seminaries',biz:'Oil ministry & contractors'},RV:{army:'Brigade commanders',clergy:'Najaf seminaries'},
 RS:{clergy:'Clergy & scholars'},DW:{clergy:'Zaydi scholars'},EG:{army:'Armed forces & intelligence',clergy:'Al-Azhar scholars'},TR:{clergy:'Religious affairs directorate'},
 IL:{army:'Security establishment',clergy:'Religious parties'},RU:{army:'Security services & army',clergy:'Orthodox Church',biz:'Energy giants & tycoons'},
 PK:{army:'Army & intelligence',clergy:'Religious parties & seminaries'},AF:{clergy:'Clerical council'},KD:{army:'Peshmerga commanders',tribe:'Party-clan networks'},
 DZ:{biz:'State energy company'},LY:{army:'Armed forces & security',biz:'National oil company'},NG:{tribe:'Traditional rulers'},MA:{biz:'Royal holdings & business'},
 VE:{biz:'Private business',party:'Ruling party'},CU:{army:'Armed forces & their companies'},ET:{party:'Ruling party'},KP:{army:'Army (military first)'},
 AZ:{biz:'State oil company & holdings'},KZ:{biz:'Resource conglomerates'},US:{biz:'Corporations & defense industry'},JP:{biz:'Business federations'},KR:{biz:'Family conglomerates'}};
// privilege = [id, estate, name, benefit{stat,add|mul}, drawback{stat,add|mul}, plain text]
const GS_PRIV=[
  ['pv_a1','army','Veteran Land Grants',{stat:'manpower',mul:1.08},{stat:'income',mul:.97},'+8% manpower, -3% income'],
  ['pv_a2','army','Officers\' Academy',{stat:'warSupport',add:.03},{stat:'upkeep',mul:1.04},'+3% war support, +4% army upkeep'],
  ['pv_c1','clergy','Religious Schools',{stat:'ppPol',mul:1.08},{stat:'income',mul:.98},'+8% Political points, -2% income'],
  ['pv_c2','clergy','Pious Endowments',{stat:'unrest',add:-3},{stat:'income',mul:.97},'-3 unrest, -3% income'],
  ['pv_b1','biz','Trade Charters',{stat:'income',mul:1.05},{stat:'unrest',add:2},'+5% income, +2 unrest'],
  ['pv_b2','biz','Banking Licenses',{stat:'income',mul:1.03},{stat:'warSupport',add:-.02},'+3% income, -2% war support'],
  ['pv_w1','work','Union Recognition',{stat:'unrest',add:-3},{stat:'income',mul:.97},'-3 unrest, -3% income'],
  ['pv_w2','work','Public Works',{stat:'manpower',mul:1.05},{stat:'upkeep',mul:1.03},'+5% manpower, +3% army upkeep'],
  ['pv_t1','tribe','Tribal Subsidies',{stat:'unrest',add:-3},{stat:'income',mul:.97},'-3 unrest, -3% income'],
  ['pv_t2','tribe','Tribal Levies',{stat:'manpower',mul:1.08},{stat:'unrest',add:2},'+8% manpower, +2 unrest'],
  ['pv_g1','guard','Guard Business Concessions',{stat:'warSupport',add:.04},{stat:'income',mul:.95},'+4% war support, -5% income'],
  ['pv_g2','guard','Guard Commands the Missile Forces',{stat:'manpower',mul:1.06},{stat:'unrest',add:2},'+6% manpower, +2 unrest'],
  ['pv_p1','party','Party Cells in Every Firm',{stat:'ppPol',mul:1.1},{stat:'income',mul:.97},'+10% Political points, -3% income'],
  ['pv_p2','party','Party Controls the Press',{stat:'unrest',add:-3},{stat:'ppPol',mul:.95},'-3 unrest, -5% Political points']];
// loyal (>=60) / angry (<30) effect of each estate, and "overmighty" (influence >= 60)
const GS_EFX={army:[{stat:'manpower',mul:1.1},{stat:'manpower',mul:.9}],clergy:[{stat:'unrest',add:-3},{stat:'unrest',add:4}],
  biz:[{stat:'income',mul:1.03},{stat:'income',mul:.95}],work:[{stat:'income',mul:1.03},{stat:'income',mul:.94}],
  tribe:[{stat:'manpower',mul:1.05},{stat:'unrest',add:4}],guard:[{stat:'warSupport',add:.05},{stat:'unrest',add:3}],party:[{stat:'ppPol',mul:1.08},{stat:'unrest',add:4}]};
const GS_NAMES={};for(const e of GS_EST)GS_NAMES[e[0]]=e[1];
const GS_DEF='army:6/55,biz:22/55,work:8/45';
GMOD_STATS.unrest='Unrest';
function gsReg(c){const out={};for(const s of (GS_REG[c]||GS_DEF).split(',')){const m=s.split(':'),v=m[1].split('/');out[m[0]]=[+v[0],+v[1]];}return out;}
function gsList(c){const r=gsReg(c);return GS_EST.filter(e=>r[e[0]]);}
function gsHas(c,id){return !!gsReg(c)[id];}
function gsName(c,id){return (GS_NM[c]&&GS_NM[c][id])||GS_NAMES[id]||id;}
function gsN(c){const N=GC&&GC.nat[c];if(!N)return null;if(!N.pp&&typeof gidN==='function')gidN(c);if(N.stab===undefined)N.stab=0;if(!N.priv)N.priv=[];if(!N.est)N.est={};
  const R=gsReg(c);for(const id in R){let E=N.est[id];if(!E)E=N.est[id]={loy:R[id][1]};if(E.land===undefined){E.land=R[id][0];E.l0=R[id][0];E.b=R[id][1];if(E.loy===50)E.loy=R[id][1];}}
  if(N.sdrop===undefined)N.sdrop=-9;return N;}
GMOD_COND.est=(k,arg)=>{const N=GC&&GC.nat[k]?gsN(k):null;if(!N)return false;const i=arg.indexOf(':'),id=arg.slice(0,i),w=arg.slice(i+1),E=N.est[id];if(!E||!gsHas(k,id))return false;
  return w==='hi'?E.loy>=60:w==='lo'?E.loy<30:w==='big'?gsInfl(k,id)>=60:false;};
GMOD_COND.priv=(k,arg)=>{const N=GC&&GC.nat[k];return !!N&&!!N.priv&&N.priv.indexOf(arg)>=0;};
GMOD_COND.crown=(k,arg)=>{const N=GC&&GC.nat[k]?gsN(k):null;if(!N)return false;const v=gsCrown(k);return arg==='lo'?v<30:arg==='hi'?v>=60:false;};
function gsRow(id,src,stat,v,cond){const r={id,src,scope:'nation',stat,cond};if(v.add)r.add=v.add;if(v.mul)r.mul=v.mul;GMOD_ROWS.push(r);}
for(let s=-3;s<=3;s++){if(!s)continue;gsRow('stab_u'+s,s>0?'Stable (+'+s+')':'Unstable ('+s+')','unrest',{add:-2*s},'stab:'+s);}   // 'stab:' cond is defined by 13m-grandstab.js
for(const e of GS_EST){const f=GS_EFX[e[0]];gsRow('est_hi_'+e[0],'Loyal '+e[1],f[0].stat,f[0],'est:'+e[0]+':hi');gsRow('est_lo_'+e[0],'Angry '+e[1],f[1].stat,f[1],'est:'+e[0]+':lo');
  gsRow('est_big_'+e[0],'Overmighty '+e[1],'unrest',{add:3},'est:'+e[0]+':big');}
for(const p of GS_PRIV){gsRow(p[0]+'b',p[2],p[3].stat,p[3],'priv:'+p[0]);gsRow(p[0]+'c',p[2]+' (drawback)',p[4].stat,p[4],'priv:'+p[0]);}
gsRow('crown_lo','Little state control (under 30%)','income',{mul:.92},'crown:lo');gsRow('crown_lo2','Little state control (under 30%)','unrest',{add:3},'crown:lo');
gsRow('crown_hi','Strong state control (60%+)','income',{mul:1.02},'crown:hi');
function gsPc(N,id){return N.priv.filter(x=>GS_PRIV.some(p=>p[0]===x&&p[1]===id)).length;}
function gsInfl(c,id){const N=gsN(c);if(!N||!N.est[id])return 0;const E=N.est[id];return Math.max(0,Math.min(100,Math.round(8+E.land+10*gsPc(N,id)+(E.loy>=60?5:0))));}
function gsCrown(c){const N=gsN(c);if(!N)return 100;let s=0;for(const e of gsList(c))s+=N.est[e[0]].land;return Math.max(0,Math.round(100-s));}
// ---- agendas: [id, estates, text(v), when(c,N)->v or null, done(c,N,v)]
function gsUn(c){return typeof gcrUn==='function'?gcrUn(c):0;}
function gsArmies(c){return GC.armies.filter(a=>a.o===c).length;}
function gsWar(c){try{return Object.keys(GC.nat).some(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}catch(e){return false;}}
const GS_AG=[
 ['ag_res','biz','Build cash reserves to $%',(c,N)=>Math.round((Math.max(2000,N.cash+1500))/100)*100,(c,N,v)=>N.cash>=v],
 ['ag_peace','biz work','Make peace — the war is ruining livelihoods',(c,N)=>gsWar(c)?0:null,(c)=>!gsWar(c)],
 ['ag_calm','work clergy tribe party','Bring average unrest down to %',(c,N)=>{const u=gsUn(c);return u>15?Math.max(5,Math.round(u-10)):null;},(c,N,v)=>gsUn(c)<=v],
 ['ag_army','army guard','Field a larger force: % armies on the map',(c,N)=>gsArmies(c)+1,(c,N,v)=>gsArmies(c)>=v],
 ['ag_stab','clergy party army','Restore order: reach stability %',(c,N)=>(N.stab|0)<3?Math.min(3,(N.stab|0)+1):null,(c,N,v)=>(N.stab|0)>=v],
 ['ag_core','party army guard','Secure the new lands: make a conquered province core',(c,N)=>{const n=gsNonCore(c).length;return n?n:null;},(c,N,v)=>gsNonCore(c).length<v],
 ['ag_priv','army clergy biz work tribe guard party','Grant us a new privilege',(c,N)=>0,(c,N,v,id)=>gsPc(N,id)>(N.est[id].ag?N.est[id].ag.pc:0)]];
const GS_AGREW={army:{stat:'manpower',mul:1.05,t:'+5% manpower'},guard:{stat:'warSupport',add:.04,t:'+4% war support'},biz:{stat:'income',add:.03,t:'+3% income'},
  work:{stat:'unrest',add:-2,t:'-2 unrest'},clergy:{stat:'unrest',add:-2,t:'-2 unrest'},tribe:{stat:'unrest',add:-2,t:'-2 unrest'},party:{stat:'ppPol',mul:1.06,t:'+6% Political points'}};
function gsAgText(a){const r=GS_AG.find(x=>x[0]===a.id);return r?r[2].replace('%',a.v):'';}
function gsAgPick(c,N,id){const opts=GS_AG.filter(a=>a[1].split(' ').indexOf(id)>=0);if(!opts.length)return;
  const k=(GC.turn+c.charCodeAt(0)+c.charCodeAt(1)+id.length*3)%opts.length;
  for(let j=0;j<opts.length;j++){const a=opts[(k+j)%opts.length];if(a[0]==='ag_priv'&&!GS_PRIV.some(p=>p[1]===id&&N.priv.indexOf(p[0])<0))continue;
    const v=a[3](c,N);if(v===null||v===undefined)continue;if(a[0]!=='ag_priv'&&a[4](c,N,v,id))continue;N.est[id].ag={id:a[0],v,t:GC.turn+12,pc:gsPc(N,id)};return;}}
function gsAgDone(c,id,ok){const N=gsN(c),E=N.est[id];if(!E||!E.ag)return;const nm=gsName(c,id);
  if(ok){E.loy=Math.min(100,E.loy+15);const r=GS_AGREW[id];const row={id:'esag_'+c+'_'+id,src:nm+' satisfied',scope:'nation',stat:r.stat,t:c,until:GC.turn+12};if(r.add)row.add=r.add;if(r.mul)row.mul=r.mul;gmodAdd(row);
    if(c===GC.me)grLog('The '+nm+' got what they asked for: loyalty +15, '+r.t+' for a year.',c);}
  else{E.loy=Math.max(0,E.loy-10);E.land=Math.min(60,E.land+3);if(c===GC.me)grLog('The '+nm+' feel ignored: loyalty -10 and they take more control of the economy.',c);}
  E.ag=null;E.agT=GC.turn;}
function gsAgRefuse(c,id){const N=gsN(c),E=N&&N.est[id];if(!E||!E.ag)return 'Nothing to refuse.';E.ag=null;E.agT=GC.turn;E.loy=Math.max(0,E.loy-8);GMOD_C.cache.clear();if(c===GC.me)grLog('Refused the '+gsName(c,id)+'\'s demand (loyalty -8).',c);return '';}
// ---- land: seize (state takes 5% back, the group is furious, every other group is nervous) or sell (cash now, the group grows)
const GS_LANDCD=6;
function gsLand(c,id,seize){const N=gsN(c),E=N&&N.est[id];if(!E||!gsHas(c,id))return 'No such group.';if(N.esT!=null&&GC.turn-N.esT<GS_LANDCD)return 'Wait '+(GS_LANDCD-(GC.turn-N.esT))+' months.';
  if(seize){if(E.land<5)return 'They hold too little.';E.land-=5;E.loy=Math.max(0,E.loy-15);for(const e of gsList(c))if(e[0]!==id)N.est[e[0]].loy=Math.max(0,N.est[e[0]].loy-3);
    if(c===GC.me)grLog('Seized assets from the '+gsName(c,id)+': state control +5%, they are furious.',c);}
  else{if(gsCrown(c)<10)return 'The state has almost nothing left to sell.';E.land+=5;E.loy=Math.min(100,E.loy+10);N.cash+=300;if(c===GC.me)grLog('Sold state assets to the '+gsName(c,id)+' for $300.',c);}
  N.esT=GC.turn;GMOD_C.cache.clear();return '';}
// effect used by the ONE event engine: ['est', id, loyalty change, land change]
function gsEstFx(c,id,dl,dland){const N=gsN(c),E=N&&N.est[id];if(!E)return '';E.loy=Math.max(0,Math.min(100,E.loy+dl));E.land=Math.max(0,Math.min(60,E.land+(dland||0)));GMOD_C.cache.clear();
  return gsName(c,id)+': loyalty '+(dl>=0?'+':'')+dl+(dland?', control '+(dland>0?'+':'')+dland+'%':'');}
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
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;gsN(c);const war=gsWar(c),un=gsUn(c);
    for(const e of gsList(c)){const id=e[0],E=N.est[id],pc=gsPc(N,id);
      let t=E.b+10*pc+5*(N.stab|0)-0.6*Math.max(0,E.l0-E.land);
      if(id==='army'||id==='guard')t+=war?8:0;else if(id==='biz')t+=(N.inc|0)>0?6:-8;else if(id==='work')t-=Math.max(-8,Math.min(14,(un-30)/3));else t-=(N.stab|0)<0?6:0;
      E.loy=Math.max(0,Math.min(100,Math.round((E.loy+(t-E.loy)*.2)*10)/10));
      // agendas
      if(E.ag){const a=GS_AG.find(x=>x[0]===E.ag.id);if(!a)E.ag=null;else if(a[4](c,N,E.ag.v,id))gsAgDone(c,id,true);else if(GC.turn>=E.ag.t)gsAgDone(c,id,false);}
      else if(E.loy<70&&(E.agT==null||GC.turn-E.agT>=6))gsAgPick(c,N,id);}
    // crisis: the most dangerous disloyal + influential group (at most one a year)
    if(N.esc==null||GC.turn-N.esc>=12){let worst=null;for(const e of gsList(c)){const E=N.est[e[0]];if(E.loy<30&&gsInfl(c,e[0])>=40&&(!worst||gsInfl(c,e[0])-E.loy>gsInfl(c,worst)-N.est[worst].loy))worst=e[0];}
      if(worst&&typeof gevFire==='function'){const S=gevS();if(!S.pend.some(p=>p[0]===c)){N.esc=GC.turn;gevFire(c,'es_'+worst);}}}
    if(c!==GC.me&&N.ai!==false&&N.pp){   // AI: fixed rules, only spends what ideas left over
      const nc=gsNonCore(c).filter(p=>!GC.prov[p.i].coring).sort((a,b)=>b.dev-a.dev||a.i-b.i)[0];if(nc&&N.pp.pol>=gsCoreCost(c,nc.i)+15)gsCoreStart(c,nc.i);
      for(const p of GS_PRIV){if(!gsHas(c,p[1]))continue;const E=N.est[p[1]];if(E.loy<40&&N.priv.indexOf(p[0])<0&&!gsPc(N,p[1])){gsPriv(c,p[0],true);break;}}
      if(gsCrown(c)<25){const big=gsList(c).map(e=>e[0]).filter(id=>N.est[id].loy>=55&&N.est[id].land>=5).sort((a,b)=>N.est[b].land-N.est[a].land)[0];if(big)gsLand(c,big,true);}}}
  GMOD_C.cache.clear();}
function gsPriv(c,id,on){const N=gsN(c),p=GS_PRIV.find(x=>x[0]===id);if(!N||!p||!gsHas(c,p[1]))return 'Not available.';const had=N.priv.indexOf(id)>=0,E=N.est[p[1]],nm=gsName(c,p[1]);
  if(on){if(had)return '';N.priv.push(id);E.loy=Math.min(100,E.loy+10);E.land=Math.min(60,E.land+5);if(c===GC.me)grLog('Granted "'+p[2]+'" to the '+nm+'.',c);}
  else{if(!had)return '';N.priv=N.priv.filter(x=>x!==id);E.loy=Math.max(0,E.loy-15);E.land=Math.max(0,E.land-5);if(c===GC.me)grLog('Revoked "'+p[2]+'"; the '+nm+' are angry.',c);}
  GMOD_C.cache.clear();return '';}
GMOD_HOOKS.push(gsMonth);
alAdd('estates','🏛','Estates',c=>{const N=gsN(c);if(!N)return null;const lo=gsList(c).filter(e=>N.est[e[0]].loy<30);return lo.length?{n:lo.length,bad:1,tip:lo.map(e=>gsName(c,e[0])).join(', ')+' unhappy — grant a privilege or meet their demand',go:()=>{try{npOpen(c,'estates');}catch(e){}}}:null;});
// ---- the Estates tab: state-control pie, one card per power group, then core provinces
function gsPie(c){const N=gsN(c);let a=0;const seg=[];for(const e of gsList(c)){const v=N.est[e[0]].land;seg.push(GS_COL[e[0]]+' '+a+'% '+(a+v)+'%');a+=v;}seg.push(GS_COL.crown+' '+a+'% 100%');return 'conic-gradient('+seg.join(',')+')';}
function gsBar(v,col){return '<span style="display:inline-block;width:110px;height:8px;border-radius:4px;background:#22364a;vertical-align:middle;overflow:hidden"><span style="display:block;height:100%;width:'+Math.max(0,Math.min(100,v))+'%;background:'+col+'"></span></span>';}
function gsFxText(id,w){const f=GS_EFX[id][w];return (GMOD_STATS[f.stat]||f.stat)+' '+(f.add?(f.add>0?'+':'')+(Math.abs(f.add)<1?Math.round(f.add*100)+'%':f.add):(f.mul>1?'+':'')+Math.round((f.mul-1)*100)+'%');}
npTab('estates','🏛','Estates',(code,body,c)=>{const N=gsN(code),own=c.own&&code===GC.me;
  const btn=(t,fn,dis,tip)=>{const b=document.createElement('button');b.textContent=t;b.style.cssText='font-size:13px;padding:2px 10px;cursor:pointer;border-radius:5px;border:1px solid #5a7a96;background:#1a2c3e;color:#e8e4d8';b.disabled=!!dis;if(tip)b.title=tip;b.onclick=()=>{const e=fn();if(e&&typeof grLog==='function')grLog(e,code);npDraw();};return b;};
  const L=gsList(code),crown=gsCrown(code),cd=N.esT!=null&&GC.turn-N.esT<GS_LANDCD;
  body.innerHTML='';
  const top=guEl('div','display:flex;gap:22px;align-items:center;margin-bottom:10px;flex-wrap:wrap');
  top.appendChild(guEl('div','width:120px;height:120px;border-radius:50%;flex:none;border:2px solid #c9a35a;box-shadow:0 2px 10px rgba(0,0,0,.5);background:'+gsPie(code)));
  top.appendChild(guEl('div','flex:1;min-width:240px','<div style="font-size:18px;font-family:Georgia,serif;color:#ffe6a8">Who holds power</div><div style="opacity:.8;font-size:14px;margin-bottom:4px">Share of the state\'s assets each group controls. Under 30% state control: -8% income, +3 unrest. 60%+: +2% income.</div>'+
    L.map(e=>'<span style="white-space:nowrap;margin-right:12px;font-size:14px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+GS_COL[e[0]]+'"></span> '+gsName(code,e[0])+' '+Math.round(N.est[e[0]].land)+'%</span>').join('')+
    '<span style="white-space:nowrap;font-size:14px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+GS_COL.crown+'"></span> <b>State control '+crown+'%</b></span>'));
  body.appendChild(top);
  for(const e of L){const id=e[0],E=N.est[id],inf=gsInfl(code,id),box=guEl('div','margin:8px 0;padding:8px 12px;border:1px solid #34506a;border-left:4px solid '+GS_COL[id]+';border-radius:6px;background:#132233');
    const lc=E.loy>=60?'#6fdc8c':E.loy<30?'#e0533f':'#d8c27a',risk=E.loy<30&&inf>=40;
    const mod=E.loy>=60?'<span style="color:#6fdc8c">Loyal: '+gsFxText(id,0)+'</span>':E.loy<30?'<span style="color:#e0533f">Angry: '+gsFxText(id,1)+'</span>':'<span style="opacity:.7">No effect (loyal at 60: '+gsFxText(id,0)+')</span>';
    box.innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><b style="font-size:17px">'+gsName(code,id)+'</b><span style="opacity:.65;font-size:14px">'+e[2]+'</span>'+(risk?'<span style="color:#e0533f;font-size:14px">⚠ crisis risk</span>':'')+(inf>=60?'<span style="color:#e0a33f;font-size:14px">overmighty</span>':'')+'</div>'+
      '<div style="font-size:14px;display:flex;gap:6px 18px;flex-wrap:wrap;margin:3px 0">'+'<span>Loyalty '+gsBar(E.loy,lc)+' <b style="color:'+lc+'">'+Math.round(E.loy)+'</b></span><span>Influence '+gsBar(inf,'#c9a35a')+' <b>'+inf+'</b></span><span>Controls <b>'+Math.round(E.land)+'%</b></span><span>'+mod+'</span></div>';
    if(E.ag){const r=GS_AGREW[id],ag=guEl('div','font-size:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:3px 0','<span style="flex:1">📜 <b>Demand:</b> '+gsAgText(E.ag)+' <span style="opacity:.7">— '+Math.max(0,E.ag.t-GC.turn)+' months. Done: loyalty +15, '+r.t+' for a year. Ignored: loyalty -10, they take 3% more.</span></span>');
      if(own)ag.appendChild(btn('Refuse',()=>gsAgRefuse(code,id),false,'Loyalty -8 now instead of -10 later'));box.appendChild(ag);}
    for(const p of GS_PRIV.filter(x=>x[1]===id)){const has=N.priv.indexOf(p[0])>=0,row=guEl('div','display:flex;align-items:center;gap:10px;padding:2px 0;font-size:14px','<span style="flex:1">'+(has?'✔ ':'')+'<b>'+p[2]+'</b> <span style="opacity:.75">— '+p[5]+'; hands them 5% control</span></span>');
      if(own)row.appendChild(btn(has?'Revoke':'Grant',()=>gsPriv(code,p[0],!has),false,has?'Loyalty -15, they lose 5% control':'Loyalty +10, they gain 5% control'));box.appendChild(row);}
    if(own){const lr=guEl('div','display:flex;gap:8px;justify-content:flex-end;margin-top:3px');lr.appendChild(btn('Seize assets',()=>gsLand(code,id,true),cd||E.land<5,'State control +5%; this group loyalty -15, every other group -3'));
      lr.appendChild(btn('Sell assets (+$300)',()=>gsLand(code,id,false),cd||crown<10,'$300 now; this group +5% control, loyalty +10'));box.appendChild(lr);}
    body.appendChild(box);}
  const nc=gsNonCore(code);const h2=guEl('div','font-size:17px;margin:16px 0 4px','<b>Core provinces</b> <span style="opacity:.7;font-size:14px">— conquered land earns 30% less and is restless until it is made core ('+GS_COREMONTHS+' months)</span>');body.appendChild(h2);
  const pol=N.pp?Math.floor(N.pp.pol):0;
  if(!nc.length)body.appendChild(Object.assign(document.createElement('div'),{textContent:'Every province you hold is a core province.'}));
  else npTable(body,['Province','Core cost','Status',''],nc.slice(0,14).map(p=>{const st=GC.prov[p.i];return {cells:[p.n,gsCoreCost(code,p.i)+' Political',st.coring?'ready in '+Math.max(0,st.coring.t-GC.turn)+' months':'not core',''],i:p.i};}),r=>npFly(r.i));
  if(own&&nc.length){const row=document.createElement('div');row.style.cssText='margin-top:6px';const t=nc.filter(p=>!GC.prov[p.i].coring).sort((a,b)=>b.dev-a.dev||a.i-b.i)[0];
    if(t)row.appendChild(btn('Make '+t.n+' core ('+gsCoreCost(code,t.i)+' Political)',()=>gsCoreStart(code,t.i),pol<gsCoreCost(code,t.i)));body.appendChild(row);}});
