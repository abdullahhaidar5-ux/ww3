// DIPLOMATIC WEB (lane G, ⚡25): every nation that is in a war or an alliance as a node on a ring, green lines = allies, red = at war, dashed blue = guarantee.
// Read-only view of the ONE opinion/alliance/war state. Opened from the Diplomacy tab ("Web" button) — a separate window, Esc / click outside closes.
function gwebOpen(){if(!GC)return;const old=document.getElementById('gWeb');if(old){old.remove();return;}
  const edges=[],set=new Set();
  for(const k of Object.keys(GC.war)){const [a,b]=k.split('|');if(GC.nat[a]&&GC.nat[b]&&!GC.nat[a].dead&&!GC.nat[b].dead){edges.push([a,b,'w']);set.add(a);set.add(b);}}
  for(const z of (GC.alz||[])){const l=z[1].filter(c=>GC.nat[c]&&!GC.nat[c].dead);for(let i=0;i<l.length;i++)for(let j=i+1;j<l.length;j++){edges.push([l[i],l[j],'a']);set.add(l[i]);set.add(l[j]);}}
  for(const g of (GC.gu||[])){if(GC.nat[g[0]]&&GC.nat[g[1]]){edges.push([g[0],g[1],'g']);set.add(g[0]);set.add(g[1]);}}
  const nodes=Array.from(set).sort((a,b)=>(grNat(a).reg||'').localeCompare(grNat(b).reg||'')||(a<b?-1:1));const W=920,H=600,cx=W/2,cy=H/2,R=Math.min(W,H)/2-48;
  const pos={};nodes.forEach((c,i)=>{const t=i/Math.max(1,nodes.length)*Math.PI*2-Math.PI/2;pos[c]=[cx+Math.cos(t)*R,cy+Math.sin(t)*R*.92];});
  const m=guEl('div','position:fixed;inset:0;z-index:8700;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center');m.id='gWeb';
  const box=guEl('div','background:#101c2a;border:1px solid #5a7a96;border-radius:10px;padding:10px 14px;color:#e8e4d8');
  box.innerHTML='<div style="display:flex;justify-content:space-between;margin-bottom:6px"><b style="font-size:18px">Diplomatic web</b><span style="font-size:14px"><span style="color:#8fd18f">━ allied</span> &nbsp; <span style="color:#ff8e7e">━ at war</span> &nbsp; <span style="color:#7fb0e8">┅ guarantee</span> &nbsp; (click a nation)</span></div>';
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;cv.style.cssText='max-width:92vw;height:auto;display:block';box.appendChild(cv);m.appendChild(box);document.body.appendChild(m);
  const g=cv.getContext('2d');g.font='13px sans-serif';
  const draw=()=>{g.clearRect(0,0,W,H);for(const [a,b,k] of edges){g.beginPath();g.moveTo(...pos[a]);g.lineTo(...pos[b]);g.lineWidth=k==='w'?2:1.5;g.strokeStyle=k==='w'?'rgba(255,120,100,.75)':k==='a'?'rgba(120,210,120,.55)':'rgba(120,170,230,.6)';g.setLineDash(k==='g'?[6,5]:[]);g.stroke();}g.setLineDash([]);
    for(const c of nodes){const [x,y]=pos[c];g.beginPath();g.arc(x,y,c===GC.me?11:8,0,7);g.fillStyle=grNat(c).color||'#888';g.fill();g.lineWidth=c===GC.me?3:1.5;g.strokeStyle=c===GC.me?'#ffe6a8':'#fff';g.stroke();
      g.fillStyle='#e8e4d8';g.textAlign=x<cx-8?'right':x>cx+8?'left':'center';g.fillText(gnName(c),x+(x<cx-8?-14:x>cx+8?14:0),y+(y<cy?-14:20));}};
  draw();
  cv.onclick=e=>{const r=cv.getBoundingClientRect(),sx=W/r.width,x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sx;let best=null,bd=22*22;for(const c of nodes){const d=(pos[c][0]-x)**2+(pos[c][1]-y)**2;if(d<bd){bd=d;best=c;}}if(best){m.remove();NP.code=best;if(typeof npDraw==='function'){NP.cur='dip';npDraw();}}};
  m.onclick=e=>{if(e.target===m)m.remove();};
  const esc=e=>{if(e.key==='Escape'){m.remove();document.removeEventListener('keydown',esc,true);}};document.addEventListener('keydown',esc,true);
  if(!nodes.length)box.appendChild(guEl('div','padding:20px;opacity:.7','No wars or alliances yet.'));}
