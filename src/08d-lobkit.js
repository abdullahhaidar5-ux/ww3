/* ---------- 08d-lobkit: the shared lobby component (battle lobby now, the grand-campaign lobby 13zn-gnet next) ----------
   UI only, no sim state, no network messages. One look for every lobby: flag + nation + morale style, slot states
   (You / Friend / Computer / Empty), ready + ping tags, an invite card with a prominent "Copy invite link", a map facts
   card, join/leave toasts and a short "everyone is ready" countdown. Lobbies call LK.* and keep their own data. */
const LK=(function(){
const E=(t,c,x)=>{const d=document.createElement(t);if(c)d.className=c;if(x!=null)d.textContent=x;return d;};
const st=document.createElement('style');st.id='lkCss';st.textContent=`
.lob{gap:10px!important;border-radius:10px;padding:14px!important;animation:lkIn .25s ease-out}
@keyframes lkIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.lob .lobk{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.65}
.lkinv{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid var(--accent,#c9892a);border-radius:8px;background:linear-gradient(180deg,#c9892a14,#0000)}
.lkinv .lkr{display:flex;gap:8px;align-items:center}.lkinv input{flex:1;min-width:0;background:var(--panel,#121a16);border:1px solid var(--line,#2d4a3a);color:var(--fg,#e8efe9);padding:8px 10px;border-radius:6px;font:13px var(--mono,monospace)}
.lkinv .lkcopy{background:var(--accent,#c9892a);color:#17110a;font-weight:700;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;white-space:nowrap}
.lkinv .lkcode{background:none;border:1px solid var(--line,#2d4a3a);color:inherit;border-radius:6px;padding:7px 10px;cursor:pointer;font-size:12px}
.lkinv .lkh{font-size:12px;opacity:.7}
.lkflag{width:30px;height:18px;border-radius:2px;box-shadow:0 0 0 1px #0008;vertical-align:middle;flex:none}
.lknat{display:flex;flex-direction:column;line-height:1.15;min-width:0}.lknat b{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lknat i{font-style:normal;font-size:11px;opacity:.65}
.lkfc{display:flex;align-items:center;gap:7px;min-width:0}
.seat{border-radius:7px;transition:background .2s,border-color .2s}.seat:hover{background:#1c2a23}
.seat .tag{font-size:10px;padding:1px 7px;border-radius:9px;background:#33443b;text-transform:uppercase;letter-spacing:.06em;margin-left:6px;vertical-align:middle}
.seat .tag.you{background:#2d5a7a;color:#fff}.seat .tag.ping{background:#26352d;text-transform:none;letter-spacing:0}
.seat.open{opacity:.75;border-style:dashed}.seat.open .who{font-style:italic;opacity:.8}
.lkmap{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--line,#2d4a3a);border-radius:8px;background:#0f1713}
.lkmap .lkt{font-weight:700;font-size:14px}.lkmap .lkf{display:flex;flex-wrap:wrap;gap:6px}.lkmap .lkf span{font-size:11px;padding:2px 8px;border-radius:9px;background:#26352d}.lkmap .lkd{font-size:12px;opacity:.7}
.lkcd{display:flex;align-items:center;justify-content:center;gap:10px;padding:8px;border-radius:8px;background:#1c4a2d;border:1px solid #53e08a;font-weight:700;animation:lkIn .2s}
.lkcd button{font-size:12px;padding:3px 10px}
#lkToasts{position:fixed;right:14px;bottom:14px;z-index:900;display:flex;flex-direction:column;gap:6px;pointer-events:none}
#lkToasts div{background:#14201a;border:1px solid #3e6b52;color:#e8efe9;padding:8px 14px;border-radius:8px;font-size:13px;box-shadow:0 6px 22px #0009;animation:lkIn .2s}
.lkempty{padding:14px;text-align:center;opacity:.8;font-size:14px}.lkempty.err{color:#f0a090}
.lkempty .lkdots::after{content:'';animation:lkd 1.2s steps(4) infinite}@keyframes lkd{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
`;document.head.appendChild(st);
const K={E};
// small national flag (the same drawing the 3D flags use)
K.flag=function(f){const c=E('canvas','lkflag');c.width=60;c.height=36;try{const im=flagTex(f).image;c.getContext('2d').drawImage(im,0,0,60,36);}catch(e){const x=c.getContext('2d');x.fillStyle=(FACTIONS[f]&&FACTIONS[f].color)||'#555';x.fillRect(0,0,60,36);}return c;};
// nation name + morale style, under a flag
K.nat=function(f){const d=E('div','lknat');let ms='';try{ms=msOf(f).n;}catch(e){}d.append(E('b','',(FACTIONS[f]&&FACTIONS[f].name)||f),E('i','',ms?ms+' morale':''));return d;};
K.fac=function(f){const d=E('div','lkfc');d.append(K.flag(f),K.nat(f));return d;};
K.ping=function(){return NET.ping?E('span','tag ping','● '+Math.round(NET.ping)+' ms'):null;};
// invite card: code + one prominent "Copy invite link"
K.invite=function(code,link,text){const d=E('div','lkinv');d.append(E('div','lkh','Invite friends — send the link, or give them this code under Play online › Join by code'));
  const r=E('div','lkr');const inp=document.createElement('input');inp.readOnly=true;inp.value=link;inp.setAttribute('aria-label','Invite link');inp.onfocus=()=>inp.select();
  const b=E('button','lkcopy','Copy invite link');b.onclick=()=>copyText(text||link,b);const c=E('button','lkcode','Copy code');c.onclick=()=>copyText(String(code).toUpperCase(),c);r.append(inp,b,c);d.append(r);return d;};
// map card: name + facts from the map's own data
K.mapCard=function(mk,nn,mx){const m=MAPS[mk]||{},d=E('div','lkmap');d.append(E('div','lkt',m.name||mk));const f=E('div','lkf');
  if(m.bm&&typeof bmInfo==='function'){/* a Battle map: players, size, theme and a small picture made from the map data (drawn once per map) */
    const I=bmInfo(mk);f.append(E('span','',I.players+' players'),E('span','',I.size),E('span','',I.theme));K.pv=K.pv||{};let cv=K.pv[mk];
    if(!cv){cv=K.pv[mk]=document.createElement('canvas');cv.width=192;cv.height=132;cv.className='lkpv';cv.style.cssText='width:96px;height:66px;float:right;margin:0 0 4px 8px;border:1px solid #0006';setTimeout(()=>{try{if(typeof mapPreview==='function')mapPreview(mk,cv);}catch(e){}},40);}
    d.prepend(cv);}
  else{if(m.tag)f.append(E('span','',m.tag));f.append(E('span','',(m.min||2)+'–'+(m.max||mx||8)+' players'));}if(m.sym)f.append(E('span','',m.sym==='point'?'Symmetric starts':'Mirrored starts'));if(nn)f.append(E('span','',nn+' in this battle'));
  d.append(f);if(m.desc)d.append(E('div','lkd',m.desc));return d;};
K.empty=function(msg,err,dots){const d=E('div','lkempty'+(err?' err':''));d.append(document.createTextNode(msg));if(dots)d.append(E('span','lkdots'));return d;};
// toasts
K.toast=function(msg){let h=document.getElementById('lkToasts');if(!h){h=E('div');h.id='lkToasts';document.body.appendChild(h);}const t=E('div','',msg);h.append(t);setTimeout(()=>{t.style.transition='opacity .4s';t.style.opacity=0;setTimeout(()=>t.remove(),450);},3400);};
// who came and who went between two renders of a lobby: names = array of labels. First call just remembers.
K.watch=function(key,names){const prev=K['_w'+key];K['_w'+key]=names.slice();if(!prev)return;
  for(const n of names)if(!prev.includes(n))K.toast('➜ '+n+' joined');for(const n of prev)if(!names.includes(n))K.toast('← '+n+' left');};
K.forget=function(key){K['_w'+key]=null;};
// "everyone is ready" countdown for the leader: ok() says whether Start is still possible; go() starts the battle
K.cd={t0:0,off:0,ok:null,go:null,iv:0};
K.cdLine=function(ok,go){const C=K.cd;C.ok=ok;C.go=go;
  if(!ok()){C.t0=0;C.off=0;return null;}
  if(C.off){return null;}
  if(!C.t0)C.t0=performance.now();
  const d=E('div','lkcd');const t=E('span','','Everyone is ready — starting in 5…');t.id='lkcdt';const b=E('button','chip','Cancel');b.onclick=()=>{C.off=1;C.t0=0;d.remove();};d.append(t,b);
  if(!C.iv)C.iv=setInterval(K.cdTick,200);return d;};
K.cdTick=function(){const C=K.cd;if(!C.t0){if(C.iv&&!document.getElementById('lkcdt')){clearInterval(C.iv);C.iv=0;}return;}
  if(!C.ok||!C.ok()||!document.querySelector('.startbtn')){C.t0=0;return;}
  const left=Math.ceil(5-(performance.now()-C.t0)/1000),t=document.getElementById('lkcdt');
  if(left<=0){C.t0=0;C.off=1;try{C.go();}catch(e){}return;}
  if(t)t.textContent='Everyone is ready — starting in '+left+'…';};
return K;})();
