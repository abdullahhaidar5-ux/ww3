/* ================= AFTER-ACTION MAP: a timeline of the whole match on the end screen =================
   While you play, a light recorder notes (every ~8 s of game time) who holds which ground, who owns each town, where the
   fighting is and where strikes land. On the end screen it replays that on a minimap you can scrub with a slider:
   territory colours and the front line move, towns change hands, and revolts, big fights and strikes show as markers.
   Reads the game only (never touches the simulation or what is sent over the net). */
const AAR={g:null,tr:new Map(),base:[],s:[],ev:[],next:0,iv:8,seen:new WeakSet(),fcool:{},gw:48,gh:33,tw:null,play:0,cur:0,raf:0};
function aarReset(){AAR.g=G;AAR.s=[];AAR.ev=[];AAR.next=0;AAR.iv=8;AAR.seen=new WeakSet();AAR.fcool={};AAR.tw=null;AAR.tr=new Map();AAR.base=[];AAR.gh=Math.max(16,Math.round(AAR.gw*MAPH/MAPW));}
function aarSample(){const gw=AAR.gw,gh=AAR.gh,sx=gw/MAPW,sy=gh/MAPH,R=MAPW*.085,rc=Math.ceil(R*sx)+1,acc=new Float32Array(gw*gh*(G.teams.length)),nt=G.teams.length;
  const splat=(x,y,tm,w)=>{if(tm<0||tm>=nt)return;const cx=x*sx|0,cy=y*sy|0;for(let j=Math.max(0,cy-rc);j<=Math.min(gh-1,cy+rc);j++)for(let i=Math.max(0,cx-rc);i<=Math.min(gw-1,cx+rc);i++){const d=Math.hypot((i+.5)/sx-x,(j+.5)/sy-y)/R;if(d<1)acc[(j*gw+i)*nt+tm]+=w*(1-d*d);}};
  const fire=new Map();
  for(const e of G.ents){if(e.dead||e.team<0)continue;if(e.isB){if(e.built>=1||e.built==null)splat(e.x,e.y,e.team,1);}else{splat(e.x,e.y,e.team,.22);aarTrack(e);if(G.t-(e.lastFire||-99)<2){const k=((e.x*(16/MAPW)|0)+(e.y*(11/MAPH)|0)*16);const f=fire.get(k)||{x:0,y:0,n:0};f.x+=e.x;f.y+=e.y;f.n++;fire.set(k,f);}}}
  aarBases();const tw=[];for(const t of G.towns||[]){tw.push(t.ow);if(t.ow>=0)splat(t.x,t.y,t.ow,2.2);}
  const grid=new Uint8Array(gw*gh);for(let c=0;c<gw*gh;c++){let b=0,bv=.35;for(let k=0;k<nt;k++){const v=acc[c*nt+k];if(v>bv){bv=v;b=k+1;}}grid[c]=b;}
  const pt=AAR.s.length?AAR.s[AAR.s.length-1]:null;
  if(pt&&G.towns)for(let i=0;i<tw.length;i++){const a=pt.tw[i],b=tw[i];if(a===b)continue;const t=G.towns[i];if(b>=0)AAR.ev.push({t:G.t,k:'cap',x:t.x,y:t.y,tm:b,from:a,nm:t.name||''});else if(a>=0&&t.reb>G.t)AAR.ev.push({t:G.t,k:'rev',x:t.x,y:t.y,tm:a});}
  for(const [k,f] of fire)if(f.n>=9&&G.t-(AAR.fcool[k]||-99)>45){AAR.fcool[k]=G.t;AAR.ev.push({t:G.t,k:'fight',x:f.x/f.n,y:f.y/f.n,n:f.n});}
  for(const st of G.strikes||[])if(!AAR.seen.has(st)){AAR.seen.add(st);AAR.ev.push({t:G.t,k:'strike',x:st.x,y:st.y,tm:st.team});}
  if(AAR.ev.length>500)AAR.ev=AAR.ev.filter((e,i)=>e.k==='cap'||e.k==='rev'||i%2===0);
  AAR.s.push({t:G.t,grid,tw});if(AAR.s.length>=480){AAR.s=AAR.s.filter((_,i)=>i%2===0);AAR.iv*=2;}}
// ---- routes for the battle report card: where each ground unit walked (a few points per unit, view only) ----
function aarTrack(e){if(!e.s||e.s.dom==='air'||e.id==null)return;let r=AAR.tr.get(e.id);if(!r){if(AAR.tr.size>=1500)return;AAR.tr.set(e.id,r={tm:e.team,p:[],st:1,c:0,lx:0,ly:0});}
  if(r.c++%r.st===0){r.p.push(e.x|0,e.y|0);if(r.p.length>=96){const q=[];for(let i=0;i<r.p.length;i+=4)q.push(r.p[i],r.p[i+1]);r.p=q;r.st*=2;}}r.lx=e.x|0;r.ly=e.y|0;}
function aarBases(){const a={};for(const e of G.ents){if(e.dead||e.team<0||AAR.base[e.team])continue;const q=a[e.team]||(a[e.team]={x:0,y:0,n:0,ux:0,uy:0,un:0});if(e.isB){q.x+=e.x;q.y+=e.y;q.n++;}else{q.ux+=e.x;q.uy+=e.y;q.un++;}}
  for(const k in a){const q=a[k];AAR.base[k]=q.n?{x:q.x/q.n,y:q.y/q.n,b:1}:{x:q.ux/q.un,y:q.uy/q.un,b:0};}}
function aarTick(){if(!G||G.over||window.LOADING)return;if(AAR.g!==G)aarReset();if(G.t<AAR.next)return;AAR.next=G.t+AAR.iv;try{aarSample();}catch(e){console.warn('aar',e);}}
// ---- end screen ----
function aarCol(i){const t=G.teams[i];return t&&t.color||'#888';}
function aarDraw(cv,k){const c=cv.getContext('2d'),W=cv.width,H=cv.height,S=AAR.s;c.clearRect(0,0,W,H);if(!S.length)return;
  let base=G.mmBase;if(!base&&typeof mmBase==='function'){try{base=G.mmBase=mmBase();}catch(e){}}
  if(base){c.globalAlpha=.55;c.drawImage(base,0,0,W,H);c.globalAlpha=1;}else{c.fillStyle='#12181a';c.fillRect(0,0,W,H);}
  const s=S[Math.max(0,Math.min(S.length-1,k|0))],gw=AAR.gw,gh=AAR.gh,sx=W/MAPW,sy=H/MAPH;
  if(!AAR.tw){AAR.tw=document.createElement('canvas');AAR.tw.width=gw;AAR.tw.height=gh;}
  const q=AAR.tw.getContext('2d'),im=q.createImageData(gw,gh);const rgb=G.teams.map((T,i)=>{const h=aarCol(i).replace('#','');const n=parseInt(h.length===3?h.replace(/./g,'$&$&'):h,16);return[(n>>16)&255,(n>>8)&255,n&255];});
  for(let i=0;i<gw*gh;i++){const b=s.grid[i];if(!b)continue;const col=rgb[b-1]||[128,128,128];im.data[i*4]=col[0];im.data[i*4+1]=col[1];im.data[i*4+2]=col[2];im.data[i*4+3]=125;}
  q.putImageData(im,0,0);c.imageSmoothingEnabled=true;c.drawImage(AAR.tw,0,0,W,H);
  // front line: where two different teams' ground meet
  c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.6;c.beginPath();const cw=W/gw,ch=H/gh;
  for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){const a=s.grid[j*gw+i];if(!a)continue;if(i+1<gw){const b=s.grid[j*gw+i+1];if(b&&b!==a&&!ally(a-1,b-1)){c.moveTo((i+1)*cw,j*ch);c.lineTo((i+1)*cw,(j+1)*ch);}}if(j+1<gh){const b=s.grid[(j+1)*gw+i];if(b&&b!==a&&!ally(a-1,b-1)){c.moveTo(i*cw,(j+1)*ch);c.lineTo((i+1)*cw,(j+1)*ch);}}}c.stroke();
  // towns at that moment
  (G.towns||[]).forEach((t,i)=>{const o=s.tw[i];c.fillStyle='#000';c.beginPath();c.arc(t.x*sx,t.y*sy,t.ham?3:5,0,7);c.fill();c.fillStyle=o>=0?aarCol(o):'#9a9a90';c.beginPath();c.arc(t.x*sx,t.y*sy,t.ham?2:3.6,0,7);c.fill();});
  // markers up to now (the latest glow)
  for(const e of AAR.ev){if(e.t>s.t)continue;const x=e.x*sx,y=e.y*sy,age=s.t-e.t,fr=Math.max(0,1-age/40);
    if(e.k==='cap'){c.strokeStyle=aarCol(e.tm);c.lineWidth=2;c.beginPath();c.arc(x,y,7+9*fr,0,7);c.stroke();c.fillStyle=aarCol(e.tm);c.globalAlpha=.35+.65*fr;c.fillRect(x-1.5,y-17,2,12);c.fillRect(x+.5,y-17,7,5);c.globalAlpha=1;}
    else if(e.k==='rev'){c.strokeStyle='#ff5a3c';c.lineWidth=2;c.beginPath();c.arc(x,y,9+8*fr,0,7);c.stroke();c.fillStyle='#ff5a3c';c.font='700 12px sans-serif';c.textAlign='center';c.fillText('!',x,y+4);}
    else if(e.k==='fight'){c.globalAlpha=.3+.7*fr;c.fillStyle='#ffb347';c.beginPath();for(let a=0;a<8;a++){const r=a%2?4:8+Math.min(6,e.n/6);c.lineTo(x+Math.cos(a*Math.PI/4)*r,y+Math.sin(a*Math.PI/4)*r);}c.closePath();c.fill();c.globalAlpha=1;}
    else if(e.k==='strike'){c.strokeStyle='#ffe066';c.lineWidth=2;c.globalAlpha=.4+.6*fr;c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.moveTo(x,y-6);c.lineTo(x,y+6);c.stroke();c.beginPath();c.arc(x,y,4+6*fr,0,7);c.stroke();c.globalAlpha=1;}}
  c.textAlign='left';}
function aarPage(){try{aarSample();}catch(e){}if(!AAR.s.length||AAR.g!==G)return;let box=$('aarBox');if(box)box.remove();
  box=document.createElement('div');box.id='aarBox';box.style.cssText='margin:14px auto 6px;max-width:560px;text-align:left;font:13px IBM Plex Sans,sans-serif;color:#cfd8d2';
  const W=520,H=Math.round(520*MAPH/MAPW);
  box.innerHTML='<div style="font:700 12px IBM Plex Mono,monospace;letter-spacing:.1em;color:#e3b341;margin-bottom:6px">AFTER-ACTION MAP</div><canvas width="'+W+'" height="'+H+'" style="width:100%;border:1px solid #3a463f;border-radius:3px;background:#0b0f0d;display:block"></canvas>'+
   '<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><button type="button" id="aarPlay" style="background:#1f2a23;color:#cfe8d6;border:1px solid #4a5a50;border-radius:3px;padding:3px 10px;cursor:pointer">▶ Replay</button><input id="aarSl" type="range" min="0" max="'+(AAR.s.length-1)+'" value="'+(AAR.s.length-1)+'" style="flex:1"><span id="aarT" style="font:12px IBM Plex Mono,monospace;min-width:44px;text-align:right"></span></div>'+
   '<div style="font-size:11.5px;opacity:.8;margin-top:4px">White line = front line · flag = town captured · red ! = revolt · orange burst = big fight · yellow cross = missile strike</div>';
  ($('endStats')||$('ends')).after(box);
  const cv=box.querySelector('canvas'),sl=$('aarSl'),tt=$('aarT'),pb=$('aarPlay');
  const show=k=>{AAR.cur=k;aarDraw(cv,k);const t=AAR.s[Math.max(0,Math.min(AAR.s.length-1,k|0))].t;tt.textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');};
  sl.oninput=()=>{AAR.play=0;show(+sl.value);};
  const step=()=>{if(!AAR.play||!document.body.contains(cv)){AAR.play=0;return;}const n=AAR.s.length-1,inc=Math.max(.15,n/360);AAR.cur=Math.min(n,AAR.cur+inc);sl.value=AAR.cur;show(AAR.cur);if(AAR.cur>=n){AAR.play=0;return;}requestAnimationFrame(step);};
  pb.onclick=()=>{AAR.cur=0;AAR.play=1;requestAnimationFrame(step);};
  show(AAR.s.length-1);}

/* ================= BATTLE REPORT CARD: one picture worth posting (one-language idea 6) =================
   The end screen of every battle (Conquest, Battle, Missions, grand-campaign Fight-it) shows this card and a
   "Copy picture" button. Everything on it is read from the finished battle: the scoreboard numbers (endStats, 03-sim),
   the routes the recorder above saw the units walk (the arrows) and its events (towns taken, strikes).
   rcModel = the facts, rcDraw = the picture, rcCopy = clipboard (PNG download when the browser refuses). */
const RC={W:1200,H:700,ink:'#1d241f',paper:'#f1eadb',mine:'#1c7c3c',foe:'#b5372e',gold:'#e3b341'};
// the main movements: unit routes grouped by side, destination and which way round they went
function rcMoves(){const D=Math.hypot(MAPW,MAPH),cl=new Map();
  for(const r of AAR.tr.values()){const p=r.p.concat([r.lx,r.ly]),n=p.length>>1;if(n<3)continue;const sx=p[0],sy=p[1],ex=r.lx,ey=r.ly,d=Math.hypot(ex-sx,ey-sy);if(d<D*.2)continue;
    const L=[0];for(let i=1;i<n;i++)L.push(L[i-1]+Math.hypot(p[i*2]-p[i*2-2],p[i*2+1]-p[i*2-1]));const tot=L[n-1]||1,at=f=>{const t=f*tot;let i=1;while(i<n-1&&L[i]<t)i++;const a=L[i-1],b=L[i],u=b>a?(t-a)/(b-a):0;return[p[i*2-2]+(p[i*2]-p[i*2-2])*u,p[i*2-1]+(p[i*2+1]-p[i*2-1])*u];};
    const m=at(.5),dev=((ex-sx)*(m[1]-sy)-(ey-sy)*(m[0]-sx))/d,side=dev>D*.05?1:dev<-D*.05?-1:0,key=r.tm+':'+(ex*3/MAPW|0)+','+(ey*3/MAPH|0)+':'+side;
    let c=cl.get(key);if(!c)cl.set(key,c={tm:r.tm,n:0,P:[0,0,0,0,0,0,0,0,0,0]});c.n++;for(let q=0;q<5;q++){const v=at(q/4);c.P[q*2]+=v[0];c.P[q*2+1]+=v[1];}}
  const out=[],cnt={};for(const c of [...cl.values()].sort((a,b)=>b.n-a.n)){if(c.n<2)continue;const mine=ally(c.tm,ME)?1:0;cnt[mine]=(cnt[mine]|0)+1;if(cnt[mine]>2)continue;
    const pts=[];for(let q=0;q<5;q++)pts.push([c.P[q*2]/c.n,c.P[q*2+1]/c.n]);const hor=Math.abs(pts[4][0]-pts[0][0])>=Math.abs(pts[4][1]-pts[0][1]),f=hor?pts[2][1]/MAPH:pts[2][0]/MAPW;
    out.push({tm:c.tm,mine,n:c.n,pts,lane:f<.37?(hor?'north':'west'):f>.63?(hor?'south':'east'):'centre'});}
  return out;}
function rcLane(m){return m.lane==='centre'?'through the centre':'round the '+m.lane;}
// one line "how it was won", built only from what happened
function rcHow(S,mv){const P=S.p,w=S.w;if(w==null||w<0||!P[w])return 'Neither side could break the other before the fighting stopped.';
  const win=i=>esWin(S,i),W=esWin(S,ME)?esName(P[ME]):esName(P[w]),wm=mv.filter(m=>win(m.tm)),lm=mv.filter(m=>!win(m.tm)),cl=[];
  let a=wm.length>=2&&wm[0].lane!==wm[1].lane?W+' sent one column '+rcLane(wm[0])+' and another '+rcLane(wm[1]):wm.length?W+' pushed its main column '+rcLane(wm[0]):lm.length?W+' held its ground against the attack '+rcLane(lm[0]):W+' wore the enemy down';
  const caps=AAR.ev.filter(e=>e.k==='cap'&&win(e.tm)),st=AAR.ev.filter(e=>e.k==='strike'&&win(e.tm)).length;
  if(caps.length===1&&caps[0].nm)cl.push('took '+caps[0].nm+' at '+esT(caps[0].t));else if(caps.length)cl.push('took '+caps.length+' town'+(caps.length===1?'':'s'));
  if(st>=2)cl.push('landed '+st+' missile strikes');
  let kb=0,ku=0;P.forEach((p,i)=>{if(win(i)){kb+=p.kb;ku+=p.ku;}});if(kb>0)cl.push('destroyed '+kb+' building'+(kb===1?'':'s'));else if(ku>0)cl.push('destroyed '+ku+' unit'+(ku===1?'':'s'));
  if(cl.length)a+=(cl.length>1?', '+cl.slice(0,-1).join(', '):'')+' and '+cl[cl.length-1];
  const mn=Math.max(1,Math.round(S.t/60));return a+' in '+mn+' minute'+(mn===1?'':'s')+'.';}
function rcToday(){const d=new Date();return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getFullYear();}
// the facts of the card. o (optional): {title, place, date, how} from the caller (Fight-it gives the province and campaign date)
function rcModel(S,o){o=o||{};const P=S.p,me=P[ME]||P[0],won=esWin(S,ME),mv=AAR.g===G?rcMoves():[],nm=l=>l.length>2?l.slice(0,2).join(', ')+' +'+(l.length-2):l.join(' & ');
  const mineN=[],foeN=[];P.forEach((p,i)=>{if(G.teams[i]&&G.teams[i].reb)return;(i===ME||p.tm===me.tm?mineN:foeN).push(esName(p));});
  let place=o.place;if(!place){try{place=MAPS[G.mapKey]&&MAPS[G.mapKey].name;}catch(e){}}
  return{title:o.title||(S.w==null||S.w<0?'DRAW':won?'VICTORY':'DEFEAT'),won,place:place||'The battlefield',date:o.date||rcToday(),mode:modeName(),sides:nm(mineN)+' vs '+(nm(foeN)||'no one'),mins:Math.max(1,Math.round(S.t/60)),
    lost:me.lu+me.lb,destroyed:me.ku+me.kb,best:me.bn>0?{name:(me.bv&&VET[me.bv]?VET[me.bv]+' ':'')+esUnit(me.f,me.bk),sub:me.bn+' kill'+(me.bn===1?'':'s')}:null,
    how:o.how||rcHow(S,mv),arrows:mv,S};}
function rcWrap(x,t,mw,max){const w=String(t).split(' '),L=[];let c='';for(const k of w){if(c&&x.measureText(c+' '+k).width>mw){L.push(c);c=k;}else c=c?c+' '+k:k;}if(c)L.push(c);if(L.length>max){L.length=max;L[max-1]=L[max-1].replace(/.{2}$/,'')+'…';}return L;}
function rcFit(x,t,mw){t=String(t);if(x.measureText(t).width<=mw)return t;while(t.length>1&&x.measureText(t+'…').width>mw)t=t.slice(0,-1);return t+'…';}
function rcArrow(x,pts,col,w){const P=pts,n=P.length,a=P[n-2],b=P[n-1],an=Math.atan2(b[1]-a[1],b[0]-a[0]),hd=w*2.4,tip=[b[0],b[1]],end=[b[0]-Math.cos(an)*hd*.8,b[1]-Math.sin(an)*hd*.8];
  const path=()=>{x.beginPath();x.moveTo(P[0][0],P[0][1]);for(let i=1;i<n-1;i++){const q=i===n-2?end:[(P[i][0]+P[i+1][0])/2,(P[i][1]+P[i+1][1])/2];x.quadraticCurveTo(P[i][0],P[i][1],q[0],q[1]);}};
  const head=g=>{x.beginPath();x.moveTo(tip[0]+Math.cos(an)*g,tip[1]+Math.sin(an)*g);x.lineTo(end[0]+Math.cos(an+1.571)*(hd*.62+g),end[1]+Math.sin(an+1.571)*(hd*.62+g));x.lineTo(end[0]+Math.cos(an-1.571)*(hd*.62+g),end[1]+Math.sin(an-1.571)*(hd*.62+g));x.closePath();x.fill();};
  x.lineCap='round';x.lineJoin='round';x.strokeStyle='rgba(255,255,255,.9)';x.fillStyle='rgba(255,255,255,.9)';x.lineWidth=w+5;path();x.stroke();head(3.5);
  x.strokeStyle=col;x.fillStyle=col;x.lineWidth=w;path();x.stroke();head(0);x.beginPath();x.arc(P[0][0],P[0][1],w*.9,0,7);x.fill();}
// the mini-map of the card: the ground, towns, each side's base (× = destroyed) and the main movements as arrows
function rcMap(x,M,x0,y0,w,h){const sx=w/MAPW,sy=h/MAPH,S=M.S;x.save();x.beginPath();x.rect(x0,y0,w,h);x.clip();x.fillStyle='#a9b596';x.fillRect(x0,y0,w,h);
  let base=G.mmBase;if(!base&&typeof mmBase==='function'){try{base=G.mmBase=mmBase();}catch(e){}}if(base){x.globalAlpha=.8;try{x.drawImage(base,x0,y0,w,h);}catch(e){}x.globalAlpha=1;x.fillStyle='rgba(241,234,219,.38)';x.fillRect(x0,y0,w,h);}
  for(const t of G.towns||[]){x.fillStyle='rgba(29,36,31,.75)';x.beginPath();x.arc(x0+t.x*sx,y0+t.y*sy,t.ham?2.5:4,0,7);x.fill();}
  const big=AAR.ev.filter(e=>e.k==='fight').sort((a,b)=>b.n-a.n)[0];if(big){const bx=x0+big.x*sx,by=y0+big.y*sy;x.fillStyle='#e8912c';x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();for(let a=0;a<12;a++){const r=a%2?6:13;x.lineTo(bx+Math.cos(a*Math.PI/6)*r,by+Math.sin(a*Math.PI/6)*r);}x.closePath();x.fill();x.stroke();}
  for(const m of M.arrows.slice().sort((a,b)=>a.mine-b.mine))rcArrow(x,m.pts.map(p=>[x0+p[0]*sx,y0+p[1]*sy]),m.mine?RC.mine:RC.foe,Math.max(5,Math.min(11,4+m.n*.5)));
  AAR.base.forEach((b,i)=>{if(!b||!G.teams[i]||G.teams[i].reb)return;const mine=ally(i,ME),bx=x0+b.x*sx,by=y0+b.y*sy,out=S.p[i]&&S.p[i].out;x.fillStyle=mine?RC.mine:RC.foe;x.strokeStyle='#fff';x.lineWidth=2;x.fillRect(bx-8,by-8,16,16);x.strokeRect(bx-8,by-8,16,16);
    if(out){x.strokeStyle=RC.ink;x.lineWidth=3.5;x.beginPath();x.moveTo(bx-13,by-13);x.lineTo(bx+13,by+13);x.moveTo(bx+13,by-13);x.lineTo(bx-13,by+13);x.stroke();}});
  x.restore();x.strokeStyle='rgba(29,36,31,.55)';x.lineWidth=2;x.strokeRect(x0,y0,w,h);}
// the picture (1200 x 700)
function rcDraw(M){const W=RC.W,H=RC.H,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),F=(wt,sz)=>`${wt} ${sz}px system-ui,-apple-system,"Segoe UI",sans-serif`;
  x.fillStyle=RC.paper;x.fillRect(0,0,W,H);x.fillStyle='#1b2a20';x.fillRect(0,0,W,118);x.fillStyle=M.title==='VICTORY'?RC.gold:M.title==='DEFEAT'?'#e07a6a':'#cfd8d2';x.fillRect(0,118,W,5);
  x.textBaseline='alphabetic';x.textAlign='left';x.fillStyle='#f3efe2';x.font=F(800,64);try{x.letterSpacing='6px';}catch(e){}x.fillText(M.title,40,84);try{x.letterSpacing='0px';}catch(e){}
  x.textAlign='right';x.font=F(700,25);x.fillStyle='#f3efe2';x.fillText(rcFit(x,M.place+' · '+M.date,640),W-40,52);x.font=F(500,22);x.fillStyle='rgba(243,239,226,.75)';x.fillText(rcFit(x,(M.mode?M.mode+' · ':'')+M.sides+' · '+M.mins+' min',700),W-40,86);
  // map (left)
  const bw=540,bh=350,ar=MAPW/MAPH;let mw=bw,mh=bw/ar;if(mh>bh){mh=bh;mw=bh*ar;}const mx=40+(bw-mw)/2,my=150+(bh-mh)/2;rcMap(x,M,mx,my,mw,mh);
  x.textAlign='left';x.font=F(500,15);x.fillStyle='rgba(29,36,31,.62)';x.fillText('green = your side · red = enemy · square = base · × = base destroyed',40,150+bh+24);
  // numbers (right)
  const rx=630;x.font=F(700,17);x.fillStyle='rgba(29,36,31,.6)';x.fillText('LOST',rx,172);x.fillText('DESTROYED',rx+250,172);
  x.font=F(800,76);x.fillStyle=RC.ink;x.fillText(String(M.lost),rx,246);x.fillStyle=RC.foe;x.fillText(String(M.destroyed),rx+250,246);
  x.font=F(500,16);x.fillStyle='rgba(29,36,31,.6)';x.fillText('units and buildings',rx,272);x.fillText('units and buildings',rx+250,272);
  x.strokeStyle='rgba(29,36,31,.18)';x.lineWidth=1;x.beginPath();x.moveTo(rx,296);x.lineTo(W-40,296);x.stroke();
  x.font=F(700,17);x.fillStyle='rgba(29,36,31,.6)';x.fillText('BEST UNIT',rx,330);x.font=F(800,32);x.fillStyle=RC.ink;x.fillText(rcFit(x,M.best?M.best.name:'No unit stood out',W-40-rx),rx,368);
  if(M.best){x.font=F(500,20);x.fillStyle='rgba(29,36,31,.75)';x.fillText(M.best.sub,rx,396);}
  x.strokeStyle='rgba(29,36,31,.18)';x.beginPath();x.moveTo(rx,420);x.lineTo(W-40,420);x.stroke();
  // sides (flags)
  const S=M.S,ord=esOrder(S).filter(i=>!(G.teams[i]&&G.teams[i].reb)).slice(0,3);let sy=440;for(const i of ord){const p=S.p[i],fl=esFlag(p.f),mine=i===ME||p.tm===(S.p[ME]||S.p[0]).tm;x.fillStyle=mine?RC.mine:RC.foe;x.fillRect(rx,sy,5,26);if(fl)try{x.drawImage(fl,rx+14,sy,43,26);}catch(e){}
    x.font=F(700,20);x.fillStyle=RC.ink;x.textAlign='left';x.fillText(rcFit(x,esName(p)+(i===ME?' (you)':''),330),rx+68,sy+20);x.textAlign='right';x.font=F(700,15);x.fillStyle=esWin(S,i)?'#8a6410':'rgba(29,36,31,.55)';x.fillText(esWin(S,i)?'WINNER':p.out?'DEFEATED':'',W-40,sy+19);sy+=33;}
  // how it was won
  x.textAlign='left';x.font=F(700,17);x.fillStyle='rgba(29,36,31,.6)';x.fillText(M.title==='VICTORY'?'HOW IT WAS WON':'HOW IT WENT',40,572);x.font=F(500,25);x.fillStyle=RC.ink;rcWrap(x,M.how,W-80,2).forEach((l,k)=>x.fillText(l,40,606+k*33));
  x.font=F(600,16);x.fillStyle='rgba(29,36,31,.5)';x.textAlign='right';x.fillText('WORLD WAR 3 · play free in your browser',W-40,H-18);x.textAlign='left';x.fillText('abdullahhaidar5-ux.github.io/ww3',40,H-18);return c;}
// "Copy picture": to the clipboard; a PNG download when the browser will not allow that. Says what happened on the button.
async function rcCopy(cv,btn,name){const say=t=>{if(!btn)return;btn.textContent=t;clearTimeout(btn._t);btn._t=setTimeout(()=>{btn.textContent='Copy picture';},2600);};
  let b=cv instanceof Blob?cv:null;if(!b){try{b=await new Promise(r=>cv.toBlob(r,'image/png'));}catch(e){}}if(!b)return 'fail';
  try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);say('Copied — paste it anywhere');return 'copied';}}catch(e){}
  try{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=(name||'ww3-battle-report')+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);say('Saved as a picture file');return 'saved';}catch(e){return 'fail';}}
// a ready block for other screens (Fight-it result, campaign front page): the picture and its Copy picture button
function rcEl(cv,name){const d=document.createElement('div');d.className='rcBox';d.style.cssText='margin:0 0 12px;text-align:left';cv.style.cssText='display:block;width:100%;max-width:760px;height:auto;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.5)';
  const b=document.createElement('button');b.type='button';b.className='rcCopy';b.textContent='Copy picture';b.style.cssText='margin-top:8px;padding:6px 14px;border-radius:5px;border:1px solid #8a7a45;background:transparent;color:#e3b341;cursor:pointer;font-size:14px';b.onclick=()=>rcCopy(cv,b,name);d.append(cv,b);return d;}
/* Campaign front page: one month of the war diary as the same kind of picture. F = {paper, date, head, lines[], foot} (13c-grandui fills it). */
function rcFront(Fp){const W=RC.W,H=RC.H,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),F=(wt,sz,ser)=>`${wt} ${sz}px ${ser?'Georgia,"Times New Roman",serif':'system-ui,-apple-system,"Segoe UI",sans-serif'}`;
  x.fillStyle=RC.paper;x.fillRect(0,0,W,H);x.fillStyle='#1b2a20';x.fillRect(0,0,W,96);x.fillStyle=RC.gold;x.fillRect(0,96,W,5);x.textBaseline='alphabetic';
  x.fillStyle='#f3efe2';x.font=F(800,44,1);x.textAlign='left';x.fillText(rcFit(x,Fp.paper||'THE WAR DIARY',700),40,64);x.textAlign='right';x.font=F(600,24);x.fillText(Fp.date||'',W-40,60);
  x.textAlign='left';x.fillStyle=RC.ink;x.font=F(800,54,1);let y=178;for(const l of rcWrap(x,Fp.head||'A quiet month',W-80,2)){x.fillText(l,40,y);y+=62;}
  x.strokeStyle='rgba(29,36,31,.3)';x.lineWidth=2;x.beginPath();x.moveTo(40,y-30);x.lineTo(W-40,y-30);x.stroke();y+=14;
  x.font=F(500,25);for(const t of (Fp.lines||[]).slice(0,6)){const L=rcWrap(x,t,W-130,2);if(y+L.length*32>H-56)break;x.fillStyle=RC.foe;x.fillRect(40,y-17,10,10);x.fillStyle=RC.ink;L.forEach((l,k)=>x.fillText(l,66,y+k*32));y+=L.length*32+14;}
  x.font=F(600,16);x.fillStyle='rgba(29,36,31,.5)';x.textAlign='right';x.fillText('WORLD WAR 3 · play free in your browser',W-40,H-18);x.textAlign='left';x.fillText(Fp.foot||'abdullahhaidar5-ux.github.io/ww3',40,H-18);return c;}
