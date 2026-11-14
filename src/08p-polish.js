/* polishfeel (Abdullah 2026-11-13 "the best battle game of all time"): view-only finish for Battle and the Test range.
   - the controls hint is one short readable line (it used to be a 600-character strip cut off by an ellipsis);
   - command-bar names and prices are larger on PC;
   - Test range tools, added INSIDE the existing Test range panel (#sbx): spawn any unit for either side with a click,
     pause / speed 1/2x-4x, overview camera, heal, reset. Test range only; nothing here touches the simulation rules. */
(function(){if(typeof document==='undefined')return;
const css='#app #hint{font-family:var(--display,system-ui,sans-serif);font-size:13px;letter-spacing:.01em;opacity:.85;color:#e6ece8}'+
 '@media (min-width:1100px) and (min-height:600px){#panel .btn .n{font-size:12px!important}#panel .btn .c{font-size:11.5px!important}#panel .btn .sub,#panel .sub{font-size:11px!important}}'+
 '#sbTools{display:flex;flex-direction:column;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.12);font-size:12.5px}'+
 '#sbTools .r{display:flex;flex-wrap:wrap;gap:5px;align-items:center}#sbTools .l{opacity:.7;min-width:36px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase}'+
 '#sbTools button,#sbTools select{min-height:26px;padding:2px 5px;font-size:12px;border-radius:3px;flex:0 0 auto;width:auto;min-width:0}#sbTools .r button.w{flex:1 1 auto}'+
 '#sbTools button.on{outline:1px solid #e0b040;color:#f3d27a}#sbTools select{max-width:150px}'+
 'body.sbArm #c,body.sbArm canvas{cursor:copy!important}';
const st=document.createElement('style');st.textContent=css;document.head.append(st);
const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;};
let side=0,n=1,kind='',built=null;
function kinds(team){const T=G.teams[team],out=[];for(const k of Object.keys(BASE)){let s;try{s=stats(T.fac,k);}catch(e){}if(!s||!s.name||STRUCT[k])continue;if(s.dom==='naval'&&!G.map.hasWater)continue;out.push([k,s.name]);}{const c={};for(const a of out)c[a[1]]=(c[a[1]]||0)+1;for(const a of out)if(c[a[1]]>1)a[1]+=' ('+a[0]+')';}return out.sort((a,b)=>a[1].localeCompare(b[1]));}
function fill(sel){const prev=kind;sel.innerHTML='';const ks=kinds(side);for(const [k,nm] of ks){const o=mk('option','',nm);o.value=k;sel.append(o);}kind=ks.some(a=>a[0]===prev)?prev:(ks[0]&&ks[0][0])||'';sel.value=kind;}
function arm(on){if(!G)return;G.sbSpawn=on?{team:side,kind,n}:null;document.body.classList.toggle('sbArm',!!on);const b=built&&built.go;if(b){b.classList.toggle('on',!!on);b.textContent=on?'Click the map…':'Place on map';}}
function spawnAt(w){const S=G.sbSpawn;if(!S||!w)return;const T=G.teams[S.team];let made=0;
  for(let i=0;i<S.n;i++){const a=i*2.4,r=i?14*Math.sqrt(i):0;let x=w.x+Math.cos(a)*r,y=w.y+Math.sin(a)*r;const s=stats(T.fac,S.kind);
    const p=nearestPassXY(s.dom,x,y);if(!p)continue;const u=addUnit(S.team,S.kind,p[0],p[1]);if(u){made++;if(S.team===1)u.ang=u.va=u.hd=Math.PI;}}
  if(made){try{pushLog(made+' x '+stats(T.fac,S.kind).name+(S.team?' (enemy)':'')+' placed.','g');}catch(e){}}}
window.addEventListener('pointerdown',e=>{if(!G||!G.sandbox||!G.sbSpawn||e.target!==cv)return;
  if(e.button===2){arm(false);e.stopImmediatePropagation();e.preventDefault();return;}
  if(e.button!==0)return;e.stopImmediatePropagation();e.preventDefault();const r=cv.getBoundingClientRect();spawnAt(screenToWorld(e.clientX-r.left,e.clientY-r.top));if(!e.shiftKey)arm(false);},true);
window.addEventListener('contextmenu',e=>{if(G&&G.sandbox&&e.target===cv&&document.body.classList.contains('sbArm'))e.preventDefault();},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&G&&G.sbSpawn){arm(false);e.stopImmediatePropagation();}},true);
function build(){const host=document.getElementById('sbx');if(!host)return null;
  const W=mk('div');W.id='sbTools';
  const r1=mk('div','r');r1.append(mk('span','l','Spawn'));
  const sd=mk('button','','Your side'),sel=mk('select'),cnt=mk('select'),go=mk('button','','Place on map');
  sd.onclick=()=>{side=side?0:1;sd.textContent=side?'Enemy side':'Your side';fill(sel);if(G.sbSpawn)arm(true);};
  sel.onchange=()=>{kind=sel.value;if(G.sbSpawn)arm(true);};
  for(const v of [1,5,10,20]){const o=mk('option','',v+'x');o.value=v;cnt.append(o);}cnt.onchange=()=>{n=+cnt.value;if(G.sbSpawn)arm(true);};
  go.className='w';go.onclick=()=>arm(!G.sbSpawn);go.title='Click the map to drop the units (Shift keeps placing, right-click or Esc stops)';
  r1.append(sd,sel,cnt,go);
  const r2=mk('div','r');r2.append(mk('span','l','Time'));const sp=[];
  for(const [t,v] of [['Pause',0],['½×',.5],['1×',1],['2×',2],['4×',4]]){const b=mk('button','',t);b.dataset.v=v;b.onclick=()=>{G.sbSpd=v;mark();};sp.push(b);r2.append(b);}
  const mark=()=>{const v=G.sbSpd==null?1:G.sbSpd;for(const b of sp)b.classList.toggle('on',+b.dataset.v===v);};
  const r3=mk('div','r');r3.append(mk('span','l','Range'));
  const ov=mk('button','','Overview'),hl=mk('button','','Heal all'),rs=mk('button','','Reset range');
  ov.onclick=()=>{try{centerOn(MAPW/2,MAPH/2);cam.td=zmax();}catch(e){}};ov.title='Pull the camera up over the whole battlefield';
  hl.onclick=()=>{for(const u of G.ents)if(!u.dead&&u.team===0&&u.max&&u.hp<u.max)u.hp=u.max;try{pushLog('Your units are repaired.','g');}catch(e){}};
  rs.onclick=()=>{try{arm(false);startSandbox();}catch(e){console.warn(e);}};rs.title='Start the Test range again from scratch';
  rs.className='w';r3.append(ov,hl,rs);W.append(r1,r2,r3);host.append(W);built={go,sel,sd,mark};return built;}
setInterval(()=>{try{if(!G||!G.sandbox){if(document.body.classList.contains('sbArm'))document.body.classList.remove('sbArm');return;}
  if(!document.getElementById('sbTools')){built=null;}if(!built){if(!build())return;fill(built.sel);}built.mark();}catch(e){}},700);
})();
