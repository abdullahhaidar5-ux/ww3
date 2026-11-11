// ARMY STANDARDS (armytokens, Abdullah 2026-11-10 19:17 "Go" to orch/concepts/army-standards.jpg; spec orch/concepts/ARMY-STANDARDS.md).
// CSS note: body gets the class 'tk' from the battle ticker (08-ui.js tkApply), so every rule here is scoped under #g3ui / #g3leg.
// The ONE way an army is drawn on the grand map: a round token read like a watch face. It replaced the figure blobs, shield badges and
// per-army waving flags. View only: nothing here writes campaign state. Zoom tier = the shared g3Zoom() value (G3.tier), never a second one.
//   far (0)   = one owner-colour dot per stack (ONE THREE.Points draw) + a number for yours / enemies / allies
//   middle (1)= the token: flag disc, green strength ring, gold supply ring, pin, number plate, general stars; rim = whose side
//   close (2) = token with make-up counts + the real army in miniature on the ground (pooled instanced models, dashed footprint)
// Shape = what it is doing: plain = holding, arrow nose + arrival = marching, gold corner brackets = dug in, dashed ring round the town =
// besieging, two tokens touching + lightning + tug bar = fighting. Several armies in one province = one stack with a count (hover/click fans out).
const GTK_RIM={me:'#f4f4ef',war:'#e5483b',ally:'#5aa0ee',oth:'#51705c'};
const GTK_ODDS=[1.25,.8];   // attacker/defender strength ratio: >= 1.25 Good odds, <= 0.8 Bad odds, between = Even fight
function gtkCss(){if(document.getElementById('gtkcss'))return;const s=document.createElement('style');s.id='gtkcss';
  const br="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M2 13V2H13M27 2H38V13M38 27V38H27M13 38H2V27' fill='none' stroke='%23e8b23a' stroke-width='4' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  s.textContent=`
:is(#g3ui,#g3leg) .tk{position:absolute;left:0;top:0;display:none;width:36px;height:36px;margin:-44px 0 0 -18px;border-radius:50%;--rim:#51705c;--st:100;--su:100;--sc:#5bd66a;--uc:#e8b23a;font-family:system-ui,sans-serif}
:is(#g3ui,#g3leg) .tk>i{position:absolute;display:block;border-radius:50%;font-style:normal}
:is(#g3ui,#g3leg) .tk .ou{inset:-2.5px;background:conic-gradient(var(--uc) calc(var(--su)*1%),#0d151c66 0)}
:is(#g3ui,#g3leg) .tk .in{inset:-.5px;border:1.5px solid #0d151c;background:conic-gradient(var(--sc) calc(var(--st)*1%),#26323a 0) padding-box}
:is(#g3ui,#g3leg) .tk .fl{inset:5px;background:#777 center/cover no-repeat;border:2.5px solid var(--rim);box-shadow:0 0 0 1px #0d151c}
:is(#g3ui,#g3leg) .tk .pn{left:50%;top:100%;width:0;height:0;margin:1px 0 0 -4px;border:4px solid transparent;border-top:7px solid var(--rim);border-radius:0;filter:drop-shadow(0 1px 1px #000a)}
:is(#g3ui,#g3leg) .tk .ct{right:-7px;top:-7px;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:#f4f4ef;color:#10161b;font:700 10px/15px system-ui,sans-serif;text-align:center;box-shadow:0 1px 2px #000a}
:is(#g3ui,#g3leg) .tk .pt{position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:7px;padding:1px 7px 1px 6px;border-radius:5px;background:#0d151ce8;border:1px solid var(--rim);color:#f2f0e8;white-space:nowrap;font:700 13px/17px system-ui,sans-serif;box-shadow:0 1px 3px #000a}
:is(#g3ui,#g3leg) .tk .pt em{font-style:normal;color:#e8b23a;font-size:9px;letter-spacing:1px;margin-left:5px;vertical-align:1px}
:is(#g3ui,#g3leg) .tk .pt small{display:block;font:600 10px/12px system-ui,sans-serif;color:#b9c2c6;margin-top:-1px;padding-bottom:1px}
:is(#g3ui,#g3leg) .tk.me{--rim:#f4f4ef}:is(#g3ui,#g3leg) .tk.war{--rim:#e5483b}:is(#g3ui,#g3leg) .tk.ally{--rim:#5aa0ee}
:is(#g3ui,#g3leg) .tk.me .pt{border-color:#56646e}
:is(#g3ui,#g3leg) .tk.oth{width:22px;height:22px;margin:-29px 0 0 -11px;opacity:.62}:is(#g3ui,#g3leg) .tk.oth .fl{inset:3.5px;border-width:1.5px}:is(#g3ui,#g3leg) .tk.oth .pt,:is(#g3ui,#g3leg) .tk.oth .ou{display:none}:is(#g3ui,#g3leg) .tk.oth.sel,:is(#g3ui,#g3leg) .tk.oth.hv{opacity:1}:is(#g3ui,#g3leg) .tk.oth.sel .pt,:is(#g3ui,#g3leg) .tk.oth.hv .pt{display:block}
:is(#g3ui,#g3leg) .tk.low{--sc:#ef5548}:is(#g3ui,#g3leg) .tk.dry{--uc:#ef5548}
:is(#g3ui,#g3leg) .tk.sel{z-index:2}:is(#g3ui,#g3leg) .tk.ho{z-index:3}
:is(#g3ui,#g3leg) .tk.sel::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:2px dotted #6fe07f}
:is(#g3ui,#g3leg) .tk.gmsel::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:2px dotted #f4f4ef}
:is(#g3ui,#g3leg) .tk .ar{inset:-10px;border-radius:0;transform:rotate(var(--dir,0deg))}:is(#g3ui,#g3leg) .tk .ar::before{content:'';position:absolute;left:50%;top:-7px;margin-left:-6px;border:6px solid transparent;border-bottom:10px solid #fff;filter:drop-shadow(0 0 1.5px #000)}
:is(#g3ui,#g3leg) .tk .br{inset:-7px;border-radius:0;background:${br} center/100% 100% no-repeat;transform:rotate(45deg) scale(.9)}
:is(#g3ui,#g3leg) .tk .zz{left:100%;top:50%;margin:-11px 0 0 -4px;z-index:3;border-radius:0;font:700 19px/22px system-ui,sans-serif;color:#ffd23a;text-shadow:0 0 2px #000,0 1px 2px #000}
:is(#g3ui,#g3leg) .tk .tg{left:0;top:100%;margin-top:11px;width:70px;height:6px;border-radius:3px;border:1px solid #0d151c;background:linear-gradient(90deg,#5bd66a calc(var(--tw,50)*1%),#ef5548 0)}
:is(#g3ui,#g3leg) .tk.fi .pt{display:none}:is(#g3ui,#g3leg) .tk.fi2 .pt{display:block;margin-left:19px}
:is(#g3ui,#g3leg) .tk .od{left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:7px;padding:0 8px;border-radius:9px;white-space:nowrap;font:700 11px/16px system-ui,sans-serif;color:#10161b;box-shadow:0 1px 3px #000a}
:is(#g3ui,#g3leg) .tk .od.g{background:#5bd66a}:is(#g3ui,#g3leg) .tk .od.e{background:#e8b23a}:is(#g3ui,#g3leg) .tk .od.b{background:#ef5548;color:#fff}
:is(#g3ui,#g3leg) .tk.far{width:0;height:0;margin:0;opacity:1}:is(#g3ui,#g3leg) .tk.far>i{display:none}:is(#g3ui,#g3leg) .tk.far>i.od{display:block;bottom:9px}:is(#g3ui,#g3leg) .tk.far .pt{display:block;margin-left:9px;padding:0;background:none;border:0;box-shadow:none;font:800 13px/14px system-ui,sans-serif;text-shadow:0 0 2px #000,0 0 2px #000,0 1px 2px #000,1px 0 2px #000}:is(#g3ui,#g3leg) .tk.far .pt em,:is(#g3ui,#g3leg) .tk.far .pt small{display:none}:is(#g3ui,#g3leg) .tk.far.sel::after{inset:-11px}
#g3ui .eta{position:absolute;left:0;top:0;display:none;white-space:nowrap;margin:-30px 0 0 -6px;padding-left:15px;font:700 12px/16px system-ui,sans-serif;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000,0 1px 2px #000}
#g3ui .eta::before{content:'';position:absolute;left:0;top:3px;width:7px;height:7px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 2px #000}
#g3leg .tk{position:relative;display:inline-block;width:20px;height:20px;margin:0;vertical-align:middle}#g3leg .tk .fl{inset:3.5px;border-width:1.5px;background:linear-gradient(#2aa23c 33%,#f4f4ef 33% 66%,#d8261c 66%)}#g3leg .tk.far{width:10px;height:10px;border-radius:50%;background:#2aa23c;border:2px solid #f4f4ef;box-sizing:border-box}
`;document.head.appendChild(s);}
// ---- facts about one army, for drawing only
function gtkRel(o){const me=GC.me;return o===me?'me':!me?'oth':grAtWar(me,o)?'war':(typeof grAllied==='function'&&grAllied(me,o))?'ally':'oth';}
const GTK_RELN={me:3,war:2,ally:1,oth:0};
function gtkFight(){const m=new Map();if(GC.q)for(const b of GC.q)if(!b.done&&!m.has(b.p))m.set(b.p,b);return m;}
function gtkState(a,fights){const p=GCM.P[a.at],b=fights&&fights.get(a.at);if(b&&(b.att.includes(a.id)||b.def.includes(a.id)))return 'fight';
  if(a.path&&a.path.length)return 'march';if(!p.land)return 'hold';const ow=GC.prov[a.at].o;
  if(ow!==a.o&&grAtWar(a.o,ow))return 'siege';
  if(grFriend(a.o,ow)&&gtkWarAny(a.o)&&typeof geCount==='function'&&(geCount(a.at,'fort')+geCount(a.at,'mfort')>0))return 'dug';return 'hold';}   // dug in = holding behind forts while its nation is at war
function gtkWarAny(o){const k=GC.turn+'|'+Object.keys(GC.war||{}).length;let W=gtkWarAny.c;if(!W||W.k!==k)W=gtkWarAny.c={k,m:new Map()};let v=W.m.get(o);if(v===undefined){v=false;for(const c in GC.nat)if(c!==o&&grAtWar(o,c)){v=true;break;}W.m.set(o,v);}return v;}
function gtkEta(a){if(!a.path||!a.path.length)return 0;let m=0,at=a.at;for(const j of a.path){m+=grEdge(at,j)||1;at=j;}const c=grEdge(a.at,a.path[0])||1;return Math.max(1,Math.round((m-grSlide(a)*c)*30));}
function gtkMake(L){let n=0,hp=0,inf=0,arm=0,fs=0,su=0,fl=0,stars=0;for(const a of L){const fu=a.fu===undefined?100:a.fu;su+=(a.sup>0?Math.min(fu,25):fu)*a.u.length;if(a.fl)fl=1;
    const g=typeof gmilGen==='function'?gmilGen(a):null;if(g)stars=Math.max(stars,1+(typeof gmilLv==='function'?gmilLv(g):0));
    for(const r of a.u){n++;hp+=Math.max(0,Math.min(100,r[1]||0));const k=r[0];if(k==='inf'||k==='at'||k==='champ')inf++;else if(k==='tank')arm++;else fs++;}}
  return {n,st:n?Math.round(hp/n):100,su:n?Math.round(su/n):100,inf,arm,fs,fl,stars};}
/* ONE strength estimate: exactly the terms grAuto() (13-grand.js) multiplies before its dice — same grSideUnits / grSideVal / grDefMods / grIdeaMul calls,
   no second formula. Used by the odds pills and the tug bar. Guard: orch/grandtest.mjs compares it with grAuto's own sa/sd. */
function gtkEst(b){const sa=grSideVal(grSideUnits(b,'att'),0)*grIdeaMul(b.an,'attack'),sd=grSideVal(grSideUnits(b,'def'),1)*grDefMods(b)*grIdeaMul(b.dn,'defense');return {sa,sd,r:sd>0?sa/sd:99};}
function gtkOdds(attIds,pi){const A=attIds.map(id=>GC.armies.find(x=>x.id===id)).filter(Boolean);if(!A.length)return null;const an=A[0].o,p=GCM.P[pi];
  const def=GC.armies.filter(a=>a.at===pi&&a.o!==an&&grAtWar(an,a.o)),ow=p.land?GC.prov[pi].o:'',garr=!!(p.land&&ow!==an&&grAtWar(an,ow)&&GC.prov[pi].gar.length>0);if(!def.length&&!garr)return null;
  const from=A[0].path&&A[0].path.length>1&&A[0].path[A[0].path.length-1]===pi?A[0].path[A[0].path.length-2]:A[0].at;
  const b={p:pi,an,dn:garr?ow:def[0].o,att:A.map(a=>a.id),def:def.map(a=>a.id),garr,river:from!==pi&&grRiver(from,pi),mtn:p.t==='m',sea:!p.land,done:0},e=gtkEst(b);e.b=b;
  e.k=e.r>=GTK_ODDS[0]?'g':e.r<=GTK_ODDS[1]?'b':'e';e.t=e.k==='g'?'Good odds':e.k==='b'?'Bad odds':'Even fight';return e;}
function gtkReach(a,pi){if(a.at===pi)return true;const r=grPath(a.o,a.at,pi,a.fl);return !!r&&r.turns!=null&&r.turns<=2;}   // "in reach" = your selected army gets there within two months
// ---- the far-tier dots: one THREE.Points for every stack on the map
function gtkDots(){const T=G3.tok;if(T.pts&&T.pts.parent===G3.sc)return T.pts;const cap=1024,g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(cap*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(cap*3),3));g.setAttribute('aRel',new THREE.BufferAttribute(new Float32Array(cap),1));g.setDrawRange(0,0);
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{uPx:{value:1}},
    vertexShader:'attribute vec3 color;attribute float aRel;uniform float uPx;varying vec3 vC;varying float vR;void main(){vC=color;vR=aRel;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=(aRel>.5?20.:10.)*uPx;}',
    fragmentShader:'varying vec3 vC;varying float vR;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;vec3 rim=vR>2.5?vec3(.96,.96,.94):vR>1.5?vec3(.9,.28,.23):vR>.5?vec3(.35,.63,.93):vec3(.05,.08,.1);float e=vR>.5?.62:.7;vec3 c=r>e?(r>.9?vec3(.05,.08,.1):rim):vC;gl_FragColor=vec4(c,(vR>.5?1.:.7)*smoothstep(1.,.92,r));}'});
  T.pts=new THREE.Points(g,m);T.pts.frustumCulled=false;T.pts.renderOrder=40;T.cap=cap;G3.sc.add(T.pts);return T.pts;}
// ---- besieging: a dashed ring on the ground round the town (one InstancedMesh for all sieges)
function gtkRingGeo(N,w){const P=[],I=[],S=5;let vo=0;for(let i=0;i<N;i++){const a0=i/N*Math.PI*2,a1=(i+.55)/N*Math.PI*2;
    for(let k=0;k<=S;k++){const a=a0+(a1-a0)*k/S,c=Math.cos(a),sn=Math.sin(a);P.push(c*(1-w),0,sn*(1-w),c*(1+w),0,sn*(1+w));if(k<S){const o=vo+k*2;I.push(o,o+2,o+1,o+1,o+2,o+3);}}vo+=(S+1)*2;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setIndex(I);return geo;}
function gtkRings(){const T=G3.tok;if(T.rings&&T.rings.parent===G3.sc)return T.rings;
  T.rings=new THREE.InstancedMesh(gtkRingGeo(22,.045),new THREE.MeshBasicMaterial({color:0xf04a3c,side:THREE.DoubleSide,transparent:true,opacity:.95,depthTest:false,depthWrite:false}),64);T.rings.count=0;T.rings.frustumCulled=false;T.rings.renderOrder=38;G3.sc.add(T.rings);return T.rings;}
// ---- close tier: the real army in miniature. A few figures per unit type it really has (soldiers in the nation's kit, tanks, guns, air defence,
// helicopters, drones, ships), pooled as ONE InstancedMesh per model, inside a dashed footprint in the owner's colour (one more InstancedMesh).
const GTK_MODEL={tank:['tank',4],arty:['m_msta',4.4],aa:['sam',3.8],heli:['heli',4.4],drone:['drone',2.8],ship:['m_frg',8]};
const GTK_MINI_STACKS=14,GTK_MINI_CAP=256;
function gtkLoadModels(){if(G3.tokLoad||typeof parseModel!=='function'||typeof MODEL_FILES==='undefined')return;G3.tokLoad=1;
  Promise.all(['tank','m_msta','sam','heli','drone'].filter(k=>MODEL_FILES[k]).map(k=>parseModel(k).catch(()=>false))).then(()=>{G3.lblDirty=true;}).catch(()=>{});}
function gtkGeo(kind,fac){const C=G3.tokGeo||(G3.tokGeo={}),sol=kind==='inf'||kind==='at',M=GTK_MODEL[kind],key=sol?(typeof solKey==='function'?solKey(fac):'sol_w'):M?M[0]:null;if(!key)return null;if(C[key]!==undefined)return C[key];
  if(!(typeof MODELS!=='undefined'&&MODELS.ready&&MODELS.proto[key]))return null;   // not cached while the model loads; drawn as soon as it is there
  let g=g3BakeModel(key,{fac,color:'#8c9084'},sol?3:2,sol?true:null);if(!g)return C[key]=null;
  if(sol){const cA=g.attributes.color,pA=g.attributes.position;for(let i=0;i<cA.count;i++){const ny=pA.getY(i)/3,lum=(cA.getX(i)+cA.getY(i)+cA.getZ(i))/3;let c;if(ny>.935)c=[.6,.6,.58];else if(ny>.84)c=[1,.78,.62];else if(ny<.07)c=[.2,.16,.13];else{const k=(.6+.6*Math.min(1,lum))*(ny<.5?.8:1);c=[k,k,k];}cA.setXYZ(i,c[0],c[1],c[2]);}   // plain cloth: the nation's uniform colour comes from the instance tint
    g=g3Decimate(g,.2);}
  else{g.computeBoundingBox();let bb=g.boundingBox;if(bb.max.z-bb.min.z>bb.max.x-bb.min.x){g.rotateY(Math.PI/2);g.computeBoundingBox();bb=g.boundingBox;}const sc=M[1]/Math.max(.01,bb.max.x-bb.min.x);g.scale(sc,sc,sc);g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);{const cA=g.attributes.color;for(let i=0;i<cA.count;i++){const l=.38+.5*Math.min(1,(cA.getX(i)+cA.getY(i)+cA.getZ(i))/3*1.4);cA.setXYZ(i,l,l,l*.96);}}   // plain painted metal, light enough to read on the map; the nation tint comes from the instance colour
    g=g3Decimate(g,kind==='ship'?.3:.2);}
  return C[key]=g;}
function gtkFigures(L){const cnt={};for(const a of L)for(const r of a.u){const k=a.fl?'ship':r[0];cnt[k]=(cnt[k]||0)+1;}const F=[];
  for(const k of ['inf','at','tank','arty','aa','heli','drone','ship']){const n=cnt[k]|0;if(!n)continue;const m=k==='inf'?Math.min(6,1+Math.floor(n/4)):k==='ship'?Math.min(3,n):Math.min(3,Math.ceil(n/3));for(let i=0;i<m;i++)F.push(k);}return F;}
function gtkMinis(list,tier){const T=G3.tok;if(!T.mp)T.mp=new Map();for(const p of T.mp.values())p.n=0;let nf=0,total=0;
  if(!T.footD||T.footD.parent!==G3.sc){T.footD=new THREE.InstancedMesh(gtkRingGeo(30,.075),new THREE.MeshBasicMaterial({color:0x10181e,side:THREE.DoubleSide,depthTest:false,depthWrite:false}),GTK_MINI_STACKS);T.footD.count=0;T.footD.frustumCulled=false;T.footD.renderOrder=1;G3.sc.add(T.footD);}   /* dark edge under the dashes so the owner colour reads on land of the same colour */
  if(!T.foot||T.foot.parent!==G3.sc){T.foot=new THREE.InstancedMesh(gtkRingGeo(30,.035),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,depthTest:false,depthWrite:false}),GTK_MINI_STACKS);T.foot.count=0;T.foot.frustumCulled=false;T.foot.renderOrder=1.5;G3.sc.add(T.foot);}   /* opaque, no depth test, drawn after the land and before the figures: lies on the ground, never hides them */
  if(tier===2&&list.length){gtkLoadModels();const cc=G3.cc,k=Math.max(.9,Math.min(1.9,cc.d/120)),D=T.d3||(T.d3=new THREE.Object3D()),col=T.c3||(T.c3=new THREE.Color());
    list.sort((a,b)=>Math.hypot(a.e.x-cc.x,a.e.z-cc.z)-Math.hypot(b.e.x-cc.x,b.e.z-cc.z)||a.a.id-b.a.id);
    for(const g of list.slice(0,GTK_MINI_STACKS)){const e=g.e,o=g.a.o,fac=grNat(o).fac,un=g3Uniform(o),nc=grNatRgb(o),F=gtkFigures(g.L);if(!F.length)continue;
      const R=(6+Math.min(5,F.length*.4))*k;let face=-Math.PI/2;if(g.st==='march'){const t=gtkTown(g.a.path[0]);face=Math.atan2(-(t[1]-e.z),t[0]-e.x);}
      D.position.set(e.x,e.y+.4,e.z);D.rotation.set(0,0,0);D.scale.set(R,1,R*.62);D.updateMatrix();T.foot.setMatrixAt(nf,D.matrix);T.footD.setMatrixAt(nf,D.matrix);T.foot.setColorAt(nf,col.setRGB(.35+nc[0]/392,.35+nc[1]/392,.35+nc[2]/392));nf++;
      F.forEach((kd,i)=>{const geo=gtkGeo(kd,fac);if(!geo)return;let p=T.mp.get(geo.uuid);
        if(!p||p.im.parent!==G3.sc){p={im:new THREE.InstancedMesh(geo,G3.matLit,GTK_MINI_CAP),n:0};p.im.frustumCulled=false;p.im.renderOrder=2;p.im.count=0;T.mp.set(geo.uuid,p);G3.sc.add(p.im);}if(p.n>=GTK_MINI_CAP)return;
        const rad=Math.sqrt((i+.5)/F.length)*.8,ang=i*2.39996+g.a.id*1.7,x=e.x+Math.cos(ang)*rad*R,z=e.z+Math.sin(ang)*rad*R*.62,air=kd==='heli'?2.4:kd==='drone'?3.2:0,sol=kd==='inf'||kd==='at';
        D.position.set(x,(e.sea?.4:Math.max(.3,g3HeightAt(x,z)))+air*k,z);D.rotation.set(0,face+(g3Hash(i,g.a.id)-.5)*.5,0);D.scale.setScalar(k);D.updateMatrix();p.im.setMatrixAt(p.n,D.matrix);
        p.im.setColorAt(p.n,sol?col.setRGB(un[0],un[1],un[2]):col.setRGB(.4+.6*un[0],.4+.6*un[1],.4+.6*un[2]));p.n++;total++;});}}
  T.footD.count=nf;T.footD.visible=nf>0;if(nf)T.footD.instanceMatrix.needsUpdate=true;
  T.foot.count=nf;T.foot.visible=nf>0;if(nf){T.foot.instanceMatrix.needsUpdate=true;if(T.foot.instanceColor)T.foot.instanceColor.needsUpdate=true;}
  for(const p of T.mp.values()){p.im.count=p.n;p.im.visible=p.n>0;if(p.n){p.im.instanceMatrix.needsUpdate=true;if(p.im.instanceColor)p.im.instanceColor.needsUpdate=true;}}T.minis=total;T.feet=nf;}
function gtkTown(pi){const p=GCM.P[pi],tw=p.land?g3Towns().find(t=>t.pi===pi):null;return tw?[tw.x,tw.z]:[p.x,p.y];}
// ---- the tokens (called from g3Labels on every label pass, and from the frame loop while armies slide)
function g3Tokens(tier){if(!G3.lab||!GC||!G3.cam)return;gtkCss();if(!G3.tok||G3.tok.sc!==G3.sc)G3.tok={sc:G3.sc,eta:new Map()};const T=G3.tok;if(tier===undefined)tier=G3.tier|0;
  const cam=G3.cam,w=GV.w,h=GV.h,v=T.v||(T.v=new THREE.Vector3()),me=GC.me,selA=GV.selA;
  const proj=(x,y,z)=>{v.set(x,y,z).project(cam);if(v.z>1||v.z<-1)return null;const X=(v.x*.5+.5)*w,Y=(-v.y*.5+.5)*h;if(X<-60||Y<-40||X>w+60||Y>h+40)return null;return [X,Y];};
  const vis=(el,on)=>{const d=on?'block':'none';if(el._v!==d){el._v=d;el.style.display=d;}};
  const fights=gtkFight(),grp=new Map(),I=typeof gmIds==='function'?gmIds():[];G3.hit=[];
  // 1. stacks: armies standing on the same spot. middle/far = one per province (and one per column on the march); close = one per owner
  for(const a of GC.armies){const e=G3.arm.get(a.id);if(!e)continue;const seen=grSeen(a);e.seen=seen;if(!seen)continue;
    const st=gtkState(a,fights),fb=st==='fight'?fights.get(a.at):null,side=fb?(fb.att.includes(a.id)?'A':'D'):'';
    const k=a.at+'|'+(st==='march'?'>'+a.path[0]+(tier===2?a.o:''):fb?side:tier===2?a.o:'');let g=grp.get(k);
    if(!g){g={k,a,e,L:[],st,side,fb,rn:-1};grp.set(k,g);}g.L.push(a);const rn=(a.id===selA?10:0)+GTK_RELN[gtkRel(a.o)]+(st==='march'?0:.5);if(rn>g.rn||(rn===g.rn&&a.id<g.a.id)){g.rn=rn;g.a=a;g.e=e;g.st=st;}}
  // 2. far dots (every stack, one draw) — world space, so only rebuilt here
  {const P=gtkDots(),pa=P.geometry.attributes.position,ca=P.geometry.attributes.color,ra=P.geometry.attributes.aRel;let n=0;P.visible=tier===0;
    if(tier===0){for(const g of grp.values()){if(n>=T.cap)break;const c=grNatRgb(g.a.o),e=g.e;pa.setXYZ(n,e.x,e.y+1,e.z);ca.setXYZ(n,c[0]/255,c[1]/255,c[2]/255);ra.setX(n,g.a.id===selA?3:GTK_RELN[gtkRel(g.a.o)]);n++;}
      pa.needsUpdate=ca.needsUpdate=ra.needsUpdate=true;P.material.uniforms.uPx.value=(G3.R?G3.R.domElement.height:h)/Math.max(1,h);}P.geometry.setDrawRange(0,n);T.dots=n;}
  // 3. odds: only while one of your armies is selected
  const sa=selA&&GC.armies.find(x=>x.id===selA),mySel=sa&&sa.o===me&&GC.ph==='plan'?sa:null,ok=mySel?I.join(',')+'|'+GC.turn+'|'+(GC.day|0)+'|'+mySel.at+'|'+GC.armies.length:'';if(T.ok!==ok){T.ok=ok;T.odds=new Map();}
  const odds=g=>{if(!mySel||gtkRel(g.a.o)!=='war')return null;let o=T.odds.get(g.a.at);if(o===undefined){o=null;try{if(gtkReach(mySel,g.a.at))o=gtkOdds(I.length?I:[mySel.id],g.a.at);}catch(e){}T.odds.set(g.a.at,o);}return o;};
  // 4. draw
  const used=new Set(),placed=[],shown=[],rings=gtkRings();let nr=0,ntok=0;const M4=T.m4||(T.m4=new THREE.Matrix4());
  const order=[...grp.values()].sort((a,b)=>b.rn-a.rn);
  const draw=(key,g,L,q,dx,fan)=>{const a=L.includes(g.a)?g.a:L[0],rel=gtkRel(a.o),sel=L.some(x=>x.id===selA),mk=gtkMake(L),st=g.st,hv=T.hov===g.k;
    let pl=G3.pl.get(key);if(!pl){pl=document.createElement('div');pl.className='tk';G3.lab.appendChild(pl);G3.pl.set(key,pl);}used.add(key);pl._ids=L.map(x=>x.id);pl._k=g.k;
    const far=tier===0,od=fan?null:odds(g),eta=st==='march'?gtkEta(a):0;let dir=0;
    if(st==='march'&&!far){const t=gtkTown(a.path[0]),q2=proj(t[0],g.e.y,t[1])||(()=>{v.set(t[0],g.e.y,t[1]).project(cam);return [(v.x*.5+.5)*w,(-v.y*.5+.5)*h];})();dir=Math.round(Math.atan2(q2[0]-q[0],-(q2[1]-q[1]))*180/Math.PI/5)*5;}
    let tw=50;if(st==='fight'&&g.fb){try{const e=gtkEst(g.fb),mineAtt=g.fb.an===me||(me&&grFriend(me,g.fb.an)),sh=e.sa/Math.max(1,e.sa+e.sd);tw=Math.round(100*(mineAtt||!(g.fb.dn===me||(me&&grFriend(me,g.fb.dn)))?sh:1-sh));}catch(e){}}
    const cls='tk '+rel+(far?' far':'')+(sel?' sel':'')+(hv?' hv':'')+(mk.st<35?' low':'')+(mk.su<30?' dry':'')+(st==='fight'?' fi'+(g.side==='D'||!grp.has(a.at+'|D')?' fi2':''):'')+(!sel&&I.length>1&&L.some(x=>I.includes(x.id))?' gmsel':'')+(od?' ho':'');
    const hsh=cls+'|'+mk.n+'|'+mk.st+'|'+mk.su+'|'+mk.stars+'|'+a.o+'|'+L.length+'|'+st+'|'+dir+'|'+tier+'|'+(od?od.k:'')+'|'+tw+'|'+(tier===2?mk.inf+','+mk.arm+','+mk.fs:'');
    if(pl._h!==hsh){pl._h=hsh;pl.className=cls;pl.style.setProperty('--st',mk.st);pl.style.setProperty('--su',mk.su);if(st==='march')pl.style.setProperty('--dir',dir+'deg');if(st==='fight')pl.style.setProperty('--tw',tw);
      const num=mk.n>=1000?(mk.n/1000).toFixed(1)+'k':mk.n,full=rel!=='oth'||sel||hv;
      pl.innerHTML='<i class="ou"></i><i class="in"></i><i class="fl" style="background-image:url('+g3FlagUrl(a.o)+')"></i><i class="pn"></i>'
        +(st==='march'?'<i class="ar"></i>':'')+(st==='dug'?'<i class="br"></i>':'')+(st==='fight'&&g.side==='A'?'<i class="zz">⚡</i><i class="tg"></i>':'')
        +(L.length>1?'<i class="ct">'+L.length+'</i>':'')+(od?'<i class="od '+od.k+'">'+od.t+'</i>':'')
        +(full||far?'<span class="pt"><b>'+num+'</b>'+(mk.stars?'<em>'+'★'.repeat(Math.min(5,mk.stars))+'</em>':'')
          +(tier===2?'<small>'+(mk.fl?'⚓ '+mk.n+' ships':'<span title="infantry">♟ '+mk.inf+'</span> · <span title="armour">▰ '+mk.arm+'</span> · <span title="fire support">✸ '+mk.fs+'</span>')+'</small>':'')+'</span>':'');}
    const X=Math.round(q[0]+dx),Y=Math.round(q[1]),t='translate('+X+'px,'+Y+'px)';if(pl._t!==t){pl._t=t;pl.style.transform=t;}vis(pl,true);ntok++;
    const R=far?9:rel==='oth'?11:18,cy=far?Y:Y-(rel==='oth'?18:26);G3.hit.push({aid:a.id,x:X,y:cy,r:R+5,k:g.k});for(const x of L)if(x!==a)G3.hit.push({aid:x.id,x:X,y:cy,r:R+5,k:g.k});   // the stack's front army is hit first; the rest stay reachable for box-select
    return pl;};
  for(const g of order){const e=g.e,q=proj(e.x,e.y,e.z);if(!q)continue;const rel=gtkRel(g.a.o),sel=g.L.some(x=>x.id===selA),hv=T.hov===g.k||T.fan===g.k;
    if(g.st==='siege'&&tier>0&&nr<64){const t=gtkTown(g.a.at),r=Math.max(9,Math.hypot(e.x-t[0],e.z-t[1]));M4.makeScale(r,1,r);M4.setPosition(t[0],Math.max(.3,g3HeightAt(t[0],t[1]))+1.2,t[1]);rings.setMatrixAt(nr++,M4);}
    let dx=0;if(g.fb&&tier>0)dx=g.side==='A'?-16:16;
    if(tier===0){if(!(rel!=='oth'||sel))continue;if(!sel&&rel!=='me'){let bad=false;for(const o of placed)if(Math.abs(o[0]-q[0])<30&&Math.abs(o[1]-q[1])<16){bad=true;break;}if(bad)continue;}}
    else if(rel==='oth'&&!sel){let bad=false;for(const o of placed)if(Math.abs(o[0]-q[0])<30&&Math.abs(o[1]-q[1])<30){bad=true;break;}if(bad)continue;}
    placed.push(q);shown.push(g);
    if(tier>0&&hv&&g.L.length>1&&!g.fb){const n=g.L.length,sp=tier===2?96:66;g.L.forEach((a,i)=>draw(g.k+'#'+a.id,g,[a],q,(i-(n-1)/2)*sp,true));}   // stack fanned out: one token per army
    else draw(g.k,g,g.L,q,dx,false);
    // arrival: where and when the column gets there (yours, your allies' and the selected one)
    if(g.st==='march'&&(rel==='me'||sel)&&tier>0){const a=g.a,t=gtkTown(a.path[a.path.length-1]),q2=proj(t[0],Math.max(.3,g3HeightAt(t[0],t[1])),t[1]);if(q2){let el=T.eta.get(g.k);if(!el){el=document.createElement('div');el.className='eta';G3.lab.appendChild(el);T.eta.set(g.k,el);}
        const d=gtkEta(a),tx=d+(d===1?' day':' days');if(el._x!==tx){el._x=tx;el.textContent=tx;}const tr='translate('+Math.round(q2[0])+'px,'+Math.round(q2[1])+'px)';if(el._t!==tr){el._t=tr;el.style.transform=tr;}vis(el,true);used.add('eta'+g.k);}}}
  rings.count=nr;rings.instanceMatrix.needsUpdate=true;rings.visible=nr>0;T.n=ntok;gtkMinis(shown,tier);
  for(const [k,pl] of G3.pl)if(!used.has(k))vis(pl,false);for(const [k,el] of T.eta)if(!used.has('eta'+k))vis(el,false);
  if(G3.pl.size>400)for(const [k,pl] of G3.pl)if(!used.has(k)){pl.remove();G3.pl.delete(k);}
  if(T.eta.size>120)for(const [k,el] of T.eta)if(!used.has('eta'+k)){el.remove();T.eta.delete(k);}}
// hover/click fan-out: g3HitAt (13e) tells us which stack is under the mouse
function gtkHover(hit){const T=G3.tok;if(!T)return;const k=hit?hit.k:null;if(T.hov!==k){T.hov=k;G3.lblDirty=true;}}
function gtkClicked(hit){const T=G3.tok;if(!T)return;T.fan=hit?hit.k:null;G3.lblDirty=true;}
// for tests and guards: what is drawn for armies right now
function gtkAudit(){const T=G3.tok||{},out={tier:G3.tier,tokens:0,far:0,stacks:0,odds:0,dots:T.dots|0,dotsOn:!!(T.pts&&T.pts.visible),rings:T.rings?T.rings.count:0,minis:T.minis|0,old:0,dup:0};const seen=new Set();
  for(const [k,el] of G3.pl){if(el._v!=='block')continue;out.tokens++;if(/ far/.test(el.className))out.far++;if(el.querySelector('.ct'))out.stacks++;if(el.querySelector('.od'))out.odds++;for(const id of el._ids||[]){if(seen.has(id))out.dup++;seen.add(id);}}
  out.old=document.querySelectorAll('#g3ui .p').length+(G3.bat?1:0)+(G3.batG?1:0);if(G3.sc)G3.sc.traverse(o=>{if(o.userData&&(o.userData.wk||o.userData.sh))out.old++;});return out;}
