// Makes menu-world.webp (the main menu background: an epic world map). Run in a scratch dir with: npm i world-atlas@2 topojson-client d3-geo; node menuworld.mjs (needs playwright). Map data: Natural Earth via world-atlas (public domain).
import fs from 'fs';import {createRequire} from 'module';const req=createRequire(import.meta.url);
const topo=req('topojson-client');const d3=await import('d3-geo');
const W=2560,H=1440;
const world=JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const land=topo.feature(world,world.objects.land),borders=topo.mesh(world,world.objects.countries,(a,b)=>a!==b);
const proj=d3.geoNaturalEarth1().rotate([-38,0]).scale(560).translate([W*0.40,H*0.60]);
const path=d3.geoPath(proj);
const grat=d3.geoGraticule().step([15,15])();
const P=(lon,lat)=>proj([lon,lat]);
const hot=[[51.4,35.7,1],[35.5,33.9,1],[44.2,15.4,1],[47.8,30.5,.8],[30.5,50.45,.9],[37.6,55.75,.7],[-77,38.9,.7],[-0.1,51.5,.35],[116.4,39.9,.5],[125.75,39.03,.8],[46.7,24.7,.6],[34.8,32.1,.8],[29,41,.5],[31.2,30.05,.6],[121.5,25.05,.5],[73,33.7,.6],[127,37.55,.4],[54.4,24.45,.5]].map(([a,b,s])=>({p:P(a,b),s}));
const arcs=[[51.4,35.7,44.2,15.4],[51.4,35.7,35.5,33.9],[35.5,33.9,-0.1,51.5],[-77,38.9,46.7,24.7],[37.6,55.75,30.5,50.45],[116.4,39.9,121.5,25.05],[125.75,39.03,127,37.55],[-0.1,51.5,31.2,30.05],[-77,38.9,-0.1,51.5],[29,41,51.4,35.7],[54.4,24.45,47.8,30.5]];
const arcPaths=arcs.map(([a,b,c,d])=>{const i=d3.geoInterpolate([a,b],[c,d]);const pts=[];for(let k=0;k<=40;k++)pts.push(proj(i(k/40)));return pts;});
const html=`<html><body style="margin:0;background:#000"><canvas id=c width=${W} height=${H}></canvas><script>
const W=${W},H=${H},c=document.getElementById('c'),g=c.getContext('2d');
const LAND=new Path2D(${JSON.stringify(path(land))}),BOR=new Path2D(${JSON.stringify(path(borders))}),GR=new Path2D(${JSON.stringify(path(grat))}),SPH=new Path2D(${JSON.stringify(path({type:'Sphere'}))});
const hot=${JSON.stringify(hot)},arcs=${JSON.stringify(arcPaths)};
let s=7;const R=()=>{s=(s*16807)%2147483647;return s/2147483647;};
// deep background
let bg=g.createRadialGradient(W*.42,H*.45,50,W*.42,H*.45,W*.75);bg.addColorStop(0,'#0d1c24');bg.addColorStop(.55,'#071017');bg.addColorStop(1,'#020507');g.fillStyle=bg;g.fillRect(0,0,W,H);
// ocean inside the globe outline
g.save();g.clip(SPH);let oc=g.createRadialGradient(W*.42,H*.45,0,W*.42,H*.45,W*.6);oc.addColorStop(0,'#0f2a35');oc.addColorStop(1,'#06131a');g.fillStyle=oc;g.fillRect(0,0,W,H);
// fine ocean hatch
g.globalAlpha=.05;g.strokeStyle='#6fe3ff';g.lineWidth=1;for(let y=0;y<H;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}g.globalAlpha=1;
g.strokeStyle='rgba(110,220,230,.13)';g.lineWidth=1.2;g.stroke(GR);g.restore();
g.strokeStyle='rgba(120,230,240,.35)';g.lineWidth=2;g.stroke(SPH);
// land glow
g.save();g.shadowColor='rgba(60,210,220,.75)';g.shadowBlur=26;g.fillStyle='#14222a';g.fill(LAND);g.restore();
// land body with relief gradient
g.save();g.clip(LAND);let lg=g.createLinearGradient(0,0,0,H);lg.addColorStop(0,'#26363c');lg.addColorStop(.5,'#1c2a2f');lg.addColorStop(1,'#141e22');g.fillStyle=lg;g.fillRect(0,0,W,H);
// warm desert glow over the Middle East
let me=g.createRadialGradient(${JSON.stringify(P(45,29))}[0],${JSON.stringify(P(45,29))}[1],0,${JSON.stringify(P(45,29))}[0],${JSON.stringify(P(45,29))}[1],520);me.addColorStop(0,'rgba(214,140,60,.38)');me.addColorStop(1,'rgba(214,140,60,0)');g.fillStyle=me;g.fillRect(0,0,W,H);
// dot matrix
for(let y=0;y<H;y+=9)for(let x=(y/9)%2?4.5:0;x<W;x+=9){g.fillStyle='rgba(150,220,225,'+(0.10+R()*0.08)+')';g.fillRect(x,y,1.6,1.6);}
// grain
const im=g.getImageData(0,0,W,H);g.restore();
g.strokeStyle='rgba(120,215,225,.28)';g.lineWidth=1.1;g.stroke(BOR);
g.strokeStyle='rgba(140,240,245,.85)';g.lineWidth=1.6;g.stroke(LAND);
// arcs
for(const a of arcs){g.beginPath();a.forEach((p,i)=>{const lift=Math.sin(i/(a.length-1)*Math.PI)*Math.hypot(a[a.length-1][0]-a[0][0],a[a.length-1][1]-a[0][1])*.22;i?g.lineTo(p[0],p[1]-lift):g.moveTo(p[0],p[1]);});
 g.save();g.shadowColor='rgba(255,170,70,.9)';g.shadowBlur=14;g.strokeStyle='rgba(255,190,110,.7)';g.lineWidth=2.4;g.setLineDash([14,9]);g.stroke();g.restore();}
// hotspots
for(const h of hot){const [x,y]=h.p,r=6+h.s*13;let rg=g.createRadialGradient(x,y,0,x,y,r*4.5);rg.addColorStop(0,'rgba(255,90,50,'+(.55*h.s+.2)+')');rg.addColorStop(.35,'rgba(255,70,40,.18)');rg.addColorStop(1,'rgba(255,60,30,0)');g.fillStyle=rg;g.beginPath();g.arc(x,y,r*4.5,0,7);g.fill();
 g.strokeStyle='rgba(255,120,80,.75)';g.lineWidth=2;for(const k of [1,1.9,2.9]){g.globalAlpha=1/k;g.beginPath();g.arc(x,y,r*k*.7,0,7);g.stroke();}g.globalAlpha=1;
 g.fillStyle='#ffd9b0';g.beginPath();g.arc(x,y,3.4+h.s*2,0,7);g.fill();}
// HUD frame: corner brackets + tick ruler
g.strokeStyle='rgba(130,230,240,.45)';g.lineWidth=3;const m=46,L=120;for(const [x,y,dx,dy] of [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]]){g.beginPath();g.moveTo(x,y+dy*L);g.lineTo(x,y);g.lineTo(x+dx*L,y);g.stroke();}
g.strokeStyle='rgba(130,230,240,.25)';g.lineWidth=1.5;for(let x=m+160;x<W-m-160;x+=40){g.beginPath();g.moveTo(x,m);g.lineTo(x,m+(x%200<40?18:9));g.stroke();g.beginPath();g.moveTo(x,H-m);g.lineTo(x,H-m-(x%200<40?18:9));g.stroke();}
// scanlines
g.fillStyle='rgba(0,0,0,.16)';for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);
// sweeping radar wedge centred on the Middle East
{const [cx,cy]=${JSON.stringify(P(45,29))};g.strokeStyle='rgba(120,240,230,.12)';g.lineWidth=1.5;for(const r of [220,440,660,880]){g.beginPath();g.arc(cx,cy,r,0,7);g.stroke();}}
// vignette
let v=g.createRadialGradient(W*.45,H*.5,H*.35,W*.5,H*.5,W*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.82)');g.fillStyle=v;g.fillRect(0,0,W,H);
// grain
const d=g.getImageData(0,0,W,H),p=d.data;for(let i=0;i<p.length;i+=4){const n=(R()-.5)*14;p[i]+=n;p[i+1]+=n;p[i+2]+=n;}g.putImageData(d,0,0);
document.title='done';<\/script></body></html>`;
fs.writeFileSync('map.html',html);
const pw=req('/opt/npm-tools/node_modules/playwright');
const base=process.env.PLAYWRIGHT_BROWSERS_PATH||'/opt/pw-browsers';let exe;for(const dd of fs.readdirSync(base).filter(x=>x.startsWith('chromium-')).sort().reverse()){const e=base+'/'+dd+'/chrome-linux64/chrome';if(fs.existsSync(e)){exe=e;break;}}
const b=await pw.chromium.launch({executablePath:exe});const pg=await b.newPage({viewport:{width:W,height:H}});
await pg.goto('file://'+process.cwd()+'/map.html');await pg.waitForFunction(()=>document.title==='done',null,{timeout:120000});
await pg.locator('#c').screenshot({path:'map.png'});await b.close();console.log('ok');
