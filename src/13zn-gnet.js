/* ---------- A2b multiplayer grand campaign, slice 1 (lane A, 2026-11-07) ----------
   Grand campaign → "Play online with friends": the host's browser runs the one authoritative campaign (the same real-time
   clock, AI and month-end resolution as solo); friends join by code or from the list, each picks a free nation (the AI stops
   playing it), and see the world through their own fog. Every order a friend gives (march, recruit, split/merge, declare,
   economy, fleets, strikes, research, rallies…) runs on their own copy at once for instant feedback AND goes to the host,
   which runs the very same function as that nation (GNT_W: the whitelist + whose nation arg) and sends the new state back.
   The host's state is the truth: snapshots (gzip, chunked) whenever the world changes, a tiny day tick between them.
   Any player can pause; the host sets the speed. A friend who leaves hands their nation back to the AI and can rejoin from
   the same browser tab (token). Open (A2b slice 2+): Cloudflare-hosted campaigns, live Fight-it battles for friends (theirs
   auto-resolve for now), spectating / co-commanding a battle.
   World chain: a friend's nation is a real actor in the one shared world state — AI nations, events, war support and the
   markets react to its actions exactly as to the host's (same GMOD rows, same event engine); no separate mini-game. */
const GNT={on:0,host:0,cl:0,code:'',g:null,nat:'',hum:{},orig:{},last:'',lastT:0,dayK:'',parts:{},tok:'',free:null,dirty:0,ui:0};
/* name → index of the nation argument, or 'a' = first argument is an army id that must belong to the sender */
const GNT_W={grOrderMove:'a',grSplit:'a',grMerge:'a',gmilAssign:'a',grRecruit:0,grDeclare:0,grSpy:0,gdAct:1,gdvBuy:0,geAutonomy:0,geAct:0,geBorrow:0,geBuild:0,
  geCity:0,geDeposit:0,geEmbargo:0,geMerchant:0,geRation:0,geRepay:0,geSellMode:0,geSetStrait:0,geTotalWar:0,geWithdraw:0,gidBuy:0,ginCut:0,ginSet:0,gstRaise:0,
  gtrPush:0,pgCounter:0,pgRun:0,rsBuy:0,wsRally:0,gcoEase:0,gmilBuyFleet:0,gmilStrike:0,gmilBuyMissile:0,gevChoose:0,grSetTax:0,ldrGo:'L'};
const GNT_PART=30000;
function gnName(c){return (GCM&&GCM.nats.get(c)||{}).name||c;}
function gnOk(nat,f,a){const w=GNT_W[f];if(w===undefined||!Array.isArray(a)||!GC||!GC.nat[nat])return false;
  if(w==='L')return typeof ldrId==='function'&&ldrId(nat)===a[0];if(w==='a'){const ar=GC.armies.find(x=>x.id===a[0]);return !!ar&&ar.o===nat;}return a[w]===nat;}
/* run one friend's order on the host, as that nation */
function gnRun(nat,f,a){if(!gnOk(nat,f,a))return;const me=GC.me,fn=GNT.orig[f]||window[f];if(typeof fn!=='function')return;GC.me=nat;
  try{fn.apply(null,a);}catch(e){console.error('gnRun',f,e);}finally{GC.me=me;}GNT.dirty=1;GNT.ui=1;}
function gnSend(m){if(GNT.g)GNT.g.emit('gcmd',m).catch(()=>{});}
/* client: route the whitelisted actions to the host (and still run them locally for instant feedback); no local clock/saves */
function gnHook(on){const L=Object.keys(GNT_W).concat(['grSave','guClockTick','guEndTurn','guSpeed']);
  for(const f of L){if(on){if(typeof window[f]!=='function'||GNT.orig[f])continue;GNT.orig[f]=window[f];const o=GNT.orig[f];
      window[f]=f==='grSave'||f==='guEndTurn'||f==='guClockTick'?function(){}:f==='guSpeed'?function(s){gnSend({k:'spd',s:s|0});}:function(...a){gnSend({k:'cmd',f,a});return o.apply(this,a);};}
    else if(GNT.orig[f]){window[f]=GNT.orig[f];}}
  if(!on)GNT.orig={};}
function gnFree(){const taken=new Set([GC.me,...Object.keys(GNT.hum)]);return grMajors().filter(c=>GC.nat[c]&&!GC.nat[c].dead&&!taken.has(c)).sort((a,b)=>gnName(a)<gnName(b)?-1:1);}
function gnCode(){return Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'a');}
async function gnRoom(){if(typeof NET==='undefined')return null;if(!NET.room){try{await netInit();}catch(e){}}return NET.room||null;}
/* ---- host ---- */
async function gnHost(){if(GNT.on||!GC||!GC.me)return 'busy';const R=await gnRoom();if(!R)return 'Online play is not available here.';const code=gnCode();
  /* the room layer decides 'I am the room's host' from NET.code (07-net): set it only while the room opens */
  let g;const oc=NET.code;NET.code=code;try{g=await joinT('gc-'+code,20000,1);}catch(e){console.warn('gnHost',e&&(e.message||e.type||e));NET.code=oc;return 'Could not reach the online service. Check your connection and try again.';}
  NET.code=oc;Object.assign(GNT,{on:1,host:1,cl:0,code,g,hum:{},last:'',dirty:1});
  g.on('ghi',m=>{if(m.sameTab)return;const d=m.data||{},tok=String(d.tok||'');const h=Object.entries(GNT.hum).find(([c,x])=>x.tok&&x.tok===tok);
    if(h){h[1].peer=m.peer;GC.nat[h[0]].ai=false;grLog(gnName(h[0])+' is back at the table.',h[0]);gnEmit('gwel',{to:m.peer,nat:h[0]});GNT.last='';GNT.dirty=1;GNT.ui=1;return;}
    gnEmit('gwel',{to:m.peer,free:gnFree(),host:GC.me,date:grDateStr(GC.turn,GC.day|0)});});
  g.on('gpick',m=>{if(m.sameTab)return;const d=m.data||{},n=d.n;if(!gnFree().includes(n)){gnEmit('gwel',{to:m.peer,free:gnFree(),host:GC.me,taken:n});return;}
    GNT.hum[n]={tok:String(d.tok||''),peer:m.peer};GC.nat[n].ai=false;grLog(gnName(n)+' is now led by a friend.',n);gnEmit('gwel',{to:m.peer,nat:n});GNT.last='';GNT.dirty=1;GNT.ui=1;gnChip();});
  g.on('gcmd',m=>{if(m.sameTab)return;const d=m.data||{},h=Object.entries(GNT.hum).find(([c,x])=>x.peer===m.peer);if(!h)return;
    if(d.k==='spd'){const s=d.s|0;GNT.orig.guSpeed?GNT.orig.guSpeed(s?(GV.lastSpd||2):0):guSpeed(s?(GV.lastSpd||2):0);GV.hint=gnName(h[0])+(s?' resumed the clock.':' paused the clock.');try{guHint();}catch(e){}GNT.dayK='';return;}
    if(d.k==='cmd'&&typeof d.f==='string')gnRun(h[0],d.f,d.a);});
  g.onPeers(ch=>{for(const q of ch.left){const h=Object.entries(GNT.hum).find(([c,x])=>x.peer===q.peer);if(!h)continue;h[1].peer=null;if(GC&&GC.nat[h[0]]){GC.nat[h[0]].ai=true;grLog(gnName(h[0])+'\'s leader left; the generals take over.',h[0]);}GNT.dirty=1;GNT.ui=1;gnChip();}});
  try{await R.presence({gg:{c:code,n:gnName(GC.me),d:grMonStr(GC.turn)}});}catch(e){}
  gnChip();return '';}
function gnEmit(t,d){if(GNT.g)return GNT.g.emit(t,d).catch(()=>{});}
async function gnPush(){const d=GC.day;GC.day=0;const js=JSON.stringify(GC);GC.day=d;if(js===GNT.last)return;GNT.last=js;
  const s=await ckPack(JSON.parse(js)),id=Math.random().toString(36).slice(2,8),n=Math.ceil(s.length/GNT_PART);
  for(let i=0;i<n;i++)await gnEmit('gst',{id,i,n,p:s.slice(i*GNT_PART,(i+1)*GNT_PART),day:GC.day|0});}
function gnHostTick(){if(!GNT.host||!GC||!GNT.g)return;const now=performance.now();
  const k=GC.turn+'.'+(GC.day|0)+'.'+(GV.spd|0);if(k!==GNT.dayK){GNT.dayK=k;gnEmit('gday',{t:GC.turn,d:GC.day|0,s:GV.spd|0,ls:GV.lastSpd|0});}
  if(GNT.ui){GNT.ui=0;try{grandMapRefresh();}catch(e){}}
  if(Object.values(GNT.hum).some(h=>h.peer)&&(GNT.dirty||now-GNT.lastT>1500)&&!GNT.busy){GNT.dirty=0;GNT.lastT=now;GNT.busy=1;gnPush().catch(e=>console.error('gnPush',e)).finally(()=>{GNT.busy=0;});}}
/* ---- client ---- */
async function gnJoin(raw){if(GNT.on)return 'busy';const code=String(raw||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);if(code.length<4)return 'That is not a campaign code.';
  const R=await gnRoom();if(!R)return 'Online play is not available here.';let g;try{g=await joinT('gc-'+code,20000,0);}catch(e){console.warn('gnJoin',e&&(e.message||e.type),e&&e.why);return 'No online campaign with code '+code.toUpperCase()+' was found.';}
  Object.assign(GNT,{on:1,host:0,cl:1,code,g,nat:'',parts:{},tok:joinTok('g'+code),free:null});
  g.on('gwel',m=>{const d=m.data||{};if(d.to&&d.to!==GNT.me)return;if(GNT.nat)return;
    if(d.nat){GNT.nat=d.nat;gnHook(true);gnNote('Joined as '+gnName(d.nat)+'. Waiting for the world…');return;}if(d.free)gnPickUI(d);});
  g.on('gst',m=>{if(m.sameTab||!GNT.nat)return;const d=m.data||{};const P=GNT.parts[d.id]=GNT.parts[d.id]||[];P[d.i]=d.p;
    if(P.filter(x=>x!=null).length<d.n)return;delete GNT.parts[d.id];ckUnpack(P.join('')).then(o=>gnApply(o,d.day)).catch(e=>console.error('gnApply',e));});
  g.on('gday',m=>{if(!GNT.nat||!GC)return;const d=m.data||{};if(d.t===GC.turn)GC.day=d.d|0;const sp=d.s|0;if(sp!==(GV.spd|0)){GV.spd=sp;if(d.ls)GV.lastSpd=d.ls;try{guTop();}catch(e){}}
    const e=document.getElementById('gDate');if(e&&GC.turn===d.t)e.textContent=grDateStr(GC.turn,GC.day|0);});
  g.onPeers(ch=>{if(GNT.cl&&ch.left.some(q=>q.peer===GNT.hostPeer)){gnLeave();try{grandClose();}catch(e){}gnNote('The host closed the campaign.');}});
  let n=0;const hi=()=>{if(!GNT.cl||GNT.nat||GNT.free||n++>12){clearInterval(GNT.hiI);if(GNT.cl&&!GNT.nat&&!GNT.free&&n>12){gnLeave();gnNote('The campaign did not answer.');}return;}
    if(!GNT.me){const q=g.peers().find(x=>x.sameTab);if(q)GNT.me=q.peer;}gnEmit('ghi',{tok:GNT.tok});};
  hi();GNT.hiI=setInterval(hi,1500);return '';}
function gnApply(o,day){if(!GNT.cl||!o||!Array.isArray(o.prov))return;const first=!GC||!GNT.got;GC=o;GC.me=GNT.nat;GC.day=day|0;GNT.got=1;
  if(!GNT.hostPeer&&GNT.g){const q=GNT.g.peers().find(x=>!x.sameTab);if(q)GNT.hostPeer=q.peer;}
  if(first||!document.getElementById('grandScreen')){campClose();grandOpen();}else{try{grandMapRefresh();}catch(e){console.error('gn refresh',e);}}}
function gnLeave(){clearInterval(GNT.hiI);gnHook(false);if(GNT.g){try{GNT.g.leave().catch(()=>{});}catch(e){}}if(GNT.host&&typeof NET!=='undefined'&&NET.room)NET.room.presence({gg:null}).catch(()=>{});
  const wasCl=GNT.cl;Object.assign(GNT,{on:0,host:0,cl:0,code:'',g:null,nat:'',hum:{},last:'',parts:{},free:null,got:0,hostPeer:null,me:null});
  if(wasCl){GC=null;try{grLoad();}catch(e){}}const c=document.getElementById('gnChip');if(c)c.remove();}
/* ---- screens (one job per screen; Back = one step back) ---- */
function gnNote(t){const e=document.getElementById('gnNote');if(e)e.textContent=t;else if(!document.getElementById('grandScreen')){gnMenu(t);}}
function gnList(){if(typeof NET==='undefined'||!NET.room)return [];try{return NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.gg&&p.presence.gg.c);}catch(e){return [];}}
function gnMenu(msg){grMap();const root=campEl('div');root.appendChild(campEl('h1','margin:6px 0 4px;font-size:28px;letter-spacing:.04em','ONLINE CAMPAIGN'));
  root.appendChild(campEl('div','opacity:.75;margin-bottom:12px;line-height:1.5','Play one world with friends. The host runs the campaign; each friend leads a free nation, the AI runs the rest. Anyone can pause; the host sets the speed.'));
  const note=campEl('div','min-height:22px;margin:4px 0 8px;color:#ffd27a');note.id='gnNote';note.textContent=msg||'';root.appendChild(note);
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(GR_KEY));}catch(e){return null;}})(),ok=saved&&!saved.over&&saved.me&&grSaveOk(saved);
  root.appendChild(campEl('div','opacity:.8;margin:6px 0 2px','Host'));
  if(ok)root.appendChild(campBtn('Open my campaign to friends — '+gnName(saved.me)+', '+grMonStr(saved.turn),async()=>{grLoad();note.textContent='Opening…';const e=await gnHost();if(e){note.textContent=e;return;}campClose();grandOpen();}));
  root.appendChild(campBtn('New campaign for friends',()=>{GNT.wantHost=1;grandSetup();},!!ok));
  root.appendChild(campEl('div','opacity:.8;margin:12px 0 2px','Join a friend'));const L=gnList();
  for(const p of L){const g=p.presence.gg;root.appendChild(campBtn(g.n+' · '+(g.d||'')+' · code '+String(g.c).toUpperCase(),async()=>{note.textContent='Joining…';const e=await gnJoin(g.c);if(e)note.textContent=e;},true));}
  if(!L.length)root.appendChild(campEl('div','opacity:.6;margin:2px 0 6px;font-size:14px','No open campaigns right now. Ask your friend for the code.'));
  const row=campEl('div','display:flex;gap:8px;align-items:center;margin:6px 0');const inp=campEl('input','font-size:18px;padding:10px;width:150px;text-transform:uppercase;background:#1a2430;color:#fff;border:1px solid #6b7a55;border-radius:6px');inp.id='gnCode';inp.placeholder='CODE';inp.maxLength=8;
  const jb=campBtn('Join',async()=>{note.textContent='Joining…';const e=await gnJoin(inp.value);if(e)note.textContent=e;});jb.id='gnJoinBtn';inp.onkeydown=e=>{if(e.key==='Enter')jb.click();};row.appendChild(inp);row.appendChild(jb);root.appendChild(row);
  root.appendChild(campBtn('Back',grandMenu,true));campShow(root);}
function gnPickUI(d){GNT.free=d.free;const root=campEl('div');root.appendChild(campEl('h1','margin:6px 0 4px;font-size:28px','PICK YOUR NATION'));
  root.appendChild(campEl('div','opacity:.8;margin-bottom:10px;line-height:1.5','Host: <b>'+gnName(d.host)+'</b> · '+(d.date||'')+(d.taken?'<br><span style="color:#ffd27a">'+gnName(d.taken)+' was just taken — pick another.</span>':'')));
  const note=campEl('div','min-height:20px;color:#ffd27a');note.id='gnNote';
  const sel=campEl('select','font-size:18px;padding:8px;background:#1a2430;color:#fff;border:1px solid #6b7a55;border-radius:6px;min-width:300px');sel.id='gnNat';
  const ME=['IR','RS','DW','RV','IL','SA','AE','OM','IQ','SY','TR','JO','EG','KD'];const fr=d.free.slice().sort((a,b)=>(ME.includes(a)?0:1)-(ME.includes(b)?0:1));
  for(const c of fr){const o=document.createElement('option');o.value=c;o.textContent=gnName(c);sel.appendChild(o);}root.appendChild(sel);
  root.appendChild(campBtn('Lead this nation',()=>{note.textContent='Asking the host…';gnEmit('gpick',{n:sel.value,tok:GNT.tok});GNT.free=null;}));
  root.appendChild(campBtn('Back',()=>{gnLeave();gnMenu();},true));root.appendChild(note);campShow(root);}
/* on-map chip: online status + invite */
function gnChip(){const sc=document.getElementById('grandScreen');let c=document.getElementById('gnChip');if(!GNT.on||!sc){if(c)c.remove();return;}
  if(!c){c=guEl('div','position:absolute;right:12px;bottom:12px;z-index:7;background:rgba(10,16,22,.9);border:1px solid #4a6580;border-radius:6px;padding:5px 10px;font-size:13px;cursor:pointer');c.id='gnChip';sc.appendChild(c);}
  const fr=Object.entries(GNT.hum).filter(([k,h])=>h.peer).map(([k])=>gnName(k));
  c.innerHTML=GNT.host?'Online · code <b>'+GNT.code.toUpperCase()+'</b> · '+(fr.length?'with '+fr.join(', '):'waiting for friends'):'Online · you lead <b>'+gnName(GNT.nat)+'</b>';
  c.title=GNT.host?'Click to copy the invite code':'';c.onclick=()=>{if(!GNT.host)return;const t='Join my World War 3 grand campaign: Grand campaign → Online campaign → code '+GNT.code.toUpperCase();try{navigator.clipboard.writeText(t);GV.hint='Invite copied: code '+GNT.code.toUpperCase();guHint();}catch(e){}};}
/* hooks: the menu gets the Online item; New campaign for friends hosts once the map opens; leaving the map leaves the room */
(function(){const _gm=grandMenu;grandMenu=function(){_gm();const s=document.getElementById('campScreen');if(!s)return;const bs=[...s.querySelectorAll('button')],back=bs.find(b=>b.textContent==='Back');
    const b=campBtn('Online campaign — with friends',()=>gnMenu(),true);b.id='gnMenuBtn';if(back)back.parentNode.insertBefore(b,back);else s.firstChild.appendChild(b);};
  const _go=grandOpen;grandOpen=function(){_go();if(GNT.wantHost&&GC&&!GNT.on){GNT.wantHost=0;gnHost().then(e=>{if(e){GV.hint=e;try{guHint();}catch(_){}}});}gnChip();};
  const _gc=grandClose;grandClose=function(){_gc();if(GNT.on){const h=GNT.host;gnLeave();if(h)GNT.wantHost=0;}};
  if(!window._gnI)window._gnI=setInterval(()=>{try{gnHostTick();}catch(e){console.error('gnHostTick',e);}},250);})();
