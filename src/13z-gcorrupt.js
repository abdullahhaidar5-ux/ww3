// 13z-gcorrupt.js — lane B5b slice 2: CORRUPTION (EU4 economy). N.cor = corruption % (0..25), all effects are GMOD rows (upkeep/income/unrest).
// Who reacts: overspending, low stability, high inflation, huge empires and war profiteering push it up; calm competent months and an anti-corruption
// drive (Political points) bring it down. Second order: corruption raises army upkeep, leaks income and breeds unrest; Home front/estates read those rows.
// Counter-play: purge costs Political points; AI does it when it can. Deterministic (state only), monthly via GMOD_HOOKS.
const GCO_MAX=25,GCO_COST=50;
GMOD_COND.cor=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&Math.min(5,Math.floor((N.cor||0)/5))===+arg);};
for(let b=1;b<=5;b++){const s='Corruption ('+(b*5)+'%+)';
  GMOD_ROWS.push({id:'cor_up'+b,src:s,scope:'nation',stat:'upkeep',mul:1+.03*b,cond:'cor:'+b},
    {id:'cor_inc'+b,src:s,scope:'nation',stat:'income',add:-.012*b,cond:'cor:'+b},
    {id:'cor_un'+b,src:s,scope:'nation',stat:'unrest',add:b,cond:'cor:'+b});}
GMOD_STATS.unrest=GMOD_STATS.unrest||'Unrest';
function gcoN(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.cor===undefined)N.cor=GCO_START(c);return N;}
function GCO_START(c){ // realistic opening level by nation wealth tier (rough, neutral): richer/stabler states start cleaner
  const r=typeof GR_REAL!=='undefined'&&GR_REAL.n&&GR_REAL.n[c],g=r?r[0]:.5;return g>=2?3:g>=.8?6:10;}
function gcoPressure(c){const N=GC.nat[c],out=[];
  if((N.inc||0)<0&&N.cash<=0)out.push(['Overspending, unpaid officials',1.2]);
  if((N.stab|0)<=-1)out.push(['Low stability',.8]);
  if((N.infl||0)>=10)out.push(['High inflation',.5]);
  const np=Object.keys(GC.prov||{}).filter(p=>GC.prov[p].o===c).length;if(np>40)out.push(['Overstretched administration ('+np+' provinces)',.5]);
  if((N.stab|0)>=2)out.push(['Strong, stable government',-.8]);
  if(!out.length)out.push(['Steady administration',-.3]);return out;}
function gcoPurge(c){const N=gcoN(c);if(!N||!N.pp)return 'Not available.';if(N.cor<=0)return 'There is no corruption.';
  if(N.pp.pol<GCO_COST)return 'Needs '+GCO_COST+' Political points.';N.pp.pol-=GCO_COST;N.cor=Math.max(0,N.cor-5);GMOD_C.cache.clear();
  if(c===GC.me)grLog('An anti-corruption drive cuts corruption to '+Math.round(N.cor)+'%.',c);return '';}
function gcrMonth(){if(!GC)return;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;gcoN(c);if(N.coT===GC.turn)continue;N.coT=GC.turn;
    N.cor=Math.max(0,Math.min(GCO_MAX,N.cor+gcoPressure(c).reduce((s,x)=>s+x[1],0)));
    if(c!==GC.me&&N.cor>=10&&N.pp&&N.pp.pol>=GCO_COST+40)gcoPurge(c);}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(gcrMonth);
npTab('cor','🕳','Corruption',(code,body,c)=>{const N=gcoN(code),own=c.own&&code===GC.me,v=Math.round(N.cor*10)/10;
  const col=v<5?'#8fd18f':v<15?'#e8d27a':'#ff9a8a';
  let h='<div style="font-size:26px;margin-bottom:6px"><b style="color:'+col+'">Corruption '+v+'%</b></div>'+
   '<div style="opacity:.85;margin-bottom:8px">Every 5% raises army upkeep by 3%, trims income by 1.2% and adds unrest. Overspending, low stability, inflation and sprawling empires push it up; stable years and anti-corruption drives bring it down.</div>'+
   '<div style="margin:8px 0"><b>This month:</b> '+gcoPressure(code).map(x=>x[0]+' ('+(x[1]>0?'+':'')+x[1]+')').join(', ')+'</div>';
  const L=gmodLines('nation',code,'income').filter(s=>/Corruption/.test(s));if(L.length)h+='<div style="margin:8px 0;opacity:.85">'+L.join('<br>')+'</div>';
  body.innerHTML=h;
  if(own){const b=document.createElement('button');b.textContent='Anti-corruption drive: -5% (-'+GCO_COST+' Political points)';b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer';
    b.disabled=N.cor<=0||!N.pp||N.pp.pol<GCO_COST;b.onclick=()=>{const e=gcoPurge(code);if(e)grLog(e,code);npDraw();};body.appendChild(b);
    const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Political points: '+Math.floor(N.pp?N.pp.pol:0);body.appendChild(p);}});
alAdd('cor','🕳','Corruption',c=>{const N=gcoN(c);return N&&N.cor>=12?{n:Math.round(N.cor)+'%',tip:'corruption is high — open the Corruption tab',go:()=>npOpen(c,'cor')}:null;});
