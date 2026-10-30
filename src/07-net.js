/* ================= MULTIPLAYER: lobby + host-authoritative sync over the artifact room ================= */
// Address of the World War 3 servers (server/ in the repo, Cloudflare), e.g. 'https://ww3-servers.<name>.workers.dev'.
// Empty = no servers: the online edition works exactly as before (public PeerJS broker, P2P only). Read by the
// online-edition shim in the page shell (game list, relay rooms, TURN logins); unused in the claude.ai artifact.
const WW3_SERVER_URL='https://ww3-servers.abdullah-haidar5.workers.dev';
// Multiplayer messages need at least Contributor access to this game: anyone the owner invited from the Share menu
// as Contributor or Editor can play; plain view-only visitors can watch the lobby but cannot join or host.
function cancelHost(){leaveNet();renderGames();}
function noPerm(){$('mpstatus').innerHTML='';const d=document.createElement('div');d.className='empty';d.textContent='Starting a battle needs edit access to this game. You can still join a battle someone else started: pick it from the list and press Join. To start one, ask the game\'s owner to give you Editor access from the Share menu.';$('mpstatus').append(d);}
// the multiplayer buttons: Play online / New battle while on the menu, Leave while in a battle's lobby
function mpIn(on){for(const id of ['host','playOnline'])if($(id))$(id).hidden=!!on;if($('cancelHost'))$('cancelHost').hidden=!on;}
async function netInit(){
  const st=$('mpstatus');
  try{if(typeof claude!=='undefined'&&claude.use)NET.room=await claude.use('room');}catch(e){}
  if(!NET.room){$('games').innerHTML='<div class="empty">Multiplayer works when this game is opened from its claude.ai link. Skirmish works everywhere.</div>';$('host').disabled=true;if($('playOnline'))$('playOnline').disabled=true;return;}
  try{NET.user=await claude.use('user');}catch(e){}
  NET.room.onPeers(()=>renderGames(),()=>{$('games').innerHTML='<div class="empty">Multiplayer is unavailable for this viewer.</div>';$('host').disabled=true;if($('playOnline'))$('playOnline').disabled=true;});
  // the old remembered "where your battle runs" choice is gone: battles start on the game's servers when they can
  try{localStorage.removeItem('ww3_hostOn');}catch(e){}
  renderGames();pwField();
  if($('jbtn')){$('jbtn').onclick=()=>{initAudio();joinByCode($('jcode').value);};$('jcode').onkeydown=e=>{if(e.key==='Enter'){initAudio();joinByCode($('jcode').value);}};}
  try{const h=(location.hash||'')+' '+(document.referrer||'');const c=codeFrom(h.includes('join=')?h:'');const pw=window.WW3_P2P?pwFrom(location.hash):null;
    // an invite link's password (#join=<code>&pw=<password>, fragment only) is taken off the address bar at once
    if(pw!=null)try{history.replaceState(null,'',location.href.split('#')[0]+'#join='+(c||''));}catch(e){}
    if(c){$('jcode').value=c.toUpperCase();setTimeout(()=>joinByCode(c,true,pw),1500);}}catch(e){}
}
async function renderGames(){if(!NET.room)return;const el=$('games');const all=NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.g&&(p.presence.g.s==='open'||p.presence.g.s==='full')&&FKEYS.includes(p.presence.g.f));
  // open lobbies first (fullest first, so games fill up), then battles already under way
  const ps=all.filter(p=>p.presence.g.s==='open').sort((x,y)=>(y.presence.g.n|0)-(x.presence.g.n|0)),busy=all.filter(p=>p.presence.g.s==='full');
  if(!all.length){el.innerHTML=`<div class="empty">${NET.code?'Your battle is open. Waiting for players to join…':window.WW3_P2P?'No open battles right now. Press Play online to start one, or type a friend\'s game code below.':'No open battles right now. Press Play online to start one and share this game with a friend.'}</div>`;return;}
  let names={};try{if(NET.user){const ids=all.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  el.innerHTML='';const hd=document.createElement('div');hd.className='empty';hd.textContent=`${ps.length} open battle${ps.length===1?'':'s'} · ${busy.length} in progress`;el.append(hd);
  for(const p of [...ps,...busy]){const g=p.presence.g,row=document.createElement('div');row.className='game';const nm=(p.by&&names[p.by]&&names[p.by].name)||(p.isMe?'You (other tab)':window.WW3_P2P&&g.c?'game '+String(g.c).toUpperCase():'A player');
    const info=document.createElement('div');const b=document.createElement('b');b.textContent=(g.pw?'🔒 ':'')+FACTIONS[g.f].name;if(g.pw)b.title='Password protected: you need the password to join';const s=document.createElement('span');s.textContent=` · ${nm} · ${(MAPS[g.m]||MAPS.strait).name} · ${g.n||1}${g.s==='full'?'':'/'+(g.mx||8)} players`;info.append(b,s);
    // a battle under way that this tab was playing in (its reconnect token survives a page reload): Rejoin gets the army back
    let mine=false;if(g.s==='full'&&window.WW3_P2P&&g.c)try{mine=!!sessionStorage.getItem('ww3_tok_'+g.c);}catch(e){}
    const btn=document.createElement('button');btn.textContent=mine?'Rejoin':g.s==='full'?'In battle':'Join';btn.disabled=!!NET.code||!!NET.game||(g.s==='full'&&!mine);btn.onclick=()=>{initAudio();if(mine){joinByCode(g.c,false,'');return;}if(g.pw)askPw(p);else joinGame(p);};row.append(info,btn);el.append(row);}}
const GAME_URL=window.WW3_P2P?(()=>{try{const r=document.referrer||'';if(/itch\.io/.test(r))return r.split('#')[0];}catch(e){}return location.href.split('#')[0];})():'https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi';
function lobbyCode(){return (NET.code&&NET.code!=='join'?NET.code:NET.jcode)||'';}
// a password-protected game's invite carries the password in the link's fragment (#…&pw=, never sent to any server),
// so a friend joins in one tap; the text also spells it out for anyone typing the code
function inviteLink(){const c=lobbyCode();return GAME_URL+'#join='+c+(NET.pw?'&pw='+encodeURIComponent(NET.pw):'');}
function inviteText(){const NETc=lobbyCode(),pwT=NET.pw?` and the password ${NET.pw}`:'';if(window.WW3_P2P&&location.protocol==='file:')return `Join my World War 3 battle! Open the World War 3 game file (ww3.html, from Discord) in Chrome or Edge, go to Multiplayer and enter game code ${NETc.toUpperCase()} in "Join by code"${pwT}.`;return window.WW3_P2P?(NET.pw?`Join my World War 3 battle (password protected)! Tap ${inviteLink()} , or open ${GAME_URL} , go to Multiplayer and enter game code ${NETc.toUpperCase()} in "Join by code"${pwT}.`:`Join my World War 3 battle! Tap ${inviteLink()} , or open ${GAME_URL} , go to Multiplayer and enter game code ${NETc.toUpperCase()} in "Join by code".`):`Join my World War 3 battle: ${GAME_URL}#join=${NETc} (game code ${NETc.toUpperCase()}). Open the link signed in to claude.ai, go to Multiplayer and press Join, or type the code into "Join by code".`;}
function copyText(t,btn){const done=()=>{if(btn){const o=btn.textContent;btn.textContent='Copied ✓';setTimeout(()=>btn.textContent=o,1600);}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fallback());return;}}catch(e){}fallback();
  function fallback(){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();if(ok)done();else if(btn)btn.textContent='Select the text and copy it';}}
// join a hosted game from its code (typed, pasted invite text, or the #join= part of an invite link)
// pasted invites: the #join= part of a link wins, then the word after "code", then a bare code, then a capitalised
// 6-character token outside any web address (codes are shown in capitals), and only last any 6-character word
function codeFrom(s){s=String(s||'');let m=s.toLowerCase().match(/join=([a-z0-9]{4,8})/);if(m)return m[1];
  m=s.match(/\bcode\s*[:#]?\s*([a-z0-9]{6})\b/i);if(m)return m[1].toLowerCase();
  const t=s.trim();if(/^[a-z0-9]{4,8}$/i.test(t))return t.toLowerCase();
  const w=s.replace(/\S*(\/\/|www\.|\.[a-z]{2,6}\/)\S*/gi,' ');
  m=w.match(/\b(?=[A-Z]*[0-9])[A-Z0-9]{6}\b/)||w.match(/\b[A-Z0-9]{6}\b/);if(m)return m[0].toLowerCase();
  const STOP=/^(battle|online|github|invite|friend|please|thanks|server)$/;for(const x of w.toLowerCase().match(/\b[a-z0-9]{6}\b/g)||[])if(!STOP.test(x))return x;return null;}
function joinByCode(raw,quiet,pw){if(!NET.room||NET.game)return;const code=codeFrom(raw);if(!code){if(!quiet)$('mpstatus').textContent='That is not a game code. Paste the invite or type the 6-character code.';return;}
  if(window.WW3_P2P){if(pw==null)pw=pwFrom(raw);const q=NET.room.peers().find(q=>!q.sameTab&&q.presence&&q.presence.g&&q.presence.g.c===code);const p={peer:'ww3-'+code,presence:{g:{c:code,s:'open',cf:q&&q.presence.g.cf?1:0,pw:q&&q.presence.g.pw?1:0}}};
    // a listed game that needs a password: ask for it first (a game not in the list asks when its host or the server does)
    if(pw==null&&p.presence.g.pw){askPw(p);return;}joinGame(p,pw!=null?{pw}:undefined);return;}
  let tries=0;const look=()=>{const p=NET.room.peers().find(q=>!q.sameTab&&q.presence&&q.presence.g&&q.presence.g.c===code);if(p){if(p.presence.g.s==='full'){$('mpstatus').textContent='That game is full or has already started.';return;}joinGame(p);return;}
    if(++tries<14){$('mpstatus').textContent='Looking for game '+code.toUpperCase()+'…';setTimeout(look,700);return;}
    $('mpstatus').textContent='Game '+code.toUpperCase()+' was not found. Check that the battle\'s leader still has the lobby open and has invited you from the game\'s Share menu, and that you are signed in to claude.ai.';};look();}
// Host-side handlers for a game room (also used when a standby player takes over as host)
function wireHost(g){
  NET.cseq=NET.cseq||{};const hostHello=(peer,by,f,tok,pw)=>{if(MODE==='host'){hostRejoin(peer,tok);return;}if(MODE!=='single')return;const cf=FKEYS.includes(f)?f:'US';const m={peer,by};const p=NET.lobby.find(q=>q.peer===m.peer);
    // a password-protected game hosted in this browser: a newcomer must greet with the password (the server also checks
    // everyone who comes through its relay room; this covers direct browser-to-browser joins)
    if(!p&&NET.pw){if(pw===undefined){const q=NET.game&&NET.game.peers().find(x=>x.peer===peer);pw=q&&q.presence&&q.presence.hi?q.presence.hi.pw:undefined;}const why=pwHostCheck(peer,pw);if(why){NET.game.emit('lobby',{n:0,to:peer,pw:why}).catch(()=>{});return;}}
    if(p){p.f=cf;if(tok)p.tok=tok;}else{const mxS=(MAPS[setup.map]||MAPS.strait).max;NET.ais=NET.ais||[];if(NET.lobby.length+1+NET.ais.length>=mxS&&NET.ais.length)NET.ais.pop();if(NET.lobby.length>=mxS-1){NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer,full:1}).catch(()=>{});return;}NET.lobby.push({peer:m.peer,by:m.by,f:cf,tok:tok||null});}
    NET.game.emit('lobby',{n:NET.lobby.length+1,to:m.peer}).catch(()=>{});renderLobby();};
  g.on('hello',m=>{if(m.sameTab)return;hostHello(m.peer,m.by,m.data&&m.data.f,null,m.data&&typeof m.data.pw==='string'?m.data.pw:'');});
  g.on('cmd',m=>hostCmd(m.peer,m.data));
  // the battle half (orders, pings, reconnects, keyframe requests) is shared with the server host (07a-hostsnap)
  g.onPeers(ch=>{for(const q of ch.joined.concat(ch.updated)){if(q.sameTab||!q.presence)continue;hostPres(q,hostHello);}});
  g.onPeers(ch=>{for(const q of ch.left){if(MODE==='single'){NET.lobby=NET.lobby.filter(p=>p.peer!==q.peer);renderLobby();}else hostGone(q.peer);}});
}
// hostGame: start a battle in this browser (the artifact edition's way, and what the browser tests drive directly)
async function hostGame(){if(!NET.room||NET.code||NET.game)return;NET.hostNote='';NET.pw=pwVal();NET.pwBad=null;return hostBrowser();}
// "New battle": on the game's servers (Cloudflare) when they are configured; if they can't take it, quietly in this
// browser with exactly the same lobby. The player never chooses and is never told where it runs.
// A password typed under the buttons (online edition) makes it a private battle: only friends who know it can join.
async function newBattle(){if(!NET.room||NET.code||NET.game)return;NET.hostNote='';NET.pw=pwVal();NET.pwBad=null;if(cfOK())return hostCF();return hostBrowser();}
// "Play online": join the open battle with the most players (one tap); if there is none (or it can't be joined), start
// a new one with the player's nation and map from the menu. A typed password means a new private battle: never join
// someone else's game then; password-protected games are joined from the list only (with their password).
// (battles on the game's servers first: they never go stale; a browser lobby that just closed can linger in the list)
function quickPick(){if(!NET.room)return [];return NET.room.peers().filter(p=>!p.sameTab&&p.presence&&p.presence.g&&p.presence.g.s==='open'&&FKEYS.includes(p.presence.g.f)&&!p.presence.g.pw&&!p.presence.g.lk&&(p.presence.g.n|0)<(p.presence.g.mx||8)).sort((x,y)=>((y.presence.g.cf|0)-(x.presence.g.cf|0))||((y.presence.g.n|0)-(x.presence.g.n|0))).slice(0,2);}
async function playOnline(){if(!NET.room||NET.code||NET.game||NET.qp)return;NET.qp=1;try{for(const p of pwVal()?[]:quickPick()){const r=await joinGame(p);if(r===true||NET.game||NET.code)return;}if(!NET.code&&!NET.game)await newBattle();}finally{NET.qp=0;}}
// Host in this browser (today's way; also the fallback when Cloudflare can't host). note: shown at the top of the lobby
async function hostBrowser(note){if(!NET.room||NET.code||NET.game)return;NET.hostNote=note||'';NET.ais=[];const code=Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'a');NET.code=code;NET.baseCode=code;NET.gen=0;NET.lobby=[];mpIn(1);
  $('mpstatus').textContent='Connecting…';
  // the matchmaking service can hang without ever answering: give up after 20 s with the same message as a refusal
  try{const g=await joinT('tc-'+code,20000,1);if(NET.code!==code){try{g.leave();}catch(e){}return;}NET.game=g;}catch(e){if(NET.code!==code)return;$('mpstatus').textContent=window.WW3_P2P?'Could not reach the online matchmaking service. Check your internet connection and try again.':'Could not open a game room. Try again in a moment.';cancelHost();return;}
  wireHost(NET.game);
  try{await NET.game.emit('lobby',{n:1,probe:1});}catch(e){if(e&&e.code==='not_permitted'){noPerm();cancelHost();return;}}
  await NET.room.presence({g:{c:code,f:setup.p,s:'open',n:1,pw:NET.pw?1:undefined}}).catch(()=>{});renderLobby();renderGames();}
/* ---------- Battles on Cloudflare (Stage 2: the battle runs on the World War 3 servers) ----------
   The creating player's page opens a battle room on the servers with its own key and sends its setup there; the
   server (a BattleRoom) becomes the host, and every human - the creator included - plays as an ordinary client: the
   same snapshots, orders, reconnects and host migration as with a browser host. Lobby edits (teams, computer players,
   map, Conditions, Start) go to the server as 'bset'; the server answers with the whole lobby ('blob'). Protocol:
   orch/STAGE2.md "Cloudflare battle protocol". Used only in the online edition with the servers configured; players
   are never asked or told where their battle runs (Abdullah, 2026-10-27 19:30). */
function cfOK(){try{return !!(NET.room&&typeof NET.room.cf==='function'&&NET.room.cf());}catch(e){return false;}}
async function hostCF(again){if(!NET.room||NET.code||NET.game)return;const code=Math.random().toString(36).slice(2,8).replace(/[^a-z0-9]/g,'a'),key=Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,10);
  NET.cf={own:1,key,blob:null,pend:null};mpIn(1);
  const r=await joinGame({peer:'ww3-'+code,presence:{g:{c:code,s:'open',cf:1}}},{via:'wsb',own:key});
  if(r===true){NET.lobby=[];NET.ais=[];NET.tm=[0];cfPush(true);return;}
  NET.cf=null;
  if(r&&r.why==='taken'&&!again){mpIn(0);return hostCF(1);}
  // the server is over today's free allowance, unreachable or refusing: the battle quietly starts in this browser
  // instead, with the same lobby and no message (NET.fb records why, for tests and the console only)
  NET.fb=r&&r.why||r&&r.type||'error';console.info('battle server unavailable ('+NET.fb+'): starting the battle in this browser');
  return hostBrowser();}
// the owner's lobby settings as the server wants them ('bset')
function cfCfg(){const nh=NET.lobby.length+1;return {map:setup.map||'strait',w:setup.w|0,tm:(NET.tm||[]).slice(0,nh).map(v=>v|0),ais:(NET.ais||[]).map(a=>({f:a.f,d:a.d|0,tm:a.tm|0}))};}
function cfCfgOf(b){const hs=(b.seats||[]).filter(s=>s.h),as=(b.seats||[]).filter(s=>s.ai);return {map:b.map,w:b.w|0,tm:hs.map(s=>s.tm|0),ais:as.map(s=>({f:s.f,d:s.d|0,tm:s.tm|0}))};}
// send the owner's edits (only real changes); until the server's answer reflects them, older lobby states are ignored
function cfPush(force){const C=NET.cf;if(!C||!C.own||!NET.game)return;const js=JSON.stringify(cfCfg());if(!force&&(C.blob&&JSON.stringify(cfCfgOf(C.blob))===js||C.pend&&C.pend.js===js))return;
  C.pend={js,until:performance.now()+2500};NET.game.emit('bset',JSON.parse(js)).catch(()=>{});}
// the lobby from the server: mirror it into the lobby the host screen draws (NET.lobby / NET.tm / NET.ais)
function cfApply(){const C=NET.cf,b=C&&C.blob;if(!b)return false;const js=JSON.stringify(cfCfgOf(b));if(C.pend){if(C.pend.js!==js&&performance.now()<C.pend.until)return false;C.pend=null;}
  const hs=(b.seats||[]).filter(s=>s.h);NET.lobby=hs.slice(1).map((s,i)=>({peer:'seat'+(i+1),by:null,f:FKEYS.includes(s.f)?s.f:'US'}));NET.tm=hs.map(s=>s.tm|0);NET.ais=(b.seats||[]).filter(s=>s.ai).map(s=>({f:FKEYS.includes(s.f)?s.f:FKEYS[0],d:s.d|0,tm:s.tm|0}));return true;}
// the lobby's connection line, the same wherever the battle runs: "Online · ping 42 ms" (in battle: fpsHud)
function cfNetText(){return 'Online'+(NET.ping?` · ping ${Math.round(NET.ping)} ms`:'');}
const TEAM_COL=['#7fb8e6','#ea5a40','#74d08f','#e3b341','#c58af0','#f08ab4','#6fe0d0','#c9c9c9'];
// Host lobby: game code and player count at the top, the Start button right under it, one row per seat (taken or
// open) with each player's nation and team, quick team presets, and the invite steps at the bottom.
async function renderLobby(){const cfb=NET.cf&&NET.cf.own&&NET.cf.blob;if(MODE!=='single'||!cfb&&(!NET.code||NET.code==='join'))return;const mk=cfb&&MAPS[cfb.map]?cfb.map:setup.map,mx=cfb&&cfb.mx>1?Math.min(cfb.mx|0,(MAPS[mk]||MAPS.strait).max):(MAPS[mk]||MAPS.strait).max,mapN=(MAPS[mk]||MAPS.strait).name;
  NET.ais=NET.ais||[];if(NET.lobby.length+1+NET.ais.length>mx)NET.ais.splice(Math.max(0,mx-1-NET.lobby.length));
  if(NET.lobby.length+1>mx&&!cfb){const drop=NET.lobby.splice(mx-1);for(const p of drop)NET.game.emit('lobby',{n:0,to:p.peer,full:1}).catch(()=>{});}
  let names={};try{if(NET.user){const ids=NET.lobby.map(p=>p.by).filter(Boolean);if(ids.length)names=await NET.user.profiles(ids);}}catch(e){}
  const nh=NET.lobby.length+1,nn=nh+NET.ais.length;NET.tm=(NET.tm||[]).slice(0,nh);while(NET.tm.length<nh)NET.tm.push(NET.tm.length%Math.max(2,nn));const tmAll=lobbyTeams();const teamsOk=new Set(tmAll).size>1;
  const E=(t,c,txt)=>{const d=document.createElement(t);if(c)d.className=c;if(txt!=null)d.textContent=txt;return d;};
  const el=$('mpstatus');el.innerHTML='';const L=E('div','lob');
  // header
  const hd=E('div','lobhd');const l=E('div');l.append(E('div','lobk','Your battle · code'),E('div','lobcode',lobbyCode().toUpperCase()));{const c=E('div','lobk',cfNetText());c.id='cfNet';l.append(c);}
  const r=E('div','lobr');r.append(E('div','lobmap',mapN),E('div','lobn',`${nn} / ${mx} players`));const pips=E('div','pips');for(let i=0;i<mx;i++){const d=E('i');if(i<nn)d.className='on';pips.append(d);}r.append(pips);hd.append(l,r);L.append(hd);
  // start
  if(NET.hostNote)L.append(E('div','lobwhy',NET.hostNote));
  if(NET.pw)L.append(E('div','lobwhy','🔒 Password protected: only players with the password can join (the invite below includes it).'));
  const sb=E('button','big startbtn',nn>=2?`▶ Start ${nn}-player battle`:'▶ Start battle');sb.disabled=nh<2||!teamsOk||!!cfb&&!cfb.ok&&!(NET.cf.pend);sb.onclick=()=>launchMP();L.append(sb);
  L.append(E('div','lobwhy',cfb&&cfb.why&&!NET.cf.pend?String(cfb.why):nh<2?(NET.ais.length?'Waiting for at least one friend to join (to play only against the computer, use Deploy vs AI on the main menu).':'Waiting for at least one more player to join. You can also add computer players below.'):!teamsOk?'Everyone is on one team: put someone on another team to start.':'Everyone ready? Press Start. Players can still join until you do.'));
  // battlefield: the leader may change it here (the menu's own map list does the work, so both stay in step)
  {const ms=$('mapSel'),row=E('div','lobmapsel');if(ms){const sel=ms.cloneNode(true);sel.id='lobMap';sel.setAttribute('aria-label','Battlefield for this battle');sel.value=mk;sel.onchange=()=>{ms.value=sel.value;if(ms.onchange)ms.onchange();};row.append(E('span','lobk','Battlefield'),sel);L.append(row);}}
  // seats
  const sh=E('div','lobsec');sh.append(E('span','','Players'));const pre=E('span','presets');
  const pb=(lab,fn)=>{const b=E('button','chip',lab);b.onclick=()=>{NET.tm=NET.tm.map((_,i)=>fn(i));NET.ais.forEach((a,j)=>a.tm=fn(nh+j));renderLobby();};pre.append(b);};
  if(nn>=2){pb('Free for all',i=>i);pb('2 teams',i=>i%2);if(nn>=4)pb('You + allies vs rest',i=>i<Math.ceil(nn/2)?0:1);}sh.append(pre);L.append(sh);
  const seats=E('div','seats');
  const seat=(i,nm,f,host)=>{const row=E('div','seat');row.style.setProperty('--tc',TEAM_COL[NET.tm[i]%8]);row.append(E('span','sn',String(i+1)));const who=E('div','who');who.append(E('b','',nm));if(host)who.append(E('span','tag','leader'));row.append(who);
    const fc=E('span','sfac');fc.append(E('span','fcode',f),E('span','fname',FACTIONS[f].name));row.append(fc);
    const s=document.createElement('select');s.setAttribute('aria-label','Team for '+nm);for(let t=0;t<Math.max(2,nn);t++){const o=document.createElement('option');o.value=t;o.textContent='Team '+(t+1);s.append(o);}s.value=NET.tm[i];s.onchange=()=>{NET.tm[i]=+s.value;renderLobby();};row.append(s);seats.append(row);};
  if(cfb){const hs=(cfb.seats||[]).filter(s=>s.h),you=cfb.you|0;hs.forEach((s,k)=>seat(k,k===you?'You':'Player '+(k+1),FKEYS.includes(s.f)?s.f:'US',k===0));}
  else{seat(0,'You',setup.p,true);NET.lobby.forEach((p,k)=>seat(k+1,(p.by&&names[p.by]&&names[p.by].name)||'Player '+(k+2),p.f,false));}
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
  // a Cloudflare battle is listed in the game list by the server itself; the owner's edits go to the server
  if(cfb){cfPush();return;}
  NET.room.presence({g:{c:NET.code,f:setup.p,s:nn>=mx?'full':'open',n:nn,m:setup.map||'strait',mx,pw:NET.pw?1:undefined}}).catch(()=>{});}
function lobbyTeams(){const nh=NET.lobby.length+1;return [...(NET.tm||[]).slice(0,nh),...(NET.ais||[]).map(a=>a.tm|0)];}
function launchMP(){if(NET.cf&&NET.cf.own){if(MODE!=='single'||!NET.game)return;const c=cfCfg();NET.cf.pend=null;NET.game.emit('bset',Object.assign(c,{seed:(Math.random()*1e9)|0,start:1})).catch(()=>{});$('mpstatus').querySelectorAll('.startbtn').forEach(b=>{b.disabled=true;b.textContent='Starting…';});return;}
  if(MODE!=='single'||!NET.lobby.length)return;const seed=(Math.random()*1e9)|0;const ais=(NET.ais||[]).slice(0,Math.max(0,(MAPS[setup.map]||MAPS.strait).max-1-NET.lobby.length)).map(a=>({f:FKEYS.includes(a.f)?a.f:FKEYS[0],d:Math.max(0,Math.min(2,a.d|0)),tm:Math.max(0,Math.min(7,a.tm|0))}));const facs=[setup.p,...NET.lobby.map(p=>p.f),...ais.map(a=>a.f)];NET.peers=[null,...NET.lobby.map(p=>p.peer),...ais.map(()=>null)];NET.toks=[null,...NET.lobby.map(p=>p.tok||null),...ais.map(()=>null)];
  const aiD=[null,...NET.lobby.map(()=>null),...ais.map(a=>a.d|0)];NET.opp=NET.peers[1];
  const map=setup.map||'strait';const tm=lobbyTeams().slice(0,facs.length);while(tm.length<facs.length)tm.push(tm.length);NET.lobby.forEach((p,i)=>NET.game.emit('start',{pv:NET_PV,seed,facs,slot:i+1,to:p.peer,map,tm,w:setup.w|0}).catch(()=>{}));NET.room.presence({g:{c:NET.code,f:setup.p,s:'full',n:facs.length,m:map,pw:NET.pw?1:undefined}}).catch(()=>{});NET.startInfo={seed,facs,map,tm,w:setup.w|0};startMP('host',seed,facs,0,map,tm,aiD);}
// Joining: each player has a reconnect token for this game (kept for the browser tab), so if the link drops - or the
// page is reloaded - they rejoin as the same commander. Client handlers are wired by wireClient() so a reconnect can
// rebuild them on the new connection.
function joinTok(code){const k='ww3_tok_'+code;let t=null;try{t=sessionStorage.getItem(k);}catch(e){}if(!t){t=Math.random().toString(36).slice(2,12);try{sessionStorage.setItem(k,t);}catch(e){}}return t;}
function wireClient(g){
  g.on('hello',m=>{if(m.sameTab)NET.myPeer=m.peer;});
  g.on('lobby',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer&&MODE==='single'){
    // a browser host refused our password (direct browser-to-browser join): ask again
    if(m.data.pw){clearInterval(NET.helloI);const jp=NET.joinP;leaveNet();pwRefused(jp,m.data.pw==='limit'?'pwlimit':m.data.pw==='need'?'needpw':'badpw');return;}
    NET.joined=1;if(m.data.full){clearInterval(NET.helloI);$('mpstatus').textContent='That game is full.';leaveNet();return;}if(NET.cf&&NET.cf.own)return;$('mpstatus').textContent=`Joined. ${m.data.n} players in the lobby. Waiting for the leader to start the battle…`;}});
  // a battle hosted on Cloudflare: the whole lobby, from the server ('own': this player sets it up and starts it)
  g.on('blob',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer||MODE!=='single')return;const b=m.data;NET.joined=1;
    if((b.pv|0)!==NET_PV){$('mpstatus').textContent='You and the game server have different versions of the game. Close the game and open it again to update, then try again.';leaveNet();return;}
    NET.cf=NET.cf||{};NET.cf.blob=b;if(b.own){NET.cf.own=1;mpIn(1);if(cfApply())renderLobby();return;}NET.cf.own=0;
    const n=(b.seats||[]).filter(s=>s.h).length;$('mpstatus').textContent=`Joined. ${n} player${n===1?'':'s'} in the lobby. Waiting for the leader to start the battle…`;});
  g.on('start',m=>{if(MODE==='client'){if(m.peer===NET.hostPeer&&m.data&&m.data.to&&m.data.to===NET.myPeer)NET.ackW=performance.now();return;} // mid-battle: the battle has linked this player back in (hostRejoin)
  if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer||MODE!=='single')return;clearInterval(NET.helloI);const d=m.data;if((d.pv|0)!==NET_PV){$('mpstatus').textContent='You and the battle\'s leader have different versions of the game. Both of you: close the game and open it again to update, then rejoin.';leaveNet();return;}if(!Array.isArray(d.facs)||d.facs.length<2||d.facs.length>8||!d.facs.every(f=>FKEYS.includes(f)))return;const sl=d.slot|0;if(sl<(d.sv?0:1)||sl>=d.facs.length)return;const map=MAPS[d.map]?d.map:'strait';const tm=Array.isArray(d.tm)&&d.tm.length===d.facs.length?d.tm.map(v=>Math.max(0,Math.min(7,v|0))):null;// the host's battle Conditions (light/weather look); Random (-1) resolves from the shared seed, so it matches too.
  // An old host sends no 'w': the player's own menu choice stays, as before.
  if(typeof d.w==='number'&&d.w>=-1&&d.w<WX.length){if(NET.ownW==null)NET.ownW=setup.w;wxSet(d.w|0);}
  // sv: the host is the game server (Cloudflare), which has no side of its own, so this player may be slot 0
  NET.sv=d.sv?1:0;NET.startW=performance.now();if(NET.game)NET.game.presence({ld:1}).catch(()=>{});startMP('client',d.seed|0,d.facs,sl,map,tm);});
  const ok=m=>m.peer===NET.hostPeer&&MODE==='client'&&(!m.data.to||m.data.to===NET.myPeer);
  g.on('snap',m=>{if(ok(m)){NET.lastRx=performance.now();if(m.data.to)NET.lastRxMe=NET.lastRx;applySnap(m.data);}});
  g.on('evt',m=>{if(ok(m)){NET.lastRx=performance.now();applyEvents(m.data);}});
  g.on('team',m=>{if(ok(m)){NET.lastRx=performance.now();applyTeam(m.data);}});
  g.on('b',m=>{if(!ok(m)||!Array.isArray(m.data.m))return;NET.lastRx=performance.now();for(const x of m.data.m){if(!Array.isArray(x))continue;const [t,d]=x;if(!d)continue;try{if(t==='snap')applySnap(d);else if(t==='evt')applyEvents(d);else if(t==='team')applyTeam(d);}catch(e){console.warn('bundle',t,e);}}});
  g.on('ck',m=>{if(m.peer===NET.hostPeer&&m.data&&m.data.to===NET.myPeer)ckReceive(m.data);});
  g.on('pong',m=>{if(m.peer!==NET.hostPeer||!m.data||m.data.to!==NET.myPeer)return;const rtt=Date.now()-(+m.data.t||0);if(rtt>=0&&rtt<20000)NET.ping=NET.ping?NET.ping*.7+rtt*.3:rtt;});
  g.onPeers(ch=>{if(!NET.myPeer){const me=ch.peers.find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}if(NET.findHost){const h=ch.peers.find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}if(g===NET.game&&ch.left.some(q=>q.peer===NET.hostPeer)){if(MODE==='client')clientReconnect();else if(MODE==='single'&&NET.code==='join'){clearInterval(NET.helloI);$('mpstatus').textContent=NET.via==='wsb'?'The connection was lost. Press Play online to find a battle again.':'The battle\'s leader closed the lobby.';leaveNet();}}});}
// Host lost: get back into the battle as fast as possible.
//  1. Rejoin the same room once (a short network blip: the host is still there).
//  2. If that fails, the standby player (holding a checkpoint) takes over at once (promoteToHost). Everyone else keeps
//     knocking on the follow-up room "<code>-m<gen+1>" every ~0.3 s until the new host opens it, instead of waiting a
//     fixed time and then going back to the dead old room. Only when the old room's answer was unclear (e.g. a
//     timeout rather than "nobody is hosting this") do we look back there now and then.
//  3. If the host of the room we just reached leaves while we wait for its first update, we stop waiting at once
//     (NET.reconKick) instead of sitting out the full wait.
// joinT: join a room, giving up after ms (a room that answers late is left at once). host: open it as its host (no 'via')
function joinT(name,ms,host){const p=NET.room.join(name,!host&&NET.via?{via:NET.via}:undefined);let late=false;
  return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>{late=true;rej(Object.assign(new Error('timeout'),{type:'timeout'}));},ms))]).catch(e=>{if(late)p.then(g=>{try{g.leave().catch(()=>{});}catch(_){}},()=>{});throw e;});}
// is a Cloudflare battle still running? 'up' (the server lists it), 'gone' (the network works but the server doesn't run
// it, or can't be reached while this page's own site can), 'down' (this device has no network)
async function svAsk(code){const sig=ms=>{try{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal;}catch(e){return undefined;}};
  const srv=String(window.WW3_SERVER||(typeof WW3_SERVER_URL!=='undefined'?WW3_SERVER_URL:'')).replace(/\/+$/,'');
  if(srv)try{const r=await fetch(srv+'/games',{cache:'no-store',signal:sig(5000)});const j=await r.json();return ((j&&j.battles)||[]).some(x=>Array.isArray(x)&&x[0]==='b-'+code)?'up':'gone';}catch(e){}
  if(location.protocol==='file:')return 'gone';
  try{await fetch(location.href.split('#')[0],{method:'HEAD',cache:'no-store',signal:sig(5000)});return 'gone';}catch(e){return 'down';}}
async function clientReconnect(){if(NET.recon){NET.reconKick=true;return;}if(!NET.jcode)return;NET.recon=true;NET.reconKick=false;pushLog('Connection lost. Reconnecting…','w');
  const gen0=NET.gen||0,p0=NET.myPeer,tA=performance.now(),slp=ms=>new Promise(r=>setTimeout(r,ms));let t0=tA,gone=false,here=false,n=0,newTries=0;
  // a battle hosted on Cloudflare: a server blip (restart, redeploy) or this player's own network drop is ridden out on
  // the server, which keeps the battle (and the side, 30 s) or picks it up again from its kept checkpoint. Only the
  // server's own "no such battle" (it handed the battle over, or could not pick it up) lets the standby take over: a
  // standby that merely can't reach the server must not start a second copy of the battle (review R6). If nobody hears
  // from the server for 40 s, it is gone for everyone and the standby takes over.
  // But 40 s of silence can just as well be this page's own network (a phone in a tunnel): then a takeover helps nobody and
  // splits the battle (review R11). So when the 40 s are up, ask once more (svAsk): while this page has no network, or
  // the server still lists the battle, keep riding it out (the 60 s budget counts from then on); take over only when
  // the network works and the server no longer runs the battle, or can't be reached while other sites can. 5 min at most.
  const svBlip=()=>NET.sv&&!(gen0>0)&&!gone&&performance.now()-t0<40000;
  while(MODE==='client'&&!(G&&G.over)&&performance.now()-t0<60000){
    if(n>0&&NET.sv&&!(gen0>0)&&!gone&&performance.now()-t0>=40000&&performance.now()-tA<300000){const st=await svAsk(NET.baseCode||NET.jcode);
      if(MODE!=='client'||(G&&G.over))break;if(st!=='gone'){t0=performance.now()-35000;if(st==='down'&&!NET.svDownSaid){NET.svDownSaid=1;pushLog('No network on this device. Waiting for it to come back…','w');}}}
    if(n>0&&NET.isStandby&&NET.lastCk&&(!here||performance.now()-t0>15000)&&!svBlip()){const pr=await promoteToHost();if(pr===true){NET.recon=false;NET.reconKick=false;return;}if(pr!=='retry')NET.isStandby=false;}
    if(MODE!=='client'||(G&&G.over))break;
    // which room: the old one first; then the follow-up room (with an occasional look back at the old room while it
    // is not certain that its host is gone)
    const old=n===0||svBlip()||(here&&!gone)||(!gone&&newTries>0&&newTries%4===0),gen=old?gen0:gen0+1,room=migRoom(gen);
    // knocking on the follow-up room backs off (0.5 s, then x1.4 each try up to 2.5 s, +-25% so players spread out): each
    // try opens a fresh connection to the matchmaking service, and 7 players knocking every 0.3 s could trip its limits
    await slp(n===0?250:!old?Math.min(2500,500*1.4**newTries)*(.75+Math.random()*.5):svBlip()?700:300);n++;if(!old)newTries++;if(MODE!=='client'||(G&&G.over))break;
    {const og=NET.game;NET.game=null;try{if(og)og.leave().catch(()=>{});}catch(e){}}
    let g=null;try{g=await joinT('tc-'+room,old?4000:6000);}catch(e){if(old){here=false;if(e&&e.type==='peer-unavailable')gone=true;}continue;}
    if(MODE!=='client'||(G&&G.over)){try{g.leave().catch(()=>{});}catch(e){}break;}
    NET.game=g;NET.myPeer=null;NET.reconKick=false;
    if(window.WW3_P2P)NET.hostPeer='ww3-'+room;else if(gen>0){NET.hostPeer=null;NET.findHost=true;}wireClient(g);
    if(NET.findHost){const h=g.peers().find(q=>!q.sameTab&&q.presence&&q.presence.h);if(h){NET.hostPeer=h.peer;NET.findHost=false;}}
    NET.lastSnapT=0;NET.prevT=0;NET.rxW=0;NET.ia=0;NET.iaDev=0;const t1=performance.now();
    // back in only once the host is sending to *this* player again: it linked us back in (its 'start' to us), or an update
    // addressed to us arrived, or (same connection as before) any update. Updates the host broadcasts to everyone also
    // reach a player it has dropped, and taking those as 'reconnected' left that player on an empty, frozen battle.
    const back=()=>gen>gen0?NET.lastRx>=t1:(NET.ackW>=t1||NET.lastRxMe>=t1||(NET.lastRx>=t1&&!!p0&&NET.myPeer===p0));
    for(let k=0;k<24&&!back()&&!NET.reconKick&&MODE==='client';k++){if(!NET.myPeer){const me=g.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}
      if(k%3===0)g.presence({hi:{f:setup.p,n:Date.now()%1e6,tok:NET.tok,ed:NET.canEmit===false?0:1},cq:NET.cq||[]}).catch(()=>{});await slp(300);}
    if(back()&&!NET.reconKick){for(const e of G.ents)e.seenAt=Math.min(e.seenAt,NET.lastSnapT||0);NET.recon=false;NET.svDownSaid=0;NET.gen=Math.max(NET.gen||0,gen);pushLog(gen>(NET.gen0||0)?'Reconnected.':'Reconnected.','g');return;}
    // the host is not in its room any more (closed the game / lost its connection): it is gone, the standby takes over now.
    // While it is still there (it was just slow), keep knocking at its room, and the standby holds off for up to 15 s
    // instead of starting a second battle beside it. If its room can't be reached at all, the standby takes over at once.
    if(old){here=!NET.reconKick&&g.peers().some(q=>!q.sameTab&&(q.peer===NET.hostPeer||(q.presence&&q.presence.h)));if(!here)gone=true;}NET.reconKick=false;}
  NET.recon=false;NET.reconKick=false;if(MODE==='client')oppLeft();}
// o: {via:'wsb', own} = a battle hosted on Cloudflare (own: create it). Returns true, or the error when joining failed.
// o.pw: the password for a password-protected game (asked by askPw, or from an invite link)
async function joinGame(p,o){if(NET.game)return;const code=p.presence.g.c,jo=o&&o.via?o:(p.presence.g.cf?{via:'wsb'}:undefined),own=!!(o&&o.own);$('mpstatus').textContent=own?'Connecting…':'Joining…';NET.joined=0;
  if(!own){NET.pw=o&&typeof o.pw==='string'?o.pw:'';NET.joinP=p;}
  try{NET.game=await NET.room.join('tc-'+code,jo);}catch(e){NET.game=null;if(own)return e||{};if(e&&e.type==='password'){pwRefused(p,e.why);return e;}$('mpstatus').textContent=e&&e.why==='busy'?'The game server is busy right now. Try again later.':e&&e.why==='full'?'That game is full.':window.WW3_P2P?'No open battle with code '+code.toUpperCase()+' was found. Check the code and make sure the battle\'s lobby is still open.':'Could not join that game.';NET.game=null;return e||{};}
  mpIn(1);NET.hostPeer=p.peer;NET.code='join';NET.jcode=code;NET.baseCode=code;NET.gen=0;NET.via=NET.game.via||null;NET.tok=joinTok(code);NET.lastRx=0;wireClient(NET.game);NET.cq=[];NET.cs=Math.floor(Date.now()/10);
  // keep-alive + 'host lost' watchdog. The watchdog counts from the last update, or from the end of this player's loading
  // screen / the battle start if none came yet (before, a player who had heard nothing since the start never noticed, so a
  // host that had given up on them left them on a frozen battle: no army, starting money). The loading flag (ld) tells
  // the host this player is busy loading, so it doesn't count the silence of a slow load as a dropped connection.
  // When this page itself froze for a while (busy loading, a slow phone, a background tab), the silence is ours, not the
  // host's: the watchdog starts counting again from when the page came back (NET.stW). Before the first update ever
  // arrives the host may simply still be on its own loading screen, so that wait is much longer (45 s).
  clearInterval(NET.pingI);NET.pingI=setInterval(()=>{if(!NET.game&&!NET.recon){clearInterval(NET.pingI);return;}const w=performance.now(),ld=window.LOADING?1:0;if(ld)NET.ldW=w;if(NET.pgW&&w-NET.pgW>2500)NET.stW=w;NET.pgW=w;
    if(MODE==='client'&&!NET.recon&&!ld&&(NET.lastRx?w-Math.max(NET.lastRx,NET.ldW||0,NET.stW||0)>5000:w-Math.max(NET.ldW||0,NET.startW||0,NET.stW||0)>45000)){clientReconnect();return;}if($('cfNet'))$('cfNet').textContent=cfNetText();if(NET.game)NET.game.presence({pg:Date.now(),pi:NET.ping?Math.round(NET.ping):null,ld}).catch(()=>{});},1000);
  let n=0;const hello=()=>{if(MODE!=='single'){clearInterval(NET.helloI);return;}if(n++>12&&!NET.joined&&!/Joined/.test($('mpstatus').textContent)){clearInterval(NET.helloI);$('mpstatus').textContent='The battle did not answer. It may have already started.';leaveNet();return;}if(n>14&&n%3)return;if(!NET.myPeer){const me=NET.game.peers().find(q=>q.sameTab);if(me)NET.myPeer=me.peer;}const hpw=NET.pw&&NET.via!=='wsb'?NET.pw:undefined;NET.game.presence({hi:{f:setup.p,n:n,tok:NET.tok,ed:NET.canEmit===false?0:1,pw:hpw}}).catch(()=>{});if(NET.canEmit!==false)NET.game.emit('hello',{f:setup.p,pw:hpw}).catch(e=>{if(e&&e.code==='not_permitted')NET.canEmit=false;});};
  hello();NET.helloI=setInterval(hello,1500);if(!own)$('mpstatus').textContent='Connecting…';return true;}
// Set the Conditions choice and light up its menu button. The host's choice is used only for that battle: the player's
// own menu choice (NET.ownW) comes back when they leave the battle, so their next solo battle uses their own Conditions.
function wxSet(w){setup.w=w;const W=$('wx');if(W)W.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.w===w));}
function leaveNet(){if(NET.ownW!=null){wxSet(NET.ownW);NET.ownW=null;}NET.cf=null;NET.joined=0;NET.sv=0;NET.hostNote='';clearInterval(NET.helloI);clearInterval(NET.pingI);NET.ping=0;NET.pings={};if(NET.game)NET.game.leave().catch(()=>{});NET.game=null;NET.code=null;NET.opp=null;NET.hostPeer=null;NET.lobby=[];NET.peers=null;if(NET.room)NET.room.presence({g:null}).catch(()=>{});mpIn(0);}
/* ---------- password-protected games (online edition only) ----------
   The creator may type a password under "Play online" / "New battle" (a new private battle). The game list shows a 🔒 and never carries the password; joiners
   are asked for it. The server checks it (relay room and Cloudflare battle: salted hash, rate-limited; server/src/
   password.js), and a browser host checks it too for players who reach it directly. NET.pw: this game's password. */
function pwVal(){const i=$('hostpw');return i&&window.WW3_P2P?String(i.value||'').trim().slice(0,64):'';}
function pwFrom(s){const m=String(s||'').match(/[#&?\s]pw=([^&\s#]*)/);if(!m)return null;try{return decodeURIComponent(m[1]).trim().slice(0,64);}catch(e){return null;}}
function pwField(){if(!window.WW3_P2P||!NET.room||$('hostpw'))return;const h=$('host');if(!h)return;const row=h.closest('.row')||h.parentNode,d=document.createElement('div');d.className='row joinrow pwrow';
  const i=document.createElement('input');i.id='hostpw';i.type='password';i.maxLength=64;i.placeholder='🔒 Password (optional): for a private battle';i.autocomplete='new-password';i.spellcheck=false;i.setAttribute('aria-label','Password for your game (optional): only friends who know it can join');i.title='Optional. Leave empty for a game anyone can join.';
  i.onkeydown=e=>{if(e.key==='Enter'){initAudio();newBattle();}};d.append(i);row.parentNode.insertBefore(d,row.nextSibling);
  // shown with the button only (not while this player is in a lobby)
  try{new MutationObserver(()=>{d.hidden=!!h.hidden;}).observe(h,{attributes:true,attributeFilter:['hidden']});}catch(e){}d.hidden=!!h.hidden;}
// the browser host's check of a newcomer's password: null = fine, else 'need' / 'bad' / 'limit' (wrong guesses: 10 a minute)
function pwHostCheck(peer,given){const now=Date.now(),B=NET.pwBad=NET.pwBad&&now-NET.pwBad.at<60000?NET.pwBad:{at:now,n:0,seen:{}};
  if(typeof given!=='string'||!given)return 'need';
  if(B.n>=10)return 'limit';
  const a=String(given),b=String(NET.pw);let d=a.length^b.length;for(let k=0;k<b.length;k++)d|=(a.charCodeAt(k)|0)^b.charCodeAt(k);
  if(!d)return null;if(!B.seen[peer]){B.seen[peer]=1;B.n++;}return 'bad';}
function pwRefused(p,why){if(why==='pwlimit'){$('mpstatus').textContent='Too many wrong passwords. Wait a minute, then try again.';return;}askPw(p,why==='badpw'?'Wrong password. Try again.':null);}
// ask for a game's password (inline, phone-friendly), then join with it
function askPw(p,msg){if(!p||NET.game)return;const code=String(p.presence.g.c||'').toUpperCase(),el=$('mpstatus');el.innerHTML='';const box=document.createElement('div');box.className='pwask';
  const t=document.createElement('div');t.className=msg?'pwmsg bad':'pwmsg';t.style.margin='4px 0';if(msg){t.style.color='#ea5a40';t.style.fontWeight='600';}t.textContent=msg||`🔒 Game ${code} is password protected. Enter its password to join.`;
  const r=document.createElement('div');r.className='row joinrow';const i=document.createElement('input');i.id='joinpw';i.type='password';i.maxLength=64;i.placeholder='Password';i.autocomplete='off';i.spellcheck=false;i.setAttribute('aria-label','Password for game '+code);
  const go=document.createElement('button');go.className='big';go.id='joinpwgo';go.textContent='Join';const no=document.createElement('button');no.className='big ghost';no.textContent='Cancel';
  const join=()=>{const v=String(i.value||'').trim().slice(0,64);if(!v){i.focus();return;}initAudio();joinGame(p,{pw:v});};
  go.onclick=join;i.onkeydown=e=>{if(e.key==='Enter')join();};no.onclick=()=>{el.textContent='';renderGames();};
  r.append(i,go,no);box.append(t,r);el.append(box);setTimeout(()=>{try{i.focus();}catch(e){}},0);}
function oppLeft(){if(!G||G.over)return;pushLog('The connection to the battle was lost.','w');showEnd(-1,'The connection to the battle was lost, so the battle has ended.');}
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
function applyEvents(d){if(!d||!Array.isArray(d.e))return;for(const v of d.e){if(!Array.isArray(v))continue;const [type,...args]=v;if(type==='est'){if(G&&args[0]&&typeof args[0]==='object')G.endStats=args[0];continue;}if(!FXH[type]||type==='end'&&false)continue;
  if(type==='die'||type==='gone'){const e=G.byId.get(args[0]);if(e){e.dead=true;e.gone=true;G.byId.delete(e.id);if(G.sel.includes(e))G.sel=G.sel.filter(x=>x!==e);}}
  if(type==='log'&&args[0]!==ME)continue;try{FXH[type](...args);}catch(e){}}}
function applyTeam(d){if(!G||!d)return;G.ewv=d.ew?Object.assign(d.ew,{rt:G.t}):null;if(typeof d.ak==='number'&&NET.cq&&NET.cq.length&&NET.cq[0].s<=d.ak){NET.cq=NET.cq.filter(c=>c.s>d.ak);if(NET.game)NET.game.presence({cq:NET.cq}).catch(()=>{});}if(typeof d.mg==='number')NET.gen=Math.max(NET.gen||0,d.mg|0);if(d.sb===0&&NET.isStandby){NET.isStandby=false;NET.lastCk=null;}const T=G.teams[ME];T.credits=d.c|0;for(const c of CATS)T.q[c]=(d.q&&d.q[c]||[]).map(([k,p])=>({kind:k,t:p*prodTime(T,stats(T.fac,k)),p}));
  T.rq={};for(const c in (d.rq||{})){const [k,p]=d.rq[c];if(UPG[k])T.rq[c]={key:k,t:p*UPG[k].time};}T.upg={};for(const k of d.u||[])if(UPG[k])T.upg[k]=true;upgReset(T);T.charge=+d.ch||0;T.tunN=d.tn|0;if(Array.isArray(d.ac))for(const [i,c] of d.ac)if(G.teams[i])G.teams[i].credits=+c||0;T.tunK=d.tk&&typeof d.tk==='object'?d.tk:{};if(WEATHER[d.wx]){G.wx=G.wx||{t:0,next:1e9};G.wx.k=d.wx;}if(Array.isArray(d.mn))G.mines=d.mn.map(([x,y])=>({x,y,team:ME,arm:0}));T.gxp=d.gx|0;T.rank=d.rk|0||1;T.spent=d.sp|0;
  T.pw={};for(const k in (d.pw||{}))if(POWERS[k]){const v=d.pw[k];T.pw[k]=Array.isArray(v)?{cd:+v[0]||0,lv:+v[1]||1}:{cd:+v||0,lv:1};}T.reveals=(d.rv||[]).map(([x,y,r,t])=>({x,y,r,t}));T.rally=d.rl?{x:d.rl[0],y:d.rl[1]}:null;
  if(Array.isArray(d.oil))d.oil.forEach((v,i)=>{const o=G.oil[i];if(o&&Array.isArray(v)){o.owner=v[0];if(Array.isArray(v[1]))o.cp=v[1].map(x=>+x||0);o.dead=!!v[2];o.hp=+v[3]||0;}});if(Array.isArray(d.out))d.out.forEach((x,i)=>{if(G.teams[i]&&x&&!G.teams[i].out){G.teams[i].out=true;if(i===ME)showElim();}});
  if(Array.isArray(d.fa))d.fa.forEach((a,i)=>{if(G.fields[i])G.fields[i].amt=a;});}

