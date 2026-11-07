// 13v-gwarsup.js — lane B4b: WAR SUPPORT, the ONE national war-support meter (0–100; this IS war weariness — A5/grand6 read wsOf(), no second meter).
// State: N.ws (meter), N.wsE (battle/capture news waiting for the monthly tick), N.wsW (months at war), N.wsRl (turn of last rally). All in GC.nat -> saved with the campaign.
// Deterministic (no random). Monthly hook on GMOD_HOOKS; effects are GMOD rows (low = fewer recruits, less income; high = more recruits).
// Morale-style numbers extend the ONE table MSTYLES at runtime (ws:{win,loss,drain,...}).
const WS_COST=40, WS_CD=6, WS_RALLY=15, WS_BASE=60;
const WS_STY={zeal:{win:3,loss:1.5,lossCap:85,drain:.3,rally:['Martyrs\' commemoration','Banners and remembrance for the fallen']},
  prof:{win:3,loss:-4,drain:.5,rally:['Military parade','Parade and honours for the army']},
  home:{win:3,loss:-4,drain:.5,drainHome:.2,drainAbroad:1.2,surge:3,rally:['Defend-the-homeland drive','Volunteer drive and fortification days']},
  fire:{win:6,loss:-8,drain:.5,rally:['Weapons showcase','Public demonstration of new fire-power']}};
for(const k of Object.keys(WS_STY)){try{if(typeof MSTYLES!=='undefined'&&MSTYLES[k])MSTYLES[k].ws=WS_STY[k];}catch(e){}}
function wsStyle(c){try{const n=grNat(c);return MORALE_STYLE[n.fac]||MORALE_STYLE[c]||'prof';}catch(e){return 'prof';}}
function wsN(c){const N=GC&&GC.nat[c];if(!N)return null;if(N.ws===undefined){N.ws=WS_BASE;N.wsE=0;N.wsW=0;N.wsRl=-99;N.wsWhy=[];}return N;}
function wsOf(c){const N=wsN(c);return N?N.ws:WS_BASE;}
GMOD_COND.ws=(k,arg)=>{const N=GC&&GC.nat[k];if(!N)return false;const v=N.ws===undefined?WS_BASE:N.ws;return arg==='low'?v<30:arg==='high'?v>=75:false;};
GMOD_ROWS.push({id:'ws_low_man',src:'Low war support',scope:'nation',stat:'manpower',mul:.85,cond:'ws:low'},
  {id:'ws_low_inc',src:'Low war support',scope:'nation',stat:'income',mul:.97,cond:'ws:low'},
  {id:'ws_high_man',src:'High war support',scope:'nation',stat:'manpower',mul:1.08,cond:'ws:high'});
// news from the map: a battle result / a province changing hands
function wsBattle(b,win){const w=win==='att'?b.an:b.dn,l=win==='att'?b.dn:b.an;const Nw=wsN(w),Nl=wsN(l);if(!Nw||!Nl)return;
  const sw=WS_STY[wsStyle(w)],sl=WS_STY[wsStyle(l)];Nw.wsE+=sw.win;Nl.wsE+=(sl.loss>0?(Nl.ws<sl.lossCap?sl.loss:0):sl.loss);}
function wsCaptured(prevO,taker){const A=wsN(taker),B=wsN(prevO);if(A)A.wsE+=2;if(B&&wsStyle(prevO)!=='zeal')B.wsE-=3;}
function wsMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;wsN(c);if(N.wsT===GC.turn)continue;N.wsT=GC.turn;
    const sk=wsStyle(c),S=WS_STY[sk]||WS_STY.prof,why=[];let d=0;
    const foes=gdEnemies(c).sort();
    if(N.wsE){d+=N.wsE;why.push(['Battles and captures',N.wsE]);N.wsE=0;}
    const home=GC.armies.filter(a=>foes.includes(a.o)&&GC.prov[a.at]&&GC.prov[a.at].o===c&&a.u.length);const inv=new Set(home.map(a=>a.at)).size;
    if(foes.length){N.wsW++;let dr=S.drain||.5;if(sk==='home')dr=inv?S.drainHome:S.drainAbroad;dr+=Math.min(1.5,N.wsW*.04);d-=dr;why.push(['War weariness ('+N.wsW+' months)',-dr]);
      if(inv){const x=sk==='home'?S.surge:-Math.min(4,inv);d+=x;why.push([sk==='home'?'Invaded: the nation rallies':'Enemy troops on our soil',x]);}}
    else{N.wsW=0;}
    if(N.cap>=0&&GC.prov[N.cap]&&GC.prov[N.cap].o!==c&&sk!=='zeal'){d-=3;why.push(['The capital has fallen',-3]);}
    const tgt=Math.max(10,Math.min(95,WS_BASE+100*gmod('nation',c,'warSupport')));const pull=(tgt-N.ws)*(foes.length?.1:.2);d+=pull;why.push(['Mood drifts toward '+Math.round(tgt)+'%',+pull.toFixed(1)]);
    N.ws=Math.max(0,Math.min(100,N.ws+d));N.wsWhy=why;
    if(N.ws<20){for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].un<60)GC.prov[p.i].un=Math.min(100,GC.prov[p.i].un+2);if(c===GC.me&&N.wsA!==GC.turn){N.wsA=GC.turn;grLog('War support is very low — unrest is rising.',c);}}
    if(N.ws<10&&foes.length&&typeof glgPeace==='function'){glgPeace(c,foes[0]);N.ws=Math.max(N.ws,18);grLog('Forced peace talks: '+GCM.nats.get(c).name+' cannot go on and makes peace with '+GCM.nats.get(foes[0]).name+'.',c);}
    if(c!==GC.me&&foes.length&&N.ws<45&&N.pp&&N.pp.pol>=WS_COST+40)wsRally(c);}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(wsMonth);
// rallies — the ONE function (player button and AI); style-flavoured, equal value, cooldown
function wsRally(c){const N=wsN(c);if(!N||!N.pp)return 'Not available.';if(GC.turn-N.wsRl<WS_CD)return 'Another rally is possible in '+(WS_CD-(GC.turn-N.wsRl))+' months.';
  if(N.pp.pol<WS_COST)return 'Needs '+WS_COST+' Political points.';N.pp.pol-=WS_COST;N.wsRl=GC.turn;N.ws=Math.min(100,N.ws+WS_RALLY);
  if(c===GC.me)grLog((WS_STY[wsStyle(c)]||WS_STY.prof).rally[0]+': war support +'+WS_RALLY+'.',c);return '';}
// header chip in the nation panel
if(typeof NP_HDR!=='undefined')NP_HDR.push((code,stat)=>{const v=Math.round(wsOf(code));stat('🔥','War support',v+'%','National war support: low = unrest, fewer recruits, forced peace');});
npTab('home','🔥','Home front',(code,body,c)=>{const N=wsN(code),own=c.own&&code===GC.me,v=Math.round(N.ws),sk=wsStyle(code),S=WS_STY[sk]||WS_STY.prof;
  const col=v>=75?'#8fd18f':v<30?'#ff9a8a':'#e8d28a';
  const lines=gmodLines('nation',code,'warSupport');
  let h='<div style="font-size:26px;margin-bottom:4px"><b style="color:'+col+'">War support '+v+'%</b></div>'+
  '<div style="height:16px;background:#1b2a3a;border:1px solid #34506a;border-radius:8px;overflow:hidden;margin-bottom:10px"><div style="width:'+v+'%;height:100%;background:'+col+'"></div></div>'+
  '<div style="opacity:.85;margin-bottom:8px">Below 30% recruits and income suffer, below 20% provinces slide into unrest, below 10% the government is forced to make peace. Above 75% more recruits come forward. '+
  (sk==='zeal'?'Zealous nations draw strength from their fallen and never lose heart over a lost capital.':sk==='home'?'Home defenders surge when invaded but tire of wars abroad.':sk==='fire'?'Firepower-reliant nations cheer clean victories and sour quickly on casualties.':'Professional nations stay steady, with a slow drain from losses.')+'</div>'+
  '<div style="margin:8px 0"><b>This month:</b> '+(N.wsWhy||[]).map(x=>x[0]+' ('+(x[1]>0?'+':'')+(Math.round(x[1]*10)/10)+')').join(', ')+'</div>'+
  (lines.length?'<div style="margin:8px 0;opacity:.85"><b>Pulling the mood toward its target:</b> '+lines.join(', ')+'</div>':'');
  body.innerHTML=h;
  if(own){const left=WS_CD-(GC.turn-N.wsRl),b=document.createElement('button');b.textContent=S.rally[0]+' (-'+WS_COST+' Political points, +'+WS_RALLY+')';b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer';
    b.disabled=left>0||!N.pp||N.pp.pol<WS_COST;b.title=S.rally[1];b.onclick=()=>{const e=wsRally(code);if(e)grLog(e,code);npDraw();};body.appendChild(b);
    const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Political points: '+Math.floor(N.pp?N.pp.pol:0)+(left>0?' · next rally in '+left+' months':'');body.appendChild(p);}});
alAdd('ws','🔥','War support',c=>{const N=wsN(c);return N&&N.ws<35&&gdEnemies(c).length?{n:Math.round(N.ws)+'%',tip:'war support is low — open the Home front tab',go:()=>npOpen(c,'home')}:null;});
