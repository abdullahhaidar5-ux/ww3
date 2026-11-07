/* ---------- identity: medals, player colour + emblem, colourblind mode, unit guide (08b) ----------
   Everything here is cosmetic and local: nothing feeds the simulation. A player's colour/emblem travels as a tiny
   {c:'#rrggbb',e:'key'} in the join greeting; the host (or the Cloudflare server) cleans it and sends the list with
   the battle's 'start' message, so every screen paints the same colours. Medals are judged on this device when a
   battle ends and stored with a short match history in localStorage 'ww3_medals'. */
const ID_COLS=[['#e8e8e8','White'],['#d94f4f','Red'],['#e2812d','Orange'],['#f2d14a','Gold'],['#8bc34a','Lime'],['#3fae5c','Green'],['#36c2c9','Teal'],['#4a80e8','Blue'],['#8b6cf6','Violet'],['#d94fa0','Pink'],['#9a6a42','Brown'],['#2d3a34','Black']];
const ID_CB=['#0072B2','#E69F00','#F0E442','#D55E00','#56B4E9','#CC79A7','#009E73','#FFFFFF'];   // Okabe-Ito colourblind-safe palette
const ID_EMB=['flag','star','shield','chevron','diamond','bolt','target','crown','wings','hex','skull'];
const ID_EMBN={flag:'Nation flag',star:'Star',shield:'Shield',chevron:'Chevron',diamond:'Diamond',bolt:'Lightning',target:'Target',crown:'Crown',wings:'Wings',hex:'Hexagon',skull:'Skull'};
const ID_SEG=[40,4,3,6,5,10,11,12];   // colourblind mode: selection-ring outline per team (circle, square, triangle, hexagon, pentagon, ...)
let IDS_PEND=null;
function idClean(o){if(!o||typeof o!=='object')return null;const c=typeof o.c==='string'&&/^#[0-9a-fA-F]{6}$/.test(o.c)?o.c.toLowerCase():'',e=typeof o.e==='string'&&ID_EMB.includes(o.e)?o.e:'';return c||e?{c,e}:null;}
function idSelf(){return idClean({c:SET.idc,e:SET.ide});}
function idPayload(){return idSelf()||undefined;}
function idPeer(peer){try{const q=NET.game&&NET.game.peers().find(x=>x.peer===peer);return idClean(q&&q.presence&&q.presence.hi&&q.presence.hi.id);}catch(e){return null;}}
function idLobbyIds(){return [idSelf(),...NET.lobby.map(p=>idPeer(p.peer))].concat((NET.ais||[]).map(()=>null)).map(x=>x||0);}
// Paint the teams of the battle that is starting (before any model is built): chosen colours first, then a de-clash pass
function idStart(){const ids=IDS_PEND;IDS_PEND=null;if(!G||!G.teams)return;const N=G.teams.length,cd=(p,q)=>{const a=hexRGB(p),b=hexRGB(q);return Math.abs(a.r-b.r)+Math.abs(a.g-b.g)+Math.abs(a.b-b.b);};
  const want=G.teams.map((T,i)=>{const d=idClean(ids?ids[i]:(i===ME&&MODE==='single'?idSelf():null));T.emb=d&&d.e||'';return d&&d.c||'';});
  const ALT=['#e8e8e8','#d98c3a','#36c2c9','#d94fa0','#a3d13a','#8b6cf6','#f2d14a','#e2483d','#4a80e8','#3fae5c','#c97b4a'],out=[];
  if(SET.cb){G.teams.forEach((T,i)=>{T.color=ID_CB[i%ID_CB.length];T.dark=shade(T.color,.45);});return;}
  for(let i=0;i<N;i++)if(want[i]&&!out.some(c=>c&&cd(c,want[i])<.45))out[i]=want[i];
  for(let i=0;i<N;i++){if(out[i])continue;let c=G.teams[i].color;if(out.some(q=>q&&cd(q,c)<.45))c=ALT.find(a=>out.every(q=>!q||cd(q,a)>=.45))||ALT[i%ALT.length];out[i]=c;}
  G.teams.forEach((T,i)=>{if(T.color!==out[i]){T.color=out[i];T.dark=shade(out[i],.45);}});}
/* ---------- emblems ---------- */
function idDrawEmb(c,key,cx,cy,r,col){c.save();c.translate(cx,cy);c.lineJoin='round';c.fillStyle=col||'#fff';c.strokeStyle='rgba(0,0,0,.85)';c.lineWidth=Math.max(1,r*.14);const P=(pts)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]*r,p[1]*r):c.moveTo(p[0]*r,p[1]*r));c.closePath();c.fill();c.stroke();};
  switch(key){
    case'star':{const p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,k=i%2?.42:1;p.push([Math.cos(a)*k,Math.sin(a)*k]);}P(p);break;}
    case'shield':P([[-.8,-.85],[.8,-.85],[.8,.1],[0,1],[-.8,.1]]);break;
    case'chevron':P([[-.9,-.2],[0,-.95],[.9,-.2],[.9,.4],[0,-.2],[-.9,.4]]);break;
    case'diamond':P([[0,-1],[.8,0],[0,1],[-.8,0]]);break;
    case'bolt':P([[.25,-1],[-.65,.15],[-.05,.15],[-.3,1],[.7,-.2],[.05,-.2]]);break;
    case'target':c.beginPath();c.arc(0,0,r*.9,0,7);c.fill();c.stroke();c.fillStyle='rgba(0,0,0,.8)';c.beginPath();c.arc(0,0,r*.55,0,7);c.fill();c.fillStyle=col||'#fff';c.beginPath();c.arc(0,0,r*.25,0,7);c.fill();break;
    case'crown':P([[-.9,.7],[-.9,-.5],[-.45,0],[0,-.8],[.45,0],[.9,-.5],[.9,.7]]);break;
    case'wings':P([[0,.2],[-.95,-.7],[-.7,.05],[-.95,.45],[-.4,.35],[0,.9],[.4,.35],[.95,.45],[.7,.05],[.95,-.7]]);break;
    case'hex':{const p=[];for(let i=0;i<6;i++){const a=i*Math.PI/3;p.push([Math.cos(a)*.95,Math.sin(a)*.95]);}P(p);break;}
    case'skull':c.beginPath();c.arc(0,-.15*r,r*.75,0,7);c.fill();c.stroke();c.fillRect(-r*.35,r*.4,r*.7,r*.45);c.strokeRect(-r*.35,r*.4,r*.7,r*.45);c.fillStyle='#000';c.beginPath();c.arc(-r*.3,-.2*r,r*.2,0,7);c.arc(r*.3,-.2*r,r*.2,0,7);c.fill();break;
    default:break;}
  c.restore();}
// a small canvas with the player's emblem on their colour (used in the lobby, loading screen and scoreboard)
function idEmbEl(T,w){w=w||22;const c=document.createElement('canvas');c.width=c.height=w*2;c.style.cssText=`width:${w}px;height:${w}px;vertical-align:middle;margin-right:5px;border-radius:4px`;const x=c.getContext('2d');x.fillStyle=T.color||'#888';x.fillRect(0,0,w*2,w*2);
  const e=T.emb||'';if(!e||e==='flag'){const im=esFlag(T.fac||T.f);if(im)x.drawImage(im,3,w*.5+2,w*2-6,w-4);}else idDrawEmb(x,e,w,w,w*.78,'#fff');return c;}
const IDF={};
// the roof/mast flag: the nation's flag, with the player's emblem stamped on it when one is chosen
function idFlagTex(T){const e=T.emb;if(!e||e==='flag')return flagTex(T.fac);const k=T.fac+e+T.color;if(IDF[k])return IDF[k];const src=flagTex(T.fac),W=120,H=72,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(src.image,0,0,W,H);
  x.fillStyle=T.color;x.fillRect(W-46,H-46,46,46);idDrawEmb(x,e,W-23,H-23,19,'#fff');const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return IDF[k]=t;}
/* ---------- colourblind helpers used by the minimap and selection rings (06-view) ---------- */
function idMiniMark(c,x,y,team,big){const sg=ID_SEG[((team|0)+8)%8],r=big?3.6:2.9;c.save();c.translate(x,y);c.fillStyle='#050807';c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();
  if(sg>=10){c.arc(0,0,r,0,7);if(sg>10){c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(0,-r);c.lineTo(0,r);}}else for(let k=0;k<sg;k++){const a=(sg===4?-Math.PI/4:-Math.PI/2)+k*2*Math.PI/sg;k?c.lineTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2):c.moveTo(Math.cos(a)*r*1.2,Math.sin(a)*r*1.2);}
  if(sg<10)c.closePath();c.globalAlpha=.9;c.fill();c.globalAlpha=1;c.stroke();c.restore();}
function idRingSeg(team){return ID_SEG[((team|0)+8)%8];}
/* ---------- medals ---------- */
const ID_MEDALS=(()=>{const n=(k,t,d)=>({k:'win_'+k,t,d,f:k,w:1});const M=[n('IR','Iran: Labbaik ya Hussein','Win a battle as Iran.'),n('RS','Mountain Shias: Radwan\'s Sons','Win a battle as the Mountain Shias.'),n('DW','Coffee Shias: Desert Raiders','Win a battle as the Coffee Shias.'),
  {k:'dw_notank',t:'Coffee Shias: Steel Untouched',d:'Win as the Coffee Shias without losing a single tank (you must have built some).',f:'DW',w:1},
  {k:'rs_fort',t:'Mountain Shias: Rock Stands',d:'Win as the Mountain Shias with your Mountain Fortress still standing.',f:'RS',w:1},
  {k:'fort20',t:'Hold the Mountain',d:'Keep a Mountain Fortress standing for 20 minutes in one battle.',w:1},
  {k:'ir_bb',t:'Fire and Fury',d:'Call in a Bunker Buster strike (any nation).',w:1}];
  for(const k of ['US','TR','IL','EU','FR','DE','UA','RU','SA','AE','PK','IN','CN','KP','KR','EG','CU','GB','AU','CA','DZ','MA','NG','ZA','ET','LY','SD','PL','AZ','JO','KD','IT','GR','ES','JP','TW','PH','VN','ID','TH','KZ','AF','OM','RV','OB','BI'])M.push(n(k,FACTIONS[k].name+': Victory','Win a battle as '+FACTIONS[k].name+'.'));
  M.push({k:'hard_1v3',t:'Outnumbered',d:'Win alone against three or more enemies on Hard.',w:1},{k:'iron_wall',t:'Iron Wall',d:'Win a battle (3+ minutes) losing fewer than 10 units.'},{k:'vet10',t:'Veteran Commander',d:'Finish 10 battles.'});return M;})();
function idStore(){let s=null;try{s=JSON.parse(localStorage.getItem('ww3_medals')||'null');}catch(e){}if(!s||typeof s!=='object')s={};s.earned=s.earned||{};s.hist=Array.isArray(s.hist)?s.hist:[];s.n=s.n|0;return s;}
function idSave(s){try{localStorage.setItem('ww3_medals',JSON.stringify(s));}catch(e){}}
const IDR={tank:new Set(),lost:0,seen:0,fortT:0,fortBest:0,lastT:0};
function idBattleReset(){IDR.tank=new Set();IDR.lost=0;IDR.seen=0;IDR.fortT=0;IDR.fortBest=0;IDR.lastT=0;}
function idTick(){if(!G||!G.ents||G.over)return;if(G.t<IDR.lastT||G.t-IDR.lastT<1)return;const dt=G.t-IDR.lastT;IDR.lastT=G.t;const T=G.teams[ME];if(!T)return;let fort=false;const alive=new Set();
  for(const e of G.ents){if(e.dead||e.team!==ME)continue;if(e.isB){if(e.kind==='fort'&&e.built>=1)fort=true;continue;}if(e.s&&e.s.cls==='tank'){alive.add(e.id);if(!IDR.tank.has(e.id)){IDR.tank.add(e.id);IDR.seen++;}}}
  for(const id of IDR.tank)if(!alive.has(id)){IDR.tank.delete(id);IDR.lost++;}
  if(fort){IDR.fortT+=Math.min(dt,5);if(IDR.fortT>IDR.fortBest)IDR.fortBest=IDR.fortT;}else IDR.fortT=0;}
function idFinish(winner,won){if(!G||G.sandbox||G.idDone)return;G.idDone=1;const T=G.teams[ME];if(!T)return;idTick();const s=idStore(),st=T.st||{},S=G.endStats,P=S&&S.p&&S.p[ME];
  const foes=G.teams.filter(Q=>!Q.reb&&!ally(Q.id,ME)).length,mates=G.teams.filter(Q=>ally(Q.id,ME)).length;const hard=G.teams.some(Q=>!ally(Q.id,ME)&&Q.ai&&Q.ai.d===2)||(MODE==='single'&&setup.d===2);
  const lu=P?P.lu:Math.max(0,(T.lost|0)-(st.lb|0)),secs=Math.round(G.t);
  s.n++;s.hist.unshift({t:Date.now(),f:T.fac,won:won?1:0,s:secs,foes,mates,map:G.mapKey,m:MODE==='single'?'solo':'online',lu,ku:P?P.ku:st.ku|0});s.hist.length=Math.min(s.hist.length,40);
  const got=[],add=k=>{if(!s.earned[k]){s.earned[k]=Date.now();got.push(k);}};
  if((st.pw&&st.pw.bb)>0)add('ir_bb');if(IDR.fortBest>=1200)add('fort20');
  if(won&&secs>=180){add('win_'+T.fac);if(T.fac==='DW'&&IDR.seen>0&&IDR.lost===0)add('dw_notank');if(T.fac==='RS'&&G.ents.some(e=>!e.dead&&e.isB&&e.team===ME&&e.kind==='fort'&&e.built>=1))add('rs_fort');
    if(foes>=3&&mates===1&&hard)add('hard_1v3');if(lu<10)add('iron_wall');}
  if(s.n>=10)add('vet10');idSave(s);got.forEach((k,i)=>setTimeout(()=>idToast(ID_MEDALS.find(m=>m.k===k)),700+i*3200));}
function idToast(m){if(!m)return;let box=document.getElementById('idToasts');if(!box){box=document.createElement('div');box.id='idToasts';document.body.appendChild(box);}
  const d=document.createElement('div');d.className='idToast';d.appendChild(idMedalEl(m,true));const t=document.createElement('div');t.innerHTML=`<b>Medal unlocked</b><span>${m.t}</span>`;d.appendChild(t);box.appendChild(d);setTimeout(()=>d.remove(),6000);}
function idMedalEl(m,on){const c=document.createElement('canvas');c.width=c.height=112;c.style.cssText='width:56px;height:56px;flex:none;'+(on?'':'filter:grayscale(1);opacity:.35');const x=c.getContext('2d');
  x.fillStyle=on?'#b3262c':'#555';x.fillRect(38,0,14,34);x.fillRect(60,0,14,34);const g=x.createRadialGradient(56,66,6,56,66,42);g.addColorStop(0,'#fff1a8');g.addColorStop(1,'#b8892b');x.fillStyle=g;x.beginPath();x.arc(56,68,40,0,7);x.fill();x.strokeStyle='#6b4a12';x.lineWidth=3;x.stroke();
  x.fillStyle='#1b2420';x.beginPath();x.arc(56,68,30,0,7);x.fill();const im=m.f&&esFlag(m.f);if(im)x.drawImage(im,34,54,44,28);else idDrawEmb(x,m.k==='fort20'?'shield':m.k==='ir_bb'?'bolt':m.k==='hard_1v3'?'skull':m.k==='iron_wall'?'chevron':'star',56,68,18,'#f2d14a');return c;}
/* ---------- the pages: Medals, Profile (colour + emblem), Unit guide ---------- */
function idOv(id,title){let o=document.getElementById(id);if(o)return o;o=document.createElement('div');o.id=id;o.className='overlay';o.hidden=true;o.style.zIndex=35;o.style.background='rgba(8,11,10,.96)';o.innerHTML=`<div class="card idcard"><h1 style="font-size:clamp(26px,5vw,38px)">${title}</h1><div class="idbody"></div><div class="row"><button class="big idx">Done</button></div></div>`;document.body.appendChild(o);o.querySelector('.idx').onclick=()=>{o.hidden=true;};o.addEventListener('pointerdown',e=>{if(e.target===o)o.hidden=true;});return o;}
function idMedalsPage(){const o=idOv('idMedals','Medals'),b=o.querySelector('.idbody'),s=idStore();b.innerHTML='';const n=ID_MEDALS.filter(m=>s.earned[m.k]).length;
  const h=document.createElement('p');h.textContent=`${n} of ${ID_MEDALS.length} medals · ${s.n} battles finished on this device`;b.appendChild(h);const grid=document.createElement('div');grid.className='idgrid';b.appendChild(grid);
  for(const m of ID_MEDALS){const on=!!s.earned[m.k],d=document.createElement('div');d.className='idm'+(on?' on':'');d.appendChild(idMedalEl(m,on));const t=document.createElement('div');t.innerHTML=`<b>${m.t}</b><span>${m.d}</span>`+(on?`<i>Earned ${new Date(s.earned[m.k]).toLocaleDateString()}</i>`:'');d.appendChild(t);grid.appendChild(d);}
  if(s.hist.length){const hh=document.createElement('h2');hh.className='sethd';hh.textContent='Recent battles';b.appendChild(hh);for(const r of s.hist.slice(0,10)){const p=document.createElement('div');p.className='idh';const F=FACTIONS[r.f]||{name:r.f};p.textContent=`${r.won?'Victory':'Defeat'} · ${F.name} · ${Math.floor(r.s/60)}:${String(r.s%60).padStart(2,'0')} · ${r.mates>1?r.mates+' vs '+r.foes:'1 vs '+r.foes} · ${r.ku} kills · ${new Date(r.t).toLocaleDateString()}`;p.style.color=r.won?'#74d08f':'#ea8a7a';b.appendChild(p);}}
  o.hidden=false;}
function idProfilePage(){const o=idOv('idProfile','Profile'),b=o.querySelector('.idbody');const draw=()=>{b.innerHTML='';const me=idSelf()||{c:'',e:''},fc=(FACTIONS[setup.p]||{}).color||'#888',col=me.c||fc;
    const pv=document.createElement('div');pv.className='idpv';pv.appendChild(idEmbEl({color:col,emb:me.e,fac:setup.p},56));const nm=document.createElement('span');nm.textContent=(FACTIONS[setup.p]||{}).name+' · your marks';pv.appendChild(nm);b.appendChild(pv);
    const l1=document.createElement('div');l1.className='label';l1.textContent='Team colour (other players see it too; if it clashes with a rival the game picks the closest free one)';b.appendChild(l1);const sw=document.createElement('div');sw.className='idsw';
    const mk=(c,t)=>{const x=document.createElement('button');x.className='idsq'+((me.c||'')===c?' on':'');x.title=t;x.setAttribute('aria-label',t);x.style.background=c||fc;if(!c)x.textContent='★';x.onclick=()=>{SET.idc=c;saveSet();draw();};sw.appendChild(x);};mk('','Nation colour');for(const [c,t] of ID_COLS)mk(c,t);b.appendChild(sw);
    const l2=document.createElement('div');l2.className='label';l2.textContent='Emblem (stamped on your flags and shown in lobbies and the scoreboard)';b.appendChild(l2);const eg=document.createElement('div');eg.className='idsw';
    for(const k of ID_EMB){const x=document.createElement('button');x.className='idsq'+((me.e||'flag')===k?' on':'');x.title=ID_EMBN[k];x.setAttribute('aria-label',ID_EMBN[k]);const c=document.createElement('canvas');c.width=c.height=48;c.style.cssText='width:32px;height:32px';const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,48,48);if(k==='flag'){const im=esFlag(setup.p);if(im)g.drawImage(im,2,10,44,28);}else idDrawEmb(g,k,24,24,19,'#fff');x.appendChild(c);x.onclick=()=>{SET.ide=k==='flag'?'':k;saveSet();draw();};eg.appendChild(x);}b.appendChild(eg);};
  draw();o.hidden=false;}
const ID_ROLE={harv:'Economy',dozer:'Builder',cleric:'Morale leader',hacker:'Electronic warfare',hero:'Hero',tank:'Main battle vehicle',arty:'Artillery',drone:'Loitering drone',heli:'Helicopter',jet:'Fighter-bomber',boat:'Patrol boat',fast:'Swarm boat',minel:'Minelayer',sweep:'Minesweeper',ship:'Warship',lander:'Landing craft',airlift:'Air transport'};
const ID_TGT={light:'infantry',heavy:'vehicles',bld:'buildings',air:'aircraft'},ID_CTR={gun:'rifles and machine guns',at:'anti-tank weapons',cannon:'tank guns',shell:'artillery',boom:'bombs and drones',tower:'defence towers',flak:'flak guns',missile:'AA missiles',snipe:'snipers',bb:'bunker busters',bomb:'bombers',super:'superweapons'};
function idRole(s){if(ID_ROLE[s.kind])return ID_ROLE[s.kind];if(s.cls==='inf')return s.wpn==='snipe'?'Sniper':s.wpn==='boom'?'Suicide bomber':s.wpn==='at'?'Anti-tank infantry':'Infantry';if(s.cls==='at')return 'Anti-tank infantry';if(s.cls==='aa')return s.wpn==='at'?'Tank hunter':'Anti-air / support';return s.cls||'Unit';}
function idBeats(s){if(s.noAttack||!(s.dmg>0))return 'Unarmed';const v=VS[s.wpn]||{},r=Object.keys(ID_TGT).filter(a=>(v[a]||0)>=1.2&&!(a==='air'&&!s.aa&&s.dom==='ground'&&v[a]<1.5)).map(a=>ID_TGT[a]);return r.length?r.join(', '):'general fighting';}
function idLoses(s){const a=s.armor==='bld'?'bld':s.armor==='air'?'air':s.armor==='heavy'?'heavy':'light';const r=Object.keys(VS).filter(w=>(VS[w][a]||0)>=1.3&&ID_CTR[w]).sort((p,q)=>VS[q][a]-VS[p][a]).slice(0,3).map(w=>ID_CTR[w]);return r.length?r.join(', '):'—';}
function idFirst(t){t=String(t||'');const i=t.search(/[.!](\s|$)/);return (i>0?t.slice(0,i+1):t).slice(0,150);}
function idGuidePage(){const o=idOv('idGuide','Unit guide'),b=o.querySelector('.idbody');const order=['IR','RS','DW',...FKEYS.filter(k=>!['IR','RS','DW'].includes(k))];let cur=idGuidePage.cur||setup.p||'IR';
  const draw=()=>{idGuidePage.cur=cur;b.innerHTML='';const sel=document.createElement('select');sel.className='idsel';sel.setAttribute('aria-label','Nation');for(const k of order){const op=document.createElement('option');op.value=k;op.textContent=FACTIONS[k].name;if(k===cur)op.selected=true;sel.appendChild(op);}sel.onchange=()=>{cur=sel.value;draw();};b.appendChild(sel);
    const F=FACTIONS[cur],intro=document.createElement('p');intro.textContent=String(F.doctrine||'').slice(0,420);b.appendChild(intro);
    const sec=(h)=>{const e=document.createElement('h2');e.className='sethd';e.textContent=h;b.appendChild(e);};const card=(name,sub,cost,lines)=>{const d=document.createElement('div');d.className='idu';d.innerHTML=`<div class="idut"><b>${name}</b><span>${sub}</span><em>${cost}</em></div>`+lines.map(l=>`<div>${l}</div>`).join('');b.appendChild(d);};
    sec('Units');let seen=new Set();for(const k of allUnits(cur)){if(seen.has(k))continue;seen.add(k);let s;try{s=stats(cur,k);}catch(e){continue;}const dps=s.dmg>0&&s.rof>0?Math.round(s.dmg/s.rof):0;
      card(s.name,idRole(s),'$'+s.cost,[`HP ${s.hp} · speed ${Math.round(s.spd)}${s.rng?` · range ${Math.round(s.rng)}`:''}${dps?` · ~${dps} damage/s`:''}${s.limit?` · max ${s.limit}`:''}`,`<span class="g">Beats:</span> ${idBeats(s)}`,`<span class="r">Loses to:</span> ${idLoses(s)}`,s.desc?`<span class="d">${idFirst(s.desc)}</span>`:'']);}
    sec('Buildings');for(const k of BUILD_ORDER){let s;try{if(!bldAllowed(cur,k))continue;s=bstats(cur,k);}catch(e){continue;}const dps=s.dmg>0&&s.rof>0?Math.round(s.dmg/s.rof):0;
      card(s.name,s.dmg?'Defence':'Structure','$'+s.cost,[`HP ${s.hp}${s.req?' · needs '+((STRUCT[s.req]||{}).name||s.req):''}${s.rng&&s.dmg?` · range ${Math.round(s.rng)}`:''}${dps?` · ~${dps} damage/s`:''}${s.limit?` · max ${s.limit}`:''}`,s.dmg?`<span class="g">Beats:</span> ${idBeats(s)}`:'',`<span class="r">Loses to:</span> ${idLoses(s)}`,s.desc?`<span class="d">${idFirst(s.desc)}</span>`:'']);}};
  draw();o.hidden=false;}
/* ---------- wiring: menu buttons, Settings > colourblind, styles ---------- */
function idInit(){if(document.getElementById('idCss'))return;const st=document.createElement('style');st.id='idCss';st.textContent=`
#idToasts{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:92vw}
.idToast{display:flex;align-items:center;gap:10px;background:rgba(18,24,21,.96);border:1px solid #c9a24a;border-radius:10px;padding:6px 14px 6px 8px;box-shadow:0 6px 24px #000a;animation:idin .35s}
.idToast b{display:block;color:#e3b341;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.idToast span{font-size:16px}@keyframes idin{from{opacity:0;transform:translateY(-14px)}}
.idcard{background:var(--panel,#141a17);padding:14px 16px;max-width:720px;width:min(94vw,720px);max-height:92vh;overflow:hidden;display:flex;flex-direction:column}.idbody{overflow:auto;flex:1;text-align:left;-webkit-overflow-scrolling:touch;padding:2px}
.idgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}.idm{display:flex;gap:10px;align-items:center;padding:6px;border:1px solid var(--line);border-radius:8px;opacity:.7}.idm.on{opacity:1;border-color:#c9a24a}
.idm span,.idm i{display:block;font-size:12px;opacity:.8;font-style:normal}.idh{font-size:13px;padding:2px 0}
.idsw{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px}.idsq{width:42px;height:42px;border-radius:8px;border:2px solid #444;padding:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;cursor:pointer}.idsq.on{border-color:#fff;box-shadow:0 0 0 2px #e3b341}
.idpv{display:flex;align-items:center;gap:10px;font-size:18px;margin-bottom:8px}.idpv canvas{width:56px!important;height:56px!important}.idsel{background:var(--panel2);color:var(--fg);border:1px solid var(--line);padding:9px;font:inherit;width:100%;margin-bottom:8px}
.idu{border:1px solid var(--line);border-radius:8px;padding:6px 10px;margin:6px 0;font-size:13px;line-height:1.45}.idut{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.idut b{font-size:16px}.idut span{opacity:.7}.idut em{margin-left:auto;color:#e3b341;font-style:normal}
.idu .g{color:#74d08f}.idu .r{color:#ea8a7a}.idu .d{opacity:.7}`;document.head.appendChild(st);
  const op=document.getElementById('openSettings');if(op&&op.parentNode){for(const [t,f] of [['Medals',idMedalsPage],['Profile',idProfilePage],['Unit guide',idGuidePage]]){const b=document.createElement('button');b.className='big ghost';b.style.cssText='font-size:15px;padding:7px 16px';b.textContent=t;b.onclick=f;op.parentNode.appendChild(b);}op.parentNode.style.flexWrap='wrap';}
  const tx=document.getElementById('sTxt');if(tx){const l=document.createElement('div');l.className='label';l.textContent='Colourblind mode (safe team colours from the next battle; shapes on the minimap and selection rings now)';const sg=document.createElement('div');sg.className='seg';sg.id='sCb';sg.innerHTML='<button data-v="1">On</button><button data-v="0">Off</button>';
    const pr=document.createElement('div');pr.className='label';pr.innerHTML='Your colour and emblem are in the main menu under <b>Profile</b>.';const after=tx.nextSibling;tx.parentNode.insertBefore(l,after);tx.parentNode.insertBefore(sg,after);tx.parentNode.insertBefore(pr,after);
    const sync=()=>sg.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',(+b.dataset.v)===(SET.cb?1:0));b.onclick=()=>{SET.cb=+b.dataset.v;saveSet();sync();};});sync();}}
try{idInit();}catch(e){console.warn('identity init',e);}
