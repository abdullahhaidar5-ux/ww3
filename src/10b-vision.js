/* ================= NIGHT VISION & THERMAL (purely visual: same units seen, same fog of war) =================
   N (or the NV button) cycles: normal -> green night vision -> white-hot thermal. Only offered when it is dark.
   NV: the lit picture is brightened, tinted green, grainy, lights bloom. Thermal: ground is cool grey; units, engines,
   aircraft and fires glow white-hot. Heat glows are soft points drawn only for units the player can already see. */
const VISN={mode:0,pts:null,n:0,btn:null,t:0,cap:1600};
function visionDark(){try{return G&&G.todM?todDark():0;}catch(e){return 0;}}
function visionSet(m){VISN.mode=m;if(VISN.btn){VISN.btn.textContent=m===1?'NIGHT VISION':m===2?'THERMAL':'NORMAL VIEW';VISN.btn.dataset.m=m;}if(VISN.pts)VISN.pts.visible=m===2;}
function visionCycle(){if(!G)return;if(visionDark()<.3&&VISN.mode===0)return;visionSet((VISN.mode+1)%3);}
function visionBtn(){if(VISN.btn||typeof document==='undefined')return;const b=document.createElement('button');b.id='visbtn';b.type='button';b.hidden=true;b.title='Night vision / thermal (N)';
  b.style.cssText='position:fixed;top:34px;right:6px;z-index:30;font:700 12px IBM Plex Mono,monospace;letter-spacing:.06em;padding:5px 10px;border:1px solid #6fd68a;border-radius:3px;background:rgba(5,12,8,.78);color:#8ff0a8;cursor:pointer';
  b.onclick=()=>visionCycle();b.onmousedown=e=>e.stopPropagation();b.textContent='NORMAL VIEW';document.body.appendChild(b);VISN.btn=b;}
if(typeof addEventListener!=='undefined')addEventListener('keydown',e=>{if(e.key!=='n'&&e.key!=='N')return;if(e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='SELECT'||t==='TEXTAREA')return;visionCycle();});
function visionPts(){if(VISN.pts)return VISN.pts;const N=VISN.cap,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('size',new THREE.BufferAttribute(new Float32Array(N),1).setUsage(THREE.DynamicDrawUsage));g.setAttribute('heat',new THREE.BufferAttribute(new Float32Array(N),1).setUsage(THREE.DynamicDrawUsage));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{sc:{value:600}},
    vertexShader:'attribute float size;attribute float heat;varying float vH;uniform float sc;void main(){vH=heat;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*sc/-mv.z,2.,90.);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying float vH;void main(){vec2 q=gl_PointCoord-.5;float d=length(q)*2.;float a=smoothstep(1.,.15,d);gl_FragColor=vec4(vec3(1.)*vH*a,a);}'});
  const p=new THREE.Points(g,m);p.frustumCulled=false;p.visible=false;p.renderOrder=40;p.userData.noDepth=true;SCN.add(p);VISN.pts=p;return p;}
// heat of a unit: engines and aircraft glow most, riflemen a little, parked buildings only when they produce (factories)
function heatOf(e){if(e.isB)return e.built>=1&&(e.kind==='power'||e.kind==='factory'||e.kind==='airfield')?[1.3,26]:null;const c=e.s&&e.s.cls;if(c==='jet'||c==='heli')return[4.5,48];if(c==='tank'||c==='veh'||c==='art'||c==='apc'||c==='truck'||c==='naval'||e.s.dom==='naval')return[3.8,42];if(c==='drone')return[3,20];return[3.4,15];}
function visionTick(dt){visionBtn();const dk=visionDark();if(VISN.btn){const show=dk>=.3||VISN.mode>0;VISN.btn.hidden=!(G&&show&&$('menu')&&$('menu').hidden);}
  if(VISN.mode&&dk<.3){visionSet(0);}
  const F=POST.mFinal&&POST.mFinal.uniforms;if(F&&F.vm)F.vm.value=G?VISN.mode:0;if(VISN.pts)VISN.pts.visible=!!G&&VISN.mode===2;if(!G||VISN.mode!==2){return;}
  const P=visionPts();P.visible=true;const pos=P.geometry.attributes.position,sz=P.geometry.attributes.size,ht=P.geometry.attributes.heat;let n=0;
  for(const e of G.ents){if(e.dead||!vis(e))continue;const h=heatOf(e);if(!h)continue;if(n>=VISN.cap)break;const o=typeof OBJ!=='undefined'&&OBJ.get(e.id);
    const x=o?o.position.x:e.x,y=o?o.position.y:groundH(e.x,e.y),z=o?o.position.z:e.y;if(!isFinite(x+y+z))continue;
    const mv=e.mv!=null&&G.t-e.mv<1.5,fire=e.lastFire>0&&G.t-e.lastFire<2;const k=(mv||fire?1:.62)*(e.hp<e.max*.35?1.25:1);
    pos.setXYZ(n,x,y+(e.isB?10:h[1]*.4),z);sz.setX(n,h[1]);ht.setX(n,h[0]*k);n++;}
  pos.needsUpdate=sz.needsUpdate=ht.needsUpdate=true;P.geometry.setDrawRange(0,n);VISN.n=n;
  const ty=Math.tan(CAM.fov*Math.PI/360);P.material.uniforms.sc.value=(typeof VH!=='undefined'?VH:800)*(typeof dpr!=='undefined'?dpr:1)/(2*ty);}
