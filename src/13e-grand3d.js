/* GRAND MAP 3D (stage 5, Abdullah 2026-11-06 08:04: "it needs to look like a Total War campaign map").
   Replaces the flat coloured-province board of 13c-grandui.js with a tilted 3D campaign map drawn by its own small Three.js
   renderer (same Three.js build as the battle; reuses flagTex() and nothing else heavy). Rules/state are untouched: this file only
   draws GC and feeds clicks back into the same gu* functions. Original art, modern-war theme.
   Data: coastlines/lakes/rivers = Natural Earth (public domain) baked into 13d-grandterrain.js by orch/grand3d-gen.mjs.
   Layers: relief + painted ground (biome blur, hillshade, snow) | overlay texture (soft owner tint + subtle borders, map modes) |
   sea shader (depth colour, ripples, foam, sea-zone lines) | instanced forests/palms/scrub | instanced settlements |
   army figures (one soldier + national flag per army, ship for armies at sea) | move arrows | DOM banners/plates/cards/minimap. */
const G3={keys:new Set(),F:null,R:null,sc:null,cam:null,cv:null,t0:0,raf:0,mode:'political',news:null,dirty:true,hit:[],mini:null,pos:new Map(),hot:new Map(),camera:{x:1200,z:600,d:1900,yaw:0,pitch:.86},cc:null};
const G3_MODES=[['political','Political'],['terrain','Terrain'],['trade','Trade & resources'],['supply','Supply'],['unrest','Unrest'],['culture','Culture / regions'],['alliances','Alliances & wars'],['development','Development']];
const G3_BIOME={d:[206,180,126],m:[126,116,102],f:[116,152,78],u:[150,146,130],j:[56,116,62],s:[214,222,230],c:[158,172,116],r:[122,158,96]};
function g3Hash(x,y){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
function g3Noise(x,y){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=g3Hash(xi,yi),b=g3Hash(xi+1,yi),c=g3Hash(xi,yi+1),d=g3Hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function g3Fbm(x,y,o){let s=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){s+=a*g3Noise(x*f+i*17.3,y*f+i*5.1);n+=a;f*=2;a*=.5;}return s/n;}
function g3Smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
function g3Blur(src,W,H,r,passes){let a=src,b=new Float32Array(W*H);const w=2*r+1;
  for(let p=0;p<passes;p++){for(let y=0;y<H;y++){let s=0;const o=y*W;for(let x=-r;x<=r;x++)s+=a[o+Math.max(0,Math.min(W-1,x))];for(let x=0;x<W;x++){b[o+x]=s/w;s+=a[o+Math.min(W-1,x+r+1)]-a[o+Math.max(0,x-r)];}}
    const c=new Float32Array(W*H);for(let x=0;x<W;x++){let s=0;for(let y=-r;y<=r;y++)s+=b[Math.max(0,Math.min(H-1,y))*W+x];for(let y=0;y<H;y++){c[y*W+x]=s/w;s+=b[Math.min(H-1,y+r+1)*W+x]-b[Math.max(0,y-r)*W+x];}}a=c;}
  return a;}
// ---- the heavy one-off fields (cached for the page): land mask, relief, biome colours, painted ground
// realmap: the province raster is 2400x1200 (13c picking); the 3D fields run at GT_W x GT_H, so take a downsampled copy that keeps land over sea and
// the smaller province in every block (Gaza, Bahrain, Lebanon's provinces stay visible)
function g3Idx(){const s=guCols();if(GU_RW===GT_W)return s;if(G3.idx2)return G3.idx2;const f=Math.round(GU_RW/GT_W),n=new Uint32Array(GM_P.length);for(let k=0;k<s.length;k++)n[s[k]]++;
  const o=new Uint16Array(GT_W*GT_H);for(let y=0;y<GT_H;y++)for(let x=0;x<GT_W;x++){let b=s[y*f*GU_RW+x*f];for(let dy=0;dy<f;dy++)for(let dx=0;dx<f;dx++){const v=s[(y*f+dy)*GU_RW+x*f+dx];const bs=b>=GM_LAND,vs=v>=GM_LAND;if((bs&&!vs)||(bs===vs&&n[v]<n[b]))b=v;}o[y*GT_W+x]=b;}
  return G3.idx2=o;}
function g3PArea(){if(G3.parea)return G3.parea;const s=guCols(),a=new Float32Array(GM_P.length);for(let k=0;k<s.length;k++)a[s[k]]++;for(let i=0;i<a.length;i++)a[i]=Math.max(1,a[i]);return G3.parea=a;}
function g3Fields(){if(G3.F)return G3.F;grMap();const W=GT_W,H=GT_H,idx=g3Idx(),P=GCM.P;
  const b=atob(GT_MASK),land=new Float32Array(W*H);{let p=0,i=0,v=0;while(i<b.length){let n=0,sh=0,c;do{c=b.charCodeAt(i++);n|=(c&127)<<sh;sh+=7;}while(c&128);if(v)land.fill(1,p,p+n);p+=n;v^=1;}}
  for(const q of P)if(q.land){const cx=Math.round(q.x/2),cy=Math.round(q.y/2);let any=false;for(let dy=-2;dy<=2&&!any;dy++)for(let dx=-2;dx<=2;dx++)if(land[(cy+dy)*W+cx+dx]){any=true;break;}
    if(!any)for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++)if(dx*dx+dy*dy<=30&&cx+dx>=0&&cx+dx<W&&cy+dy>=0&&cy+dy<H)land[(cy+dy)*W+cx+dx]=1;}   // every land province keeps at least a small island under its town
  const Ls=g3Blur(land,W,H,3,3),Lw=g3Blur(Ls,W,H,14,2);
  const mw0=new Float32Array(W*H),sn0=new Float32Array(W*H),cr=new Float32Array(W*H),cg=new Float32Array(W*H),cb=new Float32Array(W*H);
  for(let k=0;k<W*H;k++){const q=P[idx[k]],t=q.t;if(t==='m')mw0[k]=1;else if(t==='s')sn0[k]=1;const c=G3_BIOME[t]||G3_BIOME.d;cr[k]=c[0];cg[k]=c[1];cb[k]=c[2];}
  const mw=g3Blur(mw0,W,H,9,2),sw=g3Blur(sn0,W,H,8,2),R=g3Blur(cr,W,H,7,2),Gc=g3Blur(cg,W,H,7,2),B=g3Blur(cb,W,H,7,2);
  const Hh=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,ls=Ls[k],coast=g3Smooth(.4,.8,ls),n=g3Fbm(x*.02,y*.02,4);
    const rg=1-Math.abs(2*g3Fbm(x*.04+7,y*.04,4)-1);
    const landH=coast*(1.2+n*5.5)+mw[k]*coast*(6+rg*rg*58)+sw[k]*coast*n*6;
    const sea=-.8-9*Math.pow(1-Lw[k],2);Hh[k]=sea+(landH-sea)*g3Smooth(.42,.6,ls);}
  // painted ground (RGBA bytes): biome blur + noise + hillshade + snow/rock by height + beaches + rivers
  const px=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,h=Hh[k];
    const hl=Hh[y*W+Math.max(0,x-1)],hr=Hh[y*W+Math.min(W-1,x+1)],hu=Hh[Math.max(0,y-1)*W+x],hd=Hh[Math.min(H-1,y+1)*W+x];
    const sh=1;   // relief shading comes from the mesh normals + the detail shader (a baked hillshade was soft at close zoom)
    const n1=g3Fbm(x*.05,y*.05,3)-.5,n2=g3Noise(x*.4,y*.4)-.5;let r=R[k],g=Gc[k],bl=B[k];
    const v=1+n1*.34+n2*.1;r*=v;g*=v;bl*=v;
    if(sw[k]>.3){const s=g3Smooth(.3,.6,sw[k]);r+=(214-r)*s*.8;g+=(222-g)*s*.8;bl+=(230-bl)*s*.8;}
    if(h>26){const t=g3Smooth(26,44,h);r+=(112-r)*t;g+=(106-g)*t;bl+=(98-bl)*t;}     // bare rock
    if(h>46){const t=g3Smooth(46,60,h);r+=(236-r)*t;g+=(240-g)*t;bl+=(246-bl)*t;}   // snow caps
    const beach=g3Smooth(.5,.58,Ls[k])*(1-g3Smooth(.58,.7,Ls[k]));r+=(214-r)*beach*.55;g+=(198-g)*beach*.55;bl+=(150-bl)*beach*.55;
    const o=k*4;px[o]=r*sh;px[o+1]=g*sh;px[o+2]=bl*sh;px[o+3]=255;}
  // biome weights for the detail shader (RGBA bytes): rock, snow, sand, vegetation - sampled bilinear, tiny, the sharp part is the tiled detail
  const dd0=new Float32Array(W*H),vg0=new Float32Array(W*H);for(let k=0;k<W*H;k++){const t=P[idx[k]].t;if(t==='d')dd0[k]=1;else if(t==='f'||t==='j'||t==='r'||t==='c')vg0[k]=1;}
  const dw=g3Blur(dd0,W,H,6,2),vw=g3Blur(vg0,W,H,6,2),bw=new Uint8Array(W*H*4);
  for(let k=0;k<W*H;k++){const h=Hh[k],coast=g3Smooth(.4,.8,Ls[k]),rock=Math.max(mw[k]*coast*.55,g3Smooth(24,40,h)),snow=Math.max(sw[k]>.3?g3Smooth(.3,.6,sw[k]):0,g3Smooth(46,60,h)),beach=g3Smooth(.5,.58,Ls[k])*(1-g3Smooth(.62,.8,Ls[k]));
    const o=k*4;bw[o]=Math.min(255,rock*255);bw[o+1]=Math.min(255,snow*255);bw[o+2]=Math.min(255,Math.max(dw[k],beach)*255);bw[o+3]=Math.min(255,vw[k]*255);}
  G3.F={W,H,idx,land,Ls,Lw,mw,Hh,px,bw};
  if(G3.real){try{const t0=performance.now();g3RealFields(G3.F);G3.tReal=Math.round(performance.now()-t0);}catch(e){console.error('real terrain failed, procedural fallback',e);G3.F=null;G3.real=null;G3.realFail=1;return g3Fields();}}
  return G3.F;}
function g3HeightAt(x,z){const F=G3.F;if(!F)return 0;const fx=Math.max(0,Math.min(F.W-1.001,x/2)),fy=Math.max(0,Math.min(F.H-1.001,z/2)),x0=fx|0,y0=fy|0,tx=fx-x0,ty=fy-y0,H=F.Hh,W=F.W;
  return (H[y0*W+x0]*(1-tx)+H[y0*W+x0+1]*tx)*(1-ty)+(H[(y0+1)*W+x0]*(1-tx)+H[(y0+1)*W+x0+1]*tx)*ty;}
// ---- overlay texture: soft owner tint + subtle borders (political), or the data of the chosen map mode
function g3SupplyOK(){const ok=new Uint8Array(GCM.P.length);for(const c of Object.keys(GC.nat)){const cap=GC.nat[c].cap;if(cap==null||GC.prov[cap].o!==c)continue;const q=[cap];ok[cap]=1;while(q.length){const i=q.pop();for(const j of GCM.P[i].adj)if(GCM.P[j].land&&!ok[j]&&GC.prov[j].o===c){ok[j]=1;q.push(j);}}}return ok;}
function g3HueRgb(h,s,l){return guRgb('hsl('+Math.round(h)+','+s+'%,'+l+'%)');}
function g3ModeColors(){const P=GCM.P,out=new Array(P.length).fill(null),mode=G3.mode;let sup=null;if(mode==='supply')sup=g3SupplyOK();
  const regs=[...new Set(GM_NATS.map(r=>r[2]))];
  for(const p of P){if(!p.land)continue;const st=GC.prov[p.i];let c=null;
    if(mode==='political')c=[...grNatRgb(st.o),.2];
    else if(mode==='terrain')c=[0,0,0,0];
    else if(mode==='trade'){const v=(p.oil?2:0)+(p.farm?1:0)+(p.mine?1:0)+(p.port?1:0);c=v?[232,170,40,.2+.1*v]:[120,120,120,.08];}
    else if(mode==='supply'){c=sup[p.i]?[70,180,90,.3]:[210,70,60,.42];}
    else if(mode==='unrest'){const t=Math.min(1,st.un/80);c=[60+t*170,170-t*110,80-t*30,.22+.3*t];}
    else if(mode==='culture'){const o=GCM.nats.get(st.o0||st.o),h=regs.indexOf(o?o.reg:'EU')*47+10;c=[...g3HueRgb(h,55,52),st.o!==st.o0?.5:.32];}
    else if(mode==='alliances'){const me=GC.me;if(!me)c=[...grNatRgb(st.o),.3];else if(st.o===me)c=[70,190,100,.42];else if(grAtWar(me,st.o))c=[220,70,60,.42];else c=[120,140,170,.28];}
    else if(mode==='development'){const t=Math.min(1,p.dev/9);c=[40+t*40,90+t*80,150+t*100,.18+.38*t];}
    out[p.i]=c||[0,0,0,0];}
  return out;}
function g3PaintOverlay(){const F=G3.F,W=F.W,H=F.H,idx=F.idx,P=GCM.P,Ls=F.Ls;if(!G3.ov)G3.ov=new Uint8Array(W*H*4);const d=G3.ov,col=g3ModeColors();
  const bord=new Float32Array(W*H);const pol=G3.mode==='political';
  for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){const k=y*W+x,i=idx[k];if(P[i].sea||Ls[k]<.5)continue;for(const j of [idx[k+1],idx[k+W]])if(j!==i&&P[j].land&&GC.prov[i].o!==GC.prov[j].o){bord[k]=1;}}
  const glow=pol?g3Blur(bord,W,H,6,2):null;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,i=idx[k],p=P[i],o=k*4;let r=0,g=0,b=0,a=0;
    const R=x+1<W?idx[k+1]:i,D=y+1<H?idx[k+W]:i;
    if(p.sea){a=0;}
    else if(Ls[k]>.5){const c=col[i],ed=g3Smooth(.5,.64,Ls[k]);let t=c[3];
      if(pol)t=.24+Math.min(.42,glow[k]*1.7);
      if(G3.mode==='culture'&&GC.prov[i].o!==GC.prov[i].o0&&((x+y)&7)<3)t*=.3;
      r=c[0];g=c[1];b=c[2];a=t*255*ed;
      }
    d[o]=r;d[o+1]=g;d[o+2]=b;d[o+3]=a;}
  if(G3.lines)g3LineColors();
  return d;}
function g3IdxPixels(){const F=G3.F,n=F.W*F.H,d=new Uint8Array(n*4);for(let k=0;k<n;k++){const i=F.idx[k];d[k*4]=i&255;d[k*4+1]=i>>8;d[k*4+3]=255;}return d;}
// ---- geometry helpers
function g3Merge(parts){const P=[],N=[],C=[];for(const [geo,m,c] of parts){const g=geo.index?geo.toNonIndexed():geo.clone();if(m)g.applyMatrix4(m);const pa=g.attributes.position.array,na=g.attributes.normal.array;
    for(let i=0;i<pa.length;i+=3){P.push(pa[i],pa[i+1],pa[i+2]);N.push(na[i],na[i+1],na[i+2]);C.push(c[0],c[1],c[2]);}g.dispose();}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));o.setAttribute('color',new THREE.Float32BufferAttribute(C,3));return o;}
const g3M=(x=0,y=0,z=0,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
function g3Prism(){const g=new THREE.CylinderGeometry(.62,.62,1.1,3);g.rotateX(-Math.PI/2);g.rotateY(Math.PI/2);return g;}   // triangular roof prism, ridge along x
const G3_GEO=()=>{if(G3.geo)return G3.geo;const cyl=(a,b,h,s)=>new THREE.CylinderGeometry(a,b,h,s),box=()=>new THREE.BoxGeometry(1,1,1),ico=(r)=>new THREE.IcosahedronGeometry(r,0),cone=(r,h,s)=>new THREE.ConeGeometry(r,h,s);
  const wall=[.86,.82,.72],plaster=[.88,.8,.66],roof=[.55,.28,.2],grey=[.62,.7,.8],teal=[.25,.5,.6],tr=[.35,.24,.14];
  const A={};
  A.conifer=g3Merge([[cyl(.3,.4,1.6,5),g3M(0,.8,0),tr],[cone(1.7,3,7),g3M(0,2.8,0),[.1,.28,.15]],[cone(1.35,2.6,7),g3M(0,4.4,0),[.12,.32,.17]],[cone(.9,2.2,7),g3M(0,5.8,0),[.15,.36,.2]]]);
  A.broad=g3Merge([[cyl(.35,.5,2.2,5),g3M(0,1.1,0),tr],[ico(1.9),g3M(0,3.7,0,1,.9,1),[.22,.46,.18]],[ico(1.3),g3M(.9,3,.4),[.28,.52,.2]]]);
  A.palm=g3Merge([[cyl(.16,.3,5.2,5),g3M(0,2.6,0),[.62,.5,.32]],...[0,1,2,3,4,5].map(i=>[cone(.5,3.2,3),g3M(Math.cos(i*1.047)*1.4,5.3,Math.sin(i*1.047)*1.4,1,1,1,0,0,0).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(i*1.047)*1.2,0,-Math.cos(i*1.047)*1.2))),[.25,.5,.2]])]);
  A.scrub=g3Merge([[ico(1),g3M(0,.4,0,1.4,.6,1.2),[.5,.5,.28]],[ico(.7),g3M(.8,.25,.3,1,.5,1),[.45,.46,.25]]]);
  const tile=[.62,.27,.18],tile2=[.5,.3,.22],slate=[.38,.4,.44],pyr=(r,h)=>new THREE.ConeGeometry(r,h,4).rotateY(Math.PI/4);
  A.house=g3Merge([[box(),g3M(0,.28,0,1,.56,.8),wall],[pyr(.72,.5),g3M(0,.81,0,1,1,.8),tile],[box(),g3M(.28,.95,.05,.1,.3,.1),[.45,.4,.36]],[box(),g3M(0,.2,.41,.22,.3,.02),[.3,.2,.14]]]);
  A.gable=g3Merge([[box(),g3M(0,.28,0,1,.56,.78),plaster],[g3Prism(),g3M(0,.84,0,1,.6,.88),tile2],[box(),g3M(-.3,.98,0,.1,.3,.1),[.45,.4,.36]],[box(),g3M(.25,.34,.4,.2,.2,.02),[.25,.3,.4]],[box(),g3M(-.25,.34,.4,.2,.2,.02),[.25,.3,.4]]]);
  A.row=g3Merge([[box(),g3M(0,.26,0,1.9,.52,.7),wall],[g3Prism(),g3M(-.62,.78,0,.7,.55,.78),slate],[g3Prism(),g3M(0,.78,0,.7,.55,.78),tile],[g3Prism(),g3M(.62,.78,0,.7,.55,.78),slate]]);
  A.flat=g3Merge([[box(),g3M(0,.3,0,1,.6,.85),plaster],[box(),g3M(0,.64,0,1.06,.08,.91),[.82,.74,.62]],[box(),g3M(-.2,.78,-.1,.45,.2,.4),[.78,.7,.58]],[cyl(.12,.12,.28,7),g3M(.3,.78,.22),grey],[box(),g3M(0,.22,.44,.2,.34,.02),[.35,.24,.16]],[box(),g3M(.3,.4,.44,.18,.16,.02),[.25,.3,.35]]]);
  A.court=g3Merge([[box(),g3M(0,.28,0,1,.56,1),plaster],[box(),g3M(0,.6,0,1.05,.08,1.05),[.84,.76,.64]],[box(),g3M(0,.62,0,.5,.07,.5),[.36,.3,.24]],[cyl(.06,.06,.5,5),g3M(-.5,.9,-.5),[.4,.62,.4]],[box(),g3M(.35,.74,.3,.22,.18,.22),[.8,.72,.6]]]);
  A.tower=g3Merge([[box(),g3M(0,1.2,0,.7,2.4,.7),grey],[box(),g3M(0,2.6,0,.5,.4,.5),[.55,.58,.64]],[cyl(.025,.025,1.2,4),g3M(0,3.4,0),[.3,.3,.3]]]);
  A.mosque=g3Merge([[box(),g3M(0,.3,0,1.3,.6,1.3),plaster],[new THREE.SphereGeometry(.6,10,6,0,Math.PI*2,0,Math.PI/2),g3M(0,.6,0),teal],[cyl(.07,.1,2.4,6),g3M(.75,1.2,.75),plaster],[cyl(.07,.1,2.4,6),g3M(-.75,1.2,-.75),plaster],[cone(.14,.5,6),g3M(.75,2.65,.75),teal],[cone(.14,.5,6),g3M(-.75,2.65,-.75),teal]]);
  A.spire=g3Merge([[box(),g3M(0,.3,0,.8,.6,1.4),wall],[g3Prism(),g3M(0,.86,.1,.8,.5,1.1),roof],[box(),g3M(0,1.1,-.6,.5,1.7,.5),wall],[cone(.42,1.4,4),g3M(0,2.65,-.6),roof]]);
  A.disc=g3Merge([[cyl(1,1,.14,14),g3M(0,.07,0),[.52,.47,.38]]]);
  A.wall=g3Merge([[new THREE.CylinderGeometry(1,1,.9,28,1,true),g3M(0,.45,0),[.7,.64,.52]],[new THREE.CylinderGeometry(1,1,.12,28,1,true),g3M(0,.95,0),[.5,.44,.36]]]);
  {const st=[.62,.63,.66],dk=[.2,.2,.22],rd=[.8,.2,.15],lg=[];for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]])lg.push([box(),g3M(sx*.42,2.4,sz*.42,.1,4.8,.1,0,-sz*.085,sx*.085),st]);
  const br=[];for(const y of [1,2,3,4]){const w=.9-y*.15;for(const q of [-1,1]){br.push([box(),g3M(0,y,q*w*.5,w,.07,.07),st],[box(),g3M(q*w*.5,y,0,.07,.07,w),st]);}}
  A.derrick=g3Merge([[box(),g3M(0,.1,0,1.9,.2,1.9),dk],...lg,...br,[box(),g3M(0,4.95,0,.5,.3,.5),dk],[box(),g3M(0,5.25,0,.12,.3,.12),rd],
   [cyl(.55,.55,1.1,10),g3M(1.9,.6,.3),[.78,.78,.76]],[cyl(.5,.5,.9,10),g3M(1.9,.5,-1),[.7,.72,.7]],[cyl(.06,.09,3.6,5),g3M(-1.8,1.8,-.8),dk],[ico(.18),g3M(-1.8,3.7,-.8),[1,.62,.15]]]);}
  A.field=g3Merge([[cyl(1,1,.1,10),g3M(0,.05,0,1,1,.7),[.8,.72,.3]]]);
  A.spoil=g3Merge([[cone(1.2,1.6,7),g3M(0,.8,0),[.34,.32,.3]]]);
  A.pier=g3Merge([[box(),g3M(0,.15,0,1,.3,.14),[.45,.38,.3]],[box(),g3M(.3,.7,.4,.12,1.4,.12),[.8,.3,.2]],[box(),g3M(.3,1.35,.2,.06,.06,.5),[.8,.3,.2]]]);
  return G3.geo=A;};
function g3Land(x,z,rad){let best=null;for(let r=0;r<=rad;r+=3)for(let a=0;a<(r?12:1);a++){const t=a/12*6.283+r*.7,X=x+Math.cos(t)*r,Z=z+Math.sin(t)*r;if(g3HeightAt(X,Z)>1.3&&G3.F.Ls[Math.round(Z/2)*G3.F.W+Math.round(X/2)]>.66)return [X,Z];}return [x,z];}
const G3_MEGA=new Set(['Tehran','Tel Aviv','Riyadh','Dubai','Cairo','Istanbul','Moscow','Beijing','Shanghai','Tokyo','Seoul','New York','London','Paris','Delhi','Mumbai','Karachi','Baghdad','Hong Kong','Singapore','Sao Paulo','Mexico City','Lagos']);
const G3_STYLE={ME:'flat',AF:'flat',SA:'flat'};
function g3Towns(){if(G3.towns)return G3.towns;const L=[],ar=g3PArea();
  for(const p of GCM.P){if(!p.land)continue;const reg=(GCM.nats.get(p.o)||{}).reg,flat=G3_STYLE[reg]==='flat',sc=Math.max(.3,Math.min(1,Math.sqrt(ar[p.i])/28)),base=g3Land(p.x,p.y,Math.round(50*sc));   // realmap: towns scale with the real province size
    for(let t=0;t<p.tw;t++){let X=base[0],Z=base[1];if(t){const a=g3Hash(p.i,t)*6.283,r=(15+g3Hash(t,p.i)*14)*sc,q=g3Land(base[0]+Math.cos(a)*r,base[1]+Math.sin(a)*r,10);X=q[0];Z=q[1];}
      const cap=p.cap&&t===0;L.push({pi:p.i,x:X,z:Z,cap,n:Math.max(3,Math.round((cap?24:t===0?9:5)*Math.max(.5,sc))),sc,mega:G3_MEGA.has(p.n),flat,east:reg==='EA'||reg==='SEA',t});}}
  return G3.towns=L;}
function g3BuildTowns(grp){const A=G3_GEO(),T=g3Towns(),by={house:[],gable:[],row:[],court:[],flat:[],tower:[],mosque:[],spire:[],disc:[],wall:[],derrick:[],field:[],spoil:[],pier:[]};
  const SHK={house:1,gable:1,row:1,court:1,flat:1,tower:1,mosque:1,spire:1},SHD=[],sl=Math.hypot(G3L.sun[0],G3L.sun[2])||1,sdx=-G3L.sun[0]/sl,sdz=-G3L.sun[2]/sl,sth=Math.atan2(sdx,sdz);
  const push=(k,x,z,sx,sy,sz,ry,col)=>{const h=g3HeightAt(x,z);by[k].push([x,h,z,sx,sy,sz,ry,col]);if(SHK[k]){const len=sy*2*(k==='tower'||k==='spire'?1.2:1)+sx*.6;SHD.push([x+sdx*len*.4,h+.2,z+sdz*len*.4,sx*.95,1,len,sth,[1,1,1]]);}};
  for(const t of T){const p=GCM.P[t.pi],sc=t.sc||1,SP=4.5*sc,R=Math.sqrt(t.n*SP*SP/3.14)+3.5*sc;push('disc',t.x,t.z,R*.82,1,R*.82,0,[1.22,1.18,1.08]);
    if(t.cap||p.wg&&t.t===0)by.wall.push([t.x,g3HeightAt(t.x,t.z),t.z,R+2,1,R+2,0,[1,1,1]]);
    const th=g3Hash(t.pi,t.t+31)*3.1416,ct=Math.cos(th),st=Math.sin(th),R2=Math.ceil(R/SP)+1,cells=[];
    for(let i=-R2;i<=R2;i++)for(let j=-R2;j<=R2;j++){if(i%4===0&&j%4===0&&(i||j))continue;if(i===0&&j!==0&&Math.abs(j)%2===1)continue;const d=Math.hypot(i,j)+(g3Hash(i+9,j+t.pi)-.5)*1.1;if(d*SP>R)continue;cells.push([i,j,d]);}
    cells.sort((u,v)=>u[2]-v[2]);let k=0;
    for(const [i,j] of cells){if(k>=t.n)break;if(g3Hash(i*7+3,j+t.pi)<.1)continue;const lx=(i+(g3Hash(i,j+4)-.5)*.35)*SP,lz=(j+(g3Hash(j,i+5)-.5)*.35)*SP+(i%2?SP*.2:0),x=t.x+lx*ct-lz*st,z=t.z+lx*st+lz*ct;if(g3HeightAt(x,z)<.7)continue;
      const TN=[[1,1,1],[.96,.9,.8],[.86,.94,1],[1,.88,.84],[.9,1,.9],[1.06,1.06,1.08],[1,.84,.62],[.9,.78,.68]][Math.floor(g3Hash(k+5,t.pi+2)*8)],hv=g3Hash(i+k,t.pi+4),s=(2.5+g3Hash(k,t.pi)*1.1)*sc,ry=-th+(g3Hash(k,k+i)-.5)*.14+(g3Hash(i,j)<.5?0:Math.PI),v=.86+g3Hash(k+3,t.t)*.28;
      let kind=t.flat?(hv<.5?'court':'flat'):(hv<.4?'house':hv<.75?'gable':'row'),sy=s*(t.flat?.45+hv*.35:.85+hv*.3);const fw=.82+g3Hash(k+11,t.pi+7)*.46,fd=.8+g3Hash(k+13,t.pi+9)*.42;
      if(k===0&&(t.cap||t.t===0)){kind=t.flat?'mosque':'spire';sy=s*.8;}else if(t.mega&&t.t===0&&k<4&&k%2===1){kind='tower';sy=s*1.05;}else if(t.cap&&k%7===4){kind=t.flat?'court':'row';sy=s*1.5;}
      push(kind,x,z,kind==='mosque'?s*.8:s*fw,sy,kind==='mosque'?s*.8:s*fd,ry,[v*TN[0],v*TN[1],v*TN[2]]);k++;}
    if(p.oil&&t.t===0)for(let k=0;k<3;k++)push('derrick',t.x+(20+k*8)*sc,t.z+(-18+k*4)*sc,1.7*sc,1.7*sc,1.7*sc,k*.7,[1,1,1]);
    if(p.farm&&t.t===0)for(let k=0;k<4;k++)push('field',t.x+(-24+(k%2)*11)*sc,t.z+(18+(k>>1)*8)*sc,5*sc,1,5*sc,0,[.7+g3Hash(k,p.i)*.4,1,.8]);
    if(p.mine&&t.t===0)for(let k=0;k<2;k++)push('spoil',t.x+(8+k*7)*sc,t.z+24*sc,2.4*sc,2*sc,2.4*sc,0,[1,1,1]);
    if(p.port&&t.t===0){for(let a=0;a<16;a++){const ang=a/16*6.283;let ok=false;for(let r=8*sc;r<46*sc;r+=3*sc){const X=t.x+Math.cos(ang)*r,Z=t.z+Math.sin(ang)*r;if(g3HeightAt(X,Z)<-.2){push('pier',X-Math.cos(ang)*3*sc,Z-Math.sin(ang)*3*sc,10*sc,1,6*sc,-ang,[1,1,1]);ok=true;break;}}if(ok)break;}}}
  const col=new THREE.Color();
  for(const k of Object.keys(by)){const L=by[k];if(!L.length)continue;const m=new THREE.InstancedMesh(A[k],G3.matLit,L.length),M=new THREE.Matrix4();
    L.forEach((r,i)=>{M.compose(new THREE.Vector3(r[0],r[1],r[2]),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r[6]),new THREE.Vector3(r[3],r[4],r[5]));m.setMatrixAt(i,M);col.setRGB(r[7][0],r[7][1],r[7][2]);m.setColorAt(i,col);});
    m.instanceMatrix.needsUpdate=true;m.castShadow=false;grp.add(m);}
  if(SHD.length){const sm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.05,1),new THREE.MeshBasicMaterial({color:0x1a1208,transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),SHD.length),M=new THREE.Matrix4();
    SHD.forEach((r,i)=>{M.compose(new THREE.Vector3(r[0],r[1],r[2]),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r[6]),new THREE.Vector3(r[3],r[4],r[5]));sm.setMatrixAt(i,M);});
    sm.instanceMatrix.needsUpdate=true;sm.castShadow=false;sm.renderOrder=2;grp.add(sm);}}
// life: chimney smoke from every town (besieged provinces use g3BuildSmoke below) (GPU-animated points, one draw call)
function g3BuildChim(grp){const T=g3Towns(),pos=[],ph=[],sz=[],pid=[],kind=[];
  for(const t of T){const nS=t.cap?5:t.t===0?3:1;for(let s=0;s<nS;s++){const a=g3Hash(t.pi*3+s,t.t+7)*6.283,r=g3Hash(s+2,t.pi+t.t)*(t.cap?16:9)*(t.sc||1),x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r,y=g3HeightAt(x,z)+4;
    for(let k=0;k<7;k++){pos.push(x,y,z);ph.push((k+g3Hash(k,s+t.pi))/7);sz.push(.7+g3Hash(k+5,s)*.5);pid.push(t.pi);kind.push(s===0?1:0);}}}
  if(!pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aPh',new THREE.Float32BufferAttribute(ph,1));g.setAttribute('aSz',new THREE.Float32BufferAttribute(sz,1));
  const war=new Float32Array(pid.length);g.setAttribute('aWar',new THREE.BufferAttribute(war,1));
  const U=G3.chimU={uT:{value:0},uPx:{value:900}};
  const m=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,vertexShader:`uniform float uT,uPx;attribute float aPh,aSz,aWar;varying float vA;varying float vW;
    void main(){float life=fract(aPh+uT*(.05+.05*aWar));float h=life*(34.+aWar*34.);vec3 p=position+vec3(h*.55+life*life*10.,h,h*.18);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
    float base=(3.2+aWar*9.)*aSz*(.5+life*1.4);gl_PointSize=clamp(base*uPx/-mv.z,0.,90.);vA=smoothstep(0.,.2,life)*(1.-life)*(1.-life)*(.85+.9*aWar);vW=aWar;}`,
    fragmentShader:`varying float vA;varying float vW;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;float a=vA*(1.-smoothstep(.0,.5,d));vec3 c=mix(vec3(.62,.6,.57),vec3(.14,.12,.1),vW);gl_FragColor=vec4(c,a);}`});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=6;grp.add(pts);G3.chim=pts;}
// forests, palms, scrub by biome: one instanced mesh per tree type (a few thousand instances each)
function g3BuildForests(grp){const F=G3.F,A=G3_GEO(),T=g3Towns(),W=F.W,P=GCM.P,L={conifer:[],broad:[],palm:[],scrub:[]};
  const near=(x,z)=>{for(const t of T)if(Math.abs(t.x-x)<40&&Math.abs(t.z-z)<40&&Math.hypot(t.x-x,t.z-z)<(t.cap?36:26))return true;return false;};
  for(let y=3;y<F.H-3;y+=3)for(let x=3;x<W-3;x+=3){const k=y*W+x;if(F.Ls[k]<.7)continue;const h=F.Hh[k];if(h<1.5||h>34)continue;
    const p=P[F.idx[k]],t=p.t,jx=(g3Hash(x,y)-.5)*5,jy=(g3Hash(y,x+7)-.5)*5,wx=(x+jx)*2,wz=(y+jy)*2,cl=g3Smooth(.42,.62,g3Fbm(x*.045,y*.045,3)),r=g3Hash(x*7,y*13);
    let kind=null,d=0;
    if(t==='f'){d=.55*cl;kind=r<.8?'broad':'conifer';}else if(t==='j'){d=.8*(.5+.5*cl);kind=r<.45?'palm':'broad';}else if(t==='c'){d=.2*cl;kind=G3_STYLE[(GCM.nats.get(p.o)||{}).reg]?'palm':'broad';}
    else if(t==='r'){d=.5*cl;kind=r<.5?'palm':'broad';}else if(t==='m'){d=.32*cl*(1-g3Smooth(18,34,h));kind='conifer';}else if(t==='s'){d=.3*cl;kind='conifer';}
    else if(t==='d'){d=.1*cl;kind=r<.35?'palm':'scrub';}else if(t==='u'){d=.1*cl;kind='broad';}
    if(!kind||g3Hash(x+3,y+11)>d)continue;if(near(wx,wz))continue;
    L[kind].push([wx,F.Hh?g3HeightAt(wx,wz):h,wz,.75+g3Hash(y,x)*.7,g3Hash(x,y+1)*6.28]);}
  const col=new THREE.Color();let n=0;
  for(const k of Object.keys(L)){const a=L[k];if(!a.length)continue;n+=a.length;const m=new THREE.InstancedMesh(A[k],G3.matLit,a.length),M=new THREE.Matrix4();
    a.forEach((r,i)=>{M.compose(new THREE.Vector3(r[0],r[1],r[2]),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r[4]),new THREE.Vector3(r[3],r[3]*(.9+g3Hash(i,3)*.3),r[3]));m.setMatrixAt(i,M);const v=.8+g3Hash(i,k.length)*.4;col.setRGB(v,v*(.95+g3Hash(i,5)*.1),v);m.setColorAt(i,col);});m.instanceMatrix.needsUpdate=true;grp.add(m);}
  G3.trees=n;}
// ---- scene

// ---- grandsharp (Abdullah 2026-11-06 13:54 "sharpen the graphics in the grand map by a lot") --------------------------------
// Detail textures (tileable, generated here at start: 4 channels) + real line geometry for borders/rivers + adaptive pixel ratio.
function g3PNoise(x,y,per){const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),m=q=>((q%per)+per)%per;
  const h=(p,q)=>g3Hash(m(p)+per*7,m(q)),a=h(xi,yi),b=h(xi+1,yi),c=h(xi,yi+1),d=h(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function g3PFbm(x,y,per,o){let s=0,a=.5,n=0,f=1;for(let i=0;i<o;i++){s+=a*g3PNoise(x*f/per*per,y*f,per*f);n+=a;f*=2;a*=.5;}return s/n;}
function g3DetailTex(){const n=512,d=new Uint8Array(n*n*4),K=8;   // K = base lattice cells per tile
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=x/n*K,v=y/n*K,o=(y*n+x)*4;
    const f=g3PFbm(u,v,K,5);                                   // R: soft mottling / grass / field patches
    const r=1-Math.abs(2*g3PFbm(u+3.1,v+1.7,K,5)-1);           // G: ridged rock + strata
    const sd=g3PFbm(u*.35+9,v*1.9+4,K,4);                       // B: sand ripples (stretched, then thresholded into crests)
    const rip=.5+.5*Math.sin((sd*14+u*.8)*3.14159);
    const gr=g3PNoise(u*6,v*6,K*6)*.6+g3PNoise(u*13,v*13,K*13)*.4;   // A: fine grain
    d[o]=Math.min(255,f*255*1.15);d[o+1]=Math.min(255,r*r*255*1.25);d[o+2]=Math.min(255,(rip*.7+sd*.3)*255);d[o+3]=Math.min(255,gr*255);}
  const t=new THREE.DataTexture(d,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.anisotropy=16;t.needsUpdate=true;return t;}
// province-boundary + river polylines traced from the 1200x600 province index, smoothed, drawn as screen-constant-width strips
function g3Chains(kind){const F=G3.F,W=F.W,H=F.H,idx=F.idx,P=GCM.P,Ls=F.Ls,W1=W+1,E=[];   // E: [nodeA,nodeB,i,j]
  for(let y=0;y<H-1;y++)for(let x=0;x<W-1;x++){const k=y*W+x,i=idx[k];
    for(let q=0;q<2;q++){const nb=q?k+W:k+1,j=idx[nb];if(j===i)continue;
      if(kind==='land'){if(!P[i].land||!P[j].land||Ls[k]<.5||Ls[nb]<.5)continue;}else{if(!P[i].sea||!P[j].sea||Ls[k]>.3||Ls[nb]>.3)continue;}
      E.push(q?[(y+1)*W1+x,(y+1)*W1+x+1,i,j]:[y*W1+x+1,(y+1)*W1+x+1,i,j]);}}
  const adj=new Map();E.forEach((e,n)=>{for(const c of [e[0],e[1]]){let a=adj.get(c);if(!a)adj.set(c,a=[]);a.push(n);}});
  const key=e=>Math.min(e[2],e[3])*4096+Math.max(e[2],e[3]),used=new Uint8Array(E.length),out=[];
  const stop=(c,from)=>{const a=adj.get(c);return a.length!==2||key(E[a[0]])!==key(E[a[1]]);};
  const walk=(c0,n0)=>{const pts=[c0],e0=E[n0];let n=n0,c=c0;for(;;){used[n]=1;const e=E[n];c=e[0]===c?e[1]:e[0];pts.push(c);if(stop(c))break;const a=adj.get(c),nn=a[0]===n?a[1]:a[0];if(used[nn])break;n=nn;}return {pts,i:e0[2],j:e0[3]};};
  for(const [c,a] of adj)if(stop(c))for(const n of a)if(!used[n])out.push(walk(c,n));
  for(let n=0;n<E.length;n++)if(!used[n])out.push(walk(E[n][0],n));
  for(const ch of out){let q=ch.pts.map(c=>[(c%W1)*2,Math.floor(c/W1)*2]);const closed=ch.pts[0]===ch.pts[ch.pts.length-1];
    for(let pass=0;pass<3;pass++){const r=q.map((p,a)=>{if(!closed&&(a<2||a>q.length-3))return p;let sx=0,sz=0;for(let d=-2;d<=2;d++){const t=q[(a+d+q.length-1)%(q.length-(closed?1:0)||1)]||q[Math.max(0,Math.min(q.length-1,a+d))];sx+=t[0];sz+=t[1];}return [sx/5,sz/5];});if(closed)r[r.length-1]=r[0];q=r;}
    ch.xy=q.filter((p,a)=>a%2===0||a===q.length-1);}
  return out;}
function g3RiverChains(){const out=[],Ls=G3.F.Ls,W=G3.F.W;for(const l of GT_RIV){let q=[];for(let i=0;i+1<l.length;i+=2)q.push([l[i],l[i+1]]);
    for(let it=0;it<2;it++){const r=[q[0]];for(let a=0;a<q.length-1;a++){const A=q[a],B=q[a+1];r.push([A[0]*.75+B[0]*.25,A[1]*.75+B[1]*.25],[A[0]*.25+B[0]*.75,A[1]*.25+B[1]*.75]);}r.push(q[q.length-1]);q=r;}
    out.push({xy:q,i:-1,j:-1});}return out;}
function g3MeshH(x,z){const gx=Math.max(0,Math.min(599.99,x/4)),gz=Math.max(0,Math.min(299.99,z/4)),i=gx|0,j=gz|0,tx=gx-i,tz=gz-j,h=(a,b)=>g3HeightAt(a*4,b*4);
  return h(i,j)*(1-tx)*(1-tz)+h(i+1,j)*tx*(1-tz)+h(i,j+1)*(1-tx)*tz+h(i+1,j+1)*tx*tz;}
function g3LineMat(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:G3.LU,
  vertexShader:`uniform vec2 uRes;uniform float uPx;attribute vec3 aP0,aP1;attribute vec2 aC;attribute vec4 aCol;attribute vec2 aW;varying vec4 vCol;varying float vD,vH;
  void main(){vec4 c0=projectionMatrix*viewMatrix*vec4(aP0,1.),c1=projectionMatrix*viewMatrix*vec4(aP1,1.);vec2 s0=c0.xy/c0.w*uRes*.5,s1=c1.xy/c1.w*uRes*.5,d=s1-s0;float l=length(d);d=l>1e-4?d/l:vec2(1.,0.);vec2 n=vec2(-d.y,d.x);
    vec3 pm=mix(aP0,aP1,aC.x);float dist=length(cameraPosition-pm);float hw=max(aW.x*uPx,aW.y*uRes.y/(.65*dist)+.0)*.5;hw=max(hw,.5*uPx);
    vec4 c=mix(c0,c1,aC.x);float pad=hw+.75;vec2 off=n*aC.y*pad+d*(aC.x*2.-1.)*pad;c.xy+=off/(uRes*.5)*c.w;
    vD=aC.y*pad;vH=hw;vCol=aCol;vCol.a*=1.-smoothstep(2600.,6800.,dist);gl_Position=c;}`,
  fragmentShader:`varying vec4 vCol;varying float vD,vH;void main(){float cv=clamp(vH+.5-abs(vD),0.,1.);gl_FragColor=vec4(vCol.rgb,vCol.a*cv);if(gl_FragColor.a<.01)discard;}`});}
// build one strip mesh from chains; col(chain)->[r,g,b,a,wpx,wworld,lift]
function g3LineMesh(chains,sea,lift,casing){let ns=0;for(const c of chains)ns+=Math.max(0,c.xy.length-1);
  const P0=new Float32Array(ns*12),P1=new Float32Array(ns*12),C=new Float32Array(ns*8),Col=new Float32Array(ns*16),Wd=new Float32Array(ns*8),ix=new Uint32Array(ns*6),rng=[];let s=0;
  for(const ch of chains){const a0=s;for(let a=0;a+1<ch.xy.length;a++,s++){const A=ch.xy[a],B=ch.xy[a+1],ya=(sea?.12:Math.max(.2,g3MeshH(A[0],A[1])))+lift,yb=(sea?.12:Math.max(.2,g3MeshH(B[0],B[1])))+lift;
    for(let v=0;v<4;v++){const o=(s*4+v)*3;P0[o]=A[0];P0[o+1]=ya;P0[o+2]=A[1];P1[o]=B[0];P1[o+1]=yb;P1[o+2]=B[1];C[(s*4+v)*2]=v>>1;C[(s*4+v)*2+1]=(v&1)?1:-1;}
    const b=s*4;ix.set([b,b+1,b+2,b+2,b+1,b+3],s*6);}rng.push([a0,s]);ch.r=[a0,s];}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P0,3));g.setAttribute('aP0',new THREE.BufferAttribute(P0,3));g.setAttribute('aP1',new THREE.BufferAttribute(P1,3));g.setAttribute('aC',new THREE.BufferAttribute(C,2));
  g.setAttribute('aCol',new THREE.BufferAttribute(Col,4));g.setAttribute('aW',new THREE.BufferAttribute(Wd,2));g.setIndex(new THREE.BufferAttribute(ix,1));g.boundingSphere=new THREE.Sphere(new THREE.Vector3(1200,0,600),3000);
  const m=new THREE.Mesh(g,g3LineMat());m.frustumCulled=false;m.renderOrder=2;return m;}
function g3SetLine(mesh,ch,r,g,b,a,wpx,wwd){const A=mesh.geometry.attributes,Co=A.aCol.array,Wd=A.aW.array;for(let s=ch.r[0];s<ch.r[1];s++)for(let v=0;v<4;v++){const o=(s*4+v)*4;Co[o]=r;Co[o+1]=g;Co[o+2]=b;Co[o+3]=a;Wd[(s*4+v)*2]=wpx;Wd[(s*4+v)*2+1]=wwd;}}
function g3LineColors(){const L=G3.lines;if(!L||!GC)return;const pol=G3.mode==='political';
  for(const ch of L.land){const fr=GC.prov[ch.i].o!==GC.prov[ch.j].o;
    if(fr){const oc=pol?grNatRgb(GC.prov[ch.i].o):[60,60,60],oc2=pol?grNatRgb(GC.prov[ch.j].o):[60,60,60];
      g3SetLine(L.land_m,ch,.09+oc[0]/255*.2,.09+oc[1]/255*.2,.09+oc[2]/255*.2,.95,2.1,0);g3SetLine(L.cas_m,ch,.99,.97,.9,.28,5.2,0);}
    else{g3SetLine(L.land_m,ch,.12,.11,.1,.7,1.5,0);g3SetLine(L.cas_m,ch,1,1,1,0,1,0);}}
  L.land_m.geometry.attributes.aCol.needsUpdate=L.land_m.geometry.attributes.aW.needsUpdate=true;L.cas_m.geometry.attributes.aCol.needsUpdate=L.cas_m.geometry.attributes.aW.needsUpdate=true;}
function g3BuildLines(sc){const L={};G3.LU={uRes:{value:new THREE.Vector2(1600,900)},uPx:{value:1}};
  L.land=g3Chains('land');L.sea=g3Chains('sea');L.riv=g3RiverChains();
  L.land_m=g3LineMesh(L.land,false,.45);L.cas_m=g3LineMesh(L.land,false,.4);L.cas_m.renderOrder=1;
  L.sea_m=g3LineMesh(L.sea,true,.2);for(const ch of L.sea)g3SetLine(L.sea_m,ch,.6,.78,.9,.2,1,0);
  L.riv_m=g3LineMesh(L.riv,false,.35);for(const ch of L.riv)g3SetLine(L.riv_m,ch,.2,.42,.58,.82,.9,.5);
  for(const m of [L.sea_m,L.cas_m,L.land_m,L.riv_m])sc.add(m);
  G3.lines=L;g3LineColors();L.sea_m.geometry.attributes.aCol.needsUpdate=L.sea_m.geometry.attributes.aW.needsUpdate=L.riv_m.geometry.attributes.aCol.needsUpdate=L.riv_m.geometry.attributes.aW.needsUpdate=true;}
// render quality: High (default) = pixel ratio up to 2, drops if the frame rate falls under 50; Ultra = up to 2.5, never drops below 1.5
function g3Quality(){return SET.g3q==='ultra'?'ultra':'high';}
function g3SetRatio(r){if(!G3.R)return;G3.ratio=r;G3.R.setPixelRatio(r);g3Resize();}
function g3ApplyQuality(){if(!G3.R)return;const u=g3Quality()==='ultra',dpr=window.devicePixelRatio||1;G3.maxRatio=Math.max(1,Math.min(u?2.5:2,dpr));G3.minRatio=u?Math.min(1.5,G3.maxRatio):1;g3SetRatio(G3.maxRatio);G3.fpsN=0;G3.fpsT=0;}
function g3Adapt(dt){if(!G3.R||dt>.25)return;G3.fpsT=(G3.fpsT||0)+dt;G3.fpsN=(G3.fpsN||0)+1;if(G3.fpsN<90)return;const fps=G3.fpsN/G3.fpsT;G3.fpsN=0;G3.fpsT=0;
  if(fps<50&&G3.ratio>G3.minRatio+.01)g3SetRatio(Math.max(G3.minRatio,G3.ratio-.25));}
function g3NoiseTex(){const n=128,d=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=Math.round(255*(.6*g3Noise(x*.25,y*.25)+.4*g3Noise(x*.7,y*.7)));const o=(y*n+x)*4;d[o]=d[o+1]=d[o+2]=v;d[o+3]=255;}
  const t=new THREE.DataTexture(d,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
function g3Tex(data,w,h,mip,nearest){const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);t.flipY=false;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  if(nearest){t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;}else{t.magFilter=THREE.LinearFilter;t.minFilter=mip?THREE.LinearMipmapLinearFilter:THREE.LinearFilter;t.generateMipmaps=!!mip;t.anisotropy=G3.aniso||8;}t.needsUpdate=true;return t;}
const G3_DETAIL=`vec3 g3detail(vec3 c){vec2 wp=vWp.xz;vec4 bw=texture2D(uBW,vG3);float rock=bw.r,snow=bw.g,sand=bw.b,veg=bw.a,ls=texture2D(uSea,vG3).g;
  vec2 p1=wp/20.,p2=wp/91.+.37,p3=wp/540.+.11;vec4 a1=texture2D(uDet,p1),a2=texture2D(uDet,p2),a3=texture2D(uDet,p3);
  float e=1./512.;vec2 L=vec2(-.84,-.54);
  float h1=mix(a1.r,a1.g,rock),h1x=mix(texture2D(uDet,p1+vec2(e,0.)).r,texture2D(uDet,p1+vec2(e,0.)).g,rock),h1z=mix(texture2D(uDet,p1+vec2(0.,e)).r,texture2D(uDet,p1+vec2(0.,e)).g,rock);
  float h2=mix(a2.r,a2.g,rock),h2x=mix(texture2D(uDet,p2+vec2(e,0.)).r,texture2D(uDet,p2+vec2(e,0.)).g,rock),h2z=mix(texture2D(uDet,p2+vec2(0.,e)).r,texture2D(uDet,p2+vec2(0.,e)).g,rock);
  float sl=dot(vec2(h1x-h1,h1z-h1),L)*1.1+dot(vec2(h2x-h2,h2z-h2),L)*.9;sl*=(.8+rock*1.4+sand*.5)*(1.-snow*.55)*14.;
  float lum=1.+(a3.r-.5)*.42+(a2.r-.5)*.42+(a1.a-.5)*.42*(1.-snow*.6);
  lum+=((a2.g-.5)*.65+(a1.g-.5)*.55)*rock;lum+=((a1.b-.5)*.45+(a2.b-.5)*.25)*sand*(1.-rock);
  c*=clamp(lum*(1.-clamp(sl,-.45,.45)),.45,1.6);
  c=mix(c,c*vec3(.82,1.06,.76),veg*(a2.r-.3)*1.2);c=mix(c,c*vec3(1.1,.98,.84),(a3.g-.5)*.9*(1.-snow));                        // patchy field / grass tint
  float wet=smoothstep(.5,.56,ls)*(1.-smoothstep(.56,.7,ls));c*=1.-.2*wet;   // damp shoreline
  return c;}`;
function g3Init(cv){g3Dispose();try{g3LoadReal();}catch(e){}try{g3LoadArmyModels();}catch(e){}if(G3.real&&G3.F&&!G3.F.lit){G3.F=null;G3.towns=null;}let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});}catch(e){return false;}
  try{G3.vigS=new THREE.Scene();G3.vigC=new THREE.OrthographicCamera(-1,1,1,-1,0,1);G3.vigS.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 u;void main(){vec2 d=(u-vec2(.5,.52))*vec2(1.,.9);float v=smoothstep(.34,.82,length(d));vec3 c=mix(vec3(1.,.88,.66),vec3(.1,.18,.4),1.-u.y);gl_FragColor=vec4(mix(c,vec3(.02,.05,.1),v),v*.46+.055);}'})));}catch(e){G3.vigS=null;}  // studio grade: vignette + warm-top/cool-bottom wash, drawn in-canvas so HUD stays crisp
  if(!R.getContext())return false;R.outputColorSpace=THREE.LinearSRGBColorSpace;G3.R=R;G3.cv=cv;G3.aniso=Math.min(16,R.capabilities.getMaxAnisotropy?R.capabilities.getMaxAnisotropy():8);
  const F=g3Fields(),W=F.W,H=F.H,sc=new THREE.Scene(),haze=0x9db8c9;sc.background=new THREE.Color(haze);sc.fog=new THREE.Fog(haze,2200,6200);G3.sc=sc;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.02;g3Sky(sc);
  G3.cam=new THREE.PerspectiveCamera(36,1.6,8,9000);G3.cc=Object.assign({},G3.camera);G3.time=0;G3.last=0;G3.keys.clear();G3.pos=new Map();G3.arm=new Map();G3.sig='';
  sc.add(new THREE.HemisphereLight(0xcfe0f2,0x8a7a5e,2.0));const sun=new THREE.DirectionalLight(0xfff0d2,3.5);sun.position.set(G3L.sun[0],G3L.sun[1],G3L.sun[2]);sc.add(sun);
  G3.matLit=new THREE.MeshLambertMaterial({vertexColors:true});
  // terrain
  const GX=600,GY=300,pos=new Float32Array((GX+1)*(GY+1)*3),uv=new Float32Array((GX+1)*(GY+1)*2),ix=new Uint32Array(GX*GY*6);
  for(let j=0;j<=GY;j++)for(let i=0;i<=GX;i++){const q=j*(GX+1)+i,x=i*4,z=j*4;pos[q*3]=x;pos[q*3+1]=g3HeightAt(x,z);pos[q*3+2]=z;uv[q*2]=i/GX;uv[q*2+1]=j/GY;}
  let n=0;for(let j=0;j<GY;j++)for(let i=0;i<GX;i++){const a=j*(GX+1)+i,b=a+1,c=a+GX+1,d=c+1;ix[n++]=a;ix[n++]=c;ix[n++]=b;ix[n++]=b;ix[n++]=c;ix[n++]=d;}
  const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(pos,3));tg.setAttribute('uv',new THREE.BufferAttribute(uv,2));tg.setIndex(new THREE.BufferAttribute(ix,1));tg.computeVertexNormals();
  g3PaintOverlay();
  const tGround=g3Tex(new Uint8Array(F.px.buffer),F.PW||W,F.PH||H,true),tOv=g3Tex(G3.ov,W,H,true),tIdx=g3Tex(g3IdxPixels(),W,H,false,true),tDet=g3DetailTex(),tBW=g3Tex(F.bw,W,H,true);tDet.anisotropy=G3.aniso||8;G3.tOv=tOv;
  const sd=new Uint8Array(W*H*4);for(let k=0;k<W*H;k++){sd[k*4]=Math.min(255,F.Lw[k]*255);sd[k*4+1]=Math.min(255,F.Ls[k]*255);sd[k*4+2]=Math.round(255*g3SeaDepth(F,k));sd[k*4+3]=255;}const tSea=g3Tex(sd,W,H,false);const tLit=F.lit?g3Tex(F.lit,F.LW,F.LH,true):null;
  const tHi=G3.hi?g3Tex(new Uint8Array(G3.hi.d.buffer),G3.hi.w,G3.hi.h,true):null;if(tHi)tHi.anisotropy=G3.aniso||8;
  const U={uHi:{value:tHi},uHasHi:{value:tHi?1:0},uHiR:{value:new THREE.Vector4(...(G3.hi?G3.hi.r:[0,0,1,1]))},uOv:{value:tOv},uIdx:{value:tIdx},uDet:{value:tDet},uSel:{value:-1},uHov:{value:-1},uRim:{value:2},uTime:{value:0},uSea:{value:tSea},uBW:{value:tBW},uLit:{value:tLit},uHasLit:{value:tLit?1:0}};G3.U=U;
  const rim=`float g3id(vec2 u){vec4 t=texture2D(uIdx,u);return floor(t.r*255.+.5)+256.*floor(t.g*255.+.5);}
    float g3m(vec2 uv,float id){vec2 e=vec2(uRim*.7/1200.,uRim*.7/600.);float m=0.;
      m+=(g3id(uv)==id?4.:0.);m+=(g3id(uv+vec2(e.x,0.))==id?2.:0.);m+=(g3id(uv-vec2(e.x,0.))==id?2.:0.);m+=(g3id(uv+vec2(0.,e.y))==id?2.:0.);m+=(g3id(uv-vec2(0.,e.y))==id?2.:0.);
      m+=(g3id(uv+e)==id?1.:0.);m+=(g3id(uv-e)==id?1.:0.);m+=(g3id(uv+vec2(e.x,-e.y))==id?1.:0.);m+=(g3id(uv+vec2(-e.x,e.y))==id?1.:0.);return m/16.;}
    vec3 g3rim(vec3 c,vec2 uv){
      if(uSel>=0.){float m=g3m(uv,uSel);float l=smoothstep(.12,.4,m)*(1.-smoothstep(.6,.88,m));c+=vec3(.05,.045,.0)*step(.7,m);c=mix(c,vec3(1.,.9,.45),l*.9);}
      if(uHov>=0.&&uHov!=uSel){float m=g3m(uv,uHov);float l=smoothstep(.12,.4,m)*(1.-smoothstep(.6,.88,m));c+=vec3(.045)*step(.7,m);c=mix(c,vec3(1.),l*.6);}
      return c;}`;
  const tm=new THREE.MeshLambertMaterial({map:tGround});
  tm.onBeforeCompile=s=>{Object.assign(s.uniforms,U);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vG3;varying vec3 vWp;').replace('#include <uv_vertex>','#include <uv_vertex>\nvG3=uv;vWp=(modelMatrix*vec4(position,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vG3;varying vec3 vWp;uniform sampler2D uOv,uIdx,uDet,uBW,uSea,uLit,uHi;uniform vec4 uHiR;uniform float uSel,uHov,uRim,uHasLit,uHasHi;float g3sh=1.,g3ao=1.;uniform float uTime;\n'+G3_CLOUD+rim+G3_DETAIL)
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n if(uHasLit>.5){vec4 L=texture2D(uLit,vG3);vec3 nw=normalize(vec3((L.r-.5)*4.,1.,(L.g-.5)*4.));normal=normalize((viewMatrix*vec4(nw,0.)).xyz);g3sh=L.b;g3ao=L.a*1.08;}').replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n reflectedLight.directDiffuse*=g3sh*g3cloud(vWp.xz,uTime);reflectedLight.indirectDiffuse*=g3ao;')
      .replace('#include <map_fragment>','#include <map_fragment>\n if(uHasHi>.5){vec2 hu=(vG3-uHiR.xy)/uHiR.zw;float hm_=smoothstep(0.,.02,hu.x)*smoothstep(0.,.02,1.-hu.x)*smoothstep(0.,.02,hu.y)*smoothstep(0.,.02,1.-hu.y);if(hm_>0.)diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uHi,clamp(hu,0.,1.)).rgb,hm_);}\n diffuseColor.rgb=g3detail(diffuseColor.rgb);vec4 ov=texture2D(uOv,vG3);diffuseColor.rgb=mix(diffuseColor.rgb,ov.rgb,ov.a);diffuseColor.rgb=g3rim(diffuseColor.rgb,vG3);');};
  const terr=new THREE.Mesh(tg,tm);sc.add(terr);G3.terr=terr;
  // sea
  const sm=new THREE.ShaderMaterial({uniforms:U,transparent:false,vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform sampler2D uSea,uOv,uIdx;uniform float uTime,uSel,uHov,uRim;varying vec3 vW;\n${G3_CLOUD}
    ${rim.replace('vec3 g3rim','vec3 g3rimS')}
    void main(){vec2 uv=vec2(vW.x/2400.,vW.z/1200.);vec2 cu=clamp(uv,0.,1.);vec4 s=texture2D(uSea,cu);float oo=max(max(-uv.x,uv.x-1.),max(-uv.y,uv.y-1.));s.g*=1.-smoothstep(0.,.004,oo);float sh=s.r,dp=mix(s.b,1.,smoothstep(0.,.03,oo));dp=mix(.85,dp,smoothstep(0.,.05,uv.y));
      vec3 deep=vec3(.025,.11,.235),mid=vec3(.05,.26,.42),sha=vec3(.12,.55,.58);vec3 c=mix(sha,mid,smoothstep(.0,.14,dp));c=mix(c,deep,smoothstep(.12,.6,dp));
      vec2 p=vW.xz;float w=sin(p.x*.31+uTime*1.1)+sin(p.y*.47-uTime*.8)+sin((p.x+p.y)*.19+uTime*.6)+sin((p.x-p.y)*.63-uTime*1.3)*.5;c*=1.+w*.028*(1.-smoothstep(500.,2400.,length(cameraPosition-vW)));{float nz=sin(p.x*.0093+sin(p.y*.0141)*1.9)*sin(p.y*.0117+cos(p.x*.0087)*1.7)+.5*sin(p.x*.021+p.y*.017+2.);c=mix(c,c*vec3(.82,.96,1.12),clamp(nz*.5+.15,0.,1.)*smoothstep(.25,.6,dp)*.55);c*=1.+nz*.05*smoothstep(.3,.7,dp);}
      vec3 V=normalize(cameraPosition-vW);vec3 N=normalize(vec3(cos(p.x*.31+uTime*1.1)*.05+cos((p.x-p.y)*.63-uTime*1.3)*.03,1.,cos(p.y*.47-uTime*.8)*.05+cos((p.x+p.y)*.19+uTime*.6)*.03));
      N=normalize(N+vec3(sin(p.x*1.7+uTime*2.1)*cos(p.y*1.3-uTime*1.7),0.,cos(p.x*1.1-uTime*1.9)*sin(p.y*1.9+uTime*1.4))*.022*(1.-smoothstep(300.,1400.,length(cameraPosition-vW))));
      float fdd=length(cameraPosition-vW);
      // swell: 5 crossing sharpened wave trains (peaked crests, flat troughs) -> bumpy normals + whitecaps in open water
      float cr=0.;vec2 gw=vec2(0.);
      {vec2 D[5];D[0]=vec2(.86,.5);D[1]=vec2(-.5,.87);D[2]=vec2(.97,-.26);D[3]=vec2(-.8,-.6);D[4]=vec2(.2,.98);
       float K[5];K[0]=.21;K[1]=.34;K[2]=.52;K[3]=.83;K[4]=1.3;float A[5];A[0]=1.;A[1]=.8;A[2]=.55;A[3]=.35;A[4]=.2;float Sp[5];Sp[0]=.7;Sp[1]=.9;Sp[2]=1.1;Sp[3]=1.5;Sp[4]=1.9;
       for(int i=0;i<5;i++){float ph=dot(D[i],p)*K[i]+uTime*Sp[i]+float(i)*1.7;float sn=.5+.5*sin(ph);float pk=sn*sn;cr+=pk*A[i];gw+=A[i]*sn*cos(ph)*K[i]*D[i];}
       cr/=2.9;}
      float wfade=1.-smoothstep(350.,2200.,fdd);N=normalize(N+vec3(-gw.x,0.,-gw.y)*.05*wfade);
      N=normalize(mix(N,vec3(0.,1.,0.),smoothstep(500.,3200.,fdd)*.92));vec3 L=normalize(vec3(-1.,.75,-.45));vec3 Rf=reflect(-L,N);float gl=max(dot(Rf,V),0.);c+=vec3(1.,.93,.78)*(pow(gl,60.)*.5+pow(gl,500.)*2.4);
      float fr=pow(1.-max(dot(N,V),0.),4.);vec3 Rv=reflect(-V,N);float sk=clamp(Rv.y,0.,1.);vec3 skyC=mix(vec3(.74,.82,.9),vec3(.28,.5,.8),pow(sk,.55));skyC+=vec3(.5,.38,.2)*pow(max(dot(Rv,L),0.),8.)*.35;c=mix(c,skyC,clamp(.06+fr*.62,0.,.7));
      c+=vec3(.05,.2,.2)*smoothstep(.55,1.,cr)*(1.-smoothstep(.3,.7,dp))*wfade;   // light through thin crests in shallows
      float cap=smoothstep(.72,.95,cr)*smoothstep(.25,.6,dp)*(.55+.45*sin(p.x*.9+p.y*1.3+uTime*.7))*(.35+.65*wfade);c=mix(c,vec3(.93,.97,1.),clamp(cap*.5,0.,.55));
      float fw=fwidth(s.g)+.004;float foam=smoothstep(.36,.49,s.g)*(1.-smoothstep(.49,.6,s.g));c=mix(c,vec3(.92,.97,1.),foam*.35*(.6+.4*sin(uTime*1.6+p.x*.4+p.y*.3)));
      float crest=1.-smoothstep(fw*.6,fw*1.8,abs(s.g-(.52+.02*sin(uTime*.9+p.x*.2+p.y*.17))));c=mix(c,vec3(.96,.99,1.),crest*.8);   // crisp shoreline foam line, constant width on screen
      if(uv.x>=0.&&uv.x<=1.&&uv.y>=0.&&uv.y<=1.){vec4 ov=texture2D(uOv,cu);c=mix(c,ov.rgb,ov.a*.55);c=g3rimS(c,cu);}
      float dist=length(cameraPosition-vW);c*=mix(g3cloud(vW.xz,uTime),1.,smoothstep(1500.,4200.,dist));c=mix(c,vec3(.616,.722,.788),smoothstep(2200.,6200.,dist));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n}`});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(14000,9000).rotateX(-Math.PI/2).translate(1200,0,600),sm);sea.position.y=.05;sc.add(sea);g3BuildLines(sc);
  const grp=new THREE.Group();sc.add(grp);g3BuildForests(grp);g3BuildTowns(grp);g3BuildChim(grp);G3.static=grp;
  G3.ents=new THREE.Group();sc.add(G3.ents);G3.arrows=new THREE.Group();sc.add(G3.arrows);
  G3.ringM=new THREE.Mesh(new THREE.RingGeometry(.9,1.2,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:.9,depthTest:false}));G3.ringM.renderOrder=5;G3.ringM.visible=false;sc.add(G3.ringM);try{g3ShipInit(sc);}catch(e){G3.ship=null;}
  g3UI();G3.miniDirty=true;g3ApplyQuality();try{cv.style.filter='contrast(1.06) saturate(1.18)';const w=document.getElementById('gMapWrap');if(w&&!document.getElementById('g3vig')){const v=document.createElement('div');v.id='g3vig';v.style.cssText='position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 58%,rgba(4,10,18,.34) 100%)';w.insertBefore(v,cv.nextSibling);}}catch(e){}
  if(!G3.raf)G3.raf=requestAnimationFrame(g3Frame);return true;}
function g3Dispose(){if(G3.raf){cancelAnimationFrame(G3.raf);G3.raf=0;}if(G3.sc){G3.sc.traverse(o=>{if(o.geometry&&o.geometry!==undefined&&!Object.values(G3.geo||{}).includes(o.geometry))o.geometry.dispose();});}
  if(G3.R){try{G3.R.dispose();G3.R.forceContextLoss();}catch(e){}}G3.R=null;G3.sc=null;G3.cam=null;G3.cv=null;G3.arm=new Map();G3.matLit=null;G3.tOv=null;}
function g3Resize(){if(!G3.R||!GV.cv)return;const w=GV.w||GV.cv.clientWidth||800,h=GV.h||GV.cv.clientHeight||500;G3.R.setSize(w,h,false);if(G3.LU){const b=G3.R.getDrawingBufferSize(new THREE.Vector2());G3.LU.uRes.value.copy(b);G3.LU.uPx.value=G3.R.getPixelRatio();}GV.cv.style.width=w+'px';GV.cv.style.height=h+'px';G3.cam.aspect=w/h;G3.cam.updateProjectionMatrix();G3.moved=true;}
// ---- armies: one soldier (the general) with a big national flag; a ship with a flag for armies at sea
function g3Uniform(o){const c=grNatRgb(o);return [Math.min(1,(c[0]*.72+44)/255),Math.min(1,(c[1]*.72+42)/255),Math.min(1,(c[2]*.68+34)/255)];}
function g3Soldier(u,dk,sk,ox,oz,sc,flag){const cyl=(a,b,h,s)=>new THREE.CylinderGeometry(a,b,h,s),M=(x,y,z,sx,sy,sz,rx,ry,rz)=>g3M(ox+x*sc,y*sc,oz+z*sc,(sx||1)*sc,(sy||1)*sc,(sz||1)*sc,rx||0,ry||0,rz||0),bk=[.2,.19,.17];
  const L=[[cyl(.34,.3,1.7,6),M(-.42,.85,0),dk],[cyl(.34,.3,1.7,6),M(.42,.85,0),dk],[cyl(.4,.38,.3,6),M(-.42,.15,.1),[.15,.12,.1]],[cyl(.4,.38,.3,6),M(.42,.15,.1),[.15,.12,.1]],
    [cyl(.85,.65,1.8,8),M(0,2.6,0),u],[cyl(.9,.9,.28,8),M(0,1.8,0),bk],[cyl(.15,.15,.3,6),M(0,3.6,0),sk],[new THREE.SphereGeometry(.5,8,6),M(0,4.05,0),sk],[new THREE.SphereGeometry(.6,8,5,0,Math.PI*2,0,Math.PI/2),M(0,4.14,0),dk],
    [new THREE.BoxGeometry(1.1,1.5,.55),M(0,2.8,-.75),dk.map(v=>v*.8)],[cyl(.2,.2,1.6,5),M(-1.0,2.7,.1,1,1,1,0,0,.15),u],[cyl(.2,.2,1.5,5),M(1.05,3.1,0,1,1,1,0,0,-.1),u],[cyl(.1,.1,2.8,5),M(-.5,2.7,.8,1,1,1,0,Math.PI/2.3,0),bk],[cyl(.09,.09,.5,5),M(-.5,2.55,1.5,1,1,1,0,Math.PI/2.3,0),bk]];
  if(flag)L.push([cyl(.09,.09,12.5,6),M(1.2,6.6,0),[.5,.42,.3]],[new THREE.SphereGeometry(.28,6,4),M(1.2,12.9,0),[.9,.75,.2]]);return L;}
function g3Tier(n){return n<5?0:n<12?1:2;}
function g3FigGeo(o,tier){tier=tier||0;const key='fig'+o+'_'+tier;G3.figs=G3.figs||{};if(G3.figs[key])return G3.figs[key];const u=g3Uniform(o),dk=u.map(v=>v*.62),sk=[.82,.62,.48];
  let L=g3Soldier(u,dk,sk,0,0,1,true);
  if(tier>=1)L=L.concat(g3Soldier(u,dk,sk,-3.4,-2.4,.82),g3Soldier(u,dk,sk,3.6,-2.2,.82));
  if(tier>=2)L=L.concat(g3Soldier(u,dk,sk,-6.4,-4.8,.78),g3Soldier(u,dk,sk,6.6,-4.6,.78),g3Soldier(u,dk,sk,0,-5.2,.8));
  {const c=grNatRgb(o),pc=[c[0]/255*.55,c[1]/255*.55,c[2]/255*.55],r=tier>=2?6.2:tier>=1?4.6:2.3; /* plinth: dark rim + nation-colour disc so each army sits on a small base */
   L.unshift([new THREE.CylinderGeometry(r+.5,r+.7,.5,20),g3M(0,.05,tier>=1?-2.4:0),[.12,.11,.1]],[new THREE.CylinderGeometry(r,r+.2,.45,20),g3M(0,.1,tier>=1?-2.4:0),pc]);}
  return G3.figs[key]=g3Merge(L);}
function g3ShipGeo(){if(G3.ship)return G3.ship;const sh=new THREE.Shape();[[-5,-1.5],[3.5,-1.6],[5.8,0],[3.5,1.6],[-5,1.5]].forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1]));
  const hull=new THREE.ExtrudeGeometry(sh,{depth:1.3,bevelEnabled:false}).rotateX(-Math.PI/2),cyl=(a,b,h,s)=>new THREE.CylinderGeometry(a,b,h,s),gr=[.5,.54,.58],dg=[.38,.42,.46];
  return G3.ship=g3Merge([[hull,g3M(0,-.1,0),[.42,.46,.5]],[cyl(1.2,1.5,1.4,8),g3M(-1.2,2,0),gr],[cyl(.8,.9,1.2,8),g3M(-1.2,3.2,0),dg],[cyl(.35,.4,1.2,8),g3M(-2.2,3.2,0),[.25,.25,.28]],
    [cyl(.5,.5,.7,8),g3M(2.2,1.65,0),dg],[cyl(.1,.1,2.2,5),g3M(2.2,1.7,0,1,1,1,0,0,Math.PI/2).multiply(g3M(0,0,0)),[.2,.2,.22]],[cyl(.09,.09,9,6),g3M(-.2,5.8,0),[.5,.42,.3]]]);}
function g3FlagMesh(o,sx){const fac=grNat(o).fac,tex=flagTex(fac),m=new THREE.Mesh(G3.flagGeo||(G3.flagGeo=new THREE.PlaneGeometry(7,4.6,10,1).translate(3.5,0,0)),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
  m.material.onBeforeCompile=s=>{s.uniforms.uT=G3.flagT||(G3.flagT={value:0});s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uT;').replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.z+=sin(uT*3.2+transformed.x*.9+modelMatrix[3].x*.07)*.16*transformed.x;transformed.y+=sin(uT*2.1+transformed.x*.6)*.05*transformed.x;');};
  return m;}
function g3Ent(a){let e=G3.arm.get(a.id);const sea=GCM.P[a.at].sea,tier=g3Tier(a.u.length),mg=sea?g3NavyGeo(a.o):g3MiniGeo(a.o,tier);   /* grandlook: baked soldier/ship miniature when the models are loaded */
  if(e&&e.sea===sea&&e.o===a.o&&(sea||e.tier===tier)&&!!e.mini===!!mg)return e;if(e){G3.ents.remove(e.g);}
  const g=new THREE.Group(),body=new THREE.Mesh(mg||(sea?g3ShipGeo():g3FigGeo(a.o,tier)),G3.matLit),fl=g3FlagMesh(a.o);
  body.scale.setScalar(1);g.add(body);
  if(mg){const R=tier>=2?5.2:tier>=1?4.4:3.2;fl.scale.setScalar(.54);if(sea){fl.position.set(-3.4,5.5,0);g.add(g3WakeMesh());}else fl.position.set(R*.62+.1,10.4,-R*.42);}
  else{if(sea){fl.position.set(-.2,10,0);fl.scale.setScalar(.85);}else fl.position.set(1.2,10.7,0);}g.add(fl);
  const old=e;e={g,sea,tier,mini:!!mg,o:a.o,pi:a.at,x:0,z:0,fx:0,fz:0,mv:1,tt:1,face:0,aid:a.id,plate:old?old.plate:null};G3.ents.add(g);G3.arm.set(a.id,e);return e;}
function g3Anchors(s){const by=new Map();for(const a of GC.armies){if(!by.has(a.at))by.set(a.at,[]);by.get(a.at).push(a);}
  const out=new Map();for(const [pi,L] of by){L.sort((a,b)=>(b.o===GC.me)-(a.o===GC.me)||a.id-b.id);const p=GCM.P[pi],tw=!p.sea?g3Towns().find(t=>t.pi===pi):null,bx=tw?tw.x:p.x,bz=(tw?tw.z:p.y)+(p.sea?0:(tw&&tw.cap?30:20)*Math.min(1.6,Math.max(1,s*.6)));
    L.forEach((a,k)=>out.set(a.id,[bx+(k-(L.length-1)/2)*(p.sea?20:13)*s,bz]));}
  for(const a of GC.armies){const f=typeof grSlide==='function'?grSlide(a):0;if(f>0){const A=out.get(a.id),q=GCM.P[a.path[0]],tw=!q.sea?g3Towns().find(t=>t.pi===q.i):null,bx=tw?tw.x:q.x,bz=tw?tw.z:q.y;out.set(a.id,[A[0]+(bx-A[0])*f,A[1]+(bz-A[1])*f]);}}   /* laneA hook: marching armies slide along the road as days pass */
  return out;}
function g3SyncArmies(){if(!G3.ents||!GC)return;const ids=new Set(GC.armies.map(a=>a.id));for(const [id,e] of G3.arm)if(!ids.has(id)){G3.ents.remove(e.g);if(e.plate)e.plate.remove();G3.arm.delete(id);}
  for(const a of GC.armies){const had=G3.arm.has(a.id),e=g3Ent(a);if(had&&e.pi!==a.at&&G3.animOK){e.fx=e.x;e.fz=e.z;e.tt=0;e.mv=1;}e.pi=a.at;e.n=a.u.length;e.o=a.o;}
  G3.hot.clear();for(const p of GCM.P)if(p.land){const st=GC.prov[p.i];if(st.hot!=null&&GC.turn-st.hot<=1)G3.hot.set(p.i,1);if(st.burn>0)G3.hot.set(p.i,2);}
  g3BuildSmoke();G3.sig='';}
function g3BuildSmoke(){if(G3.smoke){G3.sc.remove(G3.smoke);G3.smoke.geometry.dispose();G3.smoke=null;}if(!G3.hot.size)return;const P=[],S=[],T=[];
  for(const [pi,k] of G3.hot){const tw=g3Towns().find(t=>t.pi===pi),x=tw?tw.x:GCM.P[pi].x,z=tw?tw.z:GCM.P[pi].y,y=g3HeightAt(x,z);for(let i=0;i<(k===2?22:16);i++){P.push(x+(g3Hash(i,pi)-.5)*26,y+1,z+(g3Hash(pi,i)-.5)*26);S.push(g3Hash(i,pi+5));T.push(k);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aSeed',new THREE.Float32BufferAttribute(S,1));g.setAttribute('aK',new THREE.Float32BufferAttribute(T,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uT:G3.flagT||(G3.flagT={value:0}),uPx:{value:(G3.R?G3.R.domElement.height:800)/900}},
    vertexShader:'attribute float aSeed;attribute float aK;uniform float uT;uniform float uPx;varying float vL;varying float vK;void main(){float l=fract(uT*.16+aSeed);vL=l;vK=aK;vec3 p=position;p.y+=l*46.;p.x+=l*9.*(aSeed-.5);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(8.+l*34.)*uPx*(700./-mv.z)*1.6;}',
    fragmentShader:'varying float vL;varying float vK;void main(){vec2 c=gl_PointCoord-.5;float r=length(c);if(r>.5)discard;float a=(1.-vL)*smoothstep(.5,.1,r)*.55;vec3 col=mix(vec3(1.,.55,.15),vec3(.16,.15,.15),smoothstep(0.,.28,vL));if(vK<1.5)col=mix(vec3(1.,.6,.2),vec3(.28,.27,.26),smoothstep(0.,.18,vL));gl_FragColor=vec4(col,a);}'});
  G3.smoke=new THREE.Points(g,m);G3.smoke.frustumCulled=false;G3.sc.add(G3.smoke);}
// move arrows: green along the ground for marches, red when the target is hostile
function g3PathPts(a){const P=GCM.P,pts=[];const q=(i)=>{const p=P[i],tw=!p.sea?g3Towns().find(t=>t.pi===i):null;return [tw?tw.x:p.x,tw?tw.z:p.y];};pts.push(q(a.at));for(const j of a.path)pts.push(q(j));return pts;}
function g3BuildArrows(){if(!G3.arrows)return;while(G3.arrows.children.length){const c=G3.arrows.children.pop();c.geometry.dispose();c.material.dispose();}if(!GC)return;const Pos=[],Col=[];
  for(const a of GC.armies){if(!a.path.length)continue;if(GC.me&&a.o!==GC.me&&a.id!==GV.selA)continue;const last=a.path[a.path.length-1],lp=GCM.P[last],hostile=!lp.sea&&GC.me&&grAtWar(a.o,GC.prov[last].o);
    const c=hostile?[.95,.22,.18]:[.3,.85,.25],pts=g3PathPts(a);if(pts.length<2)continue;const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'catmullrom',.4),n=Math.max(8,Math.round(cv.getLength()/7)),sel=a.id===GV.selA,w=sel?3.2:2.2;
    const S=[];for(let i=0;i<=n;i++){const v=cv.getPoint(i/n);S.push([v.x,v.z]);}
    for(let i=0;i<S.length;i++){const p=S[i],pr=S[Math.max(0,i-1)],nx=S[Math.min(S.length-1,i+1)];let dx=nx[0]-pr[0],dz=nx[1]-pr[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;S[i]=[p[0],p[1],-dz*w/2,dx*w/2,dx,dz];}
    const head=Math.min(S.length-1,3);for(let i=0;i<S.length-1-head;i++){const A=S[i],B=S[i+1],y0=Math.max(.8,g3HeightAt(A[0],A[1]))+1.1,y1=Math.max(.8,g3HeightAt(B[0],B[1]))+1.1,v=(x,y,z)=>{Pos.push(x,y,z);Col.push(c[0],c[1],c[2]);};
      v(A[0]+A[2],y0,A[1]+A[3]);v(A[0]-A[2],y0,A[1]-A[3]);v(B[0]+B[2],y1,B[1]+B[3]);v(B[0]+B[2],y1,B[1]+B[3]);v(A[0]-A[2],y0,A[1]-A[3]);v(B[0]-B[2],y1,B[1]-B[3]);}
    const T=S[S.length-1],H=S[S.length-1-head],hy=Math.max(.8,g3HeightAt(T[0],T[1]))+1.1,v=(x,y,z)=>{Pos.push(x,y,z);Col.push(c[0],c[1],c[2]);};
    v(H[0]+H[2]*1.9,hy,H[1]+H[3]*1.9);v(H[0]-H[2]*1.9,hy,H[1]-H[3]*1.9);v(T[0]+T[4]*w*1.8,hy,T[1]+T[5]*w*1.8);}
  if(!Pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Col,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.92,depthTest:false}));m.renderOrder=4;m.frustumCulled=false;G3.arrows.add(m);}
// ---- HUD: mode chips, round buttons, army cards, minimap, news, banners
function g3Css(){if(document.getElementById('g3css'))return;const s=document.createElement('style');s.id='g3css';s.textContent=`
#g3ui{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:inherit}
#g3ui .b{position:absolute;left:0;top:0;transform:translate(-50%,-100%);font:600 12px/1 sans-serif;color:#f3ecd8;background:linear-gradient(#27394b,#152230);border:1px solid #b99a45;padding:2px 7px 3px;border-radius:3px;white-space:nowrap;text-shadow:0 1px 1px #000;box-shadow:0 2px 5px rgba(0,0,0,.55);display:none}
#g3ui .b i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;border:1px solid #fff8}
#g3ui .b.cap{font-size:13px;border-color:#ffd24a}
#g3ui .n{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font:800 18px/1 sans-serif;letter-spacing:3px;color:rgba(255,255,255,.88);text-shadow:0 1px 3px #000,0 0 8px #0008;display:none;white-space:nowrap}
#g3ui .p{position:absolute;left:0;top:0;transform:translate(-50%,0);font:700 12px/1 sans-serif;color:#fff;background:#0d1822e0;border:1px solid #fff9;border-radius:9px;padding:2px 7px;display:none;white-space:nowrap}
#g3ui .p{padding:2px 9px 6px;border-radius:9px 9px 15px 15px;box-shadow:0 2px 5px #0009}#g3ui .p::before{content:'';position:absolute;left:5px;right:5px;top:1px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--mc,#6aa8ff) var(--mo,100%),#0008 var(--mo,100%))}#g3ui .p::after{content:'';position:absolute;left:5px;right:5px;bottom:2px;height:3px;border-radius:2px;background:linear-gradient(90deg,var(--sc,#6fcf6f) var(--st,100%),#0008 var(--st,100%))}#g3ui .p.me{border-color:#ffe27a}#g3ui .p.sel{background:#6b5a14e8;border-color:#ffe27a}
#g3ui .s{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font:italic 12px/1 sans-serif;color:#d7ecff;text-shadow:0 1px 2px #000;display:none;white-space:nowrap}
#g3ui .k{pointer-events:auto}
#g3modes{position:absolute;left:10px;top:10px;width:150px;display:flex;flex-direction:column;gap:2px;padding:6px 5px 5px;border:1px solid #6b5a33;border-radius:6px;background:linear-gradient(#162433,#0b141f);box-shadow:0 4px 14px #000a,inset 0 1px 0 #ffffff18;z-index:3}#g3modes:before{content:'MAP MODE';font:700 10px/12px system-ui,sans-serif;letter-spacing:.16em;color:#d8b865;padding:1px 4px 4px;border-bottom:1px solid #6b5a3380;margin-bottom:3px}
#g3modes button{pointer-events:auto;text-align:left;padding:4px 8px;border-radius:3px;border:1px solid transparent;background:transparent;color:#cfe0ee;font-size:12.5px;cursor:pointer;white-space:nowrap}#g3modes button:hover{background:#243a4e;border-color:#3d5a73}
#g3modes button.on{background:linear-gradient(#3b5d7a,#2a4660);border-color:#d8b865;color:#fff;font-weight:600}
#g3btns{position:absolute;right:14px;bottom:16px;display:flex;gap:10px;align-items:flex-end}
#g3btns button{pointer-events:auto;width:46px;height:46px;border-radius:50%;border:2px solid #b99a45;background:radial-gradient(#33485d,#142130);color:#f3ecd8;font-size:20px;cursor:pointer;box-shadow:0 3px 8px #000a}
#g3btns button.end{width:62px;height:62px;font-size:26px;background:radial-gradient(#6c9a3f,#2f4a1c);border-color:#d6e8a0}
#g3btns button:disabled{opacity:.45}
#g3mini{position:absolute;left:10px;bottom:10px;border:2px solid #b99a45;border-radius:4px;background:#0a1620;pointer-events:auto;box-shadow:0 3px 8px #000a;cursor:crosshair}
#g3cards{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:5px;max-width:calc(100% - 560px)}
#g3cards .row{display:flex;gap:5px;flex-wrap:nowrap;overflow:visible}
#g3cards .tabs button{pointer-events:auto;padding:3px 9px;border-radius:12px;border:1px solid #6b7a8a;background:#0f1b27e0;color:#e8e4d8;font-size:12px;cursor:pointer}
#g3cards .tabs button.on{border-color:#ffe27a;background:#4a4012e8}
#g3cards .card{pointer-events:auto;width:80px;background:linear-gradient(#22344a,#121e2b);border:1px solid #b99a45;border-radius:4px;padding:3px;color:#f3ecd8;font:600 12px/1.2 sans-serif;text-align:center;box-shadow:0 3px 8px #000a;position:relative}
#g3cards .card canvas{display:block;width:72px;height:53px;border-radius:2px}
#g3cards .card .cnt{position:absolute;left:4px;top:4px;background:#000b;padding:0 4px;border-radius:3px;font-size:13px}
#g3cards .card .hp{height:5px;background:#000a;border-radius:2px;margin:3px 0 2px;overflow:hidden}#g3cards .card .hp b{display:block;height:100%}
#g3cards .ttl{font:700 13px/1 sans-serif;color:#ffe9a6;text-shadow:0 1px 2px #000;background:#0d1822c8;padding:3px 10px;border-radius:10px}
#g3news{position:absolute;left:50%;top:10px;transform:translateX(-50%);width:min(460px,60%);background:linear-gradient(#1d2f42f2,#101b27f2);border:1px solid #b99a45;border-radius:6px;padding:9px 13px;color:#e8e4d8;font-size:13px;line-height:1.45;pointer-events:auto;box-shadow:0 6px 18px #000b;display:none}
#g3news h3{margin:0 0 5px;font-size:15px;color:#ffe9a6}
#g3leg{position:absolute;left:12px;bottom:146px;max-width:236px;font-size:12px;line-height:1.3;color:#f1f5f9;text-shadow:0 1px 2px #000;background:#0c1721d8;border:1px solid #3b4d5f;padding:4px 9px;border-radius:5px}
`;document.head.appendChild(s);}
function g3UI(){g3Css();const w=document.getElementById('gMapWrap');if(!w)return;let u=document.getElementById('g3ui');if(u)u.remove();u=guEl('div','');u.id='g3ui';w.appendChild(u);
  G3.lab=guEl('div','position:absolute;inset:0');u.appendChild(G3.lab);const md=guEl('div','');md.id='g3modes';G3_MODES.forEach(([k,n])=>{const b=guEl('button','',n);b.type='button';b.dataset.m=k;b.onclick=()=>g3SetMode(k);md.appendChild(b);});u.appendChild(md);
  G3.bn=[];G3.nl=[];G3.natSig="";G3.pl=new Map();G3.sl=[];
  const prio=GCM.P.filter(p=>p.land).sort((a,b)=>(b.cap-a.cap)||(b.wg-a.wg)||(b.tw-a.tw));for(const p of prio){const e=guEl('div','');e.className='b'+(p.cap?' cap':'');G3.lab.appendChild(e);G3.bn.push({el:e,pi:p.i,show:false});}
  for(const p of GCM.P)if(p.sea){const e=guEl('div','');e.className='s';e.textContent=(p.ck?'◆ ':'')+p.n;G3.lab.appendChild(e);G3.sl.push({el:e,pi:p.i,ck:p.ck});}
  const bt=guEl('div','');bt.id='g3btns';u.appendChild(bt);
  const mk=(t,tip,fn,cls)=>{const b=guEl('button','',t);b.type='button';b.title=tip;if(cls)b.className=cls;b.onclick=fn;bt.appendChild(b);return b;};
  mk('✉','Monthly report',()=>g3News(true));mk('⌖','Centre on your capital (Home)',()=>{const m=GC.me&&GC.nat[GC.me];if(m)guCentre(m.cap,1);});
  mk('☰','Show / hide the province panel',()=>{const s=document.getElementById('gSide');if(s){s.style.display=s.style.display==='none'?'flex':'none';setTimeout(guResize,30);}});
  const qb=mk(g3Quality()==='ultra'?'✦✦':'✦','Grand map quality: High (default) / Ultra (sharper, heavier)',()=>{SET.g3q=g3Quality()==='ultra'?'high':'ultra';try{saveSet();}catch(e){}qb.textContent=g3Quality()==='ultra'?'✦✦':'✦';g3ApplyQuality();g3News&&0;});
  G3.endB=mk('▶','Play / pause time (Space)',()=>{guSpeed(GV.spd?0:(GV.lastSpd||2));G3.endB.textContent=GV.spd?'❚❚':'▶';},'end');
  const mc=document.createElement('canvas');mc.id='g3mini';mc.width=240*2;mc.height=120*2;mc.style.width='240px';mc.style.height='120px';u.appendChild(mc);G3.mc=mc;
  const mm=ev=>{const r=mc.getBoundingClientRect();G3.camera.x=Math.max(0,Math.min(2400,(ev.clientX-r.left)/240*2400));G3.camera.z=Math.max(0,Math.min(1200,(ev.clientY-r.top)/120*1200));};
  mc.addEventListener('pointerdown',ev=>{mc.setPointerCapture(ev.pointerId);mm(ev);mc._d=1;ev.stopPropagation();});mc.addEventListener('pointermove',ev=>{if(mc._d)mm(ev);});mc.addEventListener('pointerup',()=>{mc._d=0;});
  mc.addEventListener('contextmenu',ev=>{ev.preventDefault();});
  G3.leg=guEl('div','');G3.leg.id='g3leg';u.appendChild(G3.leg);
  G3.cardsEl=guEl('div','');G3.cardsEl.id='g3cards';u.appendChild(G3.cardsEl);G3.newsEl=guEl('div','');G3.newsEl.id='g3news';u.appendChild(G3.newsEl);G3.newsEl.onclick=()=>{G3.newsEl.style.display='none';};
  g3SetMode(G3.mode,true);}
function g3SetMode(m,quiet){G3.mode=m;document.querySelectorAll('#g3modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const hint={political:'Owner colours at the borders; thin lines mark frontiers.',terrain:'Terrain only, no tint.',trade:'Amber = oil, farms, mines and ports.',supply:'Green = supplied from the capital; red = cut off.',unrest:'Red = restless provinces.',culture:'Colour = culture region; striped = occupied land.',alliances:'Green = you, red = at war with you, grey = neutral.',development:'Darker blue = more developed.'}[m];
  G3.leg.textContent=(G3_MODES.find(x=>x[0]===m)||[0,m])[1]+' — '+hint;if(!quiet&&G3.R){g3PaintOverlay();G3.tOv.needsUpdate=true;G3.miniDirty=true;}}
function g3Icon(cv,k,o){const c=cv.getContext('2d'),W=cv.width,H=cv.height,col=grNat(o).color,rg=grNatRgb(o);const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgb('+rg.map(v=>Math.round(v*.55)).join(',')+')');g.addColorStop(1,'#101a24');c.fillStyle=g;c.fillRect(0,0,W,H);
  c.fillStyle='#e9e4d4';c.strokeStyle='#e9e4d4';c.lineWidth=3;const cx=W/2,cy=H/2;
  if(k==='tank'||/tank|mbt|ifv|apc|veh/.test(k)){c.fillRect(cx-26,cy+4,52,12);c.beginPath();c.ellipse(cx,cy+2,15,9,0,0,7);c.fill();c.fillRect(cx,cy-1,32,4);c.fillStyle='#0008';for(let i=-22;i<=22;i+=11){c.beginPath();c.arc(cx+i,cy+11,4,0,7);c.fill();}}
  else if(k==='arty'||/arty|mlrs|how/.test(k)){c.beginPath();c.moveTo(cx-22,cy+14);c.lineTo(cx+22,cy-14);c.lineWidth=7;c.stroke();c.lineWidth=3;c.beginPath();c.arc(cx-8,cy+14,8,0,7);c.stroke();}
  else if(k==='aa'){c.lineWidth=5;c.beginPath();c.moveTo(cx-6,cy+12);c.lineTo(cx-14,cy-18);c.moveTo(cx+6,cy+12);c.lineTo(cx+14,cy-18);c.stroke();c.fillRect(cx-16,cy+10,32,8);}
  else if(k==='heli'||/heli|chop/.test(k)){c.beginPath();c.ellipse(cx,cy+3,14,8,0,0,7);c.fill();c.fillRect(cx+10,cy+1,22,3);c.fillRect(cx-26,cy-12,52,3);c.fillRect(cx-1,cy-10,3,8);}
  else{c.beginPath();c.arc(cx,cy-9,8,0,7);c.fill();c.beginPath();c.arc(cx,cy-12,10,3.14,6.28);c.fillStyle=col;c.fill();c.fillStyle='#e9e4d4';c.beginPath();c.moveTo(cx-18,cy+20);c.quadraticCurveTo(cx-18,cy+2,cx,cy+2);c.quadraticCurveTo(cx+18,cy+2,cx+18,cy+20);c.fill();if(k==='at'){c.fillRect(cx+8,cy-4,26,5);}}}
function g3CardRow(parent,us,o){const f=grNat(o).fac,by={};for(const r of us){const k=r[0],b=by[k]||(by[k]={n:0,hp:0,xp:0});b.n++;b.hp+=r[1];b.xp+=grRankOf(k,f,r[2]);}
  const row=guEl('div','');row.className='row';for(const k of Object.keys(by)){const b=by[k],hp=Math.round(b.hp/b.n),c=guEl('div','');c.className='card';const cv=document.createElement('canvas');cv.width=124;cv.height=92;g3Icon(cv,k,o);c.appendChild(cv);
    const cn=guEl('div','');cn.className='cnt';cn.textContent='×'+b.n;c.appendChild(cn);const h=guEl('div','');h.className='hp';h.innerHTML='<b style="width:'+hp+'%;background:'+(hp>66?'#6fc24a':hp>33?'#e3b83a':'#d9503f')+'"></b>';c.appendChild(h);
    const nm=guEl('div','',grKindName(f,k)+(b.xp/b.n>=1?' ★':''));nm.style.cssText='white-space:nowrap;overflow:hidden;text-overflow:ellipsis';c.appendChild(nm);c.title=grKindName(f,k)+' ×'+b.n+' — health '+hp+'%';row.appendChild(c);}parent.appendChild(row);}
function g3Cards(){const el=G3.cardsEl;if(!el||!GC)return;el.innerHTML='';const pi=GV.sel,a=GV.selA?GC.armies.find(x=>x.id===GV.selA):null;
  if(pi>=0&&GCM.P[pi]&&GCM.P[pi].land){const L=guProvArmies(pi);if(L.length){const tabs=guEl('div','');tabs.className='row tabs';for(const x of L){const b=guEl('button','',x.nm+' ('+x.u.length+')');b.type='button';if(a&&a.id===x.id)b.className='on';b.onclick=()=>{GV.selA=x.id;guSide();g3Refresh();};tabs.appendChild(b);}el.appendChild(tabs);}}
  if(a){const t=guEl('div','',a.nm+' · '+GCM.nats.get(a.o).name+' · '+a.u.length+' units'+(a.path.length?' · marching':''));t.className='ttl';el.appendChild(t);g3CardRow(el,a.u,a.o);}
  else if(pi>=0&&GC.prov[pi]){const st=GC.prov[pi];if(st.gar.length){const t=guEl('div','','Garrison of '+GCM.P[pi].n+' · '+GCM.nats.get(st.o).name);t.className='ttl';el.appendChild(t);g3CardRow(el,st.gar,st.o);}}}
function g3News(force){const E=G3.newsEl;if(!E||!GC)return;const t=force?GC.turn-1:G3.newsTurn;if(!t||t<1){if(force){E.innerHTML='<h3>Monthly report</h3>Nothing yet - let the first month pass (press Space).';E.style.display='block';}return;}
  const rows=GC.log.filter(r=>r[0]===t).map(r=>r).sort((a,b)=>(b[2]===GC.me)-(a[2]===GC.me));if(!rows.length&&!force)return;
  E.innerHTML='<h3>Report — '+grMonStr(t)+'</h3>'+(rows.slice(0,8).map(r=>'<div style="'+(r[2]&&r[2]===GC.me?'color:#ffe9a6':'opacity:.88')+'">• '+r[1]+'</div>').join('')||'<div style="opacity:.7">A quiet month.</div>')+(rows.length>8?'<div style="opacity:.6">…and '+(rows.length-8)+' more in the log</div>':'')+'<div style="opacity:.5;font-size:11px;margin-top:4px">click to close</div>';
  E.style.display='block';clearTimeout(G3.nt);G3.nt=setTimeout(()=>{if(E)E.style.display='none';},16000);}
function g3Mini(){const F=G3.F,mc=G3.mc;if(!mc||!F)return;if(!G3.mb){const c=document.createElement('canvas');c.width=F.W;c.height=F.H;const x=c.getContext('2d'),im=x.createImageData(F.W,F.H),d=im.data;
    for(let k=0;k<F.W*F.H;k++){const o=k*4,l=F.Ls[k];if(l>.5){const po=F.PW?((Math.floor(((k/F.W)|0)*F.PH/F.H))*F.PW+Math.floor((k%F.W)*F.PW/F.W))*4:o;d[o]=F.px[po];d[o+1]=F.px[po+1];d[o+2]=F.px[po+2];}else{const s=Math.min(1,F.Lw[k]*1.4);d[o]=14+s*50;d[o+1]=44+s*80;d[o+2]=78+s*70;}d[o+3]=255;}x.putImageData(im,0,0);G3.mb=c;G3.mo=document.createElement('canvas');G3.mo.width=F.W;G3.mo.height=F.H;}
  if(G3.miniDirty&&G3.ov){const x=G3.mo.getContext('2d'),im=x.createImageData(F.W,F.H);im.data.set(G3.ov);x.putImageData(im,0,0);G3.miniDirty=false;}
  const c=mc.getContext('2d'),W=mc.width,H=mc.height;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);c.imageSmoothingEnabled=true;c.drawImage(G3.mb,0,0,W,H);if(G3.mo)c.drawImage(G3.mo,0,0,W,H);
  const k=W/2400,pts=[[0,0],[GV.w,0],[GV.w,GV.h],[0,GV.h]].map(q=>g3Ground(q[0],q[1])||g3Ground(q[0],GV.h*.3));c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();pts.forEach((q,i)=>{if(!q)return;const X=Math.max(0,Math.min(2400,q[0]))*k,Y=Math.max(0,Math.min(1200,q[1]))*k;i?c.lineTo(X,Y):c.moveTo(X,Y);});c.closePath();c.stroke();
  for(const a of GC.armies){if(a.o!==GC.me&&GC.me)continue;const p=GCM.P[a.at];c.fillStyle=a.id===GV.selA?'#ffe27a':'#fff';c.fillRect(p.x*k-2,p.y*k-2,5,5);}}
// ---- camera, picking, input glue (called from 13c-grandui.js when GV.g3)
function g3CamApply(c){const cam=G3.cam,cp=Math.cos(c.pitch),y0=Math.max(0,g3HeightAt(c.x,c.z))*.6;cam.position.set(c.x+c.d*Math.sin(c.yaw)*cp,y0+c.d*Math.sin(c.pitch),c.z+c.d*Math.cos(c.yaw)*cp);cam.lookAt(c.x,y0,c.z);cam.updateMatrixWorld();if(G3.sky)G3.sky.position.copy(cam.position);}
function g3Ground(sx,sy){const cam=G3.cam;if(!cam)return null;const v=new THREE.Vector3(sx/GV.w*2-1,-(sy/GV.h)*2+1,.5).unproject(cam),o=cam.position,d=v.sub(o).normalize();if(d.y>=-1e-4)return null;let y=1,X=0,Z=0;
  for(let i=0;i<4;i++){const t=(y-o.y)/d.y;X=o.x+d.x*t;Z=o.z+d.z*t;y=Math.max(0,g3HeightAt(X,Z));}return [X,Z];}
function g3Fit(R){const c=G3.camera,r=R||[0,0,2400,1200],asp=GV.w/Math.max(1,GV.h),th=Math.tan(18*Math.PI/180);c.x=r[0]+r[2]/2;c.z=r[1]+r[3]/2+r[3]*.12;c.d=Math.max(40,Math.min(2300,Math.max(r[2]/(2*th*asp)*.82,r[3]/(2*th)*1.25)));}
function g3Centre(pi,z){const p=GCM.P[pi],c=G3.camera,tw=!p.sea?g3Towns().find(t=>t.pi===pi):null;c.x=tw?tw.x:p.x;c.z=(tw?tw.z:p.y)+10;if(z)c.d=Math.max(90,Math.min(2300,z>=2?360:z>=1?520:900));}
function g3Wheel(ev){const c=G3.camera,r=GV.cv.getBoundingClientRect(),g=g3Ground(ev.clientX-r.left,ev.clientY-r.top),f=Math.exp(ev.deltaY*.0013),nd=Math.max(70,Math.min(2300,c.d*f));
  if(g){const k=1-nd/c.d;c.x+=(g[0]-c.x)*k*.9;c.z+=(g[1]-c.z)*k*.9;}c.d=nd;G3.moved=true;}
function g3Drag(ev,mx,my){const d=GV.drag;if(!d)return;if(d.btn===1){const c=G3.camera,cc=G3.cc;c.yaw=cc.yaw=d.yaw-(ev.clientX-d.x)*.006;c.pitch=cc.pitch=Math.max(.45,Math.min(1.3,d.pitch+(ev.clientY-d.y)*.004));G3.moved=true;return;}
  const g=g3Ground(mx,my);if(!g||!d.g)return;const c=G3.camera,cc=G3.cc;c.x=cc.x=Math.max(0,Math.min(2400,cc.x+d.g[0]-g[0]));c.z=cc.z=Math.max(0,Math.min(1200,cc.z+d.g[1]-g[1]));G3.moved=true;}
function g3HitAt(mx,my){let best=null,bd=1e9;for(const h of G3.hit){const inBox=h.y0!=null&&Math.abs(mx-h.x)<=h.w&&my>=h.y0&&my<=h.y1;const dd=Math.hypot(mx-h.x,my-h.y);if((inBox||dd<h.r)&&dd<bd){bd=dd;best=h;}}return best;}
function g3Click(mx,my){const best=g3HitAt(mx,my);
  if(best){const a=GC.armies.find(x=>x.id===best.aid);GV.selA=best.aid;if(a)GV.sel=a.at;guSide();g3Refresh();return;}
  const g=g3Ground(mx,my);if(!g)return;const h=guProvAt(g[0],g[1]);GV.sel=h;if(GV.selA){const a=GC.armies.find(x=>x.id===GV.selA);if(!a||a.at!==h)GV.selA=0;}guSide();g3Refresh();}
function g3Refresh(){G3.sig='';G3.arrowDirty=true;}
function g3AfterTurn(){G3.animOK=true;G3.newsTurn=GC.turn-1;g3SyncArmies();G3.animOK=false;g3PaintOverlay();if(G3.tOv)G3.tOv.needsUpdate=true;G3.miniDirty=true;g3Refresh();g3News();}
function g3Refreshed(){if(!G3.R)return;g3SyncArmies();g3PaintOverlay();if(G3.tOv)G3.tOv.needsUpdate=true;G3.miniDirty=true;g3Refresh();if(G3.endB)G3.endB.disabled=GC.ph!=='plan'||!!GC.over;}
function g3Labels(force){const cam=G3.cam,w=GV.w,h=GV.h,cc=G3.cc,d=cc.d,v=new THREE.Vector3(),occ=new Set();
  const proj=(x,y,z)=>{v.set(x,y,z).project(cam);if(v.z>1||v.z<-1)return null;const X=(v.x*.5+.5)*w,Y=(-v.y*.5+.5)*h;if(X<-60||Y<-40||X>w+60||Y>h+40)return null;return [X,Y];};
  const put=(el,q,dx,dy)=>{const t='translate('+Math.round(q[0]+(dx||0))+'px,'+Math.round(q[1]+(dy||0))+'px)';if(el._t!==t){el._t=t;el.style.left='0';el.style.top='0';el.style.transform='translate(-50%,-100%) '+t;}};
  const putC=(el,q)=>{const t='translate('+Math.round(q[0])+'px,'+Math.round(q[1])+'px)';if(el._t!==t){el._t=t;el.style.transform='translate(-50%,-50%) '+t;}};
  const vis=(el,f)=>{if(!el)return;const s=f?'block':'none';if(el._v!==s){el._v=s;el.style.display=s;}};
  // nation names across the land when zoomed out
  if(force||G3.natSig!==GC.seed+'|'+GC.turn+'|'+GC.armies.length+'|'+G3.nl.length){G3.natSig=GC.seed+'|'+GC.turn+'|'+GC.armies.length+'|'+G3.nl.length;const ar=g3PArea(),by={};for(const p of GCM.P)if(p.land){const o=GC.prov[p.i].o;(by[o]||(by[o]=[])).push(p);}
    // realmap: label at the area-weighted heart of the nation's main landmass (far islands and overseas land don't drag it into the ocean)
    G3.nat=Object.keys(by).map(o=>{const ps=by[o],R=200;let best=ps[0],bv=-1;for(const p of ps){let v=0;for(const q of ps)if(Math.abs(q.x-p.x)<R&&Math.abs(q.y-p.y)<R)v+=ar[q.i];if(v>bv){bv=v;best=p;}}
      let x=0,z=0,w=0;for(const q of ps)if(Math.abs(q.x-best.x)<R&&Math.abs(q.y-best.y)<R){x+=q.x*ar[q.i];z+=q.y*ar[q.i];w+=ar[q.i];}return {o,x:x/w,z:z/w,n:ps.length};});
    while(G3.nl.length<G3.nat.length){const e=guEl('div','');e.className='n';G3.lab.appendChild(e);G3.nl.push(e);}G3.nat.forEach((r,i)=>{G3.nl[i].textContent=GCM.nats.get(r.o).name.toUpperCase();});}
    const rects=[],hit=(x0,y0,x1,y1)=>{for(const r of rects)if(x0<r[2]&&x1>r[0]&&y0<r[3]&&y1>r[1])return true;rects.push([x0,y0,x1,y1]);return false;};   /* C-LABELS: one shared collision list, nation names first, then banners by priority */
  const nord=G3.nat.map((r,i)=>i).sort((i,j)=>G3.nat[j].n-G3.nat[i].n);const shownN=new Set();
  for(const i of nord){const r=G3.nat[i],e=G3.nl[i];if(!e)continue;const f=d>760&&(r.n>=2||d<1300)&&(GCM.P.length&&(grNat(r.o).major||r.n>=3||d<1000));let q=f?proj(r.x,3,r.z):null;
    if(q){const fs=Math.max(10,Math.min(22,5+r.n*2.2+(d>1400?0:3))),tw=(e.textContent||'').length*fs*.98+14;if(hit(q[0]-tw/2,q[1]-fs*.6,q[0]+tw/2,q[1]+fs*.6))q=null;else{e.style.fontSize=fs+'px';e.style.opacity=Math.min(.9,Math.max(0,(d-760)/300));putC(e,q);}}vis(e,!!q);}
  for(let i=G3.nat.length;i<G3.nl.length;i++)vis(G3.nl[i],false);
  // province banners
  const cand=[];
  for(const b of G3.bn){const p=GCM.P[b.pi],st=GC.prov[b.pi];let q=null;const big=p.cap||p.wg;
    if(d<1700&&(d<620||(d<1000&&(big||p.tw>=3))||(d<1700&&p.cap))){const tw=g3Towns().find(t=>t.pi===b.pi),x=tw?tw.x:p.x,z=tw?tw.z:p.y;q=proj(x,g3HeightAt(x,z)+9+(p.cap?3:0),z);}
    if(!q){vis(b.el,false);continue;}
    const own=GC.nat[st.o]&&GC.nat[st.o].cap===b.pi,pri=(b.pi===GV.sel||st.o===GC.me&&p.cap)?6:own?(grNat(st.o).major?4:3):p.cap?3:p.wg?2:p.tw>=3?1:0;
    cand.push({b,q,p,st,own,pri});}
  cand.sort((u,w)=>w.pri-u.pri);
  for(const c of cand){const {b,q,p,st,own}=c,wd=(p.n.length+(own?2:0))*7.4+46;
    if(c.pri<6&&hit(q[0]-wd/2,q[1]-26,q[0]+wd/2,q[1]+2)){vis(b.el,false);continue;}if(c.pri>=6)rects.push([q[0]-wd/2,q[1]-26,q[0]+wd/2,q[1]+2]);
    const html='<i style="background:'+grNat(st.o).color+'"></i>'+(own?'★ ':'')+p.n+(GC.me&&st.o===GC.me&&st.un>55?' <span style="color:#ff8d7c">!</span>':'')+geIcons(b.pi);if(b.h!==html){b.h=html;b.el.innerHTML=html;}
    put(b.el,q);vis(b.el,true);}
  for(const s of G3.sl){const p=GCM.P[s.pi],f=s.ck?d<1500:d<650;let q=f?proj(p.x,1,p.y):null;if(!q){vis(s.el,false);continue;}putC(s.el,q);vis(s.el,true);}
  // army plates + click targets
  G3.hit=[];const s=G3.sc_s;
  /* C-LABELS: army count plates — yours/selected first, then others; a plate that would sit on another one is hidden (zoom in to split the stack) */
  const plOK=new Set();{const pr=[],pq=[];for(const a of GC.armies){const e=G3.arm.get(a.id);if(!e||!grSeen(a))continue;const q=proj(e.g.position.x,e.g.position.y+(e.sea?6:3)*s,e.g.position.z);if(q)pr.push({a,q,k:a.id===GV.selA?2:a.o===GC.me?1:0});}
    pr.sort((u,w)=>w.k-u.k);for(const r of pr){let bad=false;if(r.k<1)for(const o of pq)if(Math.abs(o[0]-r.q[0])<30&&Math.abs(o[1]-r.q[1])<20){bad=true;break;}if(!bad){plOK.add(r.a.id);pq.push(r.q);}}}
  for(const a of GC.armies){const e=G3.arm.get(a.id);if(!e)continue;let pl=G3.pl.get(a.id);if(!pl){pl=guEl('div','');pl.className='p';G3.lab.appendChild(pl);G3.pl.set(a.id,pl);}
    const q=proj(e.g.position.x,e.g.position.y+(e.sea?6:3)*s,e.g.position.z),top=proj(e.g.position.x,e.g.position.y+13*s,e.g.position.z),mine=a.o===GC.me,sel=a.id===GV.selA;
    if(!q||!grSeen(a)){vis(pl,false);e.g.visible=!!q&&grSeen(a);continue;}e.g.visible=true;   /* laneA RG3 fog hook */
    {const ft=proj(e.g.position.x,e.g.position.y+28*s,e.g.position.z),yT=ft?ft[1]:(top?top[1]:q[1]-40);   // whole figure is the target: flag top → number badge (Abdullah 19:58 "not being able to click on armies or navies")
     G3.hit.push({aid:a.id,x:q[0],y:top?(q[1]+top[1])/2:q[1],r:Math.max(16,top?Math.abs(q[1]-top[1])*.7:16),y0:Math.min(yT,q[1])-10,y1:q[1]+38,w:Math.max(24,top?Math.abs(q[1]-top[1])*.6:24)});}
    const show=(d<1100||mine||sel)&&plOK.has(a.id);if(show){const t=''+a.u.length;let hs=0,ms=0;for(const u of a.u){hs+=u.hp||0;ms+=u.max||0;}const st=ms>0?Math.max(0,Math.min(100,Math.round(100*hs/ms))):100;const mo=Math.max(0,Math.min(100,Math.round(a.mor==null?100:a.mor)));if(pl._h!==t+(mine?1:0)+(sel?1:0)+'|'+st+'|'+mo){pl._h=t+(mine?1:0)+(sel?1:0)+'|'+st+'|'+mo;pl.style.setProperty('--mo',mo+'%');pl.style.setProperty('--mc',mo>60?'#6aa8ff':mo>30?'#e0b73c':'#d9534f');pl.style.setProperty('--st',st+'%');pl.style.setProperty('--sc',st>66?'#6fcf6f':st>33?'#e0b73c':'#d9534f');pl.textContent=t;pl.className='p'+(mine?' me':'')+(sel?' sel':'');}putC(pl,[q[0],q[1]+12]);pl.style.transform='translate(-50%,0) translate('+Math.round(q[0])+'px,'+Math.round(q[1]+16)+'px)';}vis(pl,show);}
  for(const [id,pl] of G3.pl)if(!G3.arm.has(id)){pl.remove();G3.pl.delete(id);}}
function g3Frame(ts){G3.raf=requestAnimationFrame(g3Frame);if(!G3.R||!GV.cv||!document.body.contains(GV.cv)||!GC){if(!GV.cv||!document.body.contains(GV.cv))g3Dispose();return;}
  const scr=document.getElementById('grandScreen');if(!scr||scr.style.display==='none'){G3.last=0;return;}
  const dt=G3.last?Math.min(.1,(ts-G3.last)/1000):.016;G3.last=ts;G3.time+=dt;g3Adapt(dt);if(!G3.miniSync&&G3.miniReady){G3.miniSync=1;try{g3SyncArmies();}catch(e){console.warn(e);}}
  // keys
  const c=G3.camera,K=G3.keys;if(K.size&&!document.getElementById('gModal')){const sp=c.d*.9*dt,sy=Math.sin(c.yaw),cy=Math.cos(c.yaw);let fx=0,fz=0;if(K.has('w')||K.has('arrowup'))fz-=1;if(K.has('s')||K.has('arrowdown'))fz+=1;if(K.has('a')||K.has('arrowleft'))fx-=1;if(K.has('d')||K.has('arrowright'))fx+=1;
    c.x=Math.max(0,Math.min(2400,c.x+(fx*cy+fz*sy)*sp));c.z=Math.max(0,Math.min(1200,c.z+(-fx*sy+fz*cy)*sp));if(K.has('q'))c.yaw+=dt*1.2;if(K.has('e'))c.yaw-=dt*1.2;if(K.has('r'))c.pitch=Math.min(1.3,c.pitch+dt*.8);if(K.has('f'))c.pitch=Math.max(.45,c.pitch-dt*.8);if(K.has('+')||K.has('='))c.d*=1-dt*1.5;if(K.has('-'))c.d*=1+dt*1.5;}
  c.d=Math.max(32,Math.min(2300,c.d));const cc=G3.cc,kk=Math.min(1,dt*11);let mv=0;for(const k of ['x','z','d','yaw','pitch']){const df=c[k]-cc[k];if(Math.abs(df)>1e-3){cc[k]+=df*kk;mv=1;}}if(mv||G3.moved){g3CamApply(cc);G3.moved=false;mv=1;}
  const s=Math.max(.45,Math.min(3.6,cc.d/330));   /* realmap: provinces are real-sized, so figures shrink further when zoomed in */G3.sc_s=s;G3.U.uRim.value=Math.max(1.2,Math.min(4,cc.d/420));G3.U.uTime.value=G3.time;(G3.flagT||(G3.flagT={value:0})).value=G3.time;if(G3.chimU){G3.chimU.uT.value=G3.time;G3.chimU.uPx.value=(G3.R.domElement.height||900)*.9;G3.chim.visible=cc.d<1100;}
  G3.U.uSel.value=GV.sel>=0?GV.sel:-1;G3.U.uHov.value=GV.hov>=0&&GV.hov!==GV.sel?GV.hov:-1;
  // armies
  const anc=g3Anchors(s);let anim=0;for(const a of GC.armies){const e=G3.arm.get(a.id);if(!e)continue;const t=anc.get(a.id);if(!t)continue;
    if(e.tt<1){e.tt=Math.min(1,e.tt+dt/1.5);const k=e.tt*e.tt*(3-2*e.tt);e.x=e.fx+(t[0]-e.fx)*k;e.z=e.fz+(t[1]-e.fz)*k;anim=1;e.face=Math.atan2(t[0]-e.fx,t[1]-e.fz);}
    else if(e.mv){e.x=t[0];e.z=t[1];e.mv=0;}else{e.x+=(t[0]-e.x)*Math.min(1,dt*8);e.z+=(t[1]-e.z)*Math.min(1,dt*8);}
    const y=e.sea?.5+Math.sin(G3.time*1.4+e.aid)*.35:Math.max(.3,g3HeightAt(e.x,e.z))+(e.tt<1?Math.abs(Math.sin(G3.time*9))*.5:0);e.g.position.set(e.x,y,e.z);e.g.scale.setScalar(s*(e.sea?1.1:1));e.g.rotation.y=cc.yaw;{const f=e.g.children[1];if(f&&!e.sea)f.scale.setScalar(Math.max(.5,Math.min(1,cc.d/300)));}
    if(e.sea)e.g.children[0].rotation.y=Math.PI/2*0;}
  // selection ring
  const sa=GV.selA&&G3.arm.get(GV.selA);if(sa){G3.ringM.visible=true;G3.ringM.position.set(sa.x,sa.g.position.y+.4,sa.z);G3.ringM.scale.setScalar(s*(sa.sea?7:5)*(1+.06*Math.sin(G3.time*4)));}else G3.ringM.visible=false;
  const sig=GV.selA+'|'+GV.sel+'|'+GC.turn+'|'+GC.armies.length+'|'+GC.armies.reduce((a,x)=>a+x.u.length+x.path.length,0);
  if(sig!==G3.sig||G3.arrowDirty){G3.sig=sig;G3.arrowDirty=false;g3BuildArrows();g3Cards();G3.miniDirty=G3.miniDirty||0;}
  if(G3.ship)g3ShipTick(dt,s);
  G3.R.render(G3.sc,G3.cam);if(G3.vigS){const ac=G3.R.autoClear;G3.R.autoClear=false;G3.R.render(G3.vigS,G3.vigC);G3.R.autoClear=ac;}
  if(mv||anim||G3.lblDirty||(G3.lf=(G3.lf||0)+1)%20===0){g3Labels(false);G3.lblDirty=false;}
  if(mv||(G3.lf%12===0)||G3.miniDirty)g3Mini();}
if(!window._g3Keys){window._g3Keys=1;const ok=ev=>{const t=ev.target&&ev.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return false;const sc=document.getElementById('grandScreen');return !!sc&&sc.style.display!=='none'&&GV.g3&&!G;};
  addEventListener('keydown',ev=>{if(!ok(ev)||ev.ctrlKey||ev.metaKey||ev.altKey)return;const k=ev.key.toLowerCase();if('wasdqerf'.includes(k)&&k.length===1||k.startsWith('arrow'))G3.keys.add(k);if(k==='home'){const m=GC&&GC.me&&GC.nat[GC.me];if(m)guCentre(m.cap,1);}});
  addEventListener('keyup',ev=>{G3.keys.delete(ev.key.toLowerCase());});addEventListener('blur',()=>G3.keys.clear());}
(function g3Credits(){try{if(document.getElementById('neCred'))return;const ps=[...document.querySelectorAll('p.credits')];if(!ps.length)return;
  const p=document.createElement('p');p.className='credits';p.id='neCred';p.textContent='Grand map countries, provinces (admin-1), coastlines, lakes and rivers: Natural Earth (public domain, naturalearthdata.com), Equal Earth projection. Grand map ground detail textures are generated in-game (original, no outside assets). Grand map elevation and sea depth: Terrarium terrain tiles (Mapzen / AWS Open Data; derived from ETOPO1, GEBCO, SRTM and other public datasets). Painted ground colour and shaded relief: Natural Earth HYP_HR_SR_OB_DR cross-blended hypsometric tints (public domain).';ps[ps.length-1].insertAdjacentElement('afterend',p);}catch(e){}})();
