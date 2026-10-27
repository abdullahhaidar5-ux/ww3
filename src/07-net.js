/* ================= MULTIPLAYER: lobby + host-authoritative sync over the artifact room ================= */
// Address of the World War 3 servers (server/ in the repo, Cloudflare), e.g. 'https://ww3-servers.<name>.workers.dev'.
// Empty = no servers: the online edition works exactly as before (public PeerJS broker, P2P only). Read by the
// online-edition shim in the page shell (game list, relay rooms, TURN logins); unused in the claude.ai artifact.
const WW3_SERVER_URL='https://ww3-servers.abdullah-haidar5.workers.dev';
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
async function renderGames(){if(!NET.room)return;const el=$('games');const all=NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.g&&(p.presence.g.s==='open'||p.presence.g.s==='full')&&FKEYS.includes(p.presence.g.f));
  // open lobbies first (fullest first, so games fill up), then battles already under way
  const ps=all.filter(p=>p.presence.g.s==='open').sort((x,y)=>(y.presence.g.n|0)-(x.presence.g.n|0)),busy=all.filter(p=>p.presence.g.s==='full');
  if(!all.length){el.innerHTML=`<div class="empty">${NET.code?'Your game is open. Waiting for players to join…':window.WW3_P2P?'No open games right now. Host one, or type a friend\'s game code below.':'No open games right now. Host one and share this game with a friend.'}</div>`;return;}
  let names={};try{if(NET.user){const ids=all.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  el.innerHTML='';const hd=document.createElement('div');hd.className='empty';hd.textContent=`${ps.length} open game${ps.length===1?'':'s'} · ${busy.length} battle${busy.length===1?'':'s'} in progress`;el.append(hd);
  for(const p of [...ps,...busy]){const g=p.presence.g,row=document.createElement('div');row.className='game';const nm=(p.by&&names[p.by]&&names[p.by].name)||(p.isMe?'You (other tab)':window.WW3_P2P&&g.c?'game '+String(g.c).toUpperCase():'A player');
    const info=document.createElement('div');const b=document.createElement('b');b.textContent=FACTIONS[g.f].name;const s=document.createElement('span');s.textContent=` · ${window.WW3_P2P?'':'hosted by '}${nm} · ${(MAPS[g.m]||MAPS.strait).name} · ${g.n||1}${g.s==='full'?'':'/'+(g.mx||8)} players`;info.append(b,s);
    const btn=document.createElement('button');btn.textContent=g.s==='full'?'In battle':'Join';btn.disabled=!!NET.code||g.s==='full';btn.onclick=()=>{initAudio();joinGame(p);};row.append(info,btn);el.append(row);}}
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
  NET.cseq=NET.cseq||{};const hostHello=(peer,by,f,tok)=>{if(MODE==='host'){hostRejoin(peer,tok);return;}if(MODE!=='single')return;const cf=FKEYS.includes(f)?f:'US';const m={peer,by};const p=NET.lobby.find(q=>q.peer===m.peer);if(p){p.f=cf;if(tok)p.tok=tok;}else{const mxS=(MAPS[setup.map]||MAPS.strait).max;NET.ais=NET.ais||[];if(NET.lobby.length+1+NET.ais.length>=mxS&&NET.ais.length)NET.ais.pop();if(NET.lobby.length>=mxS-1){NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer,full:1}).catch(()=>{});return;}NET.lobby.push({peer:m.peer,by:m.by,f:cf,tok:tok||null});}
    NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer}).catch(()=>{});renderLobby();};
  g.on('hello',m=>{if(m.sameTab)return;hostHello(m.peer,m.by,m.data&&m.data.f);});
  const hostCmd=(peer,data)=>{if(MODE!=='host')return;const ix=NET.peers?NET.peers.indexOf(peer):-1;if(ix<1)return;if(G&&G.teams[ix]&&G.teams[ix].out)return;const a=cleanCmd(data);if(a)act(ix,a);};
  g.on('cmd',m=>hostCmd(m.peer,m.data));
  g.onPeers(ch=>{for(const q of ch.joined.concat(ch.updated)){if(q.sameTab||!q.presence)continue;const pr=q.presence;(NET.seen=NET.seen||{})[q.peer]=performance.now();
      if(pr.hi&&pr.hi.ed!=null)(NET.edOf=NET.edOf||{})[q.peer]=pr.hi.ed?1:0;
      if(pr.ld!=null)(NET.ldOf=NET.ldOf||{})[q.peer]=pr.ld?1:0;
      // a player the heartbeat marked as gone (e.g. their PC stalled while loading) is linked back as soon as they are heard from again
      if(MODE==='host'&&NET.peers&&pr.hi&&typeof pr.hi.tok==='string'&&NET.peers.indexOf(q.peer)<0)hostRejoin(q.peer,pr.hi.tok.slice(0,16));
      if(pr.hi&&(MODE==='single'||MODE==='host')&&(NET.lastHi||{})[q.peer]!==pr.hi.n){(NET.lastHi=NET.lastHi||{})[q.peer]=pr.hi.n;hostHello(q.peer,q.by,pr.hi.f,typeof pr.hi.tok==='string'?pr.hi.tok.slice(0,16):null);}
      if(typeof pr.pg==='number'&&(NET.lastPg||{})[q.peer]!==pr.pg){(NET.lastPg=NET.lastPg||{})[q.peer]=pr.pg;NET.game.emit('pong',{to:q.peer,t:pr.pg}).catch(()=>{});if(typeof pr.pi==='number')(NET.pings=NET.pings||{})[q.peer]=pr.pi;}
      if(Array.isArray(pr.cq)&&MODE==='host'){let last=NET.cseq[q.peer]||0;for(const c of pr.cq){if(!c||typeof c.s!=='number'||c.s<=last)continue;last=c.s;hostCmd(q.peer,c.a);}NET.cseq[q.peer]=last;const ix=NET.peers?NET.peers.indexOf(q.peer):-1;if(ix>0)(NET.cseqSlot=NET.cseqSlot||[])[ix]=Math.max((NET.cseqSlot||[])[ix]|0,last);}
      if(typeof pr.kr==='number'&&MODE==='host'&&NET.peers&&(NET.lastKr||{})[q.peer]!==pr.kr){(NET.lastKr=NET.lastKr||{})[q.peer]=pr.kr;const ix=NET.peers.indexOf(q.peer);if(ix>0&&NET.kf)NET.kf[ix]=0;}}});
  g.onPeers(ch=>{for(const q of ch.left){if(MODE==='single'){NET.lobby=NET.lobby.filter(p=>p.peer!==q.peer);renderLobby();}else if(MODE==='host'&&NET.peers){const ix=NET.peers.indexOf(q.peer);if(ix>0){NET.peers[ix]=null;playerLeft(ix);}}}});
}
async function hostGame(){if(!NET.room||NET.code)return;NET.ais=[];const code=Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'a');NET.code=code;NET.baseCode=code;NET.gen=0;NET.lobby=[];$('host').hidden=true;$('cancelHost').hidden=false;
  $('mpstatus').textContent='Opening your game…';
  try{NET.game=await NET.room.join('tc-'+code);}catch(e){$('mpstatus').textContent=window.WW3_P2P?'Could not reach the online matchmaking service. Check your internet connection and try again.':'Could not open a game room. Try again in a moment.';cancelHost();return;}
  wireHost(NET.game);
  try{await NET.game.emit('lobby',{n:1,probe:1});}catch(e){if(e&&e.code==='not_permitted'){noPerm();cancelHost();return;}}
  await NET.room.presence({g:{c:code,f:setup.p,s:'open',n:1}}).catch(()=>{});renderLobby();renderGames();}
const TEAM_COL=['#7fb8e6','#ea5a40','#74d08f','#e3b341','#c58af0','#f08ab4','#6fe0d0','#c9c9c9'];
// Host lobby: game code and player count at the top, the Start button right under it, one row per seat (taken or
// open) with each player's nation and team, quick team presets, and the invite steps at the bottom.
async function renderLobby(){if(!NET.code||NET.code==='join'||MODE!=='single')return;const mx=(MAPS[setup.map]||MAPS.strait).max,mapN=(MAPS[setup.map]||MAPS.strait).name;
  NET.ais=NET.ais||[];if(NET.lobby.length+1+NET.ais.length>mx)NET.ais.splice(Math.max(0,mx-1-NET.lobby.length));
  if(NET.lobby.length+1>mx){const drop=NET.lobby.splice(mx-1);for(const p of drop)NET.game.emit('lobby',{n:0,to:p.peer,full:1}).catch(()=>{});}
  let names={};try{if(NET.user){const ids=NET.lobby.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  const nh=NET.lobby.length+1,nn=nh+NET.ais.length;NET.tm=(NET.tm||[]).slice(0,nh);while(NET.tm.length<nh)NET.tm.push(NET.tm.length%Math.max(2,nn));const tmAll=lobbyTeams();const teamsOk=new Set(tmAll).size>1;
  const E=(t,c,txt)=>{const d=document.createElement(t);if(c)d.className=c;if(txt!=null)d.textContent=txt;return d;};
  const el=$('mpstatus');el.innerHTML='';const L=E('div','lob');
  // header
  const hd=E('div','lobhd');const l=E('div');l.append(E('div','lobk','Your game · code'),E('div','lobcode',NET.code.toUpperCase()));
  const r=E('div','lobr');r.append(E('div','lobmap',mapN),E('div','lobn',`${nn} / ${mx} players`));const pips=E('div','pips');for(let i=0;i<mx;i++){const d=E('i');if(i<nn)d.className='on';pips.append(d);}r.append(pips);hd.append(l,r);L.append(hd);
  // start
  const sb=E('button','big startbtn',nn>=2?`▶ Start ${nn}-player battle`:'▶ Start battle');sb.disabled=nh<2||!teamsOk;sb.onclick=()=>launchMP();L.append(sb);
  L.append(E('div','lobwhy',nh<2?(NET.ais.length?'Waiting for at least one friend to join (to play only against the computer, use Deploy vs AI on the main menu).':'Waiting for at least one more player to join. You can also add computer players below.'):!teamsOk?'Everyone is on one team: put someone on another team to start.':'Everyone ready? Press Start. Players can still join until you do.'));
  // seats
  const sh=E('div','lobsec');sh.append(E('span','','Players'));const pre=E('span','presets');
  const pb=(lab,fn)=>{const b=E('button','chip',lab);b.onclick=()=>{NET.tm=NET.tm.map((_,i)=>fn(i));NET.ais.forEach((a,j)=>a.tm=fn(nh+j));renderLobby();};pre.append(b);};
  if(nn>=2){pb('Free for all',i=>i);pb('2 teams',i=>i%2);if(nn>=4)pb('You + allies vs rest',i=>i<Math.ceil(nn/2)?0:1);}sh.append(pre);L.append(sh);
  const seats=E('div','seats');
  const seat=(i,nm,f,host)=>{const row=E('div','seat');row.style.setProperty('--tc',TEAM_COL[NET.tm[i]%8]);row.append(E('span','sn',String(i+1)));const who=E('div','who');who.append(E('b','',nm));if(host)who.append(E('span','tag','host'));row.append(who);
    const fc=E('span','sfac');fc.append(E('span','fcode',f),E('span','fname',FACTIONS[f].name));row.append(fc);
    const s=document.createElement('select');s.setAttribute('aria-label','Team for '+nm);for(let t=0;t<Math.max(2,nn);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);s.append(o);}s.value=NET.tm[i];s.onchange=()=>{NET.tm[i]=+s.value;renderLobby();};row.append(s);seats.append(row);};
  seat(0,'You',setup.p,true);NET.lobby.forEach((p,k)=>seat(k+1,(p.by&&names[p.by]&&names[p.by].name)||'Player '+(k+2),p.f,false));
  // computer players: faction, difficulty and team are the host's to set; a joining human takes a computer seat if the map is full
  NET.ais.forEach((a,j)=>{const i=nh+j;const row=E('div','seat ai');row.style.setProperty('--tc',TEAM_COL[a.tm%8]);row.append(E('span','sn',String(i+1)));
    const who=E('div','who');const top=E('div','aitop');top.append(E('b','','Computer'),E('span','tag','AI'));const ctl=E('div','aictl');who.append(top,ctl);const ds=document.createElement('select');ds.setAttribute('aria-label','Difficulty of computer player '+(i+1));
    ['Easy','Normal','Hard'].forEach((n,d)=>{const o=document.createElement('option');o.value=d;o.textContent=n;ds.append(o);});ds.value=a.d;ds.onchange=()=>{a.d=+ds.value;};
    const x=E('button','seatx','✕');x.title='Remove this computer player';x.setAttribute('aria-label','Remove computer player '+(i+1));x.onclick=()=>{NET.ais.splice(j,1);renderLobby();};top.append(x);row.append(who);
    const fs=document.createElement('select');fs.className='sfacsel';fs.setAttribute('aria-label','Nation of computer player '+(i+1));for(const k of FKEYS){const o=document.createElement('option');o.value=k;o.textContent=FACTIONS[k].name;fs.append(o);}fs.value=a.f;fs.onchange=()=>{a.f=fs.value;};ctl.append(fs,ds);
    const ts=document.createElement('select');ts.setAttribute('aria-label','Team for computer player '+(i+1));for(let t=0;t<Math.max(2,nn);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);ts.append(o);}ts.value=a.tm;ts.onchange=()=>{a.tm=+ts.value;renderLobby();};row.append(ts);seats.append(row);});
  for(let i=nn;i<mx;i++){const row=E('div','seat open');row.append(E('span','sn',String(i+1)),E('div','who','Open seat · waiting for a player'));if(i===nn){const ab=E('button','chip addai','+ Add computer player');ab.onclick=()=>{const used=new Set([setup.p,...NET.lobby.map(p=>p.f),...NET.ais.map(a=>a.f)]);const f=FKEYS.find(k=>!used.has(k))||FKEYS[(Math.random()*FKEYS.length)|0];NET.ais.push({f,d:setup.d==null?1:setup.d,tm:nn%Math.max(2,nn+1)});renderLobby();};row.append(ab);}seats.append(row);}
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
function lobbyTeams(){const nh=NET.lobby.length+1;return [...(NET.tm||[]).slice(0,nh),...(NET.ais||[]).map(a=>a.tm|0)];}
function launchMP(){if(MODE!=='single'||!NET.lobby.length)return;const seed=(Math.random()*1e9)|0;const ais=(NET.ais||[]).slice(0,Math.max(0,(MAPS[setup.map]||MAPS.strait).max-1-NET.lobby.length)).map(a=>({f:FKEYS.includes(a.f)?a.f:FKEYS[0],d:Math.max(0,Math.min(2,a.d|0)),tm:Math.max(0,Math.min(7,a.tm|0))}));const facs=[setup.p,...NET.lobby.map(p=>p.f),...ais.map(a=>a.f)];NET.peers=[null,...NET.lobby.map(p=>p.peer),...ais.map(()=>null)];NET.toks=[null,...NET.lobby.map(p=>p.tok||null),...ais.map(()=>null)];
  const aiD=[null,...NET.lobby.map(()=>null),...ais.map(a=>a.d|0)];NET.opp=NET.peers[1];
  const map=setup.map||'strait';const tm=lobbyTeams().slice(0,facs.length);while(tm.length<facs.length)tm.push(tm.length);NET.lobby.forEach((p,i)=>NET.game.emit('start',{pv:NET_PV,seed,facs,slot:i+1,to:p.peer,map,tm,w:setup.w|0}).catch(()=>{}));NET.room.presence({g:{c:NET.code,f:setup.p,s:'full',n:facs.length,m:map}}).catch(()=>{});NET.startInfo={seed,facs,map,tm,w:setup.w|0};startMP('host',seed,facs,0,map,tm,aiD);}
// Joining: each player has a reconnect token for this game (kept for the browser tab), so if the link drops - or the
// page is reloaded - they rejoin as the same commander. Client handlers are wired by wireClient() so a reconnect can
// rebuild them on the new connection.
function joinTok(code){const k='ww3_tok_'+code;let t=null;try{t=sessionStorage.getItem(k);}catch(e){}if(!t){t=Math.random().toString(36).slice(2,12);try{sessionStorage.setItem(k,t);}catch(e){}}return t;}
function wireClient(g){
  g.on('hello',m=>{if(m.sameTab)NET.myPeer=m.peer;});
  g.on('lobby',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer&&MODE==='single'){if(m.data.full){clearInterval(NET.helloI);$('mpstatus').textContent='That game is full.';leaveNet();return;}$('mpstatus').textContent=`Joined${NET.via==='ws'?' (through the game server)':''}. ${m.data.n} players in the lobby. Waiting for the host to start the battle…`;}});
  g.on('start',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer||MODE!=='single')return;clearInterval(NET.helloI);const d=m.data;if((d.pv|0)!==NET_PV){$('mpstatus').textContent='You and the host have different versions of the game. Both of you: close the game and open it again to update, then rejoin.';leaveNet();return;}if(!Array.isArray(d.facs)||d.facs.length<2||d.facs.length>8||!d.facs.every(f=>FKEYS.includes(f)))return;const sl=d.slot|0;if(sl<1||sl>=d.facs.length)return;const map=MAPS[d.map]?d.map:'strait';const tm=Array.isArray(d.tm)&&d.tm.length===d.facs.length?d.tm.map(v=>Math.max(0,Math.min(7,v|0))):null;// the host's battle Conditions (light/weather look); Random (-1) resolves from the shared seed, so it matches too.
  // An old host sends no 'w': the player's own menu choice stays, as before.
  if(typeof d.w==='number'&&d.w>=-1&&d.w<WX.length){if(NET.ownW==null)NET.ownW=setup.w;wxSet(d.w|0);}
  NET.startW=performance.now();if(NET.game)NET.game.presence({ld:1}).catch(()=>{});startMP('client',d.seed|0,d.facs,sl,map,tm);});
  const ok=m=>m.peer===NET.hostPeer&&MODE==='client'&&(!m.data.to||m.data.to===NET.myPeer);
  g.on('snap',m=>{if(ok(m)){NET.lastRx=performance.now();applySnap(m.data);}});
  g.on('evt',m=>{if(ok(m)){NET.lastRx=performance.now();applyEvents(m.data);}});
  g.on('team',m=>{if(ok(m)){NET.lastRx=performance.now();applyTeam(m.data);}});
  g.on('b',m=>{if(!ok(m)||!Array.isArray(m.data.m))return;NET.lastRx=performance.now();for(const x of m.data.m){if(!Array.isArray(x))continue;const [t,d]=x;if(!d)continue;try{if(t==='snap')applySnap(d);else if(t==='evt')applyEvents(d);else if(t==='team')applyTeam(d);}catch(e){console.warn('bundle',t,e);}}});
  g.on('ck',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer)ckReceive(m.data);});
  g.on('pong',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer)return;const rtt=Date.now()-(+m.data.t||0);if(rtt>=0&&rtt<20000)NET.ping=NET.ping?NET.ping*.7+rtt*.3:rtt;});
  g.onPeers(ch=>{if(!NET.myPeer){const me=ch.peers.find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}if(NET.findHost){const h=ch.peers.find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}if(g===NET.game&&ch.left.some(q=>q.peer===NET.hostPeer)){if(MODE==='client')clientReconnect();else if(MODE==='single'&&NET.code==='join'){clearInterval(NET.helloI);$('mpstatus').textContent='The host closed the game.';leaveNet();}}});}
// Host lost: get back into the battle as fast as possible.
//  1. Rejoin the same room once (a short network blip: the host is still there).
//  2. If that fails, the standby player (holding a checkpoint) takes over at once (promoteToHost). Everyone else keeps
//     knocking on the follow-up room "<code>-m<gen+1>" every ~0.3 s until the new host opens it, instead of waiting a
//     fixed time and then going back to the dead old room. Only when the old room's answer was unclear (e.g. a
//     timeout rather than "nobody is hosting this") do we look back there now and then.
//  3. If the host of the room we just reached leaves while we wait for its first update, we stop waiting at once
//     (NET.reconKick) instead of sitting out the full wait.
function joinT(name,ms){const p=NET.room.join(name,NET.via?{via:NET.via}:undefined);let late=false;
  return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>{late=true;rej(Object.assign(new Error('timeout'),{type:'timeout'}));},ms))]).catch(e=>{if(late)p.then(g=>{try{g.leave().catch(()=>{});}catch(_){}},()=>{});throw e;});}
async function clientReconnect(){if(NET.recon){NET.reconKick=true;return;}if(!NET.jcode)return;NET.recon=true;NET.reconKick=false;pushLog('Connection to the host lost. Reconnecting…','w');
  const gen0=NET.gen||0,t0=performance.now(),slp=ms=>new Promise(r=>setTimeout(r,ms));let gone=false,n=0,newTries=0;
  while(MODE==='client'&&!(G&&G.over)&&performance.now()-t0<60000){
    if(n>0&&NET.isStandby&&NET.lastCk){const pr=await promoteToHost();if(pr===true){NET.recon=false;NET.reconKick=false;return;}if(pr!=='retry')NET.isStandby=false;}
    if(MODE!=='client'||(G&&G.over))break;
    // which room: the old one first; then the follow-up room (with an occasional look back at the old room while it
    // is not certain that its host is gone)
    const old=n===0||(!gone&&newTries>0&&newTries%4===0),gen=old?gen0:gen0+1,room=migRoom(gen);
    await slp(n===0?250:!old&&newTries===0?500:300);n++;if(!old)newTries++;if(MODE!=='client'||(G&&G.over))break;
    {const og=NET.game;NET.game=null;try{if(og)og.leave().catch(()=>{});}catch(e){}}
    let g=null;try{g=await joinT('tc-'+room,old?4000:6000);}catch(e){if(old&&e&&e.type==='peer-unavailable')gone=true;continue;}
    if(MODE!=='client'||(G&&G.over)){try{g.leave().catch(()=>{});}catch(e){}break;}
    NET.game=g;NET.myPeer=null;NET.reconKick=false;
    if(window.WW3_P2P)NET.hostPeer='ww3-'+room;else if(gen>0){NET.hostPeer=null;NET.findHost=true;}wireClient(g);
    if(NET.findHost){const h=g.peers().find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}
    NET.lastSnapT=0;NET.prevT=0;NET.rxW=0;NET.ia=0;NET.iaDev=0;const t1=performance.now();
    for(let k=0;k<24&&NET.lastRx<t1&&!NET.reconKick&&MODE==='client';k++){if(!NET.myPeer){const me=g.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}
      if(k%3===0)g.presence({hi:{f:setup.p,n:Date.now()%1e6,tok:NET.tok,ed:NET.canEmit===false?0:1},cq:NET.cq||[]}).catch(()=>{});await slp(300);}
    if(NET.lastRx>=t1&&!NET.reconKick){for(const e of G.ents)e.seenAt=Math.min(e.seenAt,NET.lastSnapT||0);NET.recon=false;NET.gen=Math.max(NET.gen||0,gen);pushLog(gen>(NET.gen0||0)?'Connected to the new host.':'Reconnected to the host.','g');return;}
    if(old&&NET.reconKick)gone=true;NET.reconKick=false;}
  NET.recon=false;NET.reconKick=false;if(MODE==='client')oppLeft();}
async function joinGame(p){if(NET.game)return;const code=p.presence.g.c;$('mpstatus').textContent='Joining…';
  try{NET.game=await NET.room.join('tc-'+code);}catch(e){$('mpstatus').textContent=window.WW3_P2P?'No open game with code '+code.toUpperCase()+' was found. Check the code and make sure the host still has the lobby open.':'Could not join that game.';NET.game=null;return;}
  NET.hostPeer=p.peer;NET.code='join';NET.jcode=code;NET.baseCode=code;NET.gen=0;NET.via=NET.game.via||null;NET.tok=joinTok(code);NET.lastRx=0;wireClient(NET.game);NET.cq=[];NET.cs=Math.floor(Date.now()/10);
  // keep-alive + 'host lost' watchdog. The watchdog counts from the last update, or from the end of this player's loading
  // screen / the battle start if none came yet (before, a player who had heard nothing since the start never noticed, so a
  // host that had given up on them left them on a frozen battle: no army, starting money). The loading flag (ld) tells
  // the host this player is busy loading, so it doesn't count the silence of a slow load as a dropped connection.
  clearInterval(NET.pingI);NET.pingI=setInterval(()=>{if(!NET.game&&!NET.recon){clearInterval(NET.pingI);return;}const w=performance.now(),ld=window.LOADING?1:0;if(ld)NET.ldW=w;
    if(MODE==='client'&&!NET.recon&&!ld&&w-Math.max(NET.lastRx||0,NET.ldW||0,NET.startW||0)>5000){clientReconnect();return;}if(NET.game)NET.game.presence({pg:Date.now(),pi:NET.ping?Math.round(NET.ping):null,ld}).catch(()=>{});},1000);
  let n=0;const hello=()=>{if(MODE!=='single'){clearInterval(NET.helloI);return;}if(n++>12&&!/Joined/.test($('mpstatus').textContent)){clearInterval(NET.helloI);$('mpstatus').textContent='The host did not answer. The game may have already started.';leaveNet();return;}if(n>14&&n%3)return;if(!NET.myPeer){const me=NET.game.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}NET.game.presence({hi:{f:setup.p,n:n,tok:NET.tok,ed:NET.canEmit===false?0:1}}).catch(()=>{});if(NET.canEmit!==false)NET.game.emit('hello',{f:setup.p}).catch(e=>{if(e&&e.code==='not_permitted')NET.canEmit=false;});};
  hello();NET.helloI=setInterval(hello,1500);$('mpstatus').textContent='Connecting to the host…';}
// Set the Conditions choice and light up its menu button. The host's choice is used only for that battle: the player's
// own menu choice (NET.ownW) comes back when they leave the battle, so their next solo battle uses their own Conditions.
function wxSet(w){setup.w=w;const W=$('wx');if(W)W.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.w===w));}
function leaveNet(){if(NET.ownW!=null){wxSet(NET.ownW);NET.ownW=null;}clearInterval(NET.helloI);clearInterval(NET.pingI);NET.ping=0;NET.pings={};if(NET.game)NET.game.leave().catch(()=>{});NET.game=null;NET.code=null;NET.opp=null;NET.hostPeer=null;NET.lobby=[];NET.peers=null;if(NET.room)NET.room.presence({g:null}).catch(()=>{});$('host').hidden=false;$('cancelHost').hidden=true;}
function oppLeft(){if(!G||G.over)return;pushLog('The host left the game.','w');showEnd(-1,'The host left the game, so the battle has ended.');}
// a keep-alive list named units this client doesn't have (a missed update): ask the host for a full copy (at most every 2 s)
function askKeyframe(){const w=performance.now();if(NET.krW&&w-NET.krW<2000)return;NET.krW=w;if(NET.game)NET.game.presence({kr:Math.round(w)}).catch(()=>{});}
function doAct(a){if(MODE==='client'){if(!NET.game)return;
    // orders travel in this player's presence (any invited player may set it): a rolling, numbered queue the host
    // reads and de-duplicates, trimmed to the presence size limit
    NET.cq=NET.cq||[];NET.cs=(NET.cs||0)+1;NET.cq.push({s:NET.cs,a});while(NET.cq.length>14||(NET.cq.length>1&&JSON.stringify(NET.cq).length>3300))NET.cq.shift();
    NET.game.presence({cq:NET.cq}).catch(()=>{});orderFeedback(a);}else act(ME,a);}
// Far from the host an order takes a round trip before units move, so on this screen they turn toward the destination at
// once (held until the host's own update can have arrived); the host's state takes over from there.
function orderFeedback(a){if(!G||!a||!Array.isArray(a.ids)||!(a.t==='go'||a.t==='line'))return;const until=G.t+Math.min(1.2,(NET.ping||250)/1000+.3);
  const n=a.ids.length;a.ids.forEach((id,i)=>{const e=G.byId.get(id);if(!e||e.team!==ME||e.isB)return;let tx=a.x,ty=a.y;if(a.t==='line'&&typeof a.x2==='number'&&n>1){const f=i/(n-1);tx=a.x+(a.x2-a.x)*f;ty=a.y+(a.y2-a.y)*f;}
    if(typeof tx!=='number'||typeof ty!=='number'||Math.hypot(tx-e.x,ty-e.y)<4)return;e.tva=Math.atan2(ty-e.y,tx-e.x);e.fbT=until;});}

/* ---------- client: receive ---------- */
function applySnap(d){if(!G||!Array.isArray(d.e))return;const now=G.t;if(typeof d.t==='number'){if(d.t+1e-6<(NET.lastSnapT||0)&&!d.f)return;NET.lastSnapT=Math.max(NET.lastSnapT||0,d.t);}if(d.iv>0)NET.iv=Math.min(3,+d.iv);
  const st=typeof d.t==='number'?d.t:(NET.lastSnapT||0);
  // arrival-interval estimate (for smooth interpolation): only between consecutive host ticks
  {const w=performance.now()/1000;if(!(d.e.length===0&&d.k)&&st>(NET.prevT||0)){if(NET.rxW&&st-(NET.prevT||0)<=1.5*Math.max(.1,NET.iv||.1)){const gap=Math.min(1.5,w-NET.rxW);if(gap>.02){NET.iaDev=NET.ia?(NET.iaDev||0)*.85+Math.abs(gap-NET.ia)*.15:0;NET.ia=NET.ia?NET.ia*.85+gap*.15:gap;}}NET.rxW=w;NET.prevT=st;}}
  if(Array.isArray(d.k)&&d.kb){let miss=0;for(const id of d.k){const e=G.byId.get(id);if(e){e.seenAt=st;e.seenL=now;}else miss++;}if(miss)askKeyframe();}
  else if(Array.isArray(d.k)){const b=1<<ME;for(let i=0;i+1<d.k.length;i+=2){if(!((d.k[i+1]|0)&b))continue;const e=G.byId.get(d.k[i]);if(e){e.seenAt=st;e.seenL=now;}}}
  if(Array.isArray(d.dr))for(const id of d.dr){const e=G.byId.get(id);if(e&&!e.dead)e.gone=true;}
  for(const a of d.e){if(!Array.isArray(a)||a.length<11)continue;if(a.length>=13){const b=1<<ME;if(!(a[11]&b)&&!(a[12]&b)){const o=G.byId.get(a[0]);if(o&&!o.dead)o.gone=true;continue;}a[9]=(a[11]&b)?(a[9]&~FLG.mem):(a[9]|FLG.mem);}const [id,ki,team,x,y,va,ta,hp,mx_,f,ex]=a;const kind=KINDS[ki];if(!kind||!(team>=0&&team<G.teams.length))continue;
    let e=G.byId.get(id);const isB=!!STRUCT[kind];
    if(!e){const T=G.teams[team];const s=isB?bstats(T.fac,kind):stats(T.fac,kind);e={id,isB,team,kind,s,x,y,va:va/100,tang:ta/100,hp,max:mx_,r:isB?s.size/2:s.r,size:isB?s.size:0,vs:new Array(G.teams.length).fill(true),fx:x,fy:y,tx:x,ty:y,it:1};G.ents.push(e);G.byId.set(id,e);}
    else{e.gone=false;e.fx=e.x;e.fy=e.y;e.tx=x;e.ty=y;e.it=0;if(e.team!==team&&!isB){e.team=team;const T=G.teams[team];try{e.s=stats(T.fac,kind);}catch(err){}}}
    if(!(e.fbT>G.t))e.tva=va/100;e.tta=ta/100;e.hp=hp;e.max=mx_;e.seenAt=st;e.seenL=now;e.ut=st;e.vis=true;
    if(isB){e.built=f&FLG.built?ex/100:1;e.disv=!!(f&FLG.dis);e.dis=0;e.chv=!!(f&FLG.chg);e.mem=!!(f&FLG.mem);e.busy=!!(f&FLG.busy);e.nd=!!(f&FLG.nd);e.stall=!!(f&FLG.stall);if(kind==='uplink')e.chg=ex/100;if(kind==='garrison'){e.occN=ex>>4;e.capN=ex&15;e.built=1;}e.ang=e.tta;e.x=x;e.y=y;}
    else{e.cargo=f&FLG.cargo?1:0;e.hacking=!!(f&FLG.hack);e.planting=!!(f&FLG.plant);e.landed=!!(f&FLG.land);e.hid=!!(f&FLG.hid);e.mvC=f&FLG.mov?1:0;e.building=!!(f&FLG.busy);e.supp=f&FLG.supp?1:0;e.routV=!!(f&FLG.rout);e.shakV=!!(f&FLG.shak);e.markV=!!(f&FLG.mark);e.lastV=!!(f&FLG.last);e.aband=f&FLG.aband?1:0;e.rank=(f>>9)&3;e.mor=ex;}}}
function clientTick(dt){G.t+=dt;const now=G.t;
  const P=Math.max(.1,Math.min(.6,Math.max(NET.iv||.1,(NET.ia||NET.iv||.2)+2*(NET.iaDev||0))));
  for(const e of G.ents){if(e.isB)continue;const it=(e.it||0)+dt/P;e.it=it;if(it<=1){e.x=e.fx+(e.tx-e.fx)*it;e.y=e.fy+(e.ty-e.fy)*it;}else if(e.mvC&&e.ut===NET.lastSnapT){const o=Math.min(it-1,.25/P);e.x=e.tx+(e.tx-e.fx)*o;e.y=e.ty+(e.ty-e.fy)*o;}else{e.x=e.tx;e.y=e.ty;}e.va=lerpA(e.va,e.tva,dt*10);e.tang=lerpA(e.tang,e.tta,dt*10);if(e.mvC)e.mv=now;}
  const ttl=Math.max(.9,(NET.iv||.2)*2.6),ref=NET.lastSnapT||0;for(const e of G.ents){const sl=now-(e.seenL==null?now:e.seenL);if(e.isB){if(!e.mem&&(ref-e.seenAt>Math.max(3.2,ttl*2)||sl>12))e.gone=true;}else if(ref-e.seenAt>ttl||sl>8)e.gone=true;}
  if(G.ents.some(e=>e.gone)){for(const e of G.ents)if(e.gone&&G.byId.get(e.id)===e){G.byId.delete(e.id);}G.ents=G.ents.filter(e=>!e.gone);G.sel=G.sel.filter(e=>!e.gone);}}
function applyEvents(d){if(!d||!Array.isArray(d.e))return;for(const v of d.e){if(!Array.isArray(v))continue;const [type,...args]=v;if(!FXH[type]||type==='end'&&false)continue;
  if(type==='die'||type==='gone'){const e=G.byId.get(args[0]);if(e){e.dead=true;e.gone=true;G.byId.delete(e.id);if(G.sel.includes(e))G.sel=G.sel.filter(x=>x!==e);}}
  if(type==='log'&&args[0]!==ME)continue;try{FXH[type](...args);}catch(e){}}}
function applyTeam(d){if(!G||!d)return;if(typeof d.ak==='number'&&NET.cq&&NET.cq.length&&NET.cq[0].s<=d.ak){NET.cq=NET.cq.filter(c=>c.s>d.ak);if(NET.game)NET.game.presence({cq:NET.cq}).catch(()=>{});}if(typeof d.mg==='number')NET.gen=Math.max(NET.gen||0,d.mg|0);if(d.sb===0&&NET.isStandby){NET.isStandby=false;NET.lastCk=null;}const T=G.teams[ME];T.credits=d.c|0;for(const c of CATS)T.q[c]=(d.q&&d.q[c]||[]).map(([k,p])=>({kind:k,t:p*prodTime(T,stats(T.fac,k)),p}));
  T.rq={};for(const c in (d.rq||{})){const [k,p]=d.rq[c];if(UPG[k])T.rq[c]={key:k,t:p*UPG[k].time};}T.upg={};for(const k of d.u||[])if(UPG[k])T.upg[k]=true;upgReset(T);T.charge=+d.ch||0;T.tunN=d.tn|0;if(Array.isArray(d.ac))for(const [i,c] of d.ac)if(G.teams[i])G.teams[i].credits=+c||0;T.tunK=d.tk&&typeof d.tk==='object'?d.tk:{};if(WEATHER[d.wx]){G.wx=G.wx||{t:0,next:1e9};G.wx.k=d.wx;}if(Array.isArray(d.mn))G.mines=d.mn.map(([x,y])=>({x,y,team:ME,arm:0}));T.gxp=d.gx|0;T.rank=d.rk|0||1;T.spent=d.sp|0;
  T.pw={};for(const k in (d.pw||{}))if(POWERS[k]){const v=d.pw[k];T.pw[k]=Array.isArray(v)?{cd:+v[0]||0,lv:+v[1]||1}:{cd:+v||0,lv:1};}T.reveals=(d.rv||[]).map(([x,y,r,t])=>({x,y,r,t}));T.rally=d.rl?{x:d.rl[0],y:d.rl[1]}:null;
  if(Array.isArray(d.oil))d.oil.forEach((v,i)=>{const o=G.oil[i];if(o&&Array.isArray(v)){o.owner=v[0];if(Array.isArray(v[1]))o.cp=v[1].map(x=>+x||0);o.dead=!!v[2];o.hp=+v[3]||0;}});if(Array.isArray(d.out))d.out.forEach((x,i)=>{if(G.teams[i]&&x&&!G.teams[i].out){G.teams[i].out=true;if(i===ME)showElim();}});
  if(Array.isArray(d.fa))d.fa.forEach((a,i)=>{if(G.fields[i])G.fields[i].amt=a;});}

