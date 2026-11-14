// look1 — real geography + light for the 3D grand map (Abdullah 2026-11-06 "make it look like a $60 studio game").
// Real elevation/bathymetry (Terrarium tiles: ETOPO1/GEBCO/SRTM) and a satellite-like colour base (Natural Earth I) are baked by
// orch/look1-bake.py into grand/elev.png + grand/color.jpg, warped to the grand-map projection. g3Fields() (13e) calls g3RealFields()
// when they have loaded; otherwise the old procedural look is used. Rendering only - no rules.
const G3L={sun:[-1.0,.75,-.45]};   // direction TOWARDS the sun (x east, y up, z south); terrain shadows are baked against it
function g3LoadReal(){if(G3.real||G3.realTry)return;G3.realTry=1;
  const ld=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.blob();}).then(b=>createImageBitmap(b,{colorSpaceConversion:'none',premultiplyAlpha:'none'}));
  const px=(bm)=>{const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bm,0,0);return x.getImageData(0,0,c.width,c.height);};
  Promise.all([ld('grand/elev.png?v=2'),ld('grand/color.jpg?v=3'),ld('grand/hi_me.jpg?v=2').catch(()=>null)]).then(([eb,cb,hb])=>{
    if(hb){try{const h=px(hb);G3.hi={d:g3GradeColor(h.data,h.width*h.height),w:h.width,h:h.height,r:[.555,.22333333,.14,.25]};}catch(e){G3.hi=null;}}
    const e=px(eb),c=px(cb),E=new Float32Array(e.width*e.height);for(let k=0;k<E.length;k++)E[k]=e.data[k*4]*256+e.data[k*4+1]-11000;
    G3.real={E,EW:e.width,EH:e.height,col:c.data,CW:c.width,CH:c.height};setTimeout(()=>{try{if(typeof g3ForestRefresh==='function')g3ForestRefresh();}catch(e){console.warn('forest refresh',e);}},0);}).catch(()=>{G3.realFail=1;});}
// ground colour grade (satellite -> rich, slightly warm, a little darker than the washed-out raster)
function g3GradeColor(col,n){const o=new Uint8ClampedArray(n*4);
  for(let k=0;k<n;k++){let r=col[k*4]/255,g=col[k*4+1]/255,b=col[k*4+2]/255;const l=.3*r+.59*g+.11*b,sat=1.85;r=l+(r-l)*sat;g=l+(g-l)*sat;b=l+(b-l)*sat;
    r=Math.pow(Math.max(0,r),1.3)*.96;g=Math.pow(Math.max(0,g),1.24)*.95;b=Math.pow(Math.max(0,b),1.34)*.93;
    const o4=k*4;o[o4]=r*255;o[o4+1]=g*255;o[o4+2]=b*255;o[o4+3]=255;}
  return o;}
// Called at the end of g3Fields(): swaps the hand-shaped relief/colour for the real data and bakes sun shadows + valley AO + relief normals.
function g3RealFields(F){const R=G3.real,W=F.W,H=F.H,E=R.E,EW=R.EW,Hh=F.Hh,Ls=F.Ls,Lw=F.Lw,N=W*H;
  const hm=new Float32Array(N);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=2*y*EW+2*x;hm[y*W+x]=(E[o]+E[o+1]+E[o+EW]+E[o+EW+1])/4;}
  const SC=.0024,SK=.0078/SC,NG=.42,CE=m=>m<1800?m:1800+(m-1800)*.6;F.hm=hm; // relief height: gentle - 3,000 m = 6 map units, 8,000 m = 13 (was 12 and 32, before that 23 and 62: ranges stood like walls); CE flattens the highest ground so plateaus and peaks do not tower; SK keeps the rock paint where it was; NG = shading steepness
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,ls=Ls[k],m=hm[k],coast=g3Smooth(.4,.8,ls),n=g3Fbm(x*.02,y*.02,4);
    const landH=coast*(1+n*1.3)+CE(Math.max(0,m))*SC;
    const sea=Math.min(-.8+Math.min(0,Math.max(m,-4500))/500,-.8-4*Math.pow(1-Lw[k],2));Hh[k]=sea+(landH-sea)*g3Smooth(.42,.6,ls);if(ls>=.5&&Hh[k]<.45)Hh[k]=.45;}
  // flatten the ground around every land province's towns so cities stay readable even in real mountains (Tehran sits against the Alborz)
  {const fl=new Float32Array(N);for(const q of GCM.P){if(!q.land)continue;const cx=Math.round(q.x/2),cy=Math.round(q.y/2);
    for(let dy=-40;dy<=40;dy++){const y=cy+dy;if(y<0||y>=H)continue;for(let dx=-40;dx<=40;dx++){const x=cx+dx;if(x<0||x>=W)continue;const w=1-g3Smooth(12,38,Math.hypot(dx,dy));if(w>fl[y*W+x])fl[y*W+x]=w;}}}
    const hc=new Float32Array(N);for(let k=0;k<N;k++)hc[k]=Hh[k]<.45?.45:Hh[k];   /* mapcoast: flatten towards the level of the land around, not the sea bed - towns on islands and thin peninsulas (Sicily, Crete, Italy's heel) no longer sink under water */
    const b2=g3Blur(hc,W,H,10,2);for(let k=0;k<N;k++)if(Ls[k]>.5&&fl[k]>0)Hh[k]+=(b2[k]-Hh[k])*fl[k]*.92;F.fl=fl;}
  // colour: graded satellite base at its own resolution
  const CW=R.CW,CH=R.CH;F.PW=CW;F.PH=CH;F.px=g3GradeColor(R.col,CW*CH);
  // mapcoast: the satellite picture's pale sea starts a little inside the drawn coast - pull the nearest inland ground colour out to the shoreline (and a pixel past it)
  if(F.cd&&F.FW){const FW=F.FW,FH=F.FH,cd=F.cd,px=F.px,kx=CW/FW,ky=CH/FH,blue=o=>px[o+2]>px[o]+18&&px[o+2]>px[o+1]-12;
    for(let y=3;y<FH-3;y++)for(let x=3;x<FW-3;x++){const k=y*FW+x,c=cd[k];if(c>131||c<121)continue;
      let b=k,bc=c;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const n=k+dy*FW+dx;if(cd[n]<bc){bc=cd[n];b=n;}}
      const so=(Math.min(CH-1,((((b/FW)|0)+.5)*ky)|0)*CW+Math.min(CW-1,((b%FW+.5)*kx)|0))*4,ok=b!==k&&!blue(so),r=ok?px[so]:132,g=ok?px[so+1]:138,bl=ok?px[so+2]:96,y1=Math.min(CH,Math.ceil((y+1)*ky)),x1=Math.min(CW,Math.ceil((x+1)*kx));
      for(let ty=Math.floor(y*ky);ty<y1;ty++)for(let tx=Math.floor(x*kx);tx<x1;tx++){const o=(ty*CW+tx)*4;if(blue(o)){px[o]=r;px[o+1]=g;px[o+2]=bl;}}}}
  // biome weights for the detail shader from real data: rock (steep/high), snow (high/polar), sand (desert colour), vegetation (green)
  const bw=new Uint8Array(N*4),sx=CW/W,sy=CH/H,col=R.col;
  // snow line (fixes1): bright colorless ground only counts as snow where snow can lie - above a height that falls with latitude
  // (4,600 m up to 24 degrees, 1,500 m at 38, sea level from 60). Pale desert rock and salt flats in Arabia or the Sahara are never snow.
  const snowLine=new Float32Array(H);for(let y=0;y<H;y++){const la=Math.abs(typeof gsupLat==='function'?gsupLat({y:(y+.5)*1200/H}):45);snowLine[y]=la<=24?4600:la<=38?4600-(la-24)/14*3100:Math.max(0,1500-(la-38)/22*1500);}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,ci=(Math.min(CH-1,Math.floor((y+.5)*sy))*CW+Math.min(CW-1,Math.floor((x+.5)*sx)))*4,r=col[ci]/255,g=col[ci+1]/255,b=col[ci+2]/255;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),lum=.3*r+.59*g+.11*b,sat=mx>0?(mx-mn)/mx:0,coast=g3Smooth(.4,.8,Ls[k]),m=hm[k];
    const hl=Hh[y*W+Math.max(0,x-1)],hr=Hh[y*W+Math.min(W-1,x+1)],hu=Hh[Math.max(0,y-1)*W+x],hd=Hh[Math.min(H-1,y+1)*W+x],sl=Math.hypot(hr-hl,hd-hu)/4*SK;
    const rock=Math.max(g3Smooth(.35,1.3,sl)*coast,g3Smooth(2600,4300,m)*.9),snow=Math.max(g3Smooth(3900,5200,m),g3Smooth(.82,.93,lum)*(1-g3Smooth(.07,.15,sat))*coast*g3Smooth(snowLine[y]-700,snowLine[y],m));
    const sand=Math.max(g3Smooth(.12,.26,(r-b))*g3Smooth(.55,.72,lum)*(1-g3Smooth(.0,.06,g-r)),g3Smooth(.5,.58,Ls[k])*(1-g3Smooth(.62,.8,Ls[k])));
    const veg=g3Smooth(-.04,.05,g-r)*coast*(1-sand);
    const o=k*4;bw[o]=Math.min(255,rock*255);bw[o+1]=Math.min(255,snow*255);bw[o+2]=Math.min(255,sand*255);bw[o+3]=Math.min(255,veg*255);}
  F.bw=bw;
  // sun shadows (soft, marched on the 1200x600 height grid) + valley AO (height vs its blur)
  const sd=G3L.sun,hl=Math.hypot(sd[0],sd[2]),dx=sd[0]/hl,dz=sd[2]/hl,tn=sd[1]/hl,sh=new Float32Array(N),STEPS=56;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,h0=Hh[k];if(h0<.3){sh[k]=1;continue;}let occ=0;
    for(let s=2;s<=STEPS;s+=(s<12?1:2)){const X=Math.round(x+dx*s),Y=Math.round(y+dz*s);if(X<0||X>=W||Y<0||Y>=H)break;const d=2*s,ex=Hh[Y*W+X]-(h0+d*tn);if(ex>0){const o=Math.min(1,ex/(1.5+d*.12));if(o>occ){occ=o;if(occ>=1)break;}}}
    sh[k]=1-occ*.92;}
  const bl=g3Blur(Hh,W,H,7,2),ao=new Float32Array(N);for(let k=0;k<N;k++){ao[k]=Math.max(.55,Math.min(1.08,1-(bl[k]-Hh[k])*.055+(Hh[k]-bl[k])*.012));}
  // relief normals at 2x resolution (real DEM detail on top of the mesh heights) + shadow/AO -> RGBA8: nx, nz, shadow, ao
  const LW=EW,LH=R.EH,lit=new Uint8Array(LW*LH*4),h2=new Float32Array(LW*LH);
  for(let y=0;y<LH;y++){const fy=Math.max(0,Math.min(H-1.001,(y+.5)/2-.5)),y0=fy|0,ty=fy-y0;for(let x=0;x<LW;x++){const fx=Math.max(0,Math.min(W-1.001,(x+.5)/2-.5)),x0=fx|0,tx=fx-x0;
    const a=y0*W+x0,up=(Hh[a]*(1-tx)+Hh[a+1]*tx)*(1-ty)+(Hh[a+W]*(1-tx)+Hh[a+W+1]*tx)*ty,um=(hm[a]*(1-tx)+hm[a+1]*tx)*(1-ty)+(hm[a+W]*(1-tx)+hm[a+W+1]*tx)*ty,m=E[y*LW+x];
    h2[y*LW+x]=up+(m>0&&um>0?(m-um)*SC*(1-F.fl[a]*.9):0);}}
  for(let y=0;y<LH;y++)for(let x=0;x<LW;x++){const k=y*LW+x,xl=Math.max(0,x-1),xr=Math.min(LW-1,x+1),yu=Math.max(0,y-1),yd=Math.min(LH-1,y+1);
    const nx=-(h2[y*LW+xr]-h2[y*LW+xl])/2,nz=-(h2[yd*LW+x]-h2[yu*LW+x])/2,q=((y>>1)*W+(x>>1)),o=k*4;
    lit[o]=Math.max(0,Math.min(255,(nx*NG*.25+.5)*255));lit[o+1]=Math.max(0,Math.min(255,(nz*NG*.25+.5)*255));lit[o+2]=Math.min(255,sh[q]*255);lit[o+3]=Math.min(255,ao[q]*235);}
  F.lit=lit;F.LW=LW;F.LH=LH;}
// water depth for the sea shader (0 shore .. 1 abyss) from the real bathymetry
function g3SeaDepth(F,k){return F.hm?Math.max(0,Math.min(1,-F.hm[k]/3800)):Math.max(0,Math.min(1,(1-F.Lw[k])*1.2));}
if(typeof window!=='undefined')setTimeout(()=>{try{g3LoadReal();}catch(e){}},1500);

// drifting cloud shadows: cheap value-noise on the world xz plane (shared by terrain + sea shaders); returns a multiplier ~0.78..1
const G3_CLOUD=`float g3ch(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float g3cn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(g3ch(i),g3ch(i+vec2(1.,0.)),f.x),mix(g3ch(i+vec2(0.,1.)),g3ch(i+vec2(1.,1.)),f.x),f.y);}
float g3cloud(vec2 w,float t){vec2 q=w/520.+vec2(t*.012,t*.006);float n=g3cn(q)*.6+g3cn(q*2.3+7.)*.3+g3cn(q*5.1)*.1;return 1.-.26*smoothstep(.52,.78,n);}`;
// sky dome: horizon haze -> deeper blue overhead, warm glow around the sun; follows the camera
function g3Sky(sc){const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false,
  vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.99999;}',
  fragmentShader:`varying vec3 vD;void main(){vec3 d=normalize(vD);float h=clamp(d.y,0.,1.);vec3 hz=vec3(.616,.722,.788),top=vec3(.20,.40,.68);vec3 c=mix(hz,top,pow(h,.55));
    vec3 L=normalize(vec3(-1.,.75,-.45));float sd=max(dot(d,L),0.);c+=vec3(1.,.82,.55)*(pow(sd,6.)*.22+pow(sd,90.)*.8);gl_FragColor=vec4(c,1.);}`});
  const sk=new THREE.Mesh(new THREE.SphereGeometry(8000,24,12),m);sk.frustumCulled=false;sk.renderOrder=-10;sc.add(sk);G3.sky=sk;}

// ---- grandlook (armies): each army = ONE detailed miniature general baked from the rigged battle soldier model (sol_*), in the nation's kit
// and an idle pose, on a small stone plinth with a nation-colour ring and a small cloth banner (wave shader). Static merged geometry:
// the whole figure is ONE draw call + the banner, so 200+ armies stay cheap. Navies bake a real ship model (m_frg/ship) with a wake.
function g3TexPix(map){if(!map||!map.image)return null;try{const im=map.image,w=Math.min(128,im.width||im.videoWidth||0),h=Math.min(128,im.height||im.videoHeight||0);if(!w||!h)return null;
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0,w,h);return {d:x.getImageData(0,0,w,h).data,w,h};}catch(e){return null;}}
// bake a model (any prototype in MODELS.proto) to vertex-coloured geometry: height = target height, centred on x/z, feet at y=0, facing +x like the old figures
function g3BakeModel(key,team,height,pose){if(!(typeof MODELS!=='undefined'&&MODELS.ready&&MODELS.proto[key]&&typeof instModel==='function'))return null;
  try{const w=instModel(key,team,'tall',height,1);if(!w)return null;const inner=w.userData.inner||w;
    if(pose&&typeof solArm==='function'){w.updateMatrixWorld(true);const B={};inner.traverse(o=>{if(o.isBone)B[o.name]=o;});   // arms down at the sides, officer stance (the rig's bind pose is a T)
      for(const sd of ['L','R']){const sh=B['arm'+sd],fo=B['forearm'+sd],ha=B['hand'+sd];if(!sh||!fo||!ha)continue;const S=new THREE.Vector3().setFromMatrixPosition(sh.matrixWorld),E0=new THREE.Vector3().setFromMatrixPosition(fo.matrixWorld),H0=new THREE.Vector3().setFromMatrixPosition(ha.matrixWorld),ln=S.distanceTo(E0)+E0.distanceTo(H0);
        const ix=sd==='L'?1:-1;solArm(B,sd,S.clone().add(new THREE.Vector3(0,-ln*.9,ln*.2)),new THREE.Vector3(0,0,-1));void ix;}}
    w.updateMatrixWorld(true);const P=[],C=[],I=[];let vo=0;const v=new THREE.Vector3(),M=new THREE.Matrix4();
    w.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position||o.visible===false)return;if(o.skeleton)o.skeleton.update();const g=o.geometry,pa=g.attributes.position,uv=g.attributes.uv,mat=Array.isArray(o.material)?o.material[0]:o.material,tp=mat&&mat.map?g3TexPix(mat.map):null,bc=mat&&mat.color?mat.color:{r:.6,g:.6,b:.6};
      M.copy(o.matrixWorld);for(let i=0;i<pa.count;i++){if(o.isSkinnedMesh){v.fromBufferAttribute(pa,i);o.applyBoneTransform(i,v);}else v.fromBufferAttribute(pa,i);v.applyMatrix4(M);P.push(v.x,v.y,v.z);
        let r=bc.r,gg=bc.g,b=bc.b;if(tp&&uv){const u=uv.getX(i)-Math.floor(uv.getX(i)),t=1-(uv.getY(i)-Math.floor(uv.getY(i))),px=(Math.min(tp.h-1,Math.floor(t*tp.h))*tp.w+Math.min(tp.w-1,Math.floor(u*tp.w)))*4;r*=tp.d[px]/255;gg*=tp.d[px+1]/255;b*=tp.d[px+2]/255;}C.push(r,gg,b);}
      if(g.index)for(let i=0;i<g.index.count;i++)I.push(g.index.getX(i)+vo);else for(let i=0;i<pa.count;i++)I.push(i+vo);vo+=pa.count;});
    if(!vo)return null;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(C,3));geo.setIndex(I);geo.computeBoundingBox();
    const bb=geo.boundingBox,hh=bb.max.y-bb.min.y||1,s=height/hh;geo.translate(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);geo.scale(s,s,s);geo.computeVertexNormals();return geo;}catch(e){console.warn('g3BakeModel',key,e);return null;}}
// vertex-clustering decimation (the soldier rig is ~3k verts; 200+ armies would be ~1M triangles): average every grid cell of size `cs` into one vertex
function g3Decimate(g,cs){const p=g.attributes.position,c=g.attributes.color,ix=g.index,map=new Map(),rem=new Int32Array(p.count),P=[],C=[],cnt=[];
  for(let i=0;i<p.count;i++){const k=Math.round(p.getX(i)/cs)+','+Math.round(p.getY(i)/cs)+','+Math.round(p.getZ(i)/cs);let j=map.get(k);if(j===undefined){j=cnt.length;map.set(k,j);cnt.push(0);P.push(0,0,0);C.push(0,0,0);}rem[i]=j;cnt[j]++;
    P[j*3]+=p.getX(i);P[j*3+1]+=p.getY(i);P[j*3+2]+=p.getZ(i);C[j*3]+=c.getX(i);C[j*3+1]+=c.getY(i);C[j*3+2]+=c.getZ(i);}
  for(let j=0;j<cnt.length;j++)for(let t=0;t<3;t++){P[j*3+t]/=cnt[j];C[j*3+t]/=cnt[j];}
  const I=[];for(let i=0;i<ix.count;i+=3){const a=rem[ix.getX(i)],b=rem[ix.getX(i+1)],d=rem[ix.getX(i+2)];if(a!==b&&b!==d&&a!==d)I.push(a,b,d);}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));o.setAttribute('color',new THREE.Float32BufferAttribute(C,3));o.setIndex(I);o.computeVertexNormals();return o;}
function g3ColGeo(g,col,m){const x=g.clone();if(m)x.applyMatrix4(m);const n=x.attributes.position.count,c=new Float32Array(n*3);for(let i=0;i<n;i++){c[i*3]=col[0];c[i*3+1]=col[1];c[i*3+2]=col[2];}x.setAttribute('color',new THREE.BufferAttribute(c,3));if(!x.attributes.normal)x.computeVertexNormals();return x;}
function g3MergeCol(list){const P=[],N=[],C=[],I=[];let vo=0;for(const g of list){const p=g.attributes.position,n=g.attributes.normal,c=g.attributes.color;for(let i=0;i<p.count;i++){P.push(p.getX(i),p.getY(i),p.getZ(i));N.push(n.getX(i),n.getY(i),n.getZ(i));C.push(c.getX(i),c.getY(i),c.getZ(i));}
  if(g.index)for(let i=0;i<g.index.count;i++)I.push(g.index.getX(i)+vo);else for(let i=0;i<p.count;i++)I.push(i+vo);vo+=p.count;}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));o.setAttribute('color',new THREE.Float32BufferAttribute(C,3));o.setIndex(I);return o;}
// plinth + nation ring + banner pole (no cloth: the cloth is a separate wave-shader mesh)
function g3Plinth(o,r,withPole){const cy=(a,b,h,s)=>new THREE.CylinderGeometry(a,b,h,s),L=[];   /* armies3: no slab - the hero stands on the ground (soft shadow disc is a separate pooled mesh); tall pole for the big cloth flag */
  if(withPole){L.push(g3ColGeo(cy(.16,.2,22,6),[.55,.5,.4],g3M(r*.62,11.1,-r*.42)),g3ColGeo(new THREE.SphereGeometry(.4,8,6),[.92,.78,.25],g3M(r*.62,22.3,-r*.42)));}return L;}
function g3MiniGeo(o,tier){G3.mini=G3.mini||{};const key=o+'_'+tier;if(G3.mini[key]!==undefined)return G3.mini[key];if(!(typeof MODELS!=='undefined'&&MODELS.ready))return null;   // not cached while models load -> old figure, retried next sync
  const fac=(typeof grNat==='function'&&grNat(o)||{}).fac||o,sk=typeof solKey==='function'?solKey(fac):'sol_w',col=(typeof grNatRgb==='function'?grNatRgb(o):[90,100,60]),team={fac,color:'#'+col.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')};
  const H=7.2,gen=g3BakeModel(sk,team,H,true);if(!gen)return G3.mini[key]=null;
  {const cA=gen.attributes.color,pA=gen.attributes.position,un0=g3Uniform(o),hh=[...o].reduce((q,ch)=>q*31+ch.charCodeAt(0)>>>0,7),tv=[.94+(hh%13)/100,.96+((hh>>4)%9)/100,.95+((hh>>8)%11)/100],un=[Math.min(1,un0[0]*tv[0]),Math.min(1,un0[1]*tv[1]),Math.min(1,un0[2]*tv[2])],sk2=[.8,.6,.47];for(let i=0;i<cA.count;i++){const r=cA.getX(i),g=cA.getY(i),b=cA.getZ(i),ny=pA.getY(i)/H,lum=(r+g+b)/3,sat=Math.max(r,g,b)-Math.min(r,g,b);let c=null;
    if(ny>.935)c=[un[0]*.62,un[1]*.62,un[2]*.6];else if(ny>.84)c=sk2;else if(ny<.07)c=[.14,.11,.09];else{const k=(.55+.7*Math.min(1,lum))*(ny<.5?.78:1);void sat;c=[un[0]*k,un[1]*k,un[2]*k];}   // the rig's cloth is plain white: dress it in the nation's uniform
    if(c)cA.setXYZ(i,c[0],c[1],c[2]);}}
  const sc=g3M,put=(g,x,z,s,ry)=>{const q=g.clone();q.applyMatrix4(sc(x,.1,z,s,s,s,ry));return q;};
  const R=tier>=2?5.2:tier>=1?4.4:3.2,n=tier>=2?3:tier>=1?2:0,pos=[[-2.6,-1.6],[2.4,-1.8],[-4,.6],[4,.2],[0,-3.6]];
  const mk=(hc,ec)=>{const genLo=g3Decimate(gen,ec),L=g3Plinth(o,R,true);L.push(put(g3Decimate(gen,hc),0,0,1,0));for(let i=0;i<n;i++)L.push(put(genLo,pos[i][0],pos[i][1],.74,(i-1)*.3));return g3MergeCol(L);};   // base colour already baked into vertex colours
  const hi=mk(.16,.45);hi.userData.lo=mk(.5,1);   // hi (~3k tris hero, close zoom) + lo (region/world zoom): one shared pair per nation+tier
  return G3.mini[key]=hi;}
function g3NavyGeo(o){G3.mini=G3.mini||{};const key='navy_'+o;if(G3.mini[key]!==undefined)return G3.mini[key];if(!(typeof MODELS!=='undefined'&&MODELS.ready))return null;
  const fac=(typeof grNat==='function'&&grNat(o)||{}).fac||o,k=['m_frg','m_fre','m_frw','ship'].find(x=>MODELS.proto[x]);if(!k)return G3.mini[key]=null;
  const g=g3BakeModel(k,{fac,color:'#8a9096'},4.4,null);if(!g)return G3.mini[key]=null;g.computeBoundingBox();const bb=g.boundingBox,len=Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z);
  if(bb.max.z-bb.min.z>bb.max.x-bb.min.x)g.rotateY(Math.PI/2);g.computeBoundingBox();const L2=g.boundingBox.max.x-g.boundingBox.min.x,s=13/L2;g.scale(s,s,s);g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y+.15,0);void len;
  /* hull: dark boot-topping under the waterline stripe, haze-grey topsides, lighter deck; per-vertex shade keeps the superstructure readable */
  {const cA=g.attributes.color,pA=g.attributes.position,H=g.boundingBox.max.y||1;for(let i=0;i<cA.count;i++){const ny=pA.getY(i)/H,lum=Math.min(1,(cA.getX(i)+cA.getY(i)+cA.getZ(i))/3*1.15+.18);let c;if(ny<.2)c=[.34,.12,.1];else c=[.5*lum+.2,.54*lum+.21,.58*lum+.22];cA.setXYZ(i,c[0],c[1],c[2]);}}
  const bb2=g.boundingBox,HL=bb2.max.x-bb2.min.x,WD=bb2.max.z-bb2.min.z,cx=(bb2.max.x+bb2.min.x)/2,top=bb2.max.y;
  const pole=g3ColGeo(new THREE.CylinderGeometry(.06,.06,5,6),[.62,.58,.5],g3M(-3.4,2.6+top*.4,0));
  /* waterline foam collar + bow wave (white), so the hull sits in the sea instead of on it */
  const foam=g3ColGeo(new THREE.RingGeometry(.8,1,40).rotateX(-Math.PI/2).scale(HL*.56,1,WD*.78),[.95,.97,1],g3M(cx,.28,0));
  const bow=g3ColGeo(new THREE.ConeGeometry(WD*.42,HL*.2,3).rotateZ(-Math.PI/2).rotateX(Math.PI/2).scale(1,.12,1),[.97,.98,1],g3M(cx+HL*.52,.3,0));
  /* deck detail: two turrets with barrels fore and aft, a mast with a radar bar */
  const dk=[.4,.43,.46],tw=[];for(const [tx,sg] of [[.3,1],[-.3,1]]){const x=cx+HL*tx;tw.push(g3ColGeo(new THREE.CylinderGeometry(.34,.4,.26,10),dk,g3M(x,top*.46+.15,0)),g3ColGeo(new THREE.BoxGeometry(1,.09,.09),[.22,.24,.26],g3M(x+.55*sg,top*.46+.27,0)));}
  tw.push(g3ColGeo(new THREE.CylinderGeometry(.05,.07,2.2,6),[.3,.32,.35],g3M(cx-HL*.04,top*.5+1.1,0)),g3ColGeo(new THREE.BoxGeometry(.12,.06,1.2),[.25,.27,.3],g3M(cx-HL*.04,top*.5+2.1,0)));
  const hi=g3MergeCol([g3Decimate(g,.1),pole,foam,bow,...tw]);hi.userData.lo=g3MergeCol([g3Decimate(g,.4),pole,foam,bow]);return G3.mini[key]=hi;}
// wake: white V trail behind a ship (child of the army group, local -x = astern)
function g3WakeMesh(){if(G3.wakeM)return G3.wakeM.clone();const sh=new THREE.Shape();sh.moveTo(5,0);sh.lineTo(-10,3.2);sh.lineTo(-7,0);sh.lineTo(-10,-3.2);sh.closePath();const g=new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2);
  const cl=new Uint8Array(16*64*4);const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const gr=x.createRadialGradient(40,32,2,26,32,34);gr.addColorStop(0,'rgba(255,255,255,.75)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);void cl;
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,opacity:.8}));m.position.y=.25;const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+10)/15,(p.getZ(i)+3.2)/6.4);G3.wakeM=m;return m.clone();}

// the grand map only needs the three soldier rigs + one warship (not the 80 battle models): load just those, then rebuild the army figures once
function g3LoadArmyModels(){if(G3.miniLoad||typeof parseModel!=='function'||typeof MODEL_FILES==='undefined')return;G3.miniLoad=1;
  Promise.all(['sol_w','sol_e','sol_m','m_frg'].filter(k=>MODEL_FILES[k]).map(k=>parseModel(k).catch(()=>false))).then(()=>{G3.mini={};G3.miniReady=1;G3.miniSync=0;}).catch(()=>{});}
