/* ---------- 08e-highlights: automatic kill-cam highlights ----------
   UI only (reads the battle, never changes it). During a match this notices the moments worth replaying:
     multi   a big multi-kill (many units / lots of value lost within a few seconds, as the player's side saw it)
     strike  a missile strike or special power landing
     base    a base building falling (HQ, factory, airfield, strike centre ...)
     revolt  a town revolting
     hero    a hero ability
   Each one keeps the 6 seconds around it from the kill-cam's rolling notes (08-ui kcRec: unit positions 4x a second and
   every battle effect). At the end of the match kcStart plays the best three, in the order they happened, in slow motion
   through the normal 3D view (the same stand-in copies the single kill-cam used), and Save clip records them.
   A short "Highlight saved" toast is shown mid-match for the big ones (Settings-free: hold nothing, it fades in 2.5 s;
   localStorage ww3_hltoast=0 turns it off). */
const HL={G:null,pend:[],list:[],last:{},toast:null,tt:0};
const HL_PRI={base:5,strike:4,hero:3,revolt:3,multi:2},HL_PRE=3.5,HL_POST=2.2,HL_MAX=14;
function hlReset(){HL.G=G;HL.pend=[];HL.list=[];HL.last={};}
function hlOn(){return !!G&&!G.over&&!kcOff();}
// note a moment: te = when it happens (game seconds, may be a little in the future for a strike still in the air)
function hlNote(type,te,x,y,label,score){if(HL.G!==G)hlReset();
  const lt=HL.last[type];if(lt&&Math.abs(lt.te-te)<(type==='multi'?6:3)){if(type==='multi'&&score>lt.score){lt.score=score;lt.label=label;lt.x=x;lt.y=y;}return;}   // one per moment, the bigger multi-kill wins
  const h={type,te,x,y,label,score:score||HL_PRI[type]*400,cut:false};HL.pend.push(h);HL.last[type]=h;}
// effect hook (called from kcFx for every effect this screen plays)
function hlFx(type,args){if(!G||G.over)return;if(HL.G!==G)hlReset();const t=G.t;
  if(type==='die'){const [id,x,y,ki,isB,team]=args,k=KINDS[ki];const dd=KC.deaths[KC.deaths.length-1];const seen=!!dd&&dd.t===t&&dd.x===x&&dd.y===y;if(!seen)return;
    if(isB&&STRUCT[k]&&STRUCT[k].cost>=1000&&k!=='garrison')hlNote('base',t,x,y,'Base building destroyed: '+STRUCT[k].name,4000+STRUCT[k].cost);
    // a multi-kill: 6+ losses worth 900+ within 3 seconds
    let n=0,v=0;for(let i=KC.deaths.length-1;i>=0;i--){const d=KC.deaths[i];if(t-d.t>3)break;n++;v+=d.v;}
    if(n>=6&&v>=900)hlNote('multi',t,x,y,'Multi-kill: '+n+' units lost in seconds',v);}
  else if(type==='strike'){const [x,y,tl,r,sup]=args;if(sup||r>=80)hlNote('strike',t+(+tl||2)+.2,x,y,'Missile strike lands',2800+r*4);}}
// log hook (called from pushLog, which only receives the local player's messages)
function hlLog(m,k){if(!hlOn()||!m)return;const t=G.t;
  if(k==='r:hab'){let u=null;for(const e of G.ents)if(e.habT&&!e.dead&&Math.abs(e.habT-HERO_CD-t)<.3){u=e;break;}if(u)hlNote('hero',t,u.x,u.y,'Hero ability: '+m.replace(/!$/,''),2400);}}
function hlTick(t){if(HL.G!==G||!HL.pend.length)return;
  for(let i=HL.pend.length-1;i>=0;i--){const h=HL.pend[i];if(t>=h.te+HL_POST)hlCut(h,t,i);}}
function hlCut(h,t,i){HL.pend.splice(i,1);
  const a=h.te-HL_PRE,b=Math.min(t,h.te+HL_POST),snaps=KC.snaps.filter(s=>s.t>=a-.3&&s.t<=b);if(snaps.length<5)return;
  const fx=[];for(let j=KC.fh;j<KC.fx.length;j++){const v=KC.fx[j];if(v[0]>=snaps[0].t&&v[0]<=b)fx.push(v);}
  const c={type:h.type,label:h.label,score:h.score,te:h.te,t0:snaps[0].t,t1:b,cx:h.x,cy:h.y,peak:{t:Math.min(h.te,b),x:h.x,y:h.y},snaps,fx,top:false};
  HL.list.push(c);if(HL.list.length>HL_MAX){HL.list.sort((p,q)=>q.score-p.score);HL.list.length=HL_MAX;}
  if(h.type!=='multi'||h.score>=1800)hlToast('★ Highlight saved · '+h.label);}
// the end of the match: whatever is still waiting is cut with what the notes hold
function hlFlush(){if(HL.G!==G)return;const t=G.t;for(let i=HL.pend.length-1;i>=0;i--){const h=HL.pend[i];if(h.te>t+.5){HL.pend.splice(i,1);continue;}hlCut(h,t,i);}}
// the playlist: the best three, one of each kind first, shown in the order they happened; the best one gives the saved picture
function hlPick(){const L=HL.list.slice();const B=KC.best;
  if(B&&B.snaps.length>=4&&!L.some(c=>Math.abs(c.te-B.peak.t)<8)&&B.score>=900)L.push({type:'multi',label:`Biggest fight: $${Math.round(B.score).toLocaleString('en-US')} destroyed`,score:B.score*1.2,te:B.peak.t,t0:B.t0,t1:B.t1,cx:B.cx,cy:B.cy,peak:B.peak,snaps:B.snaps,fx:B.fx,top:false});
  L.sort((p,q)=>q.score-p.score);const out=[],seen=new Set();
  for(const c of L){if(out.length>=3)break;if(seen.has(c.type))continue;if(out.some(o=>Math.abs(o.te-c.te)<7))continue;seen.add(c.type);out.push(c);}
  for(const c of L){if(out.length>=3)break;if(out.includes(c)||out.some(o=>Math.abs(o.te-c.te)<7))continue;out.push(c);}
  if(!out.length)return [];out.sort((p,q)=>p.te-q.te);let top=out[0];for(const c of out)if(c.score>top.score)top=c;for(const c of out)c.top=c===top;return out;}
function hlToast(txt){try{if(localStorage.getItem('ww3_hltoast')==='0')return;}catch(e){}
  let el=HL.toast;if(!el){el=HL.toast=document.createElement('div');el.id='hlToast';el.style.cssText='position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:70;padding:7px 16px;border-radius:18px;background:rgba(14,18,14,.82);border:1px solid #c9a24a;color:#ffe3a1;font:600 14px system-ui,sans-serif;letter-spacing:.03em;pointer-events:none;opacity:0;transition:opacity .35s';document.body.append(el);}
  el.textContent=txt;el.style.opacity='1';clearTimeout(HL.tt);HL.tt=setTimeout(()=>{el.style.opacity='0';},2600);}
