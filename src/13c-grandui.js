// ===== 13c-grandui: the grand map screen (PC: mouse + keyboard) =====
// Left-click selects (province or army chip), right-click orders the selected army (move / attack), wheel zooms, drag pans.
// Menu: "Grand campaign" (Continue / New) lives next to Conquest, Missions, Tutorial on the main menu.
const GV={cv:null,ctx:null,w:0,h:0,z:1,ox:0,oy:0,sel:-1,selA:0,hov:-1,img:null,idx:null,dirty:true,chips:[],drag:null,busy:0,raf:0,hint:''};
const GU_RW=1200,GU_RH=600;   // cell raster resolution (half the world size)
const GU_TERR={d:[222,196,140],m:[138,126,112],f:[150,182,100],u:[168,160,150],j:[72,142,82],s:[226,232,238],c:[176,192,150],r:[140,176,122]};
function guEl(tag,css,html){return campEl(tag,css,html);}
function guCols(){grMap();const N=GM_P.length,P=GCM.P;if(!GV.idx){const idx=new Uint16Array(GU_RW*GU_RH),sx=new Float32Array(N),sy=new Float32Array(N);P.forEach(p=>{sx[p.i]=p.x/2;sy[p.i]=p.y/2;});
    for(let y=0;y<GU_RH;y++)for(let x=0;x<GU_RW;x++){let bi=0,bd=1e12;for(let i=0;i<N;i++){const dx=sx[i]-x,dy=sy[i]-y,d=dx*dx+dy*dy;if(d<bd){bd=d;bi=i;}}idx[y*GU_RW+x]=bi;}GV.idx=idx;}
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
function grNatRgb(c){const N=grNat(c);return N.rgb||(N.rgb=guRgb(N.color));}
function guProvAt(wx,wy){const x=Math.floor(wx/2),y=Math.floor(wy/2);if(x<0||y<0||x>=GU_RW||y>=GU_RH)return -1;return GV.idx[y*GU_RW+x];}
function guToWorld(sx,sy){if(GV.g3){const g=g3Ground(sx,sy);return g||[-1e4,-1e4];}return [(sx-GV.ox)/GV.z,(sy-GV.oy)/GV.z];}
function guFit(r){if(GV.g3){g3Fit(r);return;}const R=r||[0,0,GM_W,GM_H];const z=Math.min(GV.w/R[2],GV.h/R[3]);GV.z=z;GV.ox=(GV.w-R[2]*z)/2-R[0]*z;GV.oy=(GV.h-R[3]*z)/2-R[1]*z;guClamp();}
function guClamp(){if(GV.g3)return;const zmin=Math.max(GV.w/GM_W,GV.h/GM_H)*.98;GV.z=Math.max(zmin,Math.min(6,GV.z));const mw=GM_W*GV.z,mh=GM_H*GV.z;GV.ox=mw<=GV.w?(GV.w-mw)/2:Math.min(0,Math.max(GV.w-mw,GV.ox));GV.oy=mh<=GV.h?(GV.h-mh)/2:Math.min(0,Math.max(GV.h-mh,GV.oy));}
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
  const by={};for(const a of GC.armies)(by[a.at]=by[a.at]||[]).push(a);
  for(const k of Object.keys(by)){const p=P[k],L=by[k].sort((a,b)=>(b.o===GC.me)-(a.o===GC.me)||a.id-b.id),X=sx(p.x),Y=sy(p.y);const show=z>=.9||L.some(a=>a.o===GC.me)||L.length;let n=0;
    const lim=z<1.2?2:5;const shown=L.slice(0,lim);const cw=26,w0=shown.length*(cw+3)-3;shown.forEach((a,i)=>{const x=X-w0/2+i*(cw+3),y=Y+(z>=1.2?20:8);const mine=a.o===GC.me;
      c.fillStyle=grNat(a.o).color;c.strokeStyle=a.id===GV.selA?'#ffe27a':mine?'#fff':'rgba(0,0,0,.7)';c.lineWidth=a.id===GV.selA?3:mine?1.8:1.2;c.fillRect(x,y,cw,15);c.strokeRect(x,y,cw,15);
      c.fillStyle='#fff';c.font='bold 11px sans-serif';c.shadowColor='rgba(0,0,0,.9)';c.shadowBlur=3;c.fillText(String(a.u.length),x+cw/2,y+8);c.shadowBlur=0;GV.chips.push({x,y,w:cw,h:15,aid:a.id});});
    if(L.length>lim){c.fillStyle='#fff';c.font='bold 11px sans-serif';c.fillText('+'+(L.length-lim),X+w0/2+12,Y+(z>=1.2?27:15));}}
  // province under the cursor tooltip is DOM; nothing more to draw
}
function guStar(c,x,y,R,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r:R;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q);}c.closePath();c.fill();c.stroke();}
function guOutline(pi,color,w){const idx=GV.idx,c=GV.ctx,z=GV.z,k=z*2;c.fillStyle=color;const s=Math.max(w,k*1.15);
  // edge cells of province pi from the cached raster (cheap enough for one province)
  const p=GCM.P[pi],x0=Math.max(1,Math.floor(p.x/2-110)),x1=Math.min(GU_RW-2,Math.floor(p.x/2+110)),y0=Math.max(1,Math.floor(p.y/2-90)),y1=Math.min(GU_RH-2,Math.floor(p.y/2+90));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*GU_RW+x;if(idx[i]!==pi)continue;if(idx[i-1]!==pi||idx[i+1]!==pi||idx[i-GU_RW]!==pi||idx[i+GU_RW]!==pi)c.fillRect(x*k+GV.ox-s/2+k/2,y*k+GV.oy-s/2+k/2,s,s);}}
function guRedraw(){if(GV.g3){g3Refresh();return;}if(!GV.raf)GV.raf=requestAnimationFrame(guDraw);}

// ---------- screen ----------
function grandScreenShow(v){G3.last=0;const e=document.getElementById('grandScreen');if(e)e.style.display=v?'flex':'none';if(v)guResize();}
function guResize(){const cv=GV.cv,w=document.getElementById('gMapWrap');if(!cv||!w)return;const r=w.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);GV.w=r.width;GV.h=r.height;if(GV.g3){g3Resize();return;}cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);cv.style.width=r.width+'px';cv.style.height=r.height+'px';GV.ctx=cv.getContext('2d');GV.ctx.setTransform(dpr,0,0,dpr,0,0);guClamp();guRedraw();}
function grandOpen(){grMap();if(!GC)return;campClose();let e=document.getElementById('grandScreen');if(e)e.remove();
  e=guEl('div','position:fixed;inset:0;z-index:8000;background:#0b141d;color:#e8e4d8;display:flex;flex-direction:column;font-size:15px;user-select:none;');e.id='grandScreen';
  e.innerHTML=`<div id="gTop" style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:#101c28;border-bottom:1px solid #2c4358;flex-wrap:wrap"></div>
  <div style="flex:1;display:flex;min-height:0"><div id="gMapWrap" style="flex:1;position:relative;min-width:0"><canvas id="gMap" style="display:block"></canvas><div id="gTip" style="position:absolute;pointer-events:none;display:none;background:rgba(10,16,22,.94);border:1px solid #4a6580;border-radius:6px;padding:6px 9px;font-size:14px;line-height:1.4;max-width:260px;z-index:3"></div><div id="gHint" style="position:absolute;left:10px;bottom:8px;font-size:13px;opacity:.75;pointer-events:none;text-shadow:0 1px 2px #000"></div></div>
  <div id="gSide" style="width:330px;max-width:38vw;background:#101c28;border-left:1px solid #2c4358;display:flex;flex-direction:column;min-height:0"><div id="gSel" style="padding:8px 10px;overflow:auto;flex:1.1;min-height:0"></div><div id="gLog" style="padding:6px 10px;overflow:auto;flex:.9;border-top:1px solid #2c4358;font-size:13px;line-height:1.45;min-height:0"></div></div></div>`;
  document.body.appendChild(e);GV.cv=document.getElementById('gMap');GV.idx=GV.idx||null;GV.dirty=true;guCols();
  const cv=GV.cv;GV.g3=false;try{GV.g3=g3Init(cv);}catch(e){console.error('3D grand map failed, using the flat map',e);g3Dispose();GV.g3=false;}
  cv.addEventListener('contextmenu',ev=>{ev.preventDefault();guRight(ev);});
  cv.addEventListener('wheel',ev=>{ev.preventDefault();if(GV.g3){g3Wheel(ev);return;}const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top,[wx,wy]=guToWorld(mx,my),f=Math.exp(-ev.deltaY*.0015);GV.z*=f;guClamp();GV.ox=mx-wx*GV.z;GV.oy=my-wy*GV.z;guClamp();guRedraw();},{passive:false});
  cv.addEventListener('pointerdown',ev=>{if(GV.g3&&ev.button===1){ev.preventDefault();cv.setPointerCapture(ev.pointerId);GV.drag={x:ev.clientX,y:ev.clientY,btn:1,yaw:G3.camera.yaw,pitch:G3.camera.pitch,m:1};return;}if(ev.button!==0)return;cv.setPointerCapture(ev.pointerId);const r0=cv.getBoundingClientRect();GV.drag={x:ev.clientX,y:ev.clientY,ox:GV.ox,oy:GV.oy,m:0,g:GV.g3?g3Ground(ev.clientX-r0.left,ev.clientY-r0.top):null};});
  cv.addEventListener('pointermove',ev=>{const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
    if(GV.drag){const dx=ev.clientX-GV.drag.x,dy=ev.clientY-GV.drag.y;if(Math.abs(dx)+Math.abs(dy)>4)GV.drag.m=1;if(GV.drag.m&&GV.g3){g3Drag(ev,mx,my);return;}if(GV.drag.m){GV.ox=GV.drag.ox+dx;GV.oy=GV.drag.oy+dy;guClamp();guRedraw();return;}}
    const [wx,wy]=guToWorld(mx,my),h=guProvAt(wx,wy);if(h!==GV.hov){GV.hov=h;guRedraw();}if(GV.g3&&GV.drag&&GV.drag.m)return;guTip(h,mx,my);});
  cv.addEventListener('pointerup',ev=>{const d=GV.drag;GV.drag=null;if(!d||d.m)return;const r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;guClick(mx,my);});
  cv.addEventListener('pointerleave',()=>{GV.hov=-1;document.getElementById('gTip').style.display='none';guRedraw();});
  addEventListener('resize',()=>{if(document.getElementById('grandScreen'))guResize();});
  guResize();guFit(null);const me=GC.me&&GC.nat[GC.me];if(me){GV.sel=me.cap;guCentre(me.cap,2.0);}guRedraw();grandMapRefresh();
  if(!window._gKeys){window._gKeys=1;addEventListener('keydown',ev=>{if(!document.getElementById('grandScreen')||document.getElementById('grandScreen').style.display==='none'||G)return;if(ev.key==='Enter'&&!GV.busy&&!document.getElementById('gModal')){ev.preventDefault();guEndTurn();}
    if(GV.g3)return;const k=ev.key.toLowerCase(),st=60;if(k==='w'||k==='arrowup')GV.oy+=st;else if(k==='s'||k==='arrowdown')GV.oy-=st;else if(k==='a'||k==='arrowleft')GV.ox+=st;else if(k==='d'||k==='arrowright')GV.ox-=st;else return;guClamp();guRedraw();});}}
function guTip(h,mx,my){const t=document.getElementById('gTip');if(!t)return;if(h<0||!GCM.P[h]){t.style.display='none';return;}const p=GCM.P[h];let html;
  if(p.sea){html='<b>'+p.n+'</b><br>'+(p.ck?'<span style="color:#ff9d8e">Chokepoint strait</span><br>':'')+'Sea zone · crossing takes '+p.cost+' turn'+(p.cost>1?'s':'');}
  else{const st=GC.prov[h],N=GCM.nats.get(st.o);html='<b>'+p.n+'</b> <span style="opacity:.7">'+N.name+'</span><br>'+guTerrName(p.t)+' · towns '+p.tw+(p.oil?' · oil':'')+(p.farm?' · farms':'')+(p.mine?' · mines':'')+(p.port?' · port':'')+'<br>Garrison '+st.gar.length+(st.o===GC.me?' · unrest '+Math.round(st.un)+'%':'')+(p.cap?'<br><span style="color:#ffd24a">Capital</span>':GC.nat[st.o]&&GC.nat[st.o].wg.includes(h)?'<br><span style="color:#ffd24a">War goal</span>':'');}
  t.innerHTML=html;t.style.display='block';t.style.left=Math.min(GV.w-270,mx+14)+'px';t.style.top=Math.min(GV.h-110,my+14)+'px';}
function guTerrName(t){return {d:'Desert',m:'Mountains',f:'Farmland',u:'Urban',j:'Jungle/green',s:'Snow/tundra',c:'Coast',r:'River plain',w:'Sea'}[t]||t;}
function guClick(mx,my){if(GV.g3){g3Click(mx,my);return;}for(const c of GV.chips.slice().reverse())if(mx>=c.x&&mx<=c.x+c.w&&my>=c.y&&my<=c.y+c.h){const a=GC.armies.find(x=>x.id===c.aid);GV.selA=c.aid;if(a)GV.sel=a.at;guSide();guRedraw();return;}
  const [wx,wy]=guToWorld(mx,my),h=guProvAt(wx,wy);GV.sel=h;if(GV.selA){const a=GC.armies.find(x=>x.id===GV.selA);if(!a||a.at!==h)GV.selA=0;}guSide();guRedraw();}
function guRight(ev){if(GC.ph!=='plan'||GV.busy||!GV.selA)return;const r=GV.cv.getBoundingClientRect(),[wx,wy]=guToWorld(ev.clientX-r.left,ev.clientY-r.top),h=guProvAt(wx,wy);if(h<0)return;guMoveTo(GV.selA,h);}
function guMoveTo(aid,h){const res=grOrderMove(aid,h);if(res.err){GV.hint=res.err;guHint();return;}
  if(res.decl){const w=GCM.nats.get(res.decl).name;guConfirm('Declare war on '+w+'?','Marching into '+GCM.P[h].n+' means war with '+w+'. Their allies and rivals may react.',()=>{const a=GC.armies.find(x=>x.id===aid);grDeclare(GC.me,res.decl);grOrderMove(aid,h);guSide();guRedraw();grSave();});return;}
  GV.hint=GCM.P[h].n+': '+res.r.turns+' turn'+(res.r.turns>1?'s':'')+' away'+(res.r.path.some(j=>GCM.P[j].sea)?' (by sea)':'');guHint();guSide();guRedraw();grSave();}
function guHint(){const e=document.getElementById('gHint');if(e)e.textContent=GV.hint||'';}

// ---------- top bar, side panel, log ----------
function grandMapRefresh(){if(GV.g3)g3Refreshed();GV.dirty=true;guTop();guSide();guLog();guRedraw();if(GC&&GC.over)guOver();}
function guTop(){const t=document.getElementById('gTop');if(!t||!GC)return;const me=GC.me?GC.nat[GC.me]:null,N=GC.me?grNat(GC.me):null;
  const score=GC.me?grScore(GC.me):0;
  t.innerHTML='';if(N){t.appendChild(guEl('span','display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid #fff;background:'+N.color));t.appendChild(guEl('b','font-size:17px',GCM.nats.get(GC.me).name));}
  t.appendChild(guEl('span','opacity:.9','Turn <b>'+Math.min(GC.turn,GC.maxTurn)+'</b>/'+GC.maxTurn+(GC.len==='quick'?' (Quick)':'')));
  if(me)t.appendChild(guEl('span','','$<b>'+Math.round(me.cash).toLocaleString()+'</b> <span style="opacity:.7">('+((me.inc||0)>=0?'+':'')+Math.round(me.inc||0)+'/turn)</span>'));
  if(me)t.appendChild(guEl('span','opacity:.9','Score <b>'+score+'</b> · provinces <b>'+GCM.P.filter(p=>p.land&&GC.prov[p.i].o===GC.me).length+'</b>'));
  guEcoTop(t,me);
  const rg=guEl('span','display:flex;gap:4px;flex-wrap:wrap;margin-left:auto');for(const [nm,r] of GR_REGIONS){const b=guEl('button','padding:4px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#dfe8f0;cursor:pointer;font-size:13px',nm);b.type='button';b.onclick=()=>{guFit(r);guRedraw();};rg.appendChild(b);}t.appendChild(rg);
  const end=guEl('button','padding:7px 18px;border-radius:6px;border:1px solid #7aa84f;background:#4f6b32;color:#fff;cursor:pointer;font-size:16px;font-weight:bold',GC.ph==='plan'?'End turn ▶':'Resolving…');end.id='gEnd';end.type='button';end.disabled=GC.ph!=='plan'||!!GC.over;end.title='Enter';end.onclick=guEndTurn;t.appendChild(end);
  const mb=guEl('button','padding:7px 12px;border-radius:6px;border:1px solid #6b7a8a;background:transparent;color:#dfe8f0;cursor:pointer;font-size:14px','Save & exit');mb.type='button';mb.onclick=()=>{grSave();grandClose();};t.appendChild(mb);}
function guEndTurn(){if(!GC||GC.ph!=='plan'||GC.over||GV.busy||G)return;GV.busy=1;GV.hint='';guHint();grEndTurn(false);GV.busy=0;if(GV.g3)g3AfterTurn();grandMapRefresh();}
function guProvArmies(pi){return GC.armies.filter(a=>a.at===pi);}
function guSide(){const s=document.getElementById('gSel');if(!s||!GC)return;s.innerHTML='';const pi=GV.sel;if(pi<0||!GCM.P[pi]){s.innerHTML='<div style="opacity:.7;line-height:1.6">Click a province to see it.<br>Select an army (click its flag), then <b>right-click</b> a province to march there. Armies cross seas between ports; oceans take several turns.<br>Press <b>Enter</b> or the green button to end the turn: everyone moves at once.</div>';return;}
  const p=GCM.P[pi];if(p.sea){s.innerHTML='<h2 style="margin:0 0 4px;font-size:19px">'+p.n+'</h2><div style="opacity:.8">Sea zone · '+p.cost+' turn'+(p.cost>1?'s':'')+' to cross'+(p.ck?'<br><span style="color:#ff9d8e">Chokepoint: the nation holding most of its shores can close it - trade and the oil price shift for everyone.</span>':'')+'</div>'+guArmyRows(pi);guBindArmies(s,pi);guEcoStrait(s,pi);return;}
  const st=GC.prov[pi],N=GCM.nats.get(st.o),mine=st.o===GC.me;
  let h='<div style="display:flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border-radius:3px;border:1px solid #fff;background:'+grNat(st.o).color+'"></span><h2 style="margin:0;font-size:19px">'+p.n+'</h2></div>';
  h+='<div style="opacity:.85;margin:2px 0 6px">'+N.name+' · '+guTerrName(p.t)+(p.cap?' · <span style="color:#ffd24a">capital</span>':GC.nat[st.o]&&GC.nat[st.o].wg.includes(pi)?' · <span style="color:#ffd24a">war goal</span>':'')+'</div>';
  h+='<div>Towns '+p.tw+(p.oil?' · oil':'')+(p.farm?' · farms':'')+(p.mine?' · mines':'')+(p.port?' · port':'')+'</div>';
  h+='<div>Garrison <b>'+st.gar.length+'</b> units (value '+Math.round(grProvDef(pi)/100)/10+'k)'+(mine?' · Unrest <b style="color:'+(st.un>55?'#ff9d8e':'#e8e4d8')+'">'+Math.round(st.un)+'%</b>':'')+'</div>';
  s.innerHTML=h;
  if(mine){const row=guEl('div','margin:8px 0 4px');row.appendChild(guEl('div','opacity:.75;font-size:13px','Tax (more money, more unrest)'));const seg=guEl('div','display:flex;gap:4px;margin-top:2px');
    GR_TAX.forEach((n,i)=>{const b=guEl('button','flex:1;padding:5px;border-radius:5px;border:1px solid '+(st.tax===i?'#ffe27a':'#3d5a73')+';background:'+(st.tax===i?'#41572a':'#18293a')+';color:#fff;cursor:pointer',n);b.type='button';b.onclick=()=>{st.tax=i;grSave();guSide();guTopCash();};seg.appendChild(b);});row.appendChild(seg);s.appendChild(row);
    const rc=guEl('div','margin:8px 0');rc.appendChild(guEl('div','opacity:.75;font-size:13px','Recruit here (arrives in 1–2 turns)'));const fac=grNat(GC.me).fac,g=guEl('div','display:flex;flex-wrap:wrap;gap:4px;margin-top:2px');
    for(const [k,n,t] of GR_RECRUIT){if(!grHasKind(fac,k))continue;const cost=grCost(fac,k)*n;const b=guEl('button','padding:5px 7px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:'+(GC.nat[GC.me].cash>=cost?'#fff':'#8a8f96')+';cursor:pointer;font-size:13px',n+'× '+grKindName(fac,k)+' $'+cost);b.type='button';b.title=cost+' · '+t+' turn(s)';b.onclick=()=>{const e=grRecruit(GC.me,pi,k);if(e){GV.hint=e;guHint();}else grSave();guSide();guTop();};g.appendChild(b);}
    rc.appendChild(g);if(st.rq.length)rc.appendChild(guEl('div','font-size:13px;opacity:.8;margin-top:3px','In training: '+st.rq.map(q=>q[2]+'× '+grKindName(fac,q[1])+' (turn '+q[0]+')').join(', ')));s.appendChild(rc);}
  guEcoSide(s,pi,st,p,mine);
  const ar=guEl('div');ar.innerHTML=guArmyRows(pi);s.appendChild(ar);guBindArmies(s,pi);}
function guTopCash(){guTop();}
function guArmyRows(pi){const L=guProvArmies(pi);if(!L.length)return '<div style="opacity:.6;margin-top:8px">No armies here.</div>';let h='<div style="margin-top:8px;font-weight:bold">Armies</div>';
  for(const a of L){const mine=a.o===GC.me,f=grNat(a.o).fac,counts={};for(const r of a.u)counts[r[0]]=(counts[r[0]]||0)+1;const txt=Object.keys(counts).map(k=>counts[k]+' '+grKindName(f,k)).join(', ');
    h+='<div class="gArmy" data-a="'+a.id+'" style="border:1px solid '+(a.id===GV.selA?'#ffe27a':'#2c4358')+';border-radius:6px;padding:5px 7px;margin:4px 0;background:'+(a.id===GV.selA?'#1d3045':'#14222f')+';cursor:pointer"><span style="display:inline-block;width:10px;height:10px;background:'+grNat(a.o).color+';border:1px solid #fff;margin-right:5px"></span><b>'+a.nm+'</b> <span style="opacity:.75">('+GCM.nats.get(a.o).name+')</span><br><span style="font-size:13px;opacity:.9">'+a.u.length+' units · value '+Math.round(grArmyVal(a)/100)/10+'k'+(a.sup?' · <span style="color:#ff9d8e">out of supply</span>':'')+'</span><br><span style="font-size:12px;opacity:.7">'+txt+'</span>'+(a.path.length?'<br><span style="font-size:12px;color:#ffe27a">→ '+GCM.P[a.path[a.path.length-1]].n+'</span>':'')+'</div>';
    if(mine&&a.id===GV.selA)h+='<div class="gActs" data-a="'+a.id+'" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px"><button data-act="split">Split in half</button><button data-act="merge">Merge here</button><button data-act="stop">Cancel orders</button></div>';}
  return h;}
function guBindArmies(s,pi){s.querySelectorAll('.gArmy').forEach(e=>{e.onclick=()=>{GV.selA=+e.dataset.a;guSide();guRedraw();};});
  s.querySelectorAll('.gActs button').forEach(b=>{b.style.cssText='padding:4px 8px;border-radius:5px;border:1px solid #3d5a73;background:#18293a;color:#fff;cursor:pointer;font-size:13px';b.onclick=()=>{const id=+b.parentNode.dataset.a;if(GC.ph!=='plan')return;if(b.dataset.act==='split'){const n=grSplit(id);if(n)GV.selA=n.id;}else if(b.dataset.act==='merge')grMerge(id);else{const a=GC.armies.find(x=>x.id===id);if(a){a.path=[];a.pg=0;}}grSave();guSide();guRedraw();};});}
function guLog(){const l=document.getElementById('gLog');if(!l||!GC)return;const rows=GC.log.slice(-60).reverse().filter((r,i)=>i<45);l.innerHTML='<div style="font-weight:bold;margin-bottom:3px">Turn log</div>'+rows.map(r=>'<div style="'+(r[2]&&r[2]===GC.me?'color:#ffe9a6':'opacity:.82')+'"><span style="opacity:.55">T'+r[0]+'</span> '+r[1]+'</div>').join('');}
function guConfirm(title,body,yes,no){guModal('<h2 style="margin:0 0 8px;font-size:21px">'+title+'</h2><div style="line-height:1.5;margin-bottom:12px">'+body+'</div>',[['Yes',yes,1],['No',no||null,0]]);}
function guModal(html,btns){const old=document.getElementById('gModal');if(old)old.remove();const m=guEl('div','position:fixed;inset:0;z-index:8500;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;');m.id='gModal';const c=guEl('div','background:#142231;border:1px solid #4a6580;border-radius:10px;padding:16px 20px;max-width:min(560px,92vw);color:#e8e4d8;font-size:16px;');c.innerHTML=html;
  const row=guEl('div','display:flex;gap:8px;flex-wrap:wrap');for(const [t,fn,pri] of btns){const b=guEl('button','padding:9px 16px;border-radius:7px;border:1px solid '+(pri?'#7aa84f':'#6b7a8a')+';background:'+(pri?'#4f6b32':'transparent')+';color:#fff;cursor:pointer;font-size:16px',t);b.type='button';b.onclick=()=>{m.remove();if(fn)fn();};row.appendChild(b);}c.appendChild(row);m.appendChild(c);document.body.appendChild(m);return m;}

// ---------- battle prompt: Fight it / Auto-resolve / Withdraw ----------
function grBattlePrompt(b){grandScreenShow(true);guCentre(b.p,2.2);GV.sel=b.p;GV.selA=0;grandMapRefresh();
  const P=GCM.P[b.p],me=GC.me,S=grSideUnits(b,'att'),D=grSideUnits(b,'def'),sv=grSideVal(S),dv=grSideVal(D)*grDefMods(b);
  const cnt=L=>{const o={};for(const s of L)for(const r of s.u){const k=s.fac+'|'+r[0];o[k]=(o[k]||0)+1;}return Object.keys(o).map(k=>o[k]+' '+grKindName(k.split('|')[0],k.split('|')[1])).join(', ')||'—';};
  const nUnits=L=>L.reduce((a,s)=>a+s.u.length,0),pct=Math.round(sv/Math.max(1,sv+dv)*100);const meAtt=b.an===me;
  const canWithdraw=meAtt||GC.armies.filter(a=>b.def.includes(a.id)&&a.o===me).every(a=>grRetreatTo(a,b.p)>=0)&&GC.armies.some(a=>b.def.includes(a.id)&&a.o===me);
  const html='<div style="opacity:.7;font-size:13px">BATTLE · '+(b.river?'river crossing · ':'')+(b.mtn?'mountain pass · ':'')+guTerrName(P.t)+'</div><h2 style="margin:2px 0 8px;font-size:24px">'+P.n+'</h2>'
   +'<div style="display:flex;gap:14px;margin-bottom:8px"><div style="flex:1"><b style="color:#ffb59a">Attackers</b> — '+GCM.nats.get(b.an).name+'<br>'+nUnits(S)+' units<br><span style="font-size:13px;opacity:.8">'+cnt(S)+'</span></div><div style="flex:1"><b style="color:#9fd0ff">Defenders</b> — '+GCM.nats.get(b.dn).name+'<br>'+nUnits(D)+' units'+(b.garr?' (incl. garrison)':'')+'<br><span style="font-size:13px;opacity:.8">'+cnt(D)+'</span></div></div>'
   +'<div style="height:10px;border-radius:5px;background:#3b6ea8;overflow:hidden;margin:4px 0 2px"><div style="width:'+pct+'%;height:100%;background:#d0583d"></div></div><div style="font-size:13px;opacity:.8;margin-bottom:10px">Attackers '+pct+'% · Defenders '+(100-pct)+'% (terrain, river and home-turf bonuses included). Fight it live: you command exactly these units; nothing can be built.</div>';
  guModal(html,[['Fight it live',()=>{grandScreenShow(false);grandBattleStart(b);},1],['Auto-resolve',()=>{grBattleDone(b,grBattleAuto2(b),'auto');grandMapRefresh();},0],...(canWithdraw?[['Withdraw',()=>{guWithdraw(b);},0]]:[])]);}
function grBattleAuto2(b){const R=grRng(GC.seed*7+GC.turn*131+b.p);return grAuto(b,R).win;}
function guWithdraw(b){const me=GC.me;if(b.an===me){grBattleDone(b,'def','retreat');}
  else{for(const a of GC.armies.filter(x=>b.def.includes(x.id)&&x.o===me)){const to=grRetreatTo(a,b.p);if(to>=0){a.at=to;a.path=[];grLog(a.nm+' withdrew from '+GCM.P[b.p].n+'.',me);}}b.def=b.def.filter(id=>GC.armies.some(a=>a.id===id&&a.at===b.p));
    if(b.garr)grBattleDone(b,grBattleAuto2(b),'auto');else grBattleDone(b,'att','retreat');}
  grandMapRefresh();}
// ---------- end of campaign ----------
function guOver(){if(document.getElementById('gOver'))return;const win=GC.over==='win';const m=guModal('<div style="opacity:.7;font-size:13px">GRAND CAMPAIGN · TURN '+Math.min(GC.turn,GC.maxTurn)+'</div><h1 style="margin:2px 0 8px;font-size:30px;color:'+(win?'#9fd36b':'#e07a6a')+'">'+(win?'Victory':'Defeat')+'</h1><div style="line-height:1.5;margin-bottom:12px">'+GC.res+'</div>',[['Main menu',()=>{grClear();grandClose();},1],['Keep looking at the map',()=>{GC.me=null;grSave();},0]]);m.id='gModal';const d=guEl('span');d.id='gOver';m.appendChild(d);}
function grandClose(){const ee=document.getElementById('gEco');if(ee)ee.remove();g3Dispose();GV.g3=false;const e=document.getElementById('grandScreen');if(e)e.remove();const m=document.getElementById('gModal');if(m)m.remove();GV.cv=null;GV.img=null;try{$('menu').hidden=false;}catch(e){}}

// ---------- menu: Grand campaign (Continue / New) ----------
function grandMenu(){grMap();const saved=(()=>{try{return JSON.parse(localStorage.getItem(GR_KEY));}catch(e){return null;}})(),root=campEl('div');
  root.appendChild(campEl('h1','margin:6px 0 4px;font-size:30px;letter-spacing:.04em;','GRAND CAMPAIGN'));
  root.appendChild(campEl('div','opacity:.75;margin-bottom:14px;line-height:1.5','Run a nation on the world map. Everyone plans at once, then all orders resolve together. When armies meet you can fight the battle yourself, with exactly the units you brought, or let the generals auto-resolve it.'));
  if(saved&&saved.v===1&&!saved.over&&saved.me){const n=(GM_NATS.find(r=>r[0]===saved.me)||[])[1]||saved.me;root.appendChild(campBtn('Continue — '+n+', turn '+saved.turn+'/'+saved.maxTurn,()=>{grLoad();campClose();grandOpen();}));}
  root.appendChild(campBtn('New campaign',()=>{grandSetup();},!!(saved&&!saved.over)));root.appendChild(campBtn('Back',campClose,true));campShow(root);}
function grandSetup(){const root=campEl('div'),majors=grMajors(),minors=[...new Set(GM_P.slice(0,GM_LAND).map(r=>r[1]))].filter(c=>!grNat(c).major).sort((a,b)=>GCM.nats.get(a).name<GCM.nats.get(b).name?-1:1);let nat='IR',len='quick';
  root.appendChild(campEl('h1','margin:6px 0 8px;font-size:28px','NEW GRAND CAMPAIGN'));root.appendChild(campEl('div','opacity:.8;margin-bottom:6px','Your nation'));
  const sel=campEl('select','font-size:18px;padding:8px;background:#1a2430;color:#fff;border:1px solid #6b7a55;border-radius:6px;min-width:300px');
  const og=(l,L)=>{const g=document.createElement('optgroup');g.label=l;for(const c of L){const o=document.createElement('option');o.value=c;o.textContent=GCM.nats.get(c).name;g.appendChild(o);}sel.appendChild(g);};
  og('Full nations',majors.sort((a,b)=>GCM.nats.get(a).name<GCM.nats.get(b).name?-1:1));og('Minor nations (shared regional army)',minors);sel.value=nat;root.appendChild(sel);
  const info=campEl('div','margin:10px 0;opacity:.85;line-height:1.5');const upd=()=>{nat=sel.value;const ps=GCM.P.filter(p=>p.land&&p.o===nat),N=grNat(nat);info.innerHTML=GCM.nats.get(nat).name+': <b>'+ps.length+'</b> provinces · capital '+(ps.find(p=>p.cap)||ps[0]).n+' · war goals '+ps.filter(p=>p.wg&&!p.cap).map(p=>p.n).join(', ')+'<br>'+(N.major?'Full nation: its own units and look.':'Minor nation: shared regional army, own flag and colours.')+' Every nation starts with the same strength.';};
  sel.onchange=upd;upd();root.appendChild(info);
  root.appendChild(campEl('div','opacity:.8;margin:8px 0 2px','Length'));const row=campEl('div');const bs=[['Quick — 25 turns, win by war goals or score','quick'],['Standard — 60 turns','std']].map(([t,v])=>{const b=campBtn(t,()=>{len=v;bs.forEach(x=>x[0].style.background=x[1]===v?'#4f6b32':'transparent');},v!=='quick');return [b,v];});bs.forEach(x=>row.appendChild(x[0]));root.appendChild(row);
  root.appendChild(campBtn('Begin',()=>{grNew({me:nat,len,seed:(Math.floor(Math.random()*1e9)||7)});grSave();campClose();grandOpen();}));root.appendChild(campBtn('Back',grandMenu,true));campShow(root);}
// main menu buttons: Grand campaign · Conquest · Missions · Tutorial (Abdullah 2026-11-06)
(function(){const sb=document.getElementById('sandbox');if(!sb||document.getElementById('grandBtn'))return;const b=document.createElement('button');b.className='big';b.id='grandBtn';b.type='button';b.textContent='Grand campaign';b.title='The world map: run a nation, fight the battles yourself or auto-resolve them';b.onclick=()=>{try{initAudio();}catch(e){}grandMenu();};
  const camp=document.getElementById('campaign')||sb;camp.parentNode.insertBefore(b,camp);const st=document.getElementById('start');if(st)st.textContent='Conquest — deploy vs AI';})();
