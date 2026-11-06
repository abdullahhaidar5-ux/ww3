/* ---------- Politics & intel UI (orch/reports/politics-intel.md) ----------
   World-opinion line in the top banner, spy command card + right-click jobs, leaflet-drop button on enemy towns,
   refugee columns (world + minimap), decoy label for the owner. The rules live in 03e-politics.js. */
const SPY_LBL={steal:['Steal funds','Right-click an enemy HQ: take up to 15% of their money (max $2000).'],
  upg:['Steal research','Right-click an enemy HQ, barracks, factory, airfield or Strike Center: copy their priciest upgrade that you lack.'],
  sab:['Sabotage','Right-click an enemy power plant, Strike Center or Radio & TV Station: knocked out for about 75 s.'],
  bribe:['Incite unrest','Right-click the ground inside an enemy town: pay agitators ($350) for +40 unrest and a shock.']};
let SPYM=null;
function spyCard(s){const d=document.createElement('div');d.className='tunlist';d.style.marginTop='6px';const sp=s.filter(u=>!u.isB&&u.kind==='spy'&&u.team===ME);const cd=Math.max(0,Math.ceil(Math.max(...sp.map(u=>(u.spCd||0)))-G.t));
  d.innerHTML='<b>Infiltrator</b> <span style="opacity:.8;font-size:12px">disguised until it acts or enemy infantry / a loyal town spots it'+(MODE!=='client'&&cd>0?' &middot; lying low '+cd+' s':'')+'</span>';
  const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:4px;margin-top:4px';
  for(const k of Object.keys(SPY_LBL)){const b=document.createElement('button');b.className='btn';b.style.cssText='flex:1 1 45%;min-height:34px;'+(SPYM===k?'outline:2px solid #e3b341':'');b.textContent=SPY_LBL[k][0];b.title=SPY_LBL[k][1];
    b.onpointerdown=ev=>{ev.preventDefault();SPYM=SPYM===k?null:k;updateUI();};row.append(b);}
  const t=document.createElement('div');t.style.cssText='font-size:12px;margin-top:4px;opacity:.9';t.textContent=SPYM?SPY_LBL[SPYM][1]:'Right-click a target: HQ = steal funds, other buildings = steal research, power plant / Strike Center / station = sabotage, enemy town = incite unrest. Pick a job above to force it.';
  d.append(row,t);return d;}
// right-click while spies are selected: send them on a job. Returns true when the order was a spy job and nothing else was selected.
function spyIssue(w,t,units){const sp=units.filter(u=>u.kind==='spy');if(!sp.length)return false;let a=null;const ids=sp.map(u=>u.id);
  if(t&&t.isB&&!ally(t.team,ME)&&t.kind!=='garrison'){const ok={steal:['hq'],upg:['hq','barracks','factory','airfield','uplink'],sab:['uplink','radio']};let k=SPYM&&ok[SPYM].includes(t.kind)?SPYM:(t.kind==='hq'?'steal':(t.kind==='uplink'||t.kind==='radio')?'sab':ok.upg.includes(t.kind)?'upg':null);if(k)a={t:'spy',ids,k,tid:t.id,x:t.x,y:t.y};}
  else if(!t){const oi=G.oil.findIndex(o=>o.pw&&!o.dead&&o.owner>=0&&!ally(o.owner,ME)&&Math.hypot(o.x-w.x,o.y-w.y)<42);
    if(oi>=0)a={t:'spy',ids,k:'sabo',fi:oi,x:G.oil[oi].x,y:G.oil[oi].y};
    else{const tw=(G.towns||[]).find(q=>q.ow>=0&&!ally(q.ow,ME)&&!(q.reb>G.t)&&Math.hypot(q.x-w.x,q.y-w.y)<q.r);if(tw)a={t:'spy',ids,k:'bribe',ti:tw.i,x:tw.x,y:tw.y};}}
  if(!a)return false;doAct(a);if(typeof speak==='function')speak(1);if(typeof markT==='function')markT(a.x,a.y,28);return units.every(u=>u.kind==='spy');}
function intelTownHtml(t){if(!G||!G.conq||!G.teams[ME])return '';const T=G.teams[ME];
  if(t.ow<0||ally(t.ow,ME)||t.reb>G.t)return '';
  const has=G.ents.some(e=>e.isB&&e.kind==='radio'&&!e.dead&&e.built>=1&&ally(e.team,ME));
  if(!has)return '<div class="tm" style="margin-top:6px">Build a <b>Radio &amp; TV Station</b> to run leaflet drops on enemy towns.</div>';
  const ok=leafOk(t,ME),c=leafCost(),cd=Math.max(0,Math.ceil((T.leafT||0)-G.t));
  return `<div style="margin-top:8px"><button data-act="leaf" style="width:100%;min-height:40px;border-radius:6px;border:1px solid #4a6a8a;background:#1f3550;color:#dcebff;font-weight:600;cursor:pointer" ${(!ok||T.credits<c)?'disabled':''}>Leaflet drop &mdash; $${c}</button><div class="tm">${G.t<G.setupEnd?'Not during the setup phase.':cd>0&&MODE!=='client'?'Reloading '+cd+' s.':T.credits<c?'Not enough money.':ok?'Unrest here keeps rising for '+POL.LEAF_T+' s.':'Needs a working station within '+POL.LEAF_R+' m of this town.'}</div></div>`;}
function polBannerHtml(){const T=G&&G.teams[ME];if(!T||T.reb||!G.conq)return '';const o=opOf(T),m=polMul(T),col=o<POL.SANC_BELOW?'#ff8a7a':o>=POL.AID_ABOVE?'#9be39b':'#e8e2c8';
  const note=m<1?' &middot; SANCTIONS -'+Math.round((1-m)*100)+'% income':o>=POL.AID_ABOVE?' &middot; foreign aid':'';
  return `<div style="margin-top:3px;font-size:12px;color:${col}">World opinion <span style="display:inline-block;vertical-align:middle;width:64px;height:6px;border-radius:3px;background:rgba(255,255,255,.2);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(o)}%;background:${col}"></i></span> ${Math.round(o)} &middot; ${opLabel(o)}${note}</div>`;}
// refugee columns walking away from a town under fire: little figures on the 2D overlay, dots on the minimap
function drawRefugeesWorld(c){if(!G||!G.refs||!G.refs.length||G.over)return;c.save();
  for(const r of G.refs){const p=refPos(r);if(!inView(p[0],p[1],.1))continue;
    for(let i=0;i<r.n;i++){const off=i*9-r.n*4.5,x=p[0]-r.dx*off+r.dy*((i%3)-1)*7,y=p[1]-r.dy*off-r.dx*((i%3)-1)*7,s=toScreen(x,groundH(x,y)+7,y);if(s.z>1)continue;
      const k=Math.max(.5,Math.min(1.6,900/Math.max(300,cam.td||900))),h=9*k;c.fillStyle='rgba(20,20,18,.55)';c.fillRect(s.x-1.6*k,s.y-h,3.2*k,h);c.fillStyle=['#d9d2bd','#bfc7cf','#c9a98a'][i%3];c.beginPath();c.arc(s.x,s.y-h-1.6*k,1.8*k,0,7);c.fill();c.fillRect(s.x-1.3*k,s.y-h+1,2.6*k,h-1.5);}
    const s=toScreen(p[0],groundH(p[0],p[1])+22,p[1]);if(s.z<1&&inView(p[0],p[1],.05)){c.font='bold 10px system-ui,sans-serif';c.textAlign='center';c.fillStyle='rgba(8,12,10,.7)';c.fillRect(s.x-26,s.y-9,52,12);c.fillStyle='#e8f2e8';c.fillText('REFUGEES',s.x,s.y);}}
  c.restore();}
function drawRefugeesMini(c,sx,sy){if(!G||!G.refs||!G.refs.length)return;c.save();for(const r of G.refs){const p=refPos(r);c.fillStyle='#f2efe0';c.strokeStyle='#000';c.lineWidth=1;c.beginPath();c.arc(p[0]*sx,p[1]*sy,2.3,0,7);c.fill();c.stroke();
    const e=r.t0+r.dur,q=[r.x0+r.dx*REF_SP*r.dur,r.y0+r.dy*REF_SP*r.dur];c.strokeStyle='rgba(242,239,224,.5)';c.setLineDash([2,2]);c.beginPath();c.moveTo(p[0]*sx,p[1]*sy);c.lineTo(q[0]*sx,q[1]*sy);c.stroke();c.setLineDash([]);}c.restore();}
