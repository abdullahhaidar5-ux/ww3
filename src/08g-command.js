/* ---------- 08g-command: the "Command" panel (Abdullah 2026-11-05 18:49 "command-teams") ----------
   BATTLE PLANS  O (or the Plan button): click map points to add numbered steps (Move / Assault / Hold), each with its own trigger
                 (Auto when the last step is reached, After 10 s / 30 s, or On Go). Enter finishes, Esc cancels. Plans run in this
                 browser and only ever send ordinary orders (go / amove / def) through doAct, so multiplayer and AI are untouched.
   BATTLE GROUPS the existing control groups 1-9 get a name, a formation (Line / Column / Wedge), strength + ammo and one-click orders.
   PINGS & DRAWING  , attack here   . defend here   / danger   ' draw a line   ; draw a circle   (then click / drag the map or minimap).
                 Allies see them for 10 s; quick lines go to the log of your team.
   TRUCE (free-for-all only) and ALLIED AID (money with a fee, give selected units) sit in the same panel. */
const CT={mode:null,plans:[],pid:0,pl:{type:'m',trig:'auto',sec:10},marks:[],draw:null,form:{},names:{},sendG:0,open:true,sig:''};
const CT_COL={m:'#74d08f',a:'#ea5a40',h:'#6fb2ff'},CT_TN={m:'Move',a:'Assault',h:'Hold'};
const CT_PING=[{n:'Attack here',c:'#ea5a40'},{n:'Defend here',c:'#6fb2ff'},{n:'Danger',c:'#f2c94c'}];
const CT_GN=['Armour','Infantry','Assault','Recon','Support','Artillery','Air','Reserve'];
const CT_FORMS=['line','column','wedge'];
function ctMine(ids){return (ids||[]).map(i=>G.byId.get(i)).filter(u=>u&&!u.dead&&!u.isB&&u.team===ME);}
function ctCentroid(us){let x=0,y=0;for(const u of us){x+=u.x;y+=u.y;}return us.length?{x:x/us.length,y:y/us.length}:null;}
function ctClamp(x,y){return{x:Math.max(20,Math.min(MAPW-20,x)),y:Math.max(20,Math.min(MAPH-20,y))};}
function ctFmt(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
/* ---- formations: a Line is the game's own 'line' order; a Column and a Wedge send up to 5 blocks of units to offsets ---- */
function ctFormSend(us,tx,ty,form,mode){if(!us.length)return;const c=ctCentroid(us);let hx=tx-c.x,hy=ty-c.y,L=Math.hypot(hx,hy);if(L<1){hx=0;hy=-1;L=1;}hx/=L;hy/=L;const px=-hy,py=hx,ids=us.map(u=>u.id),n=ids.length;mode=mode||'move';
  if(form==='line'||n<3){const half=Math.max(30,Math.min(420,24*(n-1)/2)),a=ctClamp(tx+px*half,ty+py*half),b=ctClamp(tx-px*half,ty-py*half);doAct({t:'line',ids,x:a.x,y:a.y,x2:b.x,y2:b.y,mode});return;}
  const k=Math.min(5,Math.ceil(n/3)),per=Math.ceil(n/k),sorted=us.slice().sort((p,q)=>(p.x-c.x)*px+(p.y-c.y)*py-((q.x-c.x)*px+(q.y-c.y)*py));
  for(let j=0;j<k;j++){const blk=sorted.slice(j*per,(j+1)*per).map(u=>u.id);if(!blk.length)continue;let ox,oy;
    if(form==='column'){ox=-hx*38*j;oy=-hy*38*j;}else{const r=Math.ceil(j/2),sg=j%2?1:-1;ox=-hx*34*r+px*46*r*sg;oy=-hy*34*r+py*46*r*sg;}
    const p=ctClamp(tx+ox,ty+oy);doAct({t:'go',ids:blk,x:p.x,y:p.y,mode,fm:1});}}
/* ---- battle plans ---- */
function ctStepOrder(pl,s){const ids=ctMine(pl.ids).map(u=>u.id);if(!ids.length)return;
  if(s.t==='h')doAct({t:'def',ids,x:s.x,y:s.y});else doAct({t:'go',ids,x:s.x,y:s.y,mode:s.t==='a'?'amove':'move',fm:ids.length>1?1:0});}
function ctStepFire(pl){const s=pl.steps[pl.i+1];if(!s)return;ctStepOrder(pl,s);pl.i++;pl.st='move';pl.go=false;pl.tIss=G.t;pushLog(`Plan ${pl.n}: step ${pl.i+1} of ${pl.steps.length} (${CT_TN[s.t]}).`,'g');}
function ctTrigOk(pl,s,since){return s.trig==='auto'||(s.trig==='timer'&&G.t-since>=s.sec)||(s.trig==='go'&&pl.go);}
function ctPlanTick(){if(!G||G.over||G.paused||MODE==='spectate'||NET.spec)return;
  for(let k=CT.plans.length-1;k>=0;k--){const pl=CT.plans[k],us=ctMine(pl.ids);if(!us.length){CT.plans.splice(k,1);continue;}
    if(pl.st==='done'){if(G.t-pl.tDone>8)CT.plans.splice(k,1);continue;}
    if(pl.st==='move'){const s=pl.steps[pl.i],near=us.filter(u=>Math.hypot(u.x-s.x,u.y-s.y)<120).length;
      if(near>=Math.ceil(us.length*.7)||G.t-pl.tIss>100){pl.st='wait';pl.arr=G.t;if(s.t==='h'||pl.i===pl.steps.length-1){pl.st='done';pl.tDone=G.t;pushLog(`Plan ${pl.n} complete.`,'g');}}continue;}
    const s=pl.steps[pl.i+1];if(!s){pl.st='done';pl.tDone=G.t;continue;}
    if(ctTrigOk(pl,s,pl.i<0?pl.t0:pl.arr))ctStepFire(pl);}}
function ctPlanStart(){const ids=selfSel().map(u=>u.id);if(!ids.length){pushLog('Select some units first, then draw their plan.','w');return;}CT.mode='plan';CT.draft={ids,steps:[]};ctUI();}
function ctPlanFinish(){const d=CT.draft;CT.mode=null;CT.draft=null;if(!d||!d.steps.length){ctUI();return;}
  for(const p of CT.plans)p.ids=p.ids.filter(i=>!d.ids.includes(i));CT.plans=CT.plans.filter(p=>p.ids.length);
  const pl={n:++CT.pid,ids:d.ids,steps:d.steps,i:-1,st:'wait',t0:G.t,arr:G.t,go:false};CT.plans.push(pl);pushLog(`Plan ${pl.n} set: ${pl.steps.length} step${pl.steps.length>1?'s':''}.`,'g');sfxUI(520);ctPlanTick();ctUI();}
function ctPlanCancel(){if(CT.mode==='plan'){CT.mode=null;CT.draft=null;ctUI();return;}}
function ctGoAll(){let n=0;for(const pl of CT.plans)if(pl.st==='wait'&&pl.steps[pl.i+1]&&pl.steps[pl.i+1].trig==='go'){pl.go=true;n++;}if(n)sfxUI(660);ctPlanTick();ctUI();}
/* ---- pings, drawings, quick lines (received) ---- */
function ctMark(m){m.t0=performance.now()/1000;m.life=10;CT.marks.push(m);if(CT.marks.length>40)CT.marks.shift();}
FXH.mping=function(team,k,x,y){if(!G||!sameTm(team,ME))return;ctMark({k,x,y,team,kind:'ping'});sfxUI(k===2?440:700);};
FXH.mdraw=function(team,c,p){if(!G||!sameTm(team,ME))return;const pts=[];for(let i=0;i+1<p.length;i+=2)pts.push([p[i],p[i+1]]);ctMark({kind:c?'circle':'line',pts,team});};
FXH.say=function(team,i){if(!G||!sameTm(team,ME)||!CF.LINES[i])return;pushLog(`${team===ME?'You':ctName(team)}: ${CF.LINES[i]}`,team===ME?'':'g');if(team!==ME)sfxUI(600);};
FXH.cfo=function(f,t,d){};FXH.cfs=function(a,b,d){if(G&&(a===ME||b===ME))sfxUI(520);};FXH.cfb=function(a,b){if(G&&b===ME)sfxUI(300);};
function ctTeamCol(t){return (G.teams[t]&&G.teams[t].color)||'#fff';}
function ctDrawHud(c){if(!G||G.over)return;const now=performance.now()/1000;CT.marks=CT.marks.filter(m=>now-m.t0<m.life);
  c.save();c.lineCap='round';c.lineJoin='round';
  for(const m of CT.marks){const age=now-m.t0,a=Math.max(0,Math.min(1,(m.life-age)/2));c.globalAlpha=a;
    if(m.kind==='ping'){const p=toScreen(m.x,groundH(m.x,m.y)+4,m.y);if(p.z>1)continue;const pc=CT_PING[m.k],r=14+6*Math.sin(age*6);c.strokeStyle=pc.c;c.fillStyle=pc.c;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,r,0,7);c.stroke();c.beginPath();c.arc(p.x,p.y,3,0,7);c.fill();
      c.font='700 12px Saira Condensed, system-ui, sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.7)';const tx=pc.n+(m.team!==ME?' - '+ctName(m.team):'');c.strokeText(tx,p.x,p.y-r-6);c.fillText(tx,p.x,p.y-r-6);}
    else{const col=ctTeamCol(m.team);c.strokeStyle=col;c.lineWidth=3.5;c.setLineDash([]);
      if(m.kind==='circle'){const a0=m.pts[0],b0=m.pts[1]||a0,cc=toScreen(a0[0],groundH(a0[0],a0[1]),a0[1]);const R=Math.hypot(b0[0]-a0[0],b0[1]-a0[1]),e=toScreen(a0[0]+R,groundH(a0[0]+R,a0[1]),a0[1]);c.beginPath();c.arc(cc.x,cc.y,Math.max(8,Math.abs(e.x-cc.x)),0,7);c.stroke();}
      else{c.beginPath();let st=false;for(const q of m.pts){const p=toScreen(q[0],groundH(q[0],q[1]),q[1]);if(!st){c.moveTo(p.x,p.y);st=true;}else c.lineTo(p.x,p.y);}c.stroke();
        const n=m.pts.length;if(n>1){const A=m.pts[n-2],B=m.pts[n-1],pa=toScreen(A[0],groundH(A[0],A[1]),A[1]),pb=toScreen(B[0],groundH(B[0],B[1]),B[1]),an=Math.atan2(pb.y-pa.y,pb.x-pa.x);c.fillStyle=col;c.beginPath();c.moveTo(pb.x,pb.y);c.lineTo(pb.x-16*Math.cos(an-.45),pb.y-16*Math.sin(an-.45));c.lineTo(pb.x-16*Math.cos(an+.45),pb.y-16*Math.sin(an+.45));c.closePath();c.fill();}}}}
  c.globalAlpha=1;
  /* the stroke being drawn right now */
  const D=CT.draw;if(D&&D.pts.length){c.strokeStyle=ctTeamCol(ME);c.lineWidth=3;c.setLineDash([6,4]);if(D.circle){const a0=D.pts[0],b0=D.pts[D.pts.length-1],cc=toScreen(a0[0],groundH(a0[0],a0[1]),a0[1]),R=Math.hypot(b0[0]-a0[0],b0[1]-a0[1]),e=toScreen(a0[0]+R,groundH(a0[0]+R,a0[1]),a0[1]);c.beginPath();c.arc(cc.x,cc.y,Math.max(4,Math.abs(e.x-cc.x)),0,7);c.stroke();}
    else{c.beginPath();D.pts.forEach((q,i)=>{const p=toScreen(q[0],groundH(q[0],q[1]),q[1]);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.stroke();}c.setLineDash([]);}
  /* plans: numbered arrows from the group to each step */
  const drafts=CT.plans.map(p=>({ids:p.ids,steps:p.steps,i:p.i,n:p.n,st:p.st,go:p.go}));if(CT.draft)drafts.push({ids:CT.draft.ids,steps:CT.draft.steps,i:-1,n:'+',st:'draft'});
  for(const pl of drafts){const us=ctMine(pl.ids),cen=ctCentroid(us);if(!cen)continue;let prev=toScreen(cen.x,groundH(cen.x,cen.y),cen.y);
    pl.steps.forEach((s,k)=>{const p=toScreen(s.x,groundH(s.x,s.y),s.y),done=k<=pl.i&&pl.st!=='move'||k<pl.i,col=done?'#8a948d':CT_COL[s.t];
      c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.5;c.setLineDash([9,6]);c.beginPath();c.moveTo(prev.x,prev.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);
      const an=Math.atan2(p.y-prev.y,p.x-prev.x),mx2=(prev.x+p.x)/2,my2=(prev.y+p.y)/2;c.beginPath();c.moveTo(mx2+10*Math.cos(an),my2+10*Math.sin(an));c.lineTo(mx2-8*Math.cos(an-.6),my2-8*Math.sin(an-.6));c.lineTo(mx2-8*Math.cos(an+.6),my2-8*Math.sin(an+.6));c.closePath();c.fill();
      c.beginPath();c.arc(p.x,p.y,13,0,7);c.fillStyle='rgba(10,14,12,.85)';c.fill();c.lineWidth=2.5;c.stroke();c.fillStyle='#fff';c.font='700 14px system-ui, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(k+1),p.x,p.y+1);
      c.font='700 11px Saira Condensed, system-ui, sans-serif';c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.7)';const lab=CT_TN[s.t]+' '+(s.trig==='auto'?'':s.trig==='timer'?'· wait '+s.sec+'s':'· on GO');c.strokeText(lab,p.x,p.y+26);c.fillStyle=col;c.fillText(lab,p.x,p.y+26);c.textBaseline='alphabetic';prev=p;});}
  c.restore();}
function ctDrawMini(){if(!G||G.over||!CT.marks.length)return;const c=mx,W=mm.width,H=mm.height,sx=W/MAPW,sy=H/MAPH,now=performance.now()/1000;c.save();c.lineWidth=2;
  for(const m of CT.marks){const age=now-m.t0;c.globalAlpha=Math.max(0,Math.min(1,(m.life-age)/2));
    if(m.kind==='ping'){const r=5+4*Math.abs(Math.sin(age*5));c.strokeStyle=CT_PING[m.k].c;c.beginPath();c.arc(m.x*sx,m.y*sy,r,0,7);c.stroke();c.fillStyle=CT_PING[m.k].c;c.fillRect(m.x*sx-1.5,m.y*sy-1.5,3,3);}
    else if(m.kind==='circle'){const a=m.pts[0],b=m.pts[1]||a;c.strokeStyle=ctTeamCol(m.team);c.beginPath();c.arc(a[0]*sx,a[1]*sy,Math.max(3,Math.hypot(b[0]-a[0],b[1]-a[1])*sx),0,7);c.stroke();}
    else{c.strokeStyle=ctTeamCol(m.team);c.beginPath();m.pts.forEach((q,i)=>i?c.lineTo(q[0]*sx,q[1]*sy):c.moveTo(q[0]*sx,q[1]*sy));c.stroke();}}
  c.restore();}
{const _dh=drawHUD;drawHUD=function(){_dh.apply(this,arguments);try{ctDrawHud(hx);}catch(e){}};const _dm=drawMini;drawMini=function(){_dm.apply(this,arguments);try{ctDrawMini();}catch(e){}};}
/* ---- map clicks while a tool is armed (capture phase: the normal select / order handlers never see them) ---- */
function ctWorldAt(e){if(e.target===mm){const r=mm.getBoundingClientRect();return{x:Math.max(0,Math.min(MAPW,(e.clientX-r.left)/r.width*MAPW)),y:Math.max(0,Math.min(MAPH,(e.clientY-r.top)/r.height*MAPH))};}
  return e.target===cv?screenToWorld(mouse.x,mouse.y):null;}
function ctToolDown(e){if(!CT.mode||CT.mode==='gsend'||!G||G.over||(e.target!==cv&&e.target!==mm))return;if(e.button!==0){if(e.button===2){e.preventDefault();e.stopImmediatePropagation();ctToolOff();}return;}
  const w=ctWorldAt(e);if(!w)return;e.preventDefault();e.stopImmediatePropagation();const m=CT.mode;
  if(m==='plan'){CT.draft.steps.push({t:CT.pl.type,x:w.x|0,y:w.y|0,trig:CT.pl.trig,sec:CT.pl.sec});if(CT.draft.steps.length>=8)ctPlanFinish();ctUI();return;}
  if(m.startsWith('ping')){doAct({t:'mp',k:+m.slice(4),x:w.x,y:w.y});CT.mode=null;ctUI();return;}
  if(m==='draw'||m==='circle'){CT.draw={circle:m==='circle',pts:[[w.x,w.y]],id:e.pointerId,mini:e.target===mm};}}
function ctToolMove(e){const D=CT.draw;if(!D||(e.pointerId!==D.id))return;const w=ctWorldAt({target:D.mini?mm:cv,clientX:e.clientX,clientY:e.clientY});if(!w)return;const l=D.pts[D.pts.length-1];
  if(D.circle){D.pts[1]=[w.x,w.y];D.pts.length=2;return;}if(Math.hypot(w.x-l[0],w.y-l[1])>(D.mini?500:70))D.pts.push([w.x,w.y]);}
function ctToolUp(e){const D=CT.draw;if(!D||e.pointerId!==D.id)return;e.preventDefault();e.stopImmediatePropagation();CT.draw=null;CT.mode=null;ctUI();let pts=D.pts;
  if(pts.length<2)return;if(D.circle)pts=[pts[0],pts[pts.length-1]];else while(pts.length>CF.DRAW_PTS){pts=pts.filter((_,i)=>i%2===0||i===pts.length-1);}
  doAct({t:'md',c:D.circle?1:0,p:pts.flatMap(q=>[q[0]|0,q[1]|0])});}
function ctToolOff(){CT.mode=null;CT.draft=null;CT.draw=null;ctUI();}
window.addEventListener('pointerdown',ctToolDown,true);window.addEventListener('pointermove',ctToolMove,true);window.addEventListener('pointerup',ctToolUp,true);
window.addEventListener('contextmenu',e=>{if(CT.mode&&(e.target===cv||e.target===mm)){e.preventDefault();e.stopImmediatePropagation();}},true);
/* ---- keys (the one key table: O plan, Enter go / finish, , . / ping, ' draw, ; circle; Esc leaves a tool) ---- */
window.addEventListener('keydown',e=>{if(!G||G.over||(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA'))||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key;
  if(k==='Escape'&&CT.mode){e.stopImmediatePropagation();e.preventDefault();ctToolOff();return;}
  if(k==='Enter'){if(CT.mode==='plan'){e.preventDefault();ctPlanFinish();}else if(CT.plans.some(p=>p.st==='wait'&&p.steps[p.i+1]&&p.steps[p.i+1].trig==='go')){e.preventDefault();ctGoAll();}return;}
  if(k==='o'||k==='O'){e.preventDefault();CT.mode==='plan'?ctPlanFinish():ctPlanStart();return;}
  const pm={',':'ping0','.':'ping1','/':'ping2',"'":'draw',';':'circle'}[k];if(pm&&ctTeamPlay()){e.preventDefault();CT.mode=CT.mode===pm?null:pm;CT.draft=null;ctUI();}},true);
function ctTeamPlay(){return !!G&&!G.sandbox&&G.teams.some(O=>O.id!==ME&&!O.reb&&!O.out&&sameTm(O.id,ME));}
/* ---- the panel ---- */
let CTP=null;
function ctEl(){if(CTP)return CTP;const st=document.createElement('style');st.textContent=`
#cmdP{position:fixed;left:8px;bottom:236px;z-index:12;width:268px;max-height:46vh;overflow:auto;background:rgba(10,14,12,.9);border:1px solid #6b7a63;border-radius:8px;color:#e8efe4;font:12px system-ui,sans-serif;padding:6px 8px;user-select:none}
#cmdP h4{margin:0 0 4px;font:700 13px Saira Condensed,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;cursor:pointer}
#cmdP .sec{margin:5px 0 2px;color:#9fb08f;font:700 11px Saira Condensed,system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}
#cmdP button{background:#2c3a26;border:1px solid #6b7a63;color:#f0f5e6;border-radius:5px;font:600 11px system-ui,sans-serif;padding:3px 6px;min-height:24px;cursor:pointer;margin:1px 2px 1px 0}
#cmdP button.on{background:#74d08f;color:#0a120c}#cmdP button:disabled{opacity:.4;cursor:default}
#cmdP .row{display:flex;flex-wrap:wrap;align-items:center;gap:2px;margin:2px 0}
#cmdP .bar{height:5px;background:#3a2a26;border-radius:3px;overflow:hidden;width:54px;display:inline-block;vertical-align:middle}#cmdP .bar i{display:block;height:100%}
#cmdP small{opacity:.75}#cmdP .nm{font-weight:700;cursor:pointer;min-width:70px}
#ctBanner{position:fixed;left:50%;top:150px;transform:translateX(-50%);z-index:41;background:rgba(14,22,16,.95);border:1px solid #74d08f;border-radius:8px;padding:6px 12px;color:#fff;font:600 14px system-ui,sans-serif;display:flex;gap:8px;align-items:center}
#ctBanner button{background:#2c3a26;border:1px solid #74d08f;color:#fff;border-radius:6px;padding:4px 10px;font:700 13px system-ui,sans-serif;cursor:pointer}
#planBar{position:fixed;left:50%;top:132px;transform:translateX(-50%);z-index:41;background:rgba(10,14,12,.94);border:1px solid #e3b341;border-radius:8px;padding:6px 10px;color:#fff;font:600 13px system-ui,sans-serif;display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:94vw}
#planBar button{background:#2c3a26;border:1px solid #8a9a6a;color:#fff;border-radius:6px;padding:4px 9px;font:700 12px system-ui,sans-serif;cursor:pointer}#planBar button.on{background:#e3b341;color:#1a1204}`;document.head.append(st);
  CTP=document.createElement('div');CTP.id='cmdP';CTP.hidden=true;document.body.append(CTP);
  CTP.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;e.preventDefault();e.stopPropagation();ctAct(b.dataset.a,b.dataset.v,b.dataset.w);},true);
  CTP.addEventListener('dblclick',e=>{const b=e.target.closest('[data-n]');if(!b)return;const v=prompt('Name this battle group',CT.names[b.dataset.n]||'');if(v!=null){CT.names[b.dataset.n]=v.slice(0,16);ctUI(true);}});
  return CTP;}
function ctBanner(){let b=$('ctBanner');const T=G&&G.teams[ME];const ofs=((G&&G.tOff)||[]).filter(o=>o.t===ME&&o.e>G.t&&!G.teams[o.f].out);
  if(!ofs.length||!T){if(b)b.hidden=true;return;}const o=ofs[0];if(!b){b=document.createElement('div');b.id='ctBanner';document.body.append(b);}b.hidden=false;
  const h=`<span>${ctName(o.f)} offers a ${o.d/60|0} min truce</span><small>${Math.ceil(o.e-G.t)} s</small><button data-y="1">Accept</button><button data-n="1">Decline</button>`;if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h;
    b.querySelector('[data-y]').onpointerdown=ev=>{ev.preventDefault();doAct({t:'cfa',f:o.f});};b.querySelector('[data-n]').onpointerdown=ev=>{ev.preventDefault();doAct({t:'cfd',f:o.f});};}}
function ctPlanBar(){let b=$('planBar');if(CT.mode!=='plan'){if(b)b.hidden=true;return;}if(!b){b=document.createElement('div');b.id='planBar';document.body.append(b);
    b.addEventListener('pointerdown',e=>{const x=e.target.closest('[data-a]');if(!x)return;e.preventDefault();e.stopPropagation();ctAct(x.dataset.a,x.dataset.v);});}
  b.hidden=false;const P=CT.pl,n=CT.draft.steps.length,tr=[['auto','Auto'],['timer10','After 10 s'],['timer30','After 30 s'],['go','On GO']],cur=P.trig==='timer'?'timer'+P.sec:P.trig;
  const h=`<b>Plan: click the map to add step ${n+1}</b>`+Object.keys(CT_TN).map(k=>`<button class="${P.type===k?'on':''}" data-a="ptype" data-v="${k}">${CT_TN[k]}</button>`).join('')+'<span>then</span>'+tr.map(t=>`<button class="${cur===t[0]?'on':''}" data-a="ptrig" data-v="${t[0]}">${t[1]}</button>`).join('')+`<button data-a="pfin">Done (Enter)</button><button data-a="pcan">Cancel (Esc)</button>`;
  if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h;}}
function ctAct(a,v,w){const T=G&&G.teams[ME];if(!G||!T)return;
  switch(a){case 'tog':CT.open=!CT.open;break;case 'plan':CT.mode==='plan'?ctPlanFinish():ctPlanStart();return;case 'ptype':CT.pl.type=v;break;
    case 'ptrig':if(v==='auto'||v==='go'){CT.pl.trig=v;}else{CT.pl.trig='timer';CT.pl.sec=+v.slice(5);}break;case 'pfin':ctPlanFinish();return;case 'pcan':ctPlanCancel();return;
    case 'go':{const pl=CT.plans.find(p=>p.n===+v);if(pl){pl.go=true;sfxUI(660);ctPlanTick();}break;}case 'goall':ctGoAll();return;case 'pdel':CT.plans=CT.plans.filter(p=>p.n!==+v);pushLog('Plan cancelled.');break;
    case 'tool':CT.mode=CT.mode===v?null:v;CT.draft=null;break;case 'say':doAct({t:'say',i:+v});break;
    case 'gsel':sqSelect(+v);break;case 'gstop':doAct({t:'stop',ids:sqList(+v).map(u=>u.id)});break;case 'ghold':{const L=sqList(+v),c=ctCentroid(L);if(c){doAct({t:'def',ids:L.map(u=>u.id),x:c.x,y:c.y});speak(1);}break;}
    case 'gform':{const i=+v;CT.form[i]=CT_FORMS[(CT_FORMS.indexOf(CT.form[i]||'line')+1)%3];break;}case 'gsend':CT.sendG=CT.sendG===+v?0:+v;CT.mode=CT.sendG?'gsend':null;break;
    case 'gname':{const i=+v;CT.names[i]=CT_GN[(CT_GN.indexOf(String(CT.names[i]||'').split(' ')[0])+1)%CT_GN.length];break;}
    case 'cf':doAct({t:'cf',to:+v,d:+w});break;case 'cfb':doAct({t:'cfb',o:+v});break;case 'cfx':doAct({t:'cfd',f:+v});break;
    case 'gift':{const ids=selfSel().map(u=>u.id);if(!ids.length){pushLog('Select the units you want to give first.','w');break;}doAct({t:'gift',ids,to:+v});break;}
    case 'give':doAct({t:'give',to:+v,amt:+w});break;}
  ctUI(true);}
/* a left click on the map sends the armed group there in its formation */
window.addEventListener('pointerdown',e=>{if(CT.mode!=='gsend'||!G||e.button!==0||e.target!==cv&&e.target!==mm)return;const w=ctWorldAt(e);if(!w)return;e.preventDefault();e.stopImmediatePropagation();const i=CT.sendG;CT.mode=null;CT.sendG=0;
  const us=sqList(i);ctFormSend(us,w.x,w.y,CT.form[i]||'line',MODK.shift?'amove':'move');speak(1);mark({x:w.x,y:w.y,r:20,t:0,d:.5,c:0x74d08f});ctUI(true);},true);
function ctGroupName(i){return CT.names[i]?(CT_GN.includes(CT.names[i])?CT.names[i]+' '+i:CT.names[i]):'Group '+i;}
function ctUI(force){if(G&&CT.g!==G){CT.g=G;CT.plans=[];CT.marks=[];CT.draft=null;CT.mode=null;CT.draw=null;CT.names={};CT.form={};CT.sendG=0;CT.pid=0;CT.sig='';}   // a new battle starts clean
  if(!G||G.over||RP.on||NET.spec){if(CTP)CTP.hidden=true;const b=$('ctBanner');if(b)b.hidden=true;const q=$('planBar');if(q)q.hidden=true;return;}const P=ctEl(),T=G.teams[ME];if(!T||T.reb){P.hidden=true;return;}ctBanner();ctPlanBar();
  const tp=ctTeamPlay(),ffa=ctFFA(),oth=G.teams.filter(O=>O.id!==ME&&!O.reb&&!O.out),sel=selfSel().length;
  let h=`<h4 data-a="tog"><span>Command</span><small>${CT.open?'▾':'▸'}</small></h4>`;
  if(CT.open){
    h+=`<div class="sec">Battle plans · key O</div><div class="row"><button class="${CT.mode==='plan'?'on':''}" data-a="plan" ${sel||CT.mode==='plan'?'':'disabled'}>${CT.mode==='plan'?'Finish plan':'Plan for selection'}</button>${CT.plans.some(p=>p.st==='wait'&&p.steps[p.i+1]&&p.steps[p.i+1].trig==='go')?'<button data-a="goall">GO ▶ (Enter)</button>':''}</div>`;
    for(const p of CT.plans){const nx=p.steps[p.i+1],txt=p.st==='done'?'done':p.st==='move'?`step ${p.i+1}/${p.steps.length} under way`:nx?(nx.trig==='go'?`step ${p.i+2}: waiting for GO`:nx.trig==='timer'?`step ${p.i+2} in ${ctFmt(nx.sec-(G.t-(p.i<0?p.t0:p.arr)))}`:`step ${p.i+2} next`):'done';
      h+=`<div class="row"><b>Plan ${p.n}</b><small>${ctMine(p.ids).length} units · ${txt}</small>${nx&&nx.trig==='go'&&p.st==='wait'?`<button data-a="go" data-v="${p.n}">GO ▶</button>`:''}<button data-a="pdel" data-v="${p.n}">✕</button></div>`;}
    h+='<div class="sec">Battle groups · keys 1-9 (Ctrl/Shift+number saves)</div>';let any=0;
    for(let i=1;i<=SQN;i++){const L=sqList(i);if(!L.length)continue;any=1;const hp=L.reduce((s,u)=>s+u.hp,0)/Math.max(1,L.reduce((s,u)=>s+u.max,0)),am=L.filter(u=>u.amx>0),ap=am.length?am.reduce((s,u)=>s+u.am,0)/am.reduce((s,u)=>s+u.amx,0):-1,f=CT.form[i]||'line';
      h+=`<div class="row" ><span class="nm" data-a="gname" data-v="${i}" data-n="${i}" title="Click: next name. Double-click: type a name">${ctGroupName(i)}</span><small>${L.length} units</small><span class="bar" title="Health ${Math.round(hp*100)}%"><i style="width:${Math.round(hp*100)}%;background:${hp>.6?'#74d08f':hp>.3?'#e3b341':'#ea5a40'}"></i></span>${ap>=0?`<span class="bar" title="Ammo ${Math.round(ap*100)}%"><i style="width:${Math.round(ap*100)}%;background:${ap>.4?'#6fb2ff':'#ea5a40'}"></i></span>`:''}</div>
      <div class="row"><button data-a="gsel" data-v="${i}">Select</button><button class="${CT.sendG===i?'on':''}" data-a="gsend" data-v="${i}" title="Then click the map (Shift: attack-move)">Send</button><button data-a="gform" data-v="${i}" title="Formation when sent">${f[0].toUpperCase()+f.slice(1)}</button><button data-a="ghold" data-v="${i}">Hold</button><button data-a="gstop" data-v="${i}">Stop</button></div>`;}
    if(!any)h+='<small>Select units and press Ctrl+1 to save a group.</small>';
    if(tp){h+=`<div class="sec">Pings &amp; drawing</div><div class="row">`+CT_PING.map((p,i)=>`<button class="${CT.mode==='ping'+i?'on':''}" data-a="tool" data-v="ping${i}" style="border-color:${p.c}" title="${[',','.','/'][i]} then click the map or minimap">${p.n}</button>`).join('')+`<button class="${CT.mode==='draw'?'on':''}" data-a="tool" data-v="draw" title="' then drag on the map">Draw</button><button class="${CT.mode==='circle'?'on':''}" data-a="tool" data-v="circle" title="; then drag from the centre">Circle</button></div><div class="row">`+CF.LINES.map((l,i)=>`<button data-a="say" data-v="${i}">${l}</button>`).join('')+'</div>';
      h+='<div class="sec">Aid for teammates</div>';for(const O of oth.filter(O=>sameTm(O.id,ME)))h+=`<div class="row"><b style="color:${O.color}">${ctName(O.id)}</b><button data-a="give" data-v="${O.id}" data-w="500" title="10% fee, arrives after 4 s">$500</button><button data-a="give" data-v="${O.id}" data-w="2000">$2000</button><button data-a="gift" data-v="${O.id}" ${sel?'':'disabled'} title="Give the selected units (up to 12, one gift per 20 s)">Give units</button></div>`;}
    if(ffa&&oth.length){h+='<div class="sec">Truce (free-for-all)</div>';
      for(const O of oth){const tr=truced(ME,O.id),k=ME<O.id?ME*32+O.id:O.id*32+ME,out=(G.tOff||[]).find(o=>o.f===ME&&o.t===O.id),oath=(O.oath||0)>G.t,me=(T.oath||0)>G.t;
        h+=`<div class="row"><b style="color:${O.color}">${ctName(O.id)}</b>${oath?'<small style="color:#ea5a40">oathbreaker</small>':''}`+(tr?`<small>truce ${ctFmt(G.truce[k]-G.t)}</small><button data-a="cfb" data-v="${O.id}" title="Breaking a truce: unrest in your towns and nobody trusts you for 4 minutes">Break</button>`
          :out?`<small>offered · ${Math.ceil(out.e-G.t)} s</small>`:[60,120,180].map((d,di)=>`<button data-a="cf" data-v="${O.id}" data-w="${di}" ${me?'disabled':''}>${d/60} min</button>`).join(''))+'</div>';}
      if((T.oath||0)>G.t)h+=`<small style="color:#ea5a40">You are an oathbreaker for ${ctFmt(T.oath-G.t)}.</small>`;}
  }
  if(force||h!==CT.sig){CT.sig=h;P.innerHTML=h;}P.hidden=false;}
setInterval(()=>{try{if(!G){if(CTP)CTP.hidden=true;return;}ctPlanTick();ctUI();}catch(e){}},500);
