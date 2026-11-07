/* ---------- MENU v3: title screen + one job per screen (Abdullah 2026-11-06 20:12 "Ugly ugly ugly", 20:14 "You can transition between
   windows and screens not everything has to be shoved into a single screen with big ugly button"). View-only: no sim state, nothing
   saved or synced. Loaded LAST so every module that injects menu controls (save, replay, grand, campaign, editor) has already run.
   It does not rebuild any control: it MOVES the existing nodes (#pickP, #pickMap, #teamList, #aiN, #diff, #wx, #ssnRow, #gdocSel,
   #games, #playOnline …) into screens, so every handler, id and rule keeps working; the old card stays in the page, hidden, as the
   parking spot for what the title does not show (its buttons are clicked by the new items). #menu.hidden still means "no menu".
   Recipe for a new screen: orch/HOWTO.md "Add a menu screen". ---------- */
const MX={stack:['title'],cur:'title',screens:{},busy:0,thumbQ:[],thumbs:{},natQ:''};
const MX_STEPS=[['c-map','Battlefield'],['c-nation','Nation'],['c-players','Players'],['c-opts','Battle options']];
const MX_TITLES={'title':'','c-map':'Conquest','c-nation':'Conquest','c-players':'Conquest','c-opts':'Conquest','online':'Play online','extras':'Extras','credits':'Credits'};
function mxEl(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function mxClick(id){const e=document.getElementById(id);if(e){try{initAudio();}catch(_){}e.click();}}
function mxTick(f){try{sfxUI(f);}catch(_){}}
function mxCss(){const s=document.createElement('style');s.id='mxCss';s.textContent=`
#menu.m3{background:#05080a;display:block;padding:0;overflow:hidden;z-index:20}
#menu.m3>.card{display:none}
#mx{position:absolute;inset:0;font-family:var(--display);color:var(--fg);user-select:none}
#mxbg{position:absolute;inset:-3%;background:#0a0f0d center/cover no-repeat;animation:mxpan 70s ease-in-out infinite alternate;filter:saturate(1.2) brightness(.8) contrast(1.1)}
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
.mxlist{display:flex;flex-direction:column;align-items:flex-start;gap:0}
.mxcred{max-width:860px}.mxcred p{margin:0 0 12px;color:#8a9a92;font:400 12px/1.6 var(--mono);max-width:none}
@media (max-width:1100px){.mxnat,.mxpl{grid-template-columns:1fr}#mxdet{position:static}}
`;document.head.appendChild(s);}
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
  MX.cont=item('',()=>mxClick('svContinue'),'','Pick up your latest saved battle');MX.cont.hidden=true;
  item('Grand campaign',()=>mxClick('grandBtn'),'','Run a whole empire on a world map and fight the battles live');
  item('Conquest',()=>menuGo('c-map'),'','A battle vs the AI: pick a battlefield, a nation and your opponents');
  item('Missions',()=>mxClick('campaign'),'','The story missions');
  item('Tutorial',()=>mxClick('tutorial'),'','First time? A guided 10-minute battle');
  item('Play online',()=>menuGo('online'),'sep','Join an open battle with friends or start one');
  item('Load game',()=>mxClick('svLoadBtn'),'','Load a saved battle');
  item('Settings',()=>mxClick('openSettings'),'','Graphics, sound and mouse');
  item('Extras',()=>menuGo('extras'),'dim','Test range, replays, encyclopedia, medals and more');
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
  {const r=mxEl('div','seg');r.id='balRow';[['Balanced',0],['Realistic',1]].forEach(([t,v])=>{const b=mxEl('button','',t);b.onclick=()=>{setup.real=v;r.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));};if(!!setup.real===!!v)b.classList.add('on');r.appendChild(b);});opt('Balance','Balanced: every nation equally strong. Realistic: richer armies start with more money, small nations less. Solo battles only for now.',r);}
  MX.startO=go('Start battle',()=>mxClick('start'));foot(O,MX.startO);
  /* --- play online --- */
  const OL=scr('online','<h2 class="mxh">Play online</h2><p class="mxsub">Join an open battle, or start one with your nation and battlefield. Friends can join from the list or with an invite code.</p>');
  const mp=[...card.querySelectorAll('.mode')].find(x=>x.querySelector('#playOnline'));if(mp)OL.appendChild(mp);
  /* --- extras --- */
  const E=scr('extras','<h2 class="mxh">Extras</h2><p class="mxsub">Practice, review and reference.</p>');const el=mxEl('div','mxlist');E.appendChild(el);
  const ex=(t,fn,tip)=>{const b=mxEl('button','mxi',t);b.type='button';b.onclick=()=>{mxTick(660);fn();};b.onmouseenter=()=>mxTick(520);if(tip)b.title=tip;el.appendChild(b);};
  const byText=t=>()=>{const b=[...card.querySelectorAll('button')].find(x=>(x.textContent||'').trim().toLowerCase().replace(/\u2019/g,"'")===t);if(b){try{initAudio();}catch(_){}b.click();}};
  ex('Test range',()=>mxClick('sandbox'),'Unlimited money and every unit against a passive target');ex('Watch a replay',()=>mxClick('rpOpen'),'Open a replay file');ex('Map editor',()=>mxClick('edBtn'),'Draw your own battlefield');
  ex('My battles',()=>mxClick('openMyb'));ex('Encyclopedia',()=>mxClick('openEnc'));ex('Unit guide',byText('unit guide'));ex('Medals',byText('medals'));ex('Profile',byText('profile'));ex('What’s new',byText('what’s new')||byText("what's new"));ex('Report a problem',()=>mxClick('rpMenu'),'Opens a pre-filled bug report');
  /* --- credits --- */
  const C=scr('credits','<h2 class="mxh">Credits</h2><p class="mxsub">Free art, sound and music only, every author credited.</p>');const cw=mxEl('div','mxcred');for(const p of card.querySelectorAll('p.credits'))cw.appendChild(p);C.appendChild(cw);
  /* --- wiring --- */
  document.addEventListener('keydown',mxKey,true);
  new MutationObserver(()=>{if(!m.hidden)mxShown();}).observe(m,{attributes:true,attributeFilter:['hidden']});
  setInterval(mxPoll,500);
  MX.screens.title.classList.add('on');mxShown(true);}
function mxMapCards(){
  const g=MX.grid,sel=document.getElementById('mapSel');if(!g||!sel)return;g.innerHTML='';
  for(const o of sel.options){const k=o.value,D=(typeof MAPS!=='undefined'&&MAPS[k])||null;const b=mxEl('button','mxmap'+(k===sel.value?' on':''));b.type='button';b.dataset.k=k;
    let cv=MX.thumbs[k];if(!cv){cv=document.createElement('canvas');cv.width=384;cv.height=264;MX.thumbs[k]=cv;MX.thumbQ.push(k);}
    const hm=D&&(D.home||[]).map(f=>FACTIONS[f]&&FACTIONS[f].name).filter(Boolean);
    const facts=D?((D.min===D.max?D.max+' players':D.min+'–'+D.max+' players')+(D.theme==='snow'?' · snow & ice':D.theme?' · '+D.theme:'')+(D.tag?' · '+D.tag:'')):o.textContent;
    b.append(cv,mxEl('div','t',D?D.name:o.textContent),mxEl('div','f',facts),mxEl('div','d',(D&&D.desc||'')+(hm&&hm.length?' Home turf: '+hm.join(' & ')+'.':'')));
    b.onclick=()=>{mxTick(700);sel.value=k;sel.onchange();mxMapMark();setTimeout(()=>{if(MX.cur==='c-map')menuGo('c-nation');},140);};g.appendChild(b);}
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
function mxContSync(){const c=document.getElementById('svContinue');if(!MX.cont||!c)return;MX.cont.hidden=c.hidden;if(c.hidden)MX.cont.textContent='';else{const t=(c.textContent||'').replace(/^\W*Continue\W*/i,'');MX.cont.textContent='';MX.cont.append('Continue',mxEl('small','',t));}}
function mxPoll(){const m=document.getElementById('menu');if(!m||m.hidden)return;mxContSync();if(MX.cur==='c-players'||MX.cur==='c-opts'){mxStartSync();mxPlayersSync();}if(MX.cur==='c-nation')mxNatShow();}
function mxCrumb(){const id=MX.cur,top=document.getElementById('mxtop'),cr=document.getElementById('mxcrumb');if(!top)return;top.hidden=id==='title';cr.innerHTML='';
  const st=MX_STEPS.findIndex(s=>s[0]===id);if(st>=0){cr.append(mxEl('b','','Conquest'));MX_STEPS.forEach(([sid,n],i)=>{cr.append(mxEl('i','','›'));const b=mxEl('button',sid===id?'cur':'',(i+1)+' '+n);b.type='button';if(sid!==id)b.onclick=()=>menuGo(sid,i<st);cr.append(b);});}
  else cr.append(mxEl('b','',MX_TITLES[id]||''));}
function menuGo(id,back){if(!MX.screens[id]||MX.cur===id)return;const from=MX.screens[MX.cur],to=MX.screens[id];
  if(MX_STEPS.some(s=>s[0]===id)&&MX_STEPS.some(s=>s[0]===MX.cur)){const i=MX.stack.indexOf(id);if(i>=0)MX.stack.length=i+1;else MX.stack.push(id);}
  else if(!back){if(id==='title')MX.stack=['title'];else MX.stack.push(id);}
  from.classList.remove('on');from.classList.toggle('left',!back);to.classList.remove('left');if(back)from.classList.remove('left');
  to.scrollTop=0;to.classList.add('on');MX.cur=id;mxCrumb();mxEnter(id);mxTick(back?480:640);}
function menuBack(){if(MX.stack.length<2)return;MX.stack.pop();const id=MX.stack[MX.stack.length-1];const from=MX.screens[MX.cur];from.classList.remove('on','left');const to=MX.screens[id];to.classList.add('left');void to.offsetWidth;to.classList.remove('left');to.classList.add('on');MX.cur=id;mxCrumb();mxEnter(id);mxTick(480);}
function menuHome(){for(const k in MX.screens)MX.screens[k].classList.remove('on','left');MX.stack=['title'];MX.cur='title';MX.screens.title.classList.add('on');mxCrumb();}
function mxEnter(id){if(id==='c-map')mxMapCards();if(id==='c-nation'){mxNatFilter();mxNatShow();}if(id==='c-players'||id==='c-opts'){mxStartSync();mxPlayersSync();try{if(typeof renderTeams==='function')renderTeams();}catch(_){}}
  if(id==='title')mxContSync();}
function mxShown(first){if(!first&&MX.cur!=='title')menuHome();mxContSync();try{if(typeof svMenuSync==='function')svMenuSync();}catch(_){}}
function mxKey(e){if(e.key!=='Escape')return;const m=document.getElementById('menu');if(!m||m.hidden||MX.stack.length<2)return;
  if(document.querySelector('.overlay:not(#menu):not([hidden]),#campScreen,#grandScreen,#gModal,#edOv.on'))return;if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)&&e.target.id!=='mxnatin')return;
  e.preventDefault();e.stopImmediatePropagation();menuBack();}
try{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mxBuild);else mxBuild();}catch(e){console.warn('menu v3',e);}
