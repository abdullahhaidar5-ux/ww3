/* ---------- CONQUEST interface: town labels, minimap markers, tax panel (Abdullah 2026-11-04) ----------
   World: over every town / hamlet you hold, "Tax +$X/s", the tax-rate badge and an unrest bar (green -> yellow -> red,
   pulsing near revolt). Minimap: owner colour, square = town / round = hamlet, pips = tax rate (1 Low .. 4 Extortionate),
   dashed ring = Restless, solid red ring = about to revolt (pulses), diamond with a cross = in rebel hands, arc = capture
   in progress, expanding ring = alert ping. Colour never carries meaning alone (shapes, pips, rings). Tap / click a town
   (world or minimap) to open the tax panel: rate buttons, unrest bar and why it is moving, perk, income. */
const TAXN=['Low','Normal','High','Extortionate'],TAXL=['L','N','H','E'];
const TWHY=['calm','enemy troops nearby','tax too high','recently conquered','missile strike nearby'];
const TPERK=[['','No special building'],['Market','+25% tax (+40% on Low tax)'],['Garage / fuel station','repairs vehicles nearby'],['Clinic / mosque','heals infantry nearby, calms unrest']];
let TP={ti:-1,el:null,t:0};
function unrestCol(u){return u>=75?'#e5483c':u>=50?'#f0c040':'#5fcf72';}
function townsMine(t){return t.ow>=0&&G.teams[ME]&&ally(t.ow,ME);}
function drawTownsWorld(c){if(!G||!G.towns||G.over)return;const now=performance.now()/1000,ph=VW<561;
  for(const t of G.towns){if(!inView(t.x,t.y,.1))continue;const p=toScreen(t.x,groundH(t.x,t.y)+(t.ham?70:110),t.y);if(p.z>1)continue;
    const mine=townsMine(t),reb=t.reb>G.t;
    c.save();c.font=(ph?'bold 11px':'bold 12px')+' system-ui,sans-serif';c.textAlign='center';
    if(mine){const w=ph?96:112,h=ph?38:42,x=p.x-w/2,y=p.y-h;c.fillStyle='rgba(8,12,10,.78)';c.fillRect(x,y,w,h);c.strokeStyle=G.teams[t.ow].color;c.lineWidth=1.5;c.strokeRect(x,y,w,h);
      const hot=t.un>=85&&((now*4)%1<.5);if(hot){c.strokeStyle='#ff3b30';c.lineWidth=3;c.strokeRect(x-2,y-2,w+4,h+4);}
      // tax-rate badge: letter in a shape (square Low/Normal, up-triangle High, diamond Extortionate)
      c.fillStyle=t.rate>=3?'#e5483c':t.rate===2?'#f0c040':t.rate===1?'#bcd0c4':'#5fcf72';const bx=x+11,by=y+11;c.beginPath();if(t.rate===2){c.moveTo(bx,by-8);c.lineTo(bx+8,by+7);c.lineTo(bx-8,by+7);}else if(t.rate===3){c.moveTo(bx,by-9);c.lineTo(bx+9,by);c.lineTo(bx,by+9);c.lineTo(bx-9,by);}else c.rect(bx-8,by-8,16,16);c.closePath();c.fill();
      c.fillStyle='#10140f';c.fillText(TAXL[t.rate],bx,by+4);
      c.fillStyle='#e8f2e8';c.textAlign='left';c.fillText('Tax +$'+(t.tax<10?t.tax.toFixed(1):Math.round(t.tax))+'/s',x+24,y+15);
      c.fillStyle='rgba(255,255,255,.14)';c.fillRect(x+6,y+h-10,w-12,6);c.fillStyle=unrestCol(t.un);c.fillRect(x+6,y+h-10,(w-12)*Math.min(1,t.un/100),6);
      if(t.un>50){c.fillStyle=t.un>=85?'#ff8a7a':'#ffe08a';c.textAlign='left';c.font=(ph?'bold 10px':'bold 11px')+' system-ui,sans-serif';c.fillText(t.un>=85?'ABOUT TO REVOLT!':'Restless - '+TWHY[t.why|0],x+6,y+h-14);}
    }else if(reb){const w=ph?84:96,h=20,x=p.x-w/2,y=p.y-h;c.fillStyle='rgba(60,18,10,.85)';c.fillRect(x,y,w,h);c.strokeStyle='#e5483c';c.lineWidth=1.5;c.strokeRect(x,y,w,h);c.fillStyle='#ffd0c0';c.fillText('REBELS '+Math.max(0,Math.ceil(t.reb-G.t))+'s',p.x,y+14);}
    else if(t.ow>=0&&G.teams[t.ow]){c.fillStyle='rgba(8,12,10,.7)';const w=c.measureText(t.name).width+16,h=18;c.fillRect(p.x-w/2,p.y-h,w,h);c.fillStyle=G.teams[t.ow].color;c.fillRect(p.x-w/2,p.y-h,4,h);c.fillStyle='#e8f2e8';c.fillText(t.name,p.x+2,p.y-5);}
    else{c.fillStyle='rgba(8,12,10,.55)';const w=c.measureText(t.name).width+12,h=16;c.fillRect(p.x-w/2,p.y-h,w,h);c.fillStyle='#c9d2c6';c.fillText(t.name,p.x,p.y-4);}
    c.restore();}}
function drawTownsMini(c,sx,sy,now){if(!G||!G.towns)return;
  for(const t of G.towns){const x=t.x*sx,y=t.y*sy,s=t.ham?3.2:4.6,mine=townsMine(t),reb=t.reb>G.t;
    c.save();
    if(reb){c.fillStyle='#000';c.beginPath();c.moveTo(x,y-s-2);c.lineTo(x+s+2,y);c.lineTo(x,y+s+2);c.lineTo(x-s-2,y);c.closePath();c.fill();c.fillStyle='#d9693a';c.beginPath();c.moveTo(x,y-s);c.lineTo(x+s,y);c.lineTo(x,y+s);c.lineTo(x-s,y);c.closePath();c.fill();c.strokeStyle='#000';c.lineWidth=1.3;c.beginPath();c.moveTo(x-s*.6,y-s*.6);c.lineTo(x+s*.6,y+s*.6);c.moveTo(x+s*.6,y-s*.6);c.lineTo(x-s*.6,y+s*.6);c.stroke();}
    else{const own=t.ow>=0&&G.teams[t.ow];const shape=()=>{c.beginPath();if(t.ham)c.arc(x,y,s,0,7);else c.rect(x-s,y-s,s*2,s*2);};
      c.fillStyle='#000';c.beginPath();if(t.ham)c.arc(x,y,s+1.6,0,7);else c.rect(x-s-1.6,y-s-1.6,s*2+3.2,s*2+3.2);c.fill();
      if(own){c.fillStyle=G.teams[t.ow].color;shape();c.fill();}else{c.fillStyle='rgba(20,24,20,.9)';shape();c.fill();c.strokeStyle='#b9c2b3';c.lineWidth=1.3;shape();c.stroke();}
      // capture in progress: arc round the marker in the capturing side's colour
      let cpm=0,cpT=-1;for(const k of t.cells)if(k.key&&k.cp>cpm&&k.cpT>=0){cpm=k.cp;cpT=k.cpT;}if(cpm>0&&G.teams[cpT]){c.strokeStyle=G.teams[cpT].color;c.lineWidth=2.2;c.beginPath();c.arc(x,y,s+4,-1.57,-1.57+6.283*Math.min(1,cpm));c.stroke();}
      if(mine){// tax-rate pips and unrest rings
        c.fillStyle='#f4f4f4';for(let i=0;i<=t.rate;i++){c.fillRect(x-s+i*2.4,y+s+3,1.6,2.2);}
        if(t.un>50){const crit=t.un>=75,pulse=t.un>=90?.5+.5*Math.sin(now*9):1;c.strokeStyle=crit?'#ff4a3a':'#ffd24a';c.globalAlpha=crit?.55+.45*pulse:1;c.lineWidth=crit?2.2:1.6;if(!crit)c.setLineDash([2.4,1.8]);c.beginPath();c.arc(x,y,s+(crit?5.5:3.4),0,7);c.stroke();c.setLineDash([]);if(t.un>=90){c.lineWidth=1.2;c.beginPath();c.arc(x,y,s+8+pulse*2,0,7);c.stroke();}}}}
    c.restore();}
  if(G.conq&&G.t<G.setupEnd&&G.N===2&&BASES.length>=2){const a=BASES[0],b=BASES[1],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,px=-dy/L,py=dx/L,R=Math.max(MAPW,MAPH);c.save();c.strokeStyle='rgba(255,224,130,.85)';c.lineWidth=1.4;c.setLineDash([5,3]);c.beginPath();c.moveTo((mx-px*R)*sx,(my-py*R)*sy);c.lineTo((mx+px*R)*sx,(my+py*R)*sy);c.stroke();c.restore();}
  // missile launch sites (yours, or an enemy's once you have seen it) with the strike countdown, and your missile-defence coverage
  if(G.conq){c.save();c.font='bold 9px system-ui,sans-serif';c.textAlign='center';
    for(const e of G.ents){if(!e.isB||e.dead||e.built<1)continue;const k=e.kind;if(k!=='uplink'&&k!=='sam')continue;const mine=ally(e.team,ME);
      if(k==='sam'){if(!mine)continue;c.strokeStyle='rgba(120,200,255,.35)';c.lineWidth=1;c.setLineDash([2,3]);c.beginPath();c.arc(e.x*sx,e.y*sy,CQ_MD_R*sx,0,7);c.stroke();c.setLineDash([]);continue;}
      if(!mine&&!(e.vs&&e.vs[ME])&&!e.mem)continue;const x=e.x*sx,y=e.y*sy,T=G.teams[e.team];c.fillStyle='#000';c.beginPath();c.moveTo(x,y-6);c.lineTo(x+5.5,y+4);c.lineTo(x-5.5,y+4);c.closePath();c.fill();c.fillStyle=mine?'#74d08f':'#ff5a40';c.beginPath();c.moveTo(x,y-4.4);c.lineTo(x+3.9,y+2.6);c.lineTo(x-3.9,y+2.6);c.closePath();c.fill();
      const sec=T?strikeSecs(T):-1;if(sec>=0){const t=sec<=.5?'READY':Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');c.fillStyle='#000';c.fillText(t,x+.7,y+14.2);c.fillStyle=mine?'#bfe8c4':'#ffd0c0';c.fillText(t,x,y+13.5);}}
    if(G.inb&&G.inb.length){const n=performance.now();G.inb=G.inb.filter(q=>q.t>n-600);for(const q of G.inb){const left=Math.max(0,(q.t-n)/1000),x=q.x*sx,y=q.y*sy,p=.5+.5*Math.sin(n/120);c.strokeStyle='rgba(255,70,50,'+(.55+.45*p)+')';c.lineWidth=1.6;c.beginPath();c.arc(x,y,Math.max(3,q.r*sx),0,7);c.stroke();if(left>0){const t=Math.ceil(left)+'s';c.fillStyle='#000';c.fillText(t,x+.7,y-q.r*sx-2.3);c.fillStyle='#ffd0c0';c.fillText(t,x,y-q.r*sx-3);}}}
    c.restore();}
  // alert pings (unrest warnings, lost towns, revolts)
  if(G.tpings&&G.tpings.length){const n=performance.now();G.tpings=G.tpings.filter(q=>n-q.t<4500);for(const q of G.tpings){const a=(n-q.t)/4500,r=4+a*22;c.strokeStyle=q.k===2?'rgba(255,90,60,'+(1-a)+')':q.k===1?'rgba(255,170,60,'+(1-a)+')':'rgba(255,224,90,'+(1-a)+')';c.lineWidth=2;c.beginPath();c.arc(q.x*sx,q.y*sy,r,0,7);c.stroke();}}}
function townAt(w,pad){if(!G||!G.towns||!w)return null;let b=null,bd=1e9;for(const t of G.towns){const d=Math.hypot(t.x-w.x,t.y-w.y);if(d<(t.ham?CELL*3.4:Math.max(CELL*3,t.r))+(pad||0)&&d<bd){bd=d;b=t;}}return b;}
function townMiniAt(e){if(!G||!G.towns)return null;const r=mm.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*MAPW,py=(e.clientY-r.top)/r.height*MAPH,tol=(innerWidth<561?14:9)/r.width*MAPW;let b=null,bd=1e9;for(const t of G.towns){const d=Math.hypot(t.x-px,t.y-py);if(d<tol&&d<bd){bd=d;b=t;}}return b;}
FXH.tping=(team,x,y,k)=>{if(team!==ME||!G)return;(G.tpings=G.tpings||[]).push({x,y,k,t:performance.now()});};
function townClose(){TP.ti=-1;if(TP.el)TP.el.style.display='none';}
function townPick(sx,sy){if(!G||!G.towns)return false;const w=screenToWorld(sx,sy);const t=townAt(w,10);if(t){townOpen(t.i);return true;}townClose();return false;}
function townOpen(i){TP.ti=i;if(!TP.el)townBuild();TP.el.style.display='block';TP.t=0;townPanelTick(true);}
function townBuild(){if(!document.getElementById('townCss')){const st=document.createElement('style');st.id='townCss';st.textContent=`#townp{position:fixed;left:8px;top:64px;width:min(280px,calc(100vw - 16px));z-index:60;background:rgba(10,16,12,.94);border:1px solid #4a6a52;border-radius:8px;color:#e8f2e8;font:14px/1.35 system-ui,sans-serif;padding:10px 12px;display:none;box-shadow:0 4px 18px rgba(0,0,0,.5)}
#townp h4{margin:0 0 2px;font-size:16px}#townp .tm{color:#9fb5a4;font-size:12px}#townp .rb{display:flex;gap:6px;margin:8px 0}#townp .rb button{flex:1;min-height:44px;border-radius:6px;border:1px solid #4a6a52;background:#1c2a20;color:#e8f2e8;font-size:13px;font-weight:600;cursor:pointer}#townp .rb button.on{background:#3a6b46;border-color:#9be39b}#townp .rb button[disabled]{opacity:.45}
#townp .bar{height:10px;background:rgba(255,255,255,.14);border-radius:5px;overflow:hidden;margin:4px 0}#townp .bar i{display:block;height:100%}#townp .x{position:absolute;right:6px;top:4px;width:34px;height:34px;background:none;border:0;color:#cfe0d2;font-size:22px;cursor:pointer}#townp .warn{color:#ffb4a8;font-weight:600}`;document.head.appendChild(st);}
  const d=document.createElement('div');d.id='townp';d.innerHTML='<button class="x" aria-label="Close">&times;</button><div id="tpb"></div>';d.addEventListener('pointerdown',e=>e.stopPropagation());d.addEventListener('contextmenu',e=>e.preventDefault());
  d.querySelector('.x').onclick=townClose;d.addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(b&&TP.ti>=0){doAct({t:'tax',ti:TP.ti,r:+b.dataset.r});TP.t=0;setTimeout(()=>townPanelTick(true),60);}const a=e.target.closest('button[data-act]');if(a&&TP.ti>=0&&!a.disabled){doAct(a.dataset.act==='road'?{t:'road',ti:TP.ti,ids:G.sel.filter(u=>!u.isB&&u.kind==='dozer'&&u.team===ME).map(u=>u.id)}:{t:a.dataset.act,ti:TP.ti});TP.t=0;setTimeout(()=>townPanelTick(true),90);}});
  document.body.appendChild(d);TP.el=d;}
function cqBanner(){if(!G||!G.conq)return;if(G.over){const o=$('cqBn');if(o&&o.dataset.h){o.dataset.h='';o.innerHTML='';}return;}let b=$('cqBn');if(!b){b=document.createElement('div');b.id='cqBn';b.style.cssText='position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:55;pointer-events:none;text-align:center;font:600 14px/1.3 system-ui,sans-serif;color:#f4e9c2;text-shadow:0 1px 3px #000;max-width:calc(100vw - 150px)';document.body.appendChild(b);}
  const setup=G.t<G.setupEnd;let h='';if(setup){const l=Math.max(0,Math.ceil(G.setupEnd-G.t));h=`<div style="background:rgba(60,45,10,.88);border:1px solid #d9b34a;border-radius:6px;padding:4px 12px;color:#ffe08a">SETUP PHASE ${Math.floor(l/60)}:${String(l%60).padStart(2,'0')} <span style="font-weight:400;font-size:12px">&middot; build up and grab towns &middot; no firing yet</span></div>`;}
  if(G.bse&&G.teams[ME]){let c=0,m=0,n=0;for(const T of G.teams){if(T.reb||T.out||ally(T.id,ME)||!G.bse[T.id])continue;c+=G.bse[T.id][0];m+=G.bse[T.id][1];n++;}if(n&&m)h+=`<div style="margin-top:3px;font-size:12px;opacity:.92">${n>1?'Enemy bases':'Enemy base'}: ${c} of ${m} structures left</div>`;}
  {const tm=x=>Math.floor(x/60)+':'+String(Math.floor(x%60)).padStart(2,'0');let sl='';
   for(const T of G.teams){if(T.reb||T.out||!T.sup)continue;const sec=strikeSecs(T);if(sec<0)continue;const mine=ally(T.id,ME);
     sl+=`<div style="font-size:12px;margin-top:2px;color:${mine?'#bfe8c4':'#ffb4a8'}">${T.F.name} ${UPLINK[T.fac]?UPLINK[T.fac][0]:'missile strike'}: ${sec<=0.5?'READY':'ready in '+tm(sec)}</div>`;}
   h+=sl;}
  if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h;}}
function strikeSecs(T){let f;if(MODE==='client'&&G.sfd)f=G.sfd[T.id];else f=T._upl?100*T.charge/T.sup.charge:-1;if(f==null||f<0)return -1;return Math.max((1-f/100)*T.sup.charge/.5,G.t<CQ_STRIKE_MIN?CQ_STRIKE_MIN-G.t:0);}
function townPanelTick(force){if(!G||!G.towns){return;}try{cqBanner();}catch(e){}
  // territory income next to the money
  const cr=$('credits');if(cr){let s=$('terrInc');if(!s){s=document.createElement('span');s.id='terrInc';s.style.cssText='font-size:11px;color:#9be39b;margin-left:6px;font-weight:600;white-space:nowrap';cr.parentNode.insertBefore(s,cr.nextSibling);}
    const T=G.teams[ME],v=T?T.terr||0:0;const txt=v>0.05?'+$'+v.toFixed(1)+'/s':'';if(s.textContent!==txt){s.textContent=txt;s.title='Territory income: tax from your towns and hamlets. Press a town to change its tax rate.';}}
  if(TP.ti<0||!TP.el)return;const n=performance.now();if(!force&&n-TP.t<250)return;TP.t=n;const t=G.towns[TP.ti];if(!t){townClose();return;}
  if(G.over){townClose();return;}
  const mine=townsMine(t),reb=t.reb>G.t,kind=t.ham?'Hamlet':'Town',ow=t.ow>=0&&G.teams[t.ow]?G.teams[t.ow].F.name:null;let h=`<h4>${t.name}</h4><div class="tm">${kind}${ow?' &middot; held by '+ow:reb?' &middot; in rebel hands':' &middot; neutral'}</div>`;
  const pk=TPERK[t.pk|0];
  if(mine){const ramp=Math.round(Math.min(1,(G.t-(t.hold||0))/T_RAMP)*50+50);
    h+=`<div style="margin-top:6px"><b>Tax +$${t.tax.toFixed(1)}/s</b> <span class="tm">${ramp<100?'(ramping '+ramp+'%)':''}${t.whole?' &middot; whole town +50%':''}</span></div>`;
    h+='<div class="rb">'+TAXN.map((n,i)=>`<button data-r="${i}" class="${t.rate===i?'on':''}">${n}<br><span style="font-weight:400;font-size:11px">${i===0?'-40% tax':i===1?'':i===2?'+50%':'+120%'}</span></button>`).join('')+'</div>';
    h+=`<div>Unrest ${Math.round(t.un)}/100 <span class="tm">&middot; ${t.un>50?'RESTLESS &middot; ':''}${TWHY[t.why|0]}</span></div><div class="bar"><i style="width:${Math.min(100,t.un)}%;background:${unrestCol(t.un)}"></i></div>`;
    h+=`<div class="tm">Troops near: ${t.gar|0} &middot; enemy troops near: ${t.fr|0}</div>`;
    if(t.un>=70)h+='<div class="warn">Lower the tax or send troops - this town is about to revolt!</div>';
    else h+='<div class="tm">Tip: High tax in safe towns behind your lines, Low tax on the front line.</div>';
    h+=lgTownHtml(t,mine);}
  else if(reb)h+=`<div class="warn" style="margin-top:6px">The locals revolted. Rebels hold it for ${Math.max(0,Math.ceil(t.reb-G.t))} s - clear them, then garrison infantry to capture.</div>`;
  else if(t.ow>=0)h+='<div class="tm" style="margin-top:6px">Enemy-held. Garrison infantry in its buildings to capture it'+(t.un>50?' &mdash; the locals are restless, it falls faster':'')+'.</div>';
  else h+='<div class="tm" style="margin-top:6px">Neutral. Garrison infantry in its buildings (more than half of the key buildings) to capture it.</div>';
  h+=hmPanel(t,mine,reb);
  if(pk[0])h+=`<div class="tm" style="margin-top:4px">Perk: <b>${pk[0]}</b> &mdash; ${pk[1]}</div>`;
  TP.el.querySelector('#tpb').innerHTML=h;}

/* ---------- HEARTS & MINDS interface: home turf, local recruits, informants, bribes, propaganda towers ---------- */
function homeLine(){const n=homeNames();return n.length?n.join(' & '):'';}
function hmPanel(t,mine,reb){let h='';const T=G.teams[ME];if(!T)return h;
  const hn=homeLine();if(hn){const tf=turfOf(ME);h+=`<div class="tm" style="margin-top:6px">Locals favour <b>${hn}</b>${tf>0?' &mdash; <span style="color:#9be39b">you are on home turf</span>':tf<0?' &mdash; <span style="color:#ffb4a8">you are the outsider here</span>':' &mdash; evens out in this match-up'}</div>`;}
  const pop=Math.round((t.pop==null?1:t.pop)*100),an=Math.round((t.an&&t.an[ME])||0);
  if(pop<100||an>=5)h+=`<div class="tm" style="margin-top:4px">Population ${pop}%${an>=5?' &middot; <span style="color:'+(an>=40?'#ffb4a8':'#f0c040')+'">locals angry at you '+an+'/100</span> (civilian casualties)':''}</div>`;
  if(mine&&!reb){
    const cost=recruitCost(t,ME),cap=HM.MIL_CAP,have=MODE==='client'?(t.milN|0):(t.mil||[]).filter(u=>!u.dead).length,nm=MIL_NAME[T.fac]||'Local Militia';
    if(t.loy){h+=`<div style="margin-top:8px"><button data-act="recruit" style="width:100%;min-height:40px;border-radius:6px;border:1px solid #4a6a52;background:#2b4a33;color:#e8f2e8;font-weight:600;cursor:pointer" ${have>=cap||T.credits<cost?'disabled':''}>Recruit ${nm} &mdash; $${cost}</button><div class="tm">Loyal town: local volunteers here (${have}/${cap}). Informants report enemy troops within ${Math.round(HM.INF_R*(turfOf(ME)>0?HM.TURF.inf:1))} m on the minimap.</div></div>`;}
    else h+=`<div class="tm" style="margin-top:6px">Not loyal yet: ${t.un>=HM.LOY_UN?'unrest must drop below '+HM.LOY_UN:'hold it a little longer'} to recruit locals and get informants.</div>`;
    if(t.sm)h+='<div class="tm" style="margin-top:4px">Smuggling tunnel: this town stays supplied even if it is cut off.</div>';}
  else if(!mine&&t.ow>=0&&!reb){
    if(t.sm&&G.teams[ME].upg&&G.teams[ME].upg.gpr)h+='<div class="tm" style="margin-top:4px">Your radar has found a smuggling tunnel under this town.</div>';
    if(t.un>=HM.BRIB_UN){const p=bribePrice(t,ME),cd=Math.max(0,Math.ceil((T.brT||0)-G.t)),setup=G.t<G.setupEnd;
      h+=`<div style="margin-top:8px"><button data-act="bribe" style="width:100%;min-height:40px;border-radius:6px;border:1px solid #8a6a2a;background:#4a3a18;color:#ffe9b0;font-weight:600;cursor:pointer" ${(!bribeOk(t,ME)||T.credits<p)?'disabled':''}>Bribe the elders &mdash; $${p}</button><div class="tm">${setup?'Not during the setup phase.':cd>0?'Cooldown '+cd+' s.':T.credits<p?'Not enough money.':'The garrison is sent out, nobody is killed. Cheaper the angrier the locals.'}</div></div>`;}
    else h+=`<div class="tm" style="margin-top:6px">Elders cannot be bribed yet: unrest ${Math.round(t.un)}/${HM.BRIB_UN}.</div>`;}
  return h;}
function towerAt(w){if(!G||!G.tow||!w)return null;for(const q of G.tow)if(Math.hypot(q.x-w.x,q.y-w.y)<70)return q;return null;}
function towerName(q){const T=q.ow>=0&&G.teams[q.ow];return T?(STATION[T.fac]||'Radio tower'):'Neutral radio tower';}
function drawTowersWorld(c){if(!G||!G.tow||G.over)return;
  for(const q of G.tow){if(!inView(q.x,q.y,.1))continue;const p=toScreen(q.x,groundH(q.x,q.y)+105,q.y);if(p.z>1)continue;
    const T=q.ow>=0&&G.teams[q.ow],mine=T&&ally(q.ow,ME);let prog=0,pt=-1;for(let k=0;k<(q.cp||[]).length;k++)if(q.cp[k]>prog){prog=q.cp[k];pt=k;}
    c.save();c.font='bold 11px system-ui,sans-serif';c.textAlign='center';const txt=(T?STATION[T.fac]:'Radio tower')||'Radio tower',w=c.measureText(txt).width+18,h=18;
    c.fillStyle='rgba(8,12,10,.78)';c.fillRect(p.x-w/2,p.y-h,w,h);c.fillStyle=T?T.color:'#b9c2b3';c.fillRect(p.x-w/2,p.y-h,4,h);c.fillStyle='#e8f2e8';c.fillText(txt,p.x+2,p.y-5);
    if(prog>0&&G.teams[pt]){c.fillStyle='rgba(255,255,255,.18)';c.fillRect(p.x-w/2,p.y,w,4);c.fillStyle=G.teams[pt].color;c.fillRect(p.x-w/2,p.y,w*Math.min(1,prog/10),4);}
    c.restore();}}
function drawTowersMini(c,sx,sy,now){if(!G||!G.tow)return;
  for(const q of G.tow){const x=q.x*sx,y=q.y*sy,T=q.ow>=0&&G.teams[q.ow];c.save();c.strokeStyle='#000';c.lineWidth=3;c.beginPath();c.moveTo(x,y+5);c.lineTo(x,y-5);c.moveTo(x-3.5,y+5);c.lineTo(x,y-3);c.lineTo(x+3.5,y+5);c.stroke();
    c.strokeStyle=T?T.color:'#d8dcd4';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y+5);c.lineTo(x,y-5);c.moveTo(x-3.5,y+5);c.lineTo(x,y-3);c.lineTo(x+3.5,y+5);c.stroke();
    c.beginPath();c.arc(x,y-6,2.6,3.6,5.8);c.stroke();c.beginPath();c.arc(x,y-6,5,3.6,5.8);c.stroke();c.restore();}
  // informant pings (HUMINT): an expanding diamond where a loyal town reports enemy troops, with the count
  if(G.hums&&G.hums.length){const n=performance.now();G.hums=G.hums.filter(q=>n-q.t<9000);c.save();c.font='bold 9px system-ui,sans-serif';c.textAlign='center';
    for(const q of G.hums){const a=(n-q.t)/9000,x=q.x*sx,y=q.y*sy,r=3.5+Math.min(4,q.n*.5);c.globalAlpha=Math.max(0,1-a);c.strokeStyle='#ff9a3c';c.lineWidth=1.6;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.stroke();const rr=r+a*10;c.globalAlpha=Math.max(0,.6-a);c.beginPath();c.arc(x,y,rr,0,7);c.stroke();c.globalAlpha=Math.max(0,1-a);c.fillStyle='#ffd9a8';c.fillText(q.n,x,y+3);}
    c.restore();}}
FXH.hum=(team,x,y,n)=>{if(!G||!G.teams[ME]||!ally(team,ME))return;(G.hums=G.hums||[]).push({x,y,n,t:performance.now()});};

// inbound missile countdown for the minimap (the global 'strike' warning carries the seconds to impact)
{const _st=FXH.strike;FXH.strike=function(x,y,t,r,sup,arc){if(sup&&G)(G.inb=G.inb||[]).push({x,y,r,t:performance.now()+t*1000});return _st.apply(this,arguments);};}
