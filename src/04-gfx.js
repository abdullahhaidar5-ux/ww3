let BORDER_TEX=null;
/* ================= 3D ENGINE: renderer, terrain, water, models ================= */
const cv=$('cv'),hud=$('hud'),hx=hud.getContext('2d'),mm=$('mm'),mx=mm.getContext('2d');
let HEMI=null,SUNOFF=[-900,780,-620],R3=null,SCN=null,CAM=null,SUN=null,VW=800,VH=600,dpr=1;
const WL=-4;let LAMPM=null; // water level
const cam={x:600,y:1500,z:1,dist:560,yaw:0};
const TMP=new THREE.Vector3(),TMPM=new THREE.Matrix4(),TMPQ=new THREE.Quaternion(),RAY=new THREE.Raycaster(),GPLANE=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const lin=hex=>new THREE.Color(hex).convertSRGBToLinear();
function initGfx(){
  R3=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
// One object that cannot be drawn must never stop the whole frame (that froze the picture while the battle went on):
// skip it, hide it and keep drawing everything else.
{const rbd=R3.renderBufferDirect.bind(R3);let nErr=0;R3.renderBufferDirect=function(cam,scene,geo,mat,obj,grp){try{return rbd(cam,scene,geo,mat,obj,grp);}catch(e){if(obj)obj.visible=false;if(nErr++<5){let q=obj,path=[];while(q&&path.length<6){path.push((q.name||'')+':'+q.type);q=q.parent;}console.warn('skipped an object that failed to draw: '+(e&&e.message)+' | '+(mat&&mat.type)+' '+(mat&&mat.name||'')+' map='+!!(mat&&mat.map)+' env='+!!(mat&&mat.envMap)+' ud='+Object.keys((mat&&mat.userData)||{}).join('/')+' | '+path.join(' < ')+' @ '+String(e&&e.stack||'').split('\n').slice(1,4).map(x=>x.trim()).join(' / '));}}};}
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();window.GLLOST=1;try{pushLog('Graphics were reset by the browser; restoring…','w');}catch(_){}},false);
  cv.addEventListener('webglcontextrestored',()=>{window.GLLOST=0;try{for(const o of OBJ.values())SCN.remove(o);OBJ.clear();for(const k in GEO)delete GEO[k];if(G&&G.terrain)buildWorld();}catch(err){console.warn(err);}},false);
  R3.outputEncoding=THREE.sRGBEncoding;R3.toneMapping=THREE.NoToneMapping;R3.shadowMap.enabled=true;R3.shadowMap.autoUpdate=false;/* shadows are drawn once per frame, for the main pass only (renderPost) - not again for the depth pre-pass */R3.shadowMap.type=THREE.PCFSoftShadowMap;R3.autoClear=true;
  SCN=new THREE.Scene();SCN.background=lin('#c7b493');SCN.fog=new THREE.Fog(lin('#8f8a70'),1800,6200);
  window.SKY=new THREE.Mesh(new THREE.SphereGeometry(7600,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{t:{value:0}},
    vertexShader:`varying vec3 vd;void main(){vd=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float t;varying vec3 vd;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){float y=max(vd.y,0.);vec3 hor=vec3(.86,.78,.64),zen=vec3(.30,.50,.80);vec3 c=mix(hor,zen,pow(y,.55));
        vec2 uv=vd.xz/(vd.y+.18)*1.6+vec2(t*.004,0.);float cl=n(uv)*.5+n(uv*2.1)*.3+n(uv*4.7)*.2;cl=smoothstep(.5,.78,cl)*smoothstep(.0,.25,y);c=mix(c,vec3(.97,.96,.93),cl*.85);c=mix(c,hor*.92,smoothstep(.12,0.,y));
        gl_FragColor=vec4(pow(c,vec3(2.2))*1.6,1.);}`}));SKY.renderOrder=-10;SKY.frustumCulled=false;SCN.add(SKY);
  CAM=new THREE.PerspectiveCamera(38,1,40,9000);
  HEMI=new THREE.HemisphereLight(lin('#b4cbef'),lin('#4d3f2c'),1.0);SCN.add(HEMI);
  SUN=new THREE.DirectionalLight(lin('#ffe2bd'),2.7);SUN.castShadow=true;const sm=2048;SUN.shadow.mapSize.set(sm,sm);SUN.shadow.radius=2;const sc=SUN.shadow.camera;sc.left=-900;sc.right=900;sc.top=900;sc.bottom=-900;sc.near=10;sc.far=3000;SUN.shadow.bias=-.0012;SUN.shadow.normalBias=1.4;
  SCN.add(SUN);SCN.add(SUN.target);
  initFX();initPost();
}
// Ground height is sampled once onto a 10-unit grid after the map is painted, then read back bilinearly: the full
// formula (shoreline, base pads, mesas, roads, mountains) is far too slow to evaluate thousands of times a frame.
function groundH(x,y){const H=G&&G.hgrid;if(!H)return groundH0(x,y);const fx=Math.max(0,Math.min(H.w-1.001,x/H.R)),fy=Math.max(0,Math.min(H.h-1.001,y/H.R)),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,k=j*H.w+i,a=H.a;
  return (a[k]*(1-tx)+a[k+1]*tx)*(1-ty)+(a[k+H.w]*(1-tx)+a[k+H.w+1]*tx)*ty;}
function buildHGrid(){const R=10,w=Math.ceil(MAPW/R)+2,h=Math.ceil(MAPH/R)+2,a=new Float32Array(w*h);G.hgrid=null;for(let j=0;j<h;j++)for(let i=0;i<w;i++)a[j*w+i]=groundH0(i*R,j*R);G.hgrid={a,w,h,R};}
function groundH0(x,y){if(!G||!G.map)return 0;const M=G.map,ed=-M.edge(x,y);
  let h=0;if(ed<50){const k=Math.max(0,Math.min(1,(ed+30)/80));h=-18+18*k*k*(3-2*k);}
  const far=Math.max(0,Math.min(1,(ed-90)/260));let bf=1;for(const [bx,by] of BASES){bf=Math.min(bf,Math.max(0,Math.min(1,(Math.hypot(x-bx,y-by)-330)/250)));}
  h+=far*bf*(5+7*Math.sin(x*.0042+1.3)*Math.cos(y*.0051+.4)+4*Math.sin(x*.011+y*.007));
  {const rm=G.roadMask;let onR=0;if(rm){const i=(y/rm.C|0)*rm.w+(x/rm.C|0);onR=rm.f?rm.f[i]||0:(rm.d[i]?1:0);}const n1=Math.sin(x*.0031+y*.0017+.7)*Math.cos(y*.0043-x*.0012+2.1),rr=1-Math.pow(Math.abs(Math.sin(x*.009+y*.004+n1*2.4)),1.8);let mask=Math.max(0,Math.min(1,(n1+.25)*2.4));for(const q of (G.map.oil||[]))mask*=Math.max(0,Math.min(1,(Math.hypot(x-q.x,y-q.y)-70)/90));for(const q of (G.map.fields||[]))mask*=Math.max(0,Math.min(1,(Math.hypot(x-q.x,y-q.y)-q.r-50)/90));const sm=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};const n2=.5+.5*Math.sin(x*.021+y*.013)*Math.cos(x*.011-y*.019);const e=rr*(.75+.25*n2);
  const mesa=(sm(.2,.9,e)*13+sm(.55,1.05,e)*5)*(M.rough||1);const cap=sm(.4,.75,e)*.6*(Math.sin(x*.07+y*.05)*1.5+Math.sin(x*.13-y*.09));const gate=sm(.5,.8,far*bf*mask);h+=gate*(1-onR)*(mesa+cap+sm(.3,.5,e)*5);}if(ed>=50)h=Math.max(h,-1);if(M.hasMtn){const m=M.mf(x,y);if(m>-90){const k=Math.max(0,Math.min(1,(m+90)/130)),sk=k*k*(3-2*k);const nn=.82+.12*Math.sin(x*.021+y*.017)+.08*Math.sin(x*.057-y*.049);const cr=1-Math.abs(Math.sin(x*.034+Math.sin(y*.021)*2.2)),cr2=1-Math.abs(Math.sin(y*.047+Math.sin(x*.029)*1.8));h+=sk*(48+.5*Math.min(Math.max(m,0),220))*nn+sk*(cr*cr*16+cr2*cr2*9)+Math.max(0,m)*.06*Math.abs(Math.sin(x*.09+y*.07));}}return h;}
function unitH(e){if(e.isB)return groundH(e.x,e.y);const s=e.s;if(s.dom==='naval')return WL+.5+Math.sin(G.t*1.6+e.id)*.6;
  const g=G.grid?G.grid[Math.floor(e.y/CELL)*GW+Math.floor(e.x/CELL)]:0;const base=g===2?4:Math.max(groundH(e.x,e.y),g===1?WL:-99);
  if(s.dom==='air'){if(e.landed)return base+1;let h=base+(s.alt==='high'?110:55)+Math.sin(G.t*2+e.id)*2;
    // jets: climb out after take-off, dive on the target, pull up hard after the drop, glide down to land
    if(e.kind==='jet'){const cr=base+125;h=cr;if(e.toT!=null){const k=Math.min(1,(G.t-e.toT)/3.2);h=base+1+(cr-base-1)*k*k*(3-2*k);}
      const t=e.target;if(t&&!t.dead&&e.ammo>0){const d=Math.hypot(t.x-e.x,t.y-e.y);if(d<480)h-=(1-d/480)*70;}const lf=G.t-(e.lastFire||-9);if(lf<3)h+=55*Math.sin(Math.min(1,lf/3)*Math.PI*.5)*(1-lf/3*.3);
      if(e.ld!=null&&e.ld<1)h=base+1+(h-base-1)*e.ld;}
    // kamikaze drones fly lower and dive onto their target for the final run
    if(e.kind==='drone'){h=base+42+Math.sin(G.t*3+e.id)*1.5;const t=e.target;if(t&&!t.dead){const d=Math.hypot(t.x-e.x,t.y-e.y);if(d<170){const k=Math.max(0,d-10)/160;h=Math.min(h,groundH(t.x,t.y)+6+(h-base-6)*k*k);}}}return h;}return base;}

/* ---------- terrain, water, bridges, trees ---------- */
let TERR=null,WATER=null,WORLD=null,FOGC=null,FOGT=null,FOGM=null;
function edgeTex(){const M=G.map,d=new Uint8Array(EF_W*EF_H*4);for(let i=0;i<EF_W*EF_H;i++){const v=Math.max(0,Math.min(255,Math.round(M.EF[i]+128)));d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=255;}
  const tx=new THREE.DataTexture(d,EF_W,EF_H,THREE.RGBAFormat);tx.magFilter=tx.minFilter=THREE.LinearFilter;tx.generateMipmaps=false;tx.wrapS=tx.wrapT=THREE.ClampToEdgeWrapping;tx.needsUpdate=true;return tx;}
let CITYM=null,CITYMAT=null;
function civAtXYAny(x,y){return G.civAt?G.civAt.get(Math.floor(y/CELL)*GW+Math.floor(x/CELL)):null;}
// city buildings: one merged mesh, styled by region; rebuilt when buildings are destroyed (rubble left behind)
const RCC={};function roofCol(c){return RCC[c]||(RCC[c]='#'+new THREE.Color(c).lerp(new THREE.Color('#8e8a82'),.42).getHexString());}
function buildCity(){if(!G.map.cityBlds||!G.map.cityBlds.length)return;
{const B=Bld(),W=Bld(),BT=[];const PAL={mideast:['#d8c9a8','#e6dcc6','#cbb48c','#efe8d8','#bfa883'],lebanon:['#efe7d6','#e4d6bc','#f4efe4','#d9cbb0'],yemen:['#8c6a4a','#a07a56','#7b5c40','#9c7b5c'],russia:['#a7a59c','#b8b1a3','#8f949a','#c2b7a0','#9aa3a8'],america:['#e9e4da','#c9d2da','#b88f6c','#d7d0c0','#8fa1b2'],turkey:['#efe9de','#e3d6c0','#f4eee4','#d8c9b0'],europe:['#efe6d2','#e2d2b4','#d8c8a8','#f2ead8'],gulfcity:['#9fb7c6','#c3d0d8','#7f98aa','#d9dde0','#b9a98c'],korea:['#d8d8d4','#c6cacc','#e4e2dc','#b8bec4'],asia:['#b7b2a8','#c9c3b6','#a6a49c','#d4cec0'],southasia:['#e2c49a','#d69a6a','#c8b08c','#e8d8b8','#b98a6a'],latin:['#f0d9a8','#9fd0c8','#f2b9a0','#e8e2d0','#b8d4e8']};
    for(const b of G.map.cityBlds){const cv=civAtXYAny(b.x,b.y);if(cv&&cv.dead){const g=groundH(b.x,b.y);const R=mulberry((b.x*7+b.y*3)|0);const rc=['#8d8371','#a39a86','#6f685b','#7a7466'];for(let q=0;q<5;q++){const w=b.w*(.3+R()*.4),h=2+R()*Math.min(9,b.h*.25);B.box(w,h,w*(.6+R()*.5),b.x+(R()-.5)*b.w*.6,g+h/2-.5,b.y+(R()-.5)*b.d*.6,rc[q%4],R()*.5,R()*3,R()*.4);}continue;}const g=groundH(b.x,b.y)-1,P=PAL[b.style]||PAL.mideast,col=P[Math.floor(b.v*P.length)%P.length],h=b.h,w=b.w,dd=b.d;
      W.box(w,h,dd,b.x,g+h/2,b.y,col);BT.push([g+1,g+h,b.style==='gulfcity'||b.style==='korea'||b.style==='asia'?1:b.style==='america'&&h<16?2:b.style==='yemen'?3:0,b.v]);
      // rooftop clutter: water tanks, AC units, stair heads, dishes and parapets on flat roofs
      {const flat=!(b.style==='america'&&h<16)&&!((b.style==='europe'||b.style==='turkey'))&&!(b.style==='lebanon'&&b.v>.7);if(flat){const R=mulberry(((b.x*13)^(b.y*7))|0),top=g+h;
        B.box(w+.4,1.2,.8,b.x,top+.6,b.y-dd/2+.4,col);B.box(w+.4,1.2,.8,b.x,top+.6,b.y+dd/2-.4,col);B.box(.8,1.2,dd,b.x-w/2+.4,top+.6,b.y,col);B.box(.8,1.2,dd,b.x+w/2-.4,top+.6,b.y,col);
        const n=1+(R()*3|0);for(let q=0;q<n;q++){const rx=b.x+(R()-.5)*w*.6,rz=b.y+(R()-.5)*dd*.6,k=R();if(k<.4){B.cyl(1.6,1.6,2.6,10,rx,top+1.5,rz,R()<.5?'#e9e6df':'#2d2f33');B.box(.3,1.4,.3,rx+1,top+.5,rz+1,'#555');}else if(k<.75)B.box(2.6,1.6,2,rx,top+.8,rz,'#c9c9c4');else if(k<.9){B.box(4,3.2,4,rx,top+1.6,rz,col);}else{B.cyl(.12,.12,2,5,rx,top+1,rz,'#666');B.sph(1.1,rx,top+2.2,rz,'#e4e4e0',1,.35,1);}}
        if(b.style==='mideast'||b.style==='lebanon'||b.style==='yemen'||b.style==='southasia'){if(R()<.5){const sd=R()<.5?1:-1;for(let fy=g+11;fy<top-4;fy+=10)B.box(w*.55,.6,2.2,b.x,fy,b.y+sd*(dd/2+1.1),'#d9d3c6'),B.box(w*.55,1.6,.25,b.x,fy+1,b.y+sd*(dd/2+2.1),'#6a6a66');}}}}
      if(b.style==='yemen'){for(let y=g+7;y<g+h-2;y+=7)B.box(w+.3,1,dd+.3,b.x,y,b.y,'#efe9dc');B.box(w*.9,1.6,dd*.9,b.x,g+h+.8,b.y,roofCol('#efe9dc'));}
      else if(b.style==='america'&&h<16){B.cone(Math.max(w,dd)*.74,7,4,b.x,g+h+3.5,b.y,b.v>.5?'#5b4a3e':'#3e4a55',0,Math.PI/4,0);}
      else if(b.style==='america'){for(let y=g+5;y<g+h-3;y+=6)B.box(w+.3,1.4,dd+.3,b.x,y,b.y,'#3a4a5c');}
      else if(b.style==='russia'){for(let y=g+5;y<g+h-3;y+=5)B.box(w+.3,.8,dd+.3,b.x,y,b.y,'#6c6f74');if(b.v>.965){B.sph(6,b.x,g+h+5,b.y,'#d4a83a',1,1.3,1);B.cone(1.5,6,6,b.x,g+h+13,b.y,'#d4a83a');}}
      else if(b.style==='lebanon'&&b.v>.7){B.cone(Math.max(w,dd)*.72,6,4,b.x,g+h+3,b.y,'#a6503a',0,Math.PI/4,0);}
      else if(b.style==='europe'||b.style==='turkey'){B.cone(Math.max(w,dd)*.74,8,4,b.x,g+h+4,b.y,b.style==='europe'?'#9a4632':'#b05a3c',0,Math.PI/4,0);if(b.style==='europe'&&b.v>.97){B.box(6,26,6,b.x,g+h+13,b.y,'#d8cdb4');B.cone(4.5,16,4,b.x,g+h+34,b.y,'#4d5a52',0,Math.PI/4,0);}
        if(b.style==='turkey'&&b.v>.95&&b.core>.3){B.sph(Math.min(w,dd)*.5,b.x,g+h+1,b.y,'#9aa3a6',1,.8,1);for(const s of [-1,1])B.cyl(1.6,2,h+34,8,b.x+s*w*.45,g+(h+34)/2,b.y,'#efe9de'),B.cone(2,8,8,b.x+s*w*.45,g+h+38,b.y,'#7d8a8c');}}
      else if(b.style==='gulfcity'||b.style==='korea'||b.style==='asia'){const gl=b.style==='gulfcity'?'#5d7f99':'#5f6a74';for(let y=g+4;y<g+h-3;y+=b.style==='gulfcity'?4:5)B.box(w+.3,b.style==='gulfcity'?2:1,dd+.3,b.x,y,b.y,gl);if(b.style==='gulfcity'&&h>110)B.cyl(.6,1.4,24,6,b.x,g+h+12,b.y,'#c9ced2');if(b.style==='asia'&&b.v>.9&&h<26)B.cone(Math.max(w,dd)*.8,5,4,b.x,g+h+2.5,b.y,'#7a3b2c',0,Math.PI/4,0);}
      else if(b.style==='latin'||b.style==='southasia'){B.box(w*.98,1.4,dd*.98,b.x,g+h+.7,b.y,roofCol('#efe9dc'));if(b.style==='southasia'&&b.v>.96)B.sph(Math.min(w,dd)*.4,b.x,g+h+1,b.y,'#e8e2d6',1,1.2,1);}
      else{B.box(w*.96,1.6,dd*.96,b.x,g+h+.8,b.y,roofCol(col));if(b.v>.93&&b.core>.4){B.sph(Math.min(w,dd)*.42,b.x,g+h+1,b.y,b.v>.97?'#3f8f8a':'#d9d2c0',1,.9,1);}else if(b.v<.025){B.cyl(2.2,2.6,h+26,8,b.x+w*.3,g+(h+26)/2,b.y+dd*.3,'#e8e0cc');B.cone(2.8,6,8,b.x+w*.3,g+h+29,b.y+dd*.3,'#3f8f8a');}}}
    if(CITYM){WORLD.remove(CITYM);CITYM.traverse(o=>{if(o.geometry)o.geometry.dispose();});}const grp=new THREE.Group();
    if(BT.length){const wg=W.geo(),per=wg.attributes.position.count/BT.length,a=new Float32Array(wg.attributes.position.count*4);for(let k=0;k<BT.length;k++)for(let q=0;q<per;q++)a.set(BT[k],(k*per+q)*4);wg.setAttribute('bt',new THREE.BufferAttribute(a,4));
      const wm=new THREE.Mesh(wg,cityWallMat());wm.castShadow=true;wm.receiveShadow=true;grp.add(wm);}
    if(B._p.length){const dm=new THREE.Mesh(B.geo(),CITYMAT||(CITYMAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9})));dm.castShadow=true;dm.receiveShadow=true;grp.add(dm);}
    WORLD.add(grp);CITYM=grp;}}
// City walls: windows, frames, shutters, sills, ground-floor shopfronts and doors, a cornice and grime, all drawn in the
// shader from each building's base and top so they line up storey by storey.
let CWMAT=null;function cityWallMat(){if(CWMAT)return CWMAT;const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 bt;varying vec4 vBT;varying vec3 vCW;varying vec3 vCN;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBT=bt;vCW=(modelMatrix*vec4(position,1.)).xyz;vCN=normalize(mat3(modelMatrix)*normal);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec4 vBT;varying vec3 vCW;varying vec3 vCN;float ch(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}').replace('#include <color_fragment>',`#include <color_fragment>
      float vt=1.-abs(vCN.y);float y=vCW.y-vBT.x,H=vBT.y-vBT.x;
      if(vt>.5&&y>.2&&y<H-.4){vec2 tn=normalize(vec2(-vCN.z,vCN.x));float u=dot(vCW.xz,tn);bool tower=vBT.z>.5&&vBT.z<1.5,house=vBT.z>1.5&&vBT.z<2.5,arch=vBT.z>2.5;
        float FH=tower?8.:10.,WS=tower?6.:9.;float fy=floor(y/FH),fx=floor(u/WS);vec2 f=vec2(fract(u/WS),fract(y/FH));float h=ch(vec2(fx,fy)+vBT.w*91.);
        float wx=tower?.12:.26,wy0=tower?.18:.3,wy1=tower?.92:.82;if(arch){wx=.34;wy0=.35;wy1=.78;}
        float win=step(wx,f.x)*step(f.x,1.-wx)*step(wy0,f.y)*step(f.y,wy1);float fr=step(wx-.06,f.x)*step(f.x,1.-wx+.06)*step(wy0-.07,f.y)*step(f.y,wy1+.05)*(1.-win);
        float gnd=1.-step(FH,y);if(gnd>.5&&!tower){float door=step(.36,fract(u/(WS*3.)))*step(fract(u/(WS*3.)),.5)*step(y,7.5);win=max(win*step(2.,y),0.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.12,.09),door*.95);}
        vec3 glass=mix(vec3(.07,.09,.11),vec3(.32,.38,.44),h*h)*(tower?1.15:1.);{vec3 Vg=normalize(cameraPosition-vCW);vec3 Rg=reflect(-Vg,normalize(vCN));float fg=.08+.92*pow(1.-clamp(dot(Vg,normalize(vCN)),0.,1.),4.);vec3 sk=mix(vec3(.55,.6,.66),vec3(.3,.45,.7),smoothstep(0.,.6,Rg.y));glass=mix(glass,sk*(tower?1.05:.9),fg*.75)+vec3(1.,.9,.7)*pow(max(dot(Rg,vec3(-.66,.57,-.46)),0.),90.)*.6;}if(h>.93)glass=vec3(.85,.7,.42);
        vec3 base=diffuseColor.rgb;diffuseColor.rgb=mix(diffuseColor.rgb,base*1.18+.04,fr*.8);diffuseColor.rgb=mix(diffuseColor.rgb,glass,win*.95);
        if(!tower&&h<.18)diffuseColor.rgb=mix(diffuseColor.rgb,base*.62+vec3(.05,.07,.04),win);
        float sill=step(wx-.04,f.x)*step(f.x,1.-wx+.04)*step(wy0-.1,f.y)*step(f.y,wy0-.03);diffuseColor.rgb=mix(diffuseColor.rgb,base*1.3+.05,sill*.9);
        float streak=(1.-win)*step(wx,f.x)*step(f.x,1.-wx)*step(f.y,wy0)*.12;diffuseColor.rgb*=1.-streak;
        diffuseColor.rgb*=.8+.2*smoothstep(0.,6.,y);diffuseColor.rgb=mix(diffuseColor.rgb,base*.72,step(H-1.6,y)*.85);}
      else if(vt<.5){vec2 q=vCW.xz/9.,i0=floor(q),fq=fract(q);fq=fq*fq*(3.-2.*fq);float n=mix(mix(ch(i0),ch(i0+vec2(1,0)),fq.x),mix(ch(i0+vec2(0,1)),ch(i0+vec2(1,1)),fq.x),fq.y);
        vec2 q2=vCW.xz/2.3,j0=floor(q2),fj=fract(q2);fj=fj*fj*(3.-2.*fj);float n2=mix(mix(ch(j0),ch(j0+vec2(1,0)),fj.x),mix(ch(j0+vec2(0,1)),ch(j0+vec2(1,1)),fj.x),fj.y);
        vec3 roof=mix(diffuseColor.rgb,vec3(.6,.58,.55),.42);diffuseColor.rgb=roof*(.8+.14*n+.06*n2)*(1.-.18*smoothstep(.62,.8,n));}
      if(vt>.5){diffuseColor.rgb*=.93;}`);};
  m.customProgramCacheKey=()=>'citywall3';return CWMAT=m;}

// Beyond the playable area the land carries on: the edge heights and colours are continued outward and roll up into
// soft hills (or stay as open sea where the map edge is water), fading into the haze, so the map has no hard border.
function bN2(x,y){const s=Math.sin(x*.0021+Math.sin(y*.0013)*2)*Math.cos(y*.0018+Math.sin(x*.0011)*1.7);return s*.6+.4*Math.sin(x*.0057+y*.0043)*Math.cos(x*.0031-y*.0049);}
function borderH(x,z){const cx=Math.max(1,Math.min(MAPW-1,x)),cz=Math.max(1,Math.min(MAPH-1,z)),dx=Math.max(0,-x,x-MAPW),dz=Math.max(0,-z,z-MAPH),d=Math.hypot(dx,dz);if(d<=0)return groundH(x,z);
  if(G.map.edge(cx,cz)>-20)return Math.min(WL-6,groundH(cx,cz))-Math.min(30,d*.05);const s=Math.min(1,d/900),s2=s*s*(3-2*s),hill=60+150*(.5+.5*bN2(x,z))*Math.min(1,d/1600);return groundH(cx,cz)*(1-s2)+hill*s2+bN2(x*3,z*3)*6*s;}
// woods continue past the map edge (rendering only: not in G.treePos, so no cover or pathing effect)
function borderTrees(){if(!G.treePos||G.treePos.length<40||!MODELS.ready)return;const R=mulberry((G.seed||1)*13+5),ext=[],dens=Math.min(1,G.treePos.length/900);
  for(let i=0;i<5200&&ext.length<520*dens+60;i++){const side=R()*4|0,t=R(),o=60+Math.pow(R(),1.6)*900;let x,y;if(side===0){x=t*MAPW;y=-o;}else if(side===1){x=t*MAPW;y=MAPH+o;}else if(side===2){x=-o;y=t*MAPH;}else{x=MAPW+o;y=t*MAPH;}
    if(bN2(x*2.3,y*2.3)<.05)continue;const cx=Math.max(1,Math.min(MAPW-1,x)),cy=Math.max(1,Math.min(MAPH-1,y));if(G.map.edge(cx,cy)>-60)continue;ext.push([x,y,.8+R()*.55,R()*6.28]);}
  if(!ext.length)return;const keep=G.treePos,gh=groundH;try{G.treePos=ext;groundH=(x,y)=>(x<0||y<0||x>MAPW||y>MAPH)?borderH(x,y):gh(x,y);modelTrees();}finally{G.treePos=keep;groundH=gh;}}
function borderLand(dtex){const M=G.map,BX=Math.max(MAPW,MAPH)*.7,W2=MAPW+2*BX,H2=MAPH+2*BX,sx=200,sy=Math.round(sx*H2/W2);
  const g=new THREE.PlaneGeometry(W2,H2,sx,sy);g.rotateX(-Math.PI/2);g.translate(MAPW/2,0,MAPH/2);const p=g.attributes.position,col=new Float32Array(p.count*3),FD=new Float32Array(p.count),CELL=W2/sx;
  const th=G.thumb,tw=th.width,thh=th.height,td=th.getContext('2d').getImageData(0,0,tw,thh).data;
  const theme=M.theme,base=new THREE.Color(theme==='snow'?'#c4ccd4':theme==='green'?'#66733f':'#a88d60'),rock=new THREE.Color(theme==='snow'?'#e8edf2':theme==='green'?'#6d6656':'#9a8466');
  const n2=(x,y)=>{const s=Math.sin(x*.0021+Math.sin(y*.0013)*2)*Math.cos(y*.0018+Math.sin(x*.0011)*1.7);return s*.6+.4*Math.sin(x*.0057+y*.0043)*Math.cos(x*.0031-y*.0049);};
  const c=new THREE.Color(),tc=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),cx=Math.max(1,Math.min(MAPW-1,x)),cz=Math.max(1,Math.min(MAPH-1,z)),dx=Math.max(0,-x,x-MAPW),dz=Math.max(0,-z,z-MAPH),d=Math.hypot(dx,dz);
    const k=((Math.min(thh-1,cz/MAPH*thh|0))*tw+Math.min(tw-1,cx/MAPW*tw|0))*4;tc.setRGB(td[k]/255,td[k+1]/255,td[k+2]/255).convertSRGBToLinear();
    let y=borderH(x,z);const wet=M.edge(cx,cz)>-20;
    if(d<=0){const ins=Math.min(x,MAPW-x,z,MAPH-z);y=groundH(x,z)-(ins<CELL*1.6?0:4+Math.min(80,(ins-CELL*1.6)*.6));}
    p.setY(i,y);const fade=Math.min(1,d/700),sl=Math.max(0,Math.min(1,(y-90)/120));c.copy(tc).lerp(base,fade*.75).lerp(rock,sl*.5*fade);c.multiplyScalar(.94+.12*n2(x*4.1,z*3.7));col.set([c.r,c.g,c.b],i*3);FD[i]=Math.min(1,d/1100);}
  g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('fd',new THREE.BufferAttribute(FD,1));g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:4});if(dtex)m.onBeforeCompile=sh=>{sh.uniforms.dmap={value:dtex};sh.uniforms.ttex={value:BORDER_TEX};sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vWP;attribute float fd;varying float vFD;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWP=position.xz;vFD=fd;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vWP;varying float vFD;uniform sampler2D dmap;uniform sampler2D ttex;').replace('#include <color_fragment>','#include <color_fragment>\n{vec2 mu=vWP/vec2('+MAPW.toFixed(1)+','+MAPH.toFixed(1)+');mu=1.-abs(mod(mu,2.)-1.);vec3 tl=pow(texture2D(ttex,vec2(mu.x,1.-mu.y)).rgb,vec3(2.2));float k=smoothstep(0.,1.,vFD);diffuseColor.rgb=mix(tl,diffuseColor.rgb,k*.85);float lu=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(lu),k*.35)*(1.-.28*k);}\n{vec2 tU=vWP/3200.;float dn=texture2D(dmap,tU*90.).r*.6+texture2D(dmap,tU*17.).r*.4;diffuseColor.rgb*=mix(.78,1.18,dn);float m1=texture2D(dmap,tU*.9+.21).r;diffuseColor.rgb*=.9+.2*m1;float fine=texture2D(dmap,tU*1400.).r;diffuseColor.rgb*=1.+(fine-.5)*.2;}');};const mesh2=new THREE.Mesh(g,m);mesh2.receiveShadow=true;mesh2.renderOrder=-1;WORLD.add(mesh2);}
// tc: the painted ground canvas (the battle start passes it in before it is handed to the view as G.terrain)
function buildWorld(tc){
  if(WORLD){SCN.remove(WORLD);WORLD.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  WORLD=new THREE.Group();SCN.add(WORLD);
  const tex=new THREE.CanvasTexture(tc||G.terrain);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=R3.capabilities.getMaxAnisotropy();
  const TSG=Math.min(1.8,Math.max(1.3,WK*.85)),g=new THREE.PlaneGeometry(MAPW,MAPH,Math.round(320*TSG),Math.round(220*TSG));g.rotateX(-Math.PI/2);const p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i)+MAPW/2,z=p.getZ(i)+MAPH/2;p.setY(i,groundH(x,z));}g.computeVertexNormals();
  {const nn=g.attributes.normal,cols=new Float32Array(p.count*3),AOA=new Float32Array(p.count);for(let i=0;i<p.count;i++){const sl=1-nn.getY(i),k=Math.max(0,Math.min(1,(sl-.12)*3.2)),st=.78+.22*Math.sin(p.getY(i)*1.3);const x=p.getX(i)+MAPW/2,z=p.getZ(i)+MAPH/2,hy=p.getY(i),cv=hy-(groundH(x+24,z)+groundH(x-24,z)+groundH(x,z+24)+groundH(x,z-24))*.25,ao=Math.max(.8,Math.min(1.08,1+cv*.025));AOA[i]=ao;cols[i*3]=1-k*.1*(2-st);cols[i*3+1]=1-k*.13*(2-st);cols[i*3+2]=1-k*.16*(2-st);}g.setAttribute('ao',new THREE.BufferAttribute(AOA,1));g.setAttribute('color',new THREE.BufferAttribute(cols,3));}g.translate(MAPW/2,0,MAPH/2);
  const dc=document.createElement('canvas');dc.width=dc.height=256;const dx=dc.getContext('2d'),di=dx.createImageData(256,256);{const v=new Float32Array(256*256);for(let o=0;o<5;o++){const s=1<<(o+2),g2=[];for(let i=0;i<(s+1)*(s+1);i++)g2.push(Math.random());for(let y=0;y<256;y++)for(let x=0;x<256;x++){const fx=x/256*s,fy=y/256*s,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,a=g2[iy*(s+1)+ix],b=g2[iy*(s+1)+((ix+1)%s)],c2=g2[((iy+1)%s)*(s+1)+ix],d2=g2[((iy+1)%s)*(s+1)+((ix+1)%s)];v[y*256+x]+=((a*(1-tx)+b*tx)*(1-ty)+(c2*(1-tx)+d2*tx)*ty)/(1<<o);}}for(let i=0;i<v.length;i++){const q=Math.max(0,Math.min(255,(v[i]/1.94)*255));di.data.set([q,q,q,255],i*4);}}dx.putImageData(di,0,0);
  const dtex=new THREE.CanvasTexture(dc);dtex.wrapS=dtex.wrapT=THREE.RepeatWrapping;dtex.anisotropy=8;
  const tm=new THREE.MeshStandardMaterial({map:tex,roughness:.93,metalness:0,vertexColors:true});tm.onBeforeCompile=sh=>{sh.uniforms.dmap={value:dtex};sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vH;attribute float ao;varying float vAO;').replace('#include <begin_vertex>','#include <begin_vertex>\nvH=position.y;vAO=ao;');sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vH;varying float vAO;').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=vAO;\n vec2 tU=vUv*vec2('+(MAPW/3200).toFixed(4)+','+(MAPH/3200).toFixed(4)+');\n {float m1=texture2D(dmap,tU*.9+.21).r,m2=texture2D(dmap,tU*2.3+.63).r;diffuseColor.rgb*=.9+.2*m1;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.,.9),smoothstep(.45,.7,m2)*.6);}\n float dn=texture2D(dmap,tU*90.).r*.6+texture2D(dmap,tU*17.).r*.4; diffuseColor.rgb*=mix(.72,1.22,dn); {float mac=texture2D(dmap,tU*5.).r*.6+texture2D(dmap,tU*11.+.37).r*.4;float l0=dot(diffuseColor.rgb,vec3(.3,.59,.11));vec3 pale=vec3(l0)*vec3(1.16,1.05,.86);diffuseColor.rgb=mix(diffuseColor.rgb,pale*1.12,smoothstep(.56,.74,mac)*.5);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.8,.79,.78),smoothstep(.44,.26,mac)*.55);float l1=dot(diffuseColor.rgb,vec3(.3,.59,.11));diffuseColor.rgb=mix(vec3(l1),diffuseColor.rgb,.88);} {vec2 wq=vUv*vec2('+MAPW+'.,'+MAPH+'.);vec2 ci=floor(wq*.55);float hh=fract(sin(dot(ci,vec2(12.9898,78.233)))*43758.5453);vec2 cf=fract(wq*.55)-.5;float peb=step(.93,hh)*smoothstep(.32,.12,length(cf));float fine=texture2D(dmap,tU*1400.).r;float rip=sin(wq.x*.35+wq.y*.12+fine*4.)*.5+.5;diffuseColor.rgb*=1.+(fine-.5)*.22+(rip-.5)*.05;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*(hh>.965?1.35:.55),peb*.7);} {float rk=clamp((1.-vColor.r)*5.,0.,1.)*.5;float nz=texture2D(dmap,tU*60.).r;float band=sin(vH*.75+nz*5.)*.5+.5;float band2=sin(vH*2.3+nz*9.)*.5+.5;vec3 rockc=vec3(.82,.66,.48)*(.88+.2*band)*(.94+.1*band2);float cr=smoothstep(.55,.6,texture2D(dmap,vec2(tU.x*300.,vH*.08)).r);rockc*=1.-cr*.15;diffuseColor.rgb=mix(diffuseColor.rgb,rockc*(diffuseColor.rgb/max(vec3(.05),vColor.rgb))*.9,rk*.6);}').replace('void main() {','uniform sampler2D dmap;\nvoid main() {').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n {vec2 tU=vUv*vec2('+(MAPW/3200).toFixed(4)+','+(MAPH/3200).toFixed(4)+');vec2 bu=tU*90.;float h0=texture2D(dmap,bu).r*.7+texture2D(dmap,tU*370.).r*.3;float hx=texture2D(dmap,bu+vec2(.004,0.)).r*.7+texture2D(dmap,tU*370.+vec2(.004,0.)).r*.3;float hy=texture2D(dmap,bu+vec2(0.,.004)).r*.7+texture2D(dmap,tU*370.+vec2(0.,.004)).r*.3;normal=normalize(normal+(viewMatrix*vec4((h0-hx)*2.6,0.,(h0-hy)*2.6,0.)).xyz);}');};
  TERR=new THREE.Mesh(g,tm);TERR.receiveShadow=true;WORLD.add(TERR);
  BORDER_TEX=tex;borderLand(dtex);
  // city buildings: one merged mesh, styled by region
  CITYM=null;G.civDirty=false;buildCity();

  // skirt so the map edge doesn't float

  // water
  const BX=Math.max(MAPW,MAPH)*.7,wg=new THREE.PlaneGeometry(MAPW+2*BX,MAPH+2*BX,1,1).rotateX(-Math.PI/2);wg.translate(MAPW/2,WL,MAPH/2);
  WATER=new THREE.Mesh(wg,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{t:{value:0},sun:{value:new THREE.Vector3(-.55,.55,-.4).normalize()},cpos:{value:new THREE.Vector3()},etex:{value:edgeTex()},esz:{value:new THREE.Vector2(EF_W,EF_H)},ice:{value:G.map.theme==='snow'?1:0}},
    vertexShader:`varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform float t;uniform vec3 sun;uniform vec3 cpos;uniform sampler2D etex;uniform vec2 esz;uniform float ice;varying vec3 wp;
      float edgeAt(vec2 p){vec2 uv=(p/${EF_R.toFixed(1)}+.5)/esz;return texture2D(etex,uv).r*255.-128.;}
      vec2 W(vec2 p,vec2 d,float f,float s){float ph=dot(p,d)*f+t*s;return d*cos(ph)*f;}
      void main(){vec2 p=wp.xz;vec2 g=W(p,normalize(vec2(1.,.4)),.045,1.3)*.7+W(p,normalize(vec2(-.3,1.)),.07,1.9)*.45+W(p,normalize(vec2(.7,-.6)),.13,2.6)*.3+W(p,normalize(vec2(-.9,-.2)),.21,3.4)*.18+W(p,normalize(vec2(.2,.98)),.37,4.1)*.1+W(p,normalize(vec2(-.6,.8)),.53,5.3)*.07+W(p,normalize(vec2(.95,-.3)),.71,6.2)*.05+W(p,normalize(vec2(-.4,-.92)),.97,7.4)*.035;
        vec3 n=normalize(vec3(-g.x*2.2,1.,-g.y*2.2));vec3 v=normalize(cpos-wp);float fr=pow(1.-max(dot(n,v),0.),3.);
        vec3 deep=vec3(.07,.24,.28),shal=vec3(.16,.42,.42),sky=vec3(.6,.72,.8);vec3 c=mix(deep,shal,.45+.3*n.x)+sky*fr*.55;
        vec3 h=normalize(sun+v);float sp=pow(max(dot(n,h),0.),900.)*.32+pow(max(dot(n,h),0.),90.)*.05;c+=vec3(1.,.93,.8)*sp;float lv=sin(p.x*.011+p.y*.007+t*.1)*sin(p.y*.013-p.x*.004)*.5+.5;c*=.9+.16*lv;
        float edge=edgeAt(wp.xz);if(edge<-60.)discard;float fn=sin(wp.x*.11+t*.9)*sin(wp.z*.13-t*.7)*.5+.5;float sw=sin(edge*.3-t*1.4+fn*2.)*.5+.5;float br=fract(sin(dot(floor(wp.xz*.12),vec2(12.9,78.2)))*437.5);float foam=smoothstep(14.,0.,edge)*(.55+.45*fn)+smoothstep(34.,12.,edge)*smoothstep(.7,.95,sw)*(.55+.45*br)+smoothstep(22.,12.,edge)*smoothstep(8.,12.,edge)*.18*fn;float dp=smoothstep(0.,120.,edge);
        c=mix(vec3(.3,.5,.44),c,smoothstep(0.,150.,edge));c=mix(vec3(.5,.56,.44),c,smoothstep(0.,22.,edge)*.7+.3);c=mix(c,vec3(.9,.92,.9),clamp(foam,0.,1.)*.8);if(ice>0.){vec2 q=p+vec2(sin(p.y*.006)*90.,sin(p.x*.005)*90.);float fl=sin(q.x*.0105+sin(q.y*.0071)*2.3)*sin(q.y*.0123+sin(q.x*.0083)*2.1)*.6+sin(q.x*.027-q.y*.021+sin(q.y*.019)*1.7)*.3+sin(q.x*.061+q.y*.053)*.1;float cr=(smoothstep(.99,1.,abs(sin(q.x*.05+fl*7.)))+smoothstep(.99,1.,abs(sin(q.y*.043-fl*6.))))*.25;float shore=smoothstep(60.,6.,edge+fl*25.);float k=clamp(shore+smoothstep(.22,.32,fl),0.,1.);c=mix(c,vec3(.78,.86,.9)-cr*.12,k*.85);foam=max(foam,k*1.5);}
        gl_FragColor=vec4(pow(c,vec3(2.2)),mix(.45,.88,dp)+fr*.1+foam*.3);}`}));
  WATER.renderOrder=1;WATER.visible=!!G.map.hasWater;WORLD.add(WATER);
  // bridges
  const bm=new THREE.MeshStandardMaterial({color:lin('#8b8880'),roughness:.9}),rm=new THREE.MeshStandardMaterial({color:lin('#5e625f'),roughness:.55,metalness:.4}),pm=new THREE.MeshStandardMaterial({color:lin('#7d7a72'),roughness:.95});
  const dk=(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#4b4a47';x.fillRect(0,0,512,128);const id=x.getImageData(0,0,512,128);for(let i=0;i<id.data.length;i+=4){const n=(Math.random()-.5)*18;id.data[i]+=n;id.data[i+1]+=n;id.data[i+2]+=n;}x.putImageData(id,0,0);
    for(let k=0;k<30;k++){const gx=Math.random()*512,gy=Math.random()*128;const g=x.createRadialGradient(gx,gy,0,gx,gy,10+Math.random()*24);g.addColorStop(0,'rgba(30,28,26,.25)');g.addColorStop(1,'rgba(30,28,26,0)');x.fillStyle=g;x.fillRect(0,0,512,128);}
    x.fillStyle='#8f8b82';x.fillRect(0,0,512,10);x.fillRect(0,118,512,10);x.fillStyle='rgba(210,202,180,.45)';x.fillRect(0,14,512,2);x.fillRect(0,112,512,2);x.fillStyle='rgba(200,170,80,.45)';for(let i=0;i<512;i+=32)x.fillRect(i,62,18,3);
    x.fillStyle='rgba(30,30,28,.6)';for(let i=0;i<512;i+=128)x.fillRect(i,10,2,108);x.strokeStyle='rgba(20,20,18,.18)';x.lineWidth=7;for(const y of [36,92]){x.beginPath();x.moveTo(0,y);x.lineTo(512,y);x.stroke();}
    {x.globalAlpha=1;for(let k=0;k<70;k++){const gx=Math.random()*512,edge=Math.random()<.6,gy=edge?(Math.random()<.5?10+Math.random()*18:100+Math.random()*18):Math.random()*128,r=6+Math.random()*26;const g=x.createRadialGradient(gx,gy,0,gx,gy,r);const al=edge?.55:.3;g.addColorStop(0,`rgba(176,148,108,${al})`);g.addColorStop(1,'rgba(176,148,108,0)');x.fillStyle=g;x.beginPath();x.ellipse(gx,gy,r*1.8,r*.6,0,0,7);x.fill();}
     x.strokeStyle='rgba(24,22,20,.5)';x.lineWidth=1;for(let k=0;k<26;k++){let px=Math.random()*512,py=14+Math.random()*100,a=Math.random()*6.3;x.beginPath();x.moveTo(px,py);for(let q=0;q<7;q++){a+=(Math.random()-.5)*1.4;px+=Math.cos(a)*5;py+=Math.sin(a)*3;x.lineTo(px,py);}x.stroke();}
     for(let k=0;k<5;k++){const gx=Math.random()*512,gy=24+Math.random()*80;x.fillStyle='rgba(36,34,30,.55)';x.beginPath();x.ellipse(gx,gy,6+Math.random()*7,3+Math.random()*4,Math.random()*3,0,7);x.fill();}}
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t;})();
  const dm=new THREE.MeshStandardMaterial({map:dk,roughness:.92});
  for(const b of G.map.bridges){const grp=new THREE.Group();grp.position.set(b.x,0,b.y);grp.rotation.y=-Math.atan2(b.n[1],b.n[0]);const L=b.h*2+30;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(L,3,66),[bm,bm,dm,bm,bm,bm]);deck.position.y=3;deck.castShadow=deck.receiveShadow=true;grp.add(deck);dk.repeat.set(Math.max(1,Math.round(L/256)),1);
    const gird=new THREE.Mesh(new THREE.BoxGeometry(L,6,56),pm);gird.position.y=-2;gird.castShadow=true;grp.add(gird);
    for(const z of [-31,31])for(let s2=-L/2+12;s2<L/2;s2+=48){const lp=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,16,6),rm);lp.position.set(s2,13,z);lp.castShadow=true;grp.add(lp);const arm=new THREE.Mesh(new THREE.BoxGeometry(1,1,6),rm);arm.position.set(s2,21,z*0.9);grp.add(arm);const hd=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.1,3.6),LAMPM||(LAMPM=new THREE.MeshStandardMaterial({color:0x3a3d40,emissive:0xffd9a0,emissiveIntensity:.55,roughness:.6})));hd.position.set(s2,20.4,z*0.8);grp.add(hd);}
    for(const z of [-33,33]){const r=new THREE.Mesh(new THREE.BoxGeometry(L,1.2,1.2),rm);r.position.set(0,8.2,z);r.castShadow=true;grp.add(r);const cb=new THREE.Mesh(new THREE.BoxGeometry(L,2.4,2.4),pm);cb.position.set(0,5.6,z);grp.add(cb);for(let s2=-L/2+4;s2<L/2;s2+=12){const po=new THREE.Mesh(new THREE.BoxGeometry(.8,3,.8),rm);po.position.set(s2,6.8,z);grp.add(po);}}
    for(let s=-L/2+50;s<L/2-30;s+=70){const pl=new THREE.Mesh(new THREE.BoxGeometry(12,26,58),pm);pl.position.set(s,-10,0);pl.castShadow=true;grp.add(pl);}
    WORLD.add(grp);}
  // trees (instanced)
  try{scenery();}catch(e){console.warn('scenery',e);}
  if(modelTrees()){try{borderTrees();}catch(e){}}else{const N=G.treePos.length;mats();
  const mkTree=v=>{const B=Bld();B.cyl(1.1,1.9,12,6,0,6,0,'#4a3826');const R=mulberry(v*31+7);const nb=4+(R()*3|0);for(let i=0;i<nb;i++){const a=R()*6.28,d=i?2+R()*4:0,r=5.5+R()*4,h=13+R()*7+(i?0:4);const g=new THREE.IcosahedronGeometry(r,1);g.scale(1,.9,1);B.box(.1,.1,.1,0,0,0,'#000');const c=new THREE.Color().setHSL(.21+R()*.06,.38+R()*.15,.2+R()*.08);parts_add(B,g,Math.cos(a)*d,h,Math.sin(a)*d,c);}return B.geo();};
  const TG=[0,1,2].map(mkTree);const per=[[],[],[]];G.treePos.forEach((t,i)=>per[i%3].push(t));
  const trunks={castShadow:false},crowns={castShadow:false};
  per.forEach((list,k)=>{const im=new THREE.InstancedMesh(TG[k],new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,flatShading:false}),list.length);const col=new THREE.Color();
    list.forEach(([x,y,s,r],i)=>{TMPM.compose(TMP.set(x,groundH(x,y),y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),r),new THREE.Vector3(s,s*(.85+((i*7)%5)*.07),s));im.setMatrixAt(i,TMPM);col.setHSL(0,0,.85+((i*13)%10)*.03);im.setColorAt(i,col);});
    im.castShadow=true;im.receiveShadow=true;WORLD.add(im);});
  }
  { // grass tufts
    const gg=(()=>{const P=[],Nn=[],C=[],Rb=mulberry(5);for(let k=0;k<15;k++){const a=Rb()*6.28,d=Rb()*2.6,x=Math.cos(a)*d,z=Math.sin(a)*d,h=3+Rb()*5,w=.32+Rb()*.25,la=Rb()*6.28,lean=.6+Rb()*1.6,ox=Math.cos(la+1.57)*w,oz=Math.sin(la+1.57)*w,tx=x+Math.cos(la)*lean,tz=z+Math.sin(la)*lean;
      P.push(x-ox,0,z-oz,x+ox,0,z+oz,tx,h,tz, x+ox,0,z+oz,x-ox,0,z-oz,tx,h,tz);for(let q=0;q<6;q++)Nn.push(0,1,0);C.push(.6,.6,.6,.6,.6,.6,1.15,1.15,1.15, .6,.6,.6,.6,.6,.6,1.15,1.15,1.15);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return g;})();
    const gmat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true});window.WINDU={value:0};
    gmat.onBeforeCompile=sh=>{sh.uniforms.wt=WINDU;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float wt;').replace('#include <begin_vertex>','#include <begin_vertex>\n{vec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float k=max(transformed.y,0.)/6.;float w=sin(wt*1.7+ip.x*.021+ip.z*.017)*.6+sin(wt*3.1+ip.x*.05)*.25;transformed.x+=w*k*k*1.6;transformed.z+=w*k*k*.7;}');};
    const AREA=Math.max(1,MAPW*MAPH/(3200*2200)),NG=Math.round(9000*Math.min(2,AREA)),gm=new THREE.InstancedMesh(gg,gmat,NG);let n=0;const gc=new THREE.Color();const R=mulberry(G.seed+99);
    for(let k=0;k<NG*3&&n<NG;k++){const x=R()*MAPW,y=R()*MAPH,M=G.map;if(Math.abs(M.depth(x,y))<M.hw(x)+40)continue;if(BASES.some(([bx,by])=>Math.abs(x-bx)<290&&Math.abs(y-by)<290))continue;if(G.fields.some(f=>Math.hypot(f.x-x,f.y-y)<70))continue;if(G.map.hasMtn&&G.map.mf(x,y)>-40)continue;if(G.roadMask){const q=G.roadMask;if(q.d[(y/q.C|0)*q.w+(x/q.C|0)]&&R()<.9)continue;}
      if(Math.hypot(groundH(x+6,y)-groundH(x-6,y),groundH(x,y+6)-groundH(x,y-6))/12>.4)continue;const cl=Math.sin(x*.013)*Math.cos(y*.011)+Math.sin(x*.031+y*.017)*.5;if(cl<.1&&R()<.7)continue;const s=.7+R()*1.0;TMPM.compose(TMP.set(x,groundH(x,y),y),TMPQ.setFromAxisAngle(new THREE.Vector3(0,1,0),R()*6),new THREE.Vector3(s,s*(.6+R()*.7),s));gm.setMatrixAt(n,TMPM);const dry=R()<.7;if(G.map.theme==='snow'){if(R()<.55)continue;gc.setHSL(.09+R()*.03,.18+R()*.1,.36+R()*.14).convertSRGBToLinear();}else gc.setHSL(dry?.1+R()*.04:.17+R()*.06,dry?.3+R()*.12:.26+R()*.14,dry?.42+R()*.12:.26+R()*.09).convertSRGBToLinear();gm.setColorAt(n,gc);n++;}
    {const rg=new THREE.IcosahedronGeometry(1,1);/* 80 triangles per rock (was 180): thousands of small rocks were ~0.7M triangles per pass */const rp=rg.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),j=1+.18*Math.sin(x*3.1+z*2.3)+.1*Math.sin(y*4.7+x*1.9);rp.setXYZ(i,x*j,y*.55*j,z*j);}rg.computeVertexNormals();const rmat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.95});if(typeof weather==='function')weather(rmat,1.3,0);const NR=Math.round(2200*Math.min(2.5,AREA)),rim=new THREE.InstancedMesh(rg,rmat,NR);let rn=0;const rc=new THREE.Color();
      for(let k=0;k<NR*3&&rn<NR;k++){const x=R()*MAPW,y=R()*MAPH,M=G.map;if(Math.abs(M.depth(x,y))<M.hw(x)+20)continue;if(BASES.some(([bx,by])=>Math.abs(x-bx)<280&&Math.abs(y-by)<280))continue;if(G.roadMask){const q=G.roadMask;if(q.d[(y/q.C|0)*q.w+(x/q.C|0)])continue;}
        const s2=R()<.9?.6+R()*1.4:2+R()*3;TMPM.compose(TMP.set(x,groundH(x,y)+s2*.04,y),TMPQ.setFromEuler(new THREE.Euler(R()*.5,R()*6.3,R()*.5)),new THREE.Vector3(s2*(1+R()*.6),s2,s2));rim.setMatrixAt(rn,TMPM);rc.setHSL(.07+R()*.05,.08+R()*.14,R()<.3?.36+R()*.1:.5+R()*.16).convertSRGBToLinear();rim.setColorAt(rn,rc);rn++;}
      rim.count=rn;rim.castShadow=true;rim.receiveShadow=true;rim.userData.noDepth=true;WORLD.add(rim);}
    gm.count=n;gm.receiveShadow=true;gm.userData.noDepth=true;WORLD.add(gm);}
  // oil derricks
  mats();G.oilObj=G.oil.map(o=>{const grp=new THREE.Group();const B=Bld(),fr='#4f555b',dk='#2c2e2c';
    B.box(46,2.4,24,0,1.2,0,'#8a877d');B.box(10,1,10,20,2.6,0,'#6f6c63');
    for(const z of [-5,5]){B.box(2.2,32,2.2,-4,16,z*1.25,fr,z>0?-.16:.16,0,0);B.box(2.2,30,2.2,4,15,z*1.25,fr,z>0?-.16:.16,0,0);}
    B.box(10,1.4,1.4,0,8,-5.5,fr);B.box(10,1.4,1.4,0,8,5.5,fr);B.box(4,2,6,0,31,0,dk);
    B.box(8,7,7,-17,5.5,0,'#55595c');B.cyl(1.6,1.6,10,10,-17,8,0,dk,Math.PI/2);B.box(7,5,6,-27,4.4,0,'#6c7074');B.cyl(1,1,8,8,-23,5,3,dk,0,0,Math.PI/2);
    B.cyl(1.4,1.4,6,8,20,5,0,'#6d6f6c');B.box(5,2,2,20,6,0,'#9b3a2c');B.cyl(.6,.6,14,6,26,3.4,0,'#55595c',0,0,Math.PI/2);
    B.cyl(6,6,13,16,8,8.9,17,'#9a968a');B.cyl(6.3,6.3,1,16,8,15.6,17,'#6d6a62');B.cyl(.5,.5,22,6,-6,3,17,'#55595c',0,0,Math.PI/2);
    const base=mesh(B.geo());grp.add(base);
    const crank=new THREE.Group();crank.position.set(-17,8,0);const C=Bld();for(const z of [-5.4,5.4]){C.box(14,3,1.2,0,0,z,'#8c2e22');C.cyl(4,4,1.6,14,6,0,z,'#7a2a20',Math.PI/2);}const cm=mesh(C.geo());crank.add(cm);grp.add(crank);
    const A=Bld();A.box(40,3,3,2,0,0,'#c9a227');A.box(4,12,3.6,22.5,-3.5,0,'#c9a227',0,0,-.12);A.cyl(6,6,3.6,14,21,-1,0,'#c9a227',Math.PI/2);A.box(5,4,4,-18,-2.5,0,'#3e4246');A.box(1,22,1,-18,-14,-4.4,dk);A.box(1,22,1,-18,-14,4.4,dk);
    A.cyl(.35,.35,26,5,25.5,-14,0,'#9aa0a3');const arm=mesh(A.geo());arm.position.set(0,32,0);grp.add(arm);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(10,6),new THREE.MeshBasicMaterial({color:0x888888,side:THREE.DoubleSide}));flag.position.set(-26,22,-9);grp.add(flag);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,24,6),MAT.std);pole.position.set(-31,12,-9);grp.add(pole);
    grp.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;}});
    grp.position.set(o.x,groundH(o.x,o.y),o.y);grp.rotation.y=(o.x*.01)%6;WORLD.add(grp);return{grp,arm,flag,crank};});
  // supply depots
  G.fieldObj=G.fields.map((f,fi)=>{const grp=new THREE.Group();grp.position.set(f.x,groundH(f.x,f.y),f.y);WORLD.add(grp);const items=[];const R=mulberry(fi*13+5);
    const pad=Bld();pad.box(f.r*2.1,1,f.r*1.7,0,.5,0,'#7e7462');const pm=mesh(pad.geo());pm.receiveShadow=true;grp.add(pm);
    if(MODELS.ready){for(let gx=-2;gx<=2;gx++)for(let gz=-1;gz<=1;gz++){if(R()<.15)continue;const x=gx*17+R()*3,z=gz*20+R()*3,st=new THREE.Group();st.position.set(x,1,z);st.rotation.y=(R()-.5)*.4;grp.add(st);
        propObj('pallet',0,0,0,st);const hgt=1+(R()*3|0);for(let k=0;k<hgt;k++){const m=propObj(R()<.2?'barrel':'crate',(R()-.5)*1.5,0,R()*.3,st);if(m)m.position.y=1.6+k*8;}items.push(st);}
      propObj('container',-f.r-6,0,Math.PI/2,grp);propObj('containerG',f.r+8,6,Math.PI/2+.05,grp);propObj('sandbag',0,f.r*.9+6,0,grp);}
    return{grp,items,n:items.length};});
  // fog of war overlay
  {const fk=Math.min(1.4,Math.max(1,WK*.65));FOGC=document.createElement('canvas');FOGC.width=Math.round(480*fk);FOGC.height=Math.round(330*fk);FOGC.b=document.createElement('canvas');FOGC.b.width=FOGC.width;FOGC.b.height=FOGC.height;}FOGT=new THREE.CanvasTexture(FOGC);FOGT.magFilter=THREE.LinearFilter;
  FOGM=new THREE.Mesh(new THREE.PlaneGeometry(MAPW,MAPH).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x060a0f,transparent:true,alphaMap:FOGT,depthWrite:false}));FOGM.position.set(MAPW/2,46,MAPH/2);FOGM.renderOrder=2;WORLD.add(FOGM);
  buildDecals();for(const [x,y,r] of (G.craters||[]))scorch(x,y,r);applyWeather(typeof setup!=='undefined'?(setup.w|0):0);
}

/* ---------- procedural model builder (merged, vertex-coloured) ---------- */
const MAT={std:null,glow:null,glass:null,char:null};
function mats(){if(MAT.std)return;MAT.std=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.18});if(typeof weather==='function')weather(MAT.std,.8);MAT.char=new THREE.MeshStandardMaterial({color:lin('#26231f'),roughness:1});
  MAT.glow=new THREE.MeshBasicMaterial({color:lin('#ffcf7a')});MAT.ghostOk=new THREE.MeshBasicMaterial({color:0x74d08f,transparent:true,opacity:.42,depthWrite:false});MAT.ghostBad=new THREE.MeshBasicMaterial({color:0xea5a40,transparent:true,opacity:.42,depthWrite:false});MAT.ghostDz=new THREE.MeshBasicMaterial({color:0xe3b341,transparent:true,opacity:.42,depthWrite:false});}
function Bld(){const parts=[];const E=new THREE.Euler();const add=(g,x,y,z,c,rx=0,ry=0,rz=0)=>{TMPM.compose(TMP.set(x,y,z),TMPQ.setFromEuler(E.set(rx,ry,rz)),new THREE.Vector3(1,1,1));parts.push({g,m:TMPM.clone(),c:typeof c==='string'?lin(c):c});return api;};
  const api={box:(w,h,d,x,y,z,c,rx,ry,rz)=>add(new THREE.BoxGeometry(w,h,d),x,y,z,c,rx,ry,rz),cyl:(rt,rb,h,seg,x,y,z,c,rx,ry,rz)=>add(new THREE.CylinderGeometry(rt,rb,h,seg),x,y,z,c,rx,ry,rz),
    cone:(r,h,seg,x,y,z,c,rx,ry,rz)=>add(new THREE.ConeGeometry(r,h,seg),x,y,z,c,rx,ry,rz),sph:(r,x,y,z,c,sx=1,sy=1,sz=1)=>{const g=new THREE.SphereGeometry(r,10,8);g.scale(sx,sy,sz);return add(g,x,y,z,c);},
    tor:(r,t,x,y,z,c,rx=Math.PI/2,ry=0)=>add(new THREE.TorusGeometry(r,t,6,16),x,y,z,c,rx,ry),half:(r,len,x,y,z,c,ry=0)=>add(new THREE.CylinderGeometry(r,r,len,14,1,false,0,Math.PI),x,y,z,c,0,ry,Math.PI/2),
    geo:()=>merge(parts),_p:parts};return api;}
function parts_add(B,g,x,y,z,c){B._p.push({g,m:new THREE.Matrix4().makeTranslation(x,y,z),c});}
function merge(parts){let n=0;const L=[];for(const p of parts){const g=(p.g.index?p.g.toNonIndexed():p.g);g.applyMatrix4(p.m);L.push([g,p.c]);n+=g.attributes.position.count;}
  const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;for(const [g,c] of L){const cnt=g.attributes.position.count;P.set(g.attributes.position.array,o*3);N.set(g.attributes.normal.array,o*3);for(let i=0;i<cnt;i++){C[(o+i)*3]=c.r;C[(o+i)*3+1]=c.g;C[(o+i)*3+2]=c.b;}o+=cnt;}
  let y0=1e9,y1=-1e9;for(let i=1;i<P.length;i+=3){y0=Math.min(y0,P[i]);y1=Math.max(y1,P[i]);}const hh=Math.max(1,y1-y0);for(let i=0;i<n;i++){const k=Math.min(1,(P[i*3+1]-y0)/(hh*.55));const ao=.5+.5*k*k*(3-2*k);const up=Math.max(0,N[i*3+1]);const f=ao*(.92+.08*up);C[i*3]*=f;C[i*3+1]*=f;C[i*3+2]*=f;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));g.computeBoundingSphere();return g;}
const GEO={};
function camo(team){const c=new THREE.Color(team.color);return '#'+c.lerp(new THREE.Color('#5f5f4a'),.66).getHexString();}
const GEO_ALIAS={lander:'boat',airlift:'heli',mortar:'inf',recon:'inf',officer:'hero',medic:'inf',commissar:'hero',sapper:'inf',guer:'inf',atk:'at',idome:'aa',ew:'aa',cbr:'aa',jeep:'aa',raidlead:'aa'};
function geoFor(kind,fac,team,part){if(GEO_ALIAS[kind])kind=GEO_ALIAS[kind];const key=kind+fac+team.color+part;if(GEO[key])return GEO[key];const tc=team.color,hc=camo(team),dk='#2b2d26',mt='#55574e',cn='#9a988c',cl='#7d7c70';const B=Bld();let s=FACTIONS[fac].units[kind]||{};
  switch(kind+':'+part){
    case 'inf:body':case 'at:body':case 'hacker:body':case 'hero:body':{const n={inf:3,at:2,hacker:2,hero:1}[kind];const pos=[[3,0],[-4,-5],[-4,5]].slice(0,n);if(n===2){pos[0]=[2,-3.5];pos[1]=[-3,3.5];}if(n===1)pos[0]=[0,0];
      for(const [px,pz] of pos){const uni=kind==='hero'?'#2c3027':'#5d6146';const kneel=kind==='hacker';B.box(2.6,kneel?3:5,3.2,px,kneel?1.5:2.5,pz,uni);B.box(3,4.2,3.6,px,kneel?4.6:6.6,pz,tc);B.sph(1.6,px,kneel?7.6:9.8,pz,'#c7a27c');B.sph(1.85,px,kneel?8.2:10.4,pz,kind==='hero'?'#1e211b':'#4a4e36',1,.65,1);
        if(kind==='at'&&px>0)B.cyl(.9,.9,11,6,px+1,9.4,pz-1.6,'#3d4230',0,0,Math.PI/2);else if(kind==='hacker')B.box(5,.5,4,px+4,1,pz,'#202226');else B.box(7,.9,.9,px+3.5,6.6,pz+1.2,dk);}
      if(kind==='hacker'){B.box(4.6,3,.3,6,2.8,-3.5,'#202226',-.35);B.box(4.6,3,.3,4,2.8,3.5,'#202226',-.35);}break;}
    case 'tank:hull':B.box(30,5,7,0,3.5,-8,dk);B.box(30,5,7,0,3.5,8,dk);for(let i=-12;i<=12;i+=6){B.cyl(2.6,2.6,4,8,i,2.6,-10.6,'#3a3c34',Math.PI/2);B.cyl(2.6,2.6,4,8,i,2.6,10.6,'#3a3c34',Math.PI/2);}
      B.box(29,5,16,0,7.5,0,hc);B.box(8,3,15,13,6.5,0,hc,0,0,-.5);B.box(26,.6,2,0,10.2,-7,tc);B.box(26,.6,2,0,10.2,7,tc);B.box(4,2,4,-12,10.5,-4,mt);break;
    case 'tank:turret':B.box(15,6,13,-1,3,0,hc);B.box(6,5,12,7,2.6,0,hc,0,0,.25);B.cyl(1.3,1.5,20,8,15,3.3,0,mt,0,0,Math.PI/2);B.cyl(2,2,3,8,25,3.3,0,dk,0,0,Math.PI/2);B.cyl(2.2,2.2,1.5,10,-4,6.8,3,mt);B.box(10,.6,13.2,-2,6.1,0,tc);break;
    case 'arty:hull':if(s.rocket){for(const x of [-10,-1,9])for(const z of [-8,8])B.cyl(3,3,3,10,x,3,z,'#26271f',Math.PI/2);B.box(26,4,15,0,6,0,dk);B.box(9,9,15,10,10,0,hc);B.box(.5,4,12,14.6,12,0,'#7fa7b5');B.box(18,.6,2,-4,8.2,-7,tc);}
      else{B.box(32,5,6,0,3.5,-7.5,dk);B.box(32,5,6,0,3.5,7.5,dk);B.box(30,5,15,0,7.5,0,hc);B.box(28,.6,2,0,10.2,-6.6,tc);}break;
    case 'arty:turret':if(s.rocket){B.box(17,7,13,-4,4.5,0,'#3d4033',0,0,.32);for(let i=0;i<3;i++)for(let j=0;j<4;j++)B.cyl(1.1,1.1,1,6,4.2,6.6+i*2.2,-4.5+j*3,'#141510',0,0,Math.PI/2+.32);}
      else{B.box(16,9,14,-6,4.5,0,hc);B.box(8,.6,14.2,-6,9.1,0,tc);B.cyl(1.3,1.6,28,8,14,7,0,mt,0,0,Math.PI/2-.2);B.cyl(2,2,3,8,27,9.8,0,dk,0,0,Math.PI/2-.2);}break;
    case 'aa:hull':B.box(28,5,6,0,3.5,-7.5,dk);B.box(28,5,6,0,3.5,7.5,dk);B.box(27,5,15,0,7.5,0,hc);B.box(24,.6,2,0,10.2,-6.6,tc);break;
    case 'aa:turret':B.box(12,7,11,0,3.5,0,hc);B.cyl(.8,.8,16,6,8,7,-4,mt,0,0,Math.PI/2-.6);B.cyl(.8,.8,16,6,8,7,4,mt,0,0,Math.PI/2-.6);B.cyl(4,4,.6,12,-4,10,0,cn,.3);B.box(1,4,1,-4,8,0,dk);break;
    case 'harv:hull':for(const x of [-10,-2,9])for(const z of [-8,8])B.cyl(3,3,3,10,x,3,z,'#202119',Math.PI/2);B.box(24,4,15,-2,6,0,dk);B.box(17,7,15,-5,11,0,'#6c6a5c');B.box(8,9,15,11,10.5,0,hc);B.box(.5,4,12,15.2,12,0,'#7fa7b5');B.box(8,.6,15.2,11,15.2,0,tc);break;
    case 'harv:cargo':for(const [x,z] of [[-9,-4],[-2,-4],[-9,3],[-2,3]])B.box(6,5,6,x,17,z,'#c99a2e');break;
    case 'drone:body':B.cone(11,24,3,0,0,0,'#c4bea9',0,0,-Math.PI/2);B.box(3,2.5,3,-10,0,0,'#7a7566');B.cone(2.5,6,3,-8,0,-8,tc,0,0,-Math.PI/2);B.cone(2.5,6,3,-8,0,8,tc,0,0,-Math.PI/2);break;
    case 'heli:body':B.sph(7,4,0,0,hc,1.5,.8,.8);B.cyl(1.6,3,22,8,-14,1,0,hc,0,0,Math.PI/2);B.box(5,7,1.2,-24,4,0,hc);B.box(6,1,9,-22,4,0,hc);B.sph(3.8,10,1.5,0,'#6f8fa0',1.2,.75,.8);
      B.box(14,.8,1,2,-6,-5,dk);B.box(14,.8,1,2,-6,5,dk);B.box(1,5,1,6,-4,-5,dk);B.box(1,5,1,-2,-4,-5,dk);B.box(1,5,1,6,-4,5,dk);B.box(1,5,1,-2,-4,5,dk);
      B.box(4,1,20,0,-1,0,mt);B.cyl(1.4,1.4,7,6,1,-2.5,-9,dk,0,0,Math.PI/2);B.cyl(1.4,1.4,7,6,1,-2.5,9,dk,0,0,Math.PI/2);B.box(18,.7,2.2,-6,5.3,0,tc);B.cyl(1.2,1.2,5,6,1,6,0,dk);break;
    case 'heli:rotor':B.box(48,.5,2.4,0,0,0,'#1d1e1a');B.box(2.4,.5,48,0,0,0,'#1d1e1a');B.cyl(2,2,1.5,8,0,0,0,mt);break;
    case 'jet:body':B.cyl(2.2,3.4,30,10,0,0,0,'#8e9399',0,0,Math.PI/2);B.cone(2.2,9,10,19.5,0,0,'#8e9399',0,0,-Math.PI/2);B.sph(2.4,8,2.2,0,'#3b4f5c',1.8,.7,.8);
      B.cone(16,22,3,-3,0,0,'#7f858c',0,0,-Math.PI/2);B.box(6,6,.8,-13,4,-4,'#7f858c',.3);B.box(6,6,.8,-13,4,4,'#7f858c',-.3);B.box(9,.4,3,-12,.5,-6,tc);B.box(9,.4,3,-12,.5,6,tc);B.box(16,.5,1.2,0,3.2,0,tc);break;
    case 'jet:glow':B.cyl(2.6,2.6,1,10,-15.5,0,0,'#ffb35a',0,0,Math.PI/2);break;
    case 'boat:hull':B.box(26,5,11,-2,2,0,hc);B.cone(5.5,10,4,15,2,0,hc,0,Math.PI/4,-Math.PI/2);B.box(10,6,8,-3,7,0,cn);B.box(4,1,7,1,10.2,0,'#3b4f5c');B.box(26,.8,11.4,-2,4.5,0,tc);B.cyl(.5,.5,10,5,-5,14,0,dk);break;
    case 'boat:turret':B.cyl(2.4,2.8,3,8,0,1.5,0,mt);B.cyl(.6,.6,9,6,4.5,2.6,0,dk,0,0,Math.PI/2);break;
    case 'ship:hull':B.box(70,8,17,-4,1,0,'#7d8186');B.cone(8.5,16,4,39,1,0,'#7d8186',0,Math.PI/4,-Math.PI/2);B.box(70,1,17.4,-4,5,0,tc);
      B.box(20,10,12,-8,10,0,'#9aa0a5');B.box(10,9,10,-8,19,0,'#9aa0a5');B.box(9,2,10.4,-8,15,0,'#2e3c45');B.cyl(.8,1,18,6,-8,30,0,dk);B.box(8,.6,.6,-8,36,0,dk);B.box(6,3,10,-26,7,0,'#8b9095');B.cyl(2.6,2.6,7,10,-34,8,0,'#5d6166');
      B.box(8,2,8,22,6,0,'#5f6469');break;
    case 'ship:turret':B.box(9,4.5,8,0,2.2,0,'#8b9095');B.box(4,4.5,8,4,2,0,'#8b9095',0,0,.4);B.cyl(1,1.2,14,8,10,2.8,0,mt,0,0,Math.PI/2);break;
    // structures
    case 'hq:main':{B.box(84,6,84,0,3,0,cl);B.box(76,26,76,0,19,0,cn);B.box(76,2,76,0,33,0,'#83827a');B.box(78,3,78,0,30,0,tc);
      for(let i=-30;i<=30;i+=10){B.box(6,6,.6,i,20,38.3,'#2c3d48');B.box(6,6,.6,i,20,-38.3,'#2c3d48');B.box(.6,6,6,38.3,20,i,'#2c3d48');B.box(.6,6,6,-38.3,20,i,'#2c3d48');}
      B.box(34,14,34,14,40,14,cl);B.box(34,1.2,34,14,47.6,14,tc);B.cyl(15,15,1,24,-16,34.6,-16,'#55574f');B.cyl(11,11,1.1,24,-16,34.7,-16,'#d8d4c4');B.cyl(10,10,1.2,24,-16,34.8,-16,'#55574f');
      B.box(2,.4,10,-19,35.6,-16,'#e2ddca');B.box(2,.4,10,-13,35.6,-16,'#e2ddca');B.box(6,.4,2,-16,35.6,-16,'#e2ddca');B.cyl(.6,.6,30,6,28,62,28,dk);B.box(16,8,6,0,4,42,'#4c4e47');B.box(18,2,8,0,9,43,tc);break;}
    case 'hq:dish':B.cyl(.8,.8,6,6,0,3,0,dk);B.cyl(9,3,2,16,0,7,0,'#c9c6ba',.5);break;
    case 'barracks:main':B.box(64,3,64,0,1.5,0,cl);B.half(22,58,0,3,0,'#7e7b60');for(let x=-27;x<=27;x+=9)B.tor(22.2,.5,x,3,0,'#5e5c48',0,Math.PI/2);B.box(4,10,1,0,8,-22.5,'#2e2f28');B.box(58,1.2,4,0,25,0,tc);
      B.box(1,26,1,26,16,26,dk);B.box(10,6,.4,31,26,26,tc);for(let i=-20;i<=20;i+=5)B.box(4.5,3,3,i,4.5,29,'#968660');break;
    case 'factory:main':B.box(80,4,80,0,2,0,cl);B.box(72,24,62,0,16,-4,'#868478');for(let z=-30;z<=22;z+=13)B.box(72,9,2,0,30,z,'#6f9fb0',.9);for(let z=-26;z<=26;z+=13)B.box(72,8,7,0,30,z-3,'#77756a',-.6);
      B.box(34,20,1,0,13,27.6,'#2a2a26');for(let i=0;i<5;i++)B.box(34,1,1.2,0,5+i*4,28.2,i%2?'#d9a826':'#1c1a14');B.box(72,2,2,0,27.5,27,tc);B.cyl(4,5,40,10,28,24,-26,'#4a4a45');B.cyl(4.4,4.4,2,10,28,44,-26,tc);break;
    case 'airfield:main':B.box(96,2,96,0,1,0,'#8a8a82');B.box(90,.4,22,0,2.2,30,'#5a5b55');for(let x=-38;x<=38;x+=12)B.box(6,.3,1.4,x,2.5,30,'#e6e2d2');
      for(const [x,z] of [[-26,-22],[26,-22],[-26,22],[26,22]])B.box(26,.3,20,x,2.3,z-10,'#6e6f68');B.half(16,30,-30,2,-34,'#7a7c74',Math.PI/2);B.cyl(4,5,26,8,38,15,-38,cn);B.box(12,6,12,38,31,-38,'#3d5562');B.box(13,1.2,13,38,34.6,-38,tc);B.box(96,.5,3,0,2.6,-47,tc);break;
    case 'shipyard:main':B.box(70,5,70,0,2.5,0,cl);B.box(30,16,34,-14,13,-14,'#7d7b70');B.box(31,1.5,35,-14,21.5,-14,tc);for(let i=0;i<6;i++)B.cyl(1.6,1.6,10,6,-30+i*12,1,33,'#3c3a33');B.box(70,1.5,4,0,5.5,33,'#d9a826');break;
    case 'shipyard:crane':B.box(4,44,4,0,22,0,'#d9a826');B.box(46,3,3,12,44,0,'#d9a826');B.box(8,6,6,-8,42,0,'#4a4a45');B.cyl(.3,.3,20,4,32,34,0,dk);break;
    case 'garrison:main':{B.box(.8,0.1,.8,0,0,0,'#222');break;}
    case 'econ:main':{B.box(58,3,58,0,1.5,0,cl);B.box(40,22,30,-4,14,-6,'#c9c2b0');B.box(42,2,32,-4,26,-6,'#7d786c');for(let i=-3;i<=3;i++)B.box(3.4,14,1,-4+i*5.4,12,9.6,'#3d4a52');
      B.box(40,3,1.2,-4,21,9.8,tc);B.cyl(7,8,6,10,-4,29,-6,'#b7ad92');B.sph(6.5,-4,33,-6,'#c9a54a');B.box(1,14,1,14,33,-14,'#5a5c52');B.box(9,5,.6,14,38,-14,tc);
      for(const [x,z] of [[20,14],[24,14],[20,19]])B.box(3.5,3.5,3.5,x,4.8,z,'#5d7a3e');B.box(6,1.2,10,-22,3.6,16,'#3a3b34');break;}
    case 'depot:main':{B.box(56,3,56,0,1.5,0,cl);B.box(30,16,24,-8,9,-8,cn);B.box(32,2,26,-8,18,-8,'#6f6e66');B.box(30,2.5,1,-8,13,4.6,tc);
      B.box(14,9,1.2,-8,7,4.3,'#26261f');for(const [x,z] of [[14,-14],[20,-14],[14,-8],[20,-8],[17,-11]])B.box(5,5,5,x,5.5,z,'#c99a2e');B.box(5,5,5,17,10.5,-11,'#b2862a');
      B.box(2,22,2,16,11,12,'#5a5c52');B.box(2,22,2,-20,11,12,'#5a5c52');B.box(38,2,2,-2,22,12,'#5a5c52');B.box(4,6,4,4,17,12,'#3a3b34');
      for(let x=-22;x<=22;x+=11)B.box(6,.4,1.2,x,3.2,20,'#e8e3cf');break;}
    case 'tunnel:main':B.cyl(17,22,7,12,0,3.5,0,'#8a7656');B.cyl(10,15,4,10,0,9,0,'#7a6849');B.box(13,10,9,0,5,15,'#1c1814');B.box(15,2,10,0,10.5,15,'#5d5a50');for(let i=0;i<9;i++){const a=i/9*6.28;B.box(6,3,3.5,Math.cos(a)*21,1.5,Math.sin(a)*21,'#a08d68',0,-a,0);}break;
    case 'tunnel:gun':B.cyl(2.4,2.8,3,8,0,8,0,'#3b3d36');B.box(12,1.6,1.6,6,9.5,0,'#2c2e29');break;
    case 'turret:main':B.tor(15,4.2,0,3.5,0,'#968660');B.cyl(10,12,7,12,0,3.5,0,'#6d6c62');break;
    case 'turret:gun':B.cyl(8,9,6,12,0,3,0,tc);B.box(8,5,10,2,4,0,hc);B.cyl(1.1,1.1,20,6,13,4,-2.5,dk,0,0,Math.PI/2);B.cyl(1.1,1.1,20,6,13,4,2.5,dk,0,0,Math.PI/2);break;
    case 'sam:main':B.cyl(14,16,4,12,0,2,0,'#6d6c62');B.box(26,1,26,0,4.5,0,'#55574e');break;
    case 'sam:gun':B.cyl(3,3,6,8,0,3,0,dk);B.box(12,9,12,0,9,0,hc,0,0,.6);for(const [y,z] of [[-2.5,-2.8],[-2.5,2.8],[2.5,-2.8],[2.5,2.8]])B.cyl(1.6,1.6,1,8,5.4,9+y,z,'#e2ddca',0,0,Math.PI/2+.6);B.box(12.2,1,1,0,13.5,0,tc,0,0,.6);break;
    case 'uplink:main':{const st=(UPLINK[fac]||[])[1]||'silo';
      if(st==='vls'){B.box(74,4,74,0,2,0,cl);B.box(60,16,60,0,12,0,'#7a7d76');B.box(36,2,36,0,20.5,0,'#1d1e1b');for(let i=-1;i<=1;i+=2)for(let j=0;j<4;j++){B.box(8,1.4,8,i*24,20.6,-21+j*14,'#5e615a');B.box(6,.6,6,i*24,21.5,-21+j*14,'#3a3c37');}
        B.box(62,1.6,2,0,20.6,30,tc);B.box(62,1.6,2,0,20.6,-30,tc);B.cyl(1,1.4,30,6,26,35,26,dk);B.box(10,6,1,26,50,26,'#c9ccc4',0,.6,0);B.box(12,8,10,-24,8,30,'#6c6f68');break;}
      if(st==='tel'){B.box(76,3,76,0,1.5,0,cl);B.box(38,8,38,0,7,0,'#73756c');B.box(36,2,36,0,11.5,0,'#1d1e1b');
        for(const sx of [-1,1]){const x=sx*28;B.box(10,6,30,x,6,0,'#4f5a3c');B.box(9,5,8,x,9,-13,'#55603f');for(const z of [-10,-2,6,12])B.cyl(2,2,1.6,8,x+(sx*5.5),2.5,z,'#1d1d1b',0,0,Math.PI/2);
          B.cyl(2.6,2.6,26,10,x,19,4,'#d6d2c4',.9,0,0);B.cone(2.6,6,10,x,19+Math.cos(.9)*15,4-Math.sin(.9)*15,'#c4392c',.9,0,0);B.box(1.2,14,1.2,x,13,10,'#3c3e38',.6,0,0);}
        B.box(14,10,12,0,6,30,'#6c6f68');B.box(15,1,13,0,11.5,30,tc);break;}
      if(st==='city'){B.box(80,3,80,0,1.5,0,'#8d7d63');{const g=new THREE.CylinderGeometry(30,34,70,16,1,false,0,Math.PI);g.rotateZ(Math.PI/2);g.rotateY(Math.PI/2);B._p.push({g,m:new THREE.Matrix4().makeTranslation(0,0,0),c:lin(fac==='RS'?'#7a6b58':'#9b8463')});}
        B.box(36,2,36,0,30.5,0,'#1d1e1b');B.box(18,20,4,0,10,36,'#2a2724');B.box(22,3,5,0,21,36,'#5c554a');B.box(24,2.4,5,0,24,36,tc);for(const sx of [-1,1])B.box(3,22,5,sx*11,11,36,'#4d4840');B.box(6,1,40,0,.6,54,'#5a5348');break;}
      if(st==='air'){B.box(80,3,80,0,1.5,0,cl);{const g=new THREE.CylinderGeometry(22,22,56,16,1,false,0,Math.PI);g.rotateZ(Math.PI/2);B._p.push({g,m:new THREE.Matrix4().makeTranslation(0,3,0),c:lin('#7c7f78')});}
        B.box(36,2,36,0,25.5,0,'#1d1e1b');B.box(40,18,2,0,12,-28,'#3e403b');B.box(10,26,10,30,16,28,'#8a8c84');B.box(14,6,14,30,32,28,'#4a5a66');B.box(80,.4,6,0,3.3,40,'#e8e3cf');B.box(2,.5,28,-30,3.3,26,'#e8e3cf');break;}
      if(st==='rock'){B.box(72,3,72,0,1.5,0,'#8d7d63');for(let i=0;i<10;i++){const a=i/10*6.283;B.box(10,5,6,Math.cos(a)*32,4,Math.sin(a)*32,'#9b8a66',0,-a,0);}B.box(36,2,36,0,4,0,'#1d1e1b');
        for(const sx of [-1,1])for(let r=0;r<2;r++){const x=sx*22,z=-16+r*30;B.box(10,3,14,x,5,z,'#4f4a3c');for(let q=0;q<4;q++)B.cyl(.9,.9,16,6,x-3+q*2,11,z,'#3a3832',.7,0,0);}B.box(14,9,12,0,6,30,'#6c6355');break;}
      B.box(74,6,74,0,3,0,cl);B.box(66,20,66,0,16,0,'#76786f');B.box(36,2,36,0,26.5,0,'#1d1e1b');B.box(68,2,4,0,25.2,32,tc);B.box(68,2,4,0,25.2,-32,tc);B.box(4,2,68,32,25.2,0,tc);B.box(4,2,68,-32,25.2,0,tc);B.cyl(.8,.8,34,6,28,40,28,dk);B.cyl(.8,.8,34,6,-28,40,28,dk);break;}
    case 'uplink:door':B.box(18,2,36,0,0,0,'#8e9088');B.box(2,2.2,36,8,0,0,'#d9a826');break;
    case 'uplink:missile':B.cyl(4,4,24,10,0,12,0,'#d8d4c6');B.cone(4,9,10,0,28,0,'#c4392c');break;
    case 'plane:body':B.cyl(5,6,60,10,0,0,0,'#7c8086',0,0,Math.PI/2);B.cone(5,10,10,35,0,0,'#7c8086',0,0,-Math.PI/2);B.box(18,1.2,80,-2,2,0,'#6f7378');B.box(10,10,1.2,-27,6,0,'#6f7378');B.box(10,1,26,-27,2,0,'#6f7378');B.box(20,.6,1.4,-2,2.8,-30,tc);B.box(20,.6,1.4,-2,2.8,30,tc);break;
    default:B.box(10,10,10,0,5,0,'#ff00ff');
  }
  return GEO[key]=B.geo();}
function mesh(g){const m=new THREE.Mesh(g,MAT.std);m.castShadow=true;m.receiveShadow=true;return m;}
function makeObj(e){mats();if(e.kind==='cleric')return clericModel(e);if(!e.isB){const mo=modelFor(e);if(mo)return mo;}const T=G.teams[e.team],f=T.fac,k=e.kind,o=new THREE.Group();o.userData.parts={};const P=o.userData.parts;
  const add=(part,parent=o)=>{const m=mesh(geoFor(k,f,T,part));parent.add(m);P[part]=m;return m;};
  if(e.isB){const eS=k==='garrison'?e:Object.assign(Object.create(e),{size:e.size/BSC});const mb=(k==='airfield'||k==='uplink')?false:bldModel(eS,o,T);if(mb){}else if(k==='hq'){add('main');const d=add('dish');d.position.set(14,48,14);}else if(k==='turret'||k==='sam'||k==='tunnel'){add('main');const g=add('gun');g.position.y=k==='tunnel'?4:6;}
    else if(k==='shipyard'){add('main');const c=add('crane');c.position.set(22,5,22);}else if(k==='uplink'){add('main');const m=add('missile');m.position.y=4;const a=mesh(geoFor(k,f,T,'door')),b=mesh(geoFor(k,f,T,'door'));const HY={vls:21.6,tel:12.6,city:31.6,air:26.6,rock:5}[(UPLINK[f]||[])[1]]||27.5;a.position.set(-9,HY,0);b.position.set(9,HY,0);b.rotation.y=Math.PI;o.add(a);o.add(b);P.da=a;P.db=b;P.hy=HY-27.5;}
    else add('main');
    if(!mb&&(k==='airfield'||k==='uplink'))bldModel(eS,o,T);
    if(k==='garrison'){const c=civAtXYAny(e.x,e.y),h=c?c.h:14;const fg=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,16,6),new THREE.MeshStandardMaterial({color:0x8a8a84}));pole.position.y=8;fg.add(pole);const fl=new THREE.Mesh(new THREE.PlaneGeometry(10,6),new THREE.MeshStandardMaterial({color:new THREE.Color(T.color),side:THREE.DoubleSide,emissive:new THREE.Color(T.color),emissiveIntensity:.25}));fl.position.set(5,13,0);fl.userData.base=Float32Array.from(fl.geometry.attributes.position.array);fg.add(fl);fg.position.y=h;o.add(fg);P.flag=fl;}
    decorateBld(eS,o);
    const sw=eS.size+6,sh=BH[k]/BSC+6,nseg=Math.max(2,Math.round(sw/14)),sc=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(sw,sh,sw,nseg,Math.max(2,Math.round(sh/9)),nseg)),new THREE.LineBasicMaterial({color:0x8f8b80,transparent:true,opacity:.85}));sc.position.y=sh/2;o.add(sc);P.scaf=sc;}
  else{const c=e.s.cls;o.scale.setScalar(c==='ship'?1.15:['inf','at','hacker','hero'].includes(c)?1.7:1.3);
    if(['inf','at','hacker','hero'].includes(c))add('body');
    else if(c==='tank'||c==='arty'||c==='aa'){add('hull');const t=add('turret');t.position.set(c==='arty'&&!e.s.rocket?-4:0,10,0);}
    else if(c==='harv'){add('hull');add('cargo');}
    else if(c==='dozer'){const h=new THREE.Mesh(geoFor('harv',f,T,'hull'),MAT.std);h.castShadow=true;o.add(h);P.hull=h;const B=Bld();B.box(2.4,6.5,20,15,3.2,0,'#d9a21f');B.box(20,2,2,-2,20,0,'#d9a21f');const cm=new THREE.Mesh(B.geo(),MAT.std);o.add(cm);}
    else if(c==='drone')add('body');
    else if(c==='heli'){add('body');const r=add('rotor');r.position.set(1,8.6,0);r.castShadow=false;}
    else if(c==='jet'){add('body');const g=new THREE.Mesh(geoFor(k,f,T,'glow'),MAT.glow);o.add(g);P.glow=g;}
    else if(c==='boat'){add('hull');const t=add('turret');t.position.set(9,5,0);}
    else if(c==='ship'){add('hull');const t=add('turret');t.position.set(24,7,0);}}
  SCN.add(o);return o;}
function makeGhost(kind){mats();const T=G.teams[ME],o=new THREE.Group();const g=geoFor(kind,T.fac,T,'main');o.add(new THREE.Mesh(g,MAT.ghostOk));if(kind==='turret'||kind==='sam'){const m=new THREE.Mesh(geoFor(kind,T.fac,T,'gun'),MAT.ghostOk);m.position.y=6;o.add(m);}
  const ring=new THREE.Mesh(new THREE.RingGeometry(1,1.02,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x74d08f,transparent:true,opacity:.6}));o.add(ring);o.userData.ring=ring;SCN.add(o);return o;}

const WX=[{sun:'#ffeccc',si:2.7,off:[-900,860,-620],sky:'#a9c4ec',gnd:'#9c8058',hi:1.2,fog:'#c4ae86',expo:.9,cl:.6,sr:2},
  {sun:'#ffc283',si:3.0,off:[-1150,470,-520],sky:'#9fb2d4',gnd:'#7a5a3c',hi:1.12,fog:'#c09a72',expo:1.04,cl:.7,sr:2},
  {sun:'#e4e9ef',si:1.15,off:[-450,1150,-300],sky:'#b7bfc8',gnd:'#625d51',hi:1.6,fog:'#a2a7a9',expo:.98,cl:0,sr:6}];
function applyWeather(i){const w=WX[i]||WX[0];if(!SUN)return;SUN.color.copy(lin(w.sun));SUN.intensity=w.si;SUNOFF=w.off;HEMI.color.copy(lin(w.sky));HEMI.groundColor.copy(lin(w.gnd));HEMI.intensity=w.hi;
  SCN.fog.color.copy(lin(w.fog));SUN.shadow.radius=w.sr;if(POST.mFinal)POST.mFinal.uniforms.expo.value=w.expo;POST.cloud=w.cl;
  if(WATER&&WATER.material.uniforms.sun)WATER.material.uniforms.sun.value.set(-w.off[0],w.off[1],-w.off[2]).normalize().multiply(new THREE.Vector3(-1,1,-1));}
const _applyW=applyWeather;applyWeather=function(i){_applyW(i);if(typeof G!=='undefined'&&G&&G.map&&G.map.theme==='snow'&&SUN){SUN.color.lerp(lin('#f4f7ff'),.6);HEMI.color.copy(lin('#c2d0e2'));HEMI.groundColor.copy(lin('#a3abb5'));SCN.fog.color.copy(lin(i==1?'#d9c9bd':'#cfd8e2'));HEMI.intensity*=1.08;}};

