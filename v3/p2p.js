/* Online edition: peer-to-peer game rooms over WebRTC (PeerJS), standing in for claude.ai's room capability.
   The host's browser runs the battle; each player connects straight to it with the game code. A public PeerJS
   broker only introduces the browsers to each other. */
window.WW3_P2P=true;
(function(){
  // Connection helpers: public STUN servers find each player's address; an optional TURN relay (Settings > Online
  // relay) carries the game for players whose network blocks direct connections.
  let relay=null;try{relay=JSON.parse(localStorage.getItem('ww3_relay')||'null');}catch(e){}
  const ice=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}];
  if(relay&&relay.urls)ice.push({urls:relay.urls,username:relay.username||'',credential:relay.credential||''});
  // Built-in relay network (Metered Open Relay, free tier): when a key is set below, every player automatically gets
  // TURN relay servers, so players behind strict networks still connect, and "Hide my IP address" (Settings) can send
  // all of a player's game traffic through the relay, like a VPN for the game.
  const RELAY_APP='',RELAY_KEY='';
  // Optional second relay: Cloudflare TURN through a tiny Cloudflare Worker that hands out short-lived logins (see relay-worker.js)
  const RELAY_CF_URL='';
  let hideIp=false;try{hideIp=localStorage.getItem('ww3_hideip')==='1';}catch(e){}
  const getJ=async u=>{try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),5000);const r=await fetch(u,{signal:ctl.signal});return r.ok?await r.json():null;}catch(e){return null;}};
  async function relayServers(){const [m,c]=await Promise.all([RELAY_APP&&RELAY_KEY?getJ('https://'+RELAY_APP+'.metered.live/api/v1/turn/credentials?apiKey='+encodeURIComponent(RELAY_KEY)):null,RELAY_CF_URL?getJ(RELAY_CF_URL):null]);
    const out=[];if(Array.isArray(m))out.push(...m);if(c){const s=c.iceServers||c;if(Array.isArray(s))out.push(...s);else if(s&&s.urls)out.push(s);}return out;}
  window.WW3_RELAY_BUILTIN=!!((RELAY_APP&&RELAY_KEY)||RELAY_CF_URL);
  const OPTS=Object.assign({debug:0,config:{iceServers:ice}},window.P2P_SERVER||{});
  const rid=()=>'ww3p-'+Math.random().toString(36).slice(2,10);
  // A game room. Two independent matchmaking networks introduce the browsers: the PeerJS broker and, as a backup,
  // Trystero over public Nostr relays (hundreds of them worldwide, no account). The host listens on both; a joiner
  // tries PeerJS first and falls back to Nostr. After the introduction all traffic flows browser-to-browser.
  function namedRoom(name,forceRelay,via){
    const code=String(name).replace(/^tc-/,''),hosting=!!(NET.code&&NET.code!=='join'),hostId='ww3-'+code;
    const H={},PH=[],peers=new Map(),links=new Map();let myId=null,myPres={},peer=null,troom=null;const R={};
    const me=()=>({peer:myId,by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:myPres,updatedAt:Date.now()});
    const list=()=>[me(),...peers.values()];
    const fire=ch=>{for(const f of PH)try{f(ch);}catch(e){console.error(e);}};
    const deliver=(from,t,d)=>{for(const f of (H[t]||[]))try{f({peer:from,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,topic:t,data:d});}catch(e){console.error(e);}};
    const upd=(pid,pres,joined)=>{const p={peer:pid,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:pres||{},updatedAt:Date.now()};peers.set(pid,p);fire({peers:list(),joined:joined?[p]:[],updated:joined?[]:[p],left:[]});};
    const gone=pid=>{links.delete(pid);const p=peers.get(pid);if(!p)return;peers.delete(pid);fire({peers:list(),joined:[],updated:[],left:[p]});};
    const onMsg=(pid,m)=>{if(!m||typeof m!=='object')return;if(m.k==='e')deliver(pid,m.t,m.d);else if(m.k==='p')upd(pid,m.p,!peers.has(pid));};
    const ready=(async()=>{
      const extra=await relayServers();const cfg=Object.assign({},OPTS.config,{iceServers:(OPTS.config.iceServers||[]).concat(extra)});
      if((hideIp||forceRelay)&&(extra.length||relay))cfg.iceTransportPolicy='relay';
      const pjOpts=Object.assign({},OPTS,{config:cfg});
      // --- PeerJS transport ---
      const pjHost=()=>new Promise((res,rej)=>{let p;try{p=new Peer(hostId,pjOpts);}catch(e){rej(e);return;}peer=p;
        p.on('open',()=>{p.on('connection',c=>{c.on('open',()=>{links.set(c.peer,{buf:()=>c.dataChannel?c.dataChannel.bufferedAmount:0,send:m=>{if(c.open)c.send(m);}});if(!peers.has(c.peer))upd(c.peer,{},true);});c.on('data',m=>onMsg(c.peer,m));c.on('close',()=>gone(c.peer));c.on('error',()=>gone(c.peer));});res();});
        p.on('error',e=>{const t=e&&e.type;if(['unavailable-id','network','server-error','browser-incompatible','socket-error'].includes(t))rej(e);else console.warn('p2p',t);});
        p.on('disconnected',()=>{try{if(!p.destroyed)p.reconnect();}catch(e){}});});
      const pjJoin=()=>new Promise((res,rej)=>{let p;try{p=new Peer(rid(),pjOpts);}catch(e){rej(e);return;}peer=p;const to=setTimeout(()=>rej(Object.assign(new Error('connect timeout'),{type:'timeout'})),via?6000:14000);
        p.on('open',id=>{const c=p.connect(hostId,{reliable:true,serialization:'json'});c.on('data',m=>onMsg(hostId,m));c.on('close',()=>gone(hostId));c.on('error',()=>gone(hostId));
          c.on('open',()=>{clearTimeout(to);myId=id;links.set(hostId,{send:m=>{if(c.open)c.send(m);}});upd(hostId,{},true);res();});});
        p.on('error',e=>{const t=e&&e.type;if(['peer-unavailable','network','server-error','browser-incompatible','socket-error'].includes(t)){clearTimeout(to);rej(e);}});});
      // --- Trystero (Nostr) transport ---
      const TR=window.Trystero;const trCfg={appId:'ww3-online-v1',rtcConfig:cfg};
      const trHost=()=>{if(!TR)throw new Error('no trystero');troom=TR.joinRoom(trCfg,hostId);const [send,get]=troom.makeAction('m');
        get((m,pid)=>onMsg(pid,m));troom.onPeerJoin(pid=>{links.set(pid,{send:m=>send(m,{target:pid})});send({k:'hst'},{target:pid});if(!peers.has(pid))upd(pid,{},true);});troom.onPeerLeave(pid=>gone(pid));};
      const trJoin=()=>new Promise((res,rej)=>{if(!TR){rej(new Error('no trystero'));return;}troom=TR.joinRoom(trCfg,hostId);const [send,get]=troom.makeAction('m');let hp=null;
        const to=setTimeout(()=>rej(Object.assign(new Error('host not found'),{type:'peer-unavailable'})),via?10000:22000);
        get((m,pid)=>{if(m&&m.k==='hst'&&!hp){hp=pid;clearTimeout(to);myId=TR.selfId;links.set(hostId,{send:x=>send(x,{target:pid})});upd(hostId,{},true);res();return;}if(pid===hp)onMsg(hostId,m);});
        troom.onPeerLeave(pid=>{if(pid===hp)gone(hostId);});});
      if(hosting){myId=hostId;const r=await Promise.allSettled([pjHost(),Promise.resolve().then(trHost)]);
        if(r.every(x=>x.status==='rejected'))throw r[0].reason;if(r[0].status==='rejected'&&r[0].reason&&r[0].reason.type==='unavailable-id')throw r[0].reason;}
      else if(via==='pj'){await pjJoin();R.via='pj';}else if(via==='tr'){await trJoin();R.via='tr';}
      else{try{await pjJoin();R.via='pj';}catch(e){try{if(peer)peer.destroy();}catch(_){}peer=null;console.warn('p2p: PeerJS join failed ('+(e&&e.type||e)+'), trying the Nostr network');await trJoin();R.via='tr';}}
    })();
    Object.assign(R,{name,
      emit:(t,d)=>{const msg={k:'e',t,d};const to=d&&typeof d==='object'&&d.to;if(to&&links.has(to)){try{links.get(to).send(msg);}catch(e){}}else if(!to)for(const l of links.values())try{l.send(msg);}catch(e){}
        for(const f of (H[t]||[]))try{f({peer:myId,by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,topic:t,data:d});}catch(e){}return Promise.resolve();},
      on:(t,f)=>{(H[t]=H[t]||[]).push(f);return()=>{H[t]=(H[t]||[]).filter(x=>x!==f);};},
      presence:p=>{for(const k in p){if(p[k]===null)delete myPres[k];else myPres[k]=p[k];}const msg={k:'p',p:myPres};for(const l of links.values())try{l.send(msg);}catch(e){}return Promise.resolve();},
      buffered:to=>{const l=links.get(to);return l&&l.buf?l.buf():0;},peers:list,onPeers:f=>{PH.push(f);return()=>{};},connected:()=>!!myId,onConnection:f=>{setTimeout(()=>f(!!myId),0);return()=>{};},
      leave:()=>{try{if(peer)peer.destroy();}catch(e){}try{if(troom)troom.leave();}catch(e){}return Promise.resolve();}});
    return ready.then(()=>R,e=>{R.leave();throw e;});}
  const LOBBY={emit:()=>Promise.resolve(),on:()=>()=>{},presence:()=>Promise.resolve(),peers:()=>[],onPeers:f=>{setTimeout(()=>f({peers:[],joined:[],left:[],updated:[]}),0);return()=>{};},
    connected:()=>true,onConnection:f=>{setTimeout(()=>f(true),0);return()=>{};},
    join:async(name,o)=>{const via=o&&o.via;if(via)return namedRoom(name,false,via);try{return await namedRoom(name,false);}catch(e){if(e&&e.type==='peer-unavailable')throw e;if(window.WW3_RELAY_BUILTIN||relay){console.warn('p2p: direct connection failed, retrying through the relay');return namedRoom(name,true);}throw e;}}};
  window.claude={use:async n=>(n==='room'&&typeof Peer!=='undefined')?LOBBY:null};
})();
/* Installable app: on a website (https) the game registers a service worker so it can be installed as a desktop /
   Start-menu / home-screen app, opens instantly from then on and keeps working offline for solo play. */
(function(){
  if(location.protocol!=='https:'&&location.hostname!=='localhost')return;
  try{if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}catch(e){}
  let ev=null;const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  function btn(){let b=document.getElementById('installBtn');if(b)return b;b=document.createElement('button');b.id='installBtn';b.type='button';
    b.style.cssText='position:fixed;right:14px;top:12px;z-index:60;background:#e3b341;color:#17130a;border:0;padding:9px 14px;font:700 14px "Saira Condensed","Arial Narrow",sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.5)';
    b.textContent='⬇ Install app (desktop icon)';document.body.appendChild(b);
    b.onclick=async()=>{if(ev){ev.prompt();const r=await ev.userChoice.catch(()=>null);if(r&&r.outcome==='accepted')b.remove();ev=null;return;}
      const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);alert(ios?'On iPhone/iPad: tap the Share button, then "Add to Home Screen".':'In Chrome or Edge: open the browser menu (⋮ or …) and choose "Install World War 3" (or "Apps → Install this site as an app"). A desktop icon is created.');};
    const sync=()=>{const m=document.getElementById('menu');b.hidden=standalone()||!(m&&!m.hidden);};sync();setInterval(sync,1000);return b;}
  // First visit: a big, simple welcome card with two huge buttons (Play / Put it on my computer)
  function welcome(){try{if(localStorage.getItem('ww3_welcomed'))return;}catch(e){}if(standalone()||document.getElementById('ww3Welcome'))return;
    const w=document.createElement('div');w.id='ww3Welcome';w.setAttribute('role','dialog');w.setAttribute('aria-label','Welcome');
    w.style.cssText='position:fixed;inset:0;z-index:80;background:rgba(6,10,8,.92);display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Saira Condensed","Arial Narrow",sans-serif';
    w.innerHTML='<div style="max-width:560px;width:100%;text-align:center;color:#dde5df"><img src="icon-192.png" alt="" width="96" height="96" style="border-radius:18px"><div style="font:700 46px/1.1 Saira Condensed,Arial Narrow,sans-serif;letter-spacing:.06em;margin:10px 0 18px">WORLD WAR 3</div>'
      +'<button id="wPlay" style="display:block;width:100%;font:700 40px Saira Condensed,Arial Narrow,sans-serif;padding:18px;margin:0 0 12px;border:0;border-radius:14px;background:#74d08f;color:#0b1a10;cursor:pointer">▶ PLAY</button>'
      +'<button id="wGet" style="display:block;width:100%;font:700 30px Saira Condensed,Arial Narrow,sans-serif;padding:16px;border:0;border-radius:14px;background:#e3b341;color:#17130a;cursor:pointer">💻 PUT IT ON MY COMPUTER</button>'
      +'<div id="wHelp" style="display:none;margin-top:16px;font:24px/1.6 Saira Condensed,Arial Narrow,sans-serif;text-align:left;background:#161d1a;border:2px solid #2c3833;border-radius:12px;padding:14px 18px"></div></div>';
    document.body.appendChild(w);const done=()=>{try{localStorage.setItem('ww3_welcomed','1');}catch(e){}w.remove();};
    w.querySelector('#wPlay').onclick=done;
    w.querySelector('#wGet').onclick=async()=>{if(ev){ev.prompt();const r=await ev.userChoice.catch(()=>null);ev=null;if(r&&r.outcome==='accepted'){const h=w.querySelector('#wHelp');h.style.display='block';h.innerHTML='✅ Done! Look for the <b>WW3</b> picture on your computer. Click it any time to play.';setTimeout(done,3500);}return;}
      const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),edge=/Edg\//.test(navigator.userAgent),chrome=/Chrome\//.test(navigator.userAgent)&&!edge;const h=w.querySelector('#wHelp');h.style.display='block';
      h.innerHTML=ios?'1️⃣ Tap the <b>Share</b> button (square with arrow ⬆️)<br>2️⃣ Tap <b>Add to Home Screen</b><br>3️⃣ Tap <b>Add</b> ✅':
        edge?'1️⃣ Click the <b>…</b> at the top right<br>2️⃣ Click <b>Apps</b><br>3️⃣ Click <b>Install this site as an app</b> ✅':
        chrome?'1️⃣ Look at the top right, next to the address<br>2️⃣ Click the little <b>computer with arrow</b> 🖥️⬇️<br>3️⃣ Click <b>Install</b> ✅':
        '1️⃣ Open this page in <b>Google Chrome</b> or <b>Microsoft Edge</b><br>2️⃣ Press the yellow button again ✅';};}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;btn();});
  window.addEventListener('load',()=>setTimeout(welcome,1200));
  window.addEventListener('appinstalled',()=>{const b=document.getElementById('installBtn');if(b)b.remove();});
  window.addEventListener('load',()=>{if(!standalone())setTimeout(btn,2500);});
})();
