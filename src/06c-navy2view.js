/* ---------- Navy 2 view: sonar-contact markers, mine markers (world + minimap), Ping button (view only, no sim state) ---------- */
const N2C=new Map();   // enemy submarine id -> {x,y,t}: last place we had it on sonar
function n2Contacts(){for(const e of G.ents){if(e.dead||e.isB||!e.s||!e.s.sub||ally(e.team,ME))continue;if(e.vis||e.vs&&e.vs[ME])N2C.set(e.id,{x:e.x,y:e.y,t:G.t,e});}
  for(const [id,k] of N2C)if(G.t-k.t>9||(k.e&&k.e.dead))N2C.delete(id);}
function drawNavy2(c){n2Contacts();
  for(const m of (G.mines||[])){if(!m.nav)continue;if(!(ally(m.team,ME)||(m.dt&&m.dt[ME]>G.t)))continue;const p=toScreen(m.x,groundH(m.x,m.y)+2,m.y);if(p.z>1||p.x<-12||p.y<-12||p.x>VW+12||p.y>VH+12)continue;
    const own=ally(m.team,ME),col=own?'#5ec8e8':'#ea5a40';c.strokeStyle=col;c.fillStyle='rgba(12,16,18,.9)';c.lineWidth=1.6;c.beginPath();c.arc(p.x,p.y,4.5,0,7);c.fill();c.stroke();
    for(let i=0;i<8;i++){const a=i*.785;c.beginPath();c.moveTo(p.x+Math.cos(a)*4.5,p.y+Math.sin(a)*4.5);c.lineTo(p.x+Math.cos(a)*7.5,p.y+Math.sin(a)*7.5);c.stroke();}
    if(!own){c.font='700 10px Saira Condensed, sans-serif';c.fillStyle=col;c.textAlign='center';c.fillText('MINE',p.x,p.y-11);c.textAlign='left';}}
  for(const [id,k] of N2C){const live=k.e&&!k.e.dead&&G.t-k.t<.5,p=toScreen(k.x,groundH(k.x,k.y)+14,k.y);if(p.z>1||p.x<-30||p.y<-30||p.x>VW+30||p.y>VH+30)continue;
    const a=live?1:Math.max(0,1-(G.t-k.t)/9),pulse=live?.5+.5*Math.sin(G.t*6):0;c.strokeStyle=`rgba(255,200,60,${(.5+.5*a).toFixed(2)})`;c.fillStyle=`rgba(255,200,60,${(.9*a).toFixed(2)})`;c.lineWidth=2;
    c.setLineDash(live?[]:[4,3]);c.beginPath();c.arc(p.x,p.y,13+pulse*4,0,7);c.stroke();c.setLineDash([]);c.beginPath();c.moveTo(p.x,p.y-6);c.lineTo(p.x+6,p.y);c.lineTo(p.x,p.y+6);c.lineTo(p.x-6,p.y);c.closePath();c.stroke();
    c.font='700 11px Saira Condensed, sans-serif';c.textAlign='center';c.fillText(live?'SONAR CONTACT':'LAST CONTACT',p.x,p.y-20);c.textAlign='left';}}
function drawNavy2Mini(c,sx,sy,now){
  for(const m of (G.mines||[])){if(!m.nav||!(ally(m.team,ME)||(m.dt&&m.dt[ME]>G.t)))continue;const x=m.x*sx,y=m.y*sy;c.strokeStyle=ally(m.team,ME)?'#5ec8e8':'#ea5a40';c.lineWidth=1.3;c.beginPath();c.arc(x,y,2.2,0,7);c.moveTo(x-4,y);c.lineTo(x+4,y);c.moveTo(x,y-4);c.lineTo(x,y+4);c.stroke();}
  for(const [id,k] of N2C){const live=k.e&&!k.e.dead&&G.t-k.t<.5,a=live?1:Math.max(0,1-(G.t-k.t)/9);c.strokeStyle=`rgba(255,200,60,${a.toFixed(2)})`;c.lineWidth=1.6;c.beginPath();c.arc(k.x*sx,k.y*sy,live?5+(now*4%3):6,0,7);c.stroke();c.fillStyle=c.strokeStyle;c.beginPath();c.moveTo(k.x*sx,k.y*sy-3);c.lineTo(k.x*sx+3,k.y*sy);c.lineTo(k.x*sx,k.y*sy+3);c.lineTo(k.x*sx-3,k.y*sy);c.fill();}}
function pingBtn(us){const left=Math.max(0,...us.map(u=>Math.ceil((u.pingT||0)-G.t))),all=us.every(u=>(u.pingT||0)>G.t),rdy=Math.min(...us.map(u=>Math.ceil((u.pingT||0)-G.t)));
  const b=document.createElement('button');b.className='btn wide';b.style.marginTop='6px';b.textContent=all?`Sonar ping (ready in ${rdy} s)`:'Sonar ping [E]';b.disabled=all;
  b.title='Active sonar: reveals every submerged enemy in range for a few seconds. A submarine that pings gives itself away; a surface ship that pings tells enemy subs where it is.';
  b.onpointerdown=ev=>{ev.preventDefault();if(!b.disabled)doAct({t:'ping',ids:us.map(u=>u.id)});};return b;}
