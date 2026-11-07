// 13m-grandstab.js — lane B4 slice 1: STABILITY (EU4-style -3..+3). Data-driven: stability is a state value (N.stab) read by modifier rows
// (income, war support); a monthly hook (GMOD_HOOKS) moves it; Political points raise it (gstRaise = the ONE function, player button and AI).
// Deterministic: only state, no random. Cores / estates are the next slices (same file, same pattern).
const GST_COST=50, GST_MIN=-3, GST_MAX=3;
GMOD_COND.stab=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&(N.stab|0)===+arg);};
for(let v=GST_MIN;v<=GST_MAX;v++){if(!v)continue;const s=(v>0?'Stable (+':'Unstable (')+v+')';
  GMOD_ROWS.push({id:'stab_inc'+v,src:s,scope:'nation',stat:'income',add:.04*v,cond:'stab:'+v});
  GMOD_ROWS.push({id:'stab_ws'+v,src:s,scope:'nation',stat:'warSupport',add:.03*v,cond:'stab:'+v});}
function gstN(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.stab===undefined){N.stab=0;N.stP=0;}return N;}
function gstRaise(c){const N=gstN(c);if(!N||!N.pp)return 'Not available.';if(N.stab>=GST_MAX)return 'Stability is already at its maximum.';
  if(N.pp.pol<GST_COST)return 'Needs '+GST_COST+' Political points.';N.pp.pol-=GST_COST;N.stab++;N.stP=0;GMOD_C.cache.clear();
  if(c===GC.me)grLog('Raised stability to '+(N.stab>0?'+':'')+N.stab+'.',c);return '';}
// why stability is pushed up or down this month (shown in the tab): [text, delta]
function gstPressure(c){const N=GC.nat[c],out=[];const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c);
  const hot=ps.filter(p=>GC.prov[p.i].un>50).length;if(ps.length&&hot/ps.length>.25)out.push(['Many provinces in unrest',-1]);
  if(N.cash<0)out.push(['The treasury is empty',-1]);
  if(!out.length)out.push(['Calm month',.25]);return out;}
function gstMonth(){if(!GC)return;for(const c of Object.keys(GC.nat)){const N=GC.nat[c];if(N.dead)continue;gstN(c);if(N.stT===GC.turn)continue;N.stT=GC.turn;
    N.stP+=gstPressure(c).reduce((s,x)=>s+x[1],0);
    if(N.stP<=-3&&N.stab>GST_MIN){N.stab--;N.stP=0;if(c===GC.me)grLog('Stability fell to '+N.stab+' — unrest and an empty treasury weigh on the country.',c);}
    else if(N.stP>=3){N.stP=0;if(N.stab<0)N.stab++;}
    N.stP=Math.max(-6,Math.min(6,N.stP));
    if(c!==GC.me&&N.pp&&N.stab<1&&N.pp.pol>=GST_COST+30)gstRaise(c);}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(gstMonth);
GMOD_STATS.warSupport='War support';
npTab('stab','⚖','Stability',(code,body,c)=>{const N=gstN(code),own=c.own&&code===GC.me;const v=N.stab|0;
  const col=v>0?'#8fd18f':v<0?'#ff9a8a':'#dfe8f0';
  let h='<div style="font-size:26px;margin-bottom:6px"><b style="color:'+col+'">Stability '+(v>0?'+':'')+v+'</b> <span style="font-size:15px;opacity:.7">range -3 … +3</span></div>'+
  '<div style="opacity:.85;margin-bottom:8px">Each point of stability changes income by 4% and war support by 3%. It slips when many provinces are in unrest or the treasury is empty, and recovers slowly in calm months.</div>'+
  '<div style="margin:8px 0"><b>This month:</b> '+gstPressure(code).map(x=>x[0]+' ('+(x[1]>0?'+':'')+x[1]+')').join(', ')+'</div>';
  body.innerHTML=h;
  if(own){const b=document.createElement('button');b.textContent='Raise stability (-'+GST_COST+' Political points)';b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer';
    b.disabled=v>=GST_MAX||!N.pp||N.pp.pol<GST_COST;b.onclick=()=>{const e=gstRaise(code);if(e&&typeof grLog==='function')grLog(e,code);npDraw();};body.appendChild(b);
    const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Political points: '+Math.floor(N.pp?N.pp.pol:0);body.appendChild(p);}});
alAdd('stab','⚖','Stability',c=>{const N=gstN(c);return N&&N.stab<GST_MAX&&N.pp&&N.pp.pol>=GST_COST&&N.stab<1?{n:'+1',tip:'you can raise stability — open the Stability tab',go:()=>npOpen(c,'stab')}:null;});
