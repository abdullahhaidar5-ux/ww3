/* ---------- modern war, view side (sim in 03g-modern.js, data in 01c-modern.js) ----------
   Effects for Cyber Attack / EMP, the minimap static, the GPS-jam ring (owner only), the "breaking news" picture-in-picture
   (a 3 s corner camera cut to the event, rendered by the main renderer with a scissor, never takes input) and the
   spectators' scoreboard. All view-only: nothing here touches the simulation. The News toggle in Settings covers the PiP too. */
const MWV={pip:null,pipAt:0,hk:[],mm:0,cam:null,vp:null};
POW_KEY.hack='[';POW_KEY.emp=']';
(()=>{const st=document.createElement('style');st.textContent='#mwPip{position:fixed;left:14px;top:62px;width:240px;height:135px;z-index:40;border:2px solid #e23b33;box-shadow:0 4px 16px #000a;pointer-events:none;display:none}#mwPip .t{position:absolute;left:-2px;top:-20px;background:#e23b33;color:#fff;font:800 12px system-ui,sans-serif;letter-spacing:.08em;padding:2px 8px}#mwPip .x{position:absolute;left:0;right:0;bottom:0;background:rgba(8,10,12,.82);color:#fff;font:600 12px system-ui,sans-serif;padding:3px 7px}#mwFlash{position:fixed;inset:0;z-index:39;pointer-events:none;background:#7fd0ff;opacity:0;transition:opacity .5s}#mwScore{position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:59;background:rgba(10,14,12,.82);border:1px solid #4a5a48;border-radius:8px;padding:5px 10px;color:#e8eadf;font:600 13px system-ui,sans-serif;display:none}#mwScore div{display:flex;gap:10px;align-items:center;white-space:nowrap}#mwScore i{width:10px;height:10px;border-radius:50%;display:inline-block}#mwScore span{min-width:46px;text-align:right}';document.head.appendChild(st);})();
function mwPipEl(show,label){let el=document.getElementById('mwPip');if(!el){el=document.createElement('div');el.id='mwPip';el.innerHTML='<div class="t">BREAKING NEWS</div><div class="x"></div>';document.body.appendChild(el);}
  if(show){el.lastChild.textContent=label||'';}el.style.display=show?'block':'none';}
function mwPipShow(x,y,label,delay){if(typeof SET!=='undefined'&&SET.tk===0)return;if(typeof MODE!=='undefined'&&MODE==='replay')return;
  const g0=G,go=()=>{if(!G||G!==g0||G.over||(window.LOADING))return;const now=performance.now();if((MWV.pip&&MWV.pip.until>now)||now-MWV.pipAt<6000)return;MWV.pipAt=now;MWV.pip={x,y,until:now+3000,G};mwPipEl(true,label);};
  if(delay>0)setTimeout(go,delay*1000);else go();}
// The corner picture is drawn into its own small off-screen picture with the same settings as the main view and then
// copied to the corner. It used to be drawn straight to the screen, which needs a second version of EVERY shader in
// view: the first "MISSILE STRIKE" picture (1.2 s before the first hit) compiled them all in one frame - on a real
// graphics card that was the freeze during a Kheibar strike. The off-screen picture and its copy shader are made while
// the battle loads (mwPipWarm), never during a strike.
function mwPipRT(){if(!POST.pip){POST.pip=new THREE.WebGLRenderTarget(480,270,{type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
    POST.mPip=new THREE.ShaderMaterial({uniforms:{tex:{value:null}},vertexShader:FSV,depthTest:false,depthWrite:false,
      fragmentShader:`uniform sampler2D tex;varying vec2 vUv;void main(){vec3 c=texture2D(tex,vUv).rgb;if(!(c.r==c.r&&c.g==c.g&&c.b==c.b))c=vec3(0.);c=min(c,vec3(60.))*.55;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);gl_FragColor=vec4(pow(c,vec3(1./2.2)),1.);}`});}return POST.pip;}
function mwPipDraw(c,x,y,w,h){const vp=MWV.vp||(MWV.vp=new THREE.Vector4());R3.getViewport(vp);
  if(POST.on&&POST.mFinal){const rt=mwPipRT();if(typeof softP==='function')softP(false);R3.setRenderTarget(rt);R3.clear();R3.render(SCN,c);
    POST.mPip.uniforms.tex.value=rt.texture;POST.quad.material=POST.mPip;R3.setRenderTarget(null);R3.setScissorTest(true);R3.setViewport(x,y,w,h);R3.setScissor(x,y,w,h);R3.render(POST.scn,POST.cam);}
  else{R3.setRenderTarget(null);R3.setScissorTest(true);R3.setViewport(x,y,w,h);R3.setScissor(x,y,w,h);R3.clear();R3.render(SCN,c);}   // no post-processing: the main view is drawn straight to the screen too, so the shaders are the same
  R3.setScissorTest(false);R3.setViewport(vp);}
function mwPipCam(x,y,asp){const c=MWV.cam||(MWV.cam=CAM.clone());c.aspect=asp;c.updateProjectionMatrix();const gy=(typeof groundH==='function'?groundH(x,y):0)||0;c.position.set(x,gy+115,y+165);c.lookAt(x,gy,y);c.updateMatrixWorld();return c;}
// called once by the shader warm-up while the battle loads: one corner picture is drawn (hidden behind the loading screen)
function mwPipWarm(){try{if(!R3||!SCN||!CAM||!G||G.headless)return;
  // only the off-screen picture and its copy shader are made here; the battle's own shaders are the same ones the main view already
  // has (same picture type), so no second draw of the whole battlefield is needed (that one task ran for seconds on slow machines)
  if(POST.on&&POST.mFinal){const vp=MWV.vp||(MWV.vp=new THREE.Vector4());R3.getViewport(vp);const rt=mwPipRT();R3.setRenderTarget(rt);R3.clear();
    POST.mPip.uniforms.tex.value=rt.texture;POST.quad.material=POST.mPip;R3.setRenderTarget(null);R3.setScissorTest(true);R3.setViewport(0,0,16,9);R3.setScissor(0,0,16,9);R3.render(POST.scn,POST.cam);R3.setScissorTest(false);R3.setViewport(vp);}}catch(e){console.warn('corner picture warm-up',e);}}
function mwPipRender(){const P=MWV.pip;if(!P)return;try{if(P.G!==G||performance.now()>P.until||G.over){MWV.pip=null;mwPipEl(false);return;}
  const el=document.getElementById('mwPip'),r=el.getBoundingClientRect(),cr=R3.domElement.getBoundingClientRect();if(!r.width)return;
  mwPipDraw(mwPipCam(P.x,P.y,r.width/r.height),r.left-cr.left+2,cr.height-(r.bottom-cr.top)+2,r.width-4,r.height-4);}catch(e){MWV.pip=null;mwPipEl(false);}}
{const _rp=renderPost;renderPost=function(){_rp();if(MWV.pip)mwPipRender();};}
// effects
FXH.cyb=(x,y,dur,vt,id)=>{PINGS.push({x,y,r:90,t:0,d:1.4,c:0x39ff88});for(let i=0;i<34;i++)part({x:x+rnd(-26,26),y:y+rnd(-26,26),h:groundH(x,y)+rnd(2,50),vh:rnd(20,60),add:true,c:[.2,1,.5],s:rnd(2,4),d:rnd(.7,1.5)});
  MWV.hk.push({x,y,until:performance.now()+dur*1000,vt});if(MWV.hk.length>12)MWV.hk.shift();mwPipShow(x,y,vt===ME?'CYBER ATTACK ON OUR NETWORK':'CYBER ATTACK: ENEMY SYSTEM OFFLINE',0);};
FXH.emp=(x,y,r)=>{PINGS.push({x,y,r,t:0,d:1,c:0x66ccff});setTimeout(()=>{try{PINGS.push({x,y,r:r*.6,t:0,d:.9,c:0xaadfff});}catch(e){}},220);
  for(let i=0;i<90;i++){const a=rnd(0,6.28),d=rnd(0,r);part({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:groundH(x,y)+rnd(2,34),vh:rnd(-10,40),add:true,c:[.5,.8,1],s:rnd(2,5),d:rnd(.3,.9)});}
  const f=document.getElementById('mwFlash')||(()=>{const d=document.createElement('div');d.id='mwFlash';document.body.appendChild(d);return d;})();
  if(typeof cam!=='undefined'&&Math.hypot(cam.x-x,cam.y-y)<r+cam.dist){f.style.transition='none';f.style.opacity='.45';void f.offsetWidth;f.style.transition='opacity .6s';f.style.opacity='0';}
  mwPipShow(x,y,'ELECTROMAGNETIC PULSE',0);};
FXH.mmst=(vt,dur)=>{if(vt===ME)MWV.mm=performance.now()+dur*1000;};
{const _s=FXH.strike;FXH.strike=function(x,y,t,r,sup,arc){_s.apply(this,arguments);if(sup)mwPipShow(x,y,'MISSILE STRIKE',Math.max(0,(+t||2)-1.2));};}
{const _t=FXH.tping;FXH.tping=function(team,x,y,k){_t.apply(this,arguments);if(team===ME&&(k===1||k===2))mwPipShow(x,y,k===2?'TOWN CAPTURED':'TOWN LOST',0);};}
// HUD: hacked buildings glitch, our own GPS-jam bubbles
{const _dh=drawHUD;drawHUD=function(){_dh();try{const c=hx,now=performance.now();c.setTransform(dpr,0,0,dpr,0,0);
  MWV.hk=MWV.hk.filter(h=>h.until>now);
  for(const h of MWV.hk){const p=toScreen(h.x,18,h.y);if(p.z>1||p.x<-50||p.y<-50||p.x>VW+50||p.y>VH+50)continue;const s=Math.max(26,60*PPU/4);
    c.save();c.strokeStyle='#39ff88';c.fillStyle='#39ff88';c.lineWidth=1.6;c.globalAlpha=.55+.4*Math.random();
    for(let i=0;i<3;i++){const j=(Math.random()-.5)*14;c.strokeRect(p.x-s+j,p.y-s*.7+i*6,s*2,s*1.4-i*10);}
    c.font='bold 11px monospace';c.textAlign='center';c.fillText(Math.random()<.2?'0xDEAD':'OFFLINE',p.x,p.y-s-4);c.restore();}
  const T=G&&G.teams[ME];if(T)for(const e of G.ents){if(e.dead||!e.s||!e.s.jam||e.team!==ME)continue;const pts=[];let ok=true;
    for(let i=0;i<=40;i++){const a=i/40*6.2832,q=toScreen(e.x+Math.cos(a)*e.s.jam,2,e.y+Math.sin(a)*e.s.jam);if(q.z>1){ok=false;break;}pts.push(q);}
    if(!ok)continue;c.save();c.strokeStyle='rgba(120,220,255,.55)';c.fillStyle='rgba(120,220,255,.05)';c.lineWidth=1.5;c.setLineDash([8,6]);c.lineDashOffset=-now/60;c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.fill();c.stroke();c.restore();}
  }catch(e){}};}
// minimap static while our radio tower / Strike Center is hacked
{const _dm=drawMini;drawMini=function(){_dm();const now=performance.now();if(MWV.mm>now){try{mx.save();mx.setTransform(1,0,0,1,0,0);const W=mm.width,H=mm.height;for(let i=0;i<220;i++){const g=(Math.random()*200)|0;mx.fillStyle='rgba('+g+','+g+','+g+',.55)';mx.fillRect(Math.random()*W,Math.random()*H,2+Math.random()*10,1+Math.random()*2);}
  mx.fillStyle='rgba(0,0,0,.35)';mx.fillRect(0,0,W,H);mx.fillStyle='#39ff88';mx.font='bold '+Math.max(10,(W/12)|0)+'px monospace';mx.textAlign='center';mx.fillText('NO SIGNAL',W/2,H/2);mx.restore();}catch(e){}}};}
// spectators: a small scoreboard under the spectate bar (units, buildings, kills, money)
setInterval(()=>{try{let b=document.getElementById('mwScore');const on=G&&typeof NET!=='undefined'&&NET.spec&&!G.over&&!window.LOADING;if(!on){if(b)b.style.display='none';return;}
  if(!b){b=document.createElement('div');b.id='mwScore';document.body.appendChild(b);}b.style.display='block';
  b.innerHTML=G.teams.filter(T=>!T.reb&&!T.dummy).map(T=>{let u=0,bl=0;for(const e of G.ents)if(!e.dead&&e.team===T.id){if(e.isB)bl++;else u++;}return `<div><i style="background:${T.color}"></i><b>${T.F.name}${T.out?' (out)':''}</b><span>${u} units</span><span>${bl} bldgs</span><span>${T.kills|0} kills</span><span>$${Math.round(T.credits||0)}</span></div>`;}).join('');}catch(e){}},1000);
