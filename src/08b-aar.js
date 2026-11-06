/* ================= AFTER-ACTION MAP: a timeline of the whole match on the end screen =================
   While you play, a light recorder notes (every ~8 s of game time) who holds which ground, who owns each town, where the
   fighting is and where strikes land. On the end screen it replays that on a minimap you can scrub with a slider:
   territory colours and the front line move, towns change hands, and revolts, big fights and strikes show as markers.
   Reads the game only (never touches the simulation or what is sent over the net). */
const AAR={g:null,s:[],ev:[],next:0,iv:8,seen:new WeakSet(),fcool:{},gw:48,gh:33,tw:null,play:0,cur:0,raf:0};
function aarReset(){AAR.g=G;AAR.s=[];AAR.ev=[];AAR.next=0;AAR.iv=8;AAR.seen=new WeakSet();AAR.fcool={};AAR.tw=null;AAR.gh=Math.max(16,Math.round(AAR.gw*MAPH/MAPW));}
function aarSample(){const gw=AAR.gw,gh=AAR.gh,sx=gw/MAPW,sy=gh/MAPH,R=MAPW*.085,rc=Math.ceil(R*sx)+1,acc=new Float32Array(gw*gh*(G.teams.length)),nt=G.teams.length;
  const splat=(x,y,tm,w)=>{if(tm<0||tm>=nt)return;const cx=x*sx|0,cy=y*sy|0;for(let j=Math.max(0,cy-rc);j<=Math.min(gh-1,cy+rc);j++)for(let i=Math.max(0,cx-rc);i<=Math.min(gw-1,cx+rc);i++){const d=Math.hypot((i+.5)/sx-x,(j+.5)/sy-y)/R;if(d<1)acc[(j*gw+i)*nt+tm]+=w*(1-d*d);}};
  const fire=new Map();
  for(const e of G.ents){if(e.dead||e.team<0)continue;if(e.isB){if(e.built>=1||e.built==null)splat(e.x,e.y,e.team,1);}else{splat(e.x,e.y,e.team,.22);if(G.t-(e.lastFire||-99)<2){const k=((e.x*(16/MAPW)|0)+(e.y*(11/MAPH)|0)*16);const f=fire.get(k)||{x:0,y:0,n:0};f.x+=e.x;f.y+=e.y;f.n++;fire.set(k,f);}}}
  const tw=[];for(const t of G.towns||[]){tw.push(t.ow);if(t.ow>=0)splat(t.x,t.y,t.ow,2.2);}
  const grid=new Uint8Array(gw*gh);for(let c=0;c<gw*gh;c++){let b=0,bv=.35;for(let k=0;k<nt;k++){const v=acc[c*nt+k];if(v>bv){bv=v;b=k+1;}}grid[c]=b;}
  const pt=AAR.s.length?AAR.s[AAR.s.length-1]:null;
  if(pt&&G.towns)for(let i=0;i<tw.length;i++){const a=pt.tw[i],b=tw[i];if(a===b)continue;const t=G.towns[i];if(b>=0)AAR.ev.push({t:G.t,k:'cap',x:t.x,y:t.y,tm:b,from:a});else if(a>=0&&t.reb>G.t)AAR.ev.push({t:G.t,k:'rev',x:t.x,y:t.y,tm:a});}
  for(const [k,f] of fire)if(f.n>=9&&G.t-(AAR.fcool[k]||-99)>45){AAR.fcool[k]=G.t;AAR.ev.push({t:G.t,k:'fight',x:f.x/f.n,y:f.y/f.n,n:f.n});}
  for(const st of G.strikes||[])if(!AAR.seen.has(st)){AAR.seen.add(st);AAR.ev.push({t:G.t,k:'strike',x:st.x,y:st.y,tm:st.team});}
  if(AAR.ev.length>500)AAR.ev=AAR.ev.filter((e,i)=>e.k==='cap'||e.k==='rev'||i%2===0);
  AAR.s.push({t:G.t,grid,tw});if(AAR.s.length>=480){AAR.s=AAR.s.filter((_,i)=>i%2===0);AAR.iv*=2;}}
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
