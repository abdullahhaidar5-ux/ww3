/* ---------- ONE HUD (integrate1, SYSTEMS.md "HUD"): a single top bar (money, income, supply, world opinion, alerts) + ONE alerts feed + an
   overlay switcher for the map / minimap layers. View-only: no sim state, nothing here is saved or synced. Every alert comes from pushLog()
   (the one log entry point), every overlay flag is read by the draw code it switches (OVL.*), so no second panel is ever needed. ---------- */
const OVL={towns:true,opinion:true,sonar:true,mines:true};   // 'supply' mirrors the logistics overlay (LGU.on, key L)
const HUD_OV=[['towns','Towns','Town markers, loyalty and tax, unrest and cut-off warnings (map and minimap)'],['supply','Supply','Supply roads, convoys and cut-off towns (also key L)'],['opinion','Opinion','World opinion meter in this bar'],['sonar','Sonar','Submarine contacts on the map and minimap'],['mines','Mines','Mine markers on the map and minimap']];
const HUDS={al:[],unread:0,open:false,el:null,g:null,t:0,sig:''};
function hudAlert(m,k){if(!G||!m||(k!=='bad'&&k!=='w'))return;if(HUDS.g!==G){HUDS.g=G;HUDS.al.length=0;HUDS.unread=0;}
  const last=HUDS.al[0];if(last&&last.m===m&&G.t-last.t<2)return;HUDS.al.unshift({m,k,t:G.t});if(HUDS.al.length>30)HUDS.al.length=30;if(!HUDS.open)HUDS.unread=Math.min(99,HUDS.unread+1);HUDS.t=0;}
function hudBuild(){let b=document.getElementById('hudBar');if(b)return b;b=document.createElement('div');b.id='hudBar';
  b.style.cssText='position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:56;display:flex;gap:6px;align-items:center;padding:4px 8px;background:rgba(8,12,10,.78);border:1px solid rgba(255,255,255,.14);border-radius:8px;font:600 14px/1.2 system-ui,sans-serif;color:#f4e9c2;text-shadow:0 1px 2px #000;white-space:nowrap;max-width:calc(100vw - 150px)';
  const st=document.createElement('style');st.textContent='#hudBar .hs{padding:2px 8px;border-radius:5px;background:rgba(255,255,255,.07)}#hudBar button{font:600 13px system-ui,sans-serif;color:#cfd8c8;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:5px;padding:2px 8px;cursor:pointer}#hudBar button.on{background:rgba(111,178,255,.28);color:#fff;border-color:#6fb2ff}#hudBar #hudAl.hot{background:rgba(234,90,64,.35);border-color:#ea5a40;color:#fff}#hudFeed{position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:57;width:min(520px,calc(100vw - 160px));background:rgba(8,12,10,.92);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:6px 10px;font:500 14px/1.35 system-ui,sans-serif;color:#eee;max-height:260px;overflow:auto}#hudFeed div{padding:2px 0;border-bottom:1px solid rgba(255,255,255,.07)}#hudFeed .bad{color:#ff9a8a}#hudFeed .w{color:#f0d27a}';document.head.appendChild(st);
  b.innerHTML='<span class="hs" id="hudM"></span><span class="hs" id="hudS"></span><span class="hs" id="hudO"></span><button id="hudAl" title="Alerts: missile strikes, revolts, convoy hits, sonar contacts and other warnings. Click to read the last ones.">Alerts 0</button><span id="hudOv" style="display:flex;gap:4px;margin-left:4px"></span>';
  document.body.appendChild(b);const ov=b.querySelector('#hudOv');
  for(const [k,n,t] of HUD_OV){const x=document.createElement('button');x.dataset.o=k;x.textContent=n;x.title='Show or hide: '+t;x.onclick=()=>hudToggle(k);ov.appendChild(x);}
  b.querySelector('#hudAl').onclick=()=>{HUDS.open=!HUDS.open;if(HUDS.open)HUDS.unread=0;HUDS.sig='';hudTick(true);};return b;}
function hudToggle(k){if(k==='supply'){if(typeof lgToggle==='function')lgToggle();}else OVL[k]=!OVL[k];HUDS.sig='';hudTick(true);}
function hudOn(k){return k==='supply'?!!(typeof LGU!=='undefined'&&LGU.on):OVL[k]!==false;}
function hudTick(force){if(!G||!G.teams||!G.teams[ME]||G.over){const o=document.getElementById('hudBar');if(o)o.hidden=true;const f=document.getElementById('hudFeed');if(f)f.remove();return;}
  const n=performance.now();if(!force&&n-HUDS.t<250)return;HUDS.t=n;if(HUDS.g!==G){HUDS.g=G;HUDS.al.length=0;HUDS.unread=0;HUDS.open=false;}
  const b=hudBuild();b.hidden=false;const T=G.teams[ME];
  let cut=0;if(G.towns)for(const t of G.towns)if(t.cut&&townsMine(t))cut++;
  const inc=T.terr||0,op=(typeof opOf==='function'&&G.conq&&!T.reb)?Math.round(opOf(T)):null;
  const sig=[Math.floor(T.credits),inc.toFixed(1),cut,op,HUDS.unread,HUDS.open?1:0,HUDS.al.length,HD_KEYS.map(hudOn).join('')].join('|');if(sig===HUDS.sig)return;HUDS.sig=sig;
  b.querySelector('#hudM').textContent='$'+Math.floor(T.credits).toLocaleString('en-US')+(inc>.05?'  +$'+inc.toFixed(1)+'/s':'');b.querySelector('#hudM').title='Money and territory income (tax from your towns and hamlets).';
  const s=b.querySelector('#hudS');s.textContent=cut?'Supply: '+cut+' cut off':'Supply: OK';s.style.color=cut?'#ff9a8a':'#9be39b';s.title='Towns you hold that the supply network cannot reach.';
  const o=b.querySelector('#hudO');if(op==null||!hudOn('opinion'))o.hidden=true;else{o.hidden=false;const m=polMul(T);o.textContent='Opinion '+op+(m<1?'  SANCTIONS -'+Math.round((1-m)*100)+'%':'');o.style.color=op<POL.SANC_BELOW?'#ff8a7a':op>=POL.AID_ABOVE?'#9be39b':'#e8e2c8';o.title='World opinion of you. Low opinion brings sanctions (less income); high opinion brings foreign aid.';}
  const a=b.querySelector('#hudAl');a.textContent='Alerts '+(HUDS.unread||HUDS.al.length);a.className=HUDS.unread?'hot':'';
  for(const x of b.querySelectorAll('#hudOv button'))x.className=hudOn(x.dataset.o)?'on':'';
  let f=document.getElementById('hudFeed');if(!HUDS.open){if(f)f.remove();}else{if(!f){f=document.createElement('div');f.id='hudFeed';document.body.appendChild(f);}
    f.innerHTML='';if(!HUDS.al.length){const d=document.createElement('div');d.textContent='No alerts yet.';f.appendChild(d);}
    for(const q of HUDS.al.slice(0,12)){const d=document.createElement('div');d.className=q.k;const m=Math.max(0,Math.floor(G.t-q.t));d.textContent=(m<60?m+'s':Math.floor(m/60)+'m')+' ago · '+q.m;f.appendChild(d);}}}
const HD_KEYS=HUD_OV.map(q=>q[0]);
/* ---------- What's new (one screen, newest first) ---------- */
const WHATS_NEW=[
 ['Morale styles','Every nation now fights with one of four styles: Zealous (slow to break, banners rally the faithful, heavier losses), Professional (steady under artillery, rally fast near officers), Home defenders (much braver on home turf) and Firepower-reliant (break sooner, but stronger fire support). The style shows on the nation pick screen and in the Encyclopedia.'],
 ['One HUD','A single top bar now shows money, income, supply, world opinion and an Alerts button (click it for the last warnings). The Towns / Supply / Opinion / Sonar / Mines buttons switch the map and minimap layers on and off.'],
 ['Grand-map assets','The Ayatollah, the Dear Leader, the Mountain Fortress and the Bunker Buster are no longer in Conquest battles; they live on the grand map.'],
 ['Locals, knocked-out units, cover','All local militias, rebels and funded militias are one kind of unit with one minimap ring. EMP, hacks, sabotage and blackouts share one knocked-out marker (blue X on the minimap). Rubble, trenches and walls all count as cover.']];
function whatsNewPage(){const o=idOv('idNew',"What's new"),b=o.querySelector('.idbody');b.innerHTML='';for(const [h,t] of WHATS_NEW){const d=document.createElement('div');d.style.cssText='margin:10px 0;text-align:left';const a=document.createElement('div');a.style.cssText='font:700 17px system-ui,sans-serif;color:#f4e9c2';a.textContent=h;const p=document.createElement('div');p.style.cssText='font:500 15px/1.4 system-ui,sans-serif;color:#dfe5da';p.textContent=t;d.append(a,p);b.appendChild(d);}o.hidden=false;}
(function(){const op=document.getElementById('openSettings');if(op&&op.parentNode){const b=document.createElement('button');b.className='big ghost';b.style.cssText='font-size:15px;padding:7px 16px';b.textContent="What's new";b.onclick=whatsNewPage;op.parentNode.appendChild(b);}
})();
/* Battle HUD never shows over the menus (Abdullah 2026-11-06 19:52 photo: "Why do these buttons remain" — the top bar, alerts feed,
   Supply lines button, Conquest banner and town panel stayed on screen after leaving a battle). One rule: while the main menu is open,
   body gets .inMenu and every battle-only overlay is hidden; nothing else changes. */
function hudMenuWatch(){const m=document.getElementById('menu');if(!m||hudMenuWatch.on)return;hudMenuWatch.on=1;
  const st=document.createElement('style');st.textContent='body.inMenu #hudBar,body.inMenu #hudFeed,body.inMenu #lgBtn,body.inMenu #cqBn,body.inMenu #townp{display:none!important}';document.head.appendChild(st);
  const sync=()=>document.body.classList.toggle('inMenu',!m.hidden);sync();new MutationObserver(sync).observe(m,{attributes:true,attributeFilter:['hidden']});}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hudMenuWatch);else hudMenuWatch();}
/* ---------- bottom dock (declutter2, Abdullah 2026-11-06 20:30 "shouldn't be side by side, too cluttered"): the bottom of the battle screen reads as
   one tidy panel. Command + Auto-build are ONE strip (08g/08h); the Supply lines button is gone (the top bar's Supply switch and key L do it);
   the controls hint is one quiet line that never runs under the order buttons; empty battle-group slots shrink to their number. View-only CSS. */
(function(){if(typeof document==='undefined')return;const st=document.createElement('style');st.textContent=
 'body #lgBtn{display:none!important}'+
 '#app #hint{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;right:520px;opacity:.7}'+
 '#sqs button.empty{opacity:.55}#sqs button.empty small{display:none}#sqs button.empty{min-width:0;padding-left:7px;padding-right:7px}';
 document.head.append(st);})();
