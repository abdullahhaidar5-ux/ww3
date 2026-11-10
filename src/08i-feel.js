/* ---------- controls feel (orch/dashI, Abdullah 2026-11-09 polish item 4) ----------
   View-only: no sim state. Order markers where units are heading (move / waypoint / attack-move / attack / guard each
   have their own shape and colour and fade out), a pooled set of flat quads (no allocation per order, none per frame),
   edge-scroll acceleration, minimap alert pings. The control scheme itself is untouched. */
const ORDM={pool:[],tex:{},geo:null,n:0};
const ORDM_DEF={move:{c:'#74d08f',d:.9,r:15},way:{c:'#e3b341',d:1.2,r:15},amove:{c:'#ea5a40',d:1.0,r:19},atk:{c:'#ff4a36',d:1.1,r:22},guard:{c:'#6fb2ff',d:1.5,r:24}};
function ordTex(k){let T=ORDM.tex[k];if(T)return T;const D=ORDM_DEF[k],cv2=document.createElement('canvas');cv2.width=cv2.height=128;const c=cv2.getContext('2d');
  c.translate(64,64);c.strokeStyle=D.c;c.fillStyle=D.c;c.lineWidth=9;c.lineJoin='round';c.lineCap='round';c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=6;
  if(k==='move'||k==='way'){c.beginPath();c.arc(0,0,40,0,7);c.stroke();c.beginPath();c.moveTo(-17,-14);c.lineTo(0,6);c.lineTo(17,-14);c.stroke();   // ring + downward chevron
    if(k==='way'){c.beginPath();c.arc(0,0,8,0,7);c.fill();}}
  else if(k==='amove'){for(const dy of [-18,6]){c.beginPath();c.moveTo(-26,dy);c.lineTo(0,dy+22);c.lineTo(26,dy);c.stroke();}c.lineWidth=5;c.beginPath();c.arc(0,0,52,0,7);c.stroke();}   // double chevron in a thin ring
  else if(k==='atk'){c.beginPath();c.arc(0,0,34,0,7);c.stroke();for(const [a,b] of [[0,-58,0,-30],[0,58,0,30],[-58,0,-30,0],[58,0,30,0]].map(v=>[[v[0],v[1]],[v[2],v[3]]])){c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke();}c.beginPath();c.arc(0,0,5,0,7);c.fill();}   // crosshair
  else{c.beginPath();c.moveTo(0,-46);c.lineTo(38,-24);c.lineTo(32,24);c.lineTo(0,48);c.lineTo(-32,24);c.lineTo(-38,-24);c.closePath();c.stroke();}   // guard: shield
  T=new THREE.CanvasTexture(cv2);ORDM.tex[k]=T;return T;}
function ordMark(k,x,y){if(typeof SET!=='undefined'&&SET.mPing===0)return;const D=ORDM_DEF[k];if(!D||!SCN)return;
  if(!ORDM.geo)ORDM.geo=new THREE.PlaneGeometry(2,2);
  let p=null;for(const q of ORDM.pool)if(!q.on){p=q;break;}
  if(!p){if(ORDM.pool.length>=24){p=ORDM.pool.reduce((a,b)=>a.t0<b.t0?a:b);}else{const m=new THREE.Mesh(ORDM.geo,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.rotation.order='YXZ';m.rotation.x=-Math.PI/2;m.renderOrder=4;m.visible=false;SCN.add(m);p={m,on:false,t0:0,k:'',x:0,y:0,d:1};ORDM.pool.push(p);}}
  if(!p.m.parent)SCN.add(p.m);p.on=true;p.k=k;p.x=x;p.y=y;p.t0=performance.now();p.d=D.d*1000;p.m.material.map=ordTex(k);p.m.material.needsUpdate=true;p.m.visible=true;p.m.position.set(x,groundH(x,y)+3,y);}
function ordMarkTick(){if(!ORDM.pool.length)return;const now=performance.now(),yw=camYaw();
  for(const p of ORDM.pool){if(!p.on)continue;const a=(now-p.t0)/p.d;if(a>=1){p.on=false;p.m.visible=false;continue;}const D=ORDM_DEF[p.k];
    const drop=a<.18?1.9-4.5*a:1,pulse=p.k==='atk'||p.k==='amove'?1+.07*Math.sin(a*26):1;   // drops in from above (bigger -> settles), attack types throb
    p.m.scale.setScalar(D.r*drop*pulse*(a>.6?1-(a-.6)*.35:1));p.m.rotation.y=yw;p.m.material.opacity=a<.5?1:1-(a-.5)*2;}}
function ordClear(){for(const p of ORDM.pool){p.on=false;p.m.visible=false;}}
// edge-scroll ease: pushing against the screen edge builds up speed over ~0.45 s (starts at 35%), letting go drops it fast
const EDGE={t:0};
function edgeEase(on,dt){EDGE.t=on?Math.min(1,EDGE.t+dt/.45):Math.max(0,EDGE.t-dt/.1);const k=EDGE.t;return .35+.65*k*k*(3-2*k);}
// minimap alert: the first hit on one of our units/buildings in a quiet spell pings the spot on the minimap (3 pulses) with a small blip
const MMA={t:-99,x:0,y:0,on:0,cool:-99};
function mmAlert(e,now){if(now-MMA.cool<7)return;MMA.cool=now;MMA.t=now;MMA.x=e.x;MMA.y=e.y;try{sfxUI(e.isB?520:420);setTimeout(()=>{try{sfxUI(e.isB?390:320);}catch(_){}},130);}catch(_){}}
function mmAlertDraw(c,sx,sy,now){const a=now-MMA.t;if(a>3||a<0)return;const k=(a%1),al=(1-a/3)*(1-k*.6);c.strokeStyle=`rgba(255,${90+k*60|0},40,${al})`;c.lineWidth=2.2;c.beginPath();c.arc(MMA.x*sx,MMA.y*sy,4+k*18,0,7);c.stroke();}
