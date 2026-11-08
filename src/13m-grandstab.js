// 13m-grandstab.js — lane B4 slice 1: STABILITY (EU4-style -3..+3). Data-driven: stability is a state value (N.stab) read by modifier rows
// (income, war support); a monthly hook (GMOD_HOOKS) moves it; Political points raise it (gstRaise = the ONE function, player button and AI).
// Deterministic: only state, no random. Cores / estates are the next slices (same file, same pattern).
const GST_COST=50, GST_MIN=-3, GST_MAX=3;
GMOD_COND.stab=(k,arg)=>{const N=GC&&GC.nat[k];return !!(N&&(N.stab|0)===+arg);};
for(let v=GST_MIN;v<=GST_MAX;v++){if(!v)continue;const s=(v>0?'Stable (+':'Unstable (')+v+')';
  GMOD_ROWS.push({id:'stab_inc'+v,src:s,scope:'nation',stat:'income',add:.04*v,cond:'stab:'+v});
  GMOD_ROWS.push({id:'stab_ws'+v,src:s,scope:'nation',stat:'warSupport',add:.03*v,cond:'stab:'+v});}
function gstN(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.stab===undefined){N.stab=0;N.stP=0;}return N;}
// boosting costs more the higher stability already is (EU4): 50 up to 0→+1, then +25 for every point above zero
function gstCost(c){const N=gstN(c);return GST_COST+25*Math.max(0,N?N.stab|0:0);}
function gstRaise(c){const N=gstN(c);if(!N||!N.pp)return 'Not available.';if(N.stab>=GST_MAX)return 'Stability is already at its maximum.';
  const k=gstCost(c);if(N.pp.pol<k)return 'Needs '+k+' Political points.';N.pp.pol-=k;N.stab++;N.stP=0;GMOD_C.cache.clear();
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
    if(c!==GC.me&&N.pp&&N.stab<1&&N.pp.pol>=gstCost(c)+30)gstRaise(c);}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(gstMonth);
GMOD_STATS.warSupport='War support';
// the Stability tab = the Stability & expansion screen, drawn in 13zzb-gdecide.js (gseTab) — registered here to keep its place in the tab row
npTab('stab','⚖','Stability & expansion',(code,body,c)=>gseTab(code,body,c));
alAdd('stab','⚖','Stability',c=>{const N=gstN(c);return N&&N.stab<GST_MAX&&N.pp&&N.pp.pol>=gstCost(c)&&N.stab<1?{n:'+1',tip:'you can raise stability — open the Stability tab',go:()=>npOpen(c,'stab')}:null;});
