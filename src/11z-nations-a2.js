/* ===== nations-a2 (Abdullah 2026-11-06): Brazil BR, Venezuela VE, Mexico MX, Argentina AR, Colombia CO, Chile CL, Sweden SE =====
   Looks/names for the seven NEWNAT rows in 01-data.js. One module on purpose: other nation lanes work in parallel, so these
   are appended entries into the existing tables (no edits to the shared lines). Visual/name only; nothing here touches the simulation. */
{
const A2=['BR','VE','MX','AR','CO','CL','SE'];
const west=['BR','MX','AR','CO','CL','SE'];
for(const f of A2){if(!KFAC.includes(f))KFAC.push(f);}
for(const f of west){if(!WESTVEH.includes(f))WESTVEH.push(f);SOLV[f]='sol_w';}
EASTVEH.push('VE');SOLV.VE='sol_w';
Object.assign(RMAP.tank,{BR:'kf51',VE:'t90',MX:'abrams',AR:'kf51',CO:'kf51',CL:'kf51',SE:'kf51'});
Object.assign(RMAP.heli,{BR:'uh60',VE:'mi24',MX:'uh60',AR:'uh60',CO:'uh60',CL:'uh60',SE:'apache'});
Object.assign(RMAP.jet,{BR:'typhoon',VE:'su35',MX:'f16',AR:'f16',CO:'f16',CL:'f16',SE:'typhoon'});
for(const f of A2){RMAP.dozer[f]='jd550';RMAP.ship[f]='frw';if(f!=='VE')MIL_TANK[f]={m:'tankE',fit:'long',size:37};else MIL_TANK[f]={m:'tankE',fit:'long',size:37};}
Object.assign(FLOOK,{BR:{veh:'#5c6b3e',ca:'#3b4a2a',cb:'#8a7e52',uni:'#5d6b45',pat:1},VE:{veh:'#6a6d46',ca:'#4a4630',cb:'#2f3322',uni:'#6a6a44',pat:0},MX:{veh:'#5e6540',ca:'#8a7e52',cb:'#3a3f2a',uni:'#646a48',pat:1},
 AR:{veh:'#7a7a54',ca:'#5a4e34',cb:'#2f3322',uni:'#76744f',pat:0},CO:{veh:'#566238',ca:'#3a4a2a',cb:'#7d7650',uni:'#5a6642',pat:1},CL:{veh:'#6a6a4c',ca:'#5a4e34',cb:'#3a3f2a',uni:'#6a6a4a',pat:0},SE:{veh:'#4c5a38',ca:'#2f3a26',cb:'#7d724c',uni:'#4f5c3c',pat:1}});
Object.assign(CAMOX,{BR:{p:0,s:1,c:'#2f3a22',t:'#ffdf00',w:3},VE:{p:0,s:1,c:'#3a3a26',t:'#cf142b',w:3},MX:{p:1,s:1,c:'#3a3f2a',t:'#006847',w:3},AR:{p:0,s:1,c:'#3a3f2a',t:'#74acdf',w:3},CO:{p:1,s:1,c:'#2f3a22',t:'#fcd116',w:3},CL:{p:0,s:1,c:'#3a3f2a',t:'#d52b1e',w:3},SE:{p:1,s:.9,c:'#2f3a26',t:'#fecc00',w:3}});
for(const f of A2)AIRX[f]={b:'#80878b',p:3,h:{b:'#4b5143',p:3}};
Object.assign(CHAMP_TINT,{BR:'#4a5a34',VE:'#5a5a3a',MX:'#4f5a3a',AR:'#5a5a3e',CO:'#4a5a34',CL:'#555a40',SE:'#43503a'});
const FL={
 BR:(r,x,c,W,H)=>{r('#009c3b',0,0,W,H);x.fillStyle='#ffdf00';x.beginPath();x.moveTo(W/2,6);x.lineTo(W-10,H/2);x.lineTo(W/2,H-6);x.lineTo(10,H/2);x.closePath();x.fill();c(W/2,H/2,15,'#002776');},
 VE:(r,x,c,W,H)=>{r('#ffcc00',0,0,W,H/3+1);r('#00247d',0,H/3,W,H/3+1);r('#cf142b',0,2*H/3,W,H/3+1);for(let i=0;i<8;i++){const a=Math.PI+i*Math.PI/7;c(W/2+Math.cos(a)*22,H/2-Math.sin(a)*(-8)+4,1.8,'#fff');}},
 MX:(r,x,c,W,H)=>{r('#006847',0,0,W/3+1,H);r('#fff',W/3,0,W/3+1,H);r('#ce1126',2*W/3,0,W/3+1,H);c(W/2,H/2,9,'#8a5a2b');c(W/2,H/2,5,'#4a7a2b');},
 AR:(r,x,c,W,H)=>{r('#74acdf',0,0,W,H);r('#fff',0,H/3,W,H/3+1);c(W/2,H/2,7,'#f6b40e');},
 CO:(r,x,c,W,H)=>{r('#fcd116',0,0,W,H/2);r('#003893',0,H/2,W,H/4);r('#ce1126',0,3*H/4,W,H/4+1);},
 CL:(r,x,c,W,H)=>{r('#fff',0,0,W,H/2);r('#d52b1e',0,H/2,W,H/2+1);r('#0039a6',0,0,W/3,H/2);x.fillStyle='#fff';x.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?4:10;x.lineTo(W/6+Math.cos(a)*rr,H/4+Math.sin(a)*rr);}x.closePath();x.fill();},
 SE:(r,x,c,W,H)=>{r('#006aa7',0,0,W,H);r('#fecc00',W*.3,0,W*.12,H);r('#fecc00',0,H*.42,W,H*.16);}};
for(const f of A2){Object.defineProperty(FLAGTEX,f,{configurable:true,enumerable:true,
  get(){const W=120,H=72,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const r=(col,a,b,w,h)=>{x.fillStyle=col;x.fillRect(a,b,w,h);};const ci=(cx,cy,rad,col)=>{x.fillStyle=col;x.beginPath();x.arc(cx,cy,rad,0,7);x.fill();};
    FL[f](r,x,ci,W,H);x.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<W;i+=6)x.fillRect(i,0,3,H);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    Object.defineProperty(FLAGTEX,f,{value:t,writable:true,configurable:true,enumerable:true});return t;},
  set(v){Object.defineProperty(FLAGTEX,f,{value:v,writable:true,configurable:true,enumerable:true});}});}
// names (militia, radio, adjective), home maps
Object.assign(TK_ADJ,{BR:'Brazilian',VE:'Venezuelan',MX:'Mexican',AR:'Argentine',CO:'Colombian',CL:'Chilean',SE:'Swedish'});
for(const[m,l]of Object.entries({caribbean:['BR','VE','MX','CO'],heartland:['MX','AR'],delta:['VE'],zagros:['AR','CO','CL'],coral:['CL'],arctic:['SE'],taiga:['SE'],fulda:['SE'],anatolia:['AR']})){const M=MAPS[m];if(M){M.home=M.home||[];for(const f of l)if(!M.home.includes(f))M.home.push(f);}}
}
