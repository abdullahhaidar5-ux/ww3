// B3 POWER POINTS + NATIONAL IDEAS (lane B, EU4-style). Three pools — Political (pol), Diplomatic (dip), Military (mil) — grow every month
// via the ONE monthly hook (gmodMonth -> GMOD_HOOKS). Points are spent on ideas; every idea is only a ROW in the modifier table (GMOD_ROWS,
// cond 'idea:<id>'), never bespoke code. Each morale style has its own 4-idea tree (equal total value, different flavour) + 3 groups for everyone.
// State: GC.nat[c].pp={pol,dip,mil,t} and GC.nat[c].idea=[ids] (saved with the campaign). Deterministic: no random, AI buys in a fixed order.
const GID_POOL={pol:'Political',dip:'Diplomatic',mil:'Military'};
const GID_COST=[30,45,60,80];
// idea = [id, name, pool, stat, add|mul, description]
const GID_GROUPS={
  zeal:{name:'Martyrdom & Fervour',tree:1,ideas:[
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
    ['fr4','Munitions Contracts','pol','upkeep',{mul:.93},'-7% army upkeep']]},
  eco:{name:'Economic Ideas',ideas:[
    ['ec1','Trade Ledgers','pol','income',{mul:1.04},'+4% income'],
    ['ec2','Tax Reform','pol','income',{mul:1.04},'+4% income'],
    ['ec3','Customs Union','pol','income',{mul:1.04},'+4% income'],
    ['ec4','Industrial Plan','pol','ppPol',{mul:1.15},'+15% Political points']]},
  dip:{name:'Diplomatic Ideas',ideas:[
    ['dp1','Embassy Network','dip','ppDip',{mul:1.15},'+15% Diplomatic points'],
    ['dp2','Cultural Exchange','dip','income',{mul:1.03},'+3% income'],
    ['dp3','Treaty Bureau','dip','ppDip',{mul:1.15},'+15% Diplomatic points'],
    ['dp4','Grand Alliances','dip','ppPol',{mul:1.1},'+10% Political points']]},
  mil:{name:'Military Ideas',ideas:[
    ['ml1','Conscription Law','mil','manpower',{mul:1.1},'+10% manpower'],
    ['ml2','Quartermaster Corps','mil','upkeep',{mul:.95},'-5% army upkeep'],
    ['ml3','War College','mil','ppMil',{mul:1.15},'+15% Military points'],
    ['ml4','Veteran Cadres','mil','manpower',{mul:1.1},'+10% manpower']]}};
const GID_ORDER=['eco','mil','dip'];   // groups open to everyone, after the nation's own style tree
GMOD_COND.idea=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&N.idea&&N.idea.indexOf(arg)>=0);};
for(const g of Object.keys(GID_GROUPS))for(const i of GID_GROUPS[g].ideas){const r={id:'idea_'+i[0],src:i[1],scope:'nation',stat:i[3],cond:'idea:'+i[0]};if(i[4].add)r.add=i[4].add;if(i[4].mul)r.mul=i[4].mul;GMOD_ROWS.push(r);}
function gidStyle(c){try{return MORALE_STYLE[grNat(c).fac]||MORALE_STYLE[c]||'prof';}catch(e){return 'prof';}}
function gidGroups(c){return [gidStyle(c)].concat(GID_ORDER);}
function gidN(c){const N=GC&&GC.nat[c];if(!N)return null;if(!N.pp)N.pp={pol:20,dip:20,mil:20,t:GC.turn};if(!N.idea)N.idea=[];return N;}
function gidMonthGain(c){const N=GC.nat[c],own=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c).length;let war=false;try{war=Object.keys(GC.nat).some(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}catch(e){}
  const na=GC.armies.filter(a=>a.o===c).length;
  return {pol:gmod('nation',c,'ppPol',2+Math.min(4,Math.floor(own/8))),dip:gmod('nation',c,'ppDip',2+(war?0:1)),mil:gmod('nation',c,'ppMil',2+(war?1:0)+Math.min(3,Math.floor(na/4)))};}
function gidNext(c,g){const N=gidN(c);for(const i of GID_GROUPS[g].ideas)if(N.idea.indexOf(i[0])<0)return i;return null;}
function gidLevel(c,g){const N=gidN(c);return GID_GROUPS[g].ideas.filter(i=>N.idea.indexOf(i[0])>=0).length;}
// the ONE buy function (player button and AI both): returns an error string or '' on success
function gidBuy(c,g){const N=gidN(c);if(!N||!GID_GROUPS[g]||gidGroups(c).indexOf(g)<0)return 'Not available.';const i=gidNext(c,g);if(!i)return 'All ideas in this group are adopted.';
  const cost=GID_COST[gidLevel(c,g)];if(N.pp[i[2]]<cost)return 'Needs '+cost+' '+GID_POOL[i[2]]+' points.';N.pp[i[2]]-=cost;N.idea.push(i[0]);GMOD_C.cache.clear();
  if(c===GC.me)grLog('Adopted the idea "'+i[1]+'" ('+i[5]+').',c);return '';}
function gidMonth(){if(!GC)return;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;gidN(c);if(N.pp.t===GC.turn)continue;N.pp.t=GC.turn;const g=gidMonthGain(c);
    for(const k of ['pol','dip','mil'])N.pp[k]=Math.min(999,Math.round((N.pp[k]+g[k])*100)/100);
    if(c!==GC.me){for(let n=0;n<3;n++){let bought=false;for(const grp of gidGroups(c)){if(!gidBuy(c,grp)){bought=true;break;}}if(!bought)break;}}}}
GMOD_HOOKS.push(gidMonth);
GMOD_STATS.manpower='Manpower';GMOD_STATS.upkeep='Army upkeep';GMOD_STATS.income='Income';GMOD_STATS.ppPol='Political points';GMOD_STATS.ppDip='Diplomatic points';GMOD_STATS.ppMil='Military points';
npTab('idea','💡','Ideas & points',(code,body,c)=>{const N=gidN(code),own=c.own&&code===GC.me,g=gidMonthGain(code);
  let h='<div style="display:flex;gap:28px;margin-bottom:10px;font-size:17px">'+['pol','dip','mil'].map(k=>'<div><b>'+GID_POOL[k]+'</b> '+Math.floor(N.pp[k])+' <span style="opacity:.7">(+'+(Math.round(g[k]*10)/10)+'/month)</span></div>').join('')+'</div>'+
  '<div style="opacity:.8;margin-bottom:8px">Points grow every month. Spend them on ideas; each group unlocks in order and every next idea costs more.</div>';
  body.innerHTML=h;
  for(const grp of gidGroups(code)){const G=GID_GROUPS[grp],box=document.createElement('div');box.style.cssText='margin:10px 0;padding:8px 10px;border:1px solid #34506a;border-radius:6px';
    box.innerHTML='<div style="font-size:17px;margin-bottom:4px"><b>'+G.name+'</b>'+(G.tree?' <span style="opacity:.7">— national tree</span>':'')+'</div>';
    G.ideas.forEach((i,ix)=>{const has=N.idea.indexOf(i[0])>=0,row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:10px;padding:3px 0;opacity:'+(has?1:.85);
      const nxt=!has&&ix===gidLevel(code,grp);row.innerHTML='<span style="width:20px">'+(has?'✔':ix+1)+'</span><span style="flex:1"><b>'+i[1]+'</b> <span style="opacity:.75">— '+i[5]+'</span></span><span style="opacity:.7">'+(has?'adopted':GID_COST[ix]+' '+GID_POOL[i[2]])+'</span>';
      if(nxt&&own){const b=document.createElement('button');b.textContent='Adopt';b.style.cssText='font-size:15px;padding:2px 12px;cursor:pointer';b.disabled=N.pp[i[2]]<GID_COST[ix];b.onclick=()=>{const e=gidBuy(code,grp);if(e&&typeof grLog==='function')grLog(e,code);npDraw();};row.appendChild(b);}
      box.appendChild(row);});body.appendChild(box);}});
