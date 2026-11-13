// 13v-gwarsup.js — lane B4b: WAR SUPPORT, the ONE national war-support meter (0–100; this IS war weariness — A5/grand6 read wsOf(), no second meter).
// State: N.ws (meter), N.wsE (battle/capture news waiting for the monthly tick), N.wsW (months at war), N.wsRl (turn of last rally). All in GC.nat -> saved with the campaign.
// Deterministic (no random). Monthly hook on GMOD_HOOKS; effects are GMOD rows (low = fewer recruits, less income; high = more recruits).
// Morale-style numbers extend the ONE table MSTYLES at runtime (ws:{win,loss,drain,...}).
const WS_COST=40, WS_CD=6, WS_RALLY=15, WS_BASE=60;
const WS_STY={zeal:{win:3,loss:1.5,lossCap:85,drain:.3,rally:['Martyrs\' commemoration','Banners and remembrance for the fallen']},
  prof:{win:3,loss:-4,drain:.5,rally:['Military parade','Parade and honors for the army']},
  home:{win:3,loss:-4,drain:.5,drainHome:.2,drainAbroad:1.2,surge:3,rally:['Defend-the-homeland drive','Volunteer drive and fortification days']},
  fire:{win:6,loss:-8,drain:.5,rally:['Weapons showcase','Public demonstration of new fire-power']}};
for(const k of Object.keys(WS_STY)){try{if(typeof MSTYLES!=='undefined'&&MSTYLES[k])MSTYLES[k].ws=WS_STY[k];}catch(e){}}
// GOVERNMENT TYPES (queue "War support at home", slice 1). The same news moves the public differently by how a country is governed (real 2026 families, simplified; orch/REAL-2026.md "War support at home"):
//   loss = how hard bad battle news lands · wear = monthly war weariness · rally = rally-round-the-flag in the first WS_RALLY_M months after enemy troops enter the country
//   dem  Democracy (free press, elections: `EL_DEM` in 13zw): losses land hardest, long wars abroad tire fastest, strongest rally when attacked; no news restrictions; protests start early (support < 30).
//   mon  Monarchy · theo Theocracy · auth Presidential state: news is managed, so losses land softer; below 25 support in wartime: strikes (income -5%).
//   party Party state: losses barely show at first, but after WS_LEAK months of war the truth leaks and weariness jumps.
//   junta Military-led government: defeats are its own failure - below 25 support in wartime the officer corps splits (army/security estate loyalty -2 a month -> the estate crises and coups of 13o).
//   Counter-play: wsCensor ("Restrict war news", not for democracies): -WS_CEN_COST Political points, WS_CEN_M months of halved bad news and lighter weariness, then a backlash (-WS_CEN_BACK) and a cooldown. AI uses it like the rally.
const WS_GOVT={dem:{n:'Democracy',loss:1.5,wear:1.3,rally:4,cens:0,line:'Free press and elections: losses land hard and long wars abroad tire people fast, but the country rallies strongly when attacked. Low war support costs the government the next election.'},
  mon:{n:'Monarchy',loss:.8,wear:.8,rally:2,cens:1,line:'The court manages the news, so losses land softer. Very low support in wartime brings strikes.'},
  theo:{n:'Theocracy',loss:.6,wear:.7,rally:3,cens:1,line:'Faith and the pulpit carry the war effort: losses land softest. Very low support in wartime brings strikes.'},
  party:{n:'Party state',loss:.5,wear:.6,rally:2,cens:1,leak:18,line:'The party controls the news: losses barely show at first, but after a year and a half of war the truth leaks and weariness jumps.'},
  junta:{n:'Military-led government',loss:1.2,wear:1,rally:1,cens:1,split:1,line:'The army rules, so every defeat is its own failure: very low support in wartime splits the officer corps.'},
  auth:{n:'Presidential state',loss:.9,wear:.9,rally:2,cens:1,line:'A strong presidency manages the news. Very low support in wartime brings strikes.'}};
const WS_GOV={IR:'theo',RS:'theo',DW:'theo',RV:'theo',OB:'theo',BI:'theo',AF:'theo',VA:'theo',
  SA:'mon',AE:'mon',JO:'mon',OM:'mon',QA:'mon',KW:'mon',BH:'mon',MA:'mon',BN:'mon',SZ:'mon',
  CN:'party',KP:'party',VN:'party',CU:'party',LA:'party',ER:'party',
  MM:'junta',SD:'junta',ML:'junta',BF:'junta',NE:'junta',GN:'junta',TD:'junta'};
const WS_RALLY_M=6,WS_CEN_COST=30,WS_CEN_M=6,WS_CEN_BACK=5,WS_CEN_CD=12;
function wsGov(c){if(WS_GOV[c])return WS_GOV[c];if(typeof EL_DEM!=='undefined'&&EL_DEM.includes(c))return 'dem';return 'auth';}
function wsCensor(c){const N=wsN(c);if(!N||!N.pp)return 'Not available.';if(!WS_GOVT[wsGov(c)].cens)return 'A free press cannot be told what to print.';
  if((N.wsCn|0)>GC.turn)return 'War news is already restricted.';if(N.wsCc!=null&&GC.turn<N.wsCc)return 'Possible again in '+(N.wsCc-GC.turn)+' months.';
  if(N.pp.pol<WS_CEN_COST)return 'Needs '+WS_CEN_COST+' Political points.';N.pp.pol-=WS_CEN_COST;N.wsCn=GC.turn+WS_CEN_M;N.wsCc=GC.turn+WS_CEN_M+WS_CEN_CD;
  if(c===GC.me)grLog('War news is restricted for '+WS_CEN_M+' months. Casualty lists stay out of the papers, for now.',c);return '';}
GMOD_COND.wsgov=(k,arg)=>{const N=GC&&GC.nat[k];if(!N||N.ws===undefined||arg!=='strike')return false;const g=wsGov(k);return N.ws<25&&(N.wsW|0)>0&&g!=='dem'&&g!=='junta';};
GMOD_ROWS.push({id:'ws_strikes',src:'Strikes against the war',scope:'nation',stat:'income',mul:.95,cond:'wsgov:strike'});
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
    const sk=wsStyle(c),S=WS_STY[sk]||WS_STY.prof,why=[],gk=wsGov(c),G=WS_GOVT[gk],cen=(N.wsCn|0)>GC.turn;let d=0;
    const foes=gdEnemies(c).sort();
    if(N.wsE){const e=N.wsE<0?N.wsE*G.loss*(cen?.5:1):N.wsE;d+=e;why.push([N.wsE<0?'Bad news from the front ('+G.n.toLowerCase()+(cen?', news restricted':'')+')':'Battles and captures',e]);N.wsE=0;}
    if(N.wsCn!=null&&N.wsCn===GC.turn){d-=WS_CEN_BACK;why.push(['The real casualty lists get out',-WS_CEN_BACK]);if(c===GC.me)grLog('The restrictions on war news end. The real casualty lists get out.',c);}
    const home=GC.armies.filter(a=>foes.includes(a.o)&&GC.prov[a.at]&&GC.prov[a.at].o===c&&a.u.length);const inv=new Set(home.map(a=>a.at)).size;
    if(foes.length){N.wsW++;let dr=S.drain||.5;if(sk==='home')dr=inv?S.drainHome:S.drainAbroad;dr+=Math.min(1.5,N.wsW*.04);dr*=G.wear*(G.leak&&N.wsW>G.leak?2.6:1)*(cen?.7:1);d-=dr;why.push(['War weariness ('+N.wsW+' months)',-dr]);
      if(inv){if(N.wsIv==null)N.wsIv=GC.turn;N.wsIq=0;const fresh=GC.turn-N.wsIv<WS_RALLY_M;const x=sk==='home'?S.surge+(fresh?G.rally/2:0):fresh?G.rally:-Math.min(4,inv);d+=x;why.push([sk==='home'||fresh?'Attacked at home: the nation rallies':'Enemy troops on our soil',x]);}
      else if(N.wsIv!=null&&(N.wsIq=(N.wsIq|0)+1)>=6){N.wsIv=null;N.wsIq=0;}}
    else{N.wsW=0;N.wsIv=null;N.wsIq=0;}
    /* prices and shortages (slice 2): in wartime empty shelves and pumps turn people against the war faster than the casualty lists do. Reads the one
       economy state (13g: starve / dry / ration); voters punish it hardest, Zealous nations endure. Counter-play: end rationing, secure food and fuel, make peace. */
    if(foes.length&&N.e){const E=N.e,ps=[];let h=0;if(E.starve){h+=3;ps.push('hunger');}if(E.dry){h+=1;ps.push('no fuel');}if(E.ration){h+=1;ps.push('rationing');}
      if(h){h*=(gk==='dem'?1.5:1)*(sk==='zeal'?.5:1);d-=h;why.push(['Shortages at home: '+ps.join(', '),-h]);N.wsSh=(N.wsSh|0)+1;if(c===GC.me&&N.wsSh%4===1)grLog('Shortages at home ('+ps.join(', ')+') are turning people against the war.',c);}else N.wsSh=0;}
    if(N.cap>=0&&GC.prov[N.cap]&&GC.prov[N.cap].o!==c&&sk!=='zeal'){d-=3;why.push(['The capital has fallen',-3]);}
    const tgt=Math.max(10,Math.min(95,WS_BASE+100*gmod('nation',c,'warSupport')));const pull=(tgt-N.ws)*(foes.length?.1:.2);d+=pull;why.push(['Mood drifts toward '+Math.round(tgt)+'%',+pull.toFixed(1)]);
    N.ws=Math.max(0,Math.min(100,N.ws+d));N.wsWhy=why;
    if(N.ws<20){for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].un<60)GC.prov[p.i].un=Math.min(100,GC.prov[p.i].un+2);if(c===GC.me&&N.wsA!==GC.turn){N.wsA=GC.turn;grLog('War support is very low — unrest is rising.',c);}}
    if(foes.length&&gk==='dem'&&N.ws<30&&N.ws>=20){let k=0;for(const p of GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c).sort((a,b)=>b.dev-a.dev||a.i-b.i)){if(k++>=3)break;if(GC.prov[p.i].un<60)GC.prov[p.i].un=Math.min(100,GC.prov[p.i].un+1);}
      if(c===GC.me&&N.wsA!==GC.turn&&GC.turn%3===0){N.wsA=GC.turn;grLog('Protests against the war fill the big cities.',c);}}
    if(foes.length&&G.split&&N.ws<25&&typeof gsN==='function'){const E=gsN(c).est.army;if(E){E.loy=Math.max(0,E.loy-2);if(c===GC.me&&GC.turn%3===0)grLog('Officers blame each other for the war. The loyalty of the army is falling.',c);}}
    if(N.ws<10&&foes.length&&typeof glgPeace==='function'){if(typeof gpAIDeal==='function')gpAIDeal(foes[0],c);else glgPeace(c,foes[0]);N.ws=Math.max(N.ws,18);grLog('Forced peace talks: '+GCM.nats.get(c).name+' cannot go on and makes peace with '+GCM.nats.get(foes[0]).name+'.',c);}
    if(c!==GC.me&&foes.length&&N.ws<40&&G.cens&&N.pp&&N.pp.pol>=WS_CEN_COST+WS_COST+40)wsCensor(c);
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
  '<div style="margin:8px 0;opacity:.9"><b>'+WS_GOVT[wsGov(code)].n+'.</b> '+WS_GOVT[wsGov(code)].line+((N.wsCn|0)>GC.turn?' <span style="color:#e8d28a">War news restricted until '+(typeof grMonStr==="function"?grMonStr(N.wsCn):'month '+N.wsCn)+'.</span>':'')+'</div>'+
  '<div style="margin:8px 0"><b>This month:</b> '+(N.wsWhy||[]).map(x=>x[0]+' ('+(x[1]>0?'+':'')+(Math.round(x[1]*10)/10)+')').join(', ')+'</div>'+
  (lines.length?'<div style="margin:8px 0;opacity:.85"><b>Pulling the mood toward its target:</b> '+lines.join(', ')+'</div>':'');
  body.innerHTML=h;
  if(own){const left=WS_CD-(GC.turn-N.wsRl),b=document.createElement('button');b.textContent=S.rally[0]+' (-'+WS_COST+' Political points, +'+WS_RALLY+')';b.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer';
    b.disabled=left>0||!N.pp||N.pp.pol<WS_COST;b.title=S.rally[1];b.onclick=()=>{const e=wsRally(code);if(e)grLog(e,code);npDraw();};body.appendChild(b);
    if(WS_GOVT[wsGov(code)].cens){const cb=document.createElement('button');cb.textContent='Restrict war news (-'+WS_CEN_COST+' Political points)';cb.style.cssText='font-size:14px;padding:4px 12px;cursor:pointer;margin-left:8px';
      const ce=(N.wsCn|0)>GC.turn?'Already restricted.':N.wsCc!=null&&GC.turn<N.wsCc?'Possible again in '+(N.wsCc-GC.turn)+' months.':!N.pp||N.pp.pol<WS_CEN_COST?'Needs '+WS_CEN_COST+' Political points.':'';cb.disabled=!!ce;
      cb.title=(ce?ce+' ':'')+'For '+WS_CEN_M+' months bad news from the front counts half and war weariness is lighter. When it ends the real casualty lists get out (-'+WS_CEN_BACK+').';cb.onclick=()=>{const e=wsCensor(code);if(e)grLog(e,code);npDraw();};body.appendChild(cb);}
    const p=document.createElement('div');p.style.cssText='margin-top:8px;opacity:.75';p.textContent='Political points: '+Math.floor(N.pp?N.pp.pol:0)+(left>0?' · next rally in '+left+' months':'');body.appendChild(p);}});
alAdd('ws','🔥','War support',c=>{const N=wsN(c);return N&&N.ws<35&&gdEnemies(c).length?{n:Math.round(N.ws)+'%',tip:'war support is low — open the Home front tab',go:()=>npOpen(c,'home')}:null;});
