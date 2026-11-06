/* ================= BATTLEFEEL view (Abdullah 2026-11-05 19:01): drifting smoke, wildfire flames, scorched ground =================
   Looks only. The sim (03g-battlefeel.js) sends FXE 'bfx' every ~2 s: wind, the densest smoke cells, burning cells and newly
   scorched cells. Flames and smoke are the game's own particles (budgeted by part()), spawned only for cells on screen, and
   they lean downwind. Scorch uses the decal pool. Nothing here touches the simulation. */
const BFV={wx:0,wy:0,smk:[],fire:[],t:0,G0:null,acc:0};
(function(){
  FXH.bfx=function(wx,wy,sm,fi,sc){if(BFV.G0!==G){BFV.G0=G;BFV.smk=[];BFV.fire=[];}BFV.wx=wx;BFV.wy=wy;BFV.smk=[];BFV.fire=[];
    const BFW=Math.ceil(MAPW/80);for(let i=0;i+1<sm.length;i+=2){const k=sm[i];BFV.smk.push([((k%BFW)+.5)*80,(((k/BFW)|0)+.5)*80,sm[i+1]/20]);}
    for(let i=0;i+1<fi.length;i+=2){const k=fi[i];BFV.fire.push([(k%GW)*CELL+CELL/2,((k/GW)|0)*CELL+CELL/2,fi[i+1]]);}
    let n=0;for(const k of sc){if(n++>40)break;try{scorch((k%GW)*CELL+CELL/2,((k/GW)|0)*CELL+CELL/2,20);}catch(_){}}};
  FXH.bfh=function(){};
  FXH.shout=function(ty,x,y,team){try{if(typeof bfShoutPlay==='function')bfShoutPlay(ty,x,y,team);}catch(_){}};
})();
function bfView(dt){if(!G||BFV.G0!==G||(!BFV.smk.length&&!BFV.fire.length))return;const B=typeof pBudget==='function'?pBudget():400;if(PARTS.length>B*.85)return;
  const gh=(x,y)=>typeof groundH==='function'?groundH(x,y):0,wx=BFV.wx,wy=BFV.wy;
  for(const [x,y,d] of BFV.smk){if(!inView(x,y,.3))continue;BFV.acc=0;if(Math.random()<dt*(1.5+5*Math.min(1,d))){const sx=x+rnd(-36,36),sy=y+rnd(-36,36);
    part({x:sx,y:sy,h:gh(sx,sy)+rnd(2,22),vx:wx*.9+rnd(-2,2),vy:wy*.9+rnd(-2,2),vh:rnd(0,3),rise:rnd(4,12),c:d>.7?[.28,.27,.25]:[.52,.51,.49],c2:[.66,.65,.62],ck:.4,s:rnd(30,52),g:4,d:rnd(3.5,6),a:Math.min(.55,.14+.3*d)});}}
  for(const [x,y,h] of BFV.fire){if(!inView(x,y,.25))continue;const fx=x+rnd(-18,18),fy=y+rnd(-18,18),g0=gh(fx,fy);
    if(Math.random()<dt*(7+4*h)){part({x:fx,y:fy,h:g0+1,vx:wx*.25,vy:wy*.25,vh:rnd(8,18),rise:rnd(14,24),add:true,c:Math.random()<.5?C_FIRE:C_FIRE2,s:rnd(8,15)*(h>=3?1.3:1),g:-3,d:rnd(.5,1),a:.85});}
    if(Math.random()<dt*2.4)part({x:fx,y:fy,h:g0+10,vx:wx*.7,vy:wy*.7,rise:rnd(24,40),c:C_DARK,c2:[.36,.35,.33],ck:.35,s:rnd(14,24),g:10,d:rnd(3,5),a:.5});}}
