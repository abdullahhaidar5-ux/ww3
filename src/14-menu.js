/* ---------- MENU v3: title screen + one job per screen (Abdullah 2026-11-06 20:12 "Ugly ugly ugly", 20:14 "You can transition between
   windows and screens not everything has to be shoved into a single screen with big ugly button"). View-only: no sim state, nothing
   saved or synced. Loaded LAST so every module that injects menu controls (save, replay, grand, campaign, editor) has already run.
   It does not rebuild any control: it MOVES the existing nodes (#pickP, #pickMap, #teamList, #aiN, #diff, #wx, #ssnRow, #gdocSel,
   #games, #playOnline …) into screens, so every handler, id and rule keeps working; the old card stays in the page, hidden, as the
   parking spot for what the title does not show (its buttons are clicked by the new items). #menu.hidden still means "no menu".
   Recipe for a new screen: orch/HOWTO.md "Add a menu screen". ---------- */
const MX={stack:['title'],cur:'title',screens:{},busy:0,thumbQ:[],thumbs:{},natQ:''};
const MX_STEPS=[['c-map','Battlefield'],['c-nation','Nation'],['c-players','Players'],['c-opts','Battle options']];
const MX_TITLES={'title':'','c-map':'Conquest','c-nation':'Conquest','c-players':'Conquest','c-opts':'Conquest','single':'Single player','online':'Multiplayer','extras':'Extras','credits':'Credits'};
function mxEl(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function mxClick(id){const e=document.getElementById(id);if(e){try{initAudio();}catch(_){}e.click();}}
function mxTick(f){try{sfxUI(f);}catch(_){}}
function mxCss(){const s=document.createElement('style');s.id='mxCss';s.textContent=`
#menu.m3{background:#05080a;display:block;padding:0;overflow:hidden;z-index:20}
#menu.m3>.card{display:none}
#mx{position:absolute;inset:0;font-family:var(--display);color:var(--fg);user-select:none}
#mxbg{position:absolute;inset:-3%;background:#0a0f0d center/cover no-repeat;animation:mxpan 70s ease-in-out infinite alternate;filter:saturate(1.2) brightness(.8) contrast(1.1)}
#mxwt{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .9s}
#mxwt.on{opacity:1}
#mx.wt #mxbg{filter:saturate(1.1) brightness(.95)}
#mx.wt #mxfade{background:radial-gradient(120% 105% at 68% 48%,rgba(5,8,10,0),rgba(5,8,10,.72) 92%),linear-gradient(90deg,rgba(5,8,10,.93),rgba(5,8,10,.55) 42%,rgba(5,8,10,.08) 72%)}
.mxwtl{position:absolute;transform:translate(-50%,-50%);pointer-events:none;opacity:0;transition:opacity .9s .3s;text-align:center;white-space:nowrap}
#mxwt.on~.mxwtl{opacity:1}
.mxwtl.bat{transform:translate(-50%,-14px);font:500 11px var(--mono);color:#f2f4ec;text-shadow:0 1px 4px #000}
.mxwtl.bat svg{display:block;margin:0 auto 4px;width:28px;height:28px;filter:drop-shadow(0 1px 3px #000)}
.mxwtl.bat b{display:block;font:700 16px var(--display);letter-spacing:.12em;text-transform:uppercase;color:#ffd666}
#mxwar{position:absolute;right:clamp(24px,5vw,72px);bottom:58px;text-align:right;pointer-events:none;white-space:nowrap;text-shadow:0 1px 6px #000,0 0 18px rgba(0,0,0,.8)}
@media (max-width:1100px){#mxwar{display:none}}
#mxwar i{display:block;font:500 11px var(--mono);font-style:normal;letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}
#mxwar b{display:block;font:700 24px/1.2 var(--display);letter-spacing:.1em;text-transform:uppercase;color:#f2f4ec;margin:3px 0 2px}
#mxwar span{display:block;font:400 12px var(--mono);color:#c3cdc6}
@keyframes mxpan{from{transform:scale(1.02) translate3d(-1%,0,0)}to{transform:scale(1.12) translate3d(1.5%,-1%,0)}}
#mxfade{position:absolute;inset:0;background:radial-gradient(130% 100% at 70% 45%,rgba(5,8,10,.35),rgba(5,8,10,.85) 85%),linear-gradient(90deg,rgba(5,8,10,.9),rgba(5,8,10,.55) 60%,rgba(5,8,10,.4))}
#mxtop{position:absolute;left:0;right:0;top:0;height:64px;display:flex;align-items:center;gap:18px;padding:0 clamp(24px,5vw,72px);z-index:3}
#mxtop[hidden]{display:none!important}
.mxback{font:600 17px var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--dim);background:none;border:0;padding:6px 2px;cursor:pointer}
.mxback:hover{color:var(--accent)}
#mxcrumb{display:flex;gap:6px;align-items:baseline;font:600 17px var(--display);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
#mxcrumb b{color:var(--fg);font-weight:700}#mxcrumb i{opacity:.4;font-style:normal}
#mxcrumb button{font:inherit;letter-spacing:inherit;text-transform:inherit;background:none;border:0;color:var(--dim);padding:4px 2px;cursor:pointer}
#mxcrumb button:hover{color:var(--fg)}#mxcrumb button.cur{color:var(--accent);cursor:default}
#mxbody{position:absolute;left:0;right:0;top:64px;bottom:0;overflow:hidden}
.ms{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;padding:12px clamp(24px,5vw,72px) 96px;opacity:0;visibility:hidden;transform:translate3d(28px,0,0);transition:opacity .2s ease,transform .2s ease,visibility 0s .2s}
.ms.on{opacity:1;visibility:visible;transform:none;transition:opacity .2s ease,transform .2s ease}
.ms.left{transform:translate3d(-28px,0,0)}
.ms::-webkit-scrollbar{width:8px}.ms::-webkit-scrollbar-thumb{background:#2c3833}
.mxh{margin:4px 0 4px;font:700 clamp(34px,4.4vw,52px)/1 var(--display);letter-spacing:.03em;text-transform:uppercase}
.mxsub{margin:0 0 22px;color:var(--dim);font:400 14px var(--mono);max-width:70ch}
.mxfoot{position:fixed;left:0;right:0;bottom:0;display:flex;gap:26px;align-items:center;justify-content:flex-end;padding:44px clamp(24px,5vw,72px) 18px;background:linear-gradient(0deg,rgba(5,8,10,.97) 45%,rgba(5,8,10,0));z-index:2;pointer-events:none}
.mxfoot>*{pointer-events:auto}
.mxlink{background:none;border:0;color:var(--dim);font:600 17px var(--display);letter-spacing:.12em;text-transform:uppercase;cursor:pointer;padding:8px 2px}
.mxlink:hover:not(:disabled){color:var(--fg)}.mxlink:disabled{opacity:.35;cursor:not-allowed}
.mxgo{background:none;border:1px solid var(--accent);color:var(--accent);font:700 19px var(--display);letter-spacing:.16em;text-transform:uppercase;padding:10px 30px;cursor:pointer;transition:background .15s,color .15s}
.mxgo:hover:not(:disabled){background:var(--accent);color:#14110a}.mxgo:disabled{opacity:.35;cursor:not-allowed}
/* title */
#ms-title{display:flex;flex-direction:column;justify-content:center;padding-bottom:40px}
#mxlogo{font:700 clamp(64px,9.4vw,150px)/.86 var(--display);letter-spacing:.015em;text-transform:uppercase;margin:0 0 6px;text-shadow:0 6px 40px rgba(0,0,0,.7)}
#mxlogo span{color:var(--accent)}
#mxtag{color:var(--dim);font:400 14px var(--mono);letter-spacing:.04em;margin:0 0 clamp(18px,4.5vh,44px)}
#mxmenu{display:flex;flex-direction:column;gap:1px;align-items:flex-start}
.mxi{position:relative;background:none;border:0;border-left:2px solid transparent;color:#b6c2bb;font:600 clamp(22px,2.9vh,30px)/1.25 var(--display);letter-spacing:.14em;text-transform:uppercase;padding:2px 0 2px 16px;cursor:pointer;text-align:left;transition:color .12s,transform .12s,border-color .12s}
.mxi:hover,.mxi:focus-visible{color:#fff;border-left-color:var(--accent);transform:translateX(8px);outline:0}
.mxi small{display:block;font:400 12px var(--mono);letter-spacing:.02em;text-transform:none;color:var(--accent);opacity:.9}
.mxi.sep{margin-top:clamp(8px,2vh,22px)}.mxi.dim{font-size:clamp(17px,2.2vh,22px);color:#7d8c85}
#mxver{position:absolute;right:clamp(24px,5vw,72px);bottom:18px;color:#5d6b64;font:400 12px var(--mono)}
/* map cards */
.mxgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.mxmap{background:rgba(14,19,17,.72);border:1px solid var(--line);cursor:pointer;display:flex;flex-direction:column;text-align:left;color:inherit;padding:0;transition:transform .15s,border-color .15s,background .15s}
.mxmap:hover,.mxmap:focus-visible{transform:translateY(-3px);border-color:var(--fg);outline:0}
.mxmap.on{border-color:var(--accent);background:rgba(34,30,14,.8)}
.mxmap canvas{width:100%;aspect-ratio:32/22;display:block;background:#101815;border-bottom:1px solid var(--line)}
.mxmap .t{padding:10px 14px 2px;font:700 23px var(--display);letter-spacing:.05em;text-transform:uppercase}
.mxmap .f{padding:0 14px;color:var(--accent);font:500 12px var(--mono)}
.mxmap .d{padding:4px 14px 14px;color:var(--dim);font:400 12px/1.5 var(--mono)}
/* nation cards */
.mxnat{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:36px;align-items:start}
#mxnatin{width:260px;background:rgba(14,19,17,.7);border:1px solid var(--line);color:var(--fg);padding:8px 12px;font:15px var(--mono);margin:0 0 14px}
#menu.m3 #pickP{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;max-height:none;overflow:visible;padding:0}
#menu.m3 #pickP .fac{background:rgba(14,19,17,.72);border:1px solid var(--line);padding:6px 10px;align-items:center;gap:10px;color:var(--fg);font-family:var(--display);transition:border-color .12s,transform .12s;min-height:52px}
#menu.m3 #pickP .fac:hover{border-color:var(--fg);transform:translateY(-2px)}
#menu.m3 #pickP .fac.on{grid-column:auto!important;border-color:var(--accent);background:rgba(34,30,14,.8)}
#menu.m3 #pickP .fac .nm{font:700 19px var(--display);letter-spacing:.05em;text-transform:uppercase}
#menu.m3 #pickP .fac .dc,#menu.m3 #pickP .fac .sp,#menu.m3 #pickP .fac .sw,#menu.m3 #pickP .fac .full{display:none!important}
#mxdet{position:sticky;top:0;background:rgba(14,19,17,.8);border:1px solid var(--line);padding:18px 20px;min-height:260px}
#mxdet h3{margin:0 0 2px;font:700 32px var(--display);letter-spacing:.05em;text-transform:uppercase}
#mxdet .a{color:var(--accent);font:500 12px var(--mono);margin-bottom:12px}
#mxdet p{margin:0 0 10px;color:#b9c5be;font:400 12.5px/1.55 var(--mono)}#mxdet .s{color:var(--info)}#mxdet .w{color:var(--warn)}
/* players */
.mxpl{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,520px);gap:44px;align-items:start}
.mxrow{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:0 0 16px}
.mxlab{font:600 13px var(--display);letter-spacing:.18em;text-transform:uppercase;color:var(--dim);min-width:130px}
#menu.m3 .seg button{background:rgba(14,19,17,.7);border:1px solid var(--line);color:#b6c2bb;font:600 16px var(--display);letter-spacing:.08em;padding:6px 16px;transition:border-color .12s,color .12s}
#menu.m3 .seg button:hover:not(:disabled){border-color:var(--fg);color:#fff}
#menu.m3 .seg button.on{border-color:var(--accent);color:var(--accent);background:rgba(34,30,14,.8)}
#menu.m3 select{background:rgba(14,19,17,.85);color:var(--fg);border:1px solid var(--line);padding:6px 8px;font:14px var(--mono)}
#menu.m3 #teamList{display:flex;flex-direction:column;gap:6px}
#menu.m3 #teamList .trow{display:flex;gap:10px;align-items:center;background:rgba(14,19,17,.72);border:1px solid var(--line);padding:10px 14px;font:600 20px var(--display);letter-spacing:.06em;text-transform:uppercase}
#menu.m3 #teamList .trow>span{flex:1 1 auto;min-width:0}#menu.m3 #teamList .trow select{width:auto;flex:none}
#menu.m3 .presets{margin-top:6px}#menu.m3 .chip{background:none;border:1px solid var(--line);color:var(--dim);font:600 14px var(--display);letter-spacing:.08em;text-transform:uppercase;padding:4px 12px}
#menu.m3 .chip:hover{border-color:var(--fg);color:var(--fg)}
#menu.m3 .mapsel{max-width:none;background:rgba(14,19,17,.72);grid-template-columns:1fr}
#menu.m3 .mapsel .dc{color:var(--dim);font:400 12px/1.5 var(--mono)}
.mxplus{background:none;border:1px dashed var(--line);color:var(--dim);font:600 17px var(--display);letter-spacing:.12em;text-transform:uppercase;padding:8px 16px;cursor:pointer}
.mxplus:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}.mxplus:disabled{opacity:.35;cursor:not-allowed}
/* battle options */
.mxopt{margin:0 0 30px;max-width:860px}
.mxopt h3{margin:0 0 2px;font:700 24px var(--display);letter-spacing:.1em;text-transform:uppercase;color:var(--fg)}
.mxopt p{margin:0 0 10px;color:var(--dim);font:400 12.5px/1.5 var(--mono)}
#menu.m3 #gdocSel{margin:0;gap:8px}#menu.m3 #gdocSel>span{display:none}
#menu.m3 #gdocSel button{min-height:0!important;padding:6px 16px!important;border-radius:0!important;border:1px solid var(--line)!important;background:rgba(14,19,17,.7)!important;color:#b6c2bb!important;font:600 16px var(--display)!important;letter-spacing:.08em;cursor:pointer}
#menu.m3 #gdocSel button:hover{border-color:var(--fg)!important;color:#fff!important}
#menu.m3 #gdocSel button[style*="rgb(74, 90, 56)"]{border-color:var(--accent)!important;color:var(--accent)!important;background:rgba(34,30,14,.8)!important}
/* online / extras / credits */
#menu.m3 #ms-online .mode{background:none;border:0;padding:0;max-width:760px}#menu.m3 #ms-online .mode h2,#menu.m3 #ms-online #edBtn{display:none}
#menu.m3 #ms-online .big{background:none;border:1px solid var(--accent);color:var(--accent);font:700 22px var(--display);letter-spacing:.16em;padding:10px 30px;align-self:flex-start}
#menu.m3 #ms-online .big:hover:not(:disabled){background:var(--accent);color:#14110a}
#menu.m3 #ms-online .big.ghost{border-color:var(--line);color:var(--dim);font-size:16px;padding:7px 16px}
#menu.m3 #ms-online .big.ghost:hover:not(:disabled){background:none;border-color:var(--fg);color:var(--fg)}
#menu.m3 #ms-online input{background:rgba(14,19,17,.85);color:var(--fg);border:1px solid var(--line);padding:8px 10px;font:14px var(--mono)}
#menu.m3 #ms-online .label{margin-top:22px}
.mxlist .mxi.on{color:#fff;border-left-color:var(--accent)}.mxolgo{margin:14px 0 8px;min-height:44px}.mxolnote{color:var(--dim);font:400 13px var(--mono)}
#ms-online #mxolg{margin-bottom:6px}
.mxlist{display:flex;flex-direction:column;align-items:flex-start;gap:0}
.mxcred{max-width:860px}.mxcred p{margin:0 0 12px;color:#8a9a92;font:400 12px/1.6 var(--mono);max-width:none}
#ms-online .gnrow{display:none!important}   /* campaign rows stay out of the open-games list while the campaign is paused (2026-11-13); a campaign link or code still joins */
@media (max-width:1100px){.mxnat,.mxpl{grid-template-columns:1fr}#mxdet{position:static}}
`;document.head.appendChild(s);}
function mxModeName(){return typeof setup!=='undefined'&&setup.mode==='battle'?'Battle':'Conquest';}
/* The two skirmish modes share the setup screens (battlefield, nation, players, options); this retitles them for the mode chosen on the main menu. */
function mxSetMode(m){const was=typeof setup!=='undefined'?setup.mode:'';if(typeof setup!=='undefined')setup.mode=m==='battle'?'battle':'conquest';const B=m==='battle',nm=mxModeName();
  /* each game has its own map list (Battle maps / Conquest battlefields): rebuild the list when the game changes */
  {const ms=document.getElementById('mapSel'),L=typeof mapListKeys==='function'?mapListKeys():null;if(ms&&L&&(was!==setup.mode||(ms.options[0]||{}).value!==L[0]))try{if(typeof mapCards==='function')mapCards();if(typeof mxMapCards==='function')mxMapCards();if(typeof renderTeams==='function')renderTeams();}catch(e){}}
  const sub=(id,t)=>{const e=document.querySelector('#ms-'+id+' .mxsub');if(e)e.textContent=t;};
  sub('c-map',B?'Battle: a Command Center, a dozer and supply trucks - build your base and fight like Generals. Battle has its own maps: supply sources near every base, oil derricks to fight over, at least two attack routes.':'Conquest: towns pay the tax, a full base from the start. Every map has at least two real attack routes.');
  for(const b of [MX.startP,MX.startO])if(b)b.textContent='Start '+nm.toLowerCase();
  {const hm=document.querySelector('#ms-c-map .mxh');if(hm)hm.textContent=B?'Choose a Battle map':'Choose a battlefield';}
  const h=document.querySelector('#ms-c-opts .mxh');if(h)h.textContent=nm+' options';}
function mxBuild(){
  const m=document.getElementById('menu');if(!m||document.getElementById('mx'))return;mxCss();m.classList.add('m3');
  const card=m.querySelector('.card'),g=id=>document.getElementById(id);
  const mx=mxEl('div');mx.id='mx';const bg=mxEl('div');bg.id='mxbg';try{bg.style.backgroundImage='url(art/menu-bg.jpg)';}catch(_){}
  const fade=mxEl('div');fade.id='mxfade';
  const top=mxEl('div');top.id='mxtop';top.hidden=true;const bk=mxEl('button','mxback','‹ Back');bk.type='button';bk.title='One step back (Esc)';bk.onclick=menuBack;const cr=mxEl('div');cr.id='mxcrumb';top.append(bk,cr);
  const body=mxEl('div');body.id='mxbody';mx.append(bg,fade,top,body);m.appendChild(mx);
  const scr=(id,html)=>{const s=mxEl('section','ms');s.id='ms-'+id;if(html)s.innerHTML=html;body.appendChild(s);MX.screens[id]=s;return s;};
  const foot=(s,...k)=>{const f=mxEl('div','mxfoot');f.append(...k);s.appendChild(f);return f;};
  const go=(t,fn,cls)=>{const b=mxEl('button',cls||'mxgo',t);b.type='button';b.onclick=fn;return b;};
  /* --- title --- */
  const T=scr('title');T.innerHTML='<h1 id="mxlogo">World War <span>3</span></h1><p id="mxtag">Real-time modern warfare, from one battle to the whole world.</p>';
  const menu=mxEl('div');menu.id='mxmenu';T.appendChild(menu);
  const item=(t,fn,cls,tip)=>{const b=mxEl('button','mxi'+(cls?' '+cls:''),t);b.type='button';b.onclick=()=>{mxTick(660);fn();};b.onmouseenter=()=>mxTick(520);if(tip)b.title=tip;menu.appendChild(b);return b;};
  MX.cont=item('',()=>mxClick('svContinue'),'','Pick up where you left off: your latest Conquest or Battle');MX.cont.hidden=true;
  item('Single player',()=>menuGo('single'),'','Conquest, Battle, missions and the tutorial');
  item('Multiplayer',()=>menuGo('online'),'','Play online with friends: Conquest or Battle');
  item('Test range',()=>mxClick('sandbox'),'','Unlimited money and every unit against a passive target');
  item('Settings',()=>mxClick('openSettings'),'sep dim','Graphics, sound and mouse');
  item('Extras',()=>menuGo('extras'),'dim','Replays, encyclopedia, medals, map editor and more');
  item('Credits',()=>menuGo('credits'),'dim');
  const ver=mxEl('div');ver.id='mxver';ver.textContent='WORLD WAR 3';T.appendChild(ver);
  /* --- conquest 1: battlefield --- */
  const M=scr('c-map','<h2 class="mxh">Choose a battlefield</h2><p class="mxsub">Every map has at least two real attack routes. Click one to continue.</p>');
  MX.grid=mxEl('div','mxgrid');M.appendChild(MX.grid);
  foot(M,go('Random battlefield',()=>{const b=g('pickMap')&&g('pickMap').querySelector('.rndmap');if(b)b.click();mxMapMark();menuGo('c-nation');},'mxlink'),go('Next: Nation →',()=>menuGo('c-nation')));
  /* --- conquest 2: nation --- */
  const N=scr('c-nation','<h2 class="mxh">Choose your nation</h2><p class="mxsub">Hover a nation to see its doctrine, morale style and strike. Click to choose.</p>');
  const nw=mxEl('div','mxnat'),nl=mxEl('div');const inp=mxEl('input');inp.id='mxnatin';inp.placeholder='Find a nation…';inp.autocomplete='off';inp.spellcheck=false;inp.oninput=mxNatFilter;
  nl.append(inp,g('pickP'));const det=mxEl('div');det.id='mxdet';nw.append(nl,det);N.appendChild(nw);
  const pp=g('pickP');pp.addEventListener('mouseover',e=>{const f=e.target.closest&&e.target.closest('.fac');if(f)mxNatShow(f);});pp.addEventListener('mouseleave',()=>mxNatShow());
  pp.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.fac')){mxTick(700);setTimeout(()=>{if(MX.cur==='c-nation')menuGo('c-players');},160);}},false);
  foot(N,go('Next: Players →',()=>menuGo('c-players')));
  /* --- conquest 3: players --- */
  const P=scr('c-players','<h2 class="mxh">Players</h2><p class="mxsub">You against the computer. Change teams to play co-op or free-for-all; click a numbered spot on the map to choose where a side starts.</p>');
  const pw=mxEl('div','mxpl'),pl=mxEl('div'),pr=mxEl('div');
  const r1=mxEl('div','mxrow');r1.append(mxEl('div','mxlab','Main opponent'),g('aiFac'));
  const r2=mxEl('div','mxrow');MX.cnt=mxEl('div','mxlab','Computers');const add=mxEl('button','mxplus','＋ Add computer player'),rem=mxEl('button','mxplus','－ Remove');add.type=rem.type='button';
  const aiStep=d=>{const bs=[...g('aiN').querySelectorAll('button')],i=bs.findIndex(b=>b.classList.contains('on')),n=bs[i+d];if(n&&!n.disabled){n.click();mxTick(760);}mxPlayersSync();};add.onclick=()=>aiStep(1);rem.onclick=()=>aiStep(-1);MX.add=add;MX.rem=rem;r2.append(MX.cnt,add,rem);
  const r3=mxEl('div','mxrow');r3.append(mxEl('div','mxlab','Difficulty'),g('diff'));
  pl.append(r1,r2,r3,g('teamList'));const th=mxEl('p','mxsub','Players on the same team are allies: they share vision, never fight each other and win together.');th.style.marginTop='14px';pl.appendChild(th);
  pr.append(g('pickMap'));pw.append(pl,pr);P.appendChild(pw);
  MX.startP=go('Start battle',()=>mxClick('start'));foot(P,go('Battle options →',()=>menuGo('c-opts'),'mxlink'),MX.startP);
  /* --- conquest 4: battle options --- */
  const O=scr('c-opts','<h2 class="mxh">Battle options</h2><p class="mxsub">Optional. The defaults are a good fight; start any time from the Players screen.</p>');
  const opt=(h,p,el)=>{const d=mxEl('div','mxopt');d.append(mxEl('h3','',h),mxEl('p','',p),el);O.appendChild(d);};
  opt('Doctrine','Your general’s battle doctrine: a free bonus for the whole battle. Or pick it in the first 2 minutes.',g('gdocSel'));
  opt('Conditions','Time of day and weather. Low sun, dusk and night change what you can see and how far.',g('wx'));
  opt('Season','Mud slows wheels, snow slows infantry. Roads matter more.',g('ssnRow'));
  {const r=mxEl('div','seg');r.id='balRow';[['Balanced',0],['Realistic',1]].forEach(([t,v])=>{const b=mxEl('button','',t);b.onclick=()=>{setup.real=v;r.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));};if(!!setup.real===!!v)b.classList.add('on');r.appendChild(b);});opt('Balance','Balanced: every nation equally strong - the default. Realistic: each nation starts like its real 2026 military, but the game stays fair. Big powers start rich with tanks and strong air and missile support, but their units cost more and train slowly. Small nations and the Zealous factions start with many cheap infantry and AT teams, recruit fast and fortify cheaply at home. The host sets it for a multiplayer battle.',r);
    const rs=mxEl('div','');rs.style.cssText='font-size:12px;opacity:.8;margin-top:4px;max-width:520px';const fill=()=>{rs.textContent=setup.real?[setup.p].concat(setup.a?[setup.a]:[]).filter(f=>FACTIONS[f]).map(f=>FACTIONS[f].name+' - '+realLine(f)).join('  ·  '):'';};r.addEventListener('click',()=>setTimeout(fill,0));r.addEventListener('mouseenter',fill);r.after(rs);fill();}
  MX.startO=go('Start battle',()=>mxClick('start'));foot(O,MX.startO);
  /* --- single player (Abdullah 2026-11-07 21:41 "There's a single player window or section and then multiplayer and test range") --- */
  const SP=scr('single','<h2 class="mxh">Single player</h2><p class="mxsub">Two games. Pick one.</p>');const sl=mxEl('div','mxlist');SP.appendChild(sl);
  const sitem=(t,d,fn,cls)=>{const b=mxEl('button','mxi'+(cls?' '+cls:''));b.type='button';b.append(t,mxEl('small','',d));b.onclick=()=>{mxTick(660);fn();};b.onmouseenter=()=>mxTick(520);sl.appendChild(b);return b;};
  sitem('Conquest','Take towns and collect their tax, destroy the enemy base - a full base and $10,000 from the start',()=>{mxSetMode('conquest');menuGo('c-map');});
  sitem('Battle','Generals-style skirmish: Command Center, supply trucks, tech up, destroy every enemy building',()=>{mxSetMode('battle');menuGo('c-map');});
  sitem('Missions','The story missions',()=>mxClick('campaign'),'dim sep');
  sitem('Tutorial','First time? A guided 10-minute battle',()=>mxClick('tutorial'),'dim');
  sitem('Battle tutorial','First time in Battle? Supply Depot, Barracks, War Factory, attack',()=>{try{initAudio();startBattleTutorial();}catch(e){console.warn(e);}},'dim');
  sitem('Load game','Load a saved battle',()=>mxClick('svLoadBtn'),'dim');
  /* --- play online --- */
  const OL=scr('online','<h2 class="mxh">Multiplayer</h2><p class="mxsub">One place to play online. Choose the game, then start one or join a friend: open games and invite codes or links for both are below.</p>');
  const gl=mxEl('div','mxlist');gl.id='mxolg';OL.appendChild(gl);MX.olBtns={};
  const gitem=(k,t,d)=>{const b=mxEl('button','mxi');b.type='button';b.dataset.g=k;b.append(t,mxEl('small','',d));b.onclick=()=>{mxTick(660);mxOnline(k);};b.onmouseenter=()=>mxTick(520);gl.appendChild(b);MX.olBtns[k]=b;};
  gitem('conquest','Conquest','Towns, tax and a full base for everyone');
  gitem('battle','Battle','Generals-style: Command Center, supply trucks, tech tree');
  MX.olGo=mxEl('div','mxolgo');OL.appendChild(MX.olGo);
  const mp=[...card.querySelectorAll('.mode')].find(x=>x.querySelector('#playOnline'));if(mp)OL.appendChild(mp);
  {const lb=OL.querySelector('.label');if(lb)lb.textContent='Open games';const jc=OL.querySelector('#jcode');if(jc)jc.placeholder='Game code or invite link';}
  /* --- extras --- */
  const E=scr('extras','<h2 class="mxh">Extras</h2><p class="mxsub">The Grand campaign preview (paused), practice, review and reference.</p>');const el=mxEl('div','mxlist');E.appendChild(el);
  const ex=(t,fn,tip)=>{const b=mxEl('button','mxi',t);b.type='button';b.onclick=()=>{mxTick(660);fn();};b.onmouseenter=()=>mxTick(520);if(tip)b.title=tip;el.appendChild(b);};
  const byText=t=>()=>{const b=[...card.querySelectorAll('button')].find(x=>(x.textContent||'').trim().toLowerCase().replace(/\u2019/g,"'")===t);if(b){try{initAudio();}catch(_){}b.click();}};
  {const b=mxEl('button','mxi');b.type='button';b.append('Grand campaign (preview, paused)',mxEl('small','','In development - Conquest and Battle come first.'));b.onclick=()=>{mxTick(660);mxClick('grandBtn');};b.onmouseenter=()=>mxTick(520);el.appendChild(b);}ex('Watch a replay',()=>mxClick('rpOpen'),'Open a replay file');ex('Map editor',()=>mxClick('edBtn'),'Draw your own battlefield');
  ex('My battles',()=>mxClick('openMyb'));ex('Encyclopedia',()=>mxClick('openEnc'));ex('Unit guide',byText('unit guide'));ex('Medals',byText('medals'));ex('Profile',byText('profile'));ex('What’s new',byText('what’s new')||byText("what's new"));ex('Report a problem',()=>mxClick('rpMenu'),'Opens a pre-filled bug report');ex('Playtest card',()=>{if(typeof wwPlaytest==='function')wwPlaytest();},'Ten new things to try this week - thumbs up or down, a short note, save the file');
  /* --- credits --- */
  const C=scr('credits','<h2 class="mxh">Credits</h2><p class="mxsub">Free art, sound and music only, every author credited.</p>');const cw=mxEl('div','mxcred');for(const p of card.querySelectorAll('p.credits'))cw.appendChild(p);C.appendChild(cw);
  /* --- wiring --- */
  document.addEventListener('keydown',mxKey,true);
  new MutationObserver(()=>{if(!m.hidden)mxShown();}).observe(m,{attributes:true,attributeFilter:['hidden']});
  setInterval(mxPoll,500);
  MX.screens.title.classList.add('on');mxShown(true);}
/* Multiplayer: which game the online screen is set for. Campaign opens the one campaign lobby (gnet); Conquest/Battle use the shared battle lobby. */
function mxOnline(k){if(k==='campaign'||k==='conquest'||k==='battle'){MX.olG=k;if(k==='campaign'&&MX.cur!=='online')MX.campOnce=1;}k=MX.olG||'conquest';
  if(k!=='campaign')mxSetMode(k);
  for(const g in MX.olBtns)MX.olBtns[g].classList.toggle('on',g===k);
  const po=document.getElementById('playOnline'),h=document.getElementById('host');
  const cb=MX.olGo;if(cb){cb.innerHTML='';
    if(k==='campaign'){const b=mxEl('button','big','Create a campaign lobby');b.type='button';b.id='mxCampNew';b.onclick=()=>{mxTick(660);try{GNT.wantHost=1;grandSetup();}catch(e){console.warn(e);}};cb.append(b,mxEl('span','mxolnote','  Pick a scenario and your nation, then share the code or link. Or join a campaign below.'));}
    else cb.append(mxEl('span','mxolnote','Start a '+mxModeName()+' game below, or join one that is open.'));}
  if(po)po.hidden=k==='campaign'||!!(typeof NET!=='undefined'&&(NET.code||NET.game));if(h)h.hidden=k==='campaign'||!!(typeof NET!=='undefined'&&(NET.code||NET.game));
  if(MX.cur!=='online')menuGo('online');}
function mxMapCards(){
  const g=MX.grid,sel=document.getElementById('mapSel');if(!g||!sel)return;g.innerHTML='';
  for(const o of sel.options){const k=o.value,D=(typeof MAPS!=='undefined'&&MAPS[k])||null;const b=mxEl('button','mxmap'+(k===sel.value?' on':''));b.type='button';b.dataset.k=k;
    let cv=MX.thumbs[k];if(!cv){cv=document.createElement('canvas');cv.width=384;cv.height=264;MX.thumbs[k]=cv;MX.thumbQ.push(k);}
    const hm=D&&(D.home||[]).map(f=>FACTIONS[f]&&FACTIONS[f].name).filter(Boolean);
    const facts=D?(D.bm&&typeof mapFacts==='function'?mapFacts(k):(D.min===D.max?D.max+' players':D.min+'–'+D.max+' players')+(D.theme==='snow'?' · snow & ice':D.theme?' · '+D.theme:'')+(D.tag?' · '+D.tag:'')):o.textContent;
    b.append(cv,mxEl('div','t',D?D.name:o.textContent),mxEl('div','f',facts),mxEl('div','d',(D&&D.desc||'')+(hm&&hm.length?' Home turf: '+hm.join(' & ')+'.':'')));
    b.onclick=()=>{mxTick(700);sel.value=k;sel.onchange();mxMapMark();setTimeout(()=>{if(MX.cur==='c-map')menuGo('c-nation');},140);};g.appendChild(b);}
  {const vis=new Set([...sel.options].map(o=>o.value));MX.thumbQ=MX.thumbQ.filter(k=>vis.has(k)).concat(MX.thumbQ.filter(k=>!vis.has(k)));}   /* the maps on screen get their pictures first */
  mxThumbRun();}
function mxMapMark(){if(!MX.grid)return;const sel=document.getElementById('mapSel');for(const b of MX.grid.children)b.classList.toggle('on',sel&&b.dataset.k===sel.value);}
function mxThumbRun(){if(MX.thumbRun)return;MX.thumbRun=1;const step=()=>{const k=MX.thumbQ.shift();if(!k){MX.thumbRun=0;return;}
  if(typeof G!=='undefined'&&G&&!G.over){MX.thumbQ.unshift(k);setTimeout(step,800);return;}
  try{if(typeof MAPS!=='undefined'&&MAPS[k])mapPreview(k,MX.thumbs[k]);}catch(e){}setTimeout(step,30);};setTimeout(step,60);}
function mxNatFilter(){const q=document.getElementById('mxnatin').value.trim().toLowerCase();MX.natQ=q;for(const f of document.querySelectorAll('#pickP .fac'))f.style.display=!q||(f.querySelector('.nm').textContent||'').toLowerCase().includes(q)?'':'none';}
function mxNatShow(f){f=f||document.querySelector('#pickP .fac.on');const d=document.getElementById('mxdet');if(!d||!f)return;const t=c=>(f.querySelector(c)||{}).textContent||'';
  d.innerHTML='';d.append(mxEl('h3','',t('.nm')),mxEl('div','a',t('.dc')));const full=t('.full');if(full)d.append(mxEl('p','',full));d.append(mxEl('p','s',t('.sp')),mxEl('p','w',t('.sw')));}
function mxPlayersSync(){const n=(typeof setup!=='undefined'&&setup.n)||1;if(MX.cnt)MX.cnt.textContent='Computers · '+n;
  const bs=[...document.querySelectorAll('#aiN button')],i=bs.findIndex(b=>b.classList.contains('on'));if(MX.add)MX.add.disabled=!(bs[i+1]&&!bs[i+1].disabled);if(MX.rem)MX.rem.disabled=!(bs[i-1]);}
function mxStartSync(){const s=document.getElementById('start');for(const b of [MX.startP,MX.startO]){if(!b||!s)continue;b.disabled=s.disabled;b.title=s.title||'';}}
function mxContSync(){const c=document.getElementById('svContinue');if(!MX.cont||!c)return;
  /* Continue is the first item of the single-player list: on the title list, and (when the Single player window exists) at the top of that window too */
  const sl=document.querySelector('#ms-single .mxlist');if(sl&&!MX.contSP){const b=mxEl('button','mxi');b.type='button';b.id='mxContSP';b.title='Pick up where you left off';b.hidden=true;b.onclick=()=>{mxTick(660);mxClick('svContinue');};b.onmouseenter=()=>mxTick(520);sl.prepend(b);MX.contSP=b;}
  const t=c.hidden?'':(c.textContent||'').replace(/^\W*Continue\W*/i,'');
  for(const b of [MX.cont,MX.contSP]){if(!b)continue;if(b.hidden===c.hidden&&b.dataset.t===t)continue;b.hidden=c.hidden;b.dataset.t=t;b.textContent='';if(!c.hidden)b.append('Continue',mxEl('small','',t));}}
function mxPoll(){const m=document.getElementById('menu');if(!m||m.hidden)return;mxContSync();if(MX.cur==='c-players'||MX.cur==='c-opts'){mxStartSync();mxPlayersSync();}if(MX.cur==='c-nation')mxNatShow();if(MX.cur==='online'&&MX.olG==='campaign')for(const i of ['playOnline','host']){const e=document.getElementById(i);if(e&&!e.hidden)e.hidden=true;}}
function mxCrumb(){const id=MX.cur,top=document.getElementById('mxtop'),cr=document.getElementById('mxcrumb');if(!top)return;top.hidden=id==='title';cr.innerHTML='';
  const st=MX_STEPS.findIndex(s=>s[0]===id);if(st>=0){cr.append(mxEl('b','',mxModeName()));MX_STEPS.forEach(([sid,n],i)=>{cr.append(mxEl('i','','›'));const b=mxEl('button',sid===id?'cur':'',(i+1)+' '+n);b.type='button';if(sid!==id)b.onclick=()=>menuGo(sid,i<st);cr.append(b);});}
  else cr.append(mxEl('b','',MX_TITLES[id]||''));}
function menuGo(id,back){if(!MX.screens[id]||MX.cur===id)return;const from=MX.screens[MX.cur],to=MX.screens[id];
  if(MX_STEPS.some(s=>s[0]===id)&&MX_STEPS.some(s=>s[0]===MX.cur)){const i=MX.stack.indexOf(id);if(i>=0)MX.stack.length=i+1;else MX.stack.push(id);}
  else if(!back){if(id==='title')MX.stack=['title'];else MX.stack.push(id);}
  from.classList.remove('on');from.classList.toggle('left',!back);to.classList.remove('left');if(back)from.classList.remove('left');
  to.scrollTop=0;to.classList.add('on');MX.cur=id;mxCrumb();mxEnter(id);mxTick(back?480:640);}
function menuBack(){if(MX.stack.length<2)return;MX.stack.pop();const id=MX.stack[MX.stack.length-1];const from=MX.screens[MX.cur];from.classList.remove('on','left');const to=MX.screens[id];to.classList.add('left');void to.offsetWidth;to.classList.remove('left');to.classList.add('on');MX.cur=id;mxCrumb();mxEnter(id);mxTick(480);}
function menuHome(){for(const k in MX.screens)MX.screens[k].classList.remove('on','left');MX.stack=['title'];MX.cur='title';MX.screens.title.classList.add('on');mxCrumb();}
function mxEnter(id){if(id==='c-map')mxMapCards();if(id==='c-nation'){mxNatFilter();mxNatShow();}if(id==='c-players'||id==='c-opts'){mxStartSync();mxPlayersSync();try{if(typeof renderTeams==='function')renderTeams();}catch(_){}}
  if(id==='online'){if(MX.campOnce)MX.campOnce=0;else if(MX.olG==='campaign')MX.olG='conquest';mxOnline();}if(id==='title')mxContSync();}
/* The war table (living main menu): the background shows YOUR war - whatever "Continue" would resume.
   Grand campaign saved: its map around your nation, your borders lit in your color, your last battle marked (sketch from the save's small note, grWarTable in 13-grand.js).
   Battle saved: that battlefield with the front line between your forces and the enemy you could see (sketch in the save's list entry, svFront in 08d-save.js).
   Nothing saved (or an old save without a sketch): the calm world-map picture. Drawn once per save; the campaign code is NOT loaded for it. */
function mxWarSrc(){let g=null,b=null;try{g=typeof svGrandInfo==='function'?svGrandInfo():null;}catch(_){}try{b=typeof svLatest!=='undefined'?svLatest:null;}catch(_){}
  if(g&&b)g=null;   /* campaign paused 2026-11-13: the background shows the last Conquest/Battle; the campaign only when it is the only save */const clk=t=>{t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
  if(g)return {key:'g'+g.ts+'|'+g.d,wt:g.wt&&g.wt.d?g.wt:null,k:'Grand campaign (preview)',h:g.n+(g.d?' · '+g.d:''),l:g.lbn?'Last battle: '+g.lbn+(g.lbd?', '+g.lbd:'')+' — '+(g.lb&&g.lb.w?'won':'lost'):'No battle fought yet'};
  if(b)return {key:'b'+b.id+'|'+b.ts,wt:b.wt&&b.wt.d?b.wt:null,k:'Your war · '+(b.camp?'Mission':'Battle'),h:b.facName+' · '+b.mapName,l:clk(b.t)+' into the fight'+(b.wt&&b.wt.e?' — the bright line is your front':'')};
  return null;}
function mxWarTable(){const bg=document.getElementById('mxbg'),mn=document.getElementById('menu');if(!bg||(mn&&mn.hidden))return;   /* never draw behind a running battle; the next time the menu shows it is drawn */
  const src=mxWarSrc(),wt=src&&src.wt,key=src?src.key:'',mx=bg.parentNode,esc=t=>String(t).replace(/[&<>"]/g,ch=>'&#'+ch.charCodeAt(0)+';');
  if(MX.wtKey===key)return;MX.wtKey=key;for(const e of mx.querySelectorAll('#mxwt,.mxwtl,#mxwar'))e.remove();mx.classList.toggle('wt',!!wt);if(!src)return;
  const cap=mxEl('div');cap.id='mxwar';cap.innerHTML='<i>'+esc(src.k)+'</i><b>'+esc(src.h)+'</b><span>'+esc(src.l)+'</span>';(MX.screens.title||mx).appendChild(cap);if(!wt)return;
  try{const W=wt.w|0,H=wt.h|0,g=new Uint8Array(W*H),bin=atob(wt.d);let o=0,k=0;while(o<bin.length&&k<W*H){const v=bin.charCodeAt(o++);let run=0,sh=0,b;do{b=bin.charCodeAt(o++);run|=(b&127)<<sh;sh+=7;}while(b&128&&o<bin.length);g.fill(v,k,Math.min(W*H,k+run));k+=run;}
    const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},CW=1600,CH=900;
    /* small mask picture: red = land, green = your land, blue = a border between two countries / the two sides */
    const sm=mk(W,H),sx=sm.getContext('2d'),sd=sx.createImageData(W,H),q=sd.data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,v=g[i],j=i*4;q[j]=v?255:0;q[j+1]=v===1?255:0;q[j+2]=v&&((x+1<W&&g[i+1]&&g[i+1]!==v)||(y+1<H&&g[i+W]&&g[i+W]!==v))?255:0;q[j+3]=255;}sx.putImageData(sd,0,0);
    const up=mk(CW,CH),ux=up.getContext('2d',{willReadFrequently:true});ux.imageSmoothingEnabled=true;ux.imageSmoothingQuality='high';try{ux.filter='blur('+(W<400?4:2.2)+'px)';}catch(_){}ux.drawImage(sm,0,0,CW,CH);const U=ux.getImageData(0,0,CW,CH).data;
    const bl=mk(CW/4,CH/4),bx=bl.getContext('2d',{willReadFrequently:true});try{bx.filter='blur(7px)';}catch(_){}bx.drawImage(sm,0,0,CW/4,CH/4);const B=bx.getImageData(0,0,CW/4,CH/4).data,BW=CW/4;
    const cv=mk(CW,CH);cv.id='mxwt';const cx=cv.getContext('2d'),od=cx.createImageData(CW,CH),d=od.data,c=(wt.c||[200,170,80]).map(v=>wt.e?v*.6+85:v),en=wt.e,L=v=>Math.min(255,v*.5+150);
    for(let y=0;y<CH;y++)for(let x=0;x<CW;x++){const i=y*CW+x,j=i*4,land=U[j]>127,mine=land&&U[j+1]>127,bj=((y>>2)*BW+(x>>2))*4,gl=B[bj]/255,gm=B[bj+1]/255,n=(((x*73856093)^(y*19349663))&7)-3.5;let r,gg,b;
      if(!land){r=13+gl*26+gm*c[0]*.2;gg=25+gl*42+gm*c[1]*.2;b=38+gl*54+gm*c[2]*.2;if(x%100===0||y%100===0){r+=6;gg+=9;b+=11;}}
      else{const sh=(gl-.6)*30+n*.9;r=92+sh;gg=101+sh;b=88+sh;const bo=Math.min(1,U[j+2]/255*1.6)*.6;if(!en){r+=(40-r)*bo;gg+=(46-gg)*bo;b+=(42-b)*bo;}
        if(mine){const k=en?.36:.62,q=en?.6:.42;r=r*q+c[0]*k;gg=gg*q+c[1]*k;b=b*q+c[2]*k;}else if(en){r=r*.4+en[0]*.13;gg=gg*.4+en[1]*.13;b=b*.4+en[2]*.13;}
        const e=x>2&&y>2&&x<CW-3&&y<CH-3;if(e&&(U[j-12]<=127||U[j+12]<=127||U[j-CW*12]<=127||U[j+CW*12]<=127)){const k=en?.45:1;r+=48*k;gg+=56*k;b+=54*k;}   /* coast line */
        if(e&&mine&&!en&&(U[j-11]<=127||U[j+13]<=127||U[j-CW*12+1]<=127||U[j+CW*12+1]<=127)){r=L(c[0]);gg=L(c[1]);b=L(c[2]);}   /* your border */
        if(en){const f=Math.max(0,Math.min(.9,(U[j+2]/255-.2)*4));r+=(255-r)*f;gg+=(214-gg)*f;b+=(102-b)*f;}}   /* battle: the front line */
      d[j]=r;d[j+1]=gg;d[j+2]=b;d[j+3]=255;}
    cx.putImageData(od,0,0);bg.appendChild(cv);
    const lab=(cls,fx,fy,html)=>{const e=mxEl('div','mxwtl '+cls);e.style.left=(fx*100).toFixed(2)+'%';e.style.top=(fy*100).toFixed(2)+'%';e.innerHTML=html;bg.appendChild(e);return e;};
    if(wt.b)lab('bat',wt.b[0],wt.b[1],'<svg viewBox="0 0 28 28" fill="none" stroke="#ffd666" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l15 15M23 5L8 20M6 17l5 5M22 17l-5 5M4 24l4-4M24 24l-4-4"/></svg><b>'+esc(wt.b[2])+'</b>Last battle · '+esc(wt.b[3])+(wt.b.length>4?' · '+(wt.b[4]?'won':'lost'):''));
    requestAnimationFrame(()=>cv.classList.add('on'));}catch(e){for(const el of bg.querySelectorAll('#mxwt,.mxwtl'))el.remove();mx.classList.remove('wt');}}
function mxShown(first){if(!first&&MX.cur!=='title')menuHome();mxContSync();try{if(typeof svMenuSync==='function')svMenuSync();else mxWarTable();}catch(_){}}   /* svMenuSync finds the newest save, then calls mxWarTable */
function mxKey(e){if(e.key!=='Escape')return;const m=document.getElementById('menu');if(!m||m.hidden||MX.stack.length<2)return;
  if(document.querySelector('.overlay:not(#menu):not([hidden]),#campScreen,#grandScreen,#gModal,#edOv.on'))return;if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)&&e.target.id!=='mxnatin')return;
  e.preventDefault();e.stopImmediatePropagation();menuBack();}
try{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mxBuild);else mxBuild();}catch(e){console.warn('menu v3',e);}
