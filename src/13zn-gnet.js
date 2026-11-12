/* ---------- A2b multiplayer grand campaign, slice 1 (lane A, 2026-11-07) ----------
   Multiplayer → Grand campaign (the one online screen): the host's browser runs the one authoritative campaign (the same real-time
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
const GNT={on:0,host:0,cl:0,code:'',g:null,nat:'',hum:{},orig:{},last:'',lastT:0,dayK:'',parts:{},tok:'',free:null,dirty:0,ui:0,lobby:0,pend:{},lob:null,lobC:0,rdy:0};
/* name → index of the nation argument, or 'a' = first argument is an army id that must belong to the sender */
const GNT_W={grOrderMove:'a',grSplit:'a',grMerge:'a',grDrill:'a',gmilAssign:'a',grRecruit:0,grDeclare:0,grSpy:0,gdAct:1,gdvBuy:0,geAutonomy:0,geAct:0,geBorrow:0,geBuild:0,
  geCity:0,geDeposit:0,geEmbargo:0,geMerchant:0,geRation:0,geRepay:0,geSellMode:0,geSetStrait:0,geTotalWar:0,geWithdraw:0,gidBuy:0,gidPick:0,gidDrop:0,ginCut:0,ginSet:0,gstRaise:0,
  gtrPush:0,pgCounter:0,pgRun:0,rsBuy:0,wsRally:0,wsCensor:0,gcoEase:0,gmilBuyFleet:0,gmilStrike:0,gmilOrder:0,gmilSend:0,gevChoose:0,grSetTax:0,ldrGo:'L'};
const GNT_PART=30000;
function gnName(c){return (GCM&&GCM.nats.get(c)||{}).name||c;}
function gnOk(nat,f,a){const w=GNT_W[f];if(w===undefined||!Array.isArray(a)||!GC||!GC.nat[nat])return false;
  if(w==='L')return typeof ldrId==='function'&&ldrId(nat)===a[0];if(w==='a'){const ar=GC.armies.find(x=>x.id===a[0]);return !!ar&&ar.o===nat;}return a[w]===nat;}
/* run one friend's order on the host, as that nation */
function gnRun(nat,f,a){if(!gnOk(nat,f,a))return;const me=GC.me,fn=GNT.orig[f]||window[f];if(typeof fn!=='function')return;GC.me=nat;
  try{fn.apply(null,a);}catch(e){console.error('gnRun',f,e);}finally{GC.me=me;}GNT.dirty=1;GNT.ui=1;}
function gnSend(m){if(GNT.g)GNT.g.emit('gcmd',m).catch(()=>{});}
/* client: route the whitelisted actions to the host (and still run them locally for instant feedback); no local clock/saves */
function gnHook(on){const L=Object.keys(GNT_W).concat(['grSave','guClockTick','guEndTurn','guSpeed','grBattleDone','grandFightLive']);
  for(const f of L){if(on){if(typeof window[f]!=='function'||GNT.orig[f])continue;GNT.orig[f]=window[f];const o=GNT.orig[f];
      window[f]=f==='grSave'||f==='guEndTurn'||f==='guClockTick'?function(){}:f==='guSpeed'?function(s){gnSend({k:'spd',s:s|0});}
        :f==='grBattleDone'?function(b,w,h){return GNT.bat?gnBatDone(b,w,h):o.apply(this,arguments);}
        :f==='grandFightLive'?function(b){if(GNT.bat){GNT.bat.go=1;gnSend({k:'bgo',qi:GNT.bat.qi});}return o.apply(this,arguments);}
        :function(...a){gnSend({k:'cmd',f,a});return o.apply(this,a);};}
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
    if(GNT.lobby){GNT.pend[m.peer]=1;GNT.lsig='';}gnEmit('gwel',{to:m.peer,free:gnFree(),host:GC.me,date:grDateStr(GC.turn,GC.day|0),lobby:GNT.lobby?1:0});});
  g.on('gpick',m=>{if(m.sameTab)return;const d=m.data||{},n=d.n,tok=String(d.tok||''),old=GNT.lobby&&Object.entries(GNT.hum).find(([c,x])=>x.tok&&x.tok===tok);
    if(old&&old[0]===n){gnEmit('gwel',{to:m.peer,nat:n,lobby:1});return;}
    if(!gnFree().includes(n)){gnEmit('gwel',{to:m.peer,free:gnFree(),host:GC.me,taken:n,lobby:GNT.lobby?1:0,date:grDateStr(GC.turn,GC.day|0)});return;}
    if(old){delete GNT.hum[old[0]];GC.nat[old[0]].ai=true;}delete GNT.pend[m.peer];GNT.lsig='';
    GNT.hum[n]={tok,peer:m.peer,rdy:0};GC.nat[n].ai=false;grLog(gnName(n)+' is now led by a friend.',n);gnEmit('gwel',{to:m.peer,nat:n,lobby:GNT.lobby?1:0});GNT.last='';GNT.dirty=1;GNT.ui=1;gnChip();});
  g.on('grdy',m=>{if(m.sameTab||!GNT.lobby)return;const h=Object.entries(GNT.hum).find(([c,x])=>x.peer===m.peer);if(h){h[1].rdy=(m.data||{}).r?1:0;GNT.lsig='';}});
  g.on('gcmd',m=>{if(m.sameTab)return;const d=m.data||{},h=Object.entries(GNT.hum).find(([c,x])=>x.peer===m.peer);if(!h)return;
    if(d.k==='spd'){const s=d.s|0;GNT.orig.guSpeed?GNT.orig.guSpeed(s?(GV.lastSpd||2):0):guSpeed(s?(GV.lastSpd||2):0);GV.hint=gnName(h[0])+(s?' resumed the clock.':' paused the clock.');try{guHint();}catch(e){}GNT.dayK='';return;}
    if(d.k==='bgo'||d.k==='bres'){gnBatMsg(h[0],d);return;}
    if(d.k==='cmd'&&typeof d.f==='string')gnRun(h[0],d.f,d.a);});
  g.onPeers(ch=>{for(const q of ch.left){delete GNT.pend[q.peer];GNT.lsig='';const h=Object.entries(GNT.hum).find(([c,x])=>x.peer===q.peer);if(!h)continue;h[1].peer=null;if(GNT.lobby){delete GNT.hum[h[0]];if(GC&&GC.nat[h[0]])GC.nat[h[0]].ai=true;continue;}if(GC&&GC.nat[h[0]]){GC.nat[h[0]].ai=true;grLog(gnName(h[0])+'\'s leader left; the generals take over.',h[0]);}if(GNT.bw&&GNT.bw.nat===h[0])gnBatAuto('left');GNT.dirty=1;GNT.ui=1;gnChip();}});
  gnPresence();
  gnChip();return '';}
function gnPresence(){try{if(typeof NET==='undefined'||!NET.room||!GNT.host||!GC)return;NET.room.presence({gg:{c:GNT.code,n:gnName(GC.me),d:grMonStr(GC.turn),s:(GR_SCEN.find(x=>x.id===GC.sc)||{}).n||'',fr:gnFree().length}}).catch(()=>{});}catch(e){}}
function gnEmit(t,d){if(GNT.g)return GNT.g.emit(t,d).catch(()=>{});}
async function gnPush(){const d=GC.day;GC.day=0;const js=JSON.stringify(GC);GC.day=d;if(js===GNT.last)return;GNT.last=js;
  const s=await ckPack(JSON.parse(js)),id=Math.random().toString(36).slice(2,8),n=Math.ceil(s.length/GNT_PART);
  for(let i=0;i<n;i++)await gnEmit('gst',{id,i,n,p:s.slice(i*GNT_PART,(i+1)*GNT_PART),day:GC.day|0});}
function gnHostTick(){if(!GNT.host||!GC||!GNT.g)return;const now=performance.now();if(GNT.lobby){gnLobbyTick();return;}
  const k=GC.turn+'.'+(GC.day|0)+'.'+(GV.spd|0);if(k!==GNT.dayK){GNT.dayK=k;gnEmit('gday',{t:GC.turn,d:GC.day|0,s:GV.spd|0,ls:GV.lastSpd|0});}
  if(GNT.ui){GNT.ui=0;try{grandMapRefresh();}catch(e){}}
  if(Object.values(GNT.hum).some(h=>h.peer)&&(GNT.dirty||now-GNT.lastT>1500)&&!GNT.busy){GNT.dirty=0;GNT.lastT=now;GNT.busy=1;gnPush().catch(e=>console.error('gnPush',e)).finally(()=>{GNT.busy=0;});}}
/* ---- client ---- */
async function gnJoin(raw,to){if(GNT.on)return 'busy';const code=String(raw||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);if(code.length<4)return 'That is not a campaign code.';
  const R=await gnRoom();if(!R)return 'Online play is not available here.';let g;try{g=await joinT('gc-'+code,to||20000,0);}catch(e){console.warn('gnJoin',e&&(e.message||e.type),e&&e.why);return 'No online campaign with code '+code.toUpperCase()+' was found.';}
  Object.assign(GNT,{on:1,host:0,cl:1,code,g,nat:'',parts:{},tok:joinTok('g'+code),free:null});
  g.on('gwel',m=>{const d=m.data||{};if(d.to&&d.to!==GNT.me)return;if(d.lobby){GNT.lobC=1;if(!GNT.hostPeer&&!m.sameTab)GNT.hostPeer=m.peer;}if(GNT.nat&&!(GNT.lobC&&(d.nat||d.free)))return;
    if(d.nat){GNT.nat=d.nat;if(GNT.lobC){gnLobbyClient();return;}gnHook(true);gnNote('Joined as '+gnName(d.nat)+'. Waiting for the world…');return;}
    if(d.free){if(d.lobby){GNT.free=d.free;GNT.lob=Object.assign(GNT.lob||{pl:[]},{host:d.host,date:d.date,free:d.free});gnLobbyClient(d.taken);}else gnPickUI(d);}});
  g.on('glob',m=>{if(m.sameTab||!GNT.cl||GNT.got)return;GNT.lobC=1;GNT.hostPeer=m.peer;GNT.lob=m.data||{pl:[]};if(GNT.free||GNT.nat)gnLobbyClient();});
  g.on('gst',m=>{if(m.sameTab||!GNT.nat)return;const d=m.data||{};const P=GNT.parts[d.id]=GNT.parts[d.id]||[];P[d.i]=d.p;
    if(P.filter(x=>x!=null).length<d.n)return;delete GNT.parts[d.id];ckUnpack(P.join('')).then(o=>gnApply(o,d.day)).catch(e=>console.error('gnApply',e));});
  g.on('gbat',m=>{const d=m.data||{};if(d.to!==GNT.me||!GNT.nat)return;GNT.bat={qi:d.qi|0,t:d.t|0};gnBatTry();});
  g.on('gbx',m=>{const d=m.data||{};if(d.to!==GNT.me||!GNT.bat)return;GNT.bat=null;if(typeof G!=='undefined'&&G&&G.grand){try{campClose();}catch(e){}grandLeaveBattle();}
    const x=document.getElementById('gModal');if(x)x.remove();const s=GNT.stash;GNT.stash=null;if(s)gnApply(s[0],s[1]);
    guModal('<b>The battle was auto-resolved</b><div style="opacity:.8;margin-top:6px">'+(d.why==='host'?'The host chose to auto-resolve it.':'No answer in time — the generals fought it.')+'</div>',[['OK',null,1]]);});
  g.on('gday',m=>{if(!GNT.nat||!GC)return;const d=m.data||{};if(d.t===GC.turn)GC.day=d.d|0;const sp=d.s|0;if(sp!==(GV.spd|0)){GV.spd=sp;if(d.ls)GV.lastSpd=d.ls;try{guTop();}catch(e){}}
    const e=document.getElementById('gDate');if(e&&GC.turn===d.t)e.textContent=grDateStr(GC.turn,GC.day|0);});
  g.onPeers(ch=>{if(GNT.cl&&ch.left.some(q=>q.peer===GNT.hostPeer)){gnLeave();try{grandClose();}catch(e){}gnNote('The host closed the campaign.');}});
  let n=0;const hi=()=>{if(!GNT.cl||GNT.nat||GNT.free||n++>12){clearInterval(GNT.hiI);if(GNT.cl&&!GNT.nat&&!GNT.free&&n>12){gnLeave();gnNote('The campaign did not answer.');}return;}
    if(!GNT.me){const q=g.peers().find(x=>x.sameTab);if(q)GNT.me=q.peer;}gnEmit('ghi',{tok:GNT.tok});};
  hi();GNT.hiI=setInterval(hi,1500);return '';}
function gnApply(o,day){if(!GNT.cl||!o||!Array.isArray(o.prov))return;if(GNT.bat&&GNT.bat.shown){GNT.stash=[o,day];return;}   /* never swap the world under a battle in progress */const first=!GC||!GNT.got;if(first&&GNT.lobC){GNT.lobC=0;gnHook(true);}GC=o;GC.me=GNT.nat;GC.day=day|0;GNT.got=1;
  if(!GNT.hostPeer&&GNT.g){const q=GNT.g.peers().find(x=>!x.sameTab);if(q)GNT.hostPeer=q.peer;}
  if(first||!document.getElementById('grandScreen')){campClose();grandOpen();}else{try{grandMapRefresh();}catch(e){console.error('gn refresh',e);}}gnBatTry();try{gnChip();}catch(e){}}
function gnLeave(){clearInterval(GNT.hiI);gnHook(false);if(GNT.g){try{GNT.g.leave().catch(()=>{});}catch(e){}}if(GNT.host&&typeof NET!=='undefined'&&NET.room)NET.room.presence({gg:null}).catch(()=>{});
  const wasCl=GNT.cl;Object.assign(GNT,{lobby:0,pend:{},lob:null,lobC:0,rdy:0,lsig:'',on:0,host:0,cl:0,code:'',g:null,nat:'',hum:{},last:'',parts:{},free:null,got:0,hostPeer:null,me:null});
  if(wasCl){GC=null;try{grLoad();}catch(e){}}const c=document.getElementById('gnChip');if(c)c.remove();}
/* ---- screens (one job per screen; Back = one step back) ---- */
function gnNote(t){const e=document.getElementById('gnNote');if(e)e.textContent=t;else if(!document.getElementById('grandScreen')){gnMenu(t);}}
function gnList(){if(typeof NET==='undefined'||!NET.room)return [];try{return NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.gg&&p.presence.gg.c);}catch(e){return [];}}
function gnMenu(msg){grMap();const root=campEl('div');root.appendChild(campEl('h1','margin:6px 0 4px;font-size:28px;letter-spacing:.04em','JOIN FRIENDS'));
  root.appendChild(campEl('div','opacity:.75;margin-bottom:12px;line-height:1.5','Join a friend\'s campaign lobby: pick your nation, tick Ready, and the AI runs everyone else. A campaign that is already running takes you in as a free nation.'));
  const note=campEl('div','min-height:22px;margin:4px 0 8px;color:#ffd27a');note.id='gnNote';note.textContent=msg||'';root.appendChild(note);
  root.appendChild(campEl('div','opacity:.8;margin:6px 0 2px','Open campaigns'));const L=gnList();
  for(const p of L){const g=p.presence.gg;root.appendChild(campBtn(g.n+' · '+(g.d||'')+' · code '+String(g.c).toUpperCase(),async()=>{note.textContent='Joining…';const e=await gnJoin(g.c);if(e)note.textContent=e;},true));}
  if(!L.length)root.appendChild(campEl('div','opacity:.6;margin:2px 0 6px;font-size:14px','No open campaigns right now. Ask your friend for the code or the invite link.'));
  root.appendChild(campEl('div','opacity:.8;margin:12px 0 2px','Or type the code'));
  const row=campEl('div','display:flex;gap:8px;align-items:center;margin:6px 0');const inp=campEl('input','font-size:18px;padding:10px;width:150px;text-transform:uppercase;background:#1a2430;color:#fff;border:1px solid #6b7a55;border-radius:6px');inp.id='gnCode';inp.placeholder='CODE';inp.maxLength=8;
  const jb=campBtn('Join',async()=>{note.textContent='Joining…';const e=await gnJoin(inp.value);if(e)note.textContent=e;});jb.id='gnJoinBtn';inp.onkeydown=e=>{if(e.key==='Enter')jb.click();};row.appendChild(inp);row.appendChild(jb);root.appendChild(row);
  const saved=(()=>{try{return JSON.parse(localStorage.getItem(GR_KEY));}catch(e){return null;}})(),ok=saved&&!saved.over&&saved.me&&grSaveOk(saved);
  if(ok)root.appendChild(campBtn('Invite friends into my saved campaign — '+gnName(saved.me)+', '+grMonStr(saved.turn),async()=>{grLoad();note.textContent='Opening…';const e=await gnHost();if(e){note.textContent=e;return;}campClose();grandOpen();},true));
  root.appendChild(campBtn('Back',grandMenu,true));campShow(root);}
/* ---- campaign lobby (before the world starts): slots, nation, ready, invite; same flow as the battle lobby ---- */
function gnFlag(c){const e=campEl('span','display:inline-block;width:30px;height:20px;border-radius:2px;vertical-align:middle;margin-right:8px;background:#34414f;overflow:hidden');
  try{const t=typeof esFlag==='function'&&esFlag(c);if(t&&t.toDataURL){const i=new Image();i.src=t.toDataURL();i.style.cssText='width:30px;height:20px;display:block';e.appendChild(i);}}catch(_){}return e;}
function gnLink(){let b='';try{b=typeof inviteBase==='function'?inviteBase():location.href.split('#')[0];}catch(_){b=location.href.split('#')[0];}return b+'#gcamp='+GNT.code;}
function gnCopy(t,msg,el){try{navigator.clipboard.writeText(t);}catch(_){}if(el){const o=el.textContent;el.textContent=msg;setTimeout(()=>{el.textContent=o;},1600);}}
function gnSlot(nat,who,tick,mid){const r=campEl('div','display:flex;align-items:center;gap:6px;padding:7px 10px;margin:3px 0;border:1px solid #3a4a5a;border-radius:6px;background:rgba(20,30,40,.6);min-height:34px');
  r.appendChild(campEl('div','width:120px;opacity:.85',who));const n=campEl('div','flex:1;display:flex;align-items:center');if(nat){n.appendChild(gnFlag(nat));}if(mid&&mid.nodeType)n.appendChild(mid);else n.appendChild(campEl('span',nat?'':'opacity:.45',nat?gnName(nat):(mid||'Empty')));r.appendChild(n);
  r.appendChild(campEl('div','width:60px;text-align:right;font-size:20px;color:#8fd36a',tick?'&#10003;':''));return r;}
function gnLobbyRoster(){const pl=[[GC.me,'You (creator)',1]];let i=0;for(const [c,h] of Object.entries(GNT.hum)){if(!h.peer)continue;i++;pl.push([c,'Friend '+i,h.rdy?1:0]);}return pl;}
async function gnLobby(){GNT.wantHost=0;GNT.lobby=1;GNT.pend={};const e=await gnHost();
  if(e){GNT.lobby=0;const root=campEl('div');root.appendChild(campEl('h1','margin:6px 0 8px;font-size:28px','CAMPAIGN LOBBY'));root.appendChild(campEl('div','color:#ffd27a;margin:8px 0 14px',e));root.appendChild(campBtn('Back',()=>{gnLeave();grandMenu();},true));campShow(root);return;}
  GNT.lsig='';gnLobbyTick();}
function gnLobbyTick(){if(!GNT.lobby||!GC)return;const pl=gnLobbyRoster(),sig=JSON.stringify([pl,Object.keys(GNT.pend).length,GNT.code]),now=performance.now();
  if(sig!==GNT.lsig||now-(GNT.lT||0)>2500){GNT.lT=now;gnEmit('glob',{host:GC.me,date:grDateStr(GC.turn,GC.day|0),sc:(GR_SCEN.find(x=>x.id===GC.sc)||{}).n||'',len:GC.len==='std'?'Standard — 60 months':'Quick — 25 months',pl:pl.map(x=>[x[0],x[1],x[2]]),free:gnFree()});}
  if(sig===GNT.lsig&&document.getElementById('gnLobbyHost'))return;GNT.lsig=sig;gnPresence();gnLobbyHostUI(pl);}
function gnLobbyHostUI(pl){const root=campEl('div');root.id='gnLobbyHost';root.appendChild(campEl('h1','margin:6px 0 2px;font-size:28px;letter-spacing:.04em','CAMPAIGN LOBBY'));
  const sc=(GR_SCEN.find(x=>x.id===GC.sc)||{}).n||'';root.appendChild(campEl('div','opacity:.8;margin-bottom:10px;line-height:1.5','<b>'+sc+'</b> · '+(GC.len==='std'?'Standard, 60 months':'Quick, 25 months')+' · starts '+grDateStr(GC.turn,GC.day|0)));
  const inv=campEl('div','display:flex;align-items:center;gap:10px;margin:6px 0 12px;flex-wrap:wrap');inv.appendChild(campEl('span','opacity:.8','Invite code'));inv.appendChild(campEl('b','font-size:26px;letter-spacing:.15em;color:#ffd27a',GNT.code.toUpperCase()));
  const cb=campBtn('Copy invite link',()=>gnCopy(gnLink(),'Link copied',cb),true);cb.id='gnCopyLink';cb.style.cssText+=';padding:6px 12px;font-size:14px;min-height:0';inv.appendChild(cb);root.appendChild(inv);
  for(let i=0;i<8;i++){const p=pl[i];if(p)root.appendChild(gnSlot(p[0],p[1],p[2]));else if(i-pl.length<Object.keys(GNT.pend).length)root.appendChild(gnSlot(null,'Friend','','choosing a nation…'));else root.appendChild(gnSlot(null,'—',0,'Empty'));}
  const waiting=pl.filter(x=>!x[2]).length,go=campBtn('Start campaign',()=>{if(go.disabled)return;gnLobbyStart();});go.id='gnStart';if(waiting){go.disabled=true;go.style.opacity='.45';}root.appendChild(go);
  root.appendChild(campEl('div','opacity:.65;font-size:14px;margin:2px 0 8px',waiting?'Waiting for '+waiting+' friend'+(waiting>1?'s':'')+' to tick Ready.':'AI empires run every nation that is not picked.'));
  root.appendChild(campBtn('Back',()=>{GNT.lobby=0;gnLeave();grandMenu();},true));campShow(root);}
function gnLobbyStart(){GNT.lobby=0;GNT.pend={};GNT.dirty=1;GNT.last='';GNT.ui=0;campClose();grandOpen();}
function gnLobbyClient(taken){const L=GNT.lob||{pl:[]},free=GNT.free||L.free||[],mine=GNT.nat,sig=JSON.stringify([L,mine,GNT.rdy,taken||'']);if(sig===GNT.lcs&&document.getElementById('gnLobbyCl'))return;GNT.lcs=sig;
  const root=campEl('div');root.id='gnLobbyCl';root.appendChild(campEl('h1','margin:6px 0 2px;font-size:28px;letter-spacing:.04em','CAMPAIGN LOBBY'));
  root.appendChild(campEl('div','opacity:.8;margin-bottom:10px;line-height:1.5',(L.sc?'<b>'+L.sc+'</b> · ':'')+(L.len||'')+(L.date?' · starts '+L.date:'')+(L.host?'<br>Created by <b>'+gnName(L.host)+'</b>':'')+(taken?'<br><span style="color:#ffd27a">'+gnName(taken)+' was just taken — pick another.</span>':'')));
  const note=campEl('div','min-height:20px;color:#ffd27a;margin:4px 0');note.id='gnNote';
  const taken0=new Set((L.pl||[]).map(x=>x[0]));const ME=['IR','RS','DW','RV','IL','SA','AE','OM','IQ','SY','TR','JO','EG','KD'];
  const all=[...new Set([...free,...(mine?[mine]:[]),...taken0])].filter(Boolean).sort((a,b)=>(ME.includes(a)?0:1)-(ME.includes(b)?0:1)||(gnName(a)<gnName(b)?-1:1));
  const sel=campEl('select','font-size:18px;padding:6px;background:#1a2430;color:#fff;border:1px solid #6b7a55;border-radius:6px;min-width:260px');sel.id='gnNat';
  if(!mine){const o=document.createElement('option');o.value='';o.textContent='Pick your nation…';sel.appendChild(o);}
  for(const c of all){const o=document.createElement('option');o.value=c;const t=c!==mine&&!free.includes(c);o.disabled=t;o.textContent=gnName(c)+(t?' (taken)':'');sel.appendChild(o);}sel.value=mine||'';
  sel.onchange=()=>{if(!sel.value)return;GNT.rdy=0;GNT.lcs='';note.textContent='Asking…';gnEmit('gpick',{n:sel.value,tok:GNT.tok});};
  for(const x of (L.pl||[])){if(x[0]===mine)continue;root.appendChild(gnSlot(x[0],x[0]===L.host?'Creator':x[1],x[2]));}
  const me=gnSlot(mine||null,'You',GNT.rdy,sel);me.style.borderColor='#6b7a55';root.appendChild(me);
  for(let i=(L.pl||[]).length+(mine?0:1);i<8;i++)root.appendChild(gnSlot(null,'—',0,'Empty'));
  const rb=campBtn(GNT.rdy?'Ready ✓ (tap to undo)':'Ready',()=>{if(!GNT.nat){note.textContent='Pick a nation first.';return;}GNT.rdy=GNT.rdy?0:1;GNT.lcs='';gnEmit('grdy',{r:GNT.rdy});gnLobbyClient();});rb.id='gnReady';root.appendChild(rb);
  root.appendChild(campEl('div','opacity:.65;font-size:14px;margin:2px 0 8px','The creator starts the campaign when everyone is ready.'));
  root.appendChild(campBtn('Back',()=>{gnLeave();gnMenu();},true));root.appendChild(note);campShow(root);}
/* invite link: …/#gcamp=CODE opens the game straight into this lobby */
(function(){const m=/[#&]gcamp=([a-z0-9]{4,8})/i.exec(location.hash||'');if(!m)return;const code=m[1];try{history.replaceState(null,'',location.href.split('#')[0]);}catch(_){}
  let n=0;const t=setInterval(()=>{if(++n>120){clearInterval(t);return;}if(typeof NET==='undefined'||!NET.room||typeof gnJoin!=='function'||!document.getElementById('grandBtn'))return;clearInterval(t);
    gnJoin(code).then(e=>{if(e)gnMenu(e);}).catch(()=>{});},500);})();
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
  {const b=GC&&GC.ph==='resolve'&&GC.q&&GC.q[GC.qi];   /* A2b: everyone sees which battle the map is waiting on */
   if(b&&!b.done&&GCM.P[b.p])c.innerHTML+='<div style="margin-top:3px;color:#ffb35c">&#9876; Battle for <b>'+GCM.P[b.p].n+'</b>: '+gnName(b.an)+' vs '+gnName(b.dn)+' — the map waits for the result</div>';}
  c.title=GNT.host?'Click to copy the invite code':'';c.onclick=()=>{if(!GNT.host)return;const t='Join my World War 3 grand campaign: '+gnLink()+' (or Multiplayer → paste the code '+GNT.code.toUpperCase()+')';try{navigator.clipboard.writeText(t);GV.hint='Invite copied: code '+GNT.code.toUpperCase();guHint();}catch(e){}};}
/* hooks: the menu gets the Online item; New campaign for friends hosts once the map opens; leaving the map leaves the room */
(function(){const _gm=grandMenu;grandMenu=function(){_gm();const s=document.getElementById('campScreen');if(!s)return;const bs=[...s.querySelectorAll('button')],back=bs.find(b=>b.textContent==='Back');
    /* online grand campaigns live in the one Multiplayer screen (Abdullah 2026-11-07 21:40 "Make it the same place") */
    const p=campBtn('Play online →',()=>{campClose();if(typeof mxOnline==='function')mxOnline('campaign');},true);p.id='gnPlayBtn';p.title='Multiplayer: start or join an online campaign';GNT.wantHost=0;
    if(back)back.parentNode.insertBefore(p,back);else s.firstChild.appendChild(p);};
  const _go=grandOpen;grandOpen=function(){_go();if(GNT.wantHost&&GC&&!GNT.on){GNT.wantHost=0;gnHost().then(e=>{if(e){GV.hint=e;try{guHint();}catch(_){}}});}gnChip();};
  const _gc=grandClose;grandClose=function(){_gc();if(GNT.on){const h=GNT.host;gnLeave();if(h)GNT.wantHost=0;}};
  if(!window._gnI)window._gnI=setInterval(()=>{try{gnHostTick();}catch(e){console.error('gnHostTick',e);}},250);})();

/* ---------- A2b slice 2: a friend fights their own battles live (lane A, 2026-11-07) ----------
   Month end on the host: a battle a connected friend's nation is in (and the host's own nation is not) is no longer
   auto-resolved. The host pushes the world, asks that friend (gbat) and waits with the clock stopped — exactly like a
   solo player's battle prompt. The friend gets the normal Fight it live / Auto-resolve / Withdraw prompt on their own map;
   live = the full battle in their browser (their side commanded by them, the other by the battle AI, as for any away
   player). The friend sends back the survivors (units, wounds, xp, ammo, fuel, positions) and who won; the host checks the
   armies belong to that battle (no new units) and settles it through the same grBattleDone as a solo live battle, so war
   support, tradition, morale, occupation and the AI react the same way. No answer in 90 s, the friend leaving, or the host
   pressing Auto-resolve now = the generals auto-resolve it (same dice as solo). Open: host vs friend both live (the
   friend's side is the battle AI now), spectating, a general falling in a friend's battle is not sent yet. */
function gnBattleFor(b){if(!GNT.host||!GC)return '';const inv=new Set([b.an,b.dn]);for(const s of grSideUnits(b,'att').concat(grSideUnits(b,'def')))if(s.arr)inv.add(s.arr.o);
  if(GC.me&&inv.has(GC.me))return '';for(const c of [b.an,b.dn,...[...inv].sort()]){const h=GNT.hum[c];if(h&&h.peer)return c;}return '';}
function gnBattleAsk(b,nat){const qi=GC.qi,w=GNT.bw={qi,nat,t:GC.turn,go:0,p:b.p};GNT.last='';
  gnPush().catch(e=>console.error('gnPush',e)).then(()=>{if(GNT.bw===w&&GNT.hum[nat])gnEmit('gbat',{to:GNT.hum[nat].peer,qi,t:GC.turn});});
  clearTimeout(GNT.bwT);GNT.bwT=setTimeout(()=>{if(GNT.bw===w&&!w.go)gnBatAuto('late');},90000);gnBatUI();try{gnChip();}catch(e){}}
function gnBatUI(){const w=GNT.bw;if(!w)return;const P=GCM.P[w.p];
  GNT.bwM=guModal('<div style="opacity:.7;font-size:13px">BATTLE · '+grMonStr(GC.turn).toUpperCase()+'</div><h2 style="margin:2px 0 8px;font-size:22px">'+P.n+'</h2><div style="margin-bottom:12px">'
    +(w.go?'<b>'+gnName(w.nat)+'</b> is fighting this battle live. The map waits for the result.':'Waiting for <b>'+gnName(w.nat)+'</b> to choose: fight it live or auto-resolve…')+'</div>',[['Auto-resolve now',()=>{GNT.bwM=null;gnBatAuto('host');},0]]);}
function gnBatEnd(){const w=GNT.bw;GNT.bw=null;clearTimeout(GNT.bwT);if(GNT.bwM){GNT.bwM.remove();GNT.bwM=null;}try{gnChip();}catch(e){}return w;}
function gnBatAuto(why){const w=gnBatEnd();if(!w||GC.turn!==w.t||GC.qi!==w.qi)return;const b=GC.q[w.qi];const h=GNT.hum[w.nat];
  if(why!=='friend'&&h&&h.peer)gnEmit('gbx',{to:h.peer,why});GNT.dirty=1;GNT.ui=1;grBattleDone(b,grBattleAuto2(b),'auto');try{grandMapRefresh();}catch(e){}}
function gnBatMsg(nat,d){const w=GNT.bw;if(!w||w.nat!==nat||(d.qi|0)!==w.qi)return;
  if(d.k==='bgo'){w.go=1;clearTimeout(GNT.bwT);gnBatUI();return;}
  if(d.auto||(d.t|0)!==w.t){gnBatAuto('friend');return;}
  const b=GC.q[w.qi],adj=GCM.P[b.p].adj,ids=new Set([...b.att,...b.def]);
  for(const r of Array.isArray(d.arm)?d.arm.slice(0,40):[]){const a=GC.armies.find(x=>x.id===r.id);if(!a||!(ids.has(a.id)||(adj.includes(a.at)&&!a.path.length)))continue;
    if(Array.isArray(r.u)&&r.u.length<=a.u.length)a.u=r.u.filter(x=>Array.isArray(x)&&typeof x[0]==='string'&&a.u.some(y=>y[0]===x[0])).map(x=>x.slice(0,8).map(v=>typeof v==='number'?Math.max(0,Math.min(1e4,v)):v));
    if(typeof r.fu==='number')a.fu=Math.max(0,Math.min(a.fu==null?100:a.fu,r.fu));
    if(a.o===nat&&a.at===b.p&&typeof r.at==='number'&&adj.includes(r.at)&&grRetreatTo(a,b.p)===r.at){a.at=r.at;a.path=[];}}   /* a defender's Withdraw */
  b.def=b.def.filter(id=>GC.armies.some(a=>a.id===id&&a.at===b.p));gnBatEnd();GNT.dirty=1;GNT.ui=1;
  grLog(gnName(nat)+' fought the battle for '+GCM.P[b.p].n+' live.',nat);grBattleDone(b,d.win==='att'?'att':'def',d.how==='retreat'?'retreat':'live');try{grandMapRefresh();}catch(e){}}
/* friend side */
function gnBatTry(){const B=GNT.bat;if(!B||B.shown||!GC||GC.turn!==B.t||GC.qi!==B.qi)return;const b=GC.q[B.qi];if(!b||b.done)return;B.shown=1;B.ids=[...b.att,...b.def];
  setTimeout(()=>{if(GNT.bat===B)grBattlePrompt(b);},0);}
function gnBatDone(b,win,how){const B=GNT.bat;GNT.bat=null;const ids=new Set([...(B.ids||[]),...b.att,...b.def,...((typeof GB_CUR!=='undefined'&&GB_CUR&&GB_CUR.b===b&&GB_CUR.rf)||[])]);
  const arm=GC.armies.filter(a=>ids.has(a.id)).map(a=>({id:a.id,u:a.u,fu:a.fu,at:a.at}));
  gnSend({k:'bres',qi:B.qi,t:B.t,win,how,auto:how==='auto'?1:0,arm});GV.hint='Battle result sent — the world moves on.';try{guHint();}catch(e){}
  const s=GNT.stash;GNT.stash=null;if(s)gnApply(s[0],s[1]);else try{grandMapRefresh();}catch(e){}}

/* Multiplayer screen: campaigns share the join box and the open-games list with battles (one place, labelled Campaign / Conquest / Battle) */
(function(){const _jb=joinByCode;
  const isGame=w=>{try{return NET.room.peers().some(p=>!p.sameTab&&p.presence&&p.presence.g&&String(p.presence.g.c).toLowerCase()===w);}catch(e){return false;}};
  const isCamp=w=>gnList().some(p=>String(p.presence.gg.c).toLowerCase()===w);
  joinByCode=function(raw,quiet,pw){const t=String(raw||''),m=/[#&?]gcamp=([a-z0-9]{4,8})/i.exec(t);let c=m&&m[1];const w=t.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
    const campJoin=cc=>{const st=document.getElementById('mpstatus');if(st)st.textContent='Joining the campaign…';return gnJoin(cc).then(e=>{if(e){if(st)st.textContent='';gnMenu(e);}else if(st)st.textContent='';});};
    if(c)return campJoin(c);
    if(w.length<4||w.length>8||t.trim()!==t.trim().replace(/\s+/g,'')||/\W/.test(t.trim()))return _jb(raw,quiet,pw);   // only a bare code can be a campaign code
    if(isCamp(w))return campJoin(w);if(isGame(w))return _jb(raw,quiet,pw);
    /* a code that is in neither list (typed straight after the screen opened, or no relay to list rooms): it may still be a campaign room, so look for that first (fast: the room either answers or is unknown) and only then take the battle path - a campaign code sent down the battle path ends in "no direct connection" */
    const st=document.getElementById('mpstatus');if(st)st.textContent='Looking for that game…';
    return gnJoin(w,8000).then(e=>{if(!e){if(st)st.textContent='';return;}if(/^No online campaign/.test(e)){if(st&&/Looking for that/.test(st.textContent))st.textContent='';return _jb(raw,quiet,pw);}if(st)st.textContent='';gnMenu(e);});};
  const _rg=renderGames;renderGames=async function(){await _rg.apply(this,arguments);try{gnGameRows();}catch(e){console.warn('gnGameRows',e);}};})();
function gnGameRows(){const el=document.getElementById('games');if(!el)return;for(const r of el.querySelectorAll('.gnrow'))r.remove();const L=gnList();if(!L.length)return;
  const emp=el.querySelector('.empty');if(emp&&!el.querySelector('.game')&&!/Looking|unavailable|claude\.ai/.test(emp.textContent))emp.remove();
  const hd=campEl('div','','');hd.className='empty gnrow';hd.textContent=L.length+' open campaign'+(L.length===1?'':'s');el.appendChild(hd);
  for(const p of L){const g=p.presence.gg,row=document.createElement('div');row.className='game gnrow';const info=document.createElement('div'),b=document.createElement('b');b.textContent='Campaign';
    const s=document.createElement('span');s.textContent=' · '+(g.s||'World')+' · led by '+(g.n||'')+' · '+(g.d||'')+' · '+(g.fr|0)+' free nations · code '+String(g.c).toUpperCase();info.append(b,s);
    const btn=document.createElement('button');btn.textContent='Join';btn.disabled=!!(GNT.on||GNT.lobby);btn.onclick=async()=>{try{initAudio();}catch(_){}btn.disabled=true;const e=await gnJoin(g.c);if(e)gnMenu(e);};row.append(info,btn);el.appendChild(row);}}
