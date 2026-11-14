/* ---------- 08d-mplobby: the ONE online Battle lobby screen (host and guests), laid out like the Zero Hour skirmish screen ----------
   Abdullah 2026-11-14 16:51 "Do this layout for multiplayer". UI only, no sim state, no new network messages: 07-net renderLobby (leader) and
   08d-lobby glRender (guest) turn their lobby into one description D and call mplShow(D); the screen only draws it and calls back.
   Frame: title + room code (top-left) | players table Player / Colour / Nation / Team + ready marks | map preview + SELECT MAP | options row
   | lobby log + chat line | PLAY GAME (leader) or READY (guest) bottom-left, BACK bottom-right.
   Colour is the team colour (read-only swatch: the sim has no separate player colour). Chat: the lobby has no chat message yet, so the box shows the
   lobby log (joins, leaves) and its input is disabled until a chat message exists. */
const MPL={el:null,log:[],key:''};
(function(){const s=document.createElement('style');s.id='mplCss';s.textContent=`
body.mplon #menu{visibility:hidden}
#mpl{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:2vh 2vw;background:radial-gradient(ellipse at center,#0006 20%,#000d 100%);font-family:inherit;color:#e4eadf;animation:lkIn .25s ease-out}
#mpl .mfr{position:relative;display:grid;grid-template-columns:minmax(0,1.75fr) minmax(300px,1fr);grid-template-rows:auto minmax(0,1fr) auto auto;gap:14px 20px;width:min(1560px,96vw);height:min(920px,94vh);padding:22px 26px 20px;background:linear-gradient(180deg,#252a26ee,#161a17f2);border:2px solid #5b6a5c;border-radius:6px;box-shadow:0 0 0 1px #0009,0 0 22px #7fb88a55,inset 0 0 18px #7fb88a22,0 18px 60px #000c}
#mpl .mfr:before{content:"";position:absolute;inset:6px;border:1px solid #8ea88f66;border-radius:3px;pointer-events:none}
#mpl .mhd{grid-column:1/3;display:flex;align-items:baseline;gap:18px;flex-wrap:wrap}
#mpl h1{margin:0;font-size:34px;letter-spacing:.14em;font-weight:700;color:#eef3e8;text-shadow:0 0 14px #7fb88a66}
#mpl .mcode{font:700 26px var(--mono,monospace);letter-spacing:.2em;color:#e3b341}
#mpl .mnet{margin-left:auto;font-size:15px;opacity:.7}
#mpl .mleft{display:flex;flex-direction:column;gap:12px;min-height:0}
#mpl table{width:100%;border-collapse:separate;border-spacing:0 5px}
#mpl th{text-align:left;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#b9c7b6;padding:2px 10px;font-weight:600}
#mpl td{padding:7px 10px;background:#1b211d;font-size:19px;border-top:1px solid #3b4a3d;border-bottom:1px solid #3b4a3d;vertical-align:middle}
#mpl td:first-child{border-left:3px solid var(--tc,#7fb8e6);border-radius:4px 0 0 4px}#mpl td:last-child{border-right:1px solid #3b4a3d;border-radius:0 4px 4px 0;text-align:center;width:130px}
#mpl tr.me td{background:#243329;border-color:#5f8a6b}#mpl tr.open td{opacity:.7;font-style:italic}
#mpl select{font-size:17px;min-height:36px;max-width:100%;background:#101511;color:#e4eadf;border:1px solid #55685a;border-radius:4px;padding:3px 8px;color-scheme:dark}
#mpl select:disabled{opacity:1;border-color:transparent;background:transparent;appearance:none;-webkit-appearance:none;padding-left:0}
#mpl select:not(:disabled):hover,#mpl select:not(:disabled):focus{border-color:#7fb88a;box-shadow:0 0 8px #7fb88a66}
#mpl .mnm{display:flex;align-items:center;gap:10px;min-width:0}#mpl .mnm b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mpl .mtag{font-size:12px;padding:2px 8px;border-radius:9px;background:#33443b;text-transform:uppercase;letter-spacing:.06em}
#mpl .msw{display:inline-block;width:64px;height:22px;border-radius:3px;background:var(--tc);box-shadow:0 0 0 1px #000a,0 0 8px var(--tc)}
#mpl .mrd{font-size:15px;font-weight:700;letter-spacing:.05em;color:#8d9b8c}#mpl .mrd.on{color:#6fe39a}
#mpl .mopts{display:flex;flex-wrap:wrap;gap:10px 26px;align-items:center;padding:10px 14px;border:1px solid #3b4a3d;border-radius:4px;background:#141915;font-size:17px}
#mpl .mopts label{display:flex;gap:10px;align-items:center;color:#b9c7b6}#mpl .mopts b{color:#e4eadf;font-weight:600}
#mpl .mright{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto}
#mpl .mpv{border:1px solid #5b6a5c;border-radius:4px;background:#0b0f0c;padding:8px;box-shadow:inset 0 0 14px #000}
#mpl .mpv canvas{display:block;width:auto;max-width:100%;max-height:31vh;margin:0 auto;height:auto;border-radius:2px;image-rendering:auto}
#mpl .mmap{font-size:25px;font-weight:700;letter-spacing:.06em}#mpl .mmapn{font-size:17px;opacity:.75}
#mpl .mchat{grid-column:1/3;display:flex;flex-direction:column;gap:6px;min-height:0}
#mpl .mlog{height:clamp(60px,10vh,100px);overflow:auto;background:#0f130f;border:1px solid #3b4a3d;border-radius:4px;padding:8px 12px;font-size:16px;line-height:1.45;color:#c4d0c1}
#mpl .mlog div{white-space:pre-wrap}#mpl .mchat input{font-size:17px;padding:8px 12px;background:#101511;border:1px solid #3b4a3d;border-radius:4px;color:#e4eadf}
#mpl .mft{grid-column:1/3;display:flex;align-items:center;gap:16px}
#mpl .mbtn{font:700 24px inherit;font-family:inherit;letter-spacing:.14em;padding:12px 38px;min-width:230px;color:#e9efe3;background:linear-gradient(180deg,#4a5649,#2c342c);border:1px solid #8ea88f;border-radius:4px;cursor:pointer;box-shadow:0 0 0 1px #000a,inset 0 1px 0 #ffffff33}
#mpl .mbtn:hover:not(:disabled){box-shadow:0 0 0 1px #000a,0 0 16px #7fb88acc;border-color:#bfe3c5}
#mpl .mbtn:disabled{opacity:.45;cursor:default}#mpl .mbtn.on{background:linear-gradient(180deg,#2f8a52,#1c5a34)}
#mpl .mbtn.rdyok{box-shadow:0 0 0 2px #53e08a,0 0 22px #53e08a99;animation:rdyp 1.4s ease-in-out infinite}
#mpl .mbtn.sec{min-width:0;font-size:17px;letter-spacing:.08em;padding:10px 18px}
#mpl .mmid{flex:1;font-size:16px;opacity:.82;min-width:0}
#mpl .mft .mback{margin-left:auto}
#mpl .lkinv{padding:8px 10px}
`;document.head.appendChild(s);
const _t=LK.toast;LK.toast=function(m){try{mplLog(m);}catch(e){}return _t(m);};})();
function mplLog(m){MPL.log.push(String(m));if(MPL.log.length>80)MPL.log.shift();const l=document.getElementById('mplLog');if(l){const d=document.createElement('div');d.textContent=String(m);l.append(d);l.scrollTop=l.scrollHeight;}}
function mplHide(){if(MPL.el){MPL.el.remove();MPL.el=null;}MPL.key='';document.body.classList.remove('mplon');}
// "None" = a team of its own: the first team number nobody uses (4-7 first); 0-3 = Team 1-4
function mplTeam(v,all){if(v!=='n')return +v;for(const t of [4,5,6,7,0,1,2,3])if(!all.includes(t))return t;return 4;}
// D: {code, mk, mx, nn, rows:[{kind:'human'|'ai'|'open', name, you, host, f, tm, rd, d, ed:{f,t,slot}|null, pers}], all:[team numbers],
//     onMap, spots (canvas|null), w, setW, invite (element|null), net (text), notes:[text], start:{label,disabled,glow,fn,anyway,hint}|null,
//     ready:{on,fn}|null, back}
function mplShow(D){
  const E=(t,c,x)=>{const d=document.createElement(t);if(c)d.className=c;if(x!=null)d.textContent=x;return d;};
  const opt=(s,v,t)=>{const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o);};
  const prevLog=MPL.el&&MPL.el.querySelector('#mplLog'),keepTop=prevLog?prevLog.scrollTop:0;
  const fr=E('div','mfr'),hd=E('div','mhd');hd.append(E('h1','','MULTIPLAYER BATTLE'),E('span','mcode',String(D.code||'').toUpperCase()));{const n=E('span','mnet',D.net||'');n.id='cfNet';hd.append(n);}fr.append(hd);
  // ---- left: players table + options
  const L=E('div','mleft'),tb=document.createElement('table');tb.id='mplTable';tb.innerHTML='<thead><tr><th>Player</th><th>Colour</th><th>Nation</th><th>Team</th><th></th></tr></thead>';const bd=document.createElement('tbody');
  D.rows.forEach((r,i)=>{const tr=document.createElement('tr');tr.className=(r.you?'me ':'')+(r.kind==='open'?'open':'');tr.style.setProperty('--tc',TEAM_COL[((r.tm|0)+8)%8]);const td=()=>{const c=document.createElement('td');tr.append(c);return c;};
    const c1=td(),nm=E('div','mnm');
    if(r.kind==='open'){if(r.ed&&r.ed.slot){const s=document.createElement('select');s.setAttribute('aria-label','Slot '+(i+1));opt(s,'',r.ed.slotLabel||'Open');AI_LEVELS.forEach((n,d)=>opt(s,d,'AI '+n));s.value='';s.onchange=()=>{if(s.value!=='')r.ed.slot(+s.value);};nm.append(s);}else nm.append(E('b','','Open'));c1.append(nm);td().append(E('span','',''));td().append(E('span','','—'));td().append(E('span','','—'));td().append(E('span','mrd',''));bd.append(tr);return;}
    if(r.kind==='ai'){nm.append(E('span','mtag','AI'));if(r.ed&&r.ed.slot){const s=document.createElement('select');s.setAttribute('aria-label','Computer player '+(i+1));opt(s,'',"Open (remove)");AI_LEVELS.forEach((n,d)=>opt(s,d,n));s.value=String(r.d|0);s.onchange=()=>r.ed.slot(s.value===''?-1:+s.value);nm.append(s);if(r.pers)nm.append(r.pers);}else nm.append(E('b','',AI_LEVELS[r.d|0]));}
    else{nm.append(LK.flag(r.f),E('b','',r.name));if(r.you){nm.append(E('span','mtag','you'));const pg=LK.ping();if(pg)nm.append(pg);}if(r.host&&!r.you)nm.append(E('span','mtag','leader'));}
    c1.append(nm);
    const sw=E('span','msw');td().append(sw);
    const cn=td(),fs=document.createElement('select');fs.setAttribute('aria-label','Nation of '+(r.name||'player '+(i+1)));opt(fs,'rand','Random');for(const k of FKEYS)opt(fs,k,FACTIONS[k].name);fs.value=FKEYS.includes(r.f)?r.f:'rand';
    if(r.ed&&r.ed.f)fs.onchange=()=>r.ed.f(fs.value==='rand'?FKEYS[(Math.random()*FKEYS.length)|0]:fs.value);else fs.disabled=true;cn.append(fs);
    const ct=td(),ts=document.createElement('select');ts.setAttribute('aria-label','Team of '+(r.name||'player '+(i+1)));opt(ts,'n','None');for(let t=0;t<4;t++)opt(ts,t,'Team '+(t+1));ts.value=(r.tm|0)<4?String(r.tm|0):'n';
    if(r.ed&&r.ed.t)ts.onchange=()=>r.ed.t(mplTeam(ts.value,D.all));else ts.disabled=true;ct.append(ts);
    const cr=td();if(r.host)cr.append(E('span','mrd on','✔ HOST'));else if(r.kind==='ai')cr.append(E('span','mrd on','✔ READY'));else cr.append(E('span','mrd'+(r.rd?' on':''),r.rd?'✔ READY':'…'));
    bd.append(tr);});
  tb.append(bd);L.append(tb);
  const ob=E('div','mopts');ob.id='mplOpts';
  if(D.w!=null&&typeof CONDS!=='undefined'){const cur=wxBase(D.w),lab=E('label','','Conditions');
    if(D.setW){const s=document.createElement('select');s.setAttribute('aria-label','Weather and time of day');const th=condTheme(D.mk,D.w);for(const c of CONDS){opt(s,c.w,c.n);if(!condFits(c.w,th))s.lastChild.disabled=true;}s.value=String(cur);s.onchange=()=>D.setW(+s.value);lab.append(s);}
    else{const c=CONDS.find(x=>x.w===cur);lab.append(E('b','',c?c.n:'Day'));}ob.append(lab);}
  ob.append((()=>{const l=E('label','','Players');l.append(E('b','',D.nn+' / '+D.mx));return l;})());
  for(const n of D.notes||[])ob.append(E('span','',n));
  L.append(ob);fr.append(L);
  // ---- right: map
  const R=E('div','mright'),pv=E('div','mpv');let cv=D.spots;
  if(!cv){cv=document.createElement('canvas');cv.width=384;cv.height=264;setTimeout(()=>{try{mapPreview(D.mk,cv);}catch(e){}},30);}
  pv.append(cv);R.append(pv);const m=MAPS[D.mk]||{};R.append(E('div','mmap',m.name||D.mk),E('div','mmapn',(m.bm&&typeof bmInfo==='function'?(()=>{const I=bmInfo(D.mk);return I.players+' players · '+I.size+' · '+I.theme;})():(m.min||2)+'–'+(m.max||D.mx)+' players')));
  if(D.onMap){const b=E('button','mbtn sec','SELECT MAP');b.id='mplSelMap';b.onclick=D.onMap;R.append(b);}
  if(D.spotNote)R.append(E('div','mmapn',D.spotNote));
  if(D.invite)R.append(D.invite);
  fr.append(R);
  // ---- chat / lobby log
  const C=E('div','mchat'),lg=E('div','mlog');lg.id='mplLog';for(const x of MPL.log)lg.append(E('div','',x));const ci=document.createElement('input');ci.disabled=true;ci.placeholder='Chat: coming with the next online update. Joins and leaves show above.';ci.setAttribute('aria-label','Lobby chat');C.append(lg,ci);fr.append(C);
  // ---- footer
  const ft=E('div','mft');let play=null;
  if(D.start){play=E('button','mbtn'+(D.start.glow?' rdyok':''),D.start.label||'PLAY GAME');play.id='mplPlay';play.disabled=!!D.start.disabled;play.onclick=D.start.fn;ft.append(play);if(D.start.anyway){const a=E('button','mbtn sec','START ANYWAY');a.onclick=D.start.anyway;a.title='Start without waiting for everybody to press Ready';ft.append(a);}}
  else if(D.ready){play=E('button','mbtn'+(D.ready.on?' on':''),D.ready.on?'✔ READY':'READY');play.id='mplReady';play.onclick=D.ready.fn;ft.append(play);}
  ft.append(E('div','mmid',D.start?D.start.hint||'':'Pick your nation and team, then press READY. The leader starts the battle.'));
  const bk=E('button','mbtn mback','BACK');bk.id='mplBack';bk.onclick=D.back;ft.append(bk);fr.append(ft);
  if(!MPL.el){MPL.el=document.createElement('div');MPL.el.id='mpl';document.body.appendChild(MPL.el);}
  document.body.classList.add('mplon');MPL.el.innerHTML='';MPL.el.append(fr);lg.scrollTop=keepTop&&prevLog&&prevLog.scrollTop+prevLog.clientHeight<prevLog.scrollHeight-4?keepTop:lg.scrollHeight;
  return {play,foot:ft};
}
// the screen goes away with the lobby (left, started, connection gone) or when the menu closes
setInterval(()=>{if(!MPL.el)return;try{const in_=MODE==='single'&&NET.game&&(NET.code||NET.cf)&&!(typeof GLB!=='undefined'&&GLB.landing&&!GLB.el);if(!in_||$('menu').hidden)mplHide();}catch(e){}},400);
