// ARMY STANDARDS (armytokens, Abdullah 2026-11-10 19:17 "Go" to orch/concepts/army-standards.jpg; spec orch/concepts/ARMY-STANDARDS.md).
// CSS note: body gets the class 'tk' from the battle ticker (08-ui.js tkApply), so every rule here is scoped under #g3ui / #g3leg.
// The ONE way an army is drawn on the grand map: a token read like a watch face, whose SHAPE says what it is (mapshapes, Abdullah 2026-11-11 17:37 "Shield"): land army = heraldic shield, fleet = ship hull, air group = swept wing; capital plates stay round. It replaced the figure blobs (far and middle zoom), shield badges and
// per-army waving flags. View only: nothing here writes campaign state. Zoom tier = the shared g3Zoom() value (G3.tier), never a second one.
//   far (0)   = one tiny owner-colour shield / hull / wing per stack (ONE THREE.Points draw) + a number for yours / enemies / allies
//   middle (1)= the token: flag field with the unit count on it, green strength edge, gold supply edge, general stars (a shield stands on its point; hull and wing keep a pin); rim = whose side
//   close (2) = token with make-up counts + the small on-land figures (ships at sea and on islands) that 13e-grand3d.js draws at believable scale (g3Batch)
// Tokens never pile up: armies in one province are one stack with a count, neighbouring tokens nudge apart (gtkNudge), yours and enemies stay on top.
// Flags: the token's flag field is the only flag; a waving flag flies only on the selected army.
// Shape = what it is doing: plain = holding, arrow nose + arrival = marching, gold corner brackets = dug in, dashed ring round the town =
// besieging, two tokens touching + lightning + tug bar = fighting. Several armies in one province = one stack with a count (hover/click fans out).
const GTK_RIM={me:'#f4f4ef',war:'#e5483b',ally:'#5aa0ee',oth:'#51705c'};
const GTK_ODDS=[1.25,.8];   // attacker/defender strength ratio: >= 1.25 Good odds, <= 0.8 Bad odds, between = Even fight
function gtkCss(){if(document.getElementById('gtkcss'))return;const s=document.createElement('style');s.id='gtkcss';
  const br="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M2 13V2H13M27 2H38V13M38 27V38H27M13 38H2V27' fill='none' stroke='%23e8b23a' stroke-width='4' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  s.textContent=`
:is(#g3ui,#g3leg) .tk{position:absolute;left:0;top:0;display:none;width:36px;height:44px;margin:-44px 0 0 -18px;--rim:#51705c;--st:100;--su:100;--sc:#5bd66a;--uc:#e8b23a;--mk:polygon(0 0,100% 0,100% 50%,97% 62%,90% 72%,79% 82%,65% 91%,50% 100%,35% 91%,21% 82%,10% 72%,3% 62%,0 50%);--o:-2.5px;--s:1.5px;--f:4px;--r:1px;--g:3px;font-family:system-ui,sans-serif}
:is(#g3ui,#g3leg) .tk.sea{width:50px;height:26px;margin:-36px 0 0 -25px;--mk:polygon(0 0,100% 0,82% 100%,14% 100%,7% 92%,4% 76%);--o:-2px;--s:1px;--f:2.5px;--r:.5px;--g:2px}
:is(#g3ui,#g3leg) .tk.air{width:46px;height:36px;margin:-46px 0 0 -23px;--mk:polygon(50% 0,100% 74%,97% 94%,66% 74%,50% 90%,34% 74%,3% 94%,0 74%);--o:-2px;--s:1px;--f:2.5px;--r:.5px;--g:2px}
:is(#g3ui,#g3leg) .tk>i{position:absolute;display:block;font-style:normal}
:is(#g3ui,#g3leg) .tk :is(.ou,.in,.fl),:is(#g3ui,#g3leg) .tk :is(.in,.fl)::before,:is(#g3ui,#g3leg) .tk .fl::after{clip-path:var(--mk)}:is(#g3ui,#g3leg) .tk :is(.in,.fl)::before,:is(#g3ui,#g3leg) .tk .fl::after{content:'';position:absolute}
:is(#g3ui,#g3leg) .tk .ou{inset:var(--o);background:conic-gradient(var(--uc) calc(var(--su)*1%),#0d151c66 0)}
:is(#g3ui,#g3leg) .tk .in{inset:-.5px;background:#0d151c}:is(#g3ui,#g3leg) .tk .in::before{inset:var(--s);background:conic-gradient(var(--sc) calc(var(--st)*1%),#26323a 0)}
:is(#g3ui,#g3leg) .tk .fl{inset:var(--f);background:#0d151c}:is(#g3ui,#g3leg) .tk .fl::before{inset:var(--r);background:var(--rim)}:is(#g3ui,#g3leg) .tk .fl::after{inset:var(--g);background:#777 var(--fg,none) center/cover no-repeat}
:is(#g3ui,#g3leg) .tk .nb{left:7px;right:7px;top:7px;height:10px;background:#0d151cd9;color:#fff;font:800 9.5px/10px system-ui,sans-serif;text-align:center;letter-spacing:-.2px}
:is(#g3ui,#g3leg) .tk.sea .nb{left:5px;right:auto;top:4.5px;padding:0 3px}:is(#g3ui,#g3leg) .tk.air .nb{left:50%;right:auto;top:13px;padding:0 2px;border-radius:2px;transform:translateX(-50%)}
:is(#g3ui,#g3leg) .tk .dk{left:13px;bottom:100%;width:14px;height:6px;margin-bottom:1px;background:var(--rim);border:1px solid #0d151c;border-bottom:0;border-radius:1px 1px 0 0}:is(#g3ui,#g3leg) .tk .dk::before{content:'';position:absolute;left:4px;bottom:100%;width:2px;height:5px;background:var(--rim);border:1px solid #0d151c;border-bottom:0}
:is(#g3ui,#g3leg) .tk .pn{display:none;left:50%;top:100%;width:0;height:0;margin:1px 0 0 -4px;border:4px solid transparent;border-top:7px solid var(--rim);border-radius:0;filter:drop-shadow(0 1px 1px #000a)}:is(#g3ui,#g3leg) .tk:is(.sea,.air) .pn{display:block}
:is(#g3ui,#g3leg) .tk .ct{right:-7px;top:-7px;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:#f4f4ef;color:#10161b;font:700 10px/15px system-ui,sans-serif;text-align:center;box-shadow:0 1px 2px #000a}
:is(#g3ui,#g3leg) .tk .pt{position:absolute;left:100%;top:50%;transform:translateY(-50%);margin-left:7px;padding:1px 7px 1px 6px;border-radius:5px;background:#0d151ce8;border:1px solid var(--rim);color:#f2f0e8;white-space:nowrap;font:700 13px/17px system-ui,sans-serif;box-shadow:0 1px 3px #000a}
:is(#g3ui,#g3leg) .tk .pt em{font-style:normal;color:#e8b23a;font-size:9px;letter-spacing:1px;margin-left:5px;vertical-align:1px}
:is(#g3ui,#g3leg) .tk .pt small{display:block;font:600 10px/12px system-ui,sans-serif;color:#b9c2c6;margin-top:-1px;padding-bottom:1px}
:is(#g3ui,#g3leg) .tk.me{--rim:#f4f4ef}:is(#g3ui,#g3leg) .tk.war{--rim:#e5483b}:is(#g3ui,#g3leg) .tk.ally{--rim:#5aa0ee}
:is(#g3ui,#g3leg) .tk.me .pt{border-color:#56646e}:is(#g3ui,#g3leg) .tk:not(.far):not(.oth) .pt{margin-left:4px}
:is(#g3ui,#g3leg) .tk:not(.far):not(.oth) .pt b{display:none}:is(#g3ui,#g3leg) .tk:not(.far):not(.oth) .pt em{margin-left:0}:is(#g3ui,#g3leg) .tk.np:not(.oth):not(.far) .pt{display:none}
:is(#g3ui,#g3leg) .tk.oth{width:22px;height:27px;margin:-27px 0 0 -11px;opacity:.62;--s:.5px;--f:2px;--r:.5px;--g:1.5px}:is(#g3ui,#g3leg) .tk.oth.sea{width:30px;height:16px;margin:-26px 0 0 -15px}:is(#g3ui,#g3leg) .tk.oth.air{width:28px;height:22px;margin:-32px 0 0 -14px}:is(#g3ui,#g3leg) .tk.oth .dk{left:8px;width:8px;height:4px}:is(#g3ui,#g3leg) .tk.oth .dk::before{left:2px;height:3px}:is(#g3ui,#g3leg) .tk.oth .pt,:is(#g3ui,#g3leg) .tk.oth .ou,:is(#g3ui,#g3leg) .tk.oth .nb{display:none}:is(#g3ui,#g3leg) .tk.oth.sel,:is(#g3ui,#g3leg) .tk.oth.hv{opacity:1}:is(#g3ui,#g3leg) .tk.oth.sel .pt,:is(#g3ui,#g3leg) .tk.oth.hv .pt{display:block}
:is(#g3ui,#g3leg) .tk.low{--sc:#ef5548}:is(#g3ui,#g3leg) .tk.dry{--uc:#ef5548}
:is(#g3ui,#g3leg) .tk.ally{z-index:1}:is(#g3ui,#g3leg) .tk.war{z-index:2}:is(#g3ui,#g3leg) .tk.me{z-index:3}:is(#g3ui,#g3leg) .tk.hv{z-index:4}:is(#g3ui,#g3leg) .tk.sel{z-index:5}:is(#g3ui,#g3leg) .tk.ho{z-index:6}
:is(#g3ui,#g3leg) .tk:is(.sel,.gmsel)::after{content:'';position:absolute;inset:-8px;border-radius:8px 8px 50% 50%/8px 8px 62% 62%;border:2px dotted #6fe07f}:is(#g3ui,#g3leg) .tk.sea:is(.sel,.gmsel)::after{border-radius:7px 7px 16px 12px}:is(#g3ui,#g3leg) .tk.air:is(.sel,.gmsel)::after{border-radius:50% 50% 12px 12px/85% 85% 12px 12px}
:is(#g3ui,#g3leg) .tk.gmsel:not(.sel)::after{border-color:#f4f4ef}
:is(#g3ui,#g3leg) .tk .ar{left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;transform:rotate(var(--dir,0deg))}:is(#g3ui,#g3leg) .tk.oth .ar{width:42px;height:42px;margin:-21px 0 0 -21px}:is(#g3ui,#g3leg) .tk .ar::before{content:'';position:absolute;left:50%;top:-7px;margin-left:-6px;border:6px solid transparent;border-bottom:10px solid #fff;filter:drop-shadow(0 0 1.5px #000)}
:is(#g3ui,#g3leg) .tk .br{inset:-6px;background:${br} center/100% 100% no-repeat}
:is(#g3ui,#g3leg) .tk .zz{left:100%;top:50%;margin:-11px 0 0 -4px;z-index:3;border-radius:0;font:700 19px/22px system-ui,sans-serif;color:#ffd23a;text-shadow:0 0 2px #000,0 1px 2px #000}
:is(#g3ui,#g3leg) .tk .tg{left:0;top:100%;margin-top:6px;width:70px;height:6px;border-radius:3px;border:1px solid #0d151c;background:linear-gradient(90deg,#5bd66a calc(var(--tw,50)*1%),#ef5548 0)}:is(#g3ui,#g3leg) .tk:is(.sea,.air) .tg{margin-top:12px}
:is(#g3ui,#g3leg) .tk.fi .pt{display:none}:is(#g3ui,#g3leg) .tk.fi2 .pt{display:block;margin-left:19px}
:is(#g3ui,#g3leg) .tk .od{left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:7px;padding:0 8px;border-radius:9px;white-space:nowrap;font:700 11px/16px system-ui,sans-serif;color:#10161b;box-shadow:0 1px 3px #000a}
:is(#g3ui,#g3leg) .tk .od.g{background:#5bd66a}:is(#g3ui,#g3leg) .tk .od.e{background:#e8b23a}:is(#g3ui,#g3leg) .tk .od.b{background:#ef5548;color:#fff}
:is(#g3ui,#g3leg) .tk.far{width:0;height:0;margin:0;opacity:1}:is(#g3ui,#g3leg) .tk.far>i{display:none}:is(#g3ui,#g3leg) .tk.far>i.od{display:block;bottom:9px}:is(#g3ui,#g3leg) .tk.far .pt{display:block;margin-left:8px;padding:0 3px;background:rgba(9,15,23,.74);border:0;border-radius:3px;box-shadow:none;font:800 12px/14px system-ui,sans-serif;text-shadow:0 0 2px #000,0 0 2px #000,0 1px 2px #000,1px 0 2px #000}:is(#g3ui,#g3leg) .tk.far .pt em,:is(#g3ui,#g3leg) .tk.far .pt small{display:none}:is(#g3ui,#g3leg) .tk.far.sel::after{inset:-12px;border-radius:50%}
#g3ui .eta{position:absolute;left:0;top:0;display:none;white-space:nowrap;margin:-30px 0 0 -6px;padding-left:15px;font:700 12px/16px system-ui,sans-serif;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000,0 1px 2px #000}
#g3ui .eta::before{content:'';position:absolute;left:0;top:3px;width:7px;height:7px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 2px #000}
#g3leg .tk{position:relative;display:inline-block;width:20px;height:24px;margin:0;vertical-align:middle;--o:-1.5px;--s:1px;--f:2.5px;--r:.5px;--g:2px}#g3leg .tk.sea{width:27px;height:14px}#g3leg .tk.air{width:25px;height:20px}#g3leg .tk .pn,#g3leg .tk .dk{display:none}#g3leg .tk .fl::after{background:linear-gradient(#2aa23c 33%,#f4f4ef 33% 66%,#d8261c 66%)}#g3leg .tk.far{width:11px;height:13px;background:#f4f4ef;clip-path:var(--mk)}#g3leg .tk.far::before{content:'';position:absolute;inset:2px;background:#2aa23c;clip-path:var(--mk)}
`;document.head.appendChild(s);}
// ---- facts about one army, for drawing only
function gtkRel(o){const me=GC.me;return o===me?'me':!me?'oth':grAtWar(me,o)?'war':(typeof grAllied==='function'&&grAllied(me,o))?'ally':'oth';}
const GTK_RELN={me:3,war:2,ally:1,oth:0};
/* the token's shape: '' = land army (shield), 'sea' = fleet (ship hull), 'air' = air group, an army of only helicopters / drones / jets (swept wing). View only, read from the army's own units. */
const GTK_AIR={heli:1,drone:1,jet:1},GTK_SHAPE={'':'shield',sea:'hull',air:'wing'},GTK_SIZE={'':[36,44,0],sea:[50,26,10],air:[46,36,10],o:[22,27,0],osea:[30,16,10],oair:[28,22,10]};   // token width, height, pin height in pixels (same numbers as the CSS)
function gtkKind(a){if(a.fl)return 'sea';if(!a.u.length)return '';for(const r of a.u)if(!GTK_AIR[r[0]])return '';return 'air';}
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
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(cap*3),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(cap*3),3));g.setAttribute('aRel',new THREE.BufferAttribute(new Float32Array(cap),1));g.setAttribute('aShape',new THREE.BufferAttribute(new Float32Array(cap),1));g.setDrawRange(0,0);
  const m=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{uPx:{value:1}},
    vertexShader:'attribute vec3 color;attribute float aRel;attribute float aShape;uniform float uPx;varying vec3 vC;varying float vR;varying float vS;void main(){vC=color;vR=aRel;vS=aShape;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=(aRel>.5?22.:13.)*uPx;}',
    /* r = 0 in the middle of the shape, 1 on its outline: shield (flat top, sides, curved point at the bottom), hull (raked bow to the right + a small bridge), swept wing (nose up, notched tail) */
    fragmentShader:'varying vec3 vC;varying float vR;varying float vS;void main(){vec2 p=gl_PointCoord*2.-1.;float r;'
      +'if(vS<.5){float xm=p.y<0.?.84:.84*(1.-p.y*p.y);r=max(abs(p.x)/max(xm,.001),-p.y);}'
      +'else if(vS<1.5){float t=clamp(p.y+.4,0.,1.),xl=-.96+.1*t,xr=1.-.4*t;r=max(abs(p.x-(xl+xr)*.5)/((xr-xl)*.5),abs(p.y-.1)/.5);if(p.x>-.5&&p.x<-.05&&p.y>-.78&&p.y<-.38)r=min(r,.8);}'
      +'else{float ax=abs(p.x);r=1.+1.5*max(1.55*ax-p.y-.95,p.y-.3-.6*ax);}'
      +'if(r>1.)discard;vec3 rim=vR>2.5?vec3(.96,.96,.94):vR>1.5?vec3(.9,.28,.23):vR>.5?vec3(.35,.63,.93):vec3(.05,.08,.1);float e=vR>.5?.62:.7;vec3 c=r>e?(r>.9?vec3(.05,.08,.1):rim):vC;gl_FragColor=vec4(c,(vR>.5?1.:.7)*smoothstep(1.,.92,r));}'});
  T.pts=new THREE.Points(g,m);T.pts.frustumCulled=false;T.pts.renderOrder=40;T.cap=cap;G3.sc.add(T.pts);return T.pts;}
// ---- besieging: a dashed ring on the ground round the town (one InstancedMesh for all sieges)
function gtkRingGeo(N,w){const P=[],I=[],S=5;let vo=0;for(let i=0;i<N;i++){const a0=i/N*Math.PI*2,a1=(i+.55)/N*Math.PI*2;
    for(let k=0;k<=S;k++){const a=a0+(a1-a0)*k/S,c=Math.cos(a),sn=Math.sin(a);P.push(c*(1-w),0,sn*(1-w),c*(1+w),0,sn*(1+w));if(k<S){const o=vo+k*2;I.push(o,o+2,o+1,o+1,o+2,o+3);}}vo+=(S+1)*2;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geo.setIndex(I);return geo;}
function gtkRings(){const T=G3.tok;if(T.rings&&T.rings.parent===G3.sc)return T.rings;
  T.rings=new THREE.InstancedMesh(gtkRingGeo(22,.045),new THREE.MeshBasicMaterial({color:0xf04a3c,side:THREE.DoubleSide,transparent:true,opacity:.95,depthTest:false,depthWrite:false}),64);T.rings.count=0;T.rings.frustumCulled=false;T.rings.renderOrder=38;G3.sc.add(T.rings);return T.rings;}
function gtkTown(pi){const p=GCM.P[pi],tw=p.land?g3Main(pi):null;return tw?[tw.x,tw.z]:[p.x,p.y];}
/* neighbouring tokens nudge apart instead of piling up: boxes [cx,cy,halfW,halfH] in screen pixels; a token moves at most GTK_NUDGE px from its pin */
const GTK_NUDGE=60;
function gtkBox(q,rel,far,wide){return far?[q[0]+12,q[1],22,9]:rel==='oth'?[q[0],q[1]-18,14,16]:[q[0]+(wide?34:20),q[1]-24,wide?60:44,27];}
const GTK_DIR=[[0,1],[1,0],[0,-1],[-1,0],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]];
function gtkOver(b,placed,own){let ar=0,same=null;for(const o of placed){const px=b[2]+o[2]-Math.abs(b[0]-o[0]),py=b[3]+o[3]-Math.abs(b[1]-o[1]);if(px>0&&py>0){ar+=px*py*(o.g?1:.5);if(!same&&o.g&&own&&o.g.a.o===own&&!o.g.fb)same=o.g;}}return {ar,same};}   /* how much a token box covers what is already placed (a name plate counts half) */
function gtkNudge(q,rel,far,wide,placed,own){const o0=gtkOver(gtkBox(q,rel,far,wide),placed,own);if(!o0.ar)return {x:q[0],y:q[1],free:true};
  let bx=q[0],by=q[1],ba=o0.ar;
  if(!far)for(let r=12;r<=GTK_NUDGE;r+=12)for(const d of GTK_DIR){const x=q[0]+d[0]*r,y=q[1]+d[1]*r,a=gtkOver(gtkBox([x,y],rel,far,wide),placed).ar;if(!a)return {x,y,free:true};if(a<ba*.8){ba=a;bx=x;by=y;}}   /* the nearest free spot, at most GTK_NUDGE px from the pin; no free spot = the one that covers least */
  return {x:bx,y:by,free:false,same:o0.same};}
// screen boxes of the map's own controls (minimap, unit cards, round buttons, map-mode switch, monthly report, map key), in label-layer pixels; re-measured a few times a second
const GTK_HUD=['g3mini','g3cards','g3btns','g3modes','g3news','g3leg','gmCards','gmPrev'];
function gtkHud(){const T=G3.tok,now=performance.now();if(T.hud&&now-T.hudT<350)return T.hud;const R=[];T.hudT=now;T.hud=R;if(!G3.lab||!G3.lab.getBoundingClientRect)return R;const o=G3.lab.getBoundingClientRect();
  for(const id of GTK_HUD){const el=document.getElementById(id);if(!el)continue;const L=el.children.length&&getComputedStyle(el).pointerEvents==='none'?[...el.children]:[el];   /* a click-through wrapper counts by its children, not its whole box */
    for(const c of L){const r=c.getBoundingClientRect();if(r.width<8||r.height<8||r.width>o.width*.8&&r.height>o.height*.8)continue;R.push([r.left-o.left-4,r.top-o.top-4,r.right-o.left+4,r.bottom-o.top+4]);}}
  return R;}
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
  {const P=gtkDots(),pa=P.geometry.attributes.position,ca=P.geometry.attributes.color,ra=P.geometry.attributes.aRel,sh=P.geometry.attributes.aShape;let n=0;P.visible=tier===0;
    if(tier===0){for(const g of grp.values()){if(n>=T.cap)break;const c=grNatRgb(g.a.o),e=g.e;pa.setXYZ(n,e.x,e.y+1,e.z);ca.setXYZ(n,c[0]/255,c[1]/255,c[2]/255);ra.setX(n,g.a.id===selA?3:GTK_RELN[gtkRel(g.a.o)]);{const kd=gtkKind(g.a);sh.setX(n,kd==='sea'?1:kd==='air'?2:0);}n++;}
      pa.needsUpdate=ca.needsUpdate=ra.needsUpdate=sh.needsUpdate=true;P.material.uniforms.uPx.value=(G3.R?G3.R.domElement.height:h)/Math.max(1,h);}P.geometry.setDrawRange(0,n);T.dots=n;}
  // 3. odds: only while one of your armies is selected
  const sa=selA&&GC.armies.find(x=>x.id===selA),mySel=sa&&sa.o===me&&GC.ph==='plan'?sa:null,ok=mySel?I.join(',')+'|'+GC.turn+'|'+(GC.day|0)+'|'+mySel.at+'|'+GC.armies.length:'';if(T.ok!==ok){T.ok=ok;T.odds=new Map();}
  const odds=g=>{if(!mySel||gtkRel(g.a.o)!=='war')return null;let o=T.odds.get(g.a.at);if(o===undefined){o=null;try{if(gtkReach(mySel,g.a.at))o=gtkOdds(I.length?I:[mySel.id],g.a.at);}catch(e){}T.odds.set(g.a.at,o);}return o;};
  // 4. draw
  const used=new Set(),placed=tier>0&&G3.plR?G3.plR.slice():[],shown=[],rings=gtkRings();let nr=0,ntok=0;const M4=T.m4||(T.m4=new THREE.Matrix4());
  const order=[...grp.values()].sort((a,b)=>b.rn-a.rn);
  const draw=(key,g,L,q,dx,fan)=>{const a=L.includes(g.a)?g.a:L[0],rel=gtkRel(a.o),sel=L.some(x=>x.id===selA),mk=gtkMake(L),st=g.st,hv=T.hov===g.k,kd=gtkKind(a),np=!mk.stars&&tier!==2;
    let pl=G3.pl.get(key);if(!pl){pl=document.createElement('div');pl.className='tk';G3.lab.appendChild(pl);G3.pl.set(key,pl);}used.add(key);pl._ids=L.map(x=>x.id);pl._k=g.k;
    const far=tier===0,od=fan?null:odds(g),eta=st==='march'?gtkEta(a):0;let dir=0;
    if(st==='march'&&!far){const t=gtkTown(a.path[0]),q2=proj(t[0],g.e.y,t[1])||(()=>{v.set(t[0],g.e.y,t[1]).project(cam);return [(v.x*.5+.5)*w,(-v.y*.5+.5)*h];})();dir=Math.round(Math.atan2(q2[0]-q[0],-(q2[1]-q[1]))*180/Math.PI/5)*5;}
    let tw=50;if(st==='fight'&&g.fb){try{const e=gtkEst(g.fb),mineAtt=g.fb.an===me||(me&&grFriend(me,g.fb.an)),sh=e.sa/Math.max(1,e.sa+e.sd);tw=Math.round(100*(mineAtt||!(g.fb.dn===me||(me&&grFriend(me,g.fb.dn)))?sh:1-sh));}catch(e){}}
    const cls='tk '+rel+(kd?' '+kd:'')+(np?' np':'')+(far?' far':'')+(sel?' sel':'')+(hv?' hv':'')+(mk.st<35?' low':'')+(mk.su<30?' dry':'')+(st==='fight'?' fi'+(g.side==='D'||!grp.has(a.at+'|D')?' fi2':''):'')+(!sel&&I.length>1&&L.some(x=>I.includes(x.id))?' gmsel':'')+(od?' ho':'');
    const hsh=cls+'|'+mk.n+'|'+mk.st+'|'+mk.su+'|'+mk.stars+'|'+a.o+'|'+L.length+'|'+st+'|'+dir+'|'+tier+'|'+(od?od.k:'')+'|'+tw+'|'+(tier===2?mk.inf+','+mk.arm+','+mk.fs:'');
    if(pl._h!==hsh){pl._h=hsh;pl.className=cls;pl.style.setProperty('--st',mk.st);pl.style.setProperty('--su',mk.su);if(st==='march')pl.style.setProperty('--dir',dir+'deg');if(st==='fight')pl.style.setProperty('--tw',tw);
      const num=mk.n>=1000?(mk.n/1000).toFixed(1)+'k':mk.n,full=rel!=='oth'||sel||hv;
      pl.innerHTML='<i class="ou"></i><i class="in"></i><i class="fl" style="--fg:url('+g3FlagUrl(a.o)+')"></i>'+(kd==='sea'?'<i class="dk"></i>':'')+'<i class="nb">'+num+'</i><i class="pn"></i>'
        +(st==='march'?'<i class="ar"></i>':'')+(st==='dug'?'<i class="br"></i>':'')+(st==='fight'&&g.side==='A'?'<i class="zz">⚡</i><i class="tg"></i>':'')
        +(L.length>1?'<i class="ct">'+L.length+'</i>':'')+(od?'<i class="od '+od.k+'">'+od.t+'</i>':'')
        +(full||far?'<span class="pt"><b>'+num+'</b>'+(mk.stars?'<em>'+'★'.repeat(Math.min(5,mk.stars))+'</em>':'')
          +(tier===2?'<small>'+(mk.fl?'⚓ '+mk.n+' ships':kd==='air'?'✈ '+mk.n+' aircraft':'<span title="infantry">♟ '+mk.inf+'</span> · <span title="armor">▰ '+mk.arm+'</span> · <span title="fire support">✸ '+mk.fs+'</span>')+'</small>':'')+'</span>':'');}
    const X=Math.round(q[0]+dx),Y=Math.round(q[1]),t='translate('+X+'px,'+Y+'px)';if(pl._t!==t){pl._t=t;pl.style.transform=t;}vis(pl,true);ntok++;
    /* the click target follows the token's outline: its own width and height (shield / hull / wing, small for the faint ones), the pin under a hull or wing, the bridge on a hull, and the plate beside it when that shows */
    const sz=GTK_SIZE[(rel==='oth'?'o':'')+kd],plate=rel==='oth'?sel||hv:!np,R=far?9:Math.min(sz[0],sz[1])/2,cy=far?Y:Y-sz[2]-sz[1]/2,big=rel!=='oth'||sel||hv,
      hb=far?{x0:X-16,x1:X+(big?44:16),y0:Y-14,y1:Y+14}:{x0:X-sz[0]/2-5,x1:X+sz[0]/2+5+(plate?48:0),y0:Y-sz[2]-sz[1]-(kd==='sea'?13:6),y1:Y+5};
    G3.hit.push({aid:a.id,x:X,y:cy,r:R+4,k:g.k,sh:GTK_SHAPE[kd],...hb});for(const x of L)if(x!==a)G3.hit.push({aid:x.id,x:X,y:cy,r:R+4,k:g.k,sh:GTK_SHAPE[kd],...hb});   // the stack's front army is hit first; the rest stay reachable for box-select
    if(tier===2&&!fan)for(const x of L){const ex=G3.arm.get(x.id);if(!ex)continue;const qf=proj(ex.x,ex.y+2,ex.z);if(qf)G3.hit.push({aid:x.id,x:qf[0],y:qf[1],r:16,k:g.k});}   // close view: each figure on the ground is a click target too
    return pl;};
  /* 4a. find every token its place first: a token with no room joins the token of the same nation it would cover (one stack with a count, far and middle view),
     faint ones (and far numbers) are left out, yours and enemies always show */
  const todo=[],hud=gtkHud(),under=q=>{const hx=q[0],hy=q[1]-(tier===0?0:20);for(const r of hud)if(hx>r[0]&&hx<r[2]&&hy>r[1]&&hy<r[3])return true;return false;};
  if(tier>0)for(const r of hud)placed.push([(r[0]+r[2])/2,(r[1]+r[3])/2,(r[2]-r[0])/2,(r[3]-r[1])/2]);   /* tokens next to the controls step aside from them like they do from name plates */
  for(const g of order){const e=g.e,q=proj(e.x,e.y,e.z);if(!q)continue;const rel=gtkRel(g.a.o),sel=g.L.some(x=>x.id===selA);
    if(under(q))continue;   /* the map runs on under the minimap, unit cards and round buttons: a token there is hidden like the land under it, never drawn on top of them */
    if(g.st==='siege'&&tier>0&&nr<64){const t=gtkTown(g.a.at),r=Math.max(9,Math.hypot(e.x-t[0],e.z-t[1]));M4.makeScale(r,1,r);M4.setPosition(t[0],Math.max(.3,g3HeightAt(t[0],t[1]))+1.2,t[1]);rings.setMatrixAt(nr++,M4);}
    if(tier===0&&!(rel!=='oth'||sel))continue;   /* far: everyone is a dot; only yours, enemies, allies and the selected one carry a number */
    const wide=tier===2||!!g.fb,n=gtkNudge(q,rel,tier===0,wide,placed,g.a.o);
    if(!n.free){const h=n.same;if(tier<2&&h&&!g.fb){for(const x of g.L)h.L.push(x);h.merged=1;continue;}if(!sel&&(rel==='oth'||(tier===0&&rel!=='me')))continue;}
    if(tier>0){q[0]=n.x;q[1]=n.y;if(under(q))continue;}const bx=gtkBox(q,rel,tier===0,wide);bx.g=g;placed.push(bx);shown.push(g);todo.push([g,q,rel,sel]);}
  for(const [g,q,rel,sel] of todo){const hv=T.hov===g.k||T.fan===g.k;let dx=0;if(g.fb&&tier>0)dx=g.side==='A'?-19:19;
    if(tier>0&&hv&&g.L.length>1&&!g.fb){const n=g.L.length,sp=tier===2?96:66;g.L.forEach((a,i)=>draw(g.k+'#'+a.id,g,[a],q,(i-(n-1)/2)*sp,true));}   // stack fanned out: one token per army
    else draw(g.k,g,g.L,q,dx,false);
    // arrival: where and when the column gets there (yours, your allies' and the selected one)
    if(g.st==='march'&&(rel==='me'||sel)&&tier>0){const a=g.a,t=gtkTown(a.path[a.path.length-1]),q2=proj(t[0],Math.max(.3,g3HeightAt(t[0],t[1])),t[1]);if(q2){let el=T.eta.get(g.k);if(!el){el=document.createElement('div');el.className='eta';G3.lab.appendChild(el);T.eta.set(g.k,el);}
        const d=gtkEta(a),tx=d+(d===1?' day':' days');if(el._x!==tx){el._x=tx;el.textContent=tx;}const tr='translate('+Math.round(q2[0])+'px,'+Math.round(q2[1])+'px)';if(el._t!==tr){el._t=tr;el.style.transform=tr;}vis(el,true);used.add('eta'+g.k);}}}
  rings.count=nr;rings.instanceMatrix.needsUpdate=true;rings.visible=nr>0;T.n=ntok;T.shown=shown.length;
  for(const [k,pl] of G3.pl)if(!used.has(k))vis(pl,false);for(const [k,el] of T.eta)if(!used.has('eta'+k))vis(el,false);
  if(G3.pl.size>400)for(const [k,pl] of G3.pl)if(!used.has(k)){pl.remove();G3.pl.delete(k);}
  if(T.eta.size>120)for(const [k,el] of T.eta)if(!used.has('eta'+k)){el.remove();T.eta.delete(k);}}
// hover/click fan-out: g3HitAt (13e) tells us which stack is under the mouse
function gtkHover(hit){const T=G3.tok;if(!T)return;const k=hit?hit.k:null;if(T.hov!==k){T.hov=k;G3.lblDirty=true;}}
function gtkClicked(hit){const T=G3.tok;if(!T)return;T.fan=hit?hit.k:null;G3.lblDirty=true;}
// for tests and guards: what is drawn for armies right now
function gtkAudit(){const T=G3.tok||{},out={tier:G3.tier,tokens:0,far:0,stacks:0,odds:0,dots:T.dots|0,dotsOn:!!(T.pts&&T.pts.visible),rings:T.rings?T.rings.count:0,figs:0,flags:0,old:0,dup:0,perProv:0,hud:0,sel:GV.selA?1:0,shield:0,hull:0,wing:0,round:0};const seen=new Set(),pv=new Map(),hud=T.hud||[];
  for(const [k,el] of G3.pl){if(el._v!=='block')continue;out.tokens++;if(/ far/.test(el.className))out.far++;if(el.querySelector('.ct'))out.stacks++;if(el.querySelector('.od'))out.odds++;{const fe=el.querySelector('.fl'),cp=fe&&!/ far/.test(el.className)?getComputedStyle(fe).clipPath:'';if(fe&&!/ far/.test(el.className)){if(!/polygon/.test(cp))out.round++;else if(/ sea/.test(el.className))out.hull++;else if(/ air/.test(el.className))out.wing++;else out.shield++;}}   /* which outline each token really has on screen (round = a token that lost its shape) */for(const id of el._ids||[]){if(seen.has(id))out.dup++;seen.add(id);}
    if(!k.includes('#')&&!/\|[AD]$/.test(k)){const m=/translate\((-?\d+)px,\s*(-?\d+)px\)/.exec(el._t||''),far=/ far/.test(el.className);if(m){const hx=+m[1],hy=+m[2]-(far?0:20);for(const r of hud)if(hx>r[0]&&hx<r[2]&&hy>r[1]&&hy<r[3]){out.hud++;break;}}   /* tokens drawn on top of the minimap, unit cards or round buttons (must be none) */
      const pi=k.includes('>')?k:k.split('|')[0];pv.set(pi,(pv.get(pi)||0)+1);}}
  for(const n of pv.values())out.perProv=Math.max(out.perProv,n);   /* most tokens standing in one province (marching columns and the two sides of a battle are counted apart) */
  if(typeof g3Batch==='function'&&G3.bat){g3Batch();for(const p of G3.bat.b.values())out.figs+=p.n||0;for(const p of G3.bat.f.values())out.flags+=p.n||0;}
  out.old=document.querySelectorAll('#g3ui .p').length;return out;}
