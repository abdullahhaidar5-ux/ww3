/* ================= ZERO HOUR COMMAND BAR LAYOUT (Abdullah 2026-11-14 14:13, sent the original C&C Generals Zero Hour control bar: "Exactly like the picture",
   "Pictures + hover card"). Layered over the gunmetal plate of 08o-genbar.js; view only, no per-frame work (the context check runs inside updateUI).
   Layout, left to right: minimap | small side buttons | ONE picture grid (no tabs: it shows what the selection can do) | unit portrait | general rank strip.
   Money sits in a plate on the top edge in the middle; the ★ button (top right) opens the generals' powers + Strike in the same grid.
   Hovering a picture shows its name, cost and text in a card above the minimap, as in Zero Hour. Hotkey letters and the Auto-build toggle are hidden. */
{const st=document.createElement('style');st.textContent=`@media(min-width:900px){
html body #side{--gbH:clamp(220px,26vh,290px);--bs:calc((var(--gbH) - 40px)/2);grid-template-columns:clamp(220px,17vw,300px) 54px minmax(0,1fr) clamp(200px,15vw,280px) 40px!important;grid-template-rows:minmax(0,1fr)!important;padding:14px 14px 10px!important}
html body #side::before{clip-path:polygon(0 16px,calc(50% - 150px) 16px,calc(50% - 124px) 0,calc(50% + 124px) 0,calc(50% + 150px) 16px,100% 16px,100% 100%,0 100%)!important}
html body #side #sideTop{grid-column:1!important;grid-row:1!important}
html body #side .cardhd,html body #side .tabs,html body #side .sqbar{display:none!important}
html body #side #panel{grid-column:3!important;grid-row:1!important;grid-template-columns:repeat(auto-fill,minmax(calc(var(--bs)*1.3),1fr))!important;grid-template-rows:repeat(2,minmax(0,1fr))!important;grid-auto-rows:calc(50% - 3px)!important;gap:6px!important;padding:6px!important;align-content:stretch}
html body #side #panel .btn{padding:0!important;height:auto!important;min-height:0!important;align-self:stretch;overflow:hidden}
html body #side #panel .btn.hasic canvas.uic{position:absolute!important;inset:3px;height:calc(100% - 6px)!important;width:calc(100% - 6px)!important;object-fit:cover;border-radius:2px;background:radial-gradient(circle at 50% 38%,#3b4a3e,#141a14 75%)}
html body #side #panel .btn .n,html body #side #panel .btn .c,html body #side #panel .btn .mu,html body #side #panel .btn .umatch,html body #side #panel .btn [class*="match"]{display:none!important}
html body #side #panel .btn:not(.hasic) .n{display:block!important;white-space:normal;margin:auto}
html body #side #panel .btn.wide .n,html body #side #panel .btn.wide .c{display:block!important}
html body #side #panel .btn .q{font-size:16px!important}
html body #side #panel .zhEmpty{grid-column:1/-1;align-self:center;text-align:center;font:600 14px system-ui,sans-serif;color:#7f8b72;letter-spacing:.06em}
html body #side kbd,html body #side .hk,#tstrip .hk,.orddock kbd,.abc{display:none!important}
/* side buttons: the old header row becomes a narrow column of small square buttons */
html body #side .stat>.hdr{grid-column:2!important;grid-row:1!important;flex-direction:column!important;justify-content:flex-start;align-items:stretch;gap:6px!important;padding:6px 4px!important;background:none!important;box-shadow:none!important}
html body #side #facname{display:none!important}
html body #side .stat>.hdr button{width:46px;height:40px;padding:0!important;font-size:13px!important;overflow:hidden;white-space:nowrap}
html body #side .stat>.hdr #aPause{font-size:0!important}html body #side .stat>.hdr #aPause::before{content:"❚❚";font-size:15px}
html body #side .stat>.hdr #aMenu{margin:0!important}
/* money plate on the top edge, in the middle */
html body #side #credits{position:absolute!important;top:-12px;left:50%;transform:translateX(-50%);z-index:3;min-width:190px;text-align:center;margin:0!important;padding:4px 16px!important;font-size:21px!important;
 background:linear-gradient(180deg,#0a0d09,#161c14)!important;box-shadow:inset 0 0 0 1px #000,inset 0 0 0 2px #6d7a5e,0 2px 6px rgba(0,0,0,.6)!important;border-radius:4px}
html body #side #popCap{position:absolute!important;top:-6px;left:calc(50% + 112px);z-index:3;margin:0!important;font:700 12px system-ui,sans-serif!important;padding:3px 8px;border-radius:3px;background:rgba(10,13,9,.85)}
/* portrait + rank strip on the right */
html body #side #info{grid-column:4!important;grid-row:1!important}
html body #side #info .ukU{flex-direction:column;align-items:stretch}
html body #side #info .ukU img,html body #side #info .ukU canvas{width:100%!important;height:auto!important;aspect-ratio:4/3;max-height:calc(var(--gbH) - 110px)}
html body #side .stat>.sup.rk{grid-column:5!important;grid-row:1!important;flex-direction:column-reverse!important;padding:4px!important;gap:4px!important}
html body #side .stat>.sup.rk .lbl{writing-mode:vertical-rl;transform:rotate(180deg);font-size:11px!important;flex:1;justify-content:center}
html body #side .stat>.sup.rk .bar{width:10px!important;height:auto!important;flex:1;margin:0 auto;display:flex;flex-direction:column-reverse}
html body #side .stat>.sup.rk .bar i{display:block;width:100%!important;height:var(--rk,0%)}
/* Strike panel + ★ powers button above the right end of the plate */
html body #side .stat>.sup.sw{display:none!important}
html body #side.zhpow .stat>.sup.sw{display:flex!important;grid-column:4!important;grid-row:1!important;position:static!important}
html body #side.zhpow #info{display:none!important}
html body #side .stat>.sup.rk{padding-top:50px!important}
.orddock{right:64px!important}
.orddock.zhin{right:auto!important;bottom:auto!important;min-width:0!important;padding:6px!important;background:none!important;box-shadow:none!important;border:0!important;overflow:auto}
.orddock.zhin .cmdrow{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(120px,1fr))!important;gap:6px!important;border:0!important;padding:0!important}
.orddock.zhin .cmdrow button{min-height:52px;font:700 14px system-ui,sans-serif!important}
html body #side #zhStar{position:absolute;right:12px;top:6px;z-index:3;width:42px;height:40px;border-radius:5px;border:1px solid #1a1f17;font:900 22px system-ui,sans-serif;color:#f4d96a;cursor:pointer;
 background:linear-gradient(180deg,#5a6650,#343c31);box-shadow:inset 0 1px 0 #9aa68a,0 2px 6px rgba(0,0,0,.6)}
html body #side #zhStar.rdy{animation:zhPulse 1.4s ease-in-out infinite}@keyframes zhPulse{50%{box-shadow:0 0 14px #f4d96a,inset 0 1px 0 #9aa68a}}
html body #side #zhStar.on{background:linear-gradient(180deg,#f0d66e,#a8872b);color:#1b1a0e}
html body #side #zhStar .dot{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;background:#ff5a3c;box-shadow:0 0 6px #ff5a3c}
}
#zhTip{position:fixed;left:10px;z-index:60;width:clamp(240px,22vw,380px);pointer-events:none;padding:10px 14px;border-radius:4px;color:#e9efdc;font:14px/1.4 system-ui,sans-serif;
 background:linear-gradient(180deg,rgba(14,22,30,.94),rgba(8,14,20,.94));box-shadow:inset 0 0 0 1px #000,inset 0 0 0 2px #4d6a86,0 4px 14px rgba(0,0,0,.6)}
#zhTip b{display:block;text-align:center;font-size:16px;margin-bottom:4px}#zhTip .zc{color:#f4d96a;font-weight:700}#zhTip .zd{color:#c9d3bd;margin-top:3px}#zhTip .zw{color:#ff9a7a;margin-top:3px}`;document.head.append(st);}

const ZH={star:false,sig:'',pow:0};
/* which grid the selection gets: Construction Vehicle -> buildings; a production building -> its units; any other own building -> upgrades;
   ★ -> generals' powers + Strike; nothing that can act -> an empty grid (as in Zero Hour) */
function zhWant(){if(!G)return null;if(ZH.star)return 'pow';const s=(G.sel||[]).filter(e=>e&&!e.dead&&e.team===ME);
  if(s.some(u=>u.kind==='dozer'))return 'build';const b=s.find(e=>e.isB);if(b){if(typeof CATS!=='undefined'&&CATS.includes(b.kind))return 'units';return 'upg';}return 'none';}
function zhCtx(){if(!G||G.grand)return;const sd=$('side');if(!sd)return;
  let star=$('zhStar');if(!star){star=document.createElement('button');star.id='zhStar';star.type='button';star.title='Generals\' powers and Strike';star.innerHTML='★<i class="dot" hidden></i>';
    star.onclick=()=>{ZH.star=!ZH.star;ZH.sig='';zhCtx();};sd.append(star);}
  const sig=(G.sel||[]).map(e=>e.id).join(',');if(sig!==ZH.sig){if(ZH.sig&&sig)ZH.star=false;ZH.sig=sig;}
  star.classList.toggle('on',ZH.star);{const pd=document.querySelector('.tabs button[data-tab="pow"] .dot');const d=star.querySelector('.dot');if(d)d.hidden=!(pd&&!pd.hidden&&getComputedStyle(pd).display!=='none');}
  const w=zhWant();if(w&&TAB!==w)showTab(w);sd.classList.toggle('zhpow',w==='pow');{const sb=$('supbtn');star.classList.toggle('rdy',!!(sb&&!sb.disabled)&&!ZH.star);}
  {const od=document.querySelector('.orddock');const pn0=$('panel');if(od&&pn0&&innerWidth>=900){if(w==='none'&&!od.classList.contains('empty')){const r=pn0.getBoundingClientRect();od.classList.add('zhin');od.style.left=r.left+'px';od.style.top=r.top+'px';od.style.width=r.width+'px';od.style.height=r.height+'px';}else if(od.classList.contains('zhin')){od.classList.remove('zhin');od.style.left=od.style.top=od.style.width=od.style.height='';}}}
  const pn=$('panel');if(pn){let e=pn.querySelector('.zhEmpty');const od2=document.querySelector('.orddock.zhin');const vis=!!od2||[...pn.querySelectorAll(':scope>[data-tab]')].some(b=>!b.hidden&&b.dataset.tab===TAB);
    if(!vis){if(!e){e=document.createElement('div');e.className='zhEmpty';pn.append(e);}e.textContent=w==='none'?'Select your Construction Vehicle to build, or a building to train units':'Nothing available here yet';e.hidden=false;}else if(e)e.hidden=true;}
  {const rk=document.querySelector('#side .sup.rk .bar i');if(rk){const wd=rk.style.width;if(wd&&rk.style.getPropertyValue('--rk')!==wd)rk.style.setProperty('--rk',wd);}}}
if(typeof updateUI==='function'){const _zhU=updateUI;updateUI=function(){_zhU.apply(this,arguments);try{zhCtx();}catch(e){}};}
/* hover card above the minimap */
{let tip=null;const show=b=>{if(!tip){tip=document.createElement('div');tip.id='zhTip';document.body.append(tip);}const sd=$('side'),r=sd?sd.getBoundingClientRect():null;
    const nm=b.dataset.nm||(b.querySelector('.n')||{}).textContent||'',c=(b.querySelector('.c')||{}).textContent||'',d=b.dataset.desc||'',why=b.disabled&&b.title&&b.title!==d?b.title:'';
    tip.innerHTML='';const h=document.createElement('b');h.textContent=nm;tip.append(h);if(c){const x=document.createElement('div');x.className='zc';x.textContent=/^\$|^\d/.test(c)?'Cost: '+c:c;tip.append(x);}
    if(d){const x=document.createElement('div');x.className='zd';x.textContent=d;tip.append(x);}if(why){const x=document.createElement('div');x.className='zw';x.textContent=why;tip.append(x);}
    tip.style.bottom=(r?innerHeight-r.top+18:300)+'px';tip.hidden=false;};
  document.addEventListener('mouseover',e=>{const b=e.target&&e.target.closest&&e.target.closest('#panel .btn');if(b&&innerWidth>=900)show(b);else if(tip&&!tip.hidden&&!(e.target.closest&&e.target.closest('#panel .btn')))tip.hidden=true;},true);}
/* PICTURE BUTTONS ("Pictures + hover card"): every Build/Units button and the portrait show a small rendered picture of the real 3D model the battle
   uses (three-quarter view, the player's colour, over a sky-and-ground backdrop), like the Zero Hour cameos. Drawn once per kind with the battle's own
   renderer into an off-screen target, one picture per idle moment (never inside a busy frame), cached for the visit. The flat icon stays until then. */
const ZHC={cache:new Map(),q:[],busy:false,rt:null,scn:null,cam:null};
function zhCamScene(){if(ZHC.scn)return;const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight(lin('#d6e2f5'),lin('#5a4a33'),1.15*LUX));
  const sun=new THREE.DirectionalLight(lin('#fff0d8'),2.7*LUX);sun.position.set(-200,320,240);sc.add(sun);ZHC.scn=sc;ZHC.cam=new THREE.PerspectiveCamera(30,4/3,1,4000);
  ZHC.rt=new THREE.WebGLRenderTarget(288,216,{samples:4});ZHC.rt.texture.colorSpace=THREE.SRGBColorSpace;}
function zhCamBuild(f,k,b){const F=FACTIONS[f],T0=G&&G.teams&&G.teams[ME],col=(T0&&T0.fac===f&&T0.color)||F.color,T={id:0,fac:f,F,sup:F.sup,color:col,dark:shade(col,.45),credits:0,upg:{},pw:{},st:null};
  const s=b?bstats(f,k):stats(f,k);const e=b?{id:3,kind:k,team:0,isB:true,x:0,y:0,size:s.size,s,hp:s.hp,max:s.hp,built:1,ang:0}:{id:3,kind:k,team:0,isB:false,x:0,y:0,s,hp:s.hp,max:s.hp,ang:0,va:0};
  const g0=G,s0=SCN;const stub=Object.assign(Object.create(g0||null),{teams:[T],t:0,ents:[],byId:new Map(),map:(g0&&g0.map)||{theme:'temperate'}});G=stub;SCN=ZHC.scn;let o=null;try{o=makeObj(e);}finally{G=g0;SCN=s0;}return o;}
function zhCamShot(f,k,b){if(typeof R3==='undefined'||!R3||typeof makeObj!=='function')return null;zhCamScene();const o=zhCamBuild(f,k,b);if(!o)return null;
  try{o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o),ctr=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.y*1.3,sz.z)||40;
    const wr=new THREE.Group();o.position.sub(new THREE.Vector3(ctr.x,bb.min.y,ctr.z));wr.add(o);wr.rotation.y=b?.55:-.75;ZHC.scn.add(wr);
    const R=r*1.62+8,p=b?.5:.36;ZHC.cam.position.set(Math.sin(.6)*Math.cos(p)*R,Math.sin(p)*R+sz.y*.35,Math.cos(.6)*Math.cos(p)*R);ZHC.cam.lookAt(0,sz.y*.42,0);ZHC.cam.updateProjectionMatrix();
    const pc=new THREE.Color(),pa=R3.getClearAlpha();R3.getClearColor(pc);const prt=R3.getRenderTarget();R3.setRenderTarget(ZHC.rt);R3.setClearColor(0x000000,0);R3.clear(true,true,true);R3.render(ZHC.scn,ZHC.cam);
    const W=288,H=216,px=new Uint8Array(W*H*4);R3.readRenderTargetPixels(ZHC.rt,0,0,W,H,px);R3.setRenderTarget(prt);R3.setClearColor(pc,pa);ZHC.scn.remove(wr);
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
    {const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#7f9db8');g.addColorStop(.55,'#c9c3a8');g.addColorStop(.56,'#8a7a58');g.addColorStop(1,'#4e4532');x.fillStyle=g;x.fillRect(0,0,W,H);}
    {let n=0;for(let i=3;i<px.length;i+=16)if(px[i]>20)n++;if(n<W*H/16*.02)return null;}const im=x.createImageData(W,H);for(let y=0;y<H;y++)im.data.set(px.subarray((H-1-y)*W*4,(H-y)*W*4),y*W*4);const t=document.createElement('canvas');t.width=W;t.height=H;t.getContext('2d').putImageData(im,0,0);x.drawImage(t,0,0);
    {const v=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');x.fillStyle=v;x.fillRect(0,0,W,H);}
    return cv;}catch(err){console.warn('cameo',k,err);return null;}}
function zhCamGet(f,k,b){return ZHC.cache.get(f+'|'+k+'|'+(b?1:0));}
function zhCamWant(f,k,b){const key=f+'|'+k+'|'+(b?1:0);if(ZHC.cache.has(key)||ZHC.q.some(q=>q.key===key))return;ZHC.q.push({key,f,k,b});zhCamPump();}
function zhCamPump(){if(ZHC.busy||!ZHC.q.length)return;ZHC.busy=true;const go=()=>{ZHC.busy=false;const it=ZHC.q.shift();if(!it)return;let cv=null;try{cv=zhCamShot(it.f,it.k,it.b);}catch(e){}ZHC.cache.set(it.key,cv);zhCamPaint();zhCamPump();};
  (window.requestIdleCallback?requestIdleCallback(go,{timeout:700}):setTimeout(go,60));}
function zhCamPaint(){if(!G||!G.teams||!G.teams[ME])return;const f=G.teams[ME].fac,pn=$('panel');if(pn)for(const btn of pn.querySelectorAll('.btn.hasic')){const tab=btn.dataset.tab;if(tab!=='build'&&tab!=='units')continue;const k=btn.id.slice(2),b=tab==='build',cv=btn.querySelector('canvas.uic');if(!cv)continue;if(cv.dataset.zs!=='1'){cv.dataset.zs='1';for(const [p,v] of [['position','absolute'],['left','3px'],['top','3px'],['width','calc(100% - 6px)'],['height','calc(100% - 6px)'],['object-fit','cover'],['margin','0'],['max-height','none'],['min-height','0']])cv.style.setProperty(p,v,'important');btn.style.setProperty('position','relative','important');}
    const c=zhCamGet(f,k,b);if(c===undefined){if(!btn.hidden)zhCamWant(f,k,b);continue;}if(c&&cv.dataset.cam!=='1'){cv.dataset.cam='1';const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.drawImage(c,0,0,cv.width,cv.height);}}
  const im=document.querySelector('#side #info .ukU img,#side #info .ukU canvas');if(im){const s=(G.sel||[]).find(e=>e&&!e.dead&&e.team===ME);if(s){const c=zhCamGet(f,s.kind,!!s.isB);if(c===undefined)zhCamWant(f,s.kind,!!s.isB);else if(c&&im.dataset.cam!==s.kind){im.dataset.cam=s.kind;if(im.tagName==='IMG')im.src=c._u||(c._u=c.toDataURL('image/jpeg',.85));else{const x=im.getContext('2d');x.clearRect(0,0,im.width,im.height);x.drawImage(c,0,0,im.width,im.height);}}}}}
{const _z=zhCtx;zhCtx=function(){_z();try{if(innerWidth>=900)zhCamPaint();}catch(e){}};}
