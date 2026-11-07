// 13y-gcoal.js — lane G B6: ALARM (EU4 "aggressive expansion") + COALITIONS. Taking land alarms the world; past the threshold neighbours who dislike you band together,
// sour on you, and JOIN any war you start (hooked in glgDeclare via gcoJoin). Counter-play: Ease tensions (Diplomatic points) or just stop conquering (alarm fades 5%/month);
// cost: alarm also drops your opinion with everyone a little. Equal for every nation. State: N.ae (alarm), N.aeP (provinces seen last month), GC.coal={target:[members]}. Saved, deterministic.
const AE_PER=3, AE_THR=8, AE_DECAY=.05, AE_EASE=40, AE_EASE_DIP=40;
function aeN(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.ae===undefined){N.ae=0;N.aeP=-1;}return N;}
function aeCount(c){let n=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)n++;return n;}
function gcoMembers(t){return (GC.coal&&GC.coal[t])||[];}
function gcoForm(t){GC.coal=GC.coal||{};const mem=[];
  for(const o of Object.keys(GC.nat).sort()){const N=GC.nat[o];if(o===t||N.dead||!N.ai||grAllied(o,t)||grVasPair&&grVasPair(o,t))continue;
    if(gdOp(o,t)<10||gdNear(o,t)||gdNear(t,o)){if(gdOp(o,t)<=25)mem.push(o);}}
  if(mem.length<2)return false;GC.coal[t]=mem;for(const o of mem)gdRel(o,t,-10);
  grLog('A coalition forms against '+gdNatName(t)+': '+mem.slice(0,4).map(gdNatName).join(', ')+(mem.length>4?' and '+(mem.length-4)+' more':'')+' fear its expansion.',t);
  if(t===GC.me)try{gevToast(['⚔ A coalition has formed against us ('+mem.length+' nations)']);}catch(e){}return true;}
function gcoEase(c){const N=aeN(c);if(!N||!N.pp)return 'Not available.';if(N.ae<=0)return 'Nobody is alarmed.';if(N.pp.dip<AE_EASE_DIP)return 'Needs '+AE_EASE_DIP+' Diplomatic points.';
  N.pp.dip-=AE_EASE_DIP;N.ae=Math.max(0,N.ae-AE_EASE);for(const o of gcoMembers(c))gdRel(o,c,4);if(N.ae<AE_THR/2&&GC.coal&&GC.coal[c]){delete GC.coal[c];if(c===GC.me)grLog('Tensions eased: the coalition against us dissolves.',c);}return '';}
// called from glgDeclare: the aggressor's coalition members join the victim's side
function gcoJoin(a,b){const m=gcoMembers(a);for(const g of m){if(g===a||g===b||!GC.nat[g]||GC.nat[g].dead||grAtWar(g,a)||grAllied(g,a)||gdTruce(g,a))continue;
    GC.war[grWk(g,a)]=1;GC.wsT=GC.wsT||{};GC.wsT[grWk(g,a)]=GC.turn;grLog(gdNatName(g)+' joins the coalition war against '+gdNatName(a)+'.',g);}}
function gcoMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;aeN(c);const n=aeCount(c);
    if(N.aeP>=0&&n>N.aeP){const g=(n-N.aeP)*AE_PER;N.ae+=g;for(const o of Object.keys(GC.nat).sort())if(o!==c&&!GC.nat[o].dead)gdRel(o,c,-g*.3);}
    N.aeP=n;N.ae=Math.max(0,N.ae*(1-AE_DECAY)-.1);
    if(N.ae>=AE_THR&&!gcoMembers(c).length)gcoForm(c);
    else if(N.ae<AE_THR/2&&gcoMembers(c).length){delete GC.coal[c];if(c===GC.me)grLog('The coalition against us has dissolved.',c);}
    else if(c!==GC.me&&N.ae>=AE_THR&&N.pp&&N.pp.dip>=AE_EASE_DIP+50)gcoEase(c);}}
GMOD_HOOKS.push(gcoMonth);
npTab('coal','⚔','Alarm & coalitions',(code,body,c)=>{const N=aeN(code),own=c.own&&code===GC.me,m=gcoMembers(code),a=Math.round(N.ae*10)/10;const col=a>=AE_THR?'#ff9a8a':a>=AE_THR/2?'#e8d28a':'#8fd18f';
  body.innerHTML='<div style="font-size:24px"><b style="color:'+col+'">Alarm '+a+'</b> <span style="opacity:.7;font-size:15px">(coalition forms at '+AE_THR+')</span></div>'+
  '<div style="opacity:.85;margin:8px 0">Every province taken adds alarm, souring the world on you. Past the limit, nations that dislike you or border you form a coalition and join any war you start. Alarm fades slowly if you stop conquering.</div>'+
  '<div style="margin:8px 0"><b>Coalition:</b> '+(m.length?m.map(gdNatName).join(', '):'none')+'</div>';
  const inC=Object.keys(GC.coal||{}).filter(t=>GC.coal[t].includes(code));if(inC.length)body.insertAdjacentHTML('beforeend','<div style="margin:8px 0"><b>'+gdNatName(code)+' sits in the coalition against:</b> '+inC.map(gdNatName).join(', ')+'</div>');
  if(own){const b=document.createElement('button');b.textContent='Ease tensions (-'+AE_EASE_DIP+' Dip, -'+AE_EASE+' alarm)';b.style.cssText='font-size:15px;padding:4px 14px;cursor:pointer';b.disabled=!!(gcoEase&&(N.ae<=0||!N.pp||N.pp.dip<AE_EASE_DIP));b.onclick=()=>{const e=gcoEase(code);if(e)grLog(e,code);npDraw();};body.appendChild(b);}});
alAdd('coal','⚔','Coalition',c=>{const m=gcoMembers(c);return m.length?{n:m.length,tip:'a coalition of '+m.length+' nations stands against us',go:()=>npOpen(c,'coal')}:null;});
