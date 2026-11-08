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
  A.conifer=g3Merge([[cyl(.3,.4,1.6,5),g3M(0,.8,0),tr],[cone(1.7,3,11),g3M(0,2.8,0),[.1,.28,.15]],[cone(1.35,2.6,11),g3M(0,4.4,0),[.12,.32,.17]],[cone(.9,2.2,11),g3M(0,5.8,0),[.15,.36,.2]]]);
  A.broad=g3Merge([[cyl(.35,.5,2.2,7),g3M(0,1.1,0),tr],[new THREE.SphereGeometry(1.9,9,7),g3M(0,3.7,0,1,.9,1),[.22,.46,.18]],[new THREE.SphereGeometry(1.3,8,6),g3M(.9,3,.4),[.28,.52,.2]],[new THREE.SphereGeometry(1.1,8,6),g3M(-1,3.2,-.5),[.2,.42,.17]]]);   // rounded smooth canopies (gterrain)
  A.palm=g3Merge([[cyl(.16,.3,5.2,5),g3M(0,2.6,0),[.62,.5,.32]],...[0,1,2,3,4,5].map(i=>[cone(.5,3.2,3),g3M(Math.cos(i*1.047)*1.4,5.3,Math.sin(i*1.047)*1.4,1,1,1,0,0,0).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(i*1.047)*1.2,0,-Math.cos(i*1.047)*1.2))),[.25,.5,.2]])]);
  A.scrub=g3Merge([[new THREE.SphereGeometry(1,8,6),g3M(0,.4,0,1.4,.6,1.2),[.5,.5,.28]],[new THREE.SphereGeometry(.7,7,5),g3M(.8,.25,.3,1,.5,1),[.45,.46,.25]]]);
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
  let TI=0;   /* gclarity (Abdullah 2026-11-07 19:52 "way too busy"): tier 0 = the one core cluster per province (more for capitals/megacities), tier 1 = ground pads, fields and outlying houses/towns — shown only at close zoom (g3TownLOD) */
  const push=(k,x,z,sx,sy,sz,ry,col)=>{const h=g3HeightAt(x,z),ti=(k==='disc'||k==='field')?1:TI;by[k].push([x,h,z,sx,sy,sz,ry,col,ti]);if(SHK[k]){const len=sy*2*(k==='tower'||k==='spire'?1.2:1)+sx*.6;SHD.push([x+sdx*len*.4,h+.2,z+sdz*len*.4,sx*.95,1,len,sth,[1,1,1],ti]);}};
  for(const t of T){const p=GCM.P[t.pi],sc=t.sc||1,SP=4.5*sc,R=Math.sqrt(t.n*SP*SP/3.14)+3.5*sc;push('disc',t.x,t.z,R*.82,1,R*.82,0,[1.22,1.18,1.08]);
    if(t.cap||p.wg&&t.t===0)by.wall.push([t.x,g3HeightAt(t.x,t.z),t.z,R+2,1,R+2,0,[1,1,1],1]);const CORE=t.mega?99:t.cap?10:4;
    const th=g3Hash(t.pi,t.t+31)*3.1416,ct=Math.cos(th),st=Math.sin(th),R2=Math.ceil(R/SP)+1,cells=[];
    for(let i=-R2;i<=R2;i++)for(let j=-R2;j<=R2;j++){if(i%4===0&&j%4===0&&(i||j))continue;if(i===0&&j!==0&&Math.abs(j)%2===1)continue;const d=Math.hypot(i,j)+(g3Hash(i+9,j+t.pi)-.5)*1.1;if(d*SP>R)continue;cells.push([i,j,d]);}
    cells.sort((u,v)=>u[2]-v[2]);let k=0;
    for(const [i,j] of cells){if(k>=t.n)break;TI=(t.t>0&&!t.mega)||k>=CORE?1:0;if(g3Hash(i*7+3,j+t.pi)<.1)continue;const lx=(i+(g3Hash(i,j+4)-.5)*.35)*SP,lz=(j+(g3Hash(j,i+5)-.5)*.35)*SP+(i%2?SP*.2:0),x=t.x+lx*ct-lz*st,z=t.z+lx*st+lz*ct;if(g3HeightAt(x,z)<.7)continue;
      const TN=[[1,1,1],[.96,.9,.8],[.86,.94,1],[1,.88,.84],[.9,1,.9],[1.06,1.06,1.08],[1,.84,.62],[.9,.78,.68]][Math.floor(g3Hash(k+5,t.pi+2)*8)],hv=g3Hash(i+k,t.pi+4),s=(2.5+g3Hash(k,t.pi)*1.1)*sc,ry=-th+(g3Hash(k,k+i)-.5)*.14+(g3Hash(i,j)<.5?0:Math.PI),v=.86+g3Hash(k+3,t.t)*.28;
      let kind=t.flat?(hv<.5?'court':'flat'):(hv<.4?'house':hv<.75?'gable':'row'),sy=s*(t.flat?.45+hv*.35:.85+hv*.3);const fw=.82+g3Hash(k+11,t.pi+7)*.46,fd=.8+g3Hash(k+13,t.pi+9)*.42;
      if(k===0&&(t.cap||t.t===0)){kind=t.flat?'mosque':'spire';sy=s*.8;}else if(t.mega&&t.t===0&&k<4&&k%2===1){kind='tower';sy=s*1.05;}else if(t.cap&&k%7===4){kind=t.flat?'court':'row';sy=s*1.5;}
      push(kind,x,z,kind==='mosque'?s*.8:s*fw,sy,kind==='mosque'?s*.8:s*fd,ry,[v*TN[0],v*TN[1],v*TN[2]]);k++;}
    TI=0;if(p.oil&&t.t===0)for(let k=0;k<3;k++)push('derrick',t.x+(20+k*8)*sc,t.z+(-18+k*4)*sc,1.7*sc,1.7*sc,1.7*sc,k*.7,[1,1,1]);
    if(p.farm&&t.t===0)for(let k=0;k<4;k++)push('field',t.x+(-24+(k%2)*11)*sc,t.z+(18+(k>>1)*8)*sc,5*sc,1,5*sc,0,[.7+g3Hash(k,p.i)*.4,1,.8]);
    if(p.mine&&t.t===0)for(let k=0;k<2;k++)push('spoil',t.x+(8+k*7)*sc,t.z+24*sc,2.4*sc,2*sc,2.4*sc,0,[1,1,1]);
    if(p.port&&t.t===0){for(let a=0;a<16;a++){const ang=a/16*6.283;let ok=false;for(let r=8*sc;r<46*sc;r+=3*sc){const X=t.x+Math.cos(ang)*r,Z=t.z+Math.sin(ang)*r;if(g3HeightAt(X,Z)<-.2){push('pier',X-Math.cos(ang)*3*sc,Z-Math.sin(ang)*3*sc,10*sc,1,6*sc,-ang,[1,1,1]);ok=true;break;}}if(ok)break;}}}
  const col=new THREE.Color();G3.townIM=[];G3.townLod=-1;
  for(const k of Object.keys(by)){const L=by[k];if(!L.length)continue;L.sort((u,v)=>u[8]-v[8]);const m=new THREE.InstancedMesh(A[k],G3.matLit,L.length),M=new THREE.Matrix4();m.userData.n0=L.filter(r=>!r[8]).length;m.userData.nAll=L.length;G3.townIM.push(m);
    L.forEach((r,i)=>{M.compose(new THREE.Vector3(r[0],r[1],r[2]),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r[6]),new THREE.Vector3(r[3],r[4],r[5]));m.setMatrixAt(i,M);col.setRGB(r[7][0],r[7][1],r[7][2]);m.setColorAt(i,col);});
    m.instanceMatrix.needsUpdate=true;m.castShadow=false;grp.add(m);}
  SHD.sort((u,v)=>u[8]-v[8]);
  if(SHD.length){const sm=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.05,1),new THREE.MeshBasicMaterial({color:0x1a1208,transparent:true,opacity:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),SHD.length),M=new THREE.Matrix4();
    SHD.forEach((r,i)=>{M.compose(new THREE.Vector3(r[0],r[1],r[2]),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r[6]),new THREE.Vector3(r[3],r[4],r[5]));sm.setMatrixAt(i,M);});
    sm.instanceMatrix.needsUpdate=true;sm.castShadow=false;sm.renderOrder=2;sm.userData.n0=SHD.filter(r=>!r[8]).length;sm.userData.nAll=SHD.length;G3.townIM.push(sm);grp.add(sm);}}
/* gclarity: what the towns show per zoom — close (< G3_CLOSE): everything; region and above: one core cluster per province, no ground pads / walls / fields */
const G3_CLOSE=200;
function g3TownLOD(d){const close=d<G3_CLOSE?1:0;if(G3.townLod===close||!G3.townIM)return;G3.townLod=close;for(const m of G3.townIM){const n=close?m.userData.nAll:m.userData.n0;m.count=n;m.visible=n>0;}}
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
// life: warm city lights (lamp glow in every town, bigger halos on capitals/megacities; additive points, one draw call, twinkle in the shader)
function g3BuildLights(grp){const T=g3Towns(),pos=[],ph=[],sz=[];
  for(const t of T){const n=t.cap?9:t.mega?8:t.t===0?4:2,R=(t.cap?15:t.mega?13:8)*(t.sc||1);
    for(let k=0;k<n;k++){const a=g3Hash(t.pi*5+k,t.t+3)*6.283,r=Math.sqrt(g3Hash(k+9,t.pi+t.t))*R,x=t.x+Math.cos(a)*r,z=t.z+Math.sin(a)*r;
      pos.push(x,g3HeightAt(x,z)+2.2,z);ph.push(g3Hash(k,t.pi*7+t.t)*6.283);sz.push(.6+g3Hash(k+2,t.pi)*.5);}
    if(t.cap||t.mega){pos.push(t.x,g3HeightAt(t.x,t.z)+3,t.z);ph.push(0);sz.push(t.cap?5.5:4);}}   // big soft halo (size > 3 = halo)
  if(!pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aPh',new THREE.Float32BufferAttribute(ph,1));g.setAttribute('aSz',new THREE.Float32BufferAttribute(sz,1));
  const U=G3.lightU={uT:{value:0},uPx:{value:900},uFar:{value:0},uNight:{value:0}};
  const m=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`uniform float uT,uPx,uFar,uNight;attribute float aPh,aSz;varying float vA;varying float vH;
    void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float halo=step(3.,aSz);vH=halo;float tw=.8+.2*sin(uT*(1.3+aPh*.3)+aPh*9.);
    float s=halo>.5?aSz*(7.+uFar*5.):aSz*2.2;gl_PointSize=clamp(s*uPx/-mv.z,halo>.5?6.:2.5,halo>.5?150.:14.);vA=(halo>.5?(.3+.2*uFar)*(.5+1.8*uNight):.55+.6*uNight)*tw;}`,
    fragmentShader:`varying float vA;varying float vH;void main(){vec2 q=gl_PointCoord-.5;float d=length(q);if(d>.5)discard;float f=1.-smoothstep(0.,.5,d);f=vH>.5?f*f:f*f*f;gl_FragColor=vec4(vec3(1.,.74,.38)*(vH>.5?.9:1.1),f*vA);}`});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=7;grp.add(pts);G3.lights=pts;}
// ---- chunked terrain LOD (gterrain): 4x2 chunks of 600 units (few draw calls), step 3 near / 6 mid / 8 far, analytic smooth normals, skirts hide LOD cracks, off-screen chunks are culled
const G3_CH=600,G3_LODS=[3,6,8],G3_LODR=[380,950];
function g3TerrChunk(ci,cj,step){const n=G3_CH/step,V=n+1,ox=ci*G3_CH,oz=cj*G3_CH,e=5,nsk=4*n+4,NV=V*V+nsk*2;
  const pos=new Float32Array(NV*3),nor=new Float32Array(NV*3),uv=new Float32Array(NV*2),ix=new Uint32Array((n*n+4*n)*6);
  const put=(q,x,z,drop)=>{const h=(4*g3HeightAt(x,z)+g3HeightAt(x-2,z)+g3HeightAt(x+2,z)+g3HeightAt(x,z-2)+g3HeightAt(x,z+2))/8,nx=g3HeightAt(x-e,z)-g3HeightAt(x+e,z),nz=g3HeightAt(x,z-e)-g3HeightAt(x,z+e),l=Math.hypot(nx,2*e,nz);
    pos[q*3]=x;pos[q*3+1]=h-drop;pos[q*3+2]=z;nor[q*3]=nx/l;nor[q*3+1]=2*e/l;nor[q*3+2]=nz/l;uv[q*2]=x/2400;uv[q*2+1]=z/1200;};
  for(let j=0;j<V;j++)for(let i=0;i<V;i++)put(j*V+i,ox+i*step,oz+j*step,0);
  let t=0;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*V+i,b=a+1,c=a+V,d=c+1;ix[t++]=a;ix[t++]=c;ix[t++]=b;ix[t++]=b;ix[t++]=c;ix[t++]=d;}
  let sk=V*V;const edge=[];for(let i=0;i<=n;i++)edge.push(i);for(let j=1;j<=n;j++)edge.push(j*V+n);for(let i=n-1;i>=0;i--)edge.push(n*V+i);for(let j=n-1;j>=1;j--)edge.push(j*V);   // ring of boundary vertices
  const ring=edge.length,base=sk;for(let k=0;k<ring;k++){const q=edge[k];put(sk++,pos[q*3],pos[q*3+2],8);}
  for(let k=0;k<ring;k++){const a=edge[k],b=edge[(k+1)%ring],sa=base+k,sb=base+(k+1)%ring;ix[t++]=a;ix[t++]=b;ix[t++]=sa;ix[t++]=b;ix[t++]=sb;ix[t++]=sa;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(new THREE.BufferAttribute(ix.subarray(0,t),1));
  g.boundingSphere=new THREE.Sphere(new THREE.Vector3(ox+G3_CH/2,30,oz+G3_CH/2),G3_CH*.72+40);return g;}
function g3TerrInit(sc,mat){const grp=new THREE.Group(),ch=[];for(let cj=0;cj<1200/G3_CH;cj++)for(let ci=0;ci<2400/G3_CH;ci++){const m=new THREE.Mesh(g3TerrChunk(ci,cj,G3_LODS[2]),mat);m.userData={ci,cj,lod:2,geo:[null,null,m.geometry]};ch.push(m);grp.add(m);}
  G3.terr=grp;G3.terrCh=ch;sc.add(grp);g3TerrLOD(0);}
function g3TerrLOD(maxBuild){const cam=G3.cam,C=G3.terrCh;if(!cam||!C)return;let built=0;const p=cam.position;
  for(const m of C){const u=m.userData,cx=u.ci*G3_CH+G3_CH/2,cz=u.cj*G3_CH+G3_CH/2,d=Math.hypot(Math.max(0,Math.abs(cx-p.x)-G3_CH*.5),p.y*.7,Math.max(0,Math.abs(cz-p.z)-G3_CH*.5)),want=d<G3_LODR[0]?0:d<G3_LODR[1]?1:2;
    if(want===u.lod)continue;if(!u.geo[want]){if(built>=(maxBuild==null?5:maxBuild))continue;u.geo[want]=g3TerrChunk(u.ci,u.cj,G3_LODS[want]);built++;}
    m.geometry=u.geo[want];u.lod=want;if(want===2||want===1){if(u.geo[0]&&want!==0){u.geo[0].dispose();u.geo[0]=null;}}}}
// gforest (Abdullah 2026-11-07 19:29 Total War reference "This level of graphics"): dense forests from the real land cover.
// A pool of ~100k+ trees is placed once from the satellite colour (green = forest), elevation, latitude and rivers (conifer north &
// high, broadleaf temperate/tropical, date palms along Middle East rivers/oases, sparse scrub in deserts), with clearings/fields
// and room around towns. Every few frames the trees in view near the
// camera are streamed into ONE instanced impostor mesh (1 draw call, 2 triangles a tree; thinned evenly with distance/zoom so
// there is never a hard edge), capped at G3F_MAX. Trees grow a little when zoomed out and sway slightly. Tree art painted in code.
const G3F_KINDS=['conifer','broad','palm','scrub'],G3F_MAX=30000,G3F_CAP={conifer:20000,broad:20000,palm:8000,scrub:8000},G3F_CELL=32;
// tree impostor atlas (painted in code, original): 4 cells - conifer, broadleaf, date palm, scrub; lit from the sun side (west/north)
function g3ForestAtlas(){const S=256,cv=document.createElement('canvas');cv.width=S*4;cv.height=S;const x=cv.getContext('2d');
  const blob=(cx,cy,r,c0,c1)=>{const g=x.createRadialGradient(cx-r*.38,cy-r*.42,r*.08,cx,cy,r);g.addColorStop(0,c0);g.addColorStop(1,c1);x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,6.283);x.fill();};
  const rnd=(i=>()=>(i=(i*16807)%2147483647)/2147483647)(7);
  // conifer: stacked drooping tiers
  {const o=0;x.fillStyle='#3b2a19';x.fillRect(o+S/2-7,S-46,14,46);
    for(let t=0;t<6;t++){const y0=S-34-t*31,w=(98-t*15),top=y0-58;const g=x.createLinearGradient(o+S/2-w,0,o+S/2+w,0);g.addColorStop(0,'#6fa85a');g.addColorStop(.45,'#3f7a3e');g.addColorStop(1,'#1f4826');x.fillStyle=g;
      x.beginPath();x.moveTo(o+S/2,top);x.quadraticCurveTo(o+S/2-w*.45,y0-24,o+S/2-w,y0);x.quadraticCurveTo(o+S/2,y0+12,o+S/2+w,y0);x.quadraticCurveTo(o+S/2+w*.45,y0-24,o+S/2,top);x.fill();}
    x.fillStyle='rgba(10,25,12,.35)';for(let i=0;i<60;i++){const yy=40+rnd()*170,ww=(S-yy)*.32;x.fillRect(o+S/2-ww+rnd()*ww*2,yy,3,2);}}
  // broadleaf: cluster of round leaf masses
  {const o=S;x.fillStyle='#3d2b1a';x.fillRect(o+S/2-8,S-80,16,80);
    const P=[[0,150,72],[-52,128,56],[52,132,58],[-30,88,58],[34,86,56],[0,62,54],[-62,170,40],[62,172,42],[0,112,62]];
    for(const [dx,dy,r] of P){blob(o+S/2+dx+4,dy+6,r,'#2a4e20','#18321a');}
    for(const [dx,dy,r] of P){blob(o+S/2+dx,dy,r,'#93c463','#326328');}
    for(let i=0;i<70;i++){const a=rnd()*6.283,rr=rnd()*86;blob(o+S/2+Math.cos(a)*rr,118+Math.sin(a)*rr*.85,6+rnd()*8,rnd()<.5?'rgba(130,170,80,.55)':'rgba(20,45,18,.45)','rgba(20,45,18,0)');}}
  // date palm: slim curved trunk + drooping fronds
  {const o=S*2;x.strokeStyle='#7a6142';x.lineWidth=11;x.lineCap='round';x.beginPath();x.moveTo(o+S/2+6,S-2);x.quadraticCurveTo(o+S/2-10,S-120,o+S/2,92);x.stroke();
    x.strokeStyle='rgba(60,45,30,.6)';x.lineWidth=2;for(let y=100;y<S;y+=9){x.beginPath();x.moveTo(o+S/2-6,y);x.lineTo(o+S/2+6,y+2);x.stroke();}
    for(let i=0;i<11;i++){const a=-Math.PI+i/10*Math.PI+(rnd()-.5)*.2,L=78+rnd()*26,ex=o+S/2+Math.cos(a)*L,ey=92+Math.sin(a)*L*.55+L*.55;
      x.strokeStyle=i%2?'#2f5a26':'#4d7d36';x.lineWidth=13;x.beginPath();x.moveTo(o+S/2,92);x.quadraticCurveTo(o+S/2+Math.cos(a)*L*.55,92+Math.sin(a)*L*.55-24,ex,ey);x.stroke();}
    blob(o+S/2,92,16,'#5a7a34','#2a4419');}
  // scrub: low olive bushes
  {const o=S*3;for(const [dx,dy,r] of [[-40,206,40],[30,212,36],[0,190,44],[60,220,24],[-70,224,22]])blob(o+S/2+dx,dy,r,'#a7a46a','#5d5b36');}
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;return t;}
function g3ForestMesh(){const U=G3.treeU={uTS:{value:1},uT:{value:0},uTex:{value:g3ForestAtlas()}},N=G3F_MAX,g=new THREE.InstancedBufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3));g.setIndex([0,1,2,0,2,3]);
  const iP=new THREE.InstancedBufferAttribute(new Float32Array(N*3),3),iD=new THREE.InstancedBufferAttribute(new Float32Array(N*4),4),iC=new THREE.InstancedBufferAttribute(new Float32Array(N*3),3);
  for(const a of [iP,iD,iC])a.setUsage(THREE.DynamicDrawUsage);g.setAttribute('iP',iP);g.setAttribute('iD',iD);g.setAttribute('iC',iC);g.instanceCount=0;
  const m=new THREE.ShaderMaterial({uniforms:U,vertexShader:`uniform float uTS,uT;attribute vec3 iP,iC;attribute vec4 iD;varying vec2 vU;varying vec3 vC;varying float vY;
    void main(){int k=int(iD.z+.5);vec2 sz=k==0?vec2(1.35,2.5):k==1?vec2(2.1,2.1):k==2?vec2(2.3,2.7):vec2(1.6,.8);sz*=iD.x*uTS;sz.y*=iD.y;
      vec3 cr=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),up=normalize(mix(vec3(0.,1.,0.),vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]),.55));
      float sw=sin(uT*1.2+iP.x*.37+iP.z*.29)*.05*position.y;
      vec3 w=iP+cr*(position.x+sw)*sz.x+up*position.y*sz.y;
      vU=vec2((position.x+.5+float(k))/4.,position.y);vC=iC;vY=position.y;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
    fragmentShader:`uniform sampler2D uTex;varying vec2 vU;varying vec3 vC;varying float vY;void main(){vec4 t=texture2D(uTex,vU);if(t.a<.5)discard;
      vec3 c=t.rgb*vC*1.6*(.72+.4*vY);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n}`});
  const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;return {mesh,iP,iD,iC,g};}
// one land-cover sample per 2x2 texel: [density 0..1, kind index] - real data (satellite colour + DEM + rivers) or the province biome fallback
function g3ForestCover(){const F=G3.F,W=F.W,H=F.H,N=W*H,P=GCM.P,R=G3.real,den=new Float32Array(N),kd=new Uint8Array(N);
  // rivers: a soft riverside band (galleries / date groves) with the channel itself kept clear
  const rv=new Float32Array(N),core=new Uint8Array(N);try{for(const l of GT_RIV)for(let i=0;i+3<l.length;i+=2){const ax=l[i]/2,ay=l[i+1]/2,bx=l[i+2]/2,by=l[i+3]/2,st=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)));
    for(let s=0;s<=st;s++){const x=Math.round(ax+(bx-ax)*s/st),y=Math.round(ay+(by-ay)*s/st);if(x<0||y<0||x>=W||y>=H)continue;rv[y*W+x]=1;core[y*W+x]=1;}}}catch(e){}
  const rvb=g3Blur(rv,W,H,3,2);
  // towns: no trees on the houses, fields and orchards around them
  const st=new Float32Array(N);for(const t of g3Towns()){const R0=(t.cap?13:7)*Math.max(.55,t.sc)/2,R1=R0*1.9,cx=t.x/2,cy=t.z/2;
    for(let y=Math.max(0,Math.floor(cy-R1));y<=Math.min(H-1,Math.ceil(cy+R1));y++)for(let x=Math.max(0,Math.floor(cx-R1));x<=Math.min(W-1,Math.ceil(cx+R1));x++){const v=1-g3Smooth(R0,R1,Math.hypot(x-cx,y-cy));if(v>st[y*W+x])st[y*W+x]=v;}}
  const pxi=(x,y)=>(Math.min(R.CH-1,Math.floor((y+.5)*R.CH/H))*R.CW+Math.min(R.CW-1,Math.floor((x+.5)*R.CW/W)))*4;
  let sb=null;if(F.bw&&R){const s=new Float32Array(N);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x;if(F.Ls[k]<.5)continue;const ci=pxi(x,y),cr=R.col[ci]/255,cg=R.col[ci+1]/255,cb=R.col[ci+2]/255;s[k]=g3Smooth(-.005,.06,cr-cg)*g3Smooth(.42,.58,.3*cr+.59*cg+.11*cb);}sb=g3Blur(s,W,H,12,2);}   // aridity = tan desert colour, blurred
  for(let y=1;y<H-1;y++){const lat=90-180*(y+.5)/H,al=Math.abs(lat);for(let x=1;x<W-1;x++){const k=y*W+x;if(F.Ls[k]<.72||core[k])continue;const h=F.Hh[k];if(h<.6)continue;
    const cl=g3Smooth(.36,.5,g3Fbm(x*.07,y*.07,3)),patch=.55+.45*g3Fbm(x*.21+9,y*.21,2),r=g3Hash(x*7,y*13);let d=0,kind=1;
    if(sb){const ci=pxi(x,y),cr=R.col[ci]/255,cg=R.col[ci+1]/255,cb=R.col[ci+2]/255,gr=cg-cr;
      const o=k*4,snow=F.bw[o+1]/255,rock=F.bw[o]/255,sand=Math.max(F.bw[o+2]/255,g3Smooth(.3,.7,sb[k])),m=F.hm?F.hm[k]:h*120,arid=sb[k];
      const forest=g3Smooth(.05,.17,gr),wood=g3Smooth(-.03,.06,gr)*(1-forest),mont=g3Smooth(500,1100,m)*(1-g3Smooth(2600,3300,m))*(1-g3Smooth(.3,.7,arid))*(1-sand);
      d=forest*(.45+.55*cl)+wood*.28*patch+mont*.45*(.4+.6*cl)+rvb[k]*(.35+.4*(1-arid));
      if(al>62)d*=1-g3Smooth(62,70,al);   // tundra
      d*=(1-snow)*(1-rock*.85);
      const conif=al>54||m>1500||(al>44&&r<.45)||(mont>.3&&r<.75)||(al<44&&al>30&&m>900&&r<.6),trop=al<22;
      if(arid>.25&&al<40&&(rvb[k]>.05||gr>-.01)){kind=2;d=Math.max(d,Math.min(1,rvb[k]*3.2)*.9,g3Smooth(-.01,.05,gr)*.75)*(1-snow);}   // date palms: Nile, Euphrates/Tigris, oases
      else if(trop&&r<.12&&h<3)kind=2;else if(conif)kind=0;else kind=1;
      if(kind!==2&&d<.06){const sc=(sand*.025+(1-forest)*(1-sand)*g3Smooth(-.08,-.01,gr)*.05)*(1-snow)*(1-rock*.5);if(sc>d){d=sc;kind=3;}}}
    else{const p=P[F.idx[k]],t=p.t;   // procedural fallback: province biome
      if(t==='f'){d=.75*cl;kind=r<.7?1:0;}else if(t==='j'){d=.9*(.5+.5*cl);kind=r<.2?2:1;}else if(t==='c'){d=.25*cl;kind=1;}else if(t==='r'){d=.5*cl;kind=r<.5?2:1;}
      else if(t==='m'){d=.4*cl*(1-g3Smooth(18,34,h));kind=0;}else if(t==='s'){d=.4*cl;kind=0;}else if(t==='d'){d=.06;kind=r<.25?2:3;}else if(t==='u'){d=.12*cl;kind=1;}}
    den[k]=Math.min(1,d)*(1-st[k]);kd[k]=kind;}}
  return {den,kd};}
function g3BuildForests(grp){const F=G3.F,W=F.W,H=F.H,t0=performance.now();let cov;try{cov=g3ForestCover();}catch(e){console.warn('forest cover',e);G3.trees=0;return;}
  // exact terrain-mesh height (the 600x300 grid, 4 units, same triangulation as the ground mesh) so trunks sit on the ground
  const GX=600,GY=300,vh=new Float32Array((GX+1)*(GY+1));for(let j=0;j<=GY;j++)for(let i=0;i<=GX;i++)vh[j*(GX+1)+i]=g3HeightAt(i*4,j*4);
  const hAt=(x,z)=>{const gx=Math.max(0,Math.min(GX-.001,x/4)),gz=Math.max(0,Math.min(GY-.001,z/4)),i=gx|0,j=gz|0,fx=gx-i,fz=gz-j,a=vh[j*(GX+1)+i],b=vh[j*(GX+1)+i+1],c=vh[(j+1)*(GX+1)+i],d=vh[(j+1)*(GX+1)+i+1];
    return fx+fz<=1?a+(b-a)*fx+(c-a)*fz:d+(c-d)*(1-fx)+(b-d)*(1-fz);};
  const CX=Math.ceil(W*2/G3F_CELL),CY=Math.ceil(H*2/G3F_CELL),NC=CX*CY,pool={};
  // pass 1: count per kind per cell; pass 2: fill (x,y,z,scale,rot,rank,tint) - 8 floats per tree, grouped by cell
  const DM=4.4,cnt=G3F_KINDS.map(()=>new Uint32Array(NC+1)),cov2=cov.den,kd=cov.kd;
  const nOf=k=>{const d=cov2[k];return d<=0?0:Math.floor(d*DM+g3Hash(k,77));};
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x,n=nOf(k);if(!n)continue;const c=((y*2/G3F_CELL)|0)*CX+((x*2/G3F_CELL)|0);cnt[kd[k]][c+1]+=n;}
  G3F_KINDS.forEach((nm,ki)=>{const c=cnt[ki];for(let i=1;i<=NC;i++)c[i]+=c[i-1];pool[nm]={st:c.slice(),d:new Float32Array(c[NC]*8)};});
  const fill=G3F_KINDS.map(nm=>pool[nm].st.slice());let total=0;
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const k=y*W+x,n=nOf(k);if(!n)continue;const ki=kd[k],c=((y*2/G3F_CELL)|0)*CX+((x*2/G3F_CELL)|0),D=pool[G3F_KINDS[ki]].d;
    for(let q=0;q<n;q++){const wx=(x+g3Hash(x*31+q,y*17))*2,wz=(y+g3Hash(y*29+q,x*11+5))*2,o=(fill[ki][c]++)*8,big=ki===3?.8:1;
      D[o]=wx;D[o+1]=hAt(wx,wz)-.06;D[o+2]=wz;D[o+3]=(.75+g3Hash(x+q*3,y*5)*.55)*big*(1+.15*cov2[k]);D[o+4]=g3Hash(x*3+q,y)*6.283;D[o+5]=g3Hash(x+q*7,y*3+1);D[o+6]=g3Hash(y+q,x*9);D[o+7]=cov2[k];total++;}}
  G3.forest={pool,CX,CY,NC,last:null,frame:0,total,bb:g3ForestMesh()};grp.add(G3.forest.bb.mesh);
  G3.trees=0;G3.treePool=total;G3.tForest=Math.round(performance.now()-t0);}
// stream the trees near the camera into the 4 meshes (called every frame; does work only when the view changed)
const G3F_TINT={conifer:[[.86,.95,.95],[1,1,1],[.8,.9,1]],broad:[[1,1,1],[.85,1,.8],[1.15,1.05,.8],[.9,.95,.9]],palm:[[1,1,1],[1.1,1.05,.85]],scrub:[[1,1,1],[1.15,1.05,.85],[.9,.95,.9]]};
function g3ForestTick(force){const Fo=G3.forest,cc=G3.cc,cam=G3.cam;if(!Fo||!cc||!cam)return;Fo.frame++;if(G3.treeU){G3.treeU.uT.value=G3.time||0;G3.treeU.uTS.value=Math.max(.9,Math.min(3.2,cc.d/130));}
  const L=Fo.last,ch=!L||Math.hypot(cc.x-L.x,cc.z-L.z)>cc.d*.05||Math.abs(cc.d-L.d)>L.d*.06||Math.abs(cc.yaw-L.yaw)>.05||Math.abs(cc.pitch-L.pitch)>.04;
  if(!force&&L&&(!ch||Fo.frame-(Fo.lf||0)<5))return;Fo.lf=Fo.frame;Fo.last={x:cc.x,z:cc.z,d:cc.d,yaw:cc.yaw,pitch:cc.pitch};
  const B=Fo.bb;if(cc.d>1500){B.g.instanceCount=0;G3.trees=0;return;}
  cam.updateMatrixWorld();const fr=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse)),sp=new THREE.Sphere(),cp=cam.position;
  const RG=cc.d*2.6,C=G3F_CELL,x0=Math.max(0,Math.floor((cc.x-RG)/C)),x1=Math.min(Fo.CX-1,Math.floor((cc.x+RG)/C)),y0=Math.max(0,Math.floor((cc.z-RG)/C)),y1=Math.min(Fo.CY-1,Math.floor((cc.z+RG)/C));
  const cells=[];let want=0;
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const c=cy*Fo.CX+cx;let n=0;for(const nm of G3F_KINDS){const s=Fo.pool[nm].st;n+=s[c+1]-s[c];}if(!n)continue;
    const mx=(cx+.5)*C,mz=(cy+.5)*C;sp.center.set(mx,g3HeightAt(mx,mz)+2,mz);sp.radius=C*.75+6;if(!fr.intersectsSphere(sp))continue;
    const dist=cp.distanceTo(sp.center),dn=Math.max(0,Math.min(1,1.45-dist/(cc.d*1.25)))*(dist<cc.d*.9?1:Math.max(.3,1-(dist-cc.d*.9)/(cc.d*1.6)));if(dn<=0)continue;cells.push([c,dn,dist]);want+=n*dn;}
  const f=Math.min(1,G3F_MAX/Math.max(1,want));cells.sort((a,b)=>a[2]-b[2]);
  const cnt={},pa=B.iP.array,da=B.iD.array,ca=B.iC.array;let n=0;
  for(let ki=0;ki<4;ki++){const nm=G3F_KINDS[ki],P=Fo.pool[nm],D=P.d,TI=G3F_TINT[nm],n0=n,cap=Math.min(G3F_MAX,n+G3F_CAP[nm]);
    for(const [c,dn] of cells){const a=P.st[c],b=P.st[c+1];if(a===b)continue;const th=dn*f;
      for(let i=a;i<b&&n<cap;i++){const o=i*8;if(D[o+5]>th)continue;const q=n*3,w=n*4;pa[q]=D[o];pa[q+1]=D[o+1];pa[q+2]=D[o+2];da[w]=D[o+3];da[w+1]=.88+D[o+6]*.3;da[w+2]=ki;da[w+3]=0;
        const t=TI[Math.min(TI.length-1,(D[o+6]*TI.length)|0)],v=.82+D[o+5]*.3+D[o+7]*.05;ca[q]=t[0]*v;ca[q+1]=t[1]*v;ca[q+2]=t[2]*v;n++;}
      if(n>=cap)break;}
    cnt[nm]=n-n0;}
  for(const [A,k] of [[B.iP,3],[B.iD,4],[B.iC,3]]){A.clearUpdateRanges();A.addUpdateRange(0,n*k);A.needsUpdate=true;}B.g.instanceCount=n;const tot=n;
  G3.trees=tot;G3.treeN=cnt;}
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
// Catmull-Rom subdivision (passes through every point, so shared junction nodes stay put): smooth painted curves instead of straight polyline kinks
function g3CatRom(q,closed,n){if(q.length<3)return q;const m=q.length,out=[q[0]],at=i=>closed?q[((i%(m-1))+(m-1))%(m-1)]:q[Math.max(0,Math.min(m-1,i))];
  for(let a=0;a<m-1;a++){const p0=at(a-1),p1=q[a],p2=q[a+1],p3=at(a+2);for(let k=1;k<=n;k++){const t=k/n,t2=t*t,t3=t2*t;
    if(k===n){out.push(p2);continue;}
    out.push([.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
  return out;}
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
    const dec=q.filter((p,a)=>a%3===0||a===q.length-1);ch.xy=g3CatRom(dec,closed,3);}
  return out;}
function g3RiverChains(){const out=[],Ls=G3.F.Ls,W=G3.F.W;for(const l of GT_RIV){let q=[];for(let i=0;i+1<l.length;i+=2)q.push([l[i],l[i+1]]);
    for(let it=0;it<2;it++){const r=[q[0]];for(let a=0;a<q.length-1;a++){const A=q[a],B=q[a+1];r.push([A[0]*.75+B[0]*.25,A[1]*.75+B[1]*.25],[A[0]*.25+B[0]*.75,A[1]*.25+B[1]*.75]);}r.push(q[q.length-1]);q=r;}
    out.push({xy:q,i:-1,j:-1});}return out;}
const G3_STEP=4;   // reference cell used by g3MeshH (line heights); the terrain itself is chunked LOD, see g3TerrChunk
function g3MeshH(x,z){const S=G3_STEP,gx=Math.max(0,Math.min(2400/S-.01,x/S)),gz=Math.max(0,Math.min(1200/S-.01,z/S)),i=gx|0,j=gz|0,tx=gx-i,tz=gz-j,h=(a,b)=>g3HeightAt(a*S,b*S);
  return h(i,j)*(1-tx)*(1-tz)+h(i+1,j)*tx*(1-tz)+h(i,j+1)*(1-tx)*tz+h(i+1,j+1)*tx*tz;}
function g3LineMat(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:G3.LU,
  vertexShader:`uniform vec2 uRes;uniform float uPx;attribute vec3 aP0,aP1;attribute vec2 aC;attribute vec4 aCol;attribute vec2 aW;varying vec4 vCol;varying float vD,vH;
  void main(){vec4 c0=projectionMatrix*viewMatrix*vec4(aP0,1.),c1=projectionMatrix*viewMatrix*vec4(aP1,1.);vec2 s0=c0.xy/c0.w*uRes*.5,s1=c1.xy/c1.w*uRes*.5,d=s1-s0;float l=length(d);d=l>1e-4?d/l:vec2(1.,0.);vec2 n=vec2(-d.y,d.x);
    vec3 pm=mix(aP0,aP1,aC.x);float dist=length(cameraPosition-pm);float hw=max(aW.x*uPx,aW.y*uRes.y/(.65*dist)+.0)*.5;hw=max(hw,.5*uPx);
    vec4 c=mix(c0,c1,aC.x);float pad=hw+.75;vec2 off=n*aC.y*pad+d*(aC.x*2.-1.)*pad;c.xy+=off/(uRes*.5)*c.w;
    vD=aC.y*pad;vH=hw;vCol=aCol;vCol.a*=1.-smoothstep(2600.,6800.,dist);gl_Position=c;}`,
  fragmentShader:`varying vec4 vCol;varying float vD,vH;void main(){float cv=smoothstep(0.,1.,clamp((vH+.75-abs(vD))/1.5,0.,1.));gl_FragColor=vec4(vCol.rgb,vCol.a*cv);if(gl_FragColor.a<.01)discard;}`});}
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
// gsea: signed distance to the coastline (land = Ls>=.5), two-pass chamfer on the 1200x600 field, baked once at load.
// byte = 127.5 + signed texels*3.2 (sea +, land -; first texel each side = +-.5; saturates at 40 texels) -> linear filtering makes it a smooth SDF crossing 0 on the coast.
function g3CoastDist(Ls,W,H){const N=W*H,I=1e9,ds=new Float32Array(N),dl=new Float32Array(N),out=new Uint8Array(N);
  for(let k=0;k<N;k++){const l=Ls[k]>=.5;ds[k]=l?0:I;dl[k]=l?I:0;}
  const pass=d=>{const a=1,b=1.4142;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x;let v=d[k];if(x>0)v=Math.min(v,d[k-1]+a);if(y>0){v=Math.min(v,d[k-W]+a);if(x>0)v=Math.min(v,d[k-W-1]+b);if(x<W-1)v=Math.min(v,d[k-W+1]+b);}d[k]=v;}
    for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const k=y*W+x;let v=d[k];if(x<W-1)v=Math.min(v,d[k+1]+a);if(y<H-1){v=Math.min(v,d[k+W]+a);if(x<W-1)v=Math.min(v,d[k+W+1]+b);if(x>0)v=Math.min(v,d[k+W-1]+b);}d[k]=v;}};
  pass(ds);pass(dl);
  for(let k=0;k<N;k++){const sea=ds[k]>0,v=127.5+(sea?ds[k]-.5:.5-dl[k])*3.2;out[k]=Math.max(0,Math.min(255,Math.round(v)));}return out;}
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
  {float dL=-(texture2D(uSea,vG3).a*255.-127.5)/3.2;   // gsea: bright sand beach band on every coast (dL = texels inland), wet sand at the waterline
   float bch=(1.-smoothstep(.45,1.3,dL+(a2.r-.5)*.5))*(1.-rock*.8)*(1.-snow);vec3 sc_=vec3(.95,.86,.66)*(.88+.24*a1.b+.1*(a3.r-.5));c=mix(c,sc_,bch*.88);
   float wet=1.-smoothstep(-.1,.25,dL);c*=1.-.16*wet*bch;}
  return c;}`;
function g3FlagUrl(o){G3.fu=G3.fu||new Map();let u=G3.fu.get(o);if(u!==undefined)return u;try{const n=grNat(o),im=n.major&&typeof esFlag==='function'?esFlag(o):null;if(im&&im.complete===false)return '';const c=(n.major&&typeof esFlagEl==='function')?esFlagEl(o,28,28):null;if(c)u=c.toDataURL();else{const k=document.createElement('canvas');k.width=k.height=32;const x=k.getContext('2d');x.fillStyle=n.color||'#888';x.fillRect(0,0,32,32);x.fillStyle='rgba(255,255,255,.9)';x.font='bold 13px Georgia';x.textAlign='center';x.fillText(String(o).slice(0,2),16,21);u=k.toDataURL();}}catch(e){u='';}G3.fu.set(o,u);return u;}   /* one cached flag image per nation for nameplates */
function g3RingTex(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),r=104;x.lineCap='round';
  for(let k=0;k<4;k++){const a0=k*Math.PI/2+.22,a1=(k+1)*Math.PI/2-.22;x.strokeStyle='rgba(255,255,255,.28)';x.lineWidth=30;x.beginPath();x.arc(128,128,r,a0,a1);x.stroke();x.strokeStyle='#fff';x.lineWidth=17;x.beginPath();x.arc(128,128,r,a0,a1);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;}   /* soft-edged segmented selection ring, tinted by owner via material colour */
function g3Init(cv){g3Dispose();try{g3LoadReal();}catch(e){}try{g3LoadArmyModels();}catch(e){}if(G3.real&&G3.F&&!G3.F.lit){G3.F=null;G3.towns=null;}let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});}catch(e){return false;}
  try{G3.vigS=new THREE.Scene();G3.vigC=new THREE.OrthographicCamera(-1,1,1,-1,0,1);G3.vigS.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:(G3.vigU={uN:{value:0}}),transparent:true,depthTest:false,depthWrite:false,vertexShader:'varying vec2 u;void main(){u=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform float uN;varying vec2 u;void main(){vec2 d=(u-vec2(.5,.52))*vec2(1.,.9);float v=smoothstep(.34,.82,length(d));vec3 c=mix(vec3(1.,.88,.66),vec3(.1,.18,.4),1.-u.y);vec4 g=vec4(mix(c,vec3(.02,.05,.1),v),v*.46+.055);float a=g.a+uN*.36;gl_FragColor=vec4(mix(g.rgb,vec3(.03,.06,.16),uN*.36/max(a,.001)),a);}'})));}catch(e){G3.vigS=null;}  // studio grade: vignette + warm-top/cool-bottom wash, drawn in-canvas so HUD stays crisp
  if(!R.getContext())return false;R.outputColorSpace=THREE.LinearSRGBColorSpace;G3.R=R;G3.cv=cv;G3.aniso=Math.min(16,R.capabilities.getMaxAnisotropy?R.capabilities.getMaxAnisotropy():8);
  const F=g3Fields(),W=F.W,H=F.H,sc=new THREE.Scene(),haze=0x9db8c9;sc.background=new THREE.Color(haze);sc.fog=new THREE.Fog(haze,2200,6200);G3.sc=sc;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.02;g3Sky(sc);
  G3.cam=new THREE.PerspectiveCamera(36,1.6,8,9000);G3.cc=Object.assign({},G3.camera);G3.time=0;G3.last=0;G3.keys.clear();G3.pos=new Map();G3.arm=new Map();G3.sig='';G3.batG=null;G3.bat=null;
  sc.add(new THREE.HemisphereLight(0xcfe0f2,0x8a7a5e,2.0));const sun=new THREE.DirectionalLight(0xfff0d2,3.5);sun.position.set(G3L.sun[0],G3L.sun[1],G3L.sun[2]);sc.add(sun);
  G3.matLit=new THREE.MeshLambertMaterial({vertexColors:true});
  // terrain
  g3PaintOverlay();
  const tGround=g3Tex(new Uint8Array(F.px.buffer),F.PW||W,F.PH||H,true),tOv=g3Tex(G3.ov,W,H,true),tIdx=g3Tex(g3IdxPixels(),W,H,false,true),tDet=g3DetailTex(),tBW=g3Tex(F.bw,W,H,true);tDet.anisotropy=G3.aniso||8;G3.tOv=tOv;
  const G3cd=F.cd||(F.cd=g3CoastDist(F.Ls,W,H));   /* gsea: signed distance to the coast, baked once per field set (alpha of uSea) */
  const sd=new Uint8Array(W*H*4);for(let k=0;k<W*H;k++){sd[k*4]=Math.min(255,F.Lw[k]*255);sd[k*4+1]=Math.min(255,F.Ls[k]*255);sd[k*4+2]=Math.round(255*g3SeaDepth(F,k));sd[k*4+3]=G3cd[k];}const tSea=g3Tex(sd,W,H,false);const tLit=F.lit?g3Tex(F.lit,F.LW,F.LH,true):null;
  const tHi=G3.hi?g3Tex(new Uint8Array(G3.hi.d.buffer),G3.hi.w,G3.hi.h,true):null;if(tHi)tHi.anisotropy=G3.aniso||8;
  const U={uHi:{value:tHi},uHasHi:{value:tHi?1:0},uHiR:{value:new THREE.Vector4(...(G3.hi?G3.hi.r:[0,0,1,1]))},uOv:{value:tOv},uIdx:{value:tIdx},uDet:{value:tDet},uSel:{value:-1},uHov:{value:-1},uRim:{value:2},uTime:{value:0},uSea:{value:tSea},uBW:{value:tBW},uLit:{value:tLit},uHasLit:{value:tLit?1:0},uOvK:{value:1}};G3.U=U;
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
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vG3;varying vec3 vWp;uniform sampler2D uOv,uIdx,uDet,uBW,uSea,uLit,uHi;uniform vec4 uHiR;uniform float uSel,uHov,uRim,uHasLit,uHasHi,uOvK;float g3sh=1.,g3ao=1.;uniform float uTime;\n'+G3_CLOUD+rim+G3_DETAIL)
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n if(uHasLit>.5){vec4 L=texture2D(uLit,vG3);vec3 nw=normalize(vec3((L.r-.5)*4.,1.,(L.g-.5)*4.));normal=normalize((viewMatrix*vec4(nw,0.)).xyz);g3sh=L.b;g3ao=L.a*1.08;}').replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n reflectedLight.directDiffuse*=g3sh*g3cloud(vWp.xz,uTime);reflectedLight.indirectDiffuse*=g3ao;')
      .replace('#include <map_fragment>','#include <map_fragment>\n if(uHasHi>.5){vec2 hu=(vG3-uHiR.xy)/uHiR.zw;float hm_=smoothstep(0.,.02,hu.x)*smoothstep(0.,.02,1.-hu.x)*smoothstep(0.,.02,hu.y)*smoothstep(0.,.02,1.-hu.y);if(hm_>0.)diffuseColor.rgb=mix(diffuseColor.rgb,texture2D(uHi,clamp(hu,0.,1.)).rgb,hm_);}\n diffuseColor.rgb=g3detail(diffuseColor.rgb);vec4 ov=texture2D(uOv,vG3);diffuseColor.rgb=mix(diffuseColor.rgb,ov.rgb,min(.85,ov.a*uOvK));diffuseColor.rgb=g3rim(diffuseColor.rgb,vG3);');};
  g3TerrInit(sc,tm);
  // sea
  const sm=new THREE.ShaderMaterial({uniforms:U,transparent:false,vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform sampler2D uSea,uOv,uIdx;uniform float uTime,uSel,uHov,uRim;varying vec3 vW;\n${G3_CLOUD}
    ${rim.replace('vec3 g3rim','vec3 g3rimS')}
    void main(){vec2 uv=vec2(vW.x/2400.,vW.z/1200.);vec2 cu=clamp(uv,0.,1.);vec4 s=texture2D(uSea,cu);float oo=max(max(-uv.x,uv.x-1.),max(-uv.y,uv.y-1.));s.g*=1.-smoothstep(0.,.004,oo);float sh=s.r,dp=mix(s.b,1.,smoothstep(0.,.03,oo));dp=mix(.85,dp,smoothstep(0.,.05,uv.y));
      vec3 deep=vec3(.025,.11,.235),mid=vec3(.05,.26,.42),sha=vec3(.12,.55,.58);vec3 c=mix(sha,mid,smoothstep(.0,.14,dp));c=mix(c,deep,smoothstep(.12,.6,dp));
      vec2 p=vW.xz;float w=sin(p.x*.31+uTime*1.1)+sin(p.y*.47-uTime*.8)+sin((p.x+p.y)*.19+uTime*.6)+sin((p.x-p.y)*.63-uTime*1.3)*.5;c*=1.+w*.028*(1.-smoothstep(500.,2400.,length(cameraPosition-vW)));{float nz=sin(p.x*.0093+sin(p.y*.0141)*1.9)*sin(p.y*.0117+cos(p.x*.0087)*1.7)+.5*sin(p.x*.021+p.y*.017+2.);c=mix(c,c*vec3(.82,.96,1.12),clamp(nz*.5+.15,0.,1.)*smoothstep(.25,.6,dp)*.55);c*=1.+nz*.05*smoothstep(.3,.7,dp);}
      float dT=max(0.,(s.a*255.-127.5)/3.2)+max(oo,0.)*4000.;   // gsea: texels from the coast (baked SDF) -> turquoise shallows fading to deep blue
      float nz2=sin(p.x*.23+sin(p.y*.19)*2.)*sin(p.y*.21+cos(p.x*.17)*2.),dj=dT+nz2*.12;
      {vec3 turq=mix(vec3(.2,.7,.68),vec3(.05,.4,.55),smoothstep(.1,3.,dj));float sh_=(1.-smoothstep(.5,5.,dj))*(1.-.6*smoothstep(.015,.12,dp));c=mix(c,turq*(1.+w*.03),sh_*.8);}
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
      float fw=fwidth(s.g)+.004;
      {   // gsea: sandy lagoon edge + rolling foam ring hugging every coast and island
       float ring=1.-smoothstep(.12,.85,dj);float bands=smoothstep(.55,.95,sin(dj*10.-uTime*1.5+nz2*1.4))*ring;float brk=.5+.5*sin(p.x*.7+p.y*.9+uTime*.4+nz2*3.);
       float fo=clamp(bands*brk*.7+(1.-smoothstep(.0,.22,dj))*.75,0.,1.);c=mix(c,vec3(.95,.98,1.),fo*(.6+.4*(1.-smoothstep(600.,2400.,fdd))));}
      float crest=1.-smoothstep(fw*.6,fw*1.8,abs(s.g-(.52+.02*sin(uTime*.9+p.x*.2+p.y*.17))));c=mix(c,vec3(.96,.99,1.),crest*.8);   // crisp shoreline foam line, constant width on screen
      if(uv.x>=0.&&uv.x<=1.&&uv.y>=0.&&uv.y<=1.){vec4 ov=texture2D(uOv,cu);c=mix(c,ov.rgb,ov.a*.55);c=g3rimS(c,cu);}
      float dist=length(cameraPosition-vW);c*=mix(g3cloud(vW.xz,uTime),1.,smoothstep(1500.,4200.,dist));c=mix(c,vec3(.616,.722,.788),smoothstep(2200.,6200.,dist));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n}`});
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(14000,9000).rotateX(-Math.PI/2).translate(1200,0,600),sm);sea.position.y=.05;sc.add(sea);g3BuildLines(sc);g3BuildRoads(sc);
  const grp=new THREE.Group();sc.add(grp);g3BuildForests(grp);g3BuildTowns(grp);g3BuildChim(grp);g3BuildLights(grp);G3.static=grp;
  G3.ents=new THREE.Group();sc.add(G3.ents);G3.arrows=new THREE.Group();sc.add(G3.arrows);
  G3.ringM=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:g3RingTex(),color:0xffe27a,transparent:true,depthTest:false,depthWrite:false}));G3.ringM.renderOrder=5;G3.ringM.visible=false;sc.add(G3.ringM);try{g3ShipInit(sc);}catch(e){G3.ship=null;}
  g3UI();G3.miniDirty=true;g3ApplyQuality();try{cv.style.filter='contrast(1.06) saturate(1.18)';const w=document.getElementById('gMapWrap');if(w&&!document.getElementById('g3vig')){const v=document.createElement('div');v.id='g3vig';v.style.cssText='position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 58%,rgba(4,10,18,.34) 100%)';w.insertBefore(v,cv.nextSibling);}}catch(e){}
  if(!G3.raf)G3.raf=requestAnimationFrame(g3Frame);return true;}
function g3Dispose(){if(G3.raf){cancelAnimationFrame(G3.raf);G3.raf=0;}if(G3.sc){G3.sc.traverse(o=>{if(o.geometry&&o.geometry!==undefined&&!Object.values(G3.geo||{}).includes(o.geometry))o.geometry.dispose();});}
  if(G3.R){try{G3.R.dispose();G3.R.forceContextLoss();}catch(e){}}G3.R=null;G3.sc=null;G3.cam=null;G3.cv=null;G3.arm=new Map();G3.batG=null;G3.bat=null;G3.matLit=null;G3.tOv=null;}
function g3Resize(){if(!G3.R||!GV.cv)return;const w=GV.w||GV.cv.clientWidth||800,h=GV.h||GV.cv.clientHeight||500;G3.R.setSize(w,h,false);if(G3.LU){const b=G3.R.getDrawingBufferSize(new THREE.Vector2());G3.LU.uRes.value.copy(b);G3.LU.uPx.value=G3.R.getPixelRatio();}GV.cv.style.width=w+'px';GV.cv.style.height=h+'px';G3.cam.aspect=w/h;G3.cam.updateProjectionMatrix();G3.moved=true;}
// ---- armies: one soldier (the general) with a big national flag; a ship with a flag for armies at sea
function g3Uniform(o){const c=grNatRgb(o);return [Math.min(1,(c[0]*.72+44)/255),Math.min(1,(c[1]*.72+42)/255),Math.min(1,(c[2]*.68+34)/255)];}
function g3Tier(n){return n<5?0:n<12?1:2;}
function g3FlagMat(tex,inst){const m=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}),mx=inst?'instanceMatrix[3].x':'modelMatrix[3].x';
  /* cloth: gentle travelling wave (grows from the pole), with a fold shade so it reads as fabric, not a flat plane */
  m.onBeforeCompile=s=>{s.uniforms.uT=G3.flagT||(G3.flagT={value:0});s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float uT;varying float vSh;').replace('#include <begin_vertex>','#include <begin_vertex>\n float ph=uT*2.6+transformed.x*1.1+'+mx+'*.07;float am=transformed.x*.11;transformed.z+=sin(ph)*am*1.5+sin(ph*.5+transformed.y*.8)*am*.5;transformed.y+=sin(uT*1.7+transformed.x*.6)*.03*transformed.x-transformed.x*transformed.x*.012;vSh=.84+.22*cos(ph)*min(1.,transformed.x*.5);');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vSh;').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb*=vSh;');};
  return m;}
function g3FlagMesh(o,sx){const fac=grNat(o).fac,tex=flagTex(fac),m=new THREE.Mesh(G3.flagGeo||(G3.flagGeo=new THREE.PlaneGeometry(7,4.6,16,6).translate(3.5,0,0)),g3FlagMat(tex,false));
  return m;}
/* perf (laneC PERF 2026-11-07): army bodies, flags and wakes are drawn as pooled InstancedMeshes (one draw per miniature / flag / wake kind)
   instead of 2-3 meshes per army; the per-army Group still carries position/scale and its meshes stay in it, hidden, as the matrix source */
function g3PoolMesh(map,key,geo,mat,lst,col){let p=map.get(key);if(!p){p={im:null,cap:0,n:0,geo,mat};map.set(key,p);}
  if(p.n>=p.cap){const old=p.im;p.cap=Math.max(16,p.cap*2);p.im=new THREE.InstancedMesh(p.geo,p.mat,p.cap);p.im.frustumCulled=false;p.im.count=0;if(col){p.im.setColorAt(0,col);}if(old){p.im.instanceMatrix.array.set(old.instanceMatrix.array);if(old.instanceColor)p.im.instanceColor.array.set(old.instanceColor.array);G3.batG.remove(old);old.dispose();}G3.batG.add(p.im);}
  if(col)p.im.setColorAt(p.n,col);p.im.setMatrixAt(p.n++,lst);}
/* far zoom: one generic token per size (tinted per nation by instance colour) so 300 armies need ~5 body draws, not one per nation */
function g3FarGeo(tier,sea){G3.farG=G3.farG||{};const k=tier+(sea?'s':'');if(G3.farG[k])return G3.farG[k];const R=sea?5:(tier>=2?5.2:tier>=1?4.4:3.2),a=sea?new THREE.BoxGeometry(R*1.9,2.6,R*.8).translate(0,1.8,0):new THREE.CylinderGeometry(R*.9,R,1.1,10).translate(0,.55,0),b=sea?new THREE.BoxGeometry(R*.7,2.4,R*.5).translate(-R*.2,4,0):new THREE.ConeGeometry(R*.62,8+tier*1.5,8).translate(0,1.1+(8+tier*1.5)/2,0);
  const pl=new THREE.CylinderGeometry(.22,.28,22,5).translate(R*.62,11,-R*.42);const g=g3MergeCol([a,b,pl].map(q=>{q=q.index?q.toNonIndexed():q;const n=q.attributes.position.count,c=new Float32Array(n*3).fill(1);q.setAttribute('color',new THREE.BufferAttribute(c,3));return q;}));return G3.farG[k]=g;}
function g3FarCol(o){G3.farC=G3.farC||{};if(!G3.farC[o]){const c=typeof grNatRgb==='function'?grNatRgb(o):[90,100,60];G3.farC[o]=new THREE.Color(Math.min(1,c[0]/255*1.25+.06),Math.min(1,c[1]/255*1.25+.06),Math.min(1,c[2]/255*1.25+.06));}return G3.farC[o];}
function g3Batch(){if(!G3.ents||!G3.sc)return;if(!G3.batG){G3.batG=new THREE.Group();G3.sc.add(G3.batG);G3.bat={b:new Map(),f:new Map(),w:new Map()};}
  for(const m of [G3.bat.b,G3.bat.f,G3.bat.w])for(const p of m.values())p.n=0;
  G3.ents.updateMatrixWorld(true);const far=G3.cc&&G3.cc.d>1400;
  for(const e of G3.arm.values()){if(!e.g.visible)continue;const c=e.g.children,bd=c[0];let fl=null,wk=null,sh=null;for(let i=1;i<c.length;i++){if(c[i].userData.wk)wk=c[i];else if(c[i].userData.sh)sh=c[i];else fl=c[i];}
    if(far||(!e.sea&&e.o!==GC.me&&e.aid!==GV.selA&&G3.cc&&G3.cc.d>650)){const fg=g3FarGeo(e.tier,e.sea);g3PoolMesh(G3.bat.b,'far'+fg.uuid,fg,bd.material,bd.matrixWorld,g3FarCol(e.o));}else g3PoolMesh(G3.bat.b,bd.geometry.uuid,bd.geometry,bd.material,bd.matrixWorld);
    if(fl&&fl.visible)g3PoolMesh(G3.bat.f,fl.material.map.uuid,fl.geometry,G3.bat.fm&&G3.bat.fm.get(fl.material.map.uuid)||g3FlagInstMat(fl.material.map),fl.matrixWorld);
    if(wk)g3PoolMesh(G3.bat.w,'w',wk.geometry,wk.material,wk.matrixWorld);if(sh)g3PoolMesh(G3.bat.w,'sh',sh.geometry,sh.material,sh.matrixWorld);}
  for(const m of [G3.bat.b,G3.bat.f,G3.bat.w])for(const p of m.values())if(p.im){p.im.count=p.n;p.im.instanceMatrix.needsUpdate=true;}}
function g3FlagInstMat(tex){const M=G3.bat.fm||(G3.bat.fm=new Map());let m=M.get(tex.uuid);if(!m){m=g3FlagMat(tex,true);M.set(tex.uuid,m);}return m;}
function g3ShadowMesh(r){if(!G3.shG){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,2,32,32,31);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.6,'rgba(0,0,0,.3)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);G3.shG=new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2).translate(0,.2,0);G3.shM=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});}const m=new THREE.Mesh(G3.shG,G3.shM);m.scale.setScalar(r);return m;}
function g3Ent(a){let e=G3.arm.get(a.id);const sea=GCM.P[a.at].sea,tier=g3Tier(a.u.length),mg=sea?g3NavyGeo(a.o):g3MiniGeo(a.o,tier);   /* grandlook: baked soldier/ship miniature when the models are loaded */
  if(e&&e.sea===sea&&e.o===a.o&&(sea||e.tier===tier)&&!!e.mini===!!mg)return e;if(e){G3.ents.remove(e.g);}
  const g=new THREE.Group(),body=new THREE.Mesh(mg||(G3.noGeo||(G3.noGeo=new THREE.BufferGeometry())),(mg&&typeof g3ArmyMat==='function')?g3ArmyMat():G3.matLit),fl=g3FlagMesh(a.o);
  body.scale.setScalar(1);body.visible=false;fl.visible=false;g.add(body);
  if(mg){const R=tier>=2?5.2:tier>=1?4.4:3.2;fl.scale.setScalar(1);if(sea){fl.position.set(-3.4,5.5,0);{const wk=g3WakeMesh();wk.visible=false;wk.userData.wk=1;g.add(wk);}}else{fl.position.set(R*.62+.1,19.9,-R*.42);const sd=g3ShadowMesh(R*1.7);sd.userData.sh=1;sd.visible=false;g.add(fl);g.add(sd);}}
  if(!fl.parent)g.add(fl);
  const old=e;e={g,sea,tier,mini:!!mg,hi:mg,lod:-1,o:a.o,pi:a.at,x:0,z:0,fx:0,fz:0,mv:1,tt:1,face:0,aid:a.id,plate:old?old.plate:null};G3.ents.add(g);G3.arm.set(a.id,e);return e;}
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
/* g3BuildArrows lives in src/13e2-groads.js (groads 2026-11-08) */
/* (armies3 thick flat arrows superseded by the outlined 3D arrows in 13e2-groads.js; same rule: own = green, seen enemies at war = red) */
// ---- HUD: mode chips, round buttons, army cards, minimap, news, banners
function g3Css(){if(document.getElementById('g3css'))return;const s=document.createElement('style');s.id='g3css';s.textContent=`
#g3ui{position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:inherit}
#g3ui .b{position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:none;white-space:nowrap;padding:3px 13px 3px 3px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(0,0,0,.2)),var(--nc,#27394b);border:1px solid rgba(255,240,200,.55);box-shadow:0 2px 6px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.25);color:#fff8e6;text-shadow:0 1px 2px #000a}
.b .em{display:inline-block;vertical-align:middle;width:24px;height:24px;border-radius:50%;margin-right:7px;background:#ddd center/cover no-repeat;border:2px solid #f3e3b0;box-shadow:0 1px 3px #0008}
.b .t{display:inline-block;vertical-align:middle}.b .t b{display:block;font:700 12.5px/1.1 Georgia,'Times New Roman',serif;letter-spacing:.04em}.b .t small{display:block;font:500 10px/1.15 Georgia,serif;opacity:.88}
.b.cap .em{width:28px;height:28px;border-color:#ffd24a}.b.cap .t b{font-size:14px}.b.cap{border-color:#ffd24a}
#g3ui .n{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font:700 18px/1 Georgia,'Times New Roman',serif;letter-spacing:.2em;color:rgba(255,246,222,.9);text-shadow:0 1px 2px #000c,0 0 10px #0009;display:none;white-space:nowrap}
#g3ui .p{position:absolute;left:0;top:0;display:none;white-space:nowrap;height:16px;padding:0 4px 3px 19px;font:700 12px/16px system-ui,sans-serif;color:#fff;text-shadow:0 1px 1px #000c;border:1px solid #000a;border-radius:2px 3px 3px 2px;box-shadow:0 1px 3px #000b;background:linear-gradient(#ffffff22,#0000 60%),var(--rc,#5d646c)}
#g3ui .p.me{--rc:#2d8a3c}#g3ui .p.war{--rc:#b0322a}#g3ui .p.oth{--rc:#5d646c}#g3ui .p.sel{border-color:#ffe27a;box-shadow:0 0 0 1px #ffe27a,0 0 8px #ffe27aaa}
#g3ui .p::after{content:'';position:absolute;left:19px;right:2px;bottom:1px;height:2px;background:linear-gradient(90deg,#9cf08a var(--st,100%),#000a var(--st,100%))}
#g3ui .p .fw{position:absolute;left:-4px;top:-4px;width:20px;height:24px;background:#e9d9a0;clip-path:polygon(0 0,100% 0,100% 64%,50% 100%,0 64%)}#g3ui .p .fl{position:absolute;inset:1.5px 1.5px 2.5px;background:#777 center/cover no-repeat;clip-path:polygon(0 0,100% 0,100% 63%,50% 100%,0 63%)}
#g3ui .p b{font-weight:700}#g3ui .p .mp{display:inline-block;width:4px;height:10px;margin-left:4px;vertical-align:-1px;border:1px solid #000a;background:linear-gradient(to top,var(--mc,#7fdc6a) var(--mv,100%),#0008 var(--mv,100%))}
#g3ui .s{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font:italic 13px/1 Georgia,'Times New Roman',serif;letter-spacing:.22em;color:rgba(225,240,255,.85);text-shadow:0 1px 2px #000a;display:none;white-space:nowrap}
#g3ui .k{pointer-events:auto}
#g3modes{position:absolute;left:10px;top:10px;width:150px;display:flex;flex-direction:column;gap:2px;padding:6px 5px 5px;border:1px solid #6b5a33;border-radius:6px;background:linear-gradient(#162433,#0b141f);box-shadow:0 4px 14px #000a,inset 0 1px 0 #ffffff18;z-index:3}#g3modes:before{content:'MAP MODE';font:700 10px/12px system-ui,sans-serif;letter-spacing:.16em;color:#d8b865;padding:1px 4px 4px;border-bottom:1px solid #6b5a3380;margin-bottom:3px}
#g3modes button{pointer-events:auto;text-align:left;padding:4px 8px;border-radius:3px;border:1px solid transparent;background:transparent;color:#cfe0ee;font-size:12.5px;cursor:pointer;white-space:nowrap}#g3modes button:hover{background:#243a4e;border-color:#3d5a73}
#g3btns #g3modes{position:relative;left:auto;top:auto;align-self:flex-end}#g3modes:not(.open) button:not(.on){display:none}#g3modes:not(.open){width:auto}#g3modes:not(.open) button.on:after{content:'  ▾';opacity:.7}#g3modes:not(.open):before{display:none}
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
#g3leg{position:absolute;left:10px;bottom:140px;width:228px;max-height:calc(100% - 160px);overflow:auto;font-size:11.5px;line-height:1.25;color:#e9eef3;background:linear-gradient(#162433f2,#0b141ff2);border:1px solid #6b5a33;border-radius:6px;box-shadow:0 4px 14px #000a;pointer-events:auto;z-index:3}
#g3leg>.hd{display:flex;align-items:center;gap:6px;padding:4px 9px;cursor:pointer;font:700 11px/16px system-ui,sans-serif;letter-spacing:.08em;color:#d8b865;user-select:none}#g3leg>.hd:after{content:'▾';margin-left:auto;opacity:.7}#g3leg.shut>.hd:after{content:'▸'}
#g3leg.shut{width:auto}#g3leg.shut>.bd{display:none}#g3leg>.bd{padding:2px 9px 7px;border-top:1px solid #6b5a3355}#g3leg .r{display:flex;align-items:center;gap:7px;margin-top:3px}#g3leg .r>i:first-child{flex:0 0 26px;display:flex;justify-content:center;font-style:normal}
#g3leg .md{color:#fff;margin:3px 0 1px;font-weight:600}#g3leg .sw{width:22px;height:12px;border-radius:2px;border:1px solid #0008}#g3leg .ln{width:24px;height:0;border-top:2px solid #f2e6c0}#g3leg .ln.th{border-top:1px solid #f2e6c088}#g3leg .rg{width:14px;height:14px;border-radius:50%;border:2px solid #46e86c;box-sizing:border-box}
#g3leg .p{position:relative;display:inline-block;height:14px;padding:0 4px 2px 16px;font:700 11px/14px system-ui,sans-serif;color:#fff;border:1px solid #000a;border-radius:2px;background:var(--rc)}#g3leg .p.me{--rc:#2d8a3c}#g3leg .p.war{--rc:#b0322a}#g3leg .p.oth{--rc:#5d646c}#g3leg .p:before{content:'';position:absolute;left:-1px;top:-2px;width:13px;height:17px;background:#e9d9a0;clip-path:polygon(0 0,100% 0,100% 64%,50% 100%,0 64%)}
`;document.head.appendChild(s);}
function g3UI(){g3Css();const w=document.getElementById('gMapWrap');if(!w)return;let u=document.getElementById('g3ui');if(u)u.remove();u=guEl('div','');u.id='g3ui';w.appendChild(u);
  G3.lab=guEl('div','position:absolute;inset:0');u.appendChild(G3.lab);const md=guEl('div','');md.id='g3modes';G3_MODES.forEach(([k,n])=>{const b=guEl('button','',n);b.type='button';b.dataset.m=k;b.onclick=ev=>{ev.stopPropagation();if(!md.classList.contains('open')){md.classList.add('open');return;}g3SetMode(k);md.classList.remove('open');};md.appendChild(b);});u.appendChild(md);   /* map mode menu folds away (Abdullah 2026-11-07 16:14 "Hide the map menu don't make it stay visible"): only the current mode shows; click it to open the list */
  document.addEventListener('pointerdown',ev=>{if(!md.contains(ev.target))md.classList.remove('open');});
  G3.bn=[];G3.nl=[];G3.natSig="";G3.pl=new Map();G3.sl=[];
  const prio=GCM.P.filter(p=>p.land).sort((a,b)=>(b.cap-a.cap)||(b.wg-a.wg)||(b.tw-a.tw));for(const p of prio){const e=guEl('div','');e.className='b'+(p.cap?' cap':'');G3.lab.appendChild(e);G3.bn.push({el:e,pi:p.i,show:false});}
  for(const p of GCM.P)if(p.sea){const e=guEl('div','');e.className='s';e.textContent=(p.ck?'◆ ':'')+p.n;G3.lab.appendChild(e);G3.sl.push({el:e,pi:p.i,ck:p.ck});}
  const bt=guEl('div','');bt.id='g3btns';u.appendChild(bt);
  const mk=(t,tip,fn,cls)=>{const b=guEl('button','',t);b.type='button';b.title=tip;if(cls)b.className=cls;b.onclick=fn;bt.appendChild(b);return b;};
  mk('✉','Monthly report',()=>g3News(true));mk('⌖','Centre on your capital (Home)',()=>{const m=GC.me&&GC.nat[GC.me];if(m)guCentre(m.cap,1);});
  mk('☰','Show / hide the province panel',()=>{const s=document.getElementById('gSide');if(s){s.style.display=s.style.display==='none'?'flex':'none';setTimeout(guResize,30);}});
  const qb=mk(g3Quality()==='ultra'?'✦✦':'✦','Grand map quality: High (default) / Ultra (sharper, heavier)',()=>{SET.g3q=g3Quality()==='ultra'?'high':'ultra';try{saveSet();}catch(e){}qb.textContent=g3Quality()==='ultra'?'✦✦':'✦';g3ApplyQuality();g3News&&0;});
  mk('⚔','Select all your armies (Ctrl+A)',()=>gmSelAll(false));mk('⚓','Select all your navies (N)',()=>gmSelAll(true));
  bt.insertBefore(md,bt.firstChild);   /* map-mode menu lives in the bottom campaign bar (Abdullah 2026-11-07 16:16) */
  G3.endB=mk('▶','Play / pause time (Space)',()=>{guSpeed(GV.spd?0:(GV.lastSpd||2));G3.endB.textContent=GV.spd?'❚❚':'▶';},'end');G3.endB.style.display='none';   /* one play control only: the clock at the top (Abdullah 2026-11-07 16:15 "don't have two go buttons") */
  const mc=document.createElement('canvas');mc.id='g3mini';mc.width=240*2;mc.height=120*2;mc.style.width='240px';mc.style.height='120px';u.appendChild(mc);G3.mc=mc;
  const mm=ev=>{const r=mc.getBoundingClientRect();G3.camera.x=Math.max(0,Math.min(2400,(ev.clientX-r.left)/240*2400));G3.camera.z=Math.max(0,Math.min(1200,(ev.clientY-r.top)/120*1200));};
  mc.addEventListener('pointerdown',ev=>{mc.setPointerCapture(ev.pointerId);mm(ev);mc._d=1;ev.stopPropagation();});mc.addEventListener('pointermove',ev=>{if(mc._d)mm(ev);});mc.addEventListener('pointerup',()=>{mc._d=0;});
  mc.addEventListener('contextmenu',ev=>{ev.preventDefault();});
  G3.leg=guEl('div','');G3.leg.id='g3leg';u.appendChild(G3.leg);g3Legend();
  G3.cardsEl=guEl('div','');G3.cardsEl.id='g3cards';u.appendChild(G3.cardsEl);G3.newsEl=guEl('div','');G3.newsEl.id='g3news';u.appendChild(G3.newsEl);G3.newsEl.onclick=()=>{G3.newsEl.style.display='none';};
  g3SetMode(G3.mode,true);}
/* gclarity (Abdullah 2026-11-07 19:52 "I don't know what the big areas mean"): a small "What am I looking at?" key, bottom-left, folds away and remembers it (SET.g3leg) */
function g3Legend(){const L=G3.leg;if(!L)return;const shut=SET.g3leg==='shut';L.className=shut?'shut':'';
  const r=(ic,t,tip)=>'<div class="r" title="'+(tip||t).replace(/"/g,'&quot;')+'"><i>'+ic+'</i><span>'+t+'</span></div>',me=GC&&GC.me?grNat(GC.me).color:'#4caf50';
  L.innerHTML='<div class="hd" title="Click to show or hide the map key">ⓘ WHAT AM I LOOKING AT?</div><div class="bd"><div class="md">'+(G3.legHint||'')+'</div>'
   +r('<i class="sw" style="background:'+me+'"></i>','Land colour = who owns it','Political map: each country is painted in its own colour. Switch the map mode (bottom right) to see supply, unrest, trade…')
   +r('<span style="font:700 12px Georgia,serif;letter-spacing:.15em">IRAN</span>','Country names, painted on the land','Zoom in and they fade so towns and armies stand out.')
   +r('<i class="ln"></i>','Country border','Thick line = border between two countries.')+r('<i class="ln th"></i>','Province border','Thin line = border between provinces of one country.')
   +r('<i class="p me">12</i>','Your army (number = units)','Green shield = yours. Bar under it = strength, small upright bar = morale. Armies in one province share one shield. Click to select, Shift+drag to box-select.')
   +r('<i class="p war">8</i>','Enemy army (at war with you)','Red shield = a nation you are at war with.')+r('<i class="p oth">5</i>','Other army (not at war)','Grey shield = a nation you are not at war with.')
   +r('<i class="rg"></i>','Selection ring','Green = yours, red = enemy, gold = others.')
   +r('★','Capital','Star on a nameplate = that country\'s capital. Losing it hurts morale and stability.')
   +r('<span style="font-size:11px">🏘</span>','Town (zoom in for all towns)','Each province shows one town cluster; big cities show more. Zoom in close to see every town with its fields and walls.')
   +'<div style="margin-top:4px;opacity:.75;font-size:11px">Hover a province to see its buildings. ◆ on a sea = chokepoint.</div></div>';
  L.firstChild.onclick=ev=>{ev.stopPropagation();SET.g3leg=SET.g3leg==='shut'?'open':'shut';try{saveSet();}catch(e){}g3Legend();};}
function g3SetMode(m,quiet){G3.mode=m;document.querySelectorAll('#g3modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  const hint={political:'Owner colours at the borders; thin lines mark frontiers.',terrain:'Terrain only, no tint.',trade:'Amber = oil, farms, mines and ports.',supply:'Green = supplied from the capital; red = cut off.',unrest:'Red = restless provinces.',culture:'Colour = culture region; striped = occupied land.',alliances:'Green = you, red = at war with you, grey = neutral.',development:'Darker blue = more developed.'}[m];
  G3.legHint=(G3_MODES.find(x=>x[0]===m)||[0,m])[1]+' — '+hint;g3Legend();if(!quiet&&G3.R){g3PaintOverlay();G3.tOv.needsUpdate=true;G3.miniDirty=true;}}
function g3Icon(cv,k,o){const c=cv.getContext('2d'),W=cv.width,H=cv.height,col=grNat(o).color,rg=grNatRgb(o);const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgb('+rg.map(v=>Math.round(v*.55)).join(',')+')');g.addColorStop(1,'#101a24');c.fillStyle=g;c.fillRect(0,0,W,H);
  UK.drawUnit(c,k,W,H,col);}   /* ingameui: silhouettes live in the UI kit (08j) so battle cards use the same ones */
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
      let x=0,z=0,w=0;for(const q of ps)if(Math.abs(q.x-best.x)<R&&Math.abs(q.y-best.y)<R){x+=q.x*ar[q.i];z+=q.y*ar[q.i];w+=ar[q.i];}x/=w;z/=w;
      /* gclarity (EU4 political map): the name runs along the territory's long axis — area-weighted principal axis of the main landmass */
      let sxx=0,szz=0,sxz=0;for(const q of ps)if(Math.abs(q.x-best.x)<R&&Math.abs(q.y-best.y)<R){const a=ar[q.i],dx=q.x-x,dz=q.y-z;sxx+=a*dx*dx;szz+=a*dz*dz;sxz+=a*dx*dz;}sxx/=w;szz/=w;sxz/=w;
      const tr=(sxx+szz)/2,dt=Math.sqrt(Math.max(0,(sxx-szz)*(sxx-szz)/4+sxz*sxz)),l1=tr+dt,l2=Math.max(0,tr-dt),th=.5*Math.atan2(2*sxz,sxx-szz),own=Math.sqrt(w)*1.1;   // own: rough size from the area itself (one-province nations)
      return {o,x,z,n:ps.length,ax:Math.cos(th),az:Math.sin(th),hl:Math.max(own*.5,Math.sqrt(3*l1)),hw:Math.max(own*.4,Math.sqrt(3*l2))};});
    while(G3.nl.length<G3.nat.length){const e=guEl('div','');e.className='n';G3.lab.appendChild(e);G3.nl.push(e);}G3.nat.forEach((r,i)=>{G3.nl[i].textContent=GCM.nats.get(r.o).name.toUpperCase();});}
    const rects=[],hit=(x0,y0,x1,y1)=>{for(const r of rects)if(x0<r[2]&&x1>r[0]&&y0<r[3]&&y1>r[1])return true;rects.push([x0,y0,x1,y1]);return false;};   /* C-LABELS: one shared collision list, nation names first, then banners by priority */
  const nord=G3.nat.map((r,i)=>i).sort((i,j)=>G3.nat[j].n-G3.nat[i].n);const shownN=new Set();
  /* gclarity: country names painted across the land (EU4): serif, along the long axis, sized to the territory, fading out as you zoom in to close zoom; they sit under plates and don't push them away */
  const nrc=[],nhit=(cx,cy,hl,ang,f)=>{const ca=Math.cos(ang/57.2958),sa=Math.sin(ang/57.2958),P=[],m=Math.max(1,Math.ceil(hl/f));for(let k=-m;k<=m;k++)P.push([cx+ca*hl*k/m,cy+sa*hl*k/m]);   // names collide as thick lines (samples every ~1 letter along the text), not as boxes
    for(const c of nrc){const lim=(c.f+f)*.5;for(const a of P)for(const b of c.P)if(Math.abs(a[0]-b[0])<lim&&Math.abs(a[1]-b[1])<lim)return true;}nrc.push({P,f});return false;};
  for(const i of nord){const r=G3.nat[i],e=G3.nl[i];if(!e)continue;const f=d>G3_CLOSE+10&&(r.n>=2||d<1300)&&(grNat(r.o).major||r.n>=3||d<1000);let q=f?proj(r.x,3,r.z):null;
    if(q){const a=proj(r.x+r.ax*r.hl,3,r.z+r.az*r.hl),b=proj(r.x-r.ax*r.hl,3,r.z-r.az*r.hl),c2=proj(r.x-r.az*r.hw,3,r.z+r.ax*r.hw);
      if(!a||!b){q=null;}else{const L=Math.hypot(a[0]-b[0],a[1]-b[1]),W2=c2?Math.hypot(c2[0]-q[0],c2[1]-q[1])*2:L*.4,txt=e.textContent||'',nc=Math.max(3,txt.length);
        let ang=Math.atan2(a[1]-b[1],a[0]-b[0])*57.2958;if(ang>90)ang-=180;if(ang<-90)ang+=180;if(W2>L*.7)ang*=Math.max(0,(L-W2)/(L*.3));   // roundish land: keep the name level
        const fs=Math.max(0,Math.min(44,L*.8/(nc*1.3),Math.max(14,W2*.6)));
        const sp=Math.max(.12,Math.min(.9,(L*.86/nc-fs*.78)/fs));if(fs<10||nhit(q[0],q[1],nc*fs*(.78+sp)/2,ang,fs))q=null;else{const k=Math.round(fs)+'|'+Math.round(ang)+'|'+sp.toFixed(2);if(e._k!==k){e._k=k;e.style.fontSize=Math.round(fs)+'px';e.style.letterSpacing=sp.toFixed(2)+'em';}
          e.style.opacity=(Math.min(.62,Math.max(0,(d-G3_CLOSE)/260))).toFixed(2);const t='translate('+Math.round(q[0])+'px,'+Math.round(q[1])+'px) translate(-50%,-50%) rotate('+ang.toFixed(1)+'deg)';if(e._t!==t){e._t=t;e.style.transform=t;}}}}
    vis(e,!!q);}
  for(let i=G3.nat.length;i<G3.nl.length;i++)vis(G3.nl[i],false);
  // province banners
  const cand=[];
  /* gclarity: close zoom = every province plate; region zoom = only capitals (nation capitals up to mid zoom), your capital, the selected and the hovered province */
  const close=d<G3_CLOSE;
  for(const b of G3.bn){const p=GCM.P[b.pi],st=GC.prov[b.pi];let q=null;const hot=b.pi===GV.sel||b.pi===GV.hov,myCap=GC.me&&st.o===GC.me&&GC.nat[GC.me]&&GC.nat[GC.me].cap===b.pi,natCap=GC.nat[st.o]&&GC.nat[st.o].cap===b.pi;
    if(hot||myCap||(close&&d<1700)||(natCap&&d<900)){const tw=g3Towns().find(t=>t.pi===b.pi),x=tw?tw.x:p.x,z=tw?tw.z:p.y;q=proj(x,g3HeightAt(x,z)+9+(p.cap?3:0),z);}
    if(!q){vis(b.el,false);continue;}
    const own=GC.nat[st.o]&&GC.nat[st.o].cap===b.pi,pri=(b.pi===GV.sel||st.o===GC.me&&p.cap)?6:own?(grNat(st.o).major?4:3):p.cap?3:p.wg?2:p.tw>=3?1:0;
    cand.push({b,q,p,st,own,pri});}
  cand.sort((u,w)=>w.pri-u.pri);
  for(const c of cand){const {b,q,p,st,own}=c,wd=(p.n.length+(own?2:0))*8.2+52;
    if(c.pri<6&&hit(q[0]-wd/2,q[1]-34,q[0]+wd/2,q[1]+2)){vis(b.el,false);continue;}if(c.pri>=6)rects.push([q[0]-wd/2,q[1]-34,q[0]+wd/2,q[1]+2]);
    const N=grNat(st.o),full=close||b.pi===GV.sel||b.pi===GV.hov,html='<i class="em" style="background-image:url('+g3FlagUrl(st.o)+')"></i><span class="t"><b>'+(own?'★ ':'')+p.n+(GC.me&&st.o===GC.me&&st.un>55?' <span style="color:#ffb0a0">!</span>':'')+'</b>'+(full?'<small>'+(N.name||st.o)+' '+(b.pi===GV.sel||b.pi===GV.hov?geIcons(b.pi):'')+'</small>':'')+'</span>';   /* gclarity: building chips only on hover/selection; the nation line only up close (the country name is painted on the land) */if(b.h!==html){b.h=html;b.el.innerHTML=html;b.el.style.setProperty('--nc',N.color);}   /* Rome-style nameplate (Abdullah 19:33 reference): owner-colour pill, round flag emblem, city + nation */
    put(b.el,q);vis(b.el,true);}
  for(const s of G3.sl){const p=GCM.P[s.pi],f=s.ck?d<1500:d<650;let q=f?proj(p.x,1,p.y):null;if(!q){vis(s.el,false);continue;}putC(s.el,q);vis(s.el,true);}
  // army plates + click targets
  G3.hit=[];const s=G3.sc_s;
  /* gclarity (EU4 reference, Abdullah 2026-11-07 20:01): one compact shield per stack — nation flag + total unit count, green = yours, red = at war with you, grey = others,
     strength bar underneath, morale pip; every army in the same province with the same owner merges into one shield. Click targets stay per army (G3.hit). */
  const grp=new Map();
  for(const a of GC.armies){const e=G3.arm.get(a.id);if(!e)continue;const q=proj(e.g.position.x,e.g.position.y+(e.sea?6:3)*s,e.g.position.z),top=proj(e.g.position.x,e.g.position.y+13*s,e.g.position.z);
    if(!q||!grSeen(a)){e.g.visible=!!q&&grSeen(a);continue;}e.g.visible=true;   /* laneA RG3 fog hook */
    {const ft=proj(e.g.position.x,e.g.position.y+28*s,e.g.position.z),yT=ft?ft[1]:(top?top[1]:q[1]-40);   // whole figure is the target: flag top → number badge (Abdullah 19:58 "not being able to click on armies or navies")
     G3.hit.push({aid:a.id,x:q[0],y:top?(q[1]+top[1])/2:q[1],r:Math.max(16,top?Math.abs(q[1]-top[1])*.7:16),y0:Math.min(yT,q[1])-10,y1:q[1]+30,w:Math.max(24,top?Math.abs(q[1]-top[1])*.6:24)});}
    const k=a.at+'|'+a.o;let g=grp.get(k);if(!g){g={k,a,q,L:[]};grp.set(k,g);}g.L.push(a);if(a.id===GV.selA){g.a=a;g.q=q;}}
  const gl=[...grp.values()].map(g=>({g,r:g.a.id===GV.selA||g.L.some(x=>x.id===GV.selA)?2:g.a.o===GC.me?1:0})).sort((u,w)=>w.r-u.r),pq=[],used=new Set();
  for(const {g,r} of gl){const mine=g.a.o===GC.me,sel=r===2;if(!(d<1100||mine||sel))continue;let bad=false;if(r<1)for(const o of pq)if(Math.abs(o[0]-g.q[0])<34&&Math.abs(o[1]-g.q[1])<20){bad=true;break;}if(bad)continue;pq.push(g.q);
    let pl=G3.pl.get(g.k);if(!pl){pl=guEl('div','');pl.className='p';G3.lab.appendChild(pl);G3.pl.set(g.k,pl);}used.add(g.k);pl._ids=g.L.map(x=>x.id);
    let n=0,hs=0,ms=0,mo=0;for(const a of g.L){n+=a.u.length;for(const u of a.u){hs+=u.hp||0;ms+=u.max||0;}mo+=(typeof gmMor==='function'?gmMor(a):100)*a.u.length;}mo=n?mo/n:100;
    const st=ms>0?Math.max(0,Math.min(100,Math.round(100*hs/ms))):100,war=!mine&&GC.me&&typeof grAtWar==='function'&&grAtWar(GC.me,g.a.o),rel=mine?'me':war?'war':'oth',h=n+'|'+rel+'|'+sel+'|'+st+'|'+Math.round(mo/5)+'|'+g.a.o;
    if(pl._h!==h){pl._h=h;pl.className='p '+rel+(sel?' sel':'');pl.style.setProperty('--st',st+'%');pl.style.setProperty('--mv',Math.round(mo)+'%');pl.style.setProperty('--mc',mo>66?'#7fdc6a':mo>33?'#f0c040':'#ff5a4a');
      if(typeof gmIds==='function'){const I=gmIds();pl.classList.toggle('gmsel',I.length>1&&g.L.some(x=>I.includes(x.id)));}pl.innerHTML='<i class="fw"><i class="fl" style="background-image:url('+g3FlagUrl(g.a.o)+')"></i></i><b>'+(n>=1000?(n/1000).toFixed(1)+'k':n)+'</b><i class="mp"></i>';}
    const t='translate('+Math.round(g.q[0])+'px,'+Math.round(g.q[1]+8)+'px) translate(-50%,0)';if(pl._t!==t){pl._t=t;pl.style.transform=t;}vis(pl,true);}
  for(const [k,pl] of G3.pl)if(!used.has(k))vis(pl,false);
  if(G3.pl.size>400)for(const [k,pl] of G3.pl)if(!used.has(k)){pl.remove();G3.pl.delete(k);}}
function g3Frame(ts){G3.raf=requestAnimationFrame(g3Frame);if(!G3.R||!GV.cv||!document.body.contains(GV.cv)||!GC){if(!GV.cv||!document.body.contains(GV.cv))g3Dispose();return;}
  const scr=document.getElementById('grandScreen');if(!scr||scr.style.display==='none'){G3.last=0;return;}
  const dt=G3.last?Math.min(.1,(ts-G3.last)/1000):.016;G3.last=ts;G3.time+=dt;g3Adapt(dt);if(!G3.miniSync&&G3.miniReady){G3.miniSync=1;try{g3SyncArmies();}catch(e){console.warn(e);}}
  // keys
  const c=G3.camera,K=G3.keys;if(K.size&&!document.getElementById('gModal')){const sp=c.d*.9*dt,sy=Math.sin(c.yaw),cy=Math.cos(c.yaw);let fx=0,fz=0;if(K.has('w')||K.has('arrowup'))fz-=1;if(K.has('s')||K.has('arrowdown'))fz+=1;if(K.has('a')||K.has('arrowleft'))fx-=1;if(K.has('d')||K.has('arrowright'))fx+=1;
    c.x=Math.max(0,Math.min(2400,c.x+(fx*cy+fz*sy)*sp));c.z=Math.max(0,Math.min(1200,c.z+(-fx*sy+fz*cy)*sp));if(K.has('q'))c.yaw+=dt*1.2;if(K.has('e'))c.yaw-=dt*1.2;if(K.has('r'))c.pitch=Math.min(1.3,c.pitch+dt*.8);if(K.has('f'))c.pitch=Math.max(.45,c.pitch-dt*.8);if(K.has('+')||K.has('='))c.d*=1-dt*1.5;if(K.has('-'))c.d*=1+dt*1.5;}
  c.d=Math.max(32,Math.min(2300,c.d));const cc=G3.cc,kk=Math.min(1,dt*11);let mv=0;for(const k of ['x','z','d','yaw','pitch']){const df=c[k]-cc[k];if(Math.abs(df)>1e-3){cc[k]+=df*kk;mv=1;}}if(mv||G3.moved){g3CamApply(cc);G3.moved=false;mv=1;}try{g3TerrLOD();}catch(e){}
  const s=Math.max(.45,Math.min(3.6,cc.d/330));   /* realmap: provinces are real-sized, so figures shrink further when zoomed in */G3.sc_s=s;G3.U.uRim.value=Math.max(1.2,Math.min(4,cc.d/420));G3.U.uTime.value=G3.time;(G3.flagT||(G3.flagT={value:0})).value=G3.time;if(G3.chimU){G3.chimU.uT.value=G3.time;G3.chimU.uPx.value=(G3.R.domElement.height||900)*.9;G3.chim.visible=cc.d<1100;}if(G3.vigU){const ph=(G3.time%300)/300,n=Math.max(0,Math.min(1,(Math.sin(ph*6.2832-1.2)-.1)*2.2));G3.vigU.uN.value=n;if(G3.lightU)G3.lightU.uNight.value=n;}if(G3.lightU){G3.lightU.uT.value=G3.time;G3.lightU.uPx.value=(G3.R.domElement.height||900)*.9;G3.lightU.uFar.value=Math.max(0,Math.min(1,(cc.d-300)/900));}
  g3TownLOD(cc.d);G3.U.uOvK.value=G3.mode==='political'?1+1.7*g3Smooth(G3_CLOSE,520,cc.d):1;   /* gclarity: flat EU4-style political colours from region zoom out */
  G3.U.uSel.value=GV.sel>=0?GV.sel:-1;G3.U.uHov.value=GV.hov>=0&&GV.hov!==GV.sel?GV.hov:-1;
  // armies
  const anc=g3Anchors(s);let anim=0;for(const a of GC.armies){const e=G3.arm.get(a.id);if(!e)continue;const t=anc.get(a.id);if(!t)continue;
    if(e.tt<1){e.tt=Math.min(1,e.tt+dt/.45);const k=1-(1-e.tt)*(1-e.tt);e.x=e.fx+(t[0]-e.fx)*k;e.z=e.fz+(t[1]-e.fz)*k;anim=1;e.face=Math.atan2(t[0]-e.fx,t[1]-e.fz);}
    else if(e.mv){e.x=t[0];e.z=t[1];e.mv=0;}else{e.x+=(t[0]-e.x)*Math.min(1,dt*8);e.z+=(t[1]-e.z)*Math.min(1,dt*8);}
    const y=e.sea?.5+Math.sin(G3.time*1.4+e.aid)*.35:Math.max(.3,g3HeightAt(e.x,e.z))+(e.tt<1?Math.abs(Math.sin(G3.time*9))*.5:0);e.g.position.set(e.x,y,e.z);e.g.scale.setScalar(s*(e.sea?1.1:1+.8*Math.max(0,Math.min(1,(800-cc.d)/400))));   /* armies3: big hero up close */e.g.rotation.y=cc.yaw;{const f=e.g.children[1];if(f&&!e.sea){const fs=Math.max(1,Math.min(1.8,cc.d/300));f.scale.setScalar(fs);f.position.y=22-2.4*fs;}const mine=a.o===GC.me||a.id===GV.selA;e.g.visible=e.mini;{const lo=cc.d>480||Math.hypot(e.x-cc.x,e.z-cc.z)>cc.d*.8+30?1:0;if(e.mini&&e.lod!==lo){e.lod=lo;const m0=e.g.children[0],hg=e.hi;if(hg)m0.geometry=lo&&hg.userData.lo?hg.userData.lo:hg;}}   /* detail LOD: ~3k-tri hero up close, ~0.7k from region zoom */if(f)f.visible=e.mini&&(cc.d<G3_CLOSE||mine);}   /* gclarity: from region zoom other nations' flags live on their army shields (EU4 look); yours and the selected army keep the big flag */   /* smooth first (Abdullah 14:15): at world zoom other nations' armies are shown by their count plates only (2 draw calls each saved) */
    if(e.sea)e.g.children[0].rotation.y=Math.PI/2*0;}
  g3ForestTick();g3Batch();
  // selection ring
  /* Total War-style selection ring (Abdullah 19:29 reference shot): four soft segments, green = yours, red = enemy at war, gold = others; on the selected army, else on the selected province's main town */
  {const sa=GV.selA&&G3.arm.get(GV.selA);let X,Y,Z,R,o;if(sa){X=sa.x;Y=sa.g.position.y+.4;Z=sa.z;R=s*(sa.sea?7:5);o=sa.o;}else if(GV.sel>=0&&GCM.P[GV.sel]&&GCM.P[GV.sel].land){const tw=g3Towns().find(t=>t.pi===GV.sel&&t.t===0);if(tw){X=tw.x;Z=tw.z;Y=g3HeightAt(X,Z)+.4;R=Math.max(6,Math.min(30,14*tw.sc));o=GCM.P[GV.sel].o;}}
   if(X!==undefined){const m=G3.ringM;m.visible=true;m.position.set(X,Y,Z);m.scale.setScalar(R*(1+.04*Math.sin(G3.time*3)));m.rotation.y=G3.time*.25;m.material.color.setHex(o===GC.me?0x46e86c:(GC.me&&typeof grAtWar==='function'&&grAtWar(GC.me,o))?0xff4a3d:0xffd04a);}else G3.ringM.visible=false;}
  const sig=GV.selA+'|'+GV.sel+'|'+GC.turn+'|'+GC.armies.length+'|'+GC.armies.reduce((a,x)=>a+x.u.length+x.path.length,0);
  if(sig!==G3.sig||G3.arrowDirty){G3.sig=sig;G3.arrowDirty=false;g3BuildArrows();g3Cards();G3.miniDirty=G3.miniDirty||0;}
  if(G3.ship)g3ShipTick(dt,s);
  G3.R.render(G3.sc,G3.cam);if(G3.vigS){const ac=G3.R.autoClear;G3.R.autoClear=false;G3.R.render(G3.vigS,G3.vigC);G3.R.autoClear=ac;}
  if(G3.lHov!==GV.hov+'|'+GV.sel){G3.lHov=GV.hov+'|'+GV.sel;G3.lblDirty=true;}
  if(mv||anim||G3.lblDirty||(G3.lf=(G3.lf||0)+1)%20===0){g3Labels(false);G3.lblDirty=false;}
  if(mv||(G3.lf%12===0)||G3.miniDirty)g3Mini();}
if(!window._g3Keys){window._g3Keys=1;const ok=ev=>{const t=ev.target&&ev.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return false;const sc=document.getElementById('grandScreen');return !!sc&&sc.style.display!=='none'&&GV.g3&&!G;};
  addEventListener('keydown',ev=>{if(!ok(ev)||ev.ctrlKey||ev.metaKey||ev.altKey)return;const k=ev.key.toLowerCase();if('wasdqerf'.includes(k)&&k.length===1||k.startsWith('arrow'))G3.keys.add(k);if(k==='home'){const m=GC&&GC.me&&GC.nat[GC.me];if(m)guCentre(m.cap,1);}});
  addEventListener('keyup',ev=>{G3.keys.delete(ev.key.toLowerCase());});addEventListener('blur',()=>G3.keys.clear());}
(function g3Credits(){try{if(document.getElementById('neCred'))return;const ps=[...document.querySelectorAll('p.credits')];if(!ps.length)return;
  const p=document.createElement('p');p.className='credits';p.id='neCred';p.textContent='Grand map countries, provinces (admin-1), coastlines, lakes and rivers: Natural Earth (public domain, naturalearthdata.com), Equal Earth projection. Grand map ground detail textures are generated in-game (original, no outside assets). Grand map elevation and sea depth: Terrarium terrain tiles (Mapzen / AWS Open Data; derived from ETOPO1, GEBCO, SRTM and other public datasets). Painted ground colour and shaded relief: Natural Earth HYP_HR_SR_OB_DR cross-blended hypsometric tints (public domain).';ps[ps.length-1].insertAdjacentElement('afterend',p);}catch(e){}})();
