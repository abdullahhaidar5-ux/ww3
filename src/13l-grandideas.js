// B3 POWER POINTS + NATIONAL IDEAS (lane B, EU4-style). Three pools — Political (pol), Diplomatic (dip), Military (mil) — grow every month
// via the ONE monthly hook (gmodMonth -> GMOD_HOOKS). Points are spent on ideas; every idea is only a ROW in the modifier table (GMOD_ROWS,
// cond 'idea:<id>'), never bespoke code. Each morale style has its own 4-idea tree (equal total value, different flavour) + 3 groups for everyone.
// State: GC.nat[c].pp={pol,dip,mil,t} and GC.nat[c].idea=[ids] (saved with the campaign). Deterministic: no random, AI buys in a fixed order.
const GID_POOL={pol:'Political',dip:'Diplomatic',mil:'Military'};
const GID_COST=[30,45,60,80,100,125,150];
// idea = [id, name, pool, stat, add|mul, description]
const GID_GROUPS={
  zeal:{name:'Martyrdom & Fervor',tree:1,ideas:[
    ['zl1','Volunteers\' Call','mil','manpower',{mul:1.15},'+15% manpower'],
    ['zl2','Faith in the Cause','pol','warSupport',{add:.06},'+6% war support'],
    ['zl3','Hold the Line','mil','homeMorale',{mul:1.15},'+15% home-ground morale'],
    ['zl4','Cost of Sacrifice','pol','upkeep',{mul:.93},'-7% army upkeep']]},
  prof:{name:'Staff & Training',tree:1,ideas:[
    ['pf1','Reserve Registers','mil','manpower',{mul:1.15},'+15% manpower'],
    ['pf2','Officer Corps','pol','warSupport',{add:.06},'+6% war support'],
    ['pf3','Staff College','mil','rallySpeed',{mul:1.15},'+15% rally speed'],
    ['pf4','Logistics Corps','pol','upkeep',{mul:.93},'-7% army upkeep']]},
  home:{name:'Fortified Homeland',tree:1,ideas:[
    ['hm1','Territorial Militia','mil','manpower',{mul:1.15},'+15% manpower'],
    ['hm2','Defend the Hearth','pol','warSupport',{add:.06},'+6% war support'],
    ['hm3','Known Ground','mil','homeMorale',{mul:1.15},'+15% home-ground morale'],
    ['hm4','Local Depots','pol','upkeep',{mul:.93},'-7% army upkeep']]},
  fire:{name:'Fire Support Doctrine',tree:1,ideas:[
    ['fr1','Mobile Reserves','mil','manpower',{mul:1.15},'+15% manpower'],
    ['fr2','Public Confidence','pol','warSupport',{add:.06},'+6% war support'],
    ['fr3','Precision Fires','mil','fireSupport',{mul:1.15},'+15% fire support'],
    ['fr4','Munitions Contracts','pol','upkeep',{mul:.93},'-7% army upkeep']]}
};
// ---- IDEA GROUPS (EU4-style, modern). Three columns = the three point pools. Each group: 7 ideas bought in order + a completion bonus.
// Equal value by construction: every idea = 2 value units, every completion bonus = 3 units, every group's built-in cost = 1 unit (GID_U).
// World-sim cost/counter: each group has one cost row (active while the group is picked) and some move other nations (threat perception, see gidWorld).
const GID_U={income:['mul',.02,'income'],manpower:['mul',.04,'manpower'],upkeep:['mul',-.03,'army upkeep'],warSupport:['add',.03,'war support'],
  unrest:['add',-1,'unrest'],forceLimit:['mul',.04,'force limit'],armyMor:['add',2,'army max morale'],ppPol:['mul',.06,'Political points'],
  ppDip:['mul',.06,'Diplomatic points'],ppMil:['mul',.06,'Military points'],fires:['mul',.02,'fire support in battle'],attack:['mul',.02,'attack strength'],
  defense:['mul',.03,'defense strength'],spy:['mul',.08,'spy & sabotage success'],spyDef:['mul',.08,'protection from enemy spies']};
function gidFx(stat,u){const U=GID_U[stat],v=U[1]*u,o={};if(U[0]==='add')o.add=Math.round(v*1000)/1000;else o.mul=Math.round((1+v)*1000)/1000;
  const s=v>0?'+':'-',a=Math.abs(v);o.txt=(U[0]==='mul'||stat==='warSupport'?s+Math.round(a*100)+'% ':s+Math.round(a)+' ')+U[2];return o;}
// [key, column, name, picture motif, [[idea name, stat] x7], [bonus stat], [cost stat, why], tagline]
const GID_SPEC=[
 ['tech','pol','Technocratic State','tower',[['Expert Ministries','ppPol'],['E-Government','income'],['Science Cities','income'],['Digital Tax Office','income'],['Merit Civil Service','unrest'],['Venture Fund','income'],['Innovation Agency','ppMil']],'ppPol',['warSupport','experts run the state, the street is less fired up'],'Experts and data run the state.'],
 ['rel','pol','Religious Authority','dome',[['Clerical Council','unrest'],['Friday Sermons','warSupport'],['Charitable Endowments','unrest'],['Seminary Network','ppPol'],['Martyrs\' Foundation','warSupport'],['Religious Guard','armyMor'],['Pilgrimage Routes','income']],'warSupport',['ppDip','foreign capitals distrust a religious state'],'Faith binds people and state.'],
 ['econ','pol','Economic Planning','factory',[['Five-Year Plan','income'],['State Industries','income'],['Price Controls','unrest'],['Infrastructure Drive','income'],['Strategic Reserves','upkeep'],['Export Councils','income'],['Sovereign Wealth Fund','income']],'income',['ppPol','planning bureaucracy slows reforms'],'The state steers the economy.'],
 ['sec','pol','Internal Security','shield',[['Border Police','unrest'],['Surveillance State','spyDef'],['Riot Police','unrest'],['Counter-Terror Units','spyDef'],['Informant Network','unrest'],['Loyalty Vetting','armyMor'],['Emergency Laws','unrest']],'unrest',['ppDip','human-rights criticism abroad'],'Order at home above all.'],
 ['fed','pol','Federal Administration','capitol',[['Regional Governors','unrest'],['Revenue Sharing','income'],['Provincial Courts','unrest'],['National Highways','upkeep'],['Census Bureau','manpower'],['Local Elections','warSupport'],['Federal Budget','income']],'ppPol',['ppMil','regions push back on central war plans'],'Many regions, one state.'],
 ['nb','pol','Nation-Building','flag',[['National Curriculum','warSupport'],['Flag & Anthem','warSupport'],['Cadet Schools','manpower'],['Common Language','unrest'],['Veterans\' Pensions','armyMor'],['Public Media','warSupport'],['National Service','manpower']],'manpower',['unrest','minorities feel pushed aside'],'One people, one story.'],
 ['intel','dip','Intelligence & Espionage','dish',[['Signals Intelligence','spy'],['Agent Networks','spy'],['Counter-Intelligence','spyDef'],['Analysts Directorate','ppDip'],['Cyber Unit','spy'],['Covert Operations','attack'],['Station Chiefs','ppDip']],'spy',['upkeep','black budgets cost money'],'Know first, strike first.'],
 ['ally','dip','Alliance Diplomacy','flags',[['Embassy Network','ppDip'],['Joint Exercises','armyMor'],['Defense Pacts','defense'],['Summit Diplomacy','ppDip'],['Basing Agreements','forceLimit'],['Common Standards','fires'],['Coalition Command','attack']],'ppDip',['upkeep','commitments abroad must be paid for'],'Strength through partners.'],
 ['trade','dip','Trade & Sanctions','ship',[['Free Trade Deals','income'],['Customs Union','income'],['Shipping Insurance','income'],['Sanctions Office','ppDip'],['Export Controls','spyDef'],['Financial Hub','income'],['Currency Reserves','upkeep']],'income',['warSupport','traders hate wars that close markets'],'Money is a weapon too.'],
 ['info','dip','Information War','mast',[['State Broadcaster','warSupport'],['Social Media Units','warSupport'],['Foreign-Language News','ppDip'],['Narrative Cells','unrest'],['Psychological Operations','attack'],['Rapid Rebuttal','warSupport'],['Global Audience','ppDip']],'warSupport',['ppDip','other governments see propaganda; nearby nations trust you less'],'Win the story, win the war.'],
 ['naval','dip','Naval Power Projection','carrier',[['Blue-Water Fleet','forceLimit'],['Carrier Groups','fires'],['Overseas Bases','forceLimit'],['Marine Corps','attack'],['Sea Lane Patrols','income'],['Amphibious Doctrine','attack'],['Naval Air Arm','fires']],'forceLimit',['upkeep','fleets are expensive to keep at sea'],'Reach any shore.'],
 ['proxy','dip','Influence & Proxies','nodes',[['Advisers Abroad','ppDip'],['Allied Militias','manpower'],['Arms Pipelines','fires'],['Political Wings','ppDip'],['Training Camps','armyMor'],['Funding Networks','spy'],['Axis Coordination','attack']],'ppDip',['upkeep','partners abroad must be armed and paid; nearby nations feel threatened'],'Fight through friends.'],
 ['ca','mil','Combined Arms','tank',[['Joint Staff','ppMil'],['Armor-Infantry Teams','attack'],['Forward Observers','fires'],['Mechanized Brigades','attack'],['Air-Land Battle','fires'],['Battle Networks','defense'],['Integrated Logistics','upkeep']],'attack',['income','modern equipment is expensive'],'Every arm fights as one.'],
 ['off','mil','Offensive Doctrine','arrows',[['Shock Troops','attack'],['Deep Battle','attack'],['Breakthrough Artillery','fires'],['High Tempo','attack'],['Assault Engineers','attack'],['Exploitation Forces','manpower'],['Victory Bulletins','warSupport']],'attack',['defense','an army built to attack digs in badly'],'Attack is the best defense.'],
 ['def','mil','Defensive Doctrine','fort',[['Fortified Lines','defense'],['Defense in Depth','defense'],['Minefields','defense'],['Anti-Tank Belts','defense'],['Territorial Defense','manpower'],['Bunker Networks','defense'],['Hold at All Costs','armyMor']],'defense',['attack','an army built to hold attacks slowly'],'Make every hill a fortress.'],
 ['qual','mil','Quality','badge',[['Professional NCOs','armyMor'],['Long Service','attack'],['Precision Weapons','fires'],['Simulators','ppMil'],['Elite Units','attack'],['Night Fighting','defense'],['Retention Bonus','manpower']],'armyMor',['manpower','a small professional army has fewer recruits'],'Fewer, better soldiers.'],
 ['quan','mil','Quantity','ranks',[['Universal Conscription','manpower'],['Reserve Divisions','forceLimit'],['Mass Production','upkeep'],['Militia Levy','manpower'],['People\'s Army','forceLimit'],['Deep Reserves','manpower'],['Cheap Rifles','upkeep']],'manpower',['armyMor','conscripts are less trained'],'Numbers win wars.'],
 ['air','mil','Air & Drone Power','jet',[['Air Superiority','fires'],['Drone Squadrons','fires'],['Loitering Munitions','attack'],['Air Defense Network','defense'],['Recon Drones','spy'],['Precision Strike','fires'],['Drone Factories','upkeep']],'fires',['income','aircraft and drones are costly'],'Rule the sky.']];
for(const s of GID_SPEC){const ideas=s[4].map((d,n)=>{const f=gidFx(d[1],2),o=f.add!==undefined?{add:f.add}:{mul:f.mul};return [s[0]+(n+1),d[0],s[1],d[1],o,f.txt];});
  const b=gidFx(s[5],3),c=gidFx(s[6][0],-1);GID_GROUPS[s[0]]={name:s[2],col:s[1],art:s[3],tag:s[7],ideas,bonus:{stat:s[5],fx:b,txt:b.txt},cost:{stat:s[6][0],fx:c,txt:c.txt,why:s[6][1]}};}
const GID_COLS=['pol','dip','mil'];
const GID_BIG=['US','CN','RU','IN','GB','FR','DE','JP'];   // realistic start: the big powers run 3 idea groups, everyone else 2
const GID_OLD={eco:'econ',dip:'ally',mil:'quan'};          // old saves: the 3 old shared groups map onto their modern successors
const GID_OLDP={eco:'ec',dip:'dp',mil:'ml'};
// AI character (deterministic pick order); nations not listed follow their morale style
const GID_AI={US:'naval ca ally air intel tech trade qual',IL:'qual intel air def tech ally ca info',IR:'rel proxy quan def intel sec info nb',RU:'quan info intel off sec econ air proxy',
  CN:'econ naval quan tech sec info trade air',KP:'sec quan def nb econ intel info off',GB:'naval intel ally qual trade fed ca tech',FR:'naval ally qual intel tech econ ca info',
  DE:'tech econ ally trade def fed qual ca',TR:'quan air nb proxy sec off econ ally',SA:'air econ rel trade ally sec qual tech',AE:'tech trade air qual ally sec econ intel',
  RS:'rel def info quan nb intel air sec',DW:'rel def quan air nb info proxy sec',RV:'rel quan nb def proxy info sec intel',UA:'def air nb ally intel tech quan info',
  IN:'quan def econ fed nb tech naval air',PK:'quan def sec rel nb intel air ally',JP:'tech naval def qual econ ally trade air',KR:'tech def qual ally econ trade air nb',
  EG:'quan sec def econ nb ally air rel',IQ:'quan sec fed def rel nb econ ally',SY:'sec quan def nb info intel rel econ',
  zeal:'rel quan def nb info proxy sec intel',prof:'ca qual ally econ intel fed off trade',home:'def nb quan econ sec trade fed info',fire:'air qual trade tech ally intel ca naval'};
GMOD_COND.idea=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&N.idea&&N.idea.indexOf(arg)>=0);};
GMOD_COND.igrp=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&N.ig&&N.ig.indexOf(arg)>=0);};
for(const g of Object.keys(GID_GROUPS)){const G=GID_GROUPS[g];for(const i of G.ideas){const r={id:'idea_'+i[0],src:i[1],scope:'nation',stat:i[3],cond:'idea:'+i[0]};if(i[4].add)r.add=i[4].add;if(i[4].mul)r.mul=i[4].mul;GMOD_ROWS.push(r);}
  if(G.bonus){const b={id:'idea_'+g+'_done',src:G.name+' (all ideas)',scope:'nation',stat:G.bonus.stat,cond:'idea:'+g+'7'};if(G.bonus.fx.add!==undefined)b.add=G.bonus.fx.add;else b.mul=G.bonus.fx.mul;GMOD_ROWS.push(b);}
  if(G.cost){const c={id:'idea_'+g+'_cost',src:G.name+' — cost',scope:'nation',stat:G.cost.stat,cond:'igrp:'+g};if(G.cost.fx.add!==undefined)c.add=G.cost.fx.add;else c.mul=G.cost.fx.mul;GMOD_ROWS.push(c);}}
function gidStyle(c){try{return MORALE_STYLE[grNat(c).fac]||MORALE_STYLE[c]||'prof';}catch(e){return 'prof';}}
function gidGroups(c){const N=gidN(c);return [gidStyle(c)].concat(N?N.ig:[]);}
// slots: 2 (big powers 3) + 1 per 2 research levels, max 8
function gidSlots(c){const N=GC&&GC.nat[c];if(!N)return 0;let r=0;if(N.rs)for(const k in N.rs)r+=N.rs[k]|0;return Math.min(8,(GID_BIG.indexOf(c)>=0?3:2)+Math.floor(r/2));}
function gidN(c){const N=GC&&GC.nat[c];if(!N)return null;if(!N.pp)N.pp={pol:20,dip:20,mil:20,t:GC.turn};if(!N.idea)N.idea=[];
  if(!N.ig){N.ig=[];for(const o in GID_OLD){const old=N.idea.filter(x=>x.indexOf(GID_OLDP[o])===0&&/^\D+\d$/.test(x)&&x.length===3);if(!old.length)continue;   // old save: ec1/dp2/ml3 -> modern group, same count
      const g=GID_OLD[o];N.ig.push(g);N.idea=N.idea.filter(x=>old.indexOf(x)<0);for(let n=0;n<old.length;n++)N.idea.push(GID_GROUPS[g].ideas[n][0]);}}
  return N;}
function gidMonthGain(c){const N=GC.nat[c],own=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c).length;let war=false;try{war=Object.keys(GC.nat).some(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}catch(e){}
  const na=GC.armies.filter(a=>a.o===c).length;
  return {pol:gmod('nation',c,'ppPol',2+Math.min(4,Math.floor(own/8))),dip:gmod('nation',c,'ppDip',2+(war?0:1)),mil:gmod('nation',c,'ppMil',2+(war?1:0)+Math.min(3,Math.floor(na/4)))};}
function gidNext(c,g){const N=gidN(c);for(const i of GID_GROUPS[g].ideas)if(N.idea.indexOf(i[0])<0)return i;return null;}
function gidLevel(c,g){const N=gidN(c);return GID_GROUPS[g].ideas.filter(i=>N.idea.indexOf(i[0])>=0).length;}
// pick an idea group into a free slot (costs nothing); returns an error string or ''
function gidPick(c,g){const N=gidN(c),G=GID_GROUPS[g];if(!N||!G||G.tree)return 'Not available.';if(N.ig.indexOf(g)>=0)return 'Already picked.';
  if(N.ig.length>=gidSlots(c))return 'No free idea slot — research raises the number of slots.';N.ig.push(g);GMOD_C.cache.clear();
  if(c===GC.me)grLog('Chose the idea group "'+G.name+'" (cost while kept: '+G.cost.txt+' — '+G.cost.why+').',c);return '';}
// drop a group: its ideas are lost and nothing is refunded
function gidDrop(c,g){const N=gidN(c),G=GID_GROUPS[g];if(!N||!G||N.ig.indexOf(g)<0)return 'Not picked.';N.ig=N.ig.filter(x=>x!==g);const ids=G.ideas.map(i=>i[0]);N.idea=N.idea.filter(x=>ids.indexOf(x)<0);GMOD_C.cache.clear();
  if(c===GC.me)grLog('Dropped the idea group "'+G.name+'" — its ideas are lost.',c);return '';}
function gidCost(c,g){return GID_COST[gidLevel(c,g)];}
// the ONE buy function (player button and AI both): returns an error string or '' on success
function gidBuy(c,g){const N=gidN(c);if(!N||!GID_GROUPS[g]||gidGroups(c).indexOf(g)<0)return 'Not available.';const i=gidNext(c,g);if(!i)return 'All ideas in this group are adopted.';
  const cost=GID_COST[gidLevel(c,g)];if(N.pp[i[2]]<cost)return 'Needs '+cost+' '+GID_POOL[i[2]]+' points.';N.pp[i[2]]-=cost;N.idea.push(i[0]);GMOD_C.cache.clear();
  if(c===GC.me)grLog('Adopted the idea "'+i[1]+'" ('+i[5]+').',c);return '';}
function gidAiPrefs(c){return (GID_AI[c]||GID_AI[gidStyle(c)]||GID_AI.prof).split(' ');}
// WORLD reaction: proxies and information war raise nearby nations' threat perception (their opinion of you sinks every month, floor -50; allies and enemies at war excepted)
function gidWorld(c,N){const w=(N.ig.indexOf('proxy')>=0?1:0)+(N.ig.indexOf('info')>=0&&GC.turn%2===0?1:0);if(!w||N.cap===undefined||N.cap<0)return;GC.rel=GC.rel||{};
  for(const o of Object.keys(GC.nat).sort()){const O=GC.nat[o];if(o===c||O.dead||O.cap===undefined||O.cap<0)continue;if(grDist(N.cap,O.cap)>900)continue;
    try{if(grAtWar(c,o)||(typeof grAllied==='function'&&grAllied(c,o)))continue;}catch(e){}const k=grWk(c,o),v=GC.rel[k]||0;if(v>-50)GC.rel[k]=Math.max(-50,v-w);}}
function gidMonth(){if(!GC)return;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;gidN(c);if(N.pp.t===GC.turn)continue;N.pp.t=GC.turn;const g=gidMonthGain(c);
    for(const k of ['pol','dip','mil'])N.pp[k]=Math.min(999,Math.round((N.pp[k]+g[k])*100)/100);
    if(c!==GC.me){for(const pg of gidAiPrefs(c)){if(N.ig.length>=gidSlots(c))break;if(N.ig.indexOf(pg)<0)gidPick(c,pg);}
      for(let n=0;n<3;n++){let bought=false;for(const grp of gidGroups(c)){if(!gidBuy(c,grp)){bought=true;break;}}if(!bought)break;}}
    gidWorld(c,N);}}
GMOD_HOOKS.push(gidMonth);
GMOD_STATS.manpower='Manpower';GMOD_STATS.upkeep='Army upkeep';GMOD_STATS.income='Income';GMOD_STATS.ppPol='Political points';GMOD_STATS.ppDip='Diplomatic points';GMOD_STATS.ppMil='Military points';
GMOD_STATS.attack='Attack strength';GMOD_STATS.fires='Fire support in battle';GMOD_STATS.defense='Defense strength';GMOD_STATS.spy='Spy success';GMOD_STATS.spyDef='Spy protection';GMOD_STATS.forceLimit=GMOD_STATS.forceLimit||'Force limit';GMOD_STATS.armyMor=GMOD_STATS.armyMor||'Army max morale';
// ---- original painted-style group pictures (inline SVG, drawn here; no outside art)
const GID_PAL={pol:['#3a1d14','#a5582c','#f0c27a'],dip:['#0f2236','#2e6f8e','#bfe3e8'],mil:['#1d2414','#5f6b34','#d8cf96']};
const GID_MOT={
 tower:'<rect x="44" y="22" width="12" height="46"/><rect x="40" y="40" width="20" height="28"/><rect x="49" y="8" width="2" height="16"/><circle cx="50" cy="8" r="2.5"/><rect x="22" y="48" width="14" height="20"/><rect x="66" y="44" width="12" height="24"/>',
 dome:'<path d="M32 68V46a18 18 0 0 1 36 0v22z"/><rect x="72" y="22" width="6" height="46"/><path d="M71 22l4-8 4 8z"/><rect x="20" y="52" width="10" height="16"/><circle cx="50" cy="26" r="2.5"/>',
 factory:'<path d="M14 68V44l14 8v-8l14 8v-8l14 8V30h6v-10h6v10h6v38z"/><rect x="74" y="16" width="6" height="22"/>',
 shield:'<path d="M50 12l26 9v18c0 16-11 26-26 31C35 65 24 55 24 39V21z"/><ellipse cx="50" cy="38" rx="13" ry="7" fill="#0006"/><circle cx="50" cy="38" r="4" fill="#fff8"/>',
 capitol:'<rect x="18" y="58" width="64" height="10"/><rect x="24" y="38" width="52" height="4"/>'+[28,38,48,58,68].map(x=>'<rect x="'+x+'" y="42" width="4" height="16"/>').join('')+'<path d="M34 38a16 14 0 0 1 32 0z"/><rect x="48" y="16" width="4" height="10"/>',
 flag:'<rect x="30" y="12" width="3" height="56"/><path d="M33 14c10-4 18 4 30 0s14 2 14 2v20s-6-4-14 0-20-4-30 0z"/><path d="M16 68h50l-6-8H22z"/>',
 dish:'<path d="M26 30a26 26 0 0 0 38 22z"/><path d="M45 41l10-14" stroke="#000" stroke-width="2"/><circle cx="56" cy="26" r="3"/><rect x="40" y="50" width="6" height="18"/><path d="M60 14a12 12 0 0 1 10 10M62 8a18 18 0 0 1 14 14" fill="none" stroke="#fff6" stroke-width="2"/>',
 flags:'<rect x="30" y="16" width="3" height="52"/><rect x="66" y="16" width="3" height="52"/><path d="M33 18h22v14H33zM45 36h21v14H45z"/><path d="M20 68h60v-4H20z"/>',
 ship:'<path d="M10 58h80l-8 10H18z"/><path d="M24 58V44h14v14M40 58V40h14v18M56 58V46h12v12"/><rect x="72" y="36" width="6" height="22"/>',
 mast:'<path d="M50 14l-10 54h4l6-30 6 30h4z"/><circle cx="50" cy="14" r="3"/><path d="M36 10a18 18 0 0 0 0 20M64 10a18 18 0 0 1 0 20M30 4a26 26 0 0 0 0 32M70 4a26 26 0 0 1 0 32" fill="none" stroke="#fff7" stroke-width="2"/>',
 carrier:'<path d="M8 54h84l-6 12H16z"/><path d="M20 54l4-6h64l-2 6z"/><rect x="66" y="36" width="8" height="12"/><path d="M30 30l14 4-14 4 3-4z"/>',
 nodes:'<g stroke-width="2.5" fill="none" stroke="currentColor"><path d="M50 40L22 22M50 40L80 24M50 40L24 62M50 40L78 62"/></g><circle cx="50" cy="40" r="8"/><circle cx="22" cy="22" r="5"/><circle cx="80" cy="24" r="5"/><circle cx="24" cy="62" r="5"/><circle cx="78" cy="62" r="5"/>',
 tank:'<path d="M14 62h68a6 6 0 0 0 0-12H18a6 6 0 0 0-4 12z"/><path d="M26 50l6-10h30l6 10z"/><rect x="58" y="40" width="32" height="4"/>',
 arrows:'<path d="M10 56l30-14v8h26v-10l22 18-22 18v-10H40v8z"/><path d="M22 30l18-10v6h18v-6l14 12-14 12v-6H40v6z" opacity=".75"/>',
 fort:'<path d="M14 68V36h8v6h8v-6h8v6h8v-6h8v6h8v-6h8v6h8v-6h8v32z"/><path d="M44 68V54a6 6 0 0 1 12 0v14z" fill="#0008"/>',
 badge:'<path d="M50 10l9 18 20 3-14 14 3 20-18-9-18 9 3-20-14-14 20-3z"/><path d="M30 62l20 8 20-8v6l-20 8-20-8z"/>',
 ranks:[0,1,2].map(r=>[0,1,2,3,4,5].map(k=>{const x=14+k*13+r*4,y=36+r*12;return '<circle cx="'+x+'" cy="'+y+'" r="3.2"/><rect x="'+(x-3)+'" y="'+(y+3)+'" width="6" height="8"/>';}).join('')).join(''),
 jet:'<path d="M18 30l46-6 14-6 4 4-10 6 10 14-6 2-16-10-20 8-4-4 14-6-30 2z"/><path d="M60 54h22M71 46v16" stroke="currentColor" stroke-width="3"/><circle cx="71" cy="54" r="5"/>'};
function gidArt(key,col,w){const P=GID_PAL[col],id='gpa'+key;w=w||84;
  return '<svg viewBox="0 0 100 80" width="'+w+'" height="'+Math.round(w*.8)+'" style="display:block;border-radius:6px;border:1px solid #c9a35a66;flex:none"><defs><linearGradient id="'+id+'s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+P[2]+'"/><stop offset=".65" stop-color="'+P[1]+'"/><stop offset="1" stop-color="'+P[0]+'"/></linearGradient>'+
    '<filter id="'+id+'f"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="'+(key.length*7)+'"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>'+
    '<filter id="'+id+'n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="1"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .25 0"/></filter></defs>'+
    '<rect width="100" height="80" fill="url(#'+id+'s)"/><circle cx="78" cy="20" r="11" fill="'+P[2]+'" opacity=".55"/>'+
    '<g filter="url(#'+id+'f)"><path d="M0 62q20-10 38-2t34-6 28 4v22H0z" fill="'+P[0]+'" opacity=".55"/><g fill="'+P[0]+'" color="'+P[0]+'">'+GID_MOT[GID_GROUPS[key].art]+'</g><path d="M0 70q30-6 56 0t44-2v12H0z" fill="'+P[0]+'"/></g>'+
    '<rect width="100" height="80" filter="url(#'+id+'n)"/></svg>';}
const GID_ICO={income:'💰',manpower:'👥',upkeep:'🔧',fires:'💥',warSupport:'📣',unrest:'🕊',forceLimit:'🏕',armyMor:'💪',ppPol:'🏛',ppDip:'🤝',ppMil:'🎖',fireSupport:'💥',attack:'⚔',defense:'🛡',spy:'🕵',spyDef:'🔒',homeMorale:'🏠',rallySpeed:'🚩'};
// ---- the Ideas screen: national ideas on top, then three columns (Political / Diplomatic / Military) of group cards
npTab('idea','💡','Ideas',(code,body,c)=>{const N=gidN(code),own=c.own&&code===GC.me,g=gidMonthGain(code),slots=gidSlots(code);body.innerHTML='';
  const top=guEl('div','display:flex;gap:26px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px;font-size:16px');
  top.innerHTML=GID_COLS.map(k=>'<div title="'+GID_POOL[k]+' points: +'+(Math.round(g[k]*10)/10)+' per month">'+({pol:'🏛',dip:'🤝',mil:'🎖'})[k]+' <b>'+GID_POOL[k]+'</b> '+Math.floor(N.pp[k])+' <span style="opacity:.65;font-size:14px">+'+(Math.round(g[k]*10)/10)+'/mo</span></div>').join('')+
    '<div style="margin-left:auto" title="Start: 2 slots (big powers 3). Every 2 research levels add one, up to 8.">Idea groups <b>'+N.ig.length+' / '+slots+'</b></div>';body.appendChild(top);
  const dot=(i,has,nx)=>'<span title="'+i[1]+': '+i[5]+'" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:12px;border:2px solid '+(has?'#e7c46b':nx?'#9fb6c8':'#3c4f62')+';background:'+(has?'radial-gradient(#7a5a1c,#3b2a0c)':'#122030')+';opacity:'+(has||nx?1:.55)+'">'+(GID_ICO[i[3]]||'•')+'</span>';
  const btn=(t,dis,fn,tip)=>{const b=guEl('button','font-size:13px;padding:2px 10px;border-radius:5px;border:1px solid #c9a35a;background:#2a2316;color:#ffe6a8;cursor:pointer',t);b.type='button';b.disabled=dis;if(dis)b.style.opacity=.45;if(tip)b.title=tip;b.onclick=fn;return b;};
  // national ideas row (the morale-style tree, unchanged)
  const st=gidStyle(code),T=GID_GROUPS[st],nr=guEl('div','display:flex;gap:10px;align-items:center;padding:6px 10px;margin-bottom:10px;border:1px solid #34506a;border-radius:6px;background:#132235');
  nr.innerHTML='<div style="min-width:210px"><b>National ideas</b><div style="font-size:13px;opacity:.75">'+T.name+'</div></div><div style="display:flex;gap:5px">'+T.ideas.map((i,ix)=>dot(i,N.idea.indexOf(i[0])>=0,ix===gidLevel(code,st))).join('')+'</div>';
  if(own){const i=gidNext(code,st);if(i){const cs=GID_COST[gidLevel(code,st)];nr.appendChild(btn('Next idea · '+cs+' '+GID_POOL[i[2]].slice(0,3),N.pp[i[2]]<cs,()=>{const e=gidBuy(code,st);if(e)grLog(e,code);npDraw();},i[1]+': '+i[5]));}}
  body.appendChild(nr);
  const cols=guEl('div','display:grid;grid-template-columns:repeat(3,1fr);gap:12px');
  for(const col of GID_COLS){const cl=guEl('div','min-width:0');cl.appendChild(guEl('div','font-size:17px;font-weight:bold;letter-spacing:.06em;text-transform:uppercase;color:#e7c46b;border-bottom:1px solid #c9a35a66;padding-bottom:3px;margin-bottom:6px',GID_POOL[col]));
    for(const k of Object.keys(GID_GROUPS)){const G=GID_GROUPS[k];if(G.col!==col)continue;const pk=N.ig.indexOf(k)>=0,lv=gidLevel(code,k);
      const cd=guEl('div','display:flex;gap:8px;padding:6px;margin-bottom:6px;border-radius:7px;border:1px solid '+(pk?'#c9a35a':'#2c4258')+';background:'+(pk?'#1e2a1e':'#111d2a'));
      cd.title=G.tag+'\nCompletion bonus: '+G.bonus.txt+'\nCost while kept: '+G.cost.txt+' ('+G.cost.why+')';
      cd.innerHTML=gidArt(k,col,64);const rt=guEl('div','flex:1;min-width:0');
      rt.innerHTML='<div style="font-size:14px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+G.name+(lv===7?' ✔':'')+'</div><div style="display:flex;gap:3px;margin:3px 0">'+G.ideas.map((i,ix)=>dot(i,N.idea.indexOf(i[0])>=0,pk&&ix===lv)).join('')+'</div>';
      if(own){const row=guEl('div','display:flex;gap:6px;align-items:center');
        if(!pk)row.appendChild(btn('Pick',N.ig.length>=slots,()=>{const e=gidPick(code,k);if(e)grLog(e,code);npDraw();},N.ig.length>=slots?'No free slot':'Free to pick. Cost while kept: '+G.cost.txt));
        else if(lv<7){const cs=GID_COST[lv],i=G.ideas[lv];row.appendChild(btn('Next idea · '+cs,N.pp[col]<cs,()=>{const e=gidBuy(code,k);if(e)grLog(e,code);npDraw();},i[1]+': '+i[5]+' (costs '+cs+' '+GID_POOL[col]+' points)'));}
        if(pk){const d=guEl('a','font-size:12px;opacity:.6;cursor:pointer;margin-left:auto','drop');d.title='Drop this group: its ideas are lost, nothing is refunded';d.onclick=()=>{if(confirm('Drop '+G.name+'? Its ideas are lost and nothing is refunded.')){gidDrop(code,k);npDraw();}};row.appendChild(d);}
        rt.appendChild(row);}
      cd.appendChild(rt);cl.appendChild(cd);}
    cols.appendChild(cl);}
  body.appendChild(cols);});
