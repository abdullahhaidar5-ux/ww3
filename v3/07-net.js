/* ================= MULTIPLAYER: lobby + host-authoritative sync over the artifact room ================= */
const NET={room:null,user:null,game:null,code:null,opp:null,hostPeer:null,myPeer:null,snapT:0,bT:0,evT:0,teamT:0,helloI:null,names:{}};
const FLG={built:1,cargo:2,dis:4,chg:8,hack:16,plant:32,land:64,hid:128,mem:256,mov:2048,busy:4096,nd:8192,stall:16384,supp:32768,mark:65536,rout:131072,shak:262144,last:524288,aband:1048576};
// Multiplayer messages need at least Contributor access to this game: anyone the owner invited from the Share menu
// as Contributor or Editor can play; plain view-only visitors can watch the lobby but cannot join or host.
function cancelHost(){leaveNet();renderGames();}
function noPerm(){$('mpstatus').innerHTML='';const d=document.createElement('div');d.className='empty';d.textContent='Hosting needs edit access to this game. You can still join a game someone else hosts: pick it from the list and press Join. To host, ask the game\'s owner to give you Editor access from the Share menu.';$('mpstatus').append(d);}
async function netInit(){
  const st=$('mpstatus');
  try{if(typeof claude!=='undefined'&&claude.use)NET.room=await claude.use('room');}catch(e){}
  if(!NET.room){$('games').innerHTML='<div class="empty">Multiplayer works when this game is opened from its claude.ai link. Skirmish works everywhere.</div>';$('host').disabled=true;return;}
  try{NET.user=await claude.use('user');}catch(e){}
  NET.room.onPeers(()=>renderGames(),()=>{$('games').innerHTML='<div class="empty">Multiplayer is unavailable for this viewer.</div>';$('host').disabled=true;});
  renderGames();
  if($('jbtn')){$('jbtn').onclick=()=>{initAudio();joinByCode($('jcode').value);};$('jcode').onkeydown=e=>{if(e.key==='Enter'){initAudio();joinByCode($('jcode').value);}};}
  try{const h=(location.hash||'')+' '+(document.referrer||'');const c=codeFrom(h.includes('join=')?h:'');if(c){$('jcode').value=c.toUpperCase();setTimeout(()=>joinByCode(c,true),1500);}}catch(e){}
}
async function renderGames(){if(!NET.room)return;const el=$('games');const ps=NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.g&&p.presence.g.s==='open'&&FKEYS.includes(p.presence.g.f));
  if(!ps.length){el.innerHTML=`<div class="empty">${NET.code?'Your game is open. Waiting for players to join…':window.WW3_P2P?'To join a friend, type their game code below. To play together, one of you hosts and shares the code.':'No open games right now. Host one and share this game with a friend.'}</div>`;return;}
  let names={};try{if(NET.user){const ids=ps.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  el.innerHTML='';for(const p of ps){const g=p.presence.g,row=document.createElement('div');row.className='game';const nm=(p.by&&names[p.by]&&names[p.by].name)||(p.isMe?'You (other tab)':'A player');
    const info=document.createElement('div');const b=document.createElement('b');b.textContent=FACTIONS[g.f].name;const s=document.createElement('span');s.textContent=` · hosted by ${nm} · ${(MAPS[g.m]||MAPS.strait).name} · ${g.n||1}/${g.mx||8} players`;info.append(b,s);
    const btn=document.createElement('button');btn.textContent='Join';btn.disabled=!!NET.code||g.s==='full';btn.onclick=()=>{initAudio();joinGame(p);};row.append(info,btn);el.append(row);}}
const GAME_URL=window.WW3_P2P?(()=>{try{const r=document.referrer||'';if(/itch\.io/.test(r))return r.split('#')[0];}catch(e){}return location.href.split('#')[0];})():'https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi';
function inviteText(){if(window.WW3_P2P&&location.protocol==='file:')return `Join my World War 3 battle! Open the World War 3 game file (ww3.html, from Discord) in Chrome or Edge, go to Multiplayer and enter game code ${NET.code.toUpperCase()} in "Join by code".`;return window.WW3_P2P?`Join my World War 3 battle! Open ${GAME_URL} , go to Multiplayer and enter game code ${NET.code.toUpperCase()} in "Join by code".`:`Join my World War 3 battle: ${GAME_URL}#join=${NET.code} (game code ${NET.code.toUpperCase()}). Open the link signed in to claude.ai, go to Multiplayer and press Join, or type the code into "Join by code".`;}
function copyText(t,btn){const done=()=>{if(btn){const o=btn.textContent;btn.textContent='Copied ✓';setTimeout(()=>btn.textContent=o,1600);}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fallback());return;}}catch(e){}fallback();
  function fallback(){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();if(ok)done();else if(btn)btn.textContent='Select the text and copy it';}}
// join a hosted game from its code (typed, pasted invite text, or the #join= part of an invite link)
function codeFrom(s){const m=String(s||'').toLowerCase().match(/join=([a-z0-9]{4,8})/)||String(s||'').toLowerCase().match(/\b([a-z0-9]{6})\b/);return m?m[1]:null;}
function joinByCode(raw,quiet){if(!NET.room||NET.game)return;const code=codeFrom(raw);if(!code){if(!quiet)$('mpstatus').textContent='That is not a game code. Paste the invite or type the 6-character code.';return;}
  if(window.WW3_P2P){joinGame({peer:'ww3-'+code,presence:{g:{c:code,s:'open'}}});return;}
  let tries=0;const look=()=>{const p=NET.room.peers().find(q=>!q.sameTab&&q.presence&&q.presence.g&&q.presence.g.c===code);if(p){if(p.presence.g.s==='full'){$('mpstatus').textContent='That game is full or has already started.';return;}joinGame(p);return;}
    if(++tries<14){$('mpstatus').textContent='Looking for game '+code.toUpperCase()+'…';setTimeout(look,700);return;}
    $('mpstatus').textContent='Game '+code.toUpperCase()+' was not found. Check that the host still has the lobby open and has invited you from the game\'s Share menu, and that you are signed in to claude.ai.';};look();}
// Host-side handlers for a game room (also used when a standby player takes over as host)
function wireHost(g){
  NET.cseq=NET.cseq||{};const hostHello=(peer,by,f,tok)=>{if(MODE==='host'){hostRejoin(peer,tok);return;}if(MODE!=='single')return;const cf=FKEYS.includes(f)?f:'US';const m={peer,by};const p=NET.lobby.find(q=>q.peer===m.peer);if(p){p.f=cf;if(tok)p.tok=tok;}else{if(NET.lobby.length>=(MAPS[setup.map]||MAPS.strait).max-1){NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer,full:1}).catch(()=>{});return;}NET.lobby.push({peer:m.peer,by:m.by,f:cf,tok:tok||null});}
    NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer}).catch(()=>{});renderLobby();};
  g.on('hello',m=>{if(m.sameTab)return;hostHello(m.peer,m.by,m.data&&m.data.f);});
  const hostCmd=(peer,data)=>{if(MODE!=='host')return;const ix=NET.peers?NET.peers.indexOf(peer):-1;if(ix<1)return;if(G&&G.teams[ix]&&G.teams[ix].out)return;const a=cleanCmd(data);if(a)act(ix,a);};
  g.on('cmd',m=>hostCmd(m.peer,m.data));
  g.onPeers(ch=>{for(const q of ch.joined.concat(ch.updated)){if(q.sameTab||!q.presence)continue;const pr=q.presence;(NET.seen=NET.seen||{})[q.peer]=performance.now();
      if(pr.hi&&pr.hi.ed!=null)(NET.edOf=NET.edOf||{})[q.peer]=pr.hi.ed?1:0;
      // a player the heartbeat marked as gone (e.g. their PC stalled while loading) is linked back as soon as they are heard from again
      if(MODE==='host'&&NET.peers&&pr.hi&&typeof pr.hi.tok==='string'&&NET.peers.indexOf(q.peer)<0)hostRejoin(q.peer,pr.hi.tok.slice(0,16));
      if(pr.hi&&(MODE==='single'||MODE==='host')&&(NET.lastHi||{})[q.peer]!==pr.hi.n){(NET.lastHi=NET.lastHi||{})[q.peer]=pr.hi.n;hostHello(q.peer,q.by,pr.hi.f,typeof pr.hi.tok==='string'?pr.hi.tok.slice(0,16):null);}
      if(typeof pr.pg==='number'&&(NET.lastPg||{})[q.peer]!==pr.pg){(NET.lastPg=NET.lastPg||{})[q.peer]=pr.pg;NET.game.emit('pong',{to:q.peer,t:pr.pg}).catch(()=>{});if(typeof pr.pi==='number')(NET.pings=NET.pings||{})[q.peer]=pr.pi;}
      if(Array.isArray(pr.cq)&&MODE==='host'){let last=NET.cseq[q.peer]||0;for(const c of pr.cq){if(!c||typeof c.s!=='number'||c.s<=last)continue;last=c.s;hostCmd(q.peer,c.a);}NET.cseq[q.peer]=last;const ix=NET.peers?NET.peers.indexOf(q.peer):-1;if(ix>0)(NET.cseqSlot=NET.cseqSlot||[])[ix]=Math.max((NET.cseqSlot||[])[ix]|0,last);}
      if(typeof pr.kr==='number'&&MODE==='host'&&NET.peers&&(NET.lastKr||{})[q.peer]!==pr.kr){(NET.lastKr=NET.lastKr||{})[q.peer]=pr.kr;const ix=NET.peers.indexOf(q.peer);if(ix>0&&NET.kf)NET.kf[ix]=0;}}});
  g.onPeers(ch=>{for(const q of ch.left){if(MODE==='single'){NET.lobby=NET.lobby.filter(p=>p.peer!==q.peer);renderLobby();}else if(MODE==='host'&&NET.peers){const ix=NET.peers.indexOf(q.peer);if(ix>0)playerLeft(ix);}}});
}
async function hostGame(){if(!NET.room||NET.code)return;const code=Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'a');NET.code=code;NET.baseCode=code;NET.gen=0;NET.lobby=[];$('host').hidden=true;$('cancelHost').hidden=false;
  $('mpstatus').textContent='Opening your game…';
  try{NET.game=await NET.room.join('tc-'+code);}catch(e){$('mpstatus').textContent=window.WW3_P2P?'Could not reach the online matchmaking service. Check your internet connection and try again.':'Could not open a game room. Try again in a moment.';cancelHost();return;}
  wireHost(NET.game);
  try{await NET.game.emit('lobby',{n:1,probe:1});}catch(e){if(e&&e.code==='not_permitted'){noPerm();cancelHost();return;}}
  await NET.room.presence({g:{c:code,f:setup.p,s:'open',n:1}}).catch(()=>{});renderLobby();renderGames();}
const TEAM_COL=['#7fb8e6','#ea5a40','#74d08f','#e3b341','#c58af0','#f08ab4','#6fe0d0','#c9c9c9'];
// Host lobby: game code and player count at the top, the Start button right under it, one row per seat (taken or
// open) with each player's nation and team, quick team presets, and the invite steps at the bottom.
async function renderLobby(){if(!NET.code||NET.code==='join'||MODE!=='single')return;const mx=(MAPS[setup.map]||MAPS.strait).max,mapN=(MAPS[setup.map]||MAPS.strait).name;
  if(NET.lobby.length+1>mx){const drop=NET.lobby.splice(mx-1);for(const p of drop)NET.game.emit('lobby',{n:0,to:p.peer,full:1}).catch(()=>{});}
  let names={};try{if(NET.user){const ids=NET.lobby.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  const nn=NET.lobby.length+1;NET.tm=(NET.tm||[]).slice(0,nn);while(NET.tm.length<nn)NET.tm.push(NET.tm.length%Math.max(2,nn));const teamsOk=new Set(NET.tm).size>1;
  const E=(t,c,txt)=>{const d=document.createElement(t);if(c)d.className=c;if(txt!=null)d.textContent=txt;return d;};
  const el=$('mpstatus');el.innerHTML='';const L=E('div','lob');
  // header
  const hd=E('div','lobhd');const l=E('div');l.append(E('div','lobk','Your game · code'),E('div','lobcode',NET.code.toUpperCase()));
  const r=E('div','lobr');r.append(E('div','lobmap',mapN),E('div','lobn',`${nn} / ${mx} players`));const pips=E('div','pips');for(let i=0;i<mx;i++){const d=E('i');if(i<nn)d.className='on';pips.append(d);}r.append(pips);hd.append(l,r);L.append(hd);
  // start
  const sb=E('button','big startbtn',nn>=2?`▶ Start ${nn}-player battle`:'▶ Start battle');sb.disabled=nn<2||!teamsOk;sb.onclick=()=>launchMP();L.append(sb);
  L.append(E('div','lobwhy',nn<2?'Waiting for at least one more player to join.':!teamsOk?'Everyone is on one team: put someone on another team to start.':'Everyone ready? Press Start. Players can still join until you do.'));
  // seats
  const sh=E('div','lobsec');sh.append(E('span','','Players'));const pre=E('span','presets');
  const pb=(lab,fn)=>{const b=E('button','chip',lab);b.onclick=()=>{NET.tm=NET.tm.map((_,i)=>fn(i));renderLobby();};pre.append(b);};
  if(nn>=2){pb('Free for all',i=>i);pb('2 teams',i=>i%2);if(nn>=4)pb('You + allies vs rest',i=>i<Math.ceil(nn/2)?0:1);}sh.append(pre);L.append(sh);
  const seats=E('div','seats');
  const seat=(i,nm,f,host)=>{const row=E('div','seat');row.style.setProperty('--tc',TEAM_COL[NET.tm[i]%8]);row.append(E('span','sn',String(i+1)));const who=E('div','who');who.append(E('b','',nm));if(host)who.append(E('span','tag','host'));row.append(who);
    const fc=E('span','sfac');fc.append(E('span','fcode',f),E('span','fname',FACTIONS[f].name));row.append(fc);
    const s=document.createElement('select');s.setAttribute('aria-label','Team for '+nm);for(let t=0;t<Math.max(2,nn);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);s.append(o);}s.value=NET.tm[i];s.onchange=()=>{NET.tm[i]=+s.value;renderLobby();};row.append(s);seats.append(row);};
  seat(0,'You',setup.p,true);NET.lobby.forEach((p,k)=>seat(k+1,(p.by&&names[p.by]&&names[p.by].name)||'Player '+(k+2),p.f,false));
  for(let i=nn;i<mx;i++){const row=E('div','seat open');row.append(E('span','sn',String(i+1)),E('div','who','Open seat · waiting for a player'));seats.append(row);}
  L.append(seats);
  // invite
  L.append(E('div','lobsec','Invite players'));const st=E('ol','steps');
  if(window.WW3_P2P){st.append(E('li','','Copy the invite below and send it to your friends (text, Discord, email…).'));st.append(E('li','','They open the game, go to Multiplayer and type your code into “Join by code”. No account needed.'));}
  else{  st.append(E('li','','Open this game’s Share menu (top of the page) and add each friend by email. They need a claude.ai account and must be signed in.'));
  st.append(E('li','','Send them the invite below. They open the link, go to Multiplayer and press Join, or type the code into “Join by code”.'));}
  st.append(E('li','','When everyone shows up in the seats above, press Start.'));L.append(st);
  const iv=E('div','invite');const inp=document.createElement('input');inp.readOnly=true;inp.value=inviteText();inp.setAttribute('aria-label','Invite to share');inp.onfocus=()=>inp.select();const cb=E('button','big','Copy invite');cb.onclick=()=>copyText(inviteText(),cb);iv.append(inp,cb);L.append(iv);
  el.append(L);
  NET.room.presence({g:{c:NET.code,f:setup.p,s:nn>=mx?'full':'open',n:nn,m:setup.map||'strait',mx}}).catch(()=>{});}
function launchMP(){if(MODE!=='single'||!NET.lobby.length)return;const seed=(Math.random()*1e9)|0;const facs=[setup.p,...NET.lobby.map(p=>p.f)];NET.peers=[null,...NET.lobby.map(p=>p.peer)];NET.toks=[null,...NET.lobby.map(p=>p.tok||null)];NET.opp=NET.peers[1];
  const map=setup.map||'strait';const tm=(NET.tm||[]).slice(0,facs.length);while(tm.length<facs.length)tm.push(tm.length);NET.lobby.forEach((p,i)=>NET.game.emit('start',{pv:NET_PV,seed,facs,slot:i+1,to:p.peer,map,tm}).catch(()=>{}));NET.room.presence({g:{c:NET.code,f:setup.p,s:'full',n:facs.length}}).catch(()=>{});NET.startInfo={seed,facs,map,tm};startMP('host',seed,facs,0,map,tm);}
// A dropped player gets 30 s to reconnect (same team, same units) before the AI takes over their side.
function hostRejoin(peer,tok){if(!tok||!NET.toks||!G)return;const ix=NET.toks.indexOf(tok);if(ix<1)return;const old=NET.peers[ix];if(old===peer)return;NET.peers[ix]=peer;NET.cseq[peer]=Math.max(NET.cseq[peer]||0,NET.cseq[old]||0,(NET.cseqSlot||[])[ix]|0);
  const T=G.teams[ix];T.discT=0;if(T.aiTook){T.ai=null;T.aiTook=0;}if(NET.kf)NET.kf[ix]=0;if(NET.kf)NET.kf.all=0;const S=NET.startInfo;if(S)NET.game.emit('start',{pv:NET_PV,seed:S.seed,facs:S.facs,slot:ix,to:peer,map:S.map,tm:S.tm}).catch(()=>{});
  for(const O of G.teams)log(O.id,`${T.F.name}'s commander reconnected.`,'g');
  // P2P: the rejoined player starts from a fresh map, so collapsed city blocks are re-sent as they come into view
  if(window.WW3_P2P){(NET.gq=NET.gq||[])[ix]=[];(NET.civQ=NET.civQ||[])[ix]=(G.civ||[]).map((c,i)=>c.dead?i:-1).filter(i=>i>=0);}}
function discTick(){if(!NET.peers||!G)return;const now=performance.now();for(let k=0;k<NET.peers.length;k++){const p=NET.peers[k];if(k===ME||!p)continue;const ls=(NET.seen||{})[p];if(ls&&now-ls>8000&&!G.teams[k].discT&&!G.teams[k].ai){NET.peers[k]=null;playerLeft(k);}}for(let k=1;k<NET.peers.length;k++){const T=G.teams[k];if(T&&T.discT&&G.t-T.discT>30&&!T.out){T.discT=0;T.ai=mkAI(1);T.aiTook=1;for(const O of G.teams)log(O.id,`${T.F.name}'s commander did not come back. The AI has taken over (they can still rejoin).`,'w');}}}
function playerLeft(ix){if(!G||G.over)return;const T=G.teams[ix];if(!T||T.out||T.ai)return;T.discT=G.t;for(const O of G.teams)log(O.id,`${T.F.name}'s commander lost connection. Waiting up to 30 s for them to reconnect…`,'w');return;
  if(NET.peers.slice(1).every((p,k)=>!p||G.teams[k+1].ai))pushLog('All other players have left. The AI controls their forces.','w');}
// Joining: each player has a reconnect token for this game (kept for the browser tab), so if the link drops - or the
// page is reloaded - they rejoin as the same commander. Client handlers are wired by wireClient() so a reconnect can
// rebuild them on the new connection.
function joinTok(code){const k='ww3_tok_'+code;let t=null;try{t=sessionStorage.getItem(k);}catch(e){}if(!t){t=Math.random().toString(36).slice(2,12);try{sessionStorage.setItem(k,t);}catch(e){}}return t;}
function wireClient(g){
  g.on('hello',m=>{if(m.sameTab)NET.myPeer=m.peer;});
  g.on('lobby',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer&&MODE==='single'){if(m.data.full){clearInterval(NET.helloI);$('mpstatus').textContent='That game is full.';leaveNet();return;}$('mpstatus').textContent=`Joined. ${m.data.n} players in the lobby. Waiting for the host to start the battle…`;}});
  g.on('start',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer||MODE!=='single')return;clearInterval(NET.helloI);const d=m.data;if((d.pv|0)!==NET_PV){$('mpstatus').textContent='You and the host have different versions of the game. Both of you: close the game and open it again to update, then rejoin.';leaveNet();return;}if(!Array.isArray(d.facs)||d.facs.length<2||d.facs.length>8||!d.facs.every(f=>FKEYS.includes(f)))return;const sl=d.slot|0;if(sl<1||sl>=d.facs.length)return;const map=MAPS[d.map]?d.map:'strait';const tm=Array.isArray(d.tm)&&d.tm.length===d.facs.length?d.tm.map(v=>Math.max(0,Math.min(7,v|0))):null;startMP('client',d.seed|0,d.facs,sl,map,tm);});
  const ok=m=>m.peer===NET.hostPeer&&MODE==='client'&&(!m.data.to||m.data.to===NET.myPeer);
  g.on('snap',m=>{if(ok(m)){NET.lastRx=performance.now();applySnap(m.data);}});
  g.on('evt',m=>{if(ok(m)){NET.lastRx=performance.now();applyEvents(m.data);}});
  g.on('team',m=>{if(ok(m)){NET.lastRx=performance.now();applyTeam(m.data);}});
  g.on('ck',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer)ckReceive(m.data);});
  g.on('pong',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer)return;const rtt=Date.now()-(+m.data.t||0);if(rtt>=0&&rtt<20000)NET.ping=NET.ping?NET.ping*.7+rtt*.3:rtt;});
  g.onPeers(ch=>{if(!NET.myPeer){const me=ch.peers.find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}if(NET.findHost){const h=ch.peers.find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}if(ch.left.some(q=>q.peer===NET.hostPeer)){if(MODE==='client')clientReconnect();else if(MODE==='single'&&NET.code==='join'){clearInterval(NET.helloI);$('mpstatus').textContent='The host closed the game.';leaveNet();}}});}
async function clientReconnect(){if(NET.recon||!NET.jcode)return;NET.recon=true;pushLog('Connection to the host lost. Reconnecting…','w');const code=NET.jcode;
  for(let tries=0;tries<12&&MODE==='client'&&!(G&&G.over);tries++){await new Promise(r=>setTimeout(r,tries?1500:1000));
    if(tries>=1&&NET.isStandby&&NET.lastCk){if(await promoteToHost()){NET.recon=false;return;}}
    const gen=(NET.gen||0)+(tries%2===1?1:0),room=migRoom(gen);
    try{if(NET.game)NET.game.leave().catch(()=>{});}catch(e){}NET.game=null;
    let g=null;try{g=await NET.room.join('tc-'+room,NET.via?{via:NET.via}:undefined);}catch(e){continue;}NET.game=g;NET.myPeer=null;
    if(window.WW3_P2P)NET.hostPeer='ww3-'+room;else if(gen>0){NET.hostPeer=null;NET.findHost=true;}wireClient(g);
    if(NET.findHost){const h=g.peers().find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}
    NET.lastSnapT=0;NET.prevT=0;NET.rxW=0;NET.ia=0;const t0=performance.now();for(let k=0;k<8&&NET.lastRx<t0;k++){if(!NET.myPeer){const me=g.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}g.presence({hi:{f:setup.p,n:Date.now()%1e6,tok:NET.tok,ed:NET.canEmit===false?0:1},cq:NET.cq||[]}).catch(()=>{});await new Promise(r=>setTimeout(r,900));}
    if(NET.lastRx>=t0){for(const e of G.ents)e.seenAt=Math.min(e.seenAt,NET.lastSnapT||0);NET.recon=false;NET.gen=Math.max(NET.gen||0,gen);pushLog(gen>(NET.gen0||0)?'Connected to the new host.':'Reconnected to the host.','g');return;}}
  NET.recon=false;if(MODE==='client')oppLeft();}
async function joinGame(p){if(NET.game)return;const code=p.presence.g.c;$('mpstatus').textContent='Joining…';
  try{NET.game=await NET.room.join('tc-'+code);}catch(e){$('mpstatus').textContent=window.WW3_P2P?'No open game with code '+code.toUpperCase()+' was found. Check the code and make sure the host still has the lobby open.':'Could not join that game.';NET.game=null;return;}
  NET.hostPeer=p.peer;NET.code='join';NET.jcode=code;NET.baseCode=code;NET.gen=0;NET.via=NET.game.via||null;NET.tok=joinTok(code);NET.lastRx=0;wireClient(NET.game);NET.cq=[];NET.cs=Math.floor(Date.now()/10);
  clearInterval(NET.pingI);NET.pingI=setInterval(()=>{if(!NET.game&&!NET.recon){clearInterval(NET.pingI);return;}if(MODE==='client'&&!NET.recon&&NET.lastRx&&performance.now()-NET.lastRx>5000){clientReconnect();return;}if(NET.game)NET.game.presence({pg:Date.now(),pi:NET.ping?Math.round(NET.ping):null}).catch(()=>{});},1000);
  let n=0;const hello=()=>{if(MODE!=='single'){clearInterval(NET.helloI);return;}if(n++>12&&!/Joined/.test($('mpstatus').textContent)){clearInterval(NET.helloI);$('mpstatus').textContent='The host did not answer. The game may have already started.';leaveNet();return;}if(n>14&&n%3)return;if(!NET.myPeer){const me=NET.game.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}NET.game.presence({hi:{f:setup.p,n:n,tok:NET.tok,ed:NET.canEmit===false?0:1}}).catch(()=>{});if(NET.canEmit!==false)NET.game.emit('hello',{f:setup.p}).catch(e=>{if(e&&e.code==='not_permitted')NET.canEmit=false;});};
  hello();NET.helloI=setInterval(hello,1500);$('mpstatus').textContent='Connecting to the host…';}
function leaveNet(){clearInterval(NET.helloI);clearInterval(NET.pingI);NET.ping=0;NET.pings={};if(NET.game)NET.game.leave().catch(()=>{});NET.game=null;NET.code=null;NET.opp=null;NET.hostPeer=null;NET.lobby=[];NET.peers=null;if(NET.room)NET.room.presence({g:null}).catch(()=>{});$('host').hidden=false;$('cancelHost').hidden=true;}
function oppLeft(){if(!G||G.over)return;pushLog('The host left the game.','w');showEnd(-1,'The host left the game, so the battle has ended.');}
const CMD_T=['go','atk','atkOil','fld','q','dq','bld','bldGo','tun','unl','board','up','sup','buy','pow','rally','stop','gar','atkCiv','ungar','give','def','line','ret'];
function cleanCmd(a){if(!a||typeof a!=='object'||!CMD_T.includes(a.t))return null;const o={t:a.t};const num=v=>typeof v==='number'&&isFinite(v)?v:0;
  if(Array.isArray(a.ids))o.ids=a.ids.slice(0,300).map(v=>num(v)|0);o.x=Math.max(0,Math.min(MAPW,num(a.x)));o.y=Math.max(0,Math.min(MAPH,num(a.y)));o.tid=num(a.tid)|0;o.fi=num(a.fi)|0;o.dz=num(a.dz)|0;o.ci=Math.max(0,num(a.ci)|0);o.to=Math.max(0,num(a.to)|0);o.amt=Math.max(0,Math.min(1e6,num(a.amt)));
  if(typeof a.k==='string'&&a.k.length<20)o.k=a.k;o.mode=a.mode==='amove'?'amove':'move';o.fm=a.fm?1:0;o.q=a.q?1:0;o.x2=Math.max(0,Math.min(MAPW,num(a.x2)));o.y2=Math.max(0,Math.min(MAPH,num(a.y2)));return o;}
const NET_PV=2;
// a keep-alive list named units this client doesn't have (a missed update): ask the host for a full copy (at most every 2 s)
function askKeyframe(){const w=performance.now();if(NET.krW&&w-NET.krW<2000)return;NET.krW=w;if(NET.game)NET.game.presence({kr:Math.round(w)}).catch(()=>{});}
function doAct(a){if(MODE==='client'){if(!NET.game)return;
    // orders travel in this player's presence (any invited player may set it): a rolling, numbered queue the host
    // reads and de-duplicates, trimmed to the presence size limit
    NET.cq=NET.cq||[];NET.cs=(NET.cs||0)+1;NET.cq.push({s:NET.cs,a});while(NET.cq.length>14||(NET.cq.length>1&&JSON.stringify(NET.cq).length>3300))NET.cq.shift();
    NET.game.presence({cq:NET.cq}).catch(()=>{});}else act(ME,a);}

/* ---------- host: send ---------- */
function encEnt(e,mem){let f=0,x=0;if(e.isB){if(e.built<1){f|=FLG.built;x=Math.round(e.built*100);}if(e.dis>G.t)f|=FLG.dis;if(e.charge)f|=FLG.chg;if(e.kind==='uplink'){x=Math.round(G.teams[e.team].charge/G.teams[e.team].sup.charge*100);}if(e.kind==='garrison'&&e.civ){x=e.civ.occ.length*16+e.civ.cap;}if(e.kind==='factory'&&G.teams[e.team].q.factory.length)f|=FLG.busy;if(mem)f|=FLG.mem;if(e.nd&&e.built<1)f|=FLG.nd;if(e.stall&&e.built<1)f|=FLG.stall;}
  else{if(e.cargo)f|=FLG.cargo;if(e.hacking)f|=FLG.hack;if(e.planting)f|=FLG.plant;if(e.landed)f|=FLG.land;if(e.hid)f|=FLG.hid;if(G.t-(e.mv||-9)<.25)f|=FLG.mov;if(e.building)f|=FLG.busy;if((e.supp||0)>.5)f|=FLG.supp;if(e.rout>G.t)f|=FLG.rout;else if(e.s&&canRout(e)&&(e.fear||0)>courageOf(e)*.65)f|=FLG.shak;if(e.mark>G.t)f|=FLG.mark;if(e.last>G.t)f|=FLG.last;if(e.aband)f|=FLG.aband;f|=(e.rank||0)<<9;{const m=moraleOf(e);x=m?(m.st==='fearless'?101:Math.round(m.v*20)*5):-1;}}
  return[e.id,KINDS.indexOf(e.kind),e.team,Math.round(e.x),Math.round(e.y),Math.round((e.va||0)*100),Math.round((e.tang||0)*100),Math.round(e.hp),Math.round(e.max),f,x];}
function sendSnap(key,to,items,bit){NET.sc=NET.sc||{};NET.kf=NET.kf||{};NET.kt=NET.kt||{};const full=!(NET.kf[key]>G.t);if(full)NET.kf[key]=G.t+(bit?4+((key|0)%8)*.25:2);let c=NET.sc[key];if(!c||full)c=NET.sc[key]=new Map();
  // the keep-alive list (ids of unchanged entities) only needs to beat the client's expiry, so it goes out every 0.5 s, not every tick
  const sendKeep=full||!(NET.kt[key]>G.t);if(sendKeep)NET.kt[key]=G.t+(bit?.4:0);
  const ch=[],keep=[],seen=new Set();for(const a of items){seen.add(a[0]);const s=a.join(',');if(c.get(a[0])===s){if(sendKeep){if(bit)keep.push(a[0]);else keep.push(a[0],a[11]|a[12]);}}else{c.set(a[0],s);ch.push(a);}}
  for(const id of c.keys())if(!seen.has(id))c.delete(id);
  const base={t:+G.t.toFixed(2),iv:+NET.snapT.toFixed(2)};if(to)base.to=to;if(full)base.f=1;
  if(ch.length||!keep.length&&sendKeep)sendChunks('snap',base,ch);const per=bit?1400:700;for(let i=0;i<keep.length;i+=per)NET.game.emit('snap',Object.assign({},base,{e:[],k:keep.slice(i,i+per)},bit?{kb:1}:{})).catch(()=>{});}
// P2P: one copy per player, so the two visibility masks are folded into that player's 'remembered' flag and dropped
function forPlayer(items,k){const b=1<<k,out=[];for(const a of items){if(!((a[11]|a[12])&b))continue;const c=a.slice(0,11);c[9]=(a[11]&b)?(c[9]&~FLG.mem):(c[9]|FLG.mem);out.push(c);}return out;}
function sendChunks(topic,base,items){let cur=[],len=0;const flush=()=>{if(cur.length){NET.game.emit(topic,{...base,e:cur}).catch(()=>{});cur=[];len=0;}};
  for(const it of items){const s=JSON.stringify(it).length+1;if(len+s>3500)flush();cur.push(it);len+=s;}flush();}
function teamMsg(T){const q={};for(const c of CATS)q[c]=T.q[c].map(i=>[i.kind,+(i.t/prodTime(T,stats(T.fac,i.kind))).toFixed(2)]);const rq={};for(const c in T.rq)if(T.rq[c])rq[c]=[T.rq[c].key,+(T.rq[c].t/UPG[T.rq[c].key].time).toFixed(2)];
  const pw={};for(const k in T.pw)pw[k]=[Math.ceil(T.pw[k].cd),T.pw[k].lv||1];
  return{c:Math.floor(T.credits),q,rq,u:Object.keys(T.upg),ch:+T.charge.toFixed(1),gx:T.gxp,rk:T.rank,sp:T.spent,pw,rv:T.reveals.map(r=>[r.x|0,r.y|0,r.r,+r.t.toFixed(1)]),rl:T.rally?[T.rally.x|0,T.rally.y|0]:null,fa:G.fields.map(f=>f.amt|0),oil:G.oil.map(o=>[o.owner,o.cp.map(v=>+v.toFixed(1)),o.dead?1:0,Math.round(o.hp)]),out:G.teams.map(O=>O.out?1:0),tn:T.tun.length,tk:tunKinds(T),ac:G.teams.filter(O=>O.id!==T.id&&ally(O.id,T.id)).map(O=>[O.id,Math.floor(O.credits)]),wx:G.wx?G.wx.k:'clear',mg:NET.gen||0,mn:(G.mines||[]).filter(m=>m.team===T.id).map(m=>[m.x,m.y]),gt:+G.t.toFixed(2),ak:NET.cseq&&NET.peers[T.id]?Math.min(NET.cseq[NET.peers[T.id]]|0,NET.ckAk?NET.ckAk[T.id]|0:0):0,to:NET.peers[T.id]};}
function netTick(dt){if(MODE!=='host'||!NET.game||!G||!NET.peers)return;discTick();NET.snapT-=dt;NET.evT-=dt;NET.teamT-=dt;NET.bT-=dt;const live=[];for(let k=0;k<NET.peers.length;k++)if(k!==ME&&NET.peers[k]&&!G.teams[k].ai)live.push(k);if(!live.length){if(G.out.length>400)G.out.length=0;return;}try{ckTick(dt,live);}catch(e){}
  // The room allows each sender about 40 messages a second, so with many players the host BROADCASTS one snapshot and
  // one event stream to everyone (each entity tagged with which players can see it, each client keeps only its own)
  // instead of one copy per player; team panels go out round-robin.
  // Delta snapshots: an entity whose state has not changed since the last copy that player got is listed only by id
  // (keeps it alive on their screen); full copies go out only for what changed, plus a full keyframe every 2 s that
  // also repairs anything a dropped message missed. Typical armies are mostly idle, so this cuts traffic several-fold.
  if(NET.snapT<=0){const items=[],SK=window.WW3_P2P?(NET.sk=NET.sk||new Map()):null;
    for(const e of G.ents){if(e.dead)continue;let vm=0,mm=0;for(const k of live){const v=e.team===k||(e.vs&&e.vs[k]);if(e.isB){if(v)vm|=1<<k;else if((e.sn|0)&(1<<k))mm|=1<<k;}else if(v)vm|=1<<k;}
      if(!vm&&!mm)continue;if(SK)skNote(SK,e,vm,mm,live);const a=encEnt(e,false);a.push(vm,mm);items.push(a);}
    NET.snapT=window.WW3_P2P?.1:Math.max(.2,Math.min(.6,Math.ceil(items.length/150)*.1));
    if(window.WW3_P2P){for(const k of live){const to=NET.peers[k];if(NET.game.buffered&&NET.game.buffered(to)>48000)continue;sendSnap(k,to,forPlayer(items,k),1<<k);(NET.snapTo=NET.snapTo||[])[k]=G.t;}}else sendSnap('all',null,items);}
  if(NET.evT<=0){NET.evT=.15;let evs=G.out;G.out=[];
    // P2P: one filtered stream per player (sendEvtP2P); room mode: one broadcast stream as before
    if(window.WW3_P2P)sendEvtP2P(evs,live);else if(evs.length){let len=JSON.stringify(evs).length;if(len>3400){const imp=evs.filter(v=>v[0]!=='muz'&&v[0]!=='tr');const lo=evs.filter(v=>v[0]==='muz'||v[0]==='tr');evs=imp;len=JSON.stringify(evs).length;for(const v of lo){const s=JSON.stringify(v).length+1;if(len+s>3400)break;evs.push(v);len+=s;}}
    if(JSON.stringify(evs).length>3400)sendChunks('evt',{},evs);else if(evs.length)NET.game.emit('evt',{e:evs}).catch(()=>{});}}
  if(NET.teamT<=0){NET.teamT=.25;const per=window.WW3_P2P?live.length:Math.min(live.length,3);NET.trr=NET.trr||0;for(let n=0;n<per;n++){const k=live[(NET.trr++)%live.length];NET.game.emit('team',teamMsg(G.teams[k])).catch(()=>{});}}}

/* ---------- host: per-player event streams (P2P only) ----------
   In P2P every player is sent their own copy of the event stream anyway, so each copy carries only what that player
   could perceive: effects inside their own or an ally's vision, messages addressed to them, their side's general's
   powers, and the few global announcements. Fights in the fog no longer reach (or give away) anyone who cannot see
   them. Vision is a coarse grid of team bitmasks rebuilt at each 0.15 s flush from the same sources as updateVis:
   every unit's and building's sight radius (shared with allies), each team's own reveals, plus the cell of anything a
   team currently sees (counter-battery reveals and the like). One lookup answers for all players at once. */
const VG={c:64,w:0,h:0,a:null,t:-1,AM:[]};
function visGrid(){if(VG.t===G.t&&VG.a)return;const c=VG.c,w=Math.ceil(MAPW/c)+1,h=Math.ceil(MAPH/c)+1,N=G.teams.length;
  if(!VG.a||VG.w!==w||VG.h!==h){VG.a=new Uint8Array(w*h);VG.w=w;VG.h=h;}else VG.a.fill(0);const a=VG.a,AM=VG.AM;AM.length=N;
  for(let i=0;i<N;i++){let m=0;for(let j=0;j<N;j++)if(ally(i,j))m|=1<<j;AM[i]=m;}
  // a cell counts as seen when its centre is within sight radius + half a cell (the client's own fog hole is drawn 8%
  // wider than the sight radius with a soft edge, so this matches what the player actually sees within a few metres)
  const disc=(x,y,R,m)=>{if(!m||!(R>0))return;const R2=(R+c*.5)**2,x0=Math.max(0,Math.floor((x-R)/c)),x1=Math.min(w-1,Math.floor((x+R)/c)),y0=Math.max(0,Math.floor((y-R)/c)),y1=Math.min(h-1,Math.floor((y+R)/c));
    for(let cy=y0;cy<=y1;cy++){const dy=(cy+.5)*c-y,dy2=dy*dy;if(dy2>R2)continue;const row=cy*w;for(let cx=x0;cx<=x1;cx++){const dx=(cx+.5)*c-x;if(dx*dx+dy2<=R2)a[row+cx]|=m;}}};
  for(const e of G.ents){if(e.dead||!(e.team>=0&&e.team<N))continue;disc(e.x,e.y,e._vr||visR(e),AM[e.team]);
    if(e.vs){let m=0;for(let k=0;k<N;k++)if(e.vs[k])m|=1<<k;const cx=Math.floor(e.x/c),cy=Math.floor(e.y/c);if(m&&cx>=0&&cy>=0&&cx<w&&cy<h)a[cy*w+cx]|=m;}}
  for(const T of G.teams)for(const r of T.reveals||[])disc(r.x,r.y,r.r,1<<T.id);VG.t=G.t;}
// bitmask of the teams that see any part of the circle (x,y,m)
function visAt(x,y,m){const c=VG.c,w=VG.w,h=VG.h,a=VG.a,cx=Math.floor(x/c),cy=Math.floor(y/c);
  if(!(m>c*.5))return cx>=0&&cy>=0&&cx<w&&cy<h?a[cy*w+cx]:0;
  const r=Math.ceil(m/c),M2=(m+c*.5)**2;let o=0;
  for(let j=Math.max(0,cy-r),j1=Math.min(h-1,cy+r);j<=j1;j++)for(let i=Math.max(0,cx-r),i1=Math.min(w-1,cx+r);i<=i1;i++){const dx=(i+.5)*c-x,dy=(j+.5)*c-y;if(dx*dx+dy*dy<=M2)o|=a[j*w+i];}return o;}
// who gets each kind of event (v = [type,...FXH args]); anything not listed (end, elim, oilDry, new types) goes to all
function evWho(v){const AM=VG.AM,own=v.own!=null?AM[v.own]|0:0;
  switch(v[0]){
    case 'muz':return visAt(v[1],v[2],v[5]>=13?60:20);                     // gun position; big guns throw smoke and dust
    case 'tr':case 'pj':return visAt(v[1],v[2],16)|visAt(v[4],v[5],16);     // either end in sight: you see it fly in/out
    case 'salvo':return visAt(v[1],v[2],30)|visAt(v[4],v[5],60);
    case 'boom':return own|visAt(v[1],v[2],Math.min(400,20+(+v[3]||0)*(v[4]?2.5:1.5)));  // fireball, smoke column and flash reach past the fog edge
    case 'hack':return visAt(v[1],v[2],40);
    case 'ping':case 'heal':case 'smoke':return own|visAt(v[1],v[2],+v[3]||0);
    case 'strike':return v[5]?255:own|visAt(v[1],v[2],(+v[4]||0)+40);      // superweapon-class warnings are global (alarm + "inbound" log)
    case 'bmis':return visAt(v[1],v[2],120);                                 // only where the launch is seen: never hands out the silo's position
    case 'plane':{const sx=v[1],sy=v[2],tx=v[3],ty=v[4],L=Math.hypot(tx-sx,ty-sy)||1,E=L*6/2.6,n=Math.min(24,Math.ceil(E/200));let m=AM[v[5]]|0;
      for(let i=0;i<=n;i++){const u=i/n*E/L;m|=visAt(sx+(tx-sx)*u,sy+(ty-sy)*u,150);}return m;}   // its whole flight path
    case 'toss':{const e=G.byId.get(v[1]);if(!e||e.dead||!e.vs)return 0;let m=AM[e.team]|0;for(let k=0;k<e.vs.length;k++)if(e.vs[k])m|=1<<k;return m;}
    case 'txt':{const t=v[4],w=v[5];let m=(t>=0?1<<t:0)|(w>=0?1<<w:0);if(w===-2)m|=(AM[t]|0)|visAt(v[1],v[2],0);return m;}
    case 'log':return v[1]>=0?1<<v[1]:0;
    case 'give':return (1<<v[1])|(1<<v[2]);
    default:return 255;}}
// what each player was last sent of an entity: r.t[k] = when it was last in k's snapshot as visible, r.m = players
// that hold it as a remembered (fogged) building
function skNote(SK,e,vm,mm,live){let r=SK.get(e.id);if(!r)SK.set(e.id,r={t:[],m:0,s:0});for(const k of live)if(vm&(1<<k))r.t[k]=G.t;r.m|=mm;r.s=G.t;}
// 'die' goes to everyone who sees the spot, and to anyone who may still have that entity on screen. A client drops a
// unit after ~0.9 s of snapshots without it (clientTick ttl; unchanged units are only refreshed by the 0.4 s keep-alive
// list), so a unit that was in a player's snapshots within 1.6 s of the latest one they were sent is still there
// (snapshots skipped for a congested link count as 'still there'; 8.5 s covers the client's absolute expiry). A
// remembered building never expires on the client, so if it dies out of sight it is queued as a silent 'gone'.
function dieWho(v,live){const id=v[1],x=v[2],y=v[3],ki=v[4],isB=v[5];let m=visAt(x,y,isB?120:30);const r=NET.sk&&NET.sk.get(id);
  if(r){NET.sk.delete(id);const st=NET.snapTo||[];for(const k of live){const b=1<<k;if(m&b)continue;const t=r.t[k];
    if(t!=null&&(st[k]||0)-t<=1.6&&G.t-t<=8.5)m|=b;
    else if(isB&&(r.m&b)){const q=NET.gq[k]=NET.gq[k]||[];q.push([id,x,y,ki]);if(q.length>300)q.shift();}}}
  return m;}
// a city block collapsing changes the map (passability, cover), so every player must get it eventually: now if they see
// it, otherwise quietly (no explosion) once they do
function civWho(v,live){const c=G.civ&&G.civ[v[1]];if(!c)return 255;const m=visAt(c.x,c.y,60);for(const k of live)if(!(m&(1<<k)))(NET.civQ[k]=NET.civQ[k]||[]).push(v[1]);return m;}
function sendEvtP2P(evs,live){const gq=NET.gq=NET.gq||[],vq=NET.civQ=NET.civQ||[];let lm=0,pend=evs.length;
  for(const k of live){lm|=1<<k;pend+=(gq[k]||[]).length+(vq[k]||[]).length;}if(!pend)return;
  visGrid();const per=[];for(const k of live)per[k]=[];
  for(const v of evs){if(!Array.isArray(v))continue;const m=(v[0]==='die'?dieWho(v,live):v[0]==='civd'?civWho(v,live):evWho(v))&lm;if(!m)continue;
    const s=JSON.stringify(v);for(const k of live)if(m&(1<<k))per[k].push([v,s]);}
  for(const k of live){const b=1<<k,L=per[k],add=v=>L.push([v,JSON.stringify(v)]);
    if(gq[k]&&gq[k].length)gq[k]=gq[k].filter(g=>{if(!(visAt(g[1],g[2],40)&b))return true;add(['gone',...g]);return false;});
    if(vq[k]&&vq[k].length)vq[k]=vq[k].filter(i=>{const c=G.civ&&G.civ[i];if(!c)return false;if(!(visAt(c.x,c.y,60)&b))return true;add(['civd',i,1]);return false;});
    if(!L.length)continue;const to=NET.peers[k];
    // same budget per player as the broadcast had: ~3.4 KB per 0.15 s, muzzle flashes and tracers dropped first
    let len=1;for(const x of L)len+=x[1].length+1;let out=L;
    if(len>3400){out=[];len=1;const lo=[];for(const x of L){if(x[0][0]==='muz'||x[0][0]==='tr')lo.push(x);else{out.push(x);len+=x[1].length+1;}}
      for(const x of lo){if(len+x[1].length+1>3400)break;out.push(x);len+=x[1].length+1;}}
    const e=out.map(x=>x[0]);if(len>3400)sendChunks('evt',{to},e);else NET.game.emit('evt',{e,to}).catch(()=>{});}
  if(NET.sk&&!(NET.skP>G.t)){NET.skP=G.t+5;for(const [id,r] of NET.sk)if(G.t-r.s>15&&!G.byId.has(id))NET.sk.delete(id);}}

/* ---------- client: receive ---------- */
function applySnap(d){if(!G||!Array.isArray(d.e))return;const now=G.t;if(typeof d.t==='number'){if(d.t+1e-6<(NET.lastSnapT||0)&&!d.f)return;NET.lastSnapT=Math.max(NET.lastSnapT||0,d.t);}if(d.iv>0)NET.iv=Math.min(3,+d.iv);
  const st=typeof d.t==='number'?d.t:(NET.lastSnapT||0);
  // arrival-interval estimate (for smooth interpolation): only between consecutive host ticks
  {const w=performance.now()/1000;if(!(d.e.length===0&&d.k)&&st>(NET.prevT||0)){if(NET.rxW&&st-(NET.prevT||0)<=1.5*Math.max(.1,NET.iv||.1)){const gap=Math.min(1.5,w-NET.rxW);if(gap>.02)NET.ia=NET.ia?NET.ia*.85+gap*.15:gap;}NET.rxW=w;NET.prevT=st;}}
  if(Array.isArray(d.k)&&d.kb){let miss=0;for(const id of d.k){const e=G.byId.get(id);if(e){e.seenAt=st;e.seenL=now;}else miss++;}if(miss)askKeyframe();}
  else if(Array.isArray(d.k)){const b=1<<ME;for(let i=0;i+1<d.k.length;i+=2){if(!((d.k[i+1]|0)&b))continue;const e=G.byId.get(d.k[i]);if(e){e.seenAt=st;e.seenL=now;}}}
  for(const a of d.e){if(!Array.isArray(a)||a.length<11)continue;if(a.length>=13){const b=1<<ME;if(!(a[11]&b)&&!(a[12]&b))continue;a[9]=(a[11]&b)?(a[9]&~FLG.mem):(a[9]|FLG.mem);}const [id,ki,team,x,y,va,ta,hp,mx_,f,ex]=a;const kind=KINDS[ki];if(!kind||!(team>=0&&team<G.teams.length))continue;
    let e=G.byId.get(id);const isB=!!STRUCT[kind];
    if(!e){const T=G.teams[team];const s=isB?bstats(T.fac,kind):stats(T.fac,kind);e={id,isB,team,kind,s,x,y,va:va/100,tang:ta/100,hp,max:mx_,r:isB?s.size/2:s.r,size:isB?s.size:0,vs:new Array(G.teams.length).fill(true),fx:x,fy:y,tx:x,ty:y,it:1};G.ents.push(e);G.byId.set(id,e);}
    else{e.fx=e.x;e.fy=e.y;e.tx=x;e.ty=y;e.it=0;if(e.team!==team&&!isB){e.team=team;const T=G.teams[team];try{e.s=stats(T.fac,kind);}catch(err){}}}
    e.tva=va/100;e.tta=ta/100;e.hp=hp;e.max=mx_;e.seenAt=st;e.seenL=now;e.ut=st;e.vis=true;
    if(isB){e.built=f&FLG.built?ex/100:1;e.disv=!!(f&FLG.dis);e.dis=0;e.chv=!!(f&FLG.chg);e.mem=!!(f&FLG.mem);e.busy=!!(f&FLG.busy);e.nd=!!(f&FLG.nd);e.stall=!!(f&FLG.stall);if(kind==='uplink')e.chg=ex/100;if(kind==='garrison'){e.occN=ex>>4;e.capN=ex&15;e.built=1;}e.ang=e.tta;e.x=x;e.y=y;}
    else{e.cargo=f&FLG.cargo?1:0;e.hacking=!!(f&FLG.hack);e.planting=!!(f&FLG.plant);e.landed=!!(f&FLG.land);e.hid=!!(f&FLG.hid);e.mvC=f&FLG.mov?1:0;e.building=!!(f&FLG.busy);e.supp=f&FLG.supp?1:0;e.routV=!!(f&FLG.rout);e.shakV=!!(f&FLG.shak);e.markV=!!(f&FLG.mark);e.lastV=!!(f&FLG.last);e.aband=f&FLG.aband?1:0;e.rank=(f>>9)&3;e.mor=ex;}}}
function clientTick(dt){G.t+=dt;const now=G.t;
  const P=Math.max(.1,Math.min(.6,Math.max(NET.iv||.1,(NET.ia||NET.iv||.2)*1.15)));
  for(const e of G.ents){if(e.isB)continue;const it=(e.it||0)+dt/P;e.it=it;if(it<=1){e.x=e.fx+(e.tx-e.fx)*it;e.y=e.fy+(e.ty-e.fy)*it;}else if(e.mvC&&e.ut===NET.lastSnapT){const o=Math.min(it-1,.25/P);e.x=e.tx+(e.tx-e.fx)*o;e.y=e.ty+(e.ty-e.fy)*o;}else{e.x=e.tx;e.y=e.ty;}e.va=lerpA(e.va,e.tva,dt*10);e.tang=lerpA(e.tang,e.tta,dt*10);if(e.mvC)e.mv=now;}
  const ttl=Math.max(.9,(NET.iv||.2)*2.6),ref=NET.lastSnapT||0;for(const e of G.ents){const sl=now-(e.seenL==null?now:e.seenL);if(e.isB){if(!e.mem&&(ref-e.seenAt>Math.max(3.2,ttl*2)||sl>12))e.gone=true;}else if(ref-e.seenAt>ttl||sl>8)e.gone=true;}
  if(G.ents.some(e=>e.gone)){for(const e of G.ents)if(e.gone){G.byId.delete(e.id);}G.ents=G.ents.filter(e=>!e.gone);G.sel=G.sel.filter(e=>!e.gone);}}
function applyEvents(d){if(!d||!Array.isArray(d.e))return;for(const v of d.e){if(!Array.isArray(v))continue;const [type,...args]=v;if(!FXH[type]||type==='end'&&false)continue;
  if(type==='die'||type==='gone'){const e=G.byId.get(args[0]);if(e){e.dead=true;G.byId.delete(e.id);G.ents=G.ents.filter(x=>x!==e);G.sel=G.sel.filter(x=>x!==e);}}
  if(type==='log'&&args[0]!==ME)continue;try{FXH[type](...args);}catch(e){}}}
function applyTeam(d){if(!G||!d)return;if(typeof d.ak==='number'&&NET.cq&&NET.cq.length&&NET.cq[0].s<=d.ak){NET.cq=NET.cq.filter(c=>c.s>d.ak);if(NET.game)NET.game.presence({cq:NET.cq}).catch(()=>{});}if(typeof d.mg==='number')NET.gen=Math.max(NET.gen||0,d.mg|0);const T=G.teams[ME];T.credits=d.c|0;for(const c of CATS)T.q[c]=(d.q&&d.q[c]||[]).map(([k,p])=>({kind:k,t:p*prodTime(T,stats(T.fac,k)),p}));
  T.rq={};for(const c in (d.rq||{})){const [k,p]=d.rq[c];if(UPG[k])T.rq[c]={key:k,t:p*UPG[k].time};}T.upg={};for(const k of d.u||[])if(UPG[k])T.upg[k]=true;T.charge=+d.ch||0;T.tunN=d.tn|0;if(Array.isArray(d.ac))for(const [i,c] of d.ac)if(G.teams[i])G.teams[i].credits=+c||0;T.tunK=d.tk&&typeof d.tk==='object'?d.tk:{};if(WEATHER[d.wx]){G.wx=G.wx||{t:0,next:1e9};G.wx.k=d.wx;}if(Array.isArray(d.mn))G.mines=d.mn.map(([x,y])=>({x,y,team:ME,arm:0}));T.gxp=d.gx|0;T.rank=d.rk|0||1;T.spent=d.sp|0;
  T.pw={};for(const k in (d.pw||{}))if(POWERS[k]){const v=d.pw[k];T.pw[k]=Array.isArray(v)?{cd:+v[0]||0,lv:+v[1]||1}:{cd:+v||0,lv:1};}T.reveals=(d.rv||[]).map(([x,y,r,t])=>({x,y,r,t}));T.rally=d.rl?{x:d.rl[0],y:d.rl[1]}:null;
  if(Array.isArray(d.oil))d.oil.forEach((v,i)=>{const o=G.oil[i];if(o&&Array.isArray(v)){o.owner=v[0];if(Array.isArray(v[1]))o.cp=v[1].map(x=>+x||0);o.dead=!!v[2];o.hp=+v[3]||0;}});if(Array.isArray(d.out))d.out.forEach((x,i)=>{if(G.teams[i]&&x&&!G.teams[i].out){G.teams[i].out=true;if(i===ME)showElim();}});
  if(Array.isArray(d.fa))d.fa.forEach((a,i)=>{if(G.fields[i])G.fields[i].amt=a;});}
