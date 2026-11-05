/* ---------- LOGISTICS interface: supply overlay (key L), roads being built, craters, cut-off towns (orch/logistics) ---------- */
const LGU={on:false,btn:null};
function lgToggle(){LGU.on=!LGU.on;lgBtnSync();}
function lgBtnSync(){if(LGU.btn){LGU.btn.className=LGU.on?'on':'';}}
function lgWanted(){return LGU.on||(G.sel&&G.sel.some(u=>u.kind==='dozer'&&u.team===ME))||(typeof TP!=='undefined'&&TP.ti>=0);}
function lgEdgeState(e,i){const L=G.lg,D=G.lgd;if(D.cr[i]&&D.cr[i].t>G.t)return 2;const r=L.reach&&L.reach[ME];if(!r)return 0;return r[e.a]&&r[e.b]?1:0;}
function lgStroke(c,pts,sc){let on=false;c.beginPath();for(const p of pts){const q=toScreen(p[0],groundH(p[0],p[1])+3,p[1]);if(q.z>1){on=false;continue;}if(!on){c.moveTo(q.x,q.y);on=true;}else c.lineTo(q.x,q.y);}c.stroke();}
function lgDensify(pts,step){const o=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(L/step));for(let j=1;j<=k;j++)o.push([a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k]);}return o;}
function drawLogiWorld(c){if(!G||!G.lg||!G.lgd||G.over)return;
  lgUiTick();
  if(G.roadV!==G.roadVS){G.roadVS=G.roadV;try{roadTexRefresh();}catch(e){}}
  const L=G.lg,D=G.lgd,me=G.teams[ME];if(!me)return;c.save();c.lineCap='round';c.lineJoin='round';
  if(lgWanted()){L.E.forEach((e,i)=>{const b=e.bb;if(!inView((b[0]+b[2])/2,(b[1]+b[3])/2,.9)&&!inView(e.pts[0][0],e.pts[0][1],.4)&&!inView(e.pts[e.pts.length-1][0],e.pts[e.pts.length-1][1],.4))return;
    const s=lgEdgeState(e,i);const P=lgDensify(e.pts,140);
    if(s===1){c.setLineDash([]);c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=6;lgStroke(c,P);c.strokeStyle='#5fe07a';c.lineWidth=3;lgStroke(c,P);}
    else{c.setLineDash([12,9]);c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=6;lgStroke(c,P);c.strokeStyle='#ff5a4a';c.lineWidth=3;lgStroke(c,P);}});c.setLineDash([]);}
  // craters
  for(const k in D.cr){const q=D.cr[k];if(q.t<=G.t||!inView(q.x,q.y,.1))continue;const p=toScreen(q.x,groundH(q.x,q.y)+20,q.y);if(p.z>1)continue;
    c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-34,p.y-22,68,17);c.fillStyle='#ff6a55';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('ROAD CUT '+Math.ceil(q.t-G.t)+'s',p.x,p.y-9);
    c.strokeStyle='#ff5a4a';c.lineWidth=3;c.beginPath();c.moveTo(p.x-7,p.y-2);c.lineTo(p.x+7,p.y+12);c.moveTo(p.x+7,p.y-2);c.lineTo(p.x-7,p.y+12);c.stroke();}
  // roads under construction: finished part solid, the rest dashed
  for(const j of D.job){if(j.team!==ME&&!ally(j.team,ME))continue;const P=lgDensify(j.pts,100);let acc=0,done=[],todo=[];P.forEach((p,i)=>{if(i)acc+=Math.hypot(p[0]-P[i-1][0],p[1]-P[i-1][1]);(acc<=j.prog?done:todo).push(p);});if(done.length&&todo.length)todo.unshift(done[done.length-1]);
    c.setLineDash([]);if(done.length>1){c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=6;lgStroke(c,done);c.strokeStyle='#d9c27a';c.lineWidth=3;lgStroke(c,done);}
    if(todo.length>1){c.setLineDash([6,8]);c.strokeStyle='#f0d060';c.lineWidth=2;lgStroke(c,todo);c.setLineDash([]);}
    const fp=lgPoint(j,j.prog),p=toScreen(fp[0],groundH(fp[0],fp[1])+60,fp[1]);if(p.z<=1){c.fillStyle='rgba(0,0,0,.75)';c.fillRect(p.x-38,p.y-16,76,16);c.fillStyle='#f0d060';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText('ROAD '+Math.round(100*j.prog/Math.max(1,j.len))+'%',p.x,p.y-4);}}
  // supply convoys: a crate badge (green = yours / allied, red = enemy) + stocked towns
  for(const e of G.ents){if(e.dead||!(e.cv||(G.lgCv&&G.lgCv.has(e.id)))||!inView(e.x,e.y,.1))continue;const p=toScreen(e.x,groundH(e.x,e.y)+34,e.y);if(p.z>1)continue;const fr=ally(e.team,ME);
    c.fillStyle='rgba(0,0,0,.78)';c.fillRect(p.x-15,p.y-18,30,14);c.fillStyle=fr?'#7ee88f':'#ff6a55';c.fillRect(p.x-9,p.y-15,8,8);c.fillRect(p.x+1,p.y-15,8,8);c.fillStyle='#fff';c.font='bold 8px system-ui,sans-serif';c.textAlign='center';c.fillText(fr?'SUP':'CVY',p.x,p.y-6);}
  // cut-off and trade-route tags on your towns
  for(const t of G.towns){if(!townsMine(t)||!inView(t.x,t.y,.1))continue;if(!t.cut&&!((t.trade||t.sk||t.dl>G.t)&&lgWanted()))continue;const p=toScreen(t.x,groundH(t.x,t.y)+(t.ham?70:110),t.y);if(p.z>1)continue;
    c.font='bold 11px system-ui,sans-serif';c.textAlign='center';const txt=t.cut?'CUT OFF':(t.trade?'TRADE ROUTE +25%':'')+((t.sk||t.dl>G.t)?(t.trade?' · ':'')+'STOCKED':'');c.fillStyle='rgba(0,0,0,.78)';const w=c.measureText(txt).width+12;c.fillRect(p.x-w/2,p.y+4,w,16);c.fillStyle=t.cut?'#ff6a55':'#7ee88f';c.fillText(txt,p.x,p.y+16);}
  c.restore();}
function drawLogiMini(c,sx,sy){if(!G||!G.lg||!G.lgd)return;const L=G.lg,D=G.lgd;c.save();c.lineCap='round';
  L.E.forEach((e,i)=>{const s=lgEdgeState(e,i);if(s===1){c.setLineDash([]);c.strokeStyle='rgba(95,224,122,.75)';c.lineWidth=1.6;}else{c.setLineDash([4,3]);c.strokeStyle='rgba(255,90,74,.9)';c.lineWidth=1.6;}
    c.beginPath();e.pts.forEach((p,k)=>k?c.lineTo(p[0]*sx,p[1]*sy):c.moveTo(p[0]*sx,p[1]*sy));c.stroke();});c.setLineDash([]);
  for(const t of G.towns)if(t.cut&&townsMine(t)){c.strokeStyle='#ff5a4a';c.lineWidth=2;c.beginPath();c.arc(t.x*sx,t.y*sy,8,0,7);c.stroke();}
  for(const e of G.ents){if(e.dead||!(e.cv||(G.lgCv&&G.lgCv.has(e.id))))continue;c.fillStyle=ally(e.team,ME)?'#ffe45a':'#ff4a3a';c.fillRect(e.x*sx-2.5,e.y*sy-2.5,5,5);}
  c.restore();}
function lgTownHtml(t,mine){if(!mine||!G.lg)return'';const T=G.teams[ME];let h='';
  if(t.cut)h+='<div class="warn" style="margin-top:6px">CUT OFF: no road link to your supply network. No ammo refill here, tax -50%, unrest rising. Repair or rebuild the road, retake the town in between, or build a bypass.</div>';
  else if(t.trade)h+='<div class="tm" style="margin-top:6px;color:#7ee88f">Trade route: connected to your base by roads through your own towns (+25% tax, calmer locals).</div>';
  else h+='<div class="tm" style="margin-top:6px">Supplied, but the road runs through neutral land. Build a road to turn it into a trade route (+25% tax).</div>';
  if(!t.trade)h+=`<div class="rb"><button data-act="road">Build road here<br><span style="font-weight:400;font-size:11px">select an engineer first (or the nearest builds it)</span></button></div>`;
  return h;}
function lgUiInit(){if(LGU.btn||typeof document==='undefined')return;const b=document.createElement('button');b.id='lgBtn';b.textContent='Supply lines (L)';b.title='Show or hide the supply network: solid green = connected to your base, red dashed = cut off. L key.';
  b.style.cssText='position:fixed;right:8px;bottom:222px;z-index:55;padding:5px 9px;font:600 12px system-ui,sans-serif;color:#e8f2e8;background:rgba(10,16,12,.86);border:1px solid #4a6a52;border-radius:6px;cursor:pointer;display:none';
  b.onclick=()=>lgToggle();document.body.appendChild(b);LGU.btn=b;}
function lgUiTick(){lgUiInit();if(!LGU.btn)return;const show=!!(G&&G.lgd&&G.conq&&!G.over);const d=show?'block':'none';if(LGU.btn.style.display!==d)LGU.btn.style.display=d;
  if(show){const mmEl=document.getElementById('mm');if(mmEl){const r=mmEl.getBoundingClientRect();if(r.width){const y=Math.max(8,innerHeight-r.top+6);LGU.btn.style.bottom=y+'px';LGU.btn.style.right=Math.max(8,innerWidth-r.right)+'px';}}}}
