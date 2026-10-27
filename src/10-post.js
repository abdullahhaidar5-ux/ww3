/* ================= CINEMATIC POST-PROCESSING: HDR, bloom, grading, vignette ================= */
const POST={on:true,rt:null,bA:null,bB:null,bC:null,bD:null,quad:null,scn:null,cam:null,mBright:null,mBlur:null,mFinal:null,w:0,h:0};
const FSV=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
function initPost(){try{
  POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);POST.scn=new THREE.Scene();POST.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null);POST.quad.frustumCulled=false;POST.scn.add(POST.quad);
  POST.mBright=new THREE.ShaderMaterial({uniforms:{tex:{value:null}},vertexShader:FSV,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tex;varying vec2 vUv;void main(){vec3 c=texture2D(tex,vUv).rgb;if(!(c.r==c.r&&c.g==c.g&&c.b==c.b)||max(c.r,max(c.g,c.b))>1e4)c=vec3(0.);c=min(c,vec3(60.));float l=dot(c,vec3(.2126,.7152,.0722));gl_FragColor=vec4(c*smoothstep(.95,2.6,l),1.);}`});
  POST.mBlur=new THREE.ShaderMaterial({uniforms:{tex:{value:null},dir:{value:new THREE.Vector2()}},vertexShader:FSV,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tex;uniform vec2 dir;varying vec2 vUv;void main(){vec4 c=texture2D(tex,vUv)*.227;c+=texture2D(tex,vUv+dir*1.385)*.316;c+=texture2D(tex,vUv-dir*1.385)*.316;c+=texture2D(tex,vUv+dir*3.231)*.07;c+=texture2D(tex,vUv-dir*3.231)*.07;gl_FragColor=c;}`});
  POST.mFinal=new THREE.ShaderMaterial({uniforms:{tex:{value:null},b1:{value:null},b2:{value:null},t:{value:0},flash:{value:0},res:{value:new THREE.Vector2(1,1)},expo:{value:.92}},vertexShader:FSV,depthTest:false,depthWrite:false,
    fragmentShader:`uniform sampler2D tex,b1,b2,ao;uniform float t,flash,expo,aoK,fogK;uniform vec2 res;varying vec2 vUv;
      vec3 aces(vec3 x){x*=.6;return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      vec3 okc(vec3 c){return (c.r==c.r&&c.g==c.g&&c.b==c.b&&max(c.r,max(c.g,c.b))<1e4)?c:vec3(.5);}
      void main(){vec2 px=1./res;vec3 c=okc(texture2D(tex,vUv).rgb);
        vec3 n=texture2D(tex,vUv+vec2(px.x,0.)).rgb+texture2D(tex,vUv-vec2(px.x,0.)).rgb+texture2D(tex,vUv+vec2(0.,px.y)).rgb+texture2D(tex,vUv-vec2(0.,px.y)).rgb;
        c=c+(c-n*.25)*.35;vec4 oc4=texture2D(ao,vUv);vec3 oc=oc4.rgb;c*=mix(1.,oc.r,aoK)*mix(1.,oc.g,step(.01,aoK));float fgv=smoothstep(.05,.8,oc.b)*fogK;float lf=dot(c,vec3(.2126,.7152,.0722));c=mix(c,mix(vec3(lf),c,.55)*vec3(.58,.57,.58),fgv*.9);c=mix(c,vec3(.62,.5,.36)*(.8+.4*lf),smoothstep(.32,.95,oc4.a)*.42*step(.01,aoK));
        vec3 bl=okc(texture2D(b1,vUv).rgb)*.75+okc(texture2D(b2,vUv).rgb)*.9;bl=min(bl,vec3(8.));c+=bl*.5;
        c*=expo*(1.+flash*1.5);c=aces(c);
        float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,.78);c=mix(c*vec3(.95,.98,1.04),c,smoothstep(.05,.45,l));c=mix(c,c*vec3(1.02,1.,.95),.6);
        c=pow(c,vec3(1./2.2));
        c=(c-.5)*1.1+.5;c+=vec3(.012,.004,-.012)*(1.-l)+vec3(.03,.012,-.02)*l;
        vec2 q=vUv-.5;c*=1.-dot(q,q)*.75;
        c+=(h(vUv*res+t*61.)-.5)*.022;
        gl_FragColor=vec4(clamp(c,0.,1.),1.);}`});
  POST.mAO=new THREE.ShaderMaterial({uniforms:{dep:{value:null},near:{value:10},far:{value:9000},tanF:{value:new THREE.Vector2(1,1)},res:{value:new THREE.Vector2(1,1)},rad:{value:22},pm:{value:1},cw:{value:new THREE.Matrix4()},tt:{value:0},fogT:{value:null},mapS:{value:new THREE.Vector2(1,1)},cloudK:{value:1}},vertexShader:FSV,depthTest:false,depthWrite:false,extensions:{derivatives:true},
    fragmentShader:`uniform sampler2D dep;uniform float near,far,rad,pm,tt,cloudK;uniform mat4 cw;uniform vec2 tanF,res,mapS;uniform sampler2D fogT;varying vec2 vUv;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
      float vz(vec2 uv){float d=texture2D(dep,uv).x;return (near*far)/((far-near)*d-far);}
      vec3 vp(vec2 uv){float z=vz(uv);return vec3((uv*2.-1.)*tanF*(-z),z);}
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){float d0=texture2D(dep,vUv).x;if(d0>=.99999){gl_FragColor=vec4(1.,1.,1.,1.);return;}
        vec3 P=vp(vUv);vec3 N=normalize(cross(dFdx(P),dFdy(P)));
        float rpx=rad*pm/(-P.z);float a0=h(vUv*res)*6.2832;float ao=0.;
        for(int i=0;i<14;i++){float fi=float(i);float ang=a0+fi*2.39996;float r=sqrt((fi+.5)/14.)*rpx;vec2 uv=vUv+vec2(cos(ang),sin(ang))*r/res;
          vec3 v=vp(uv)-P;float dd=dot(v,v);ao+=max(0.,dot(N,v)-.04*(-P.z)*.02)/(dd+rad*rad*.08)*smoothstep(rad*rad*4.,0.,dd);}
        ao=pow(clamp(1.-ao*rad*.32/14.*6.,0.,1.),1.4);
        vec3 W3=(cw*vec4(P,1.)).xyz;vec2 fu=vec2(W3.x/mapS.x,1.-W3.z/mapS.y);float fg=(fu.x<0.||fu.x>1.||fu.y<0.||fu.y>1.)?1.:texture2D(fogT,fu).r;vec2 w=W3.xz*.00032+vec2(tt*.004,tt*.0016);float n=vn(w)*.75+vn(w*2.1+3.1)*.25;float cl=1.-.15*cloudK*smoothstep(.3,.95,n);
        gl_FragColor=vec4(ao,cl,fg,clamp(-P.z/2600.,0.,1.));}`});
  POST.ovr=new THREE.MeshBasicMaterial({colorWrite:false});
  POST.mFinal.uniforms.ao={value:null};POST.mFinal.uniforms.aoK={value:.85};POST.mFinal.uniforms.fogK={value:0};
  return true;}catch(e){POST.on=false;return false;}}
function sizePost(){const w=Math.max(2,Math.round(VW*dpr)),h=Math.max(2,Math.round(VH*dpr));if(w===POST.w&&h===POST.h&&POST.rt)return;POST.w=w;POST.h=h;
  for(const k of ['rt','bA','bB','bC','bD','dRT','aA','aB'])if(POST[k])POST[k].dispose();
  const opt={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true};
  // edge smoothing: 4 samples; phones on Auto/Medium/Low use 2 below the top detail level and none from level 3 down
  const wgl2=R3.capabilities.isWebGL2,ms=POST.phone?(QUAL.lv<1?4:QUAL.lv<3?2:0):4;POST.rt=wgl2&&ms&&THREE.WebGLMultisampleRenderTarget?new THREE.WebGLMultisampleRenderTarget(w,h,Object.assign({samples:ms},opt)):new THREE.WebGLRenderTarget(w,h,opt);
  const s={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};
  POST.dRT=new THREE.WebGLRenderTarget(w>>1,h>>1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});POST.dRT.depthTexture=new THREE.DepthTexture(w>>1,h>>1);POST.dRT.depthTexture.type=THREE.UnsignedIntType;
  const s2={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};POST.aA=new THREE.WebGLRenderTarget(w>>1,h>>1,s2);POST.aB=new THREE.WebGLRenderTarget(w>>1,h>>1,s2);
  POST.bA=new THREE.WebGLRenderTarget(w>>2,h>>2,s);POST.bB=new THREE.WebGLRenderTarget(w>>2,h>>2,s);POST.bC=new THREE.WebGLRenderTarget(w>>3,h>>3,s);POST.bD=new THREE.WebGLRenderTarget(w>>3,h>>3,s);}
function softP(on){for(const P of [PN_,PA_]){if(!P)continue;const u=P.m.uniforms;u.soft.value=on?1:0;P.m.depthTest=!on;if(on){u.dep.value=POST.dRT.depthTexture;u.sres.value.set(POST.w,POST.h);u.nf.value.set(CAM.near,CAM.far);}}}
function pass(mat,target){POST.quad.material=mat;R3.setRenderTarget(target);R3.render(POST.scn,POST.cam);}
function renderPost(){if(!POST.on||!POST.mFinal){softP(false);R3.setRenderTarget(null);R3.shadowMap.needsUpdate=true;R3.render(SCN,CAM);return;}
  sizePost();
  const fogWas=FOGM?FOGM.visible:false;let postFog=false;
  if(POST.mAO&&POST.aoOn!==false&&!(POST.aoLv!=null&&QUAL.lv>=POST.aoLv)){if(FOGM&&FOGT){postFog=fogWas;FOGM.visible=false;}const hid=[];SCN.traverse(o=>{if(!o.visible)return;const m=o.material;if(o.userData.noDepth||o.isPoints||o.isLine||o.isSprite||(m&&(Array.isArray(m)?m[0].transparent:m.transparent))){o.visible=false;hid.push(o);}});
    const bg=SCN.background;SCN.overrideMaterial=POST.ovr;R3.setRenderTarget(POST.dRT);R3.clear();R3.render(SCN,CAM);SCN.overrideMaterial=null;for(const o of hid)o.visible=true;
    const A=POST.mAO.uniforms;A.dep.value=POST.dRT.depthTexture;A.near.value=CAM.near;A.far.value=CAM.far;const ty=Math.tan(CAM.fov*Math.PI/360);A.tanF.value.set(ty*CAM.aspect,ty);A.res.value.set(POST.dRT.width,POST.dRT.height);A.pm.value=POST.dRT.height/(2*ty);A.cw.value.copy(CAM.matrixWorld);A.tt.value=performance.now()/1000;A.fogT.value=FOGT;A.cloudK.value=POST.cloud??1;A.mapS.value.set(MAPW,MAPH);POST.mFinal.uniforms.fogK.value=postFog?1:0;
    pass(POST.mAO,POST.aA);const ab=(src,dst,x,y)=>{POST.mBlur.uniforms.tex.value=src.texture;POST.mBlur.uniforms.dir.value.set(x/src.width,y/src.height);pass(POST.mBlur,dst);};ab(POST.aA,POST.aB,1,0);ab(POST.aB,POST.aA,0,1);
    POST.mFinal.uniforms.ao.value=POST.aA.texture;POST.mFinal.uniforms.aoK.value=.85;softP(true);}else if(POST.mFinal.uniforms.ao){softP(false);POST.mFinal.uniforms.aoK.value=0;POST.mFinal.uniforms.fogK.value=0;POST.mFinal.uniforms.ao.value=POST.bA.texture;}
  R3.setRenderTarget(POST.rt);R3.clear();R3.shadowMap.needsUpdate=true;R3.render(SCN,CAM);if(FOGM)FOGM.visible=fogWas;
  POST.mBright.uniforms.tex.value=POST.rt.texture;pass(POST.mBright,POST.bA);
  const bl=(src,dst,w,h,x,y)=>{POST.mBlur.uniforms.tex.value=src.texture;POST.mBlur.uniforms.dir.value.set(x/w,y/h);pass(POST.mBlur,dst);};
  bl(POST.bA,POST.bB,POST.bA.width,POST.bA.height,1,0);bl(POST.bB,POST.bA,POST.bA.width,POST.bA.height,0,1);
  POST.mBlur.uniforms.tex.value=POST.bA.texture;POST.mBlur.uniforms.dir.value.set(0,0);pass(POST.mBlur,POST.bC);
  bl(POST.bC,POST.bD,POST.bC.width,POST.bC.height,1.5,0);bl(POST.bD,POST.bC,POST.bC.width,POST.bC.height,0,1.5);
  const F=POST.mFinal.uniforms;F.tex.value=POST.rt.texture;F.b1.value=POST.bA.texture;F.b2.value=POST.bC.texture;F.t.value=performance.now()/1000%100;F.flash.value=flash;F.res.value.set(POST.w,POST.h);
  pass(POST.mFinal,null);}

