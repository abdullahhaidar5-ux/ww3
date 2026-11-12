// ===== 13c-grandui: the grand map screen (PC: mouse + keyboard) =====
// Left-click selects (province or army chip), right-click orders the selected army (move / attack), wheel zooms, drag pans.
// Menu: "Grand campaign" (Continue / New) lives next to Conquest, Missions, Tutorial on the main menu.
const GV={cv:null,ctx:null,w:0,h:0,z:1,ox:0,oy:0,sel:-1,selA:0,hov:-1,img:null,idx:null,dirty:true,chips:[],drag:null,busy:0,raf:0,hint:''};
const GU_RW=typeof GM_REAL_FULL!=='undefined'?GM_REAL_W:1200,GU_RH=typeof GM_REAL_FULL!=='undefined'?GM_REAL_H:600,GU_K=GM_W/GU_RW;   // province raster resolution (realmap: the full real-world raster, 1 px = 1 map unit)
const GU_TERR={d:[222,196,140],m:[138,126,112],f:[150,182,100],u:[168,160,150],j:[72,142,82],s:[226,232,238],c:[176,192,150],r:[140,176,122]};
function guEl(tag,css,html){return campEl(tag,css,html);}
function guCols(){grMap();const N=GM_P.length,P=GCM.P;if(!GV.idx){const idx=new Uint16Array(GU_RW*GU_RH),sx=new Float32Array(N),sy=new Float32Array(N);P.forEach(p=>{sx[p.i]=p.x/GU_K;sy[p.i]=p.y/GU_K;});
    if(typeof GM_REAL_FULL==='undefined')for(let y=0;y<GU_RH;y++)for(let x=0;x<GU_RW;x++){let bi=0,bd=1e12;for(let i=0;i<N;i++){const dx=sx[i]-x,dy=sy[i]-y,d=dx*dx+dy*dy;if(d<bd){bd=d;bi=i;}}idx[y*GU_RW+x]=bi;}if(typeof GM_REAL!=='undefined'){const bin=atob(GM_REAL);let o=0,k=0;const rd=()=>{let v=0,sh=0,b;do{b=bin.charCodeAt(o++);v|=(b&127)<<sh;sh+=7;}while(b&128);return v;};while(o<bin.length){const v=rd(),run=rd();if(v)idx.fill(v-1,k,k+run);k+=run;}}   // real state/province borders (13f-grandreal.js) override the nearest-seed cells
GV.idx=idx;}
  return GV.idx;}
function guRgb(s){const m=/^#([0-9a-f]{6})$/i.exec(s);if(m){const n=parseInt(m[1],16);return [n>>16,(n>>8)&255,n&255];}const h=/hsl\((\d+),(\d+)%,(\d+)%\)/.exec(s);if(h){const H=+h[1]/360,S=+h[2]/100,L=+h[3]/100,f=n=>{const k=(n+H*12)%12,a=S*Math.min(L,1-L);return Math.round(255*(L-a*Math.max(-1,Math.min(k-3,9-k,1))));};return [f(0),f(8),f(4)];}return [140,140,140];}
function guPaint(){const idx=guCols(),P=GCM.P;if(!GV.img){GV.img=document.createElement('canvas');GV.img.width=GU_RW;GV.img.height=GU_RH;}
  const cx=GV.img.getContext('2d'),id=cx.createImageData(GU_RW,GU_RH),d=id.data;const col=P.map(p=>p.land?grNatRgb(GC.prov[p.i].o):null);
  for(let y=0;y<GU_RH;y++)for(let x=0;x<GU_RW;x++){const k=y*GU_RW+x,i=idx[k],p=P[i];let r,g,b;
    const n=((x*73856093)^(y*19349663))&15;
    if(p.sea){const t=y/GU_RH;r=22+t*10+n*.3;g=58+t*14+n*.4;b=96+t*16+n*.5;}
    else{const c=col[i],T=GU_TERR[p.t]||GU_TERR.d;r=c[0]*.62+T[0]*.38;g=c[1]*.62+T[1]*.38;b=c[2]*.62+T[2]*.38;const sh=(n-8)*.9;r+=sh;g+=sh;b+=sh;}
    const R=x+1<GU_RW?idx[k+1]:i,D=y+1<GU_RH?idx[k+GU_RW]:i;
    for(const j of [R,D]){if(j===i)continue;const q=P[j];
      if(p.sea&&q.sea){r*=.93;g*=.95;b*=.97;}
      else if(p.sea!==q.sea){const k2=.55;r=r*k2+10;g=g*k2+22;b=b*k2+34;}
      else{const own=GC.prov[i].o!==GC.prov[j].o;const k2=own?.42:.78;r*=k2;g*=k2;b*=k2;}}
    const o=k*4;d[o]=r;d[o+1]=g;d[o+2]=b;d[o+3]=255;}
  cx.putImageData(id,0,0);GV.dirty=false;}
function grNatRgb(c){const N=grNat(c),k=N.color;if(N.rgbK!==k){N.rgbK=k;N.rgb=guRgb(k);}return N.rgb;}
function guProvAt(wx,wy){const x=Math.floor(wx/GU_K),y=Math.floor(wy/GU_K);if(x<0||y<0||x>=GU_RW||y>=GU_RH)return -1;return GV.idx[y*GU_RW+x];}
function guToWorld(sx,sy){if(GV.g3){const g=g3Ground(sx,sy);return g||[-1e4,-1e4];}return [(sx-GV.ox)/GV.z,(sy-GV.oy)/GV.z];}
function guFit(r){if(GV.g3){g3Fit(r);return;}const R=r||[0,0,GM_W,GM_H];const z=Math.min(GV.w/R[2],GV.h/R[3]);GV.z=z;GV.ox=(GV.w-R[2]*z)/2-R[0]*z;GV.oy=(GV.h-R[3]*z)/2-R[1]*z;guClamp();}
function guClamp(){if(GV.g3)return;const zmin=Math.max(GV.w/GM_W,GV.h/GM_H)*.98;GV.z=Math.max(zmin,Math.min(24,GV.z));const mw=GM_W*GV.z,mh=GM_H*GV.z;GV.ox=mw<=GV.w?(GV.w-mw)/2:Math.min(0,Math.max(GV.w-mw,GV.ox));GV.oy=mh<=GV.h?(GV.h-mh)/2:Math.min(0,Math.max(GV.h-mh,GV.oy));}
function guCentre(pi,z){if(GV.g3){g3Centre(pi,z);return;}const p=GCM.P[pi];if(z)GV.z=z;GV.ox=GV.w/2-p.x*GV.z;GV.oy=GV.h/2-p.y*GV.z;guClamp();}

// ---------- drawing ----------
function guDraw(){GV.raf=0;const cv=GV.cv;if(!cv||!GC)return;if(GV.dirty)guPaint();const c=GV.ctx,P=GCM.P,z=GV.z;c.setTransform(1,0,0,1,0,0);c.fillStyle='#16324f';c.fillRect(0,0,GV.w,GV.h);
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(GV.img,GV.ox,GV.oy,GM_W*z,GM_H*z);
  const sx=x=>x*z+GV.ox,sy=y=>y*z+GV.oy;GV.chips=[];
  // selected province outline
  if(GV.sel>=0)guOutline(GV.sel,'#fff2a8',2.4);if(GV.hov>=0&&GV.hov!==GV.sel)guOutline(GV.hov,'rgba(255,255,255,.7)',1.4);
  // sea lanes of the selected army / all own armies: dotted paths
  c.lineWidth=2;c.setLineDash([6,5]);
  for(const a of GC.armies){if(!a.path.length||(a.o!==GC.me&&GC.me))continue;const sel=a.id===GV.selA;c.strokeStyle=sel?'#ffe27a':'rgba(255,255,255,.55)';c.beginPath();let q=P[a.at];c.moveTo(sx(q.x),sy(q.y));for(const j of a.path){q=P[j];c.lineTo(sx(q.x),sy(q.y));}c.stroke();}
  c.setLineDash([]);
  const fs=Math.max(10,Math.min(15,9+z*2.2));c.textAlign='center';c.textBaseline='middle';
  // nation names at overview zoom
  if(z<1.15){const by={};for(const p of P)if(p.land){const o=GC.prov[p.i].o;(by[o]=by[o]||[]).push(p);}c.font='bold '+Math.round(10+z*3)+'px sans-serif';
    for(const o of Object.keys(by)){const L=by[o];if(L.length<2&&z<.8&&!grNat(o).major)continue;let mx=0,my=0;for(const p of L){mx+=p.x;my+=p.y;}mx/=L.length;my/=L.length;c.fillStyle='rgba(0,0,0,.55)';c.fillText(GCM.nats.get(o).name.toUpperCase(),sx(mx)+1,sy(my)+1);c.fillStyle='rgba(255,255,255,.88)';c.fillText(GCM.nats.get(o).name.toUpperCase(),sx(mx),sy(my));}}
  for(const p of P){const X=sx(p.x),Y=sy(p.y);if(X<-40||Y<-40||X>GV.w+40||Y>GV.h+40)continue;
    if(p.sea){if(p.ck){c.fillStyle='#e0533f';c.beginPath();c.moveTo(X,Y-7);c.lineTo(X+7,Y);c.lineTo(X,Y+7);c.lineTo(X-7,Y);c.closePath();c.fill();c.strokeStyle='#fff';c.lineWidth=1.2;c.stroke();if(z>=.9){c.font='bold '+fs+'px sans-serif';c.fillStyle='#ffd9d2';c.fillText(p.n,X,Y+16);}}else if(z>=1.4){c.font='italic '+fs+'px sans-serif';c.fillStyle='rgba(190,220,255,.7)';c.fillText(p.n,X,Y);}continue;}
    const st=GC.prov[p.i];
    if(z>=1.2){ // towns as dots, resources as pips
      for(let k=0;k<p.tw;k++){c.fillStyle='#f4efe1';c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=1;const ax=X+(k-(p.tw-1)/2)*7*Math.min(z,1.6),ay=Y-10*Math.min(z,1.6);c.beginPath();c.arc(ax,ay,2.4+Math.min(z,2),0,6.3);c.fill();c.stroke();}
      let rx=X-((p.oil?1:0)+(p.farm?1:0)+(p.mine?1:0)+(p.port?1:0)-1)*6;const pip=(f)=>{f(rx,Y+12);rx+=12;};
      if(p.oil)pip((a,b)=>{c.fillStyle='#111';c.beginPath();c.arc(a,b,4.2,0,6.3);c.fill();c.fillStyle='#8fd0ff';c.fillRect(a-1.5,b-2.2,1.6,1.6);});
      if(p.farm)pip((a,b)=>{c.fillStyle='#f0d060';c.fillRect(a-3.5,b-3.5,7,7);});
      if(p.mine)pip((a,b)=>{c.fillStyle='#b9bec6';c.beginPath();c.moveTo(a,b-4.5);c.lineTo(a+4.5,b+3.5);c.lineTo(a-4.5,b+3.5);c.closePath();c.fill();});
      if(p.port)pip((a,b)=>{c.strokeStyle='#bfe4ff';c.lineWidth=1.8;c.beginPath();c.arc(a,b,3.6,0,6.3);c.stroke();});}
    if(GC.nat[st.o]&&GC.nat[st.o].cap===p.i){c.fillStyle='#ffd24a';c.strokeStyle='#5a3d00';c.lineWidth=1;guStar(c,X,Y-(z>=1.2?22:12),7,3);}
    else if(p.wg&&GC.nat[st.o]&&GC.nat[st.o].wg.includes(p.i)&&z>=.9){c.strokeStyle='#ffd24a';c.lineWidth=1.6;c.beginPath();c.arc(X,Y-(z>=1.2?22:12),4.5,0,6.3);c.stroke();}
    if(z>=1.7){c.font=(p.cap?'bold ':'')+fs+'px sans-serif';c.fillStyle='rgba(0,0,0,.6)';c.fillText(p.n,X+1,Y+41);c.fillStyle='#fff';c.fillText(p.n,X,Y+40);}
    if(GC.me&&st.o===GC.me&&st.un>55&&z>=.9){c.fillStyle='#e0533f';c.font='bold '+fs+'px sans-serif';c.fillText('!',X+16*Math.min(z,1.4),Y-12);}}
  // army chips (own first), stacked left to right under the province
  const by={};for(const a of GC.armies)if(grSeen(a))(by[a.at]=by[a.at]||[]).push(a);
  for(const k of Object.keys(by)){const p=P[k],L=by[k].sort((a,b)=>(b.o===GC.me)-(a.o===GC.me)||a.id-b.id),X=sx(p.x),Y=sy(p.y);const show=z>=.9||L.some(a=>a.o===GC.me)||L.length;let n=0;
    const lim=z<1.2?2:5;const shown=L.slice(0,lim);const cw=26,w0=shown.length*(cw+3)-3;shown.forEach((a,i)=>{const x=X-w0/2+i*(cw+3),y=Y+(z>=1.2?20:8);const mine=a.o===GC.me;
      c.fillStyle=grNat(a.o).color;c.strokeStyle=a.id===GV.selA?'#ffe27a':mine?'#fff':'rgba(0,0,0,.7)';c.lineWidth=a.id===GV.selA?3:mine?1.8:1.2;c.fillRect(x,y,cw,15);c.strokeRect(x,y,cw,15);
      c.fillStyle='#fff';c.font='bold 11px sans-serif';c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=3;c.fillText(String(a.u.length),x+cw/2,y+8);c.shadowBlur=0;GV.chips.push({x,y,w:cw,h:15,aid:a.id});});
    if(L.length>lim){c.fillStyle='#fff';c.font='bold 11px sans-serif';c.fillText('+'+(L.length-lim),X+w0/2+12,Y+(z>=1.2?27:15));}}
  // province under the cursor tooltip is DOM; nothing more to draw
}
function guStar(c,x,y,R,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r:R;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}c.closePath();c.fill();c.stroke();}
function guOutline(pi,color,w){const idx=GV.idx,c=GV.ctx,z=GV.z,k=z*GU_K;c.fillStyle=color;const s=Math.max(w,k*1.15);
  // edge cells of province pi from the cached raster (cheap enough for one province)
  const p=GCM.P[pi],R=220/GU_K,x0=Math.max(1,Math.floor(p.x/GU_K-R)),x1=Math.min(GU_RW-2,Math.floor(p.x/GU_K+R)),y0=Math.max(1,Math.floor(p.y/GU_K-R*.8)),y1=Math.min(GU_RH-2,Math.floor(p.y/GU_K+R*.8));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*GU_RW+x;if(idx[i]!==pi)continue;if(idx[i-1]!==pi||idx[i+1]!==pi||idx[i-GU_RW]!==pi||idx[i+GU_RW]!==pi)c.fillRect(x*k+GV.ox-s/2+k/2,y*k+GV.oy-s/2+k/2,s,s);}}
function guRedraw(){if(GV.g3){g3Refresh();return;}if(!GV.raf)GV.raf=requestAnimationFrame(guDraw);}

// ---------- screen ----------
function grandScreenShow(v){G3.last=0;const e=document.getElementById('grandScreen');if(e)e.style.display=v?'flex':'none';if(v)guResize();}
function guResize(){const cv=GV.cv,w=document.getElementById('gMapWrap');if(!cv||!w)return;const r=w.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);GV.w=r.width;GV.h=r.height;if(GV.g3){g3Resize();return;}cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);cv.style.width=r.width+'px';cv.style.height=r.height+'px';GV.ctx=cv.getContext('2d');GV.ctx.setTransform(dpr,0,0,dpr,0,0);guClamp();guRedraw();}
/* fixes1 (2026-11-11): the first map of a session was drawn before the real land data (grand/elev.png + color.jpg, ~6 MB) had arrived and then
   stayed on the hand-shaped stand-in terrain for the whole campaign: chalk-white cliffs along Arabia's Red Sea coast, no Alps, wrong rivers of palms.
   The campaign menu now starts the download (guRealPre) and the map waits for it behind a short "Loading the world map" card (at most 10 s, then
   the stand-in as before; a failed download does not wait). Automated browsers open the map at once unless window.__grandWait is set, because the
   tests call grandOpen() and use the map in the same step. */
function guRealOn(){return typeof g3LoadReal==='function'&&!(navigator.webdriver&&!window.__grandWait);}
function guRealPre(){if(guRealOn())try{g3LoadReal();}catch(e){}}
function guRealWait(){if(!guRealOn())return false;try{g3LoadReal();}catch(e){return false;}
  if(G3.real||G3.realFail||GV.rw===2)return false;if(GV.rw===1)return true;GV.rw=1;const t0=performance.now();
  const c=guEl('div','position:fixed;inset:0;z-index:8001;background:#0b141d;color:#e8e4d8;display:flex;align-items:center;justify-content:center;font-size:17px;letter-spacing:.04em');c.id='gRealWait';c.textContent='Loading the world map…';document.body.appendChild(c);
  const tick=()=>{if(!(G3.real||G3.realFail)&&performance.now()-t0<10000){setTimeout(tick,100);return;}GV.rw=(G3.real||G3.realFail)?0:2;c.remove();if(GC)grandOpen();};setTimeout(tick,100);return true;}
function grandOpen(){grMap();if(!GC)return;if(guRealWait())return;campClose();let e=document.getElementById('grandScreen');if(e)e.remove();
  e=guEl('div','position:fixed;inset:0;z-index:8000;background:#0b141d;color:#e8e4d8;display:flex;flex-direction:column;font-size:15px;user-select:none;');e.id='grandScreen';
  e.innerHTML=`<div id="gTop"></div>
  <div style="flex:1;display:flex;min-height:0"><div id="gMapWrap" style="flex:1;position:relative;min-width:0"><canvas id="gMap" style="display:block"></canvas><div id="gTip" style="position:absolute;pointer-events:none;display:none;background:rgba(10,16,22,.94);border:1px solid #4a6580;border-radius:6px;padding:6px 9px;font-size:14px;line-height:1.4;max-width:260px;z-index:3"></div><div id="gHint" style="position:absolute;left:10px;bottom:8px;font-size:13px;opacity:.75;pointer-events:none;text-shadow:0 1px 2px #000"></div></div>
  <div id="gSide" style="width:380px;max-width:40vw;background:#101c28;border-left:1px solid #2c4358;display:flex;flex-direction:column;min-height:0"><div id="gSel" style="padding:8px 10px;overflow:auto;flex:1.8;min-height:0"></div><div id="gLog" style="padding:6px 10px;overflow:auto;flex:.6;border-top:1px solid #2c4358;font-size:13px;line-height:1.45;min-height:0"></div></div></div>`;
  document.body.appendChild(e);GV.cv=document.getElementById('gMap');GV.idx=GV.idx||null;GV.dirty=true;guCols();
  const cv=GV.cv;GV.g3=false;try{GV.g3=g3Init(cv);}catch(e){console.error('3D grand map failed, using the flat map',e);g3Dispose();GV.g3=false;}
  guGoUI();
  cv.addEventListener('contextmenu',ev=>{ev.preventDefault();guRight(ev);});
  cv.addEventListener('wheel',ev=>{ev.preventDefault();if(GV.g3){g3Wheel(ev);return;}const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top,[wx,wy]=guToWorld(mx,my),f=Math.exp(-ev.deltaY*.0015);GV.z*=f;guClamp();GV.ox=mx-wx*GV.z;GV.oy=my-wy*GV.z;guClamp();guRedraw();},{passive:false});
  cv.addEventListener('pointerdown',ev=>{if(GV.g3&&ev.button===1){ev.preventDefault();cv.setPointerCapture(ev.pointerId);GV.drag={x:ev.clientX,y:ev.clientY,btn:1,yaw:G3.camera.yaw,pitch:G3.camera.pitch,m:1};return;}if(ev.button!==0)return;cv.setPointerCapture(ev.pointerId);const r0=cv.getBoundingClientRect();GV.drag={x:ev.clientX,y:ev.clientY,ox:GV.ox,oy:GV.oy,m:0,g:GV.g3?g3Ground(ev.clientX-r0.left,ev.clientY-r0.top):null};});
  cv.addEventListener('pointermove',ev=>{const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
    if(GV.drag){const dx=ev.clientX-GV.drag.x,dy=ev.clientY-GV.drag.y;if(Math.abs(dx)+Math.abs(dy)>8)GV.drag.m=1;if(GV.drag.m&&GV.g3){g3Drag(ev,mx,my);return;}if(GV.drag.m){GV.ox=GV.drag.ox+dx;GV.oy=GV.drag.oy+dy;guClamp();guRedraw();return;}}
    const [wx,wy]=guToWorld(mx,my),h=guProvAt(wx,wy);if(h!==GV.hov){GV.hov=h;guRedraw();}if(GV.g3&&GV.drag&&GV.drag.m)return;
    const ah=GV.g3&&typeof g3HitAt==='function'?g3HitAt(mx,my):null;cv.style.cursor=ah?'pointer':'';if(ah){guArmyTip(ah.aid,mx,my);return;}guTip(h,mx,my);});
  cv.addEventListener('pointerup',ev=>{const d=GV.drag;GV.drag=null;if(!d||d.m)return;const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;guClick(mx,my);});
  cv.addEventListener('pointerleave',()=>{GV.hov=-1;document.getElementById('gTip').style.display='none';guRedraw();});
  addEventListener('resize',()=>{if(document.getElementById('grandScreen')){guResize();guTopFit();}});
  gmInit(cv);guResize();guFit(null);const me=GC.me&&GC.nat[GC.me];if(me){GV.sel=me.cap;guCentre(me.cap,2.0);}guRedraw();grandMapRefresh();try{guCoach();}catch(e){}
  if(!window._gKeys){window._gKeys=1;addEventListener('keydown',ev=>{if(!document.getElementById('grandScreen')||document.getElementById('grandScreen').style.display==='none'||G)return;if(ev.key==='Enter'&&!GV.busy&&!document.getElementById('gModal')){ev.preventDefault();guSpeed(GV.spd?0:(GV.lastSpd||2));}
    {const tg=ev.target&&ev.target.tagName;if(tg!=='INPUT'&&tg!=='TEXTAREA'&&tg!=='SELECT'&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey&&!document.getElementById('gModal')){   /* time keys (the grand map's key table): Space pause, + / − speed, 1–5 speed */
      if(ev.key===' '){ev.preventDefault();guSpeed(GV.spd?0:(GV.lastSpd||2));return;}if(ev.key==='+'||ev.key==='='){guSpeed((GV.spd||GV.lastSpd||1)+1);return;}if(ev.key==='-'||ev.key==='_'){if(GV.spd>1)guSpeed(GV.spd-1);return;}
      if(ev.key==='o'||ev.key==='O'){GV.outl=!GV.outl;gmPaint();return;}
      if((ev.key==='t'||ev.key==='T')&&GV.selA&&GC.ph==='plan'){const e=grDrill(GV.selA);if(e){GV.hint=e;guHint();}grSave();guSide();guRedraw();return;}   /* T = drill the selected army */
      if(ev.key>='1'&&ev.key<='5'&&ev.key.length===1){guSpeed(+ev.key);return;}}}
    if(GV.g3)return;const k=ev.key.toLowerCase(),st=60;if(k==='w'||k==='arrowup')GV.oy+=st;else if(k==='s'||k==='arrowdown')GV.oy-=st;else if(k==='a'||k==='arrowleft')GV.ox+=st;else if(k==='d'||k==='arrowright')GV.ox-=st;else return;guClamp();guRedraw();});}}
function guArmyTip(aid,mx,my){const t=document.getElementById('gTip'),a=GC.armies.find(x=>x.id===aid);if(!t||!a||!grSeen(a)){if(t)t.style.display='none';return;}
  const N=GCM.nats.get(a.o),mine=a.o===GC.me,P=GCM.P[a.at];const sea=P&&P.sea;
  t.innerHTML='<b>'+a.nm+'</b><br>'+(N?N.name:a.o)+' · '+a.u.length+(sea?' ships/units at sea':' units')+(P?' · '+P.n:'')+'<br><span style="opacity:.8">'+(mine?'Click to select · right-click a province to move':'Click to inspect')+'</span>';
  t.style.display='block';t.style.left=(mx+16)+'px';t.style.top=(my+16)+'px';}
function guTip(h,mx,my){const t=document.getElementById('gTip');if(!t)return;if(h<0||!GCM.P[h]){t.style.display='none';return;}const p=GCM.P[h];let html;
  if(p.sea){html='<b>'+p.n+'</b><br>'+(p.ck?'<span style="color:#ff9d8e">Chokepoint strait</span><br>':'')+'Sea zone · crossing takes ~'+(p.cost*30)+' days';}
  else{const st=GC.prov[h],N=GCM.nats.get(st.o);html='<b>'+p.n+'</b> <span style="opacity:.7">'+N.name+'</span><br>'+guTerrName(p.t)+' · towns '+p.tw+(p.oil?' · oil':'')+(p.farm?' · farms':'')+(p.mine?' · mines':'')+(p.port?' · port':'')+'<br>Garrison '+st.gar.length+(st.o===GC.me?' · unrest '+Math.round(st.un)+'%':'')+(p.cap?'<br><span style="color:#ffd24a">Capital</span>':GC.nat[st.o]&&GC.nat[st.o].wg.includes(h)?'<br><span style="color:#ffd24a">War goal</span>':'');}
  t.innerHTML=html;t.style.display='block';t.style.left=Math.min(GV.w-270,mx+14)+'px';t.style.top=Math.min(GV.h-110,my+14)+'px';}
function guTerrName(t){return {d:'Desert',m:'Mountains',f:'Farmland',u:'Urban',j:'Jungle/green',s:'Snow/tundra',c:'Coast',r:'River plain',w:'Sea'}[t]||t;}
function guClick(mx,my){if(GV.g3){g3Click(mx,my);return;}for(const c of GV.chips.slice().reverse())if(mx>=c.x&&mx<=c.x+c.w&&my>=c.y&&my<=c.y+c.h){const a=GC.armies.find(x=>x.id===c.aid);GV.selA=c.aid;if(a)GV.sel=a.at;guSide();guRedraw();return;}
  const [wx,wy]=guToWorld(mx,my),h=guProvAt(wx,wy);GV.sel=h;if(GV.selA){const a=GC.armies.find(x=>x.id===GV.selA);if(!a||a.at!==h)GV.selA=0;}guSide();guRedraw();}
function guRight(ev){if(GC.ph!=='plan'||GV.busy||!GV.selA)return;const r=GV.cv.getBoundingClientRect(),[wx,wy]=guToWorld(ev.clientX-r.left,ev.clientY-r.top),h=guProvAt(wx,wy);if(h<0)return;const ids=gmIds();for(const id of ids.slice(1))grOrderMove(id,h);guMoveTo(ids[0]||GV.selA,h);if(ids.length>1)gmPaint();}
function guMoveTo(aid,h){const res=grOrderMove(aid,h);if(res.err){GV.hint=res.err;guHint();return;}
  if(res.decl){const w=GCM.nats.get(res.decl).name;guConfirm('Declare war on '+w+'?','Marching into '+GCM.P[h].n+' means war with '+w+'. Their allies and rivals may react.',()=>{const a=GC.armies.find(x=>x.id===aid);grDeclare(GC.me,res.decl);grOrderMove(aid,h);guSide();guRedraw();grSave();});return;}
  GV.hint=GCM.P[h].n+': arrives ~'+grDateStr(GC.turn+res.r.turns,0)+' ('+res.r.turns+' month'+(res.r.turns>1?'s':'')+')'+(res.r.path.some(j=>GCM.P[j].sea)?' (by sea)':'');guHint();guSide();guRedraw();grSave();}
// First-time coach card on the grand map (Lane D D5 campaign tutorial, 2026-11-07): shown once, closes with its button or any order.
function guCoach(){let seen=0;try{seen=localStorage.getItem('ww3_gcoach');}catch(e){}if(seen||document.getElementById('gCoach'))return;
  /* calmmap: a compact strip, not a big box (same text); goes away on "Got it", on your first order (right-click on the map) or after 60 s */
  const w=document.getElementById('gMapWrap');if(!w)return;const c=guEl('div','position:absolute;left:10px;top:8px;z-index:5;max-width:min(760px,calc(100% - 20px));background:rgba(10,16,22,.9);border:1px solid #4a6580;border-radius:6px;padding:5px 10px;font-size:12px;line-height:1.45;box-shadow:0 2px 8px #0008');c.id='gCoach';
  c.innerHTML='<b style="margin-right:6px">Your first minute</b>Time runs by itself. <b>Space</b> pauses, <b>+ / -</b> change speed. Click your army, then <b>right-click</b> a province to march there. Click a province to see its towns and recruit. <b>O</b> lists all your armies. Hover anything for details. ';
  const b=guEl('button','margin-left:4px;padding:1px 8px;border-radius:4px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;font-size:12px','Got it');b.type='button';b.id='gCoachOk';
  const done=()=>{if(!c.isConnected)return;try{localStorage.setItem('ww3_gcoach','1');}catch(e){}c.remove();if(typeof g3Legend==='function')g3Legend();};
  b.onclick=done;c.appendChild(b);w.appendChild(c);setTimeout(done,60000);if(GV.cv)GV.cv.addEventListener('contextmenu',done,{once:true});if(typeof g3Legend==='function')g3Legend();}
function guHint(){const e=document.getElementById('gHint');if(e)e.textContent=GV.hint||'';}

// ---------- top bar, side panel, log ----------
function grandMapRefresh(){if(GV.g3)g3Refreshed();GV.dirty=true;guTop();guSide();guLog();guRedraw();if(typeof gmPaint==="function")gmPaint();if(GC&&GC.over)guOver();}
/* ---------- THE top bar (camphud; Abdullah 2026-11-11 19:25 "The top tool bar is not intuitive" / "Or better it's ugly"; layout "Go" 19:28) ----------
   ONE row, three zones, one style:
   LEFT time (flag, nation, date, play/pause, speed 1-5) · CENTER resources (icon + number chips: hover = what it is and why it moves,
   click = its window) · RIGHT windows (Nation · Economy · Military as equal text items, then the ☰ menu: Save & exit, Settings, Help).
   Score, provinces and stars live in Nation › Overview. The region list is the ONE "Go to" control on the minimap (guGoUI);
   the alert chips sit under the bar (alBar, 13l-galerts.js). Small menus are guPop (one open at a time; click away or Esc closes).
   View only: nothing here touches the campaign state. Guards: orch/decisions.mjs (camphud). */
function guCss(){if(document.getElementById('guCss'))return;const s=document.createElement('style');s.id='guCss';s.textContent=`
#gTop{display:flex;align-items:center;flex-wrap:nowrap;height:46px;box-sizing:border-box;padding:0 12px;background:linear-gradient(#15232f,#0f1a26);border-bottom:1px solid #2c4358;font:15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e8e4d8;white-space:nowrap;overflow:hidden}
#gTop .gz{display:flex;align-items:center;gap:10px;height:100%;flex:none}
#gTop .gzc{flex:1 0 auto;justify-content:center;gap:2px;margin:0 12px;padding:0 10px}
#gTop .gzl{padding-right:12px;border-right:1px solid #2c4358}#gTop .gzr{gap:2px;padding-left:10px;border-left:1px solid #2c4358}
#gTop .gfl{width:30px;height:20px;border-radius:3px;border:1px solid #e8e4d8;flex:none;overflow:hidden;display:block}#gTop .gfl canvas{width:100%;height:100%;display:block}
#gTop .gnm{font-size:17px;font-weight:700;max-width:200px;overflow:hidden;text-overflow:ellipsis}
#gDate{font-size:16px;font-weight:600;color:#ffe6a8;font-variant-numeric:tabular-nums;min-width:98px;text-align:center}
#gClock{display:inline-flex;align-items:center;gap:6px}
#gPlay{width:34px;height:28px;padding:0;border-radius:5px;border:1px solid #7aa84f;background:#18293a;color:#fff;cursor:pointer;font-size:13px;transition:background .15s}#gPlay.off{background:#4f6b32}#gPlay:hover{border-color:#b6e08a}
.gsp{display:inline-flex;height:28px;box-sizing:border-box;border:1px solid #3d5a73;border-radius:5px;overflow:hidden}
.gsp button{width:21px;height:100%;padding:0;border:0;border-left:1px solid #22384b;background:transparent;color:#8ea2b5;font:600 13px/1 system-ui,sans-serif;cursor:pointer;transition:background .15s,color .15s}
.gsp button:first-child{border-left:0}.gsp button:hover{color:#fff}
.gsp button.in{background:#5a4f30;color:#ffe6a8}.gsp button.on{background:#c9a35a;color:#14202c;font-weight:800}
.gsp.pau button.in{background:#2a3038;color:#b9ad8a}.gsp.pau button.on{background:#4a4636;color:#ffe6a8;box-shadow:inset 0 0 0 1px #c9a35a}
.gch{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 9px;border-radius:6px;border:1px solid transparent;background:transparent;color:#e8e4d8;font:inherit;cursor:pointer;transition:background .15s,border-color .15s}
.gch:hover{background:#1d3248;border-color:#3d5a73}
.gch i{font-style:normal;font-size:16px}.gch b{font-size:16px;font-weight:700;font-variant-numeric:tabular-nums}.gch .lim{font-size:13px;opacity:.7;font-weight:500;margin-left:-4px}
.gch small{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}.gch .up{color:#9fd68a}.gch .dn{color:#ff9d8e}.gch .fl{color:#9fb2c4}.gch.bad b{color:#ff9d8e}
.gwn{height:32px;padding:0 10px;border:0;border-bottom:2px solid transparent;border-top:2px solid transparent;border-radius:0;background:transparent;color:#dfe8f0;font:600 15px/1 system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;transition:color .15s,border-color .15s}
.gwn:hover{color:#ffe6a8;border-bottom-color:#c9a35a}
#gTop.c1 .gz{gap:7px}#gTop.c1 .gzc{margin:0 6px;padding:0 4px;gap:0}#gTop.c1 .gch{padding:0 6px;gap:4px}#gTop.c1 .gwn{padding:0 7px}#gTop.c1 .gnm{max-width:120px}#gTop.c1 .gzl{padding-right:8px}#gTop.c1 .gzr{padding-left:6px}
#gTop.c2 .gnm,#gTop.c2 .gch .lim{display:none}
#gTop.c3 .gsp button:not(.on){display:none}#gTop.c3{padding:0 6px}#gTop.c3 .gch{padding:0 4px}#gTop.c3 .gch i{font-size:14px}
#gAlerts{display:flex;align-items:center;flex-wrap:nowrap;gap:6px;height:30px;box-sizing:border-box;padding:0 12px;background:#0d1822;border-bottom:1px solid #22384b;font:13.5px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;white-space:nowrap;overflow:hidden}
.gal{height:22px;padding:0 10px;border-radius:11px;border:1px solid #3d5a73;background:#16263a;color:#b8c6d4;cursor:pointer;font:inherit;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;transition:background .15s}
.gal:hover{background:#22384f}.gal u{text-decoration:none;font-size:9px;margin-right:5px;vertical-align:1px}.gal b{font-weight:700}
.gal.l0{border-color:#c9665e;color:#ffb3a8;background:#2a1b1e}.gal.l1{border-color:#c9a35a;color:#ffe6a8}.gal.l2{border-color:#3d5a73;color:#b8c6d4}
#gAlMore{flex:none;border-style:dashed;color:#dfe8f0}
.gpop{position:fixed;z-index:8300;min-width:170px;max-height:80vh;overflow:auto;padding:5px;display:flex;flex-direction:column;gap:1px;background:#101c2af7;border:1px solid #4a6580;border-top:2px solid #c9a35a;border-radius:7px;box-shadow:0 8px 28px rgba(0,0,0,.55);font:15px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e8e4d8;animation:gpopIn .12s ease-out}
.gpop>button:not(.gal){text-align:left;padding:7px 12px;border:0;border-radius:5px;background:transparent;color:#dfe8f0;font:inherit;cursor:pointer;white-space:nowrap}
.gpop>button:not(.gal):hover{background:#1d3248;color:#ffe6a8}
.gpop .gal{flex:none;height:26px;text-align:left;margin:2px}
@keyframes gpopIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
#gGoBtn{position:absolute;left:10px;bottom:34px;z-index:4;height:26px;padding:0 10px;border:1px solid #6b5a33;border-radius:6px;background:linear-gradient(#162433f2,#0b141ff2);color:#d8b865;font:700 12px/1 system-ui,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 3px 8px #000a;pointer-events:auto}
#gGoBtn.g3{bottom:138px}#gGoBtn:hover{color:#ffe9a6;border-color:#b99a45}
`;document.head.appendChild(s);
  if(!window._guPop){window._guPop=1;document.addEventListener('pointerdown',ev=>{const t=ev.target;if(t&&t.closest&&(t.closest('.gpop')||t.closest('[data-pop]')))return;guPopClose();},true);}}
/* one small menu at a time: guPop(anchor button, id, items[{t,tip,fn}|{el}], {up,right}); a second click on its button closes it */
function guPopClose(){const p=document.querySelector('.gpop');if(p){p.remove();return true;}return false;}
function guPop(anchor,id,items,o){o=o||{};const was=document.getElementById(id);guPopClose();if(was||!anchor)return null;
  const p=guEl('div','');p.id=id;p.className='gpop';
  for(const it of items){if(it.el){p.appendChild(it.el);continue;}const b=guEl('button','');b.type='button';b.textContent=it.t;if(it.tip)b.title=it.tip;b.onclick=()=>{guPopClose();try{it.fn();}catch(e){console.error(e);}};p.appendChild(b);}
  (document.getElementById('grandScreen')||document.body).appendChild(p);
  const z=(typeof tsVal==='function'&&tsVal())||1,r=anchor.getBoundingClientRect(),pr=p.getBoundingClientRect(),W=innerWidth,H=innerHeight,pw=pr.width,ph=pr.height;
  let x=o.right?r.right-pw:r.left,y=o.up?r.top-ph-6:r.bottom+6;x=Math.max(6,Math.min(W-pw-6,x));y=Math.max(6,Math.min(H-ph-6,y));p.style.left=(x/z)+'px';p.style.top=(y/z)+'px';return p;}
/* change since last month for the stock chips (view only, lives in GV - never saved): the value the bar last showed in the month before */
function guTrend(c,now){let T=GV.tr;if(!T||T.c!==c||T.turn>GC.turn)T=GV.tr={c,turn:GC.turn,cur:now,prev:null};else if(T.turn!==GC.turn){T.prev=T.cur;T.turn=GC.turn;}T.cur=now;
  const o={};for(const k in now)o[k]=T.prev?now[k]-T.prev[k]:null;return o;}
function guK(v){v=Math.round(v);const a=Math.abs(v);return a>=1e6?(v/1e6).toFixed(a>=1e7?0:1)+'M':a>=1e5?Math.round(v/1e3)+'k':v.toLocaleString();}
function guTop(){const t=document.getElementById('gTop');if(!t||!GC)return;guCss();const c=GC.me,me=c?GC.nat[c]:null,N=c?grNat(c):null;
  const cls=t.className;t.innerHTML='';const mk=(k)=>{const z=guEl('div','');z.className='gz '+k;t.appendChild(z);return z;},zl=mk('gzl'),zc=mk('gzc'),zr=mk('gzr');
  /* LEFT: time */
  if(N){const nm=GCM.nats.get(c).name,f=guEl('span','');f.className='gfl';f.style.background=N.color;f.title=nm;try{f.appendChild(esFlagEl(N.fac,30,20));}catch(e){}zl.appendChild(f);const b=guEl('b','',nm);b.className='gnm';b.title=nm;zl.appendChild(b);}
  const d=guEl('b','',GC.ph==='plan'?grDateStr(GC.turn,GC.day|0):grDateStr(GC.turn+1,0));d.id='gDate';d.title='Month '+Math.min(GC.turn,GC.maxTurn)+' of '+GC.maxTurn+(GC.len==='quick'?' (Quick campaign)':'')+'. Time runs by itself: Space pauses, + / − or 1–5 set the speed.';zl.appendChild(d);guClockUI(zl);
  /* CENTER: resources */
  if(me){const E=me.e||{},inc=Math.round(me.inc||0),FC=(typeof gfChip==='function'&&gfChip())||{v:0,L:0,over:false},av=FC.v,fl=FC.L,over=FC.over,oil=GC.eco?GC.eco.oilIdx:0;
    const tr=guTrend(c,{str:Math.round(av),fuel:Math.round(E.fuel||0),food:Math.round(E.food||0),man:Math.round(E.man||0),oil:+oil||0});
    const why=v=>v===null?'':v>0?' Up '+guK(v)+' since last month.':v<0?' Down '+guK(-v)+' since last month.':' No change since last month.';
    const arr=v=>!v?'':'<small class="'+(v>0?'up':'dn')+'">'+(v>0?'▲':'▼')+'</small>';
    const chip=(id,ic,html,tip,fn,bad)=>{const b=guEl('button','','<i>'+ic+'</i>'+html);b.type='button';b.id='gR_'+id;b.className='gch'+(bad?' bad':'');b.title=tip;b.onclick=fn;zc.appendChild(b);};
    const eco=()=>{if(typeof geUiPanel==='function')geUiPanel();},mil=()=>{if(GC.mil&&typeof gmilUiPanel==='function')gmilUiPanel();else npOpen(c,'mil');};
    chip('cash','💰','<b>'+guK(me.cash)+'</b><small class="'+(inc<0?'dn':inc>0?'up':'fl')+'">'+(inc<0?'▼ −':inc>0?'▲ +':'+')+guK(Math.abs(inc))+'</small>',
      'Cash: $'+Math.round(me.cash).toLocaleString()+' in the treasury, '+(inc<0?'shrinking by $'+Math.abs(inc).toLocaleString():'growing by $'+inc.toLocaleString())+' a month. Taxes, trade and oil sales come in; army upkeep, buildings and debt interest go out. Click: Economy.',eco,me.cash<0||inc<0);
    chip('str','⚔','<b>'+Math.round(av/1000)+'k</b><span class="lim">/'+Math.round(fl/1000)+'k</span>'+arr(tr.str),
      'Army strength: '+Math.round(av/1000)+'k of your '+Math.round(fl/1000)+'k force limit'+(over?' — over the limit, so upkeep costs 50% more':'')+'. Recruiting raises it, losses lower it; the limit grows with the land you hold.'+why(tr.str)+' Click: Military.',mil,over);
    chip('fuel','⛽','<b>'+guK(E.fuel||0)+'</b>'+arr(tr.fuel),'Fuel: '+Math.round(E.fuel||0)+' in stock'+(E.dry?' — EMPTY: vehicles and aircraft stall':'')+'. Oil fields and refineries fill it; tanks, artillery, aircraft and marching armies burn it.'+why(tr.fuel)+' Click: Economy.',eco,!!E.dry);
    chip('food','🌾','<b>'+guK(E.food||0)+'</b>'+arr(tr.food),'Food: '+Math.round(E.food||0)+' in stock'+(E.starve?' — HUNGER: you are losing troops and loyalty':'')+'. Farmland fills it; your people and your troops eat it.'+why(tr.food)+' Click: Economy.',eco,!!E.starve);
    chip('man','👥','<b>'+guK(E.man||0)+'</b>'+arr(tr.man),'Manpower: '+Math.round(E.man||0)+' recruits ready. The towns you hold add recruits every month; raising and refilling units spends them.'+why(tr.man)+' Click: Nation › Military.',()=>npOpen(c,NP.tabs.some(x=>x.id==='mob'&&(!x.show||x.show(c)))?'mob':'mil'));
    chip('oil','🛢','<b>'+oil+'</b>'+arr(tr.oil),'Oil price index: '+oil+' (100 = normal). World crises and closed straits push it up; a high price pays oil exporters and hurts importers.'+why(tr.oil)+' Click: Nation › Economy › World market.',()=>npOpen(c,NP.tabs.some(x=>x.id==='mkt'&&(!x.show||x.show(c)))?'mkt':'eco'));}
  /* RIGHT: windows, then the menu. No End turn button (Abdullah 2026-11-06 22:30 "Why do we still have end turn?"): the clock is the only time control. */
  const win=(id,txt,tip,fn)=>{const b=guEl('button','',txt);b.type='button';b.id=id;b.className='gwn';b.title=tip;b.onclick=fn;zr.appendChild(b);return b;};
  if(me&&typeof npOpen==='function'){win('gNatBtn','Nation','Your nation: overview, government, economy, military, diplomacy and the world',()=>npOpen());
    if(typeof geUiPanel==='function')win('gEcoBtn','Economy','Budget, bonds, buildings, trade and the home front',()=>geUiPanel());
    if(GC.mil&&typeof gmilUiPanel==='function')win('gMilBtn','Military','Generals, fronts, strikes, fleets and stockpiles',()=>gmilUiPanel());}
  const mb=win('gMenuBtn','☰','Menu: Save & exit, Settings, Help',()=>guPop(mb,'gMenuPop',[
    {t:'Save & exit',tip:'Save the campaign and go back to the menu',fn:()=>{grSave();grandClose();}},
    {t:'Settings',tip:'Sound, graphics, text size, color-blind mode',fn:()=>{const s=document.getElementById('settings');if(s)s.style.zIndex='9000';if(typeof openSettings==='function')openSettings();}},
    {t:'Help',tip:'Show the first-minute tips again',fn:()=>{try{localStorage.removeItem('ww3_gcoach');}catch(e){}const o=document.getElementById('gCoach');if(o)o.remove();guCoach();}}],{right:1}));mb.dataset.pop='1';mb.style.fontSize='18px';
  t.className=cls;guTopFit(t);try{alBar();}catch(e){console.error('alBar',e);}}  // hook: alert chips (13l-galerts.js)
/* the bar never wraps: when the window is narrow (or the text size is raised) it tightens in three steps instead */
function guTopFit(t){t=t||document.getElementById('gTop');if(!t)return;t.classList.remove('c1','c2','c3');for(const k of ['c1','c2','c3']){if(t.scrollWidth<=t.clientWidth+1)break;t.classList.add(k);}}
/* the ONE "Go to" control, on the minimap: World, the regions, Levant & Iraq (the ten buttons that used to fill a bar row) */
function guGoUI(){const w=document.getElementById('gMapWrap');if(!w)return;guCss();let b=document.getElementById('gGoBtn');if(b)b.remove();b=guEl('button','','GO TO ▾');b.type='button';b.id='gGoBtn';b.dataset.pop='1';if(GV.g3)b.className='g3';b.title='Jump the map to the whole world or to a region';
  b.onclick=()=>guPop(b,'gGoPop',GR_REGIONS.map(([nm,r])=>({t:nm,fn:()=>{guFit(r);guRedraw();}})),{up:1});w.appendChild(b);}
function guEndTurn(){if(!GC||GC.ph!=='plan'||GC.over||GV.busy||G)return;GV.busy=1;GV.hint='';guHint();GC.day=0;GV.dayF=0;grEndTurn(false);GV.busy=0;if(GV.g3)g3AfterTurn();grandMapRefresh();try{gdNews();}catch(e){}try{gtvShow();}catch(e){}}
/* ---------- real time with pause (EU4 feel, lane A A2 slice 1) ----------
   The calendar runs in days (30 a month); a month ending = the old End turn, so the simulation and its determinism are unchanged:
   the result depends only on state + the orders standing when each month closes + seed. Starts paused (= the classic turn game).
   Space = pause/resume, + / − or 1–5 = speed (grand-map keys; WASD stay camera-only). The clock waits while battles are pending,
   a modal is open or a battle is being fought, so a battle starting pauses the map. GV.spd is this player's UI speed. */
const GU_SPD=[0,.5,1,2.5,5,10];   /* days per second at speeds 1..5 (speed 5: a month in 3 s) */
function guClockUI(t){const w=guEl('span','');w.id='gClock';const ls=GV.lastSpd||2;
  const pb=guEl('button','',GV.spd?'❚❚':'▶');pb.type='button';pb.id='gPlay';if(!GV.spd)pb.className='off';pb.title=GV.spd?'Pause (Space)':'Play: days pass in real time (Space)';pb.onclick=()=>guSpeed(GV.spd?0:(GV.lastSpd||2));w.appendChild(pb);
  const sp=guEl('span','');sp.id='gSpd';sp.className='gsp'+(GV.spd?'':' pau');for(let i=1;i<=5;i++){const b=guEl('button','',''+i);b.type='button';b.className=i===ls?'on':i<ls?'in':'';b.title='Speed '+i+(i===5?' (a month in 3 seconds)':'')+' — key '+i+', or + / −';b.onclick=()=>guSpeed(i);sp.appendChild(b);}
  w.appendChild(sp);t.appendChild(w);}
function guSpeed(s){s=Math.max(0,Math.min(5,s|0));if(s)GV.lastSpd=s;GV.spd=s;GV.clkT=performance.now();guTop();}
function guClockTick(){const now=performance.now(),dt=Math.min(1,(now-(GV.clkT||now))/1000);GV.clkT=now;
  if(!GV.spd||!GC||GC.over||GC.ph!=='plan'||GV.busy||G||document.getElementById('gModal'))return;const sc=document.getElementById('grandScreen');if(!sc||sc.style.display==='none'||document.hidden)return;
  GV.dayF=(GV.dayF||0)+dt*GU_SPD[GV.spd];if(GV.dayF<1)return;const n=Math.floor(GV.dayF);GV.dayF-=n;const d0=GC.day|0;GC.day=d0+n;
  if(GC.day>=30){GC.day=0;GV.dayF=0;guEndTurn();return;}
  /* A2: AI generals act on day ticks (10, 20) — enemy columns set off mid-month and can be seen coming */
  for(const k of [10,20])if(d0<k&&GC.day>=k&&grAIMid(k)){try{grandMapRefresh();}catch(e){}}
  const d=document.getElementById('gDate');if(d)d.textContent=grDateStr(GC.turn,GC.day);}
if(!window._gClk){window._gClk=setInterval(()=>{try{guClockTick();}catch(e){console.error('guClockTick',e);}},100);}
function guProvArmies(pi){return GC.armies.filter(a=>a.at===pi&&grSeen(a));}
function guSide(){const s=document.getElementById('gSel');if(!s||!GC)return;s.innerHTML='';const pi=GV.sel;if(pi<0||!GCM.P[pi]){s.innerHTML='<div style="opacity:.7;line-height:1.6">Click a province to see it.<br>Select an army (click its flag), then <b>right-click</b> a province to march there. Armies cross seas between ports; oceans take several weeks.<br>Time runs like EU4: <b>Space</b> or ▶ to play or pause, keys <b>1–5</b> for speed. Give orders while paused.</div>';return;}
  const p=GCM.P[pi];if(p.sea){s.innerHTML='<h2 style="margin:0 0 4px;font-size:19px">'+p.n+'</h2><div style="opacity:.8">Sea zone · ~'+(p.cost*30)+' days to cross'+(p.ck?'<br><span style="color:#ff9d8e">Chokepoint: whoever holds it will control trade (stage 2).</span>':'')+'</div>'+guArmyRows(pi);guBindArmies(s,pi);try{gmilUiProv(s,pi);}catch(e){console.error('gmilUiProv',e);}return;}
  const st=GC.prov[pi],N=GCM.nats.get(st.o),mine=st.o===GC.me,me=GC.me;
  /* ingameui slice 1: header (flag, name, owner, badges, stat chips) + tabs Overview · Recruit · Build · Govern (UK kit, 08j-uikit.js) */
  const root=guEl('div','');root.className='uk';s.appendChild(root);
  const hd=guEl('div','');hd.className='uk-hd';try{hd.appendChild(esFlagEl(grNat(st.o).fac,36,24));}catch(e){}
  const ht=guEl('div','min-width:0');ht.innerHTML='<h2></h2><div class="uk-sub"></div>';ht.querySelector('h2').textContent=p.n;
  const wg=GC.nat[st.o]&&GC.nat[st.o].wg.includes(pi);ht.querySelector('.uk-sub').innerHTML=N.name+' · '+guTerrName(p.t)+(p.cap?'<span class="uk-badge">Capital</span>':wg?'<span class="uk-badge red">War goal</span>':'');hd.appendChild(ht);root.appendChild(hd);
  const ch=guEl('div','');ch.className='uk-chips';
  ch.appendChild(UK.chip('🏘',p.tw,'Towns — tax, recruits and battle objectives'));
  ch.appendChild(UK.chip('🛡',st.gar.length,'Garrison — '+st.gar.length+' units, strength '+Math.round(grProvDef(pi)/100)/10+'k'));
  if(mine)ch.appendChild(UK.chip('✊',Math.round(st.un)+'%','Unrest — above 55% risks revolts and strikes',st.un>55?'warn':st.un<20?'good':''));
  if(mine)ch.appendChild(UK.chip('💰',GR_TAX[st.tax],'Tax rate — set it on the Govern tab'));
  const res=[p.oil&&['🛢','Oil'],p.farm&&['🌾','Farms'],p.mine&&['⛏','Mines'],p.port&&['⚓','Port']].filter(Boolean);for(const r of res)ch.appendChild(UK.chip(r[0],r[1],r[1]+' in this province'));
  root.appendChild(ch);
  const ov=guEl('div','');let sp='';if(typeof ocLine==='function')sp=ocLine(pi);if(sp)ov.insertAdjacentHTML('beforeend',sp);   /* A6 occupation reaction (13y-goccupy.js) */
  if(!mine){if(me&&GC.nat[st.o]&&!grFriend(me,st.o))guSpyRow(ov,pi,st.o);try{geUiProv(ov,pi);}catch(e){console.error('geUiProv',e);}try{gmilUiProv(ov,pi);}catch(e){console.error('gmilUiProv',e);}
    const ar=guEl('div');ar.innerHTML=guArmyRows(pi);ov.appendChild(ar);root.appendChild(ov);guBindArmies(s,pi);return;}
  const fac=grNat(me).fac,rq=st.rq.length,bq=st.bq.length;
  const P=UK.tabs(root,[['ov','Overview'],['rec','Recruit',rq||''],['bld','Build',bq||''],['gov','Govern']],GV.pvTab,k=>{GV.pvTab=k;});
  P.ov.appendChild(ov);try{gmilUiProv(P.ov,pi);}catch(e){console.error('gmilUiProv',e);}const ar=guEl('div');ar.innerHTML=guArmyRows(pi);P.ov.appendChild(ar);
  /* Recruit: unit cards */
  P.rec.appendChild(UK.sec('Recruit here','arrives in 1–2 months'));const g=guEl('div','');g.className='uk-list';
  for(const [k,n] of GR_RECRUIT){if(!grHasKind(fac,k))continue;let T;try{T=geRecruitTerms(me,pi,k,n);}catch(e){T={cost:grCost(fac,k)*n,man:0,turns:1};}
    const N2=GC.nat[me],why=N2.cash<T.cost?'Not enough money ($'+Math.round(N2.cash)+' of $'+T.cost+')':(N2.e&&N2.e.man<T.man)?'Not enough manpower ('+Math.round(N2.e.man)+' of '+T.man+')':'';
    const cv=document.createElement('canvas');cv.width=88;cv.height=68;try{g3Icon(cv,k,me);}catch(e){}
    const mq=(GC.mac||[]).find(m=>m.p===pi&&m.k===k),nm=grKindName(fac,k);
    const c=UK.card({icon:cv,name:nm,count:'×'+n,meta:'<b>$'+T.cost+'</b> · '+T.turns+' mo',on:!why,why,desc:'Train '+n+' '+nm+' in '+p.n+'. They join the garrison when ready.',rows:[['Cost','$'+T.cost],['Manpower',T.man],['Ready in',T.turns+' month'+(T.turns>1?'s':'')]],
      onclick:()=>{const e=grRecruit(me,pi,k);if(e){GV.hint=e;guHint();}else grSave();guSide();guTop();},onDenied:()=>{GV.hint=why;guHint();}});
    const rp=guEl('span','','↻');rp.className='rp'+(mq?' on':'');rp.dataset.tt=mq?'Repeat order ON — recruits this every month while you can pay. Click to stop.':'Repeat order — recruit this here every month until money runs out';rp.onclick=e=>{e.stopPropagation();gmMacroToggle(pi,k);guSide();};c.appendChild(rp);g.appendChild(c);}
  P.rec.appendChild(g);
  if(rq){const q=guEl('div','');q.className='uk-q';q.textContent='In training: '+st.rq.map(q=>q[2]+'× '+grKindName(fac,q[1])+' (due '+grMonStr(q[0])+')').join(' · ');P.rec.appendChild(q);}
  /* Build + Govern (13h geUiBuild / geUiGovern) */
  try{geUiBuild(P.bld,pi);}catch(e){console.error('geUiBuild',e);}
  P.gov.appendChild(UK.sec('Tax','more money, more unrest'));P.gov.appendChild(UK.seg(GR_TAX,st.tax,i=>{grSetTax(me,pi,i);grSave();guSide();guTopCash();},['Low tax — calmer, less money (good on the front)','Normal tax','High tax — more money, more unrest (good in safe rear towns)']));
  try{geUiGovern(P.gov,pi);}catch(e){console.error('geUiGovern',e);}
  guBindArmies(s,pi);}
function guSpyRow(s,pi,o){const seenP=(grSeenSet()||new Set()).has(pi),sp=GC.spy&&(GC.spy[GC.me+'>'+o]|0)>=GC.turn;   /* RG3 fog of war + spies */
  const r=guEl('div','margin:6px 0 2px;font-size:13px;opacity:.85',sp?'🕵 Our spies report every '+GCM.nats.get(o).name+' army (until '+grMonStr(GC.turn+1+((GC.spy[GC.me+'>'+o]|0)-GC.turn))+').':seenP?'👁 In sight of our lines.':'🌫 Fog of war: armies here are hidden. Move closer or send spies.');s.appendChild(r);
  if(!sp){const b=guEl('button','padding:4px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;margin-top:2px','🕵 Send spies $'+GR_SPY_COST);b.type='button';b.title='Reveal every '+GCM.nats.get(o).name+' army on the map for '+GR_SPY_M+' months';b.onclick=()=>{const e=grSpy(GC.me,o);GV.hint=e||'Spies sent into '+GCM.nats.get(o).name+'.';guSide();guTop();if(typeof g3Refresh==='function')g3Refresh();guRedraw&&guRedraw();};s.appendChild(b);}}
function guTopCash(){guTop();}
function guArmyRows(pi){const L=guProvArmies(pi);if(!L.length)return '<div style="opacity:.6;margin-top:8px">No armies here.</div>';let h='<div class="uk-sec">Armies here</div>';
  for(const a of L){const mine=a.o===GC.me,f=grNat(a.o).fac,counts={};for(const r of a.u)counts[r[0]]=(counts[r[0]]||0)+1;const txt=Object.keys(counts).map(k=>counts[k]+' '+grKindName(f,k)).join(', ');
    h+='<div class="gArmy" data-a="'+a.id+'" style="border:1px solid '+(a.id===GV.selA?'#ffe27a':'#2c4358')+';border-radius:6px;padding:5px 7px;margin:4px 0;background:'+(a.id===GV.selA?'#1d3045':'#14222f')+';cursor:pointer"><span style="display:inline-block;width:10px;height:10px;background:'+grNat(a.o).color+';border:1px solid #fff;margin-right:5px"></span><b>'+a.nm+'</b>'+gmilArmyTag(a)+' <span style="opacity:.75">('+GCM.nats.get(a.o).name+')</span><br><span style="font-size:13px;opacity:.9">'+a.u.length+' units · value '+Math.round(grArmyVal(a)/100)/10+'k'+(a.sup?' · <span style="color:#ff9d8e">out of supply</span>':(typeof gsupTag==='function'&&a.o===GC.me?gsupTag(a):''))+'</span><br><span style="font-size:12px;opacity:.7">'+txt+'</span>'+(a.path.length?'<br><span style="font-size:12px;color:#ffe27a">→ '+GCM.P[a.path[a.path.length-1]].n+'</span>':'')+'</div>';
    if(mine&&a.id===GV.selA)h+='<div class="gActs" data-a="'+a.id+'" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px"><button data-act="split">Split in half</button><button data-act="merge">Merge here</button><button data-act="stop">Cancel orders</button>'+gmilActBtns(a)+'</div>';}
  return h;}
function guBindArmies(s,pi){s.querySelectorAll('.gArmy').forEach(e=>{e.onclick=()=>{GV.selA=+e.dataset.a;guSide();guRedraw();};});
  s.querySelectorAll('.gActs button').forEach(b=>{b.style.cssText='padding:4px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;font-size:13px';b.onclick=()=>{const id=+b.parentNode.dataset.a;if(GC.ph!=='plan')return;if(b.dataset.act==='split'){const n=grSplit(id);if(n)GV.selA=n.id;}else if(b.dataset.act==='merge')grMerge(id);else if(b.dataset.act==='front')gmilCycleFront(id);else if(b.dataset.act==='mine')gmilMinesBtn(id);else if(b.dataset.act==='drill'){const e=grDrill(id);if(e){GV.hint=e;guHint();}}else{const a=GC.armies.find(x=>x.id===id);if(a){a.path=[];a.pg=0;}}grSave();guSide();guRedraw();};});}
function guLog(){const l=document.getElementById('gLog');if(!l||!GC)return;const rows=GC.log.slice(-60).reverse().filter((r,i)=>i<45);l.innerHTML='<div style="font-weight:bold;margin-bottom:3px">War diary</div>'+rows.map(r=>'<div style="'+(r[2]&&r[2]===GC.me?'color:#ffe9a6':'opacity:.82')+'"><span style="opacity:.55">'+grDateStr(r[0],0)+'</span> '+r[1]+'</div>').join('');}
function guConfirm(title,body,yes,no){guModal('<h2 style="margin:0 0 8px;font-size:21px">'+title+'</h2><div style="line-height:1.5;margin-bottom:12px">'+body+'</div>',[['Yes',yes,1],['No',no||null,0]]);}
function guModal(html,btns){const old=document.getElementById('gModal');if(old)old.remove();const m=guEl('div','position:fixed;inset:0;z-index:8500;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;');m.id='gModal';const c=guEl('div','background:#142231;border:1px solid #4a6580;border-radius:10px;padding:16px 20px;max-width:min(560px,92vw);color:#e8e4d8;font-size:16px;');c.innerHTML=html;
  const row=guEl('div','display:flex;gap:8px;flex-wrap:wrap');for(const [t,fn,pri] of btns){const b=guEl('button','padding:9px 16px;border-radius:7px;border:1px solid '+(pri?'#7aa84f':'#6b7a8a')+';background:'+(pri?'#4f6b32':'transparent')+';color:#fff;cursor:pointer;font-size:16px',t);b.type='button';if(!fn)b.dataset.esc='1';b.onclick=()=>{m.remove();if(fn)fn();};row.appendChild(b);}c.appendChild(row);m.appendChild(c);document.body.appendChild(m);return m;}

// ---------- battle prompt: Fight it / Auto-resolve / Withdraw ----------
function grBattlePrompt(b){grandScreenShow(true);guCentre(b.p,2.2);GV.sel=b.p;GV.selA=0;grandMapRefresh();
  const P=GCM.P[b.p],me=GC.me,S=grSideUnits(b,'att'),D=grSideUnits(b,'def'),sv=grSideVal(S),dv=grSideVal(D)*grDefMods(b);
  const cnt=L=>{const o={};for(const s of L)for(const r of s.u){const k=s.fac+'|'+r[0];o[k]=(o[k]||0)+1;}return Object.keys(o).map(k=>o[k]+' '+grKindName(k.split('|')[0],k.split('|')[1])).join(', ')||'—';};
  const nUnits=L=>L.reduce((a,s)=>a+s.u.length,0),pct=Math.round(sv/Math.max(1,sv+dv)*100);const meAtt=b.an===me;
  const canWithdraw=meAtt||GC.armies.filter(a=>b.def.includes(a.id)&&a.o===me).every(a=>grRetreatTo(a,b.p)>=0)&&GC.armies.some(a=>b.def.includes(a.id)&&a.o===me);
  const html='<div style="opacity:.7;font-size:13px">BATTLE · '+(b.river?'river crossing · ':'')+(b.mtn?'mountain pass · ':'')+guTerrName(P.t)+'</div><h2 style="margin:2px 0 8px;font-size:24px">'+P.n+'</h2>'
   +'<div style="display:flex;gap:14px;margin-bottom:8px"><div style="flex:1"><b style="color:#ffb59a">Attackers</b> — '+GCM.nats.get(b.an).name+'<br>'+nUnits(S)+' units<br><span style="font-size:13px;opacity:.8">'+cnt(S)+'</span></div><div style="flex:1"><b style="color:#9fd0ff">Defenders</b> — '+GCM.nats.get(b.dn).name+'<br>'+nUnits(D)+' units'+(b.garr?' (incl. garrison)':'')+'<br><span style="font-size:13px;opacity:.8">'+cnt(D)+'</span></div></div>'
   +'<div style="height:10px;border-radius:5px;background:#3b6ea8;overflow:hidden;margin:4px 0 2px"><div style="width:'+pct+'%;height:100%;background:#d0583d"></div></div><div style="font-size:13px;opacity:.8;margin-bottom:10px">Attackers '+pct+'% · Defenders '+(100-pct)+'% (terrain, river and home-turf bonuses included). Fight it live: you command exactly these units; nothing can be built.</div>';
  guModal(html,[['Fight it live',()=>{grandFightLive(b);},1],['Auto-resolve',()=>{grBattleDone(b,grBattleAuto2(b),'auto');grandMapRefresh();},0],...(canWithdraw?[['Withdraw',()=>{guWithdraw(b);},0]]:[])]);}
function grBattleAuto2(b){const R=grRng(GC.seed*7+GC.turn*131+b.p);return grAuto(b,R).win;}
function guWithdraw(b){const me=GC.me;if(b.an===me){grBattleDone(b,'def','retreat');}
  else{for(const a of GC.armies.filter(x=>b.def.includes(x.id)&&x.o===me)){const to=grRetreatTo(a,b.p);if(to>=0){a.at=to;a.path=[];grLog(a.nm+' withdrew from '+GCM.P[b.p].n+'.',me);}}b.def=b.def.filter(id=>GC.armies.some(a=>a.id===id&&a.at===b.p));
    if(b.garr)grBattleDone(b,grBattleAuto2(b),'auto');else grBattleDone(b,'att','retreat');}
  grandMapRefresh();}
// ---------- end of campaign ----------
function guOver(){if(document.getElementById('gOver'))return;const win=GC.over==='win';const m=guModal('<div style="opacity:.7;font-size:13px">GRAND CAMPAIGN · '+grMonStr(Math.min(GC.turn,GC.maxTurn)).toUpperCase()+'</div><h1 style="margin:2px 0 8px;font-size:30px;color:'+(win?'#9fd36b':'#e07a6a')+'">'+(win?'Victory':'Defeat')+'</h1><div style="line-height:1.5;margin-bottom:12px">'+GC.res+'</div>',[['Main menu',()=>{grClear();grandClose();},1],['Keep looking at the map',()=>{GC.me=null;grSave();},0]]);m.id='gModal';const d=guEl('span');d.id='gOver';m.appendChild(d);}
function grandClose(){g3Dispose();GV.g3=false;const e=document.getElementById('grandScreen');if(e)e.remove();const m=document.getElementById('gModal');if(m)m.remove();GV.cv=null;GV.img=null;try{$('menu').hidden=false;}catch(e){}}

// ---------- menu: Grand campaign (Continue / New) ----------
function grandMenu(){grMap();guRealPre();const saved=(()=>{try{return JSON.parse(localStorage.getItem(GR_KEY));}catch(e){return null;}})(),root=campEl('div');
  root.appendChild(campEl('h1','margin:6px 0 4px;font-size:30px;letter-spacing:.04em;','GRAND CAMPAIGN'));
  root.appendChild(campEl('div','opacity:.75;margin-bottom:14px;line-height:1.5','Run a nation on the world map. Time runs like EU4: play, pause at any moment and give orders. When armies meet you can fight the battle yourself, with exactly the units you brought, or let the generals auto-resolve it.'));
  const usable=saved&&!saved.over&&grSaveOk(saved);
  if(saved&&!saved.over&&!usable){const n=(GM_NATS.find(r=>r[0]===saved.me)||[])[1]||saved.me;root.appendChild(campEl('div','margin:0 0 12px;padding:8px 10px;border:1px solid #8a6a3a;border-radius:6px;background:rgba(120,80,30,.25);line-height:1.5','Your saved campaign ('+n+', '+grMonStr(saved.turn)+') was made on an older world map and can\'t continue on the new one. Start a new campaign.'));}
  if(usable){const n=saved.me?((GM_NATS.find(r=>r[0]===saved.me)||[])[1]||saved.me):'Observer';root.appendChild(campBtn('Continue — '+n+', '+grMonStr(saved.turn)+' (month '+saved.turn+'/'+saved.maxTurn+')',()=>{grLoad();campClose();grandOpen();}));}
  root.appendChild(campBtn('New campaign',()=>{grandSetup();},!!usable));root.appendChild(campBtn('Back',campClose,true));campShow(root);}
function grandSetup(){const root=campEl('div'),majors=grMajors(),minors=[...new Set(GM_P.slice(0,GM_LAND).map(r=>r[1]))].filter(c=>!grNat(c).major).sort((a,b)=>GCM.nats.get(a).name<GCM.nats.get(b).name?-1:1);let nat='IR',len='quick';
  root.appendChild(campEl('h1','margin:6px 0 8px;font-size:28px',GNT.wantHost?'CAMPAIGN WITH FRIENDS':'NEW GRAND CAMPAIGN'));root.appendChild(campEl('div','opacity:.8;margin-bottom:6px','Your nation'));
  const sel=campEl('select','font-size:18px;padding:8px;background:#1a2430;color:#fff;border:1px solid #6b7a55;border-radius:6px;min-width:300px');
  const og=(l,L)=>{const g=document.createElement('optgroup');g.label=l;for(const c of L){const o=document.createElement('option');o.value=c;o.textContent=GCM.nats.get(c).name;g.appendChild(o);}sel.appendChild(g);};
  {const o=document.createElement('option');o.value='';o.textContent='Observer — watch the AI run the whole world';sel.appendChild(o);}og('Full nations',majors.sort((a,b)=>GCM.nats.get(a).name<GCM.nats.get(b).name?-1:1));og('Minor nations (shared regional army)',minors);sel.value=nat;root.appendChild(sel);
  const info=campEl('div','margin:10px 0;opacity:.85;line-height:1.5');const upd=()=>{nat=sel.value;if(!nat){info.textContent='Observer mode: no nation is yours. Every empire is run by the AI; pause, speed up and watch wars, alliances and crises unfold. Click any army or province to inspect it.';return;}const ps=GCM.P.filter(p=>p.land&&p.o===nat),N=grNat(nat);info.innerHTML=GCM.nats.get(nat).name+': <b>'+ps.length+'</b> provinces · capital '+(ps.find(p=>p.cap)||ps[0]).n+' · war goals '+ps.filter(p=>p.wg&&!p.cap).map(p=>p.n).join(', ')+'<br>'+(N.major?'Full nation: its own units and look.':'Minor nation: shared regional army, own flag and colors.')+' Every nation starts with the same strength.';};
  sel.onchange=upd;upd();root.appendChild(info);
  root.appendChild(campEl('div','opacity:.8;margin:8px 0 2px','Length'));const row=campEl('div');const bs=[['Quick — 25 months, win by war goals or score','quick'],['Standard — 60 months (5 years)','std']].map(([t,v])=>{const b=campBtn(t,()=>{len=v;bs.forEach(x=>x[0].style.background=x[1]===v?'#4f6b32':'transparent');},v!=='quick');return [b,v];});bs.forEach(x=>row.appendChild(x[0]));root.appendChild(row);
  root.appendChild(campEl('div','opacity:.8;margin:10px 0 2px','Scenario'));let sc='me26';const srow=campEl('div'),sinfo=campEl('div','margin:4px 0 6px;opacity:.8;font-size:14px;max-width:640px;line-height:1.4');
  const sbs=GR_SCEN.map(S=>{const b=campBtn(S.n+(S.id==='me26'?' ★':''),()=>{sc=S.id;sbs.forEach(x=>x[0].style.background=x[1]===sc?'#4f6b32':'transparent');sinfo.textContent=S.d;},S.id!=='me26');b.title=S.d;return [b,S.id];});sbs.forEach(x=>srow.appendChild(x[0]));sinfo.textContent=GR_SCEN[0].d;root.appendChild(srow);root.appendChild(sinfo);
  root.appendChild(campBtn(GNT.wantHost?'Create lobby':'Begin',()=>{if(GNT.wantHost&&!nat){info.textContent='Pick a nation — friends need a lobby with someone leading.';return;}grNew({me:nat||null,len,sc,seed:(Math.floor(Math.random()*1e9)||7)});grSave();if(GNT.wantHost){gnLobby();return;}campClose();grandOpen();}));root.appendChild(campBtn('Back',grandMenu,true));campShow(root);}
// main menu buttons: Grand campaign · Conquest · Missions · Tutorial (Abdullah 2026-11-06)
(function(){const sb=document.getElementById('sandbox');if(!sb||document.getElementById('grandBtn'))return;const b=document.createElement('button');b.className='big';b.id='grandBtn';b.type='button';b.textContent='Grand campaign';b.title='The world map: run a nation, fight the battles yourself or auto-resolve them';b.onclick=()=>{try{initAudio();}catch(e){}grandMenu();};
  const camp=document.getElementById('campaign')||sb;camp.parentNode.insertBefore(b,camp);const st=document.getElementById('start');if(st)st.textContent='Conquest — deploy vs AI';})();

/* ---------- A3 smooth army control (Lane F): multi-select, box, double-click, group orders, cards ----------
   GV.selM = ids of 2+ selected own armies (GV.selA stays the "lead" army so every old panel keeps working). */
GV.selM=GV.selM||new Set();
/* select all (Abdullah 2026-11-07 16:17-16:23): Ctrl+A = all your armies, N = all your navies (Ctrl+N belongs to the browser);
   Ctrl+D drones / Ctrl+M missiles come when those exist as map units (PLAN-SAT SEL). Also buttons in the bottom campaign bar. */
function gmSelDrones(){if(!GC||!GC.armies)return;const L=GC.armies.filter(a=>a.o===GC.me&&a.u.some(r=>r[0]==='drone')).map(a=>a.id);if(L.length)gmSet(L);else if(typeof gevToast==='function')try{gevToast(['You have no drone armies']);}catch(e){}}   // gair: Ctrl+D (Ctrl+M: missiles are strikes, not map items)
function gmSelAll(sea){if(!GC||!GC.armies)return;const L=GC.armies.filter(a=>a.o===GC.me&&!!(GCM.P[a.at]&&GCM.P[a.at].sea)===!!sea).map(a=>a.id);if(L.length)gmSet(L);else if(typeof gevToast==='function')try{gevToast([sea?'You have no navies':'You have no armies']);}catch(e){}}
if(typeof window!=='undefined'&&!window._gSelAll){window._gSelAll=1;addEventListener('keydown',ev=>{const gs=document.getElementById('grandScreen');if(!gs||gs.style.display==='none'||(typeof G!=='undefined'&&G))return;
  const tg=ev.target&&ev.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||document.getElementById('gModal'))return;const k=(ev.key||'').toLowerCase();
  if((ev.ctrlKey||ev.metaKey)&&!ev.shiftKey&&!ev.altKey&&k==='a'){ev.preventDefault();gmSelAll(false);}
  else if((ev.ctrlKey||ev.metaKey)&&!ev.shiftKey&&!ev.altKey&&k==='d'){ev.preventDefault();gmSelDrones();}
  else if(!ev.ctrlKey&&!ev.metaKey&&!ev.altKey&&k==='n'){ev.preventDefault();gmSelAll(true);}});}
function gmMine(id){const a=GC&&GC.armies.find(x=>x.id===id);return a&&a.o===GC.me?a:null;}
function gmIds(){return GV.selM&&GV.selM.size>1?[...GV.selM].filter(gmMine):(GV.selA?[GV.selA]:[]);}
function gmSet(ids){const L=[...new Set(ids)].filter(gmMine);GV.selM=L.length>1?new Set(L):new Set();GV.selA=L[0]||0;if(L[0])GV.sel=gmMine(L[0]).at;gmPaint();guSide();guRedraw();}
function gmPts(){const o=[];if(GV.g3&&typeof G3!=='undefined'&&G3.hit)for(const h of G3.hit)o.push({aid:h.aid,x:h.x,y:h.y});else for(const c of GV.chips||[])o.push({aid:c.aid,x:c.x+c.w/2,y:c.y+c.h/2});return o;}
function gmPaint(){try{if(!document.getElementById('gmCss')){const s=document.createElement('style');s.id='gmCss';s.textContent='#gMapWrap .p.gmsel{outline:2px solid #ffe27a;outline-offset:1px;border-radius:3px}#gmCards{position:absolute;left:8px;top:44px;max-height:62%;overflow:auto;display:flex;flex-direction:column;gap:3px;z-index:40;font-size:13px}#gmCards .c{background:rgba(10,16,22,.9);border:1px solid #4a6580;border-left:4px solid #ffe27a;border-radius:5px;padding:3px 8px;cursor:pointer;min-width:170px}#gmCards .c:hover{background:#18293a}#gmCards button{padding:3px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;font-size:12px;margin-right:4px}';document.head.appendChild(s);}
  const ids=new Set(gmIds());if(typeof G3!=='undefined'&&G3.pl)for(const [id,el] of G3.pl)el.classList.toggle('gmsel',ids.size>1&&(el._ids||[id]).some(x=>ids.has(x)));   /* one token per stack (13e3-gtokens.js) */
  const w=document.getElementById('gMapWrap');if(!w)return;gmOutliner(w);let c=document.getElementById('gmCards');if(!c){c=document.createElement('div');c.id='gmCards';w.appendChild(c);}
  if(ids.size<2){c.style.display='none';return;}c.style.display='flex';c.innerHTML='';
  const hd=document.createElement('div');hd.innerHTML='<b>'+ids.size+' armies</b> <button data-k="m">Merge</button><button data-k="s">Split</button>';hd.style.cssText='background:rgba(10,16,22,.9);padding:3px 6px;border-radius:5px';c.appendChild(hd);
  hd.querySelector('[data-k=m]').onclick=()=>{const L=gmIds();const seen=new Set();for(const id of L){const a=gmMine(id);if(!a||seen.has(a.at))continue;seen.add(a.at);grMerge(id);}gmSet(L.filter(gmMine));grSave();grandMapRefresh();};
  hd.querySelector('[data-k=s]').onclick=()=>{const L=gmIds();for(const id of L)grSplit(id);gmSet(L.filter(gmMine));grSave();grandMapRefresh();};
  for(const id of ids){const a=gmMine(id);if(!a)continue;const d=document.createElement('div');d.className='c';const p=GCM.P[a.at],dest=a.path&&a.path.length?GCM.P[a.path[a.path.length-1]]:null;d.innerHTML='<b>'+a.nm+'</b> · '+a.u.length+' units'+(typeof gmMorBar==='function'?gmMorBar(a):'')+'<br><span style="opacity:.75">'+(p?p.n:'')+(dest?' → '+dest.n:'')+'</span>';d.title='Click: select only this army · Shift+click: add/remove · Double-click: go to it';d.onclick=ev=>{if(ev.shiftKey){const L=gmIds().slice(),i=L.indexOf(id);if(i>=0)L.splice(i,1);else L.push(id);gmSet(L);}else gmSet([id]);};d.ondblclick=()=>{try{const e=G3.arm&&G3.arm.get(id);if(e&&G3.camera){G3.camera.x=e.x;G3.camera.z=e.z;}}catch(_){}};c.appendChild(d);}}catch(e){console.error('gmPaint',e);}}
/* A3 path preview (laneF): dashed route line from the selected army to the hovered province; one SVG, rebuilt only when the hovered province changes. */
function gmPreview(path){try{const w=document.getElementById('gMapWrap');if(!w)return;let sv=document.getElementById('gmPrev');if(!path||path.length<2){if(sv)sv.style.display='none';return;}
  if(!sv){sv=document.createElementNS('http://www.w3.org/2000/svg','svg');sv.id='gmPrev';sv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';sv.innerHTML='<polyline fill="none" stroke="#ffe27a" stroke-width="3" stroke-dasharray="9 6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><circle r="6" fill="#ffe27a" stroke="#000" stroke-width="1.5"/>';w.appendChild(sv);}
  const pts=[];for(const pi of path){const q=GCM.P[pi];if(!q)continue;if(GV.g3&&typeof G3!=='undefined'&&G3.cam){const v=new THREE.Vector3(q.x,2,q.y).project(G3.cam);pts.push([(v.x+1)/2*GV.w,(1-v.y)/2*GV.h]);}else pts.push([q.x*GV.z+GV.ox,q.y*GV.z+GV.oy]);}
  if(pts.length<2){sv.style.display='none';return;}sv.style.display='';sv.firstChild.setAttribute('points',pts.map(q=>q[0].toFixed(0)+','+q[1].toFixed(0)).join(' '));const e=pts[pts.length-1],c=sv.lastChild;c.setAttribute('cx',e[0].toFixed(0));c.setAttribute('cy',e[1].toFixed(0));}catch(e){}}
function gmInit(cv){const wrap=document.getElementById('gMapWrap');let box=null,bd=null,lastH=-2;
  const rel=ev=>{const r=cv.getBoundingClientRect();return [ev.clientX-r.left,ev.clientY-r.top];};
  cv.addEventListener('pointerdown',ev=>{if(ev.button!==0||!GC||GC.over)return;const [x,y]=rel(ev);if(!ev.shiftKey){bd={x,y,m:0,plain:1};return;}ev.stopImmediatePropagation();cv.setPointerCapture(ev.pointerId);bd={x,y,m:0};},true);   /* Abdullah 19:52 "I can't drag and select armies": plain left-drag = box select (like battles), Shift adds; a click without moving still selects as before; camera = WASD / edges / middle mouse */
  cv.addEventListener('pointermove',ev=>{if(bd){const [x,y]=rel(ev);if(Math.abs(x-bd.x)+Math.abs(y-bd.y)>6&&!bd.m){bd.m=1;if(bd.plain){GV.drag=null;try{cv.setPointerCapture(ev.pointerId);}catch(e){}}}if(bd.plain&&!bd.m)return;ev.stopImmediatePropagation();if(bd.m){if(!box){box=document.createElement('div');box.style.cssText='position:absolute;border:1px dashed #ffe27a;background:rgba(255,226,122,.12);pointer-events:none;z-index:5';wrap.appendChild(box);}box.style.left=Math.min(x,bd.x)+'px';box.style.top=Math.min(y,bd.y)+'px';box.style.width=Math.abs(x-bd.x)+'px';box.style.height=Math.abs(y-bd.y)+'px';}return;}
    if(!GV.selA||GC.ph!=='plan')return;const [x,y]=rel(ev),[wx,wy]=guToWorld(x,y),h=guProvAt(wx,wy);if(h===lastH||h<0||!GCM.P[h])return;lastH=h;   /* arrival date while hovering, like EU4 */
    const a=gmMine(GV.selA);if(a&&h!==a.at){const r=grPath(a.o,a.at,h,a.fl);if(r&&r.turns!=null){GV.hint='Right-click → '+GCM.P[h].n+': arrives ~'+grDateStr(GC.turn+r.turns,0)+' ('+r.turns+' mo)'+(gmIds().length>1?' · '+gmIds().length+' armies':'');guHint();gmPreview([a.at].concat(r.path||[]));}}},true);
  cv.addEventListener('wheel',()=>gmPreview(null),true);cv.addEventListener('pointerdown',()=>{gmPreview(null);lastH=-2;},true);
  cv.addEventListener('pointerup',ev=>{if(bd){if(bd.plain&&!bd.m){bd=null;return;}ev.stopImmediatePropagation();const [x,y]=rel(ev),b=bd;bd=null;if(box){box.remove();box=null;}
      const L=b.plain?[]:gmIds().slice();if(b.m){const x0=Math.min(x,b.x),x1=Math.max(x,b.x),y0=Math.min(y,b.y),y1=Math.max(y,b.y);for(const p of gmPts())if(p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1&&gmMine(p.aid))L.push(p.aid);}
      else{const h=GV.g3&&typeof g3HitAt==='function'?g3HitAt(x,y):null;const id=h&&h.aid;if(id&&gmMine(id)){const i=L.indexOf(id);if(i>=0)L.splice(i,1);else L.push(id);}}
      gmSet(L);return;}
    if(!ev.shiftKey&&GV.drag&&!GV.drag.m&&GV.selM.size){GV.selM=new Set();setTimeout(gmPaint,0);}},true);
  cv.addEventListener('pointerdown',ev=>{if(ev.button!==0||!(ev.ctrlKey||ev.metaKey)||!GC||GC.ph!=='plan')return;const [x,y]=rel(ev),h=GV.g3&&typeof g3HitAt==='function'?g3HitAt(x,y):null;if(!h||!gmMine(h.aid))return;ev.stopImmediatePropagation();gmSet(gmPts().filter(p=>gmMine(p.aid)&&p.x>=0&&p.y>=0&&p.x<=GV.w&&p.y<=GV.h).map(p=>p.aid));},true);   /* Ctrl+click an army = all your armies in view */
  cv.addEventListener('dblclick',ev=>{if(!GC)return;const [x,y]=rel(ev),h0=GV.g3&&typeof g3HitAt==='function'?g3HitAt(x,y):null;let pi;if(h0){const a=GC.armies.find(q=>q.id===h0.aid);pi=a&&a.at;}else{const [wx,wy]=guToWorld(x,y);pi=guProvAt(wx,wy);}
    if(pi==null||pi<0)return;gmSet(GC.armies.filter(a=>a.at===pi&&a.o===GC.me).map(a=>a.id));});
  gmPaint();}

/* ⚡21 Outliner (laneF): O toggles a list of all your armies/fleets — status, morale, destination + arrival; click = jump to it, idle ones flagged. Rebuilt only when its contents change. */
function gmOutliner(w){let o=document.getElementById('gmOutl');if(!o){o=document.createElement('div');o.id='gmOutl';o.style.cssText='position:absolute;right:8px;top:44px;width:250px;max-height:60%;overflow:auto;z-index:4;font-size:12.5px;background:rgba(10,16,22,.92);border:1px solid #4a6580;border-radius:6px;padding:4px 6px';w.appendChild(o);}
  if(!GV.outl||!GC||!GC.me){o.style.display='none';return;}o.style.display='block';
  const mine=GC.armies.filter(a=>a.o===GC.me).sort((x,y)=>(x.fl?1:0)-(y.fl?1:0)||x.nm.localeCompare(y.nm)),sel=new Set(gmIds());
  const sig=GC.turn+'|'+GC.day+'|'+mine.map(a=>a.id+':'+a.at+':'+(a.path?a.path.length:0)+':'+a.u.length+':'+Math.round(a.mor==null?100:a.mor)+(sel.has(a.id)?'s':'')).join(',');
  if(o._sig===sig)return;o._sig=sig;
  let h='<div style="display:flex;justify-content:space-between;opacity:.8;margin-bottom:3px"><b>Outliner · '+mine.length+'</b><span>O closes</span></div>';
  if(!mine.length)h+='<div style="opacity:.6">No armies.</div>';
  for(const a of mine){const p=GCM.P[a.at],mv=a.path&&a.path.length,dest=mv?GCM.P[a.path[a.path.length-1]]:null,idle=!mv&&!a.fl&&GC.ph==='plan'&&p&&p.o===GC.me;
    h+='<div class="oi" data-a="'+a.id+'" style="padding:2px 4px;border-left:3px solid '+(sel.has(a.id)?'#ffe27a':mv?'#6fa8dc':'#556')+';margin-bottom:2px;cursor:pointer"><b>'+(a.fl?'⚓ ':'')+a.nm+'</b> · '+a.u.length+(typeof gmMorBar==='function'?' '+gmMorBar(a):'')+'<br><span style="opacity:.75">'+(p?p.n:'?')+(dest?' → '+dest.n:(idle?' · idle':''))+'</span></div>';}
  o.innerHTML=h;o.querySelectorAll('.oi').forEach(e=>{e.onclick=ev=>{const id=+e.dataset.a,a=gmMine(id);if(!a)return;if(ev.shiftKey)gmSet([...gmIds(),id]);else gmSet([id]);GV.sel=a.at;try{guCentre(a.at);}catch(x){}grandMapRefresh();};});}

/* ⚡23 Macro-builder (laneF): ↻ beside a recruit button = standing order, repeated each month in that province. World chain: costs cash+manpower every month (stops with a news line when you can't pay or lose the province); units still take their months to arrive and can be intercepted; AI nations do this for themselves in grAIPlan. */
function gmMacroToggle(pi,k){if(!GC)return;GC.mac=GC.mac||[];const i=GC.mac.findIndex(m=>m.p===pi&&m.k===k);if(i>=0)GC.mac.splice(i,1);else GC.mac.push({p:pi,k:k});grSave();}
function gmMacros(){if(!GC||!GC.mac||!GC.mac.length||!GC.me)return;const keep=[];for(const m of GC.mac){const e=grRecruit(GC.me,m.p,m.k);if(e){grLog('Standing order stopped in '+(GCM.P[m.p]?GCM.P[m.p].n:'?')+': '+e,GC.me);}else keep.push(m);}GC.mac=keep;}
