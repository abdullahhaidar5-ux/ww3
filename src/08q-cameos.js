/* Cameos (Abdullah 2026-11-14 23:58 "Do all this now"): the command-bar and portrait pictures drawn like Zero Hour cameos - shaded, outlined,
   lit from the top-left, nation uniform/paint, a team-colour edge. Pure canvas code, no image files, drawn once per (kind, nation) and cached by
   UK.icon / the button canvas (no per-frame work). opts.bg=true paints the dark backdrop + team edge (build/train buttons); the portrait picture
   stays transparent (bg false) because zhHolo (08o-zhbar.js) uses its alpha as the hologram mask: every subject is a solid, strongly outlined shape.
   The class of a unit comes from UK.iconBranch (08j) - one classifier, this file only paints. */
const CAMEO=(function(){
const OL='#0a0e0c';
const hx=h=>{h=String(h||'#777').replace('#','');if(h.length===3)h=h.replace(/./g,'$&$&');return[0,2,4].map(i=>parseInt(h.substr(i,2),16)||0);};
const mix=(a,b,t)=>{const x=hx(a),y=hx(b);return'#'+x.map((v,i)=>('0'+Math.round(v+(y[i]-v)*t).toString(16)).slice(-2)).join('');};
const lt=(a,t)=>mix(a,'#ffffff',t),dk=(a,t)=>mix(a,'#000000',t);
/* vehicle paint per nation (soldier fatigue tint SOLX in 11-models.js is the base; a few nations repaint) */
const PAINT={IR:'#79774f',RS:'#5d6a42',DW:'#b0a07a',RV:'#4f5838',OB:'#555a46',US:'#9a9170',GB:'#6f7650',FR:'#737a58',DE:'#5a6644',IL:'#8d8a6a',UA:'#6a7a4a',RU:'#566a45',CN:'#4e6640',KP:'#5d6040',IN:'#6f7a4c',JP:'#5e6a47',KR:'#5d6e50',PK:'#7b7753',SA:'#b8a47a',AE:'#c0ad86',TR:'#6b6e48',EG:'#b09b72'};
const ME=new Set(['IR','RS','DW','RV','OB','SA','AE','EG']);
function pal(fac,col){let s=null;try{s=typeof solX==='function'?solX(fac):null;}catch(e){}s=s||{u:'#6b7050',h:'#4b5336',s:'west'};const u=s.u,paint=PAINT[fac]||u;return{u,h:s.h,hs:s.s,paint,col:col||'#7a8a6a',me:ME.has(fac),dark:dk(paint,.45),
  wall:ME.has(fac)?'#c2a876':'#9a9d98',roof:ME.has(fac)?'#9d8860':'#5b6670'};}
function draw(c,K,W,H,o){o=o||{};const P=pal(o.fac,o.col),bg=!!o.bld||false;c.save();
  if(o.bg){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#26333a');g.addColorStop(1,'#0b1015');c.fillStyle=g;c.fillRect(0,0,W,H);
    const r=c.createRadialGradient(W*.2,H*.12,2,W*.2,H*.12,W*.9);r.addColorStop(0,'rgba(255,244,214,.34)');r.addColorStop(.5,'rgba(255,244,214,.07)');r.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=r;c.fillRect(0,0,W,H);
    c.fillStyle='rgba(0,0,0,.22)';c.fillRect(0,H*.74,W,H*.26);}
  c.translate(W/2,H/2);const s=Math.min(W/100,H/76);c.scale(s,s);c.lineJoin='round';c.lineCap='round';
  const gr=(y0,y1,b)=>{const g=c.createLinearGradient(-20,y0,16,y1);g.addColorStop(0,lt(b,.32));g.addColorStop(.45,b);g.addColorStop(1,dk(b,.42));return g;};
  const path=pts=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();};
  const fin=(b,y0,y1,lw)=>{c.fillStyle=gr(y0,y1,b);c.fill();c.lineWidth=lw||1.5;c.strokeStyle=OL;c.stroke();};
  const fp=(pts,b)=>{path(pts);let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}fin(b,y0,y1);};
  const rr=(x,y,w,h,r,b)=>{c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);fin(b,y,y+h);};
  const ci=(x,y,r,b)=>{c.beginPath();c.arc(x,y,r,0,7);fin(b,y-r,y+r);};
  const el=(x,y,rx,ry,b,rot)=>{c.beginPath();c.ellipse(x,y,rx,ry,rot||0,0,7);fin(b,y-ry,y+ry);};
  const ln=(x1,y1,x2,y2,w,b)=>{c.lineCap='round';c.strokeStyle=OL;c.lineWidth=w+2.2;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.strokeStyle=b||'#2b3035';c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
    c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=Math.max(.6,w*.25);c.beginPath();c.moveTo(x1,y1-w*.25);c.lineTo(x2,y2-w*.25);c.stroke();};
  const glass=pts=>{path(pts);const g=c.createLinearGradient(0,-10,0,6);g.addColorStop(0,'#7fa6b8');g.addColorStop(1,'#1d2e3a');c.fillStyle=g;c.fill();c.strokeStyle=OL;c.lineWidth=1;c.stroke();};
  const wh=(x,y,r)=>{ci(x,y,r,'#23272a');ci(x,y,r*.5,'#9aa0a3');c.fillStyle='#0008';c.beginPath();c.arc(x,y,r*.16,0,7);c.fill();};
  const trk=(x,y,w,h,n)=>{c.beginPath();c.roundRect?c.roundRect(x,y,w,h,h/2):c.rect(x,y,w,h);c.fillStyle=gr(y,y+h,'#34383a');c.fill();c.lineWidth=1.5;c.strokeStyle=OL;c.stroke();n=n||5;for(let i=0;i<n;i++){const px=x+h*.55+(w-h*1.1)*i/(n-1);c.beginPath();c.arc(px,y+h/2,h*.3,0,7);c.fillStyle='#6d7478';c.fill();c.strokeStyle=OL;c.lineWidth=.8;c.stroke();}};
  const tcs=(x,y,w,h)=>{c.fillStyle=P.col;c.fillRect(x,y,w,h);c.strokeStyle=OL;c.lineWidth=.6;c.strokeRect(x,y,w,h);};   /* team-colour marking */
  const shadow=(x,y,rx)=>{if(!o.bg)return;c.fillStyle='rgba(0,0,0,.38)';c.beginPath();c.ellipse(x,y,rx,4,0,0,7);c.fill();};
  const camo=(x,y,w,h)=>{if(!P.me)return;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle=dk(P.paint,.28);c.globalAlpha=.55;for(let i=0;i<5;i++){c.beginPath();c.ellipse(x+w*(.12+i*.2),y+h*(i%2?.7:.3),w*.11,h*.32,.6,0,7);c.fill();}c.restore();};
  /* ---------- the soldier: 3/4 side view, facing right, headgear by nation (SOLX.s) ---------- */
  const head=(x,y)=>{const hs=P.hs;ci(x,y,6.4,'#c99a78');c.fillStyle='#0006';c.fillRect(x+1.5,y-1,3.5,1.1);   /* face + eye shade */
    if(hs==='shemagh'){c.beginPath();c.moveTo(x-7,y+1);c.quadraticCurveTo(x-8,y-9,x,y-9);c.quadraticCurveTo(x+7,y-9,x+6.5,y-3);c.lineTo(x+2,y-3);c.lineTo(x+1,y+3);c.quadraticCurveTo(x-1,y+9,x-6,y+8);c.closePath();fin(P.h,y-9,y+8,1.3);c.strokeStyle='#8a2a24';c.lineWidth=.9;c.beginPath();c.moveTo(x-6,y-3);c.lineTo(x+5,y-5);c.stroke();ln(x-5,y+7,x-9,y+14,3,P.h);}
    else if(hs==='beret'){c.beginPath();c.ellipse(x-1,y-5.5,8.5,4.2,-.25,0,7);fin(P.h,y-9,y-1,1.3);ci(x+3.5,y-8.2,1.1,'#d9c070');}
    else if(hs==='cap'){c.beginPath();c.arc(x,y-2,7,3.3,6.1);c.closePath();fin(P.h,y-9,y,1.3);rr(x+2,y-3.4,9,2.4,1.1,dk(P.h,.2));}
    else{c.beginPath();c.arc(x,y-1.5,7.4,3.14,6.28);c.closePath();fin(P.h,y-9,y,1.3);rr(x-8,y-2.4,16,2.2,1,dk(P.h,.25));if(hs==='sov'){fp([[-6,-2],[-8,5],[0,3.5],[6,-2]].map(p=>[x+p[0]*.9,y+p[1]]),dk(P.h,.2));}}};
  const man=(ox,oy,sc,g)=>{c.save();c.translate(ox,oy);c.scale(sc,sc);g=g||'rifle';const u=g==='civ'?'#3a3f46':P.u,ve=dk(u,.3),pants=dk(u,.22);
    rr(-9,10,8,17,2,pants);rr(0,10,8,17,2,dk(pants,.12));rr(-10,25,10,5,2,'#241f1a');rr(-1,25,10,5,2,'#241f1a');   /* legs + boots */
    fp([[-12,-6],[-9,-12],[10,-12],[13,-5],[12,12],[-11,12]],u);fp([[-9,-10],[8,-10],[9,6],[-8,6]],ve);   /* torso + plate vest */
    c.fillStyle='#0004';for(const x of[-5,0,5])c.fillRect(x-1.6,-1,3.2,5);   /* mag pouches */
    rr(-3.5,-15,7,5,1.5,'#c99a78');head(1,-21);
    if(g==='sniper'){c.save();c.globalAlpha=.7;c.fillStyle=dk(u,.1);for(let i=0;i<9;i++){c.beginPath();c.ellipse(-13+i*3.4,-8+((i*7)%11),3.6,2,.5*i,0,7);c.fill();}c.restore();}
    /* arms + weapon */
    if(g==='at'){ln(-14,-9,26,-18,8,dk('#4a5058',.1));fp([[25,-22],[34,-20],[33,-11],[24,-13]],'#8a4a36');ln(-6,0,12,-12,4,u);}
    else if(g==='manpad'){ln(-16,-6,24,-20,6,'#7d8a7f');fp([[23,-27],[31,-22],[25,-16]],'#c9c9c0');ln(-4,0,10,-9,4,u);}
    else if(g==='sniper'){ln(-18,6,38,-12,3.2,'#2a2d2a');rr(6,-18,10,3.6,1.5,'#16191a');ln(30,-10,35,5,1.8,'#2a2d2a');ln(-3,0,16,-8,4,u);}
    else if(g==='eng'){ln(-14,18,14,-14,3.6,'#7b3f2c');c.strokeStyle=OL;c.lineWidth=2.6;c.beginPath();c.arc(18,-17,7,2.6,6.4);c.stroke();c.strokeStyle='#b6bcc0';c.lineWidth=1.2;c.beginPath();c.arc(18,-17,7,2.6,6.4);c.stroke();rr(-17,-6,8,14,2,'#6b5a3a');rr(-10,-34,16,5,2,'#e0b22a');ln(-4,2,12,-6,4,u);}
    else if(g==='medic'){rr(-18,-8,9,16,2,'#d8d6cc');c.fillStyle='#c0302a';c.fillRect(-15,-3,3,7);c.fillRect(-17,-1,7,3);ln(-3,2,16,2,4,u);rr(-2,-37,15,3.6,1.5,'#dad8cc');}
    else if(g==='civ'){rr(-4,-33,15,3.6,1.6,'#2c3035');ln(-3,0,11,3,4,u);rr(7,-2,13,10,2,'#5a4631');}
    else if(g==='off'){ln(-4,0,16,-5,4,u);rr(-12,-16,24,3,1.4,'#d4b24a');ln(18,-5,24,-14,3,'#26292b');ln(24,-14,30,-14,3,'#26292b');}
    else{ln(-16,4,32,-15,3.6,'#23272a');rr(-18,2,10,6,2,'#3a2f24');ln(26,-13,40,-18,2.6,'#23272a');rr(8,-9,6,8,1.5,'#1e2124');ln(-3,0,18,-8,4,u);ln(5,-9,20,-12,3.6,dk(u,.1));}
    c.restore();};
  /* ---------- vehicles (side view, facing right, ground at y = 24) ---------- */
  const stripe=(x,y,w)=>tcs(x,y,w,2.6);
  const cab=(x,y)=>{fp([[x,y+6],[x,y-6],[x+7,y-12],[x+16,y-12],[x+20,y-2],[x+20,y+6]],P.paint);glass([[x+8,y-9],[x+15,y-9],[x+17,y-2],[x+8,y-2]]);};
  switch(K){
  case'tank':shadow(0,25,36);trk(-34,12,66,13,6);fp([[-30,13],[-28,3],[18,3],[32,11],[32,15],[-30,15]],P.paint);camo(-30,3,60,12);fp([[-27,7],[-24,2],[16,2],[26,8]],lt(P.paint,.08));
    fp([[-18,3],[-15,-8],[8,-8],[15,-1],[16,3]],lt(P.paint,.05));fp([[-20,-8],[-12,-14],[4,-14],[10,-8]],P.paint);   /* turret */
    ln(12,-5,44,-10,4.6,'#2f3437');rr(40,-14,6,9,1.5,'#3a4044');ci(-4,-14,3.6,'#3b4146');ln(-8,-14,-8,-27,1.2,'#222');stripe(-26,5,10);stripe(-17,-12,7);
    c.fillStyle='#0005';for(let x=-27;x<28;x+=11)c.fillRect(x,8.5,6,1.2);break;
  case'apc':shadow(0,25,36);fp([[-34,19],[-34,0],[-20,-4],[14,-4],[34,8],[34,19]],P.paint);camo(-34,-4,68,22);glass([[-4,-3],[8,-3],[16,4],[-4,4]]);
    fp([[-22,-4],[-20,-12],[-2,-12],[0,-4]],lt(P.paint,.05));ln(-2,-9,22,-10,3.6,'#2f3437');ln(-26,-2,-26,-18,1.2,'#222');stripe(-33,8,11);for(const x of[-22,-8,8,22])wh(x,19,6.2);break;
  case'jeep':shadow(0,25,32);fp([[-32,17],[-32,5],[-8,5],[-4,-6],[14,-6],[20,2],[32,5],[32,17]],P.paint);camo(-32,-6,64,23);glass([[-2,-4],[12,-4],[16,2],[-3,2]]);
    ln(-24,5,-18,-9,3,'#2b2f33');ln(-18,-9,-4,-14,4,'#2b2f33');ln(-4,-14,8,-12,2.6,'#2b2f33');ci(-18,-6,3.4,'#3a4044');stripe(-31,10,9);wh(-18,18,8);wh(20,18,8);break;
  case'atgmv':shadow(0,25,36);fp([[-34,19],[-34,2],[12,2],[34,12],[34,19]],P.paint);camo(-34,2,68,17);glass([[14,5],[24,8],[14,8]]);
    for(const [x,a] of [[-14,0],[-1,0]]){c.save();c.translate(x,2);c.rotate(-.7);rr(-3,-24,7,24,1.5,'#3a4046');rr(-2.5,-27,6,5,1.5,'#b5502f');c.restore();}stripe(-33,10,10);for(const x of[-22,-6,10,26])wh(x,19,6);break;
  case'truck':case'ammo':shadow(0,25,36);fp([[-34,16],[-34,-9],[8,-9],[8,16]],K==='ammo'?dk(P.paint,.1):'#8b8f84');if(K==='ammo'){c.fillStyle='#0004';for(let i=0;i<4;i++)c.fillRect(-30+i*9,-5,6,16);for(let i=0;i<4;i++){ci(-27+i*9,-6,2.4,'#c8a64a');}}
    else{c.save();c.beginPath();c.rect(-33,-8,40,24);c.clip();for(let i=0;i<5;i++){rr(-33+i*9,-4+(i%2)*9,9,9,1,'#a57d45');}c.restore();rr(-35,-12,44,4,1.5,P.paint);}
    cab(8,16);stripe(-34,-2,10);for(const x of[-24,-12,18])wh(x,19,7);break;
  case'dozer':shadow(0,25,34);trk(-26,12,52,13,5);fp([[-22,12],[-22,-4],[12,-4],[12,12]],P.paint);fp([[-4,-4],[-4,-16],[14,-16],[14,-4]],P.paint);glass([[-1,-14],[11,-14],[11,-6],[-1,-6]]);
    fp([[24,-2],[34,-4],[34,22],[22,22]],'#c9a227');c.fillStyle='#0007';for(let i=0;i<4;i++)c.fillRect(24+i*2.4,-2+i*5,2,5);ln(10,10,26,10,4,'#444');stripe(-20,0,9);break;
  case'gun':shadow(0,25,36);trk(-34,12,64,13,6);fp([[-32,13],[-30,4],[14,4],[24,12]],P.paint);fp([[-24,4],[-20,-10],[8,-10],[12,4]],lt(P.paint,.04));camo(-30,-10,42,25);
    ln(4,-4,40,-24,6.6,'#2f3437');rr(36,-29,8,8,1.5,'#3a4044');ln(-24,10,-36,14,3,'#333');stripe(-22,-3,10);break;
  case'bmt':shadow(0,25,36);fp([[-34,17],[-34,8],[8,8],[8,17]],'#3a3f40');cab(10,17);c.save();c.translate(-12,5);c.rotate(-.55);rr(-26,-8,56,16,6,'#cfd3d0');fp([[30,-8],[44,0],[30,8]],'#b83a30');rr(-26,-8,10,16,3,'#8a8f8c');ln(4,-8,4,8,2,'#444');c.restore();stripe(-33,10,9);for(const x of[-24,-10,6,22])wh(x,19,6);break;
  case'mlrs':shadow(0,25,36);fp([[-34,17],[-34,8],[8,8],[8,17]],'#3a3f40');cab(10,17);c.save();c.translate(-12,6);c.rotate(-.42);rr(-24,-14,52,15,2,P.paint);for(let i=0;i<3;i++){ci(24,-10+i*4.6,2.1,'#15181a');ci(24,-10+i*4.6,.9,'#8a5a30');}c.restore();
    stripe(-33,10,9);for(const x of[-24,-10,6,22])wh(x,19,6);break;
  case'spaa':shadow(0,25,36);trk(-32,12,62,13,6);fp([[-30,13],[-28,3],[28,3],[30,13]],P.paint);fp([[-14,3],[-14,-8],[14,-8],[18,3]],lt(P.paint,.04));camo(-30,-8,58,20);ln(-2,-6,32,-26,4,'#2f3437');ln(8,-4,38,-20,4,'#2f3437');
    c.strokeStyle=OL;c.lineWidth=3;c.beginPath();c.arc(-20,-14,8,.2,3,false);c.stroke();c.strokeStyle='#8c9296';c.lineWidth=1.4;c.beginPath();c.arc(-20,-14,8,.2,3,false);c.stroke();ln(-20,-14,-20,-6,2,'#333');stripe(-26,5,9);break;
  case'samv':shadow(0,25,36);fp([[-34,17],[-34,8],[8,8],[8,17]],'#3a3f40');cab(10,17);for(let i=0;i<3;i++){c.save();c.translate(-28+i*9,6);c.rotate(-.6);rr(-3.5,-30,8,32,1.6,P.paint);rr(-3,-33,7,5,2,'#d4d0c4');c.restore();}
    fp([[-30,8],[-30,0],[-6,0],[-4,8]],P.paint);stripe(-28,3,9);for(const x of[-24,-10,6,22])wh(x,19,6);break;
  case'ew':case'radarv':shadow(0,25,36);fp([[-34,17],[-34,8],[8,8],[8,17]],'#3a3f40');cab(10,17);rr(-32,-8,38,17,2,P.paint);
    if(K==='ew'){c.strokeStyle=OL;c.lineWidth=4;c.beginPath();c.arc(-12,-16,13,.1,3.05);c.stroke();c.strokeStyle='#c0c6c8';c.lineWidth=2;c.beginPath();c.arc(-12,-16,13,.1,3.05);c.stroke();ln(-12,-16,-12,-8,2.4,'#444');ln(16,-4,16,-22,1.6,'#333');ln(20,-4,20,-16,1.6,'#333');}
    else{rr(-28,-28,32,20,2,'#a7acaa');rr(-25,-25,26,14,1,'#2a3a44');for(let i=0;i<4;i++)ln(-24+i*7,-25,-24+i*7,-12,.8,'#4d6677');}
    stripe(-33,3,9);for(const x of[-24,-10,6,22])wh(x,19,6);break;
  case'heli':case'lift':{const big=K==='lift';c.save();c.translate(0,2);
    ln(-6,-16,-6,-10,2.4,'#333');c.fillStyle='rgba(30,36,38,.30)';c.beginPath();c.ellipse(-6,-16,big?44:36,2.6,0,0,7);c.fill();c.strokeStyle='#161a1c';c.lineWidth=1.3;c.stroke();   /* rotor disc */
    fp([[-6,-6],[-40,-4],[-44,-2],[-44,-14],[-39,-14],[-34,-6]],P.paint);ci(-41,-8,5,'#262a2c');   /* tail boom + rotor */
    el(2,2,big?24:19,10,P.paint);camo(-20,-8,40,20);c.beginPath();c.moveTo(12,-3);c.quadraticCurveTo(24,-2,26,5);c.lineTo(10,6);c.closePath();const g=c.createLinearGradient(0,-4,0,6);g.addColorStop(0,'#8ab0c2');g.addColorStop(1,'#1d2e3a');c.fillStyle=g;c.fill();c.strokeStyle=OL;c.lineWidth=1.2;c.stroke();
    if(!big){fp([[-6,6],[8,6],[10,10],[-8,10]],'#2c3033');ln(2,9,16,9,3.6,'#2c3033');ci(16,9,2,'#1c1f21');}else{rr(-14,-3,10,8,1,'#1d2e3a');rr(-1,-3,9,8,1,'#1d2e3a');}
    ln(-14,14,12,14,1.8,'#2b3033');ln(-10,10,-10,14,1.8,'#2b3033');ln(8,10,8,14,1.8,'#2b3033');stripe(-24,-2,9);c.restore();break;}
  case'jet':c.save();c.translate(0,2);fp([[34,0],[18,-3],[-8,-4],[-30,-3],[-34,0],[-30,3],[-8,4],[18,3]],P.paint);   /* top view */
    fp([[8,-3],[-14,-26],[-22,-26],[-16,-3]],lt(P.paint,.02));fp([[8,3],[-14,26],[-22,26],[-16,3]],dk(P.paint,.08));fp([[-24,-3],[-34,-12],[-36,-12],[-32,-2]],P.paint);fp([[-24,3],[-34,12],[-36,12],[-32,2]],P.paint);
    c.beginPath();c.ellipse(16,0,7,2.4,0,0,7);const gg=c.createLinearGradient(0,-3,0,3);gg.addColorStop(0,'#9cc2d2');gg.addColorStop(1,'#25394a');c.fillStyle=gg;c.fill();c.strokeStyle=OL;c.lineWidth=1;c.stroke();ci(-31,0,2.6,'#b0552c');tcs(-14,-18,7,2.4);tcs(-14,15.6,7,2.4);c.restore();break;
  case'delta':c.save();c.translate(0,2);fp([[32,0],[-8,-26],[-24,-22],[-14,0],[-24,22],[-8,26]],P.paint);camo(-24,-24,56,48);el(12,0,9,3,lt(P.paint,.1));ci(-20,0,2.6,'#b0552c');tcs(-12,-12,6,2.4);tcs(-12,10,6,2.4);c.restore();break;
  case'male':c.save();c.translate(0,2);fp([[-30,-3],[-22,-4],[8,-4],[30,0],[8,4],[-22,4],[-30,3]],P.paint);fp([[6,-2],[-4,-36],[-12,-36],[-10,-2]],lt(P.paint,.03));fp([[6,2],[-4,36],[-12,36],[-10,2]],dk(P.paint,.06));fp([[-24,-4],[-32,-14],[-34,-14],[-30,-3]],P.paint);fp([[-24,4],[-32,14],[-34,14],[-30,3]],P.paint);ci(22,0,3.4,'#2a3a46');ln(-30,0,-36,0,2.4,'#222');tcs(-18,-1.2,8,2.4);c.restore();break;
  case'quad':c.save();ln(-20,-16,20,16,3.4,P.paint);ln(20,-16,-20,16,3.4,P.paint);for(const [x,y] of[[-22,-18],[22,-18],[-22,18],[22,18]]){c.fillStyle='rgba(30,36,38,.45)';c.beginPath();c.ellipse(x,y,11,5,0,0,7);c.fill();c.strokeStyle=OL;c.lineWidth=1;c.stroke();ci(x,y,2.4,'#222');}rr(-9,-7,18,14,4,P.paint);ci(5,0,3.4,'#2a3a46');tcs(-7,-1.2,7,2.4);c.restore();break;
  case'boat':case'fast':case'minel':case'sweep':case'hover':shadow(0,24,38);c.save();c.translate(0,2);
    fp(K==='fast'?[[-34,4],[26,-2],[36,-6],[36,8],[24,16],[-32,16]]:[[-34,6],[34,6],[24,17],[-30,17]],'#6e7478');fp([[-34,6],[34,6],[32,9],[-33,9]],dk(P.paint,.2));
    rr(-12,-8,22,14,2,P.paint);glass([[-8,-6],[6,-6],[6,0],[-8,0]]);ln(6,-4,26,-12,3.6,'#2f3437');ln(-4,-8,-4,-22,1.2,'#222');stripe(-30,9,9);
    if(K==='minel')for(const x of[-28,-22,-16]){ci(x,2,3.2,'#2e3234');}if(K==='sweep'){ln(-30,8,-44,22,1.6,'#444');ci(-44,22,3,'#555');}c.restore();break;
  case'ship':case'carrier':shadow(0,24,40);c.save();c.translate(0,2);fp(K==='carrier'?[[-42,4],[42,4],[36,17],[-40,17]]:[[-40,5],[38,5],[30,17],[-36,17]],'#737b80');fp([[-40,5],[38,5],[36,8],[-39,8]],dk(P.paint,.15));
    if(K==='carrier'){fp([[-40,-1],[40,-1],[42,4],[-42,4]],'#5d666b');c.fillStyle='#d9d6c8';c.fillRect(-34,.4,70,1);rr(6,-14,12,13,1.5,P.paint);ln(12,-14,12,-26,1.2,'#222');}
    else{rr(-16,-8,30,13,2,P.paint);rr(-8,-16,18,8,2,lt(P.paint,.05));ln(2,-16,2,-28,1.4,'#2a2a2a');ln(-3,-24,8,-24,1.4,'#2a2a2a');el(26,3,6,3,'#4d5459');ln(26,2,40,-5,3.4,'#2f3437');for(const x of[-34,-28,-22])rr(x,-1,4,5,1,'#2b3033');stripe(-36,9,10);}c.restore();break;
  case'sub':shadow(0,24,38);c.save();c.translate(0,2);el(0,9,36,8,'#434b50');rr(-8,-5,16,13,3,'#3a4247');rr(-2,-15,3,10,1,'#2a3035');rr(-2,-15,8,2.6,1,'#2a3035');fp([[-34,9],[-42,0],[-36,3]],'#2f363a');fp([[-34,9],[-42,18],[-36,15]],'#2f363a');tcs(-26,8,10,2.4);c.restore();break;
  case'dearleader':case'ayatollah':break;
  /* ---------- soldiers ---------- */
  case'at':man(-4,0,.95,'at');break;
  case'sniper':man(-8,0,.95,'sniper');break;
  case'manpad':man(-4,0,.95,'manpad');break;
  case'eng':man(-4,0,.95,'eng');break;
  case'medic':man(-4,0,.95,'medic');break;
  case'hacker':man(-12,0,.95,'civ');rr(2,0,28,16,2,'#aab0b4');rr(5,2,22,11,1,'#1d3a4a');rr(-1,16,34,3,1,'#9aa0a4');break;
  case'spy':man(0,0,.95,'civ');break;
  case'officer':man(0,0,.95,'off');break;
  case'commissar':man(-8,0,.95,'off');ln(26,-34,26,20,2.4,'#444');rr(26,-34,18,12,1,P.col);break;
  case'recon':man(-8,2,.9,'rifle');c.save();c.translate(24,-20);ln(-12,-8,12,8,2.4,P.paint);ln(12,-8,-12,8,2.4,P.paint);rr(-5,-3,10,6,2,P.paint);c.restore();break;
  case'mortar':man(-14,2,.78,'rifle');ln(8,16,30,-18,6,'#363b3d');rr(2,16,22,5,2,'#2e3234');ln(18,0,10,18,2.2,'#2e3234');ln(18,0,30,14,2.2,'#2e3234');break;
  case'squad':man(-20,6,.72,'rifle');man(20,6,.72,'rifle');man(0,0,.9,'rifle');break;
  default:man(-2,0,.95,'rifle');}
  /* team-colour edge: a thin bar at the bottom + small corner tag (button pictures) */
  if(o.bg){c.setTransform(1,0,0,1,0,0);c.fillStyle=P.col;c.fillRect(0,H-3,W,3);c.fillRect(0,0,3,H);c.globalAlpha=.55;c.fillStyle=lt(P.col,.3);c.fillRect(0,H-4,W,1);}
  c.restore();}
/* ---------- buildings (front view, flat-roofed Middle-Eastern compounds for the Arab/Shia nations, concrete elsewhere) ---------- */
function drawB(c,K,W,H,o){o=o||{};const P=pal(o.fac,o.col);c.save();
  if(o.bg){const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a3740');g.addColorStop(1,'#0c1116');c.fillStyle=g;c.fillRect(0,0,W,H);const r=c.createRadialGradient(W*.2,H*.12,2,W*.2,H*.12,W*.9);r.addColorStop(0,'rgba(255,244,214,.34)');r.addColorStop(.5,'rgba(255,244,214,.07)');r.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=r;c.fillRect(0,0,W,H);c.fillStyle='rgba(60,52,40,.55)';c.fillRect(0,H*.78,W,H*.22);}
  c.translate(W/2,H/2);const s=Math.min(W/100,H/76);c.scale(s,s);c.lineJoin='round';c.lineCap='round';
  const gr=(y0,y1,b)=>{const g=c.createLinearGradient(-24,y0,12,y1);g.addColorStop(0,lt(b,.30));g.addColorStop(.5,b);g.addColorStop(1,dk(b,.4));return g;};
  const path=pts=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();};
  const fp=(pts,b)=>{path(pts);let y0=1e9,y1=-1e9;for(const p of pts){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}c.fillStyle=gr(y0,y1,b);c.fill();c.strokeStyle=OL;c.lineWidth=1.5;c.stroke();};
  const rc=(x,y,w,h,b)=>fp([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],b);
  const ci=(x,y,r,b)=>{c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=gr(y-r,y+r,b);c.fill();c.strokeStyle=OL;c.lineWidth=1.2;c.stroke();};
  const ln=(x1,y1,x2,y2,w,b)=>{c.strokeStyle=OL;c.lineWidth=w+2;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.strokeStyle=b||'#3a4046';c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};
  const win=(x,y,w,h)=>{c.fillStyle='#14232d';c.fillRect(x,y,w,h);c.fillStyle='rgba(150,200,225,.4)';c.fillRect(x,y,w,h*.4);c.strokeStyle=OL;c.lineWidth=.8;c.strokeRect(x,y,w,h);};
  const arch=(x,y,w,h)=>{c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,0);c.lineTo(x+w,y+h);c.closePath();c.fillStyle='#17110c';c.fill();c.strokeStyle=OL;c.lineWidth=.9;c.stroke();};
  const flag=(x,y)=>{ln(x,y,x,y-18,1.4,'#bbb');c.beginPath();c.moveTo(x+.7,y-18);c.quadraticCurveTo(x+7,y-20,x+13,y-17);c.lineTo(x+13,y-8);c.quadraticCurveTo(x+7,y-11,x+.7,y-9);c.closePath();c.fillStyle=P.col;c.fill();c.strokeStyle=OL;c.lineWidth=.9;c.stroke();};
  const gnd=()=>{if(!o.bg)return;c.fillStyle='rgba(0,0,0,.32)';c.beginPath();c.ellipse(0,25,42,4.5,0,0,7);c.fill();};
  const hz=(x,y,w)=>{c.save();c.beginPath();c.rect(x,y,w,3);c.clip();for(let i=-4;i<w;i+=5){c.fillStyle='#d4a91f';c.beginPath();c.moveTo(x+i,y+3);c.lineTo(x+i+3,y);c.lineTo(x+i+5,y);c.lineTo(x+i+2,y+3);c.fill();}c.restore();};
  const W0=P.wall,R0=P.roof;gnd();
  switch(K){
  case'hq':rc(-34,-4,68,28,W0);rc(-22,-18,44,16,lt(W0,.06));rc(-24,-20,48,4,R0);rc(-36,-6,72,4,R0);for(const x of[-28,-16,8,20])win(x,4,8,10);win(-14,-14,8,7);win(6,-14,8,7);rc(-7,8,14,16,'#2a2420');if(P.me){arch(-5,10,10,14);}flag(22,-20);ln(-10,-20,-10,-30,1.2,'#ccc');c.beginPath();c.arc(-10,-30,4,Math.PI,0);c.strokeStyle='#ddd';c.lineWidth=1.2;c.stroke();break;
  case'barracks':rc(-34,2,68,22,W0);fp([[-38,2],[-30,-10],[30,-10],[38,2]],R0);for(let i=0;i<4;i++){if(P.me)arch(-28+i*15,8,8,16);else win(-28+i*15,8,8,10);}rc(-34,22,68,3,dk(W0,.3));flag(26,-8);for(const x of[-30,-24])rc(x,18,6,6,'#5d6a4a');break;
  case'factory':fp([[-36,24],[-36,-2],[-24,-12],[-12,-2],[-12,-12],[0,-2],[0,-12],[12,-2],[12,24]],W0);rc(12,-6,24,30,lt(W0,.04));rc(-36,-4,72,2,dk(R0,.1));rc(-30,6,22,18,'#1a1815');rc(-4,6,12,18,'#1a1815');for(let i=0;i<5;i++)c.fillRect(-30+i*4.4,7,.8,16);rc(26,-26,6,22,'#6e7378');c.fillStyle='#8a8f92';c.fillRect(25,-28,8,3);hz(-30,22,22);hz(-4,22,12);win(16,2,8,7);win(26,2,6,7);break;
  case'airfield':rc(-40,14,80,10,'#2f3436');c.strokeStyle='#e6e1c8';c.lineWidth=1.4;c.setLineDash([5,4]);c.beginPath();c.moveTo(-38,19);c.lineTo(38,19);c.stroke();c.setLineDash([]);rc(-34,-4,34,18,W0);fp([[-38,-4],[-30,-10],[-4,-10],[4,-4]],R0);rc(-30,2,22,12,'#1a1815');rc(12,-18,8,32,lt(W0,.08));rc(8,-26,16,9,P.paint);win(10,-24,12,5);ln(21,-26,21,-34,1.2,'#ccc');ci(21,-35,1.8,'#d44');
    c.save();c.translate(28,10);fp([[10,0],[-2,-1],[-8,0],[-2,1]],'#9aa0a0');fp([[2,0],[-4,-7],[-6,-7],[-3,0]],'#8a9090');c.restore();break;
  case'shipyard':rc(-38,10,76,14,'#2c4552');c.strokeStyle='rgba(180,220,240,.4)';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-34+i*16,16);c.quadraticCurveTo(-30+i*16,13,-26+i*16,16);c.stroke();}rc(-34,6,44,6,'#7a7f82');ln(-26,6,-26,-22,3.4,'#c9a227');ln(-26,-22,18,-22,3.4,'#c9a227');ln(10,-22,10,-8,1.2,'#444');rc(8,-8,6,4,'#555');fp([[-8,6],[24,6],[18,-2],[-4,-2]],P.paint);rc(-4,-8,10,6,lt(P.paint,.1));rc(18,-14,18,20,W0);win(21,-10,5,6);win(29,-10,5,6);break;
  case'gen':rc(-34,2,32,22,W0);rc(-36,0,36,4,R0);for(const x of[-30,-22,-14])win(x,8,5,8);rc(-2,-12,16,36,lt(W0,.03));for(let i=0;i<3;i++)ln(2+i*5,-12,2+i*5,-22,2.6,'#555');rc(16,-2,20,26,'#72787c');for(let i=0;i<4;i++){c.fillStyle='#0004';c.fillRect(18,2+i*5,16,1.2);}c.fillStyle='#e6c34a';c.beginPath();c.moveTo(-8,-6);c.lineTo(-12,2);c.lineTo(-9,2);c.lineTo(-11,8);c.lineTo(-5,-1);c.lineTo(-8,-1);c.closePath();c.fill();c.strokeStyle=OL;c.lineWidth=.8;c.stroke();break;
  case'depot':for(const [x,y,w,h,b] of[[-36,4,26,20,'#8a8f84'],[-8,2,26,22,'#7b8272'],[20,6,18,18,'#6f7568']]){rc(x,y,w,h,b);fp([[x-2,y],[x+w+2,y],[x+w,y-5],[x,y-5]],R0);c.fillStyle='#0004';for(let i=0;i<w;i+=4)c.fillRect(x+i,y+2,1,h-2);}rc(-30,12,14,12,'#2a2d2a');c.fillStyle=P.col;c.fillRect(-6,10,12,3);c.strokeStyle=OL;c.lineWidth=.6;c.strokeRect(-6,10,12,3);
    for(let i=0;i<3;i++)rc(-4+i*8,-14+(i%2)*2,8,8,'#a57d45');break;
  case'oil':fp([[-16,24],[0,-26],[16,24]],'#6b7074');c.strokeStyle='#14181a';c.lineWidth=1.2;for(let y=-14;y<20;y+=9){c.beginPath();c.moveTo(-8-y*.16,y);c.lineTo(8+y*.16,y);c.stroke();}rc(-22,22,44,4,'#444');ci(0,-26,3,'#999');ln(-30,6,-14,6,4,'#34393b');ci(-30,6,4,'#5b6165');break;
  case'bank':rc(-30,-4,60,26,W0);fp([[-34,-4],[0,-22],[34,-4]],R0);for(const x of[-24,-10,4,18])rc(x,0,7,22,lt(W0,.1));rc(-34,22,68,4,dk(W0,.3));ci(0,-10,5,'#d9b13a');break;
  case'uplink':rc(-30,14,60,10,W0);rc(-8,-10,16,26,lt(W0,.04));c.beginPath();c.moveTo(-26,-2);c.quadraticCurveTo(0,-40,26,-2);c.closePath();c.fillStyle=gr(-24,-2,'#c8cdd0');c.fill();c.strokeStyle=OL;c.lineWidth=1.4;c.stroke();ln(0,-18,0,-30,1.6,'#444');ci(0,-30,2,'#e44');win(-4,-4,8,4);break;
  case'sam':rc(-30,14,60,10,W0);rc(-10,6,20,10,R0);for(const o2 of[-14,2]){c.save();c.translate(o2,8);c.rotate(-.7);rc(-3.5,-30,8,32,P.paint);rc(-3,-33,7,5,'#d4d0c4');c.restore();}break;
  case'coast':rc(-34,12,60,12,W0);rc(-18,4,30,10,R0);c.save();c.translate(-2,6);c.rotate(-.3);rc(-18,-12,44,12,P.paint);for(let i=0;i<3;i++)ci(20-i*10,-6,2.6,'#1a1d1f');c.restore();c.strokeStyle='rgba(150,200,230,.6)';c.lineWidth=1.6;c.beginPath();c.moveTo(-40,26);c.quadraticCurveTo(-30,21,-20,26);c.quadraticCurveTo(-10,31,0,26);c.stroke();break;
  case'turret':rc(-26,10,52,14,W0);c.beginPath();c.arc(0,10,14,Math.PI,0);c.closePath();c.fillStyle=gr(-4,10,P.paint);c.fill();c.strokeStyle=OL;c.lineWidth=1.5;c.stroke();ln(6,2,34,-12,6,'#30363a');rc(30,-18,7,9,'#3a4044');for(let i=0;i<6;i++)ci(-24+i*10,25,3,dk(W0,.1));break;
  case'tunnel':c.beginPath();c.moveTo(-34,24);c.lineTo(-34,4);c.quadraticCurveTo(-30,-18,0,-18);c.quadraticCurveTo(30,-18,34,4);c.lineTo(34,24);c.closePath();c.fillStyle=gr(-18,24,'#8a7a5a');c.fill();c.strokeStyle=OL;c.lineWidth=1.6;c.stroke();arch(-14,0,28,24);for(let i=0;i<6;i++)ci(-30+i*12,22,3.6,'#6b6048');c.fillStyle='#0008';c.fillRect(-12,18,24,6);break;
  case'fort':fp([[-38,24],[-30,-4],[30,-4],[38,24]],'#7b705a');fp([[-30,-4],[-24,-16],[24,-16],[30,-4]],'#8d8068');for(const x of[-22,-8,6,20])rc(x,-20,7,5,'#6e6450');c.fillStyle='#000a';for(const x of[-20,-8,4,16])c.fillRect(x,2,9,3);arch(-8,10,16,14);flag(26,-16);break;
  case'radio':fp([[-12,24],[0,-26],[12,24]],'#8c9296');c.strokeStyle='#14181a';c.lineWidth=1;for(let y=-14;y<22;y+=9){c.beginPath();c.moveTo(-5-y*.2,y);c.lineTo(5+y*.2,y);c.stroke();}ci(0,-26,3,'#e44');c.strokeStyle='#d8dde0';c.lineWidth=1.6;for(const r of[8,14,20]){c.beginPath();c.arc(0,-26,r,-.9,.9);c.stroke();}rc(-26,16,22,10,W0);rc(-26,14,22,3,R0);rc(14,18,22,8,W0);break;
  default:rc(-26,0,52,24,W0);fp([[-30,0],[0,-16],[30,0]],R0);win(-18,8,8,9);win(10,8,8,9);rc(-5,10,10,14,'#2a2420');}
  /* team-colour edge */
  if(o.bg){c.setTransform(1,0,0,1,0,0);c.fillStyle=P.col;c.fillRect(0,H-3,W,3);c.fillRect(0,0,3,H);}
  c.restore();}
return{unit:draw,bld:drawB,pal};})();
