// 13zl-gsupply.js — campaign "Real supply" slice 1: SUPPLY LINES. Part of the ONE supply owner (13g-grandeco.js: geArmySupply / geSupplyStep / geFuelNeed call in here;
// armies keep their one fuel stock a.fu and unit ammo r[3] — no second supply, fuel or depot system). Real basis and sources: orch/REAL-2026.md "Supply lines".
// The chain: every army draws fuel and ammunition down a line of friendly ground from the nearest SOURCE (own capital, Military base = depot, open port, an ally's capital).
//   Distance: trucks deliver in full to ~200 km, about half at ~600 km, a trickle past ~1,200 km. Home rail network (never-conquered friendly land) counts 35% of its length;
//   occupied land is truck-only; mountains, jungle, snow, desert and river crossings lengthen the line. Seasons (GMOD rows, stat 'supplyIn'): winter, mud, desert heat, monsoon.
//   Cut: a hostile army standing on the line (or a lost province, a wrecked base, a blockaded port) forces a longer route or cuts it — a cut army gets nothing and burns what it carries.
//   Burn: marching and fighting use extra fuel and ammunition. Cost: the longer the line, the more of the nation's fuel the trucks themselves burn (geFuelNeed).
// Who reacts: AI armies short of fuel or ammunition halt to refill before a new attack (operational pause) and AI builds a forward depot on occupied ground when its line is long.
// Counter-play: build a Military base (depot) forward, take a port, pause to refill, wait out the season — or stand on the enemy's line / bomb his depot / blockade his port.
// Deterministic (state only). Saved with the campaign on the army: a.sl = % arriving, a.sk = line length (km, weighted), a.fo = month it last fought.
const GSUP_KM=13.3,GSUP_TER={m:1.6,j:1.5,s:1.4,d:1.3,f:1.1,r:1.05,u:1,c:1},GSUP_RAIL=.35,GSUP_RIVER=60,GSUP_PORT=250,GSUP_ALLY=330,GSUP_LOCAL=.4;
const GSUP_SEAS={winter:['Winter',.75],mud:['Mud season',.65],heat:['Desert summer heat',.85],monsoon:['Monsoon rains',.7]};
const GSUP={sig:'',f:{}};
GMOD_COND.gsup=(key,arg)=>{const a=GC&&GC.armies.find(x=>x.id===key);return !!a&&gsupSeason(a.at)===arg;};
for(const k of Object.keys(GSUP_SEAS))GMOD_ROWS.push({id:'sup_'+k,src:GSUP_SEAS[k][0],scope:'army',stat:'supplyIn',mul:GSUP_SEAS[k][1],cond:'gsup:'+k});
GMOD_STATS.supplyIn='Supplies arriving';
// latitude of a province from its map y (Equal Earth projection, fitted on Cairo / Tehran / Moscow / Kyiv; good to about 1 degree)
function gsupLat(p){if(p.lat!==undefined)return p.lat;const Y=(682-p.y)/478.3,s=Y<0?-1:1,y=Math.abs(Y);let t=y/1.32;
  for(let i=0;i<5;i++){const t2=t*t,t6=t2*t2*t2;t-=(t*(1.340264-.081106*t2+t6*(.000893+.003796*t2))-y)/(1.340264-.243318*t2+t6*(.006251+.034164*t2));}
  p.lat=s*Math.asin(Math.max(-1,Math.min(1,2*Math.sin(t)/Math.sqrt(3))))*180/Math.PI;return p.lat;}
function gsupMonth(){return (Math.max(0,(GC.turn|0)-1)+grM0())%12;}   // 0 = January
function gsupSeason(pi){const p=GCM.P[pi];if(!p||!p.land)return '';const lat=gsupLat(p),al=Math.abs(lat);let m=gsupMonth();if(lat<0)m=(m+6)%12;
  if((al>=48||p.t==='s')&&(m===11||m<=1))return 'winter';
  if(al>=44&&al<=62&&p.x>=1330&&p.x<=2000&&p.t!=='m'&&p.t!=='d'&&(m===2||m===3||m===9||m===10))return 'mud';
  if(p.t==='d'&&al<38&&m>=5&&m<=7)return 'heat';
  if(p.t==='j'&&al>=5&&al<=30&&m>=5&&m<=8)return 'monsoon';
  return '';}
function gsupSig(){let s=GC.turn|0,h=0;for(const a of GC.armies)s=(s*31+a.id*7+a.at*13+a.u.length)%1000000007;for(let i=0;i<GCM.P.length;i++){const o=GC.prov[i]&&GC.prov[i].o;if(o)h=(h*33+o.charCodeAt(0)*7+o.charCodeAt(o.length-1)+i)%1000000007;const bl=GC.prov[i]&&GC.prov[i].bl;if(bl)for(const r of bl)h=(h*3+r[0].length+(r[1]|0)+1)%1000000007;}
  let b=0;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];b=(b*17+(N.cap|0)+(N.dead?1:0))%1000000007;}return s+'|'+h+'|'+b+'|'+(GC.alz?GC.alz.length:0)+'|'+Object.keys(GC.war||{}).length+'|'+GC.seed;}
function gsupStep(c,j){const P=GCM.P,q=P[j];return (GSUP_TER[q.t]||1)*(q.o===GC.prov[j].o?GSUP_RAIL:1);}   // home rail network vs trucks on occupied roads
function gsupPortOpen(c,p){if(!(p.port||geCount(p.i,'port')>0)||!p.coast)return false;return p.adj.some(j=>GCM.P[j].sea&&!geSeaBlock(j,c));}
// one pass per nation: weighted km from the nearest source to every province its supplies can cross
function gsupField(c){const sig=gsupSig();if(sig!==GSUP.sig){GSUP.sig=sig;GSUP.f={};}if(GSUP.f[c])return GSUP.f[c];
  const P=GCM.P,n=P.length,cost=new Float32Array(n).fill(1e9),src=new Int16Array(n).fill(-1),open=[],N=GC.nat[c];
  const mine=new Set(),host=new Set();for(const a of GC.armies){if(a.fl||!a.u.length)continue;if(a.o===c)mine.add(a.at);else if(grAtWar(c,a.o))host.add(a.at);}
  const pass=j=>{const q=P[j];if(!q.land)return false;const o=GC.prov[j].o;if(o!==c&&!grAllied(c,o))return false;return !host.has(j)||mine.has(j);};
  const seed=(i,d)=>{if(pass(i)&&d<cost[i]){cost[i]=d;src[i]=i;open.push(i);}};
  if(N&&N.cap>=0&&GC.prov[N.cap]&&GC.prov[N.cap].o===c)seed(N.cap,0);
  for(const p of P){if(!p.land)continue;const o=GC.prov[p.i].o;
    if(o===c){const b=geEff(p.i,'base');if(b>0)seed(p.i,(1-Math.min(1,b))*600);if(gsupPortOpen(c,p))seed(p.i,GSUP_PORT);}
    else if(grAllied(c,o)&&GC.nat[o]&&!GC.nat[o].dead&&GC.nat[o].cap===p.i)seed(p.i,GSUP_ALLY);}
  const done=new Uint8Array(n);
  for(;;){let b=-1,bi=-1;for(let k=0;k<open.length;k++){const i=open[k];if(!done[i]&&(b<0||cost[i]<cost[b]||(cost[i]===cost[b]&&i<b))){b=i;bi=k;}}if(b<0)break;done[b]=1;open.splice(bi,1);
    for(const j of P[b].adj){if(done[j]||!pass(j))continue;const d=cost[b]+grDist(b,j)*GSUP_KM*gsupStep(c,j)+(grRiver(b,j)?GSUP_RIVER:0);if(d<cost[j]){cost[j]=d;src[j]=src[b];if(open.indexOf(j)<0)open.push(j);}}}
  return GSUP.f[c]={cost,src};}
function gsupEff(d){return d<=200?1:d<=600?1-.5*(d-200)/400:d<=1200?.5-.3*(d-600)/600:Math.max(.1,.2-(d-1200)/5000);}
// the army's line: {eff 0..1 share of supplies arriving, km weighted length, src source province or -1, cut, seas, why[]}
function gsupLine(a){const P=GCM.P,here=P[a.at];if(!here||here.sea||a.fl)return {eff:1,km:0,src:-1,cut:0,seas:'',why:['at sea']};
  const F=gsupField(a.o);let d=F.cost[a.at],s=F.src[a.at];
  if(d>=1e9){for(const j of here.adj){if(F.cost[j]>=1e9)continue;const e=F.cost[j]+grDist(j,a.at)*GSUP_KM*(GSUP_TER[here.t]||1)+(grRiver(j,a.at)?GSUP_RIVER:0);if(e<d||(e===d&&F.src[j]<s)){d=e;s=F.src[j];}}}
  const home=GC.prov[a.at].o===a.o&&here.o===a.o,why=[];
  if(d>=1e9){if(home)return {eff:GSUP_LOCAL,km:0,src:-1,cut:0,seas:'',why:['cut off from every depot — living on local stores']};return {eff:0,km:0,src:-1,cut:1,seas:'',why:['supply line cut']};}
  let e=gsupEff(d);if(home)e=Math.max(e,GSUP_LOCAL);const seas=gsupSeason(a.at);
  if(d>200)why.push('long line ('+Math.round(d)+' km by road and rail)');
  for(const r of gmodRows('army',a,'supplyIn').concat(gmodRows('nation',a.o,'supplyIn'))){if(r.mul){e*=r.mul;why.push(r.src.toLowerCase());}if(r.add)e+=r.add;}
  return {eff:Math.max(0,Math.min(1,e)),km:d,src:s,cut:0,seas,why};}
function gsupSrcName(L){if(L.src<0)return '—';const p=GCM.P[L.src],o=GC.prov[L.src].o,N=GC.nat[o];return p.n+(N&&N.cap===L.src?' (capital)':geEff(L.src,'base')>0?' (depot)':' (port)');}
function gsupHaul(a){return 1+Math.min(1.5,(a.sk|0)/600);}   // trucks burn fuel hauling fuel: +100% national burn for this army at a 600 km line
// AI: an army short of fuel or ammunition does not start a new attack (it waits where it is and refills)
function gsupHold(a){if(!a.u.length||a.fl)return false;let am=0;for(const r of a.u)am+=r[3];am/=a.u.length;return (a.fu!==undefined&&a.fu<25)||am<35;}
function gsupFallBack(a){const c=a.o,cap=GC.nat[c]?GC.nat[c].cap:-1;if(cap<0||GC.prov[a.at].o===c||GC.prov[cap].o!==c)return;const L=gsupLine(a);if(!L.cut&&L.eff>=.3)return;const r=grPath(c,a.at,cap);if(r&&!r.decl&&r.path.length)a.path=r.path;}   // AI: empty and cut off on foreign ground - march back toward the capital
function gsupAmmo(a){if(!a.u.length)return 100;let am=0;for(const r of a.u)am+=r[3];return Math.round(am/a.u.length);}
// AI: where a forward depot would help most — an occupied (truck-only) province the nation holds, with an army on a long line and no base yet
function gsupDepotWant(c){let best=-1,bs=0;for(const a of GC.armies){if(a.o!==c||a.fl||!a.u.length)continue;if(GC.prov[a.at].o!==c||geCount(a.at,'base'))continue;const L=gsupLine(a);if(L.cut||L.eff>=.6)continue;const sc=(1-L.eff)*a.u.length;if(sc>bs||(sc===bs&&a.at<best)){bs=sc;best=a.at;}}return best;}
function gsupPct(L){return Math.round(L.eff*100);}
function gsupTag(a){if(a.fl||GCM.P[a.at].sea)return '';const L=gsupLine(a),p=gsupPct(L),col=L.cut?'#ff9d8e':p<50?'#ffb36b':p<85?'#ffe27a':'#9fd8a0';
  return ' · <span style="color:'+col+'" title="'+(L.why.join(', ')||'short line')+'">'+(L.cut?'supply line cut':'supplies '+p+'%')+'</span>';}
npTab('sup','🚚','Supply lines',(code,body,c)=>{const own=c.own&&code===GC.me,as=GC.armies.filter(a=>a.o===code&&!a.fl&&GCM.P[a.at].land);
  body.innerHTML='<div style="opacity:.85;margin-bottom:8px;max-width:760px">Fuel and ammunition reach each army down a line of friendly ground from the nearest depot: your capital, a Military base, an open port or an ally\'s capital. Rail at home carries far; on occupied ground it is trucks only — full supply to about 200 km, half at 600 km, a trickle past 1,200 km. Mountains, rivers, winter, mud, desert heat and monsoon slow it. An enemy army standing on the line cuts it.</div>'+
   '<div style="opacity:.75;margin-bottom:8px;max-width:760px">To fix a weak line: build a Military base in a province you hold near the front, take a port, pause the army to refill, or clear the enemy off the road. To hurt an enemy: stand on his line, bomb his base, blockade his port.</div>';
  if(!own){body.innerHTML+='<i>Supply lines of other nations are not shown.</i>';return;}
  if(!as.length){body.innerHTML+='<i>No land armies.</i>';return;}
  const rows=as.map(a=>{const L=gsupLine(a),p=gsupPct(L),col=L.cut?'#ff9d8e':p<50?'#ffb36b':p<85?'#ffe27a':'#9fd8a0';
    return {pi:a.at,cells:['<b>'+a.nm+'</b>',GCM.P[a.at].n,L.cut?'—':gsupSrcName(L),L.cut?'—':Math.round(L.km)+' km','<b style="color:'+col+'">'+(L.cut?'cut':p+'%')+'</b>',Math.round(a.fu===undefined?100:a.fu)+'%',gsupAmmo(a)+'%','<span style="opacity:.8">'+(L.why.join(', ')||'short line')+'</span>']};});
  npTable(body,['Army','At','Supplied from','Line','Arriving','Fuel','Ammo','Why'],rows,r=>npFly(r.pi));});
alAdd('supline','🚚','Supply line stretched',c=>{const as=GC.armies.filter(a=>a.o===c&&!a.fl&&a.u.length&&GCM.P[a.at].land&&!a.sup).filter(a=>{const L=gsupLine(a);return L.cut||L.eff<.5;});
  return as.length?{n:as.length,bad:as.some(a=>gsupLine(a).cut)?1:0,tip:as[0].nm+': '+(gsupLine(as[0]).cut?'supply line cut':'only '+gsupPct(gsupLine(as[0]))+'% of supplies arriving')+' — open Supply lines',go:()=>npOpen(c,'sup')}:null;});
