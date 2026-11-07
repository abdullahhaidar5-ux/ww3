// look1 — real geography + light for the 3D grand map (Abdullah 2026-11-06 "make it look like a $60 studio game").
// Real elevation/bathymetry (Terrarium tiles: ETOPO1/GEBCO/SRTM) and a satellite-like colour base (Natural Earth I) are baked by
// orch/look1-bake.py into grand/elev.png + grand/color.jpg, warped to the grand-map projection. g3Fields() (13e) calls g3RealFields()
// when they have loaded; otherwise the old procedural look is used. Rendering only - no rules.
const G3L={sun:[-1.0,.75,-.45]};   // direction TOWARDS the sun (x east, y up, z south); terrain shadows are baked against it
function g3LoadReal(){if(G3.real||G3.realTry)return;G3.realTry=1;
  const ld=u=>fetch(u).then(r=>{if(!r.ok)throw new Error(u);return r.blob();}).then(b=>createImageBitmap(b,{colorSpaceConversion:'none',premultiplyAlpha:'none'}));
  const px=(bm)=>{const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(bm,0,0);return x.getImageData(0,0,c.width,c.height);};
  Promise.all([ld('grand/elev.png?v=1'),ld('grand/color.jpg?v=1')]).then(([eb,cb])=>{
    const e=px(eb),c=px(cb),E=new Float32Array(e.width*e.height);for(let k=0;k<E.length;k++)E[k]=e.data[k*4]*256+e.data[k*4+1]-11000;
    G3.real={E,EW:e.width,EH:e.height,col:c.data,CW:c.width,CH:c.height};}).catch(()=>{G3.realFail=1;});}
// ground colour grade (satellite -> rich, slightly warm, a little darker than the washed-out raster)
function g3GradeColor(col,n){const o=new Uint8ClampedArray(n*4);
  for(let k=0;k<n;k++){let r=col[k*4]/255,g=col[k*4+1]/255,b=col[k*4+2]/255;const l=.3*r+.59*g+.11*b,sat=1.85;r=l+(r-l)*sat;g=l+(g-l)*sat;b=l+(b-l)*sat;
    r=Math.pow(Math.max(0,r),1.3)*.96;g=Math.pow(Math.max(0,g),1.24)*.95;b=Math.pow(Math.max(0,b),1.34)*.93;
    const o4=k*4;o[o4]=r*255;o[o4+1]=g*255;o[o4+2]=b*255;o[o4+3]=255;}
  return o;}
// Called at the end of g3Fields(): swaps the hand-shaped relief/colour for the real data and bakes sun shadows + valley AO + relief normals.
function g3RealFields(F){const R=G3.real,W=F.W,H=F.H,E=R.E,EW=R.EW,Hh=F.Hh,Ls=F.Ls,Lw=F.Lw,N=W*H;
  const hm=new Float32Array(N);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=2*y*EW+2*x;hm[y*W+x]=(E[o]+E[o+1]+E[o+EW]+E[o+EW+1])/4;}
  const SC=.0078;F.hm=hm;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,ls=Ls[k],m=hm[k],coast=g3Smooth(.4,.8,ls),n=g3Fbm(x*.02,y*.02,4);
    const landH=coast*(1+n*1.3)+Math.max(0,m)*SC;
    const sea=Math.min(-.8+Math.min(0,Math.max(m,-4500))/500,-.8-4*Math.pow(1-Lw[k],2));Hh[k]=sea+(landH-sea)*g3Smooth(.42,.6,ls);}
  // flatten the ground around every land province's towns so cities stay readable even in real mountains (Tehran sits against the Alborz)
  {const fl=new Float32Array(N);for(const q of GCM.P){if(!q.land)continue;const cx=Math.round(q.x/2),cy=Math.round(q.y/2);
    for(let dy=-40;dy<=40;dy++){const y=cy+dy;if(y<0||y>=H)continue;for(let dx=-40;dx<=40;dx++){const x=cx+dx;if(x<0||x>=W)continue;const w=1-g3Smooth(12,38,Math.hypot(dx,dy));if(w>fl[y*W+x])fl[y*W+x]=w;}}}
    const b2=g3Blur(Hh,W,H,10,2);for(let k=0;k<N;k++)if(Ls[k]>.5&&fl[k]>0)Hh[k]+=(b2[k]-Hh[k])*fl[k]*.92;F.fl=fl;}
  // colour: graded satellite base at its own resolution
  const CW=R.CW,CH=R.CH;F.PW=CW;F.PH=CH;F.px=g3GradeColor(R.col,CW*CH);
  // biome weights for the detail shader from real data: rock (steep/high), snow (high/polar), sand (desert colour), vegetation (green)
  const bw=new Uint8Array(N*4),sx=CW/W,sy=CH/H,col=R.col;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,ci=(Math.min(CH-1,Math.floor((y+.5)*sy))*CW+Math.min(CW-1,Math.floor((x+.5)*sx)))*4,r=col[ci]/255,g=col[ci+1]/255,b=col[ci+2]/255;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),lum=.3*r+.59*g+.11*b,sat=mx>0?(mx-mn)/mx:0,coast=g3Smooth(.4,.8,Ls[k]),m=hm[k];
    const hl=Hh[y*W+Math.max(0,x-1)],hr=Hh[y*W+Math.min(W-1,x+1)],hu=Hh[Math.max(0,y-1)*W+x],hd=Hh[Math.min(H-1,y+1)*W+x],sl=Math.hypot(hr-hl,hd-hu)/4;
    const rock=Math.max(g3Smooth(.35,1.3,sl)*coast,g3Smooth(2600,4300,m)*.9),snow=Math.max(g3Smooth(3900,5200,m),g3Smooth(.82,.93,lum)*(1-g3Smooth(.07,.15,sat))*coast);
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
    lit[o]=Math.max(0,Math.min(255,(nx*.7*.25+.5)*255));lit[o+1]=Math.max(0,Math.min(255,(nz*.7*.25+.5)*255));lit[o+2]=Math.min(255,sh[q]*255);lit[o+3]=Math.min(255,ao[q]*235);}
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
