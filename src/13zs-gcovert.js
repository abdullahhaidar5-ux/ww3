// 13zs-gcovert.js — lane A RG3 slice 2: SABOTAGE + COUNTER-INTELLIGENCE (the covert-action system; spies in 13-grand.js grSpy are its first action).
// Who reacts: the target loses oil/rail/factory output (GMOD rows) for 3 months; AI nations at war sabotage each other and switch counter-intelligence on after being hit;
// a caught saboteur sours the target's opinion of the sender (and a little its allies') and loses the spy ring in that country. Second order: income down -> less cash for
// armies/upkeep, +1 unrest while the damage lasts; the target blames the right enemy only if the operation was exposed (otherwise "unknown saboteurs").
// Counter-play: Counter-intelligence ($150/month) halves success and doubles exposure; a garrison army cannot stop it, only security can. Cost: $600 per attempt, spent even on failure.
// State: N.sabU (month index the damage ends), N.ci (1 = counter-intel on), N.sabN (hits suffered), GC.covT (month guard). Deterministic: grRng(seed, turn, codes). Monthly via GMOD_HOOKS.
const GCV_COST=600,GCV_M=3,GCV_CI=150,GCV_BASE=.62,GCV_EXPO=.22;
GMOD_COND.cov=(k,arg)=>{const N=GC&&GC.nat[k];return !!N&&arg==='sab'&&(N.sabU|0)>=GC.turn&&GC.turn>0;};
GMOD_ROWS.push({id:'cov_sab_inc',src:'Sabotage',scope:'nation',stat:'income',mul:.93,cond:'cov:sab'},{id:'cov_sab_up',src:'Sabotage',scope:'nation',stat:'upkeep',mul:1.06,cond:'cov:sab'},
  {id:'cov_sab_un',src:'Sabotage',scope:'nation',stat:'unrest',add:1,cond:'cov:sab'});
GMOD_STATS.unrest=GMOD_STATS.unrest||'Unrest';
function gcvH(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h|0;}
function gcvRoll(a,t,k){return grRng((GC.seed|0)^gcvH(a+'>'+t+'#'+k)^(GC.turn*7919))();}
function gcvActive(t){const N=GC&&GC.nat[t];return !!N&&(N.sabU|0)>=GC.turn;}
function gcvChance(a,t){let p=GCV_BASE;if(GC.nat[t].ci)p*=.5;if(GC.spy&&(GC.spy[a+'>'+t]|0)>=GC.turn)p+=.12;return Math.min(.9,p);}
function gcvSabotage(a,t){const A=GC&&GC.nat[a],T=GC&&GC.nat[t];if(!A||!T||A.dead||T.dead||a===t)return 'Not available.';
  if(grAllied(a,t))return 'You do not sabotage an ally.';if(gcvActive(t))return 'Their networks are already burning.';if(A.cash<GCV_COST)return 'Needs $'+GCV_COST+'.';
  A.cash-=GCV_COST;GC.cov=GC.cov||{};const win=gcvRoll(a,t,'win')<gcvChance(a,t);let expo=gcvRoll(a,t,'exp')<GCV_EXPO*(T.ci?2:1)*(grAtWar(a,t)?.5:1);if(!win&&gcvRoll(a,t,'f')<.5)expo=true;
  const an=GCM.nats.get(a).name,tn=GCM.nats.get(t).name;
  if(win){T.sabU=GC.turn+GCV_M-1;T.sabN=(T.sabN|0)+1;T.sabT=GC.turn;GMOD_C.cache.clear();
    grLog('Sabotage inside '+tn+': pipelines, rail and depots hit until '+grMonStr(GC.turn+GCV_M)+(expo?' — our hand was seen.':'.'),a);
    const foes=gdEnemies(t).sort();grLog('Sabotage in '+tn+': power, rail and fuel depots hit (income down until '+grMonStr(GC.turn+GCV_M)+'). '+(expo?'Traced to '+an+'.':foes.length?'Suspects: '+GCM.nats.get(foes[0]).name+' — unproven.':'Unknown saboteurs.'),t);}
  else grLog('Our saboteurs in '+tn+' failed'+(expo?' and were caught.':' and slipped out.'),a);
  if(expo){gdRel(a,t,-30);for(const o of Object.keys(GC.nat))if(o!==a&&o!==t&&!GC.nat[o].dead&&grAllied(t,o))gdRel(a,o,-8);
    if(GC.spy&&GC.spy[a+'>'+t]!==undefined)delete GC.spy[a+'>'+t];GR_SEEN=null;
    if(t===GC.me||a===GC.me)grLog(an+' caught sabotaging '+tn+' — the world is told; opinion of '+an+' falls.',t===GC.me?t:a);}
  return '';}
function gcvCI(c,on){const N=GC&&GC.nat[c];if(!N||N.dead)return 'Not available.';N.ci=on?1:0;GMOD_C.cache.clear();return '';}
function gcvMonth(){if(!GC||GC.covT===GC.turn)return;GC.covT=GC.turn;
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;
    if(N.ci){if(N.cash>=GCV_CI)N.cash-=GCV_CI;else N.ci=0;}
    if(c===GC.me)continue;
    const foes=gdEnemies(c).sort();
    if(!N.ci&&(N.sabN|0)>0&&(foes.length||GC.turn-(N.sabT|0)<12)&&N.cash>GCV_CI*8)N.ci=1;           // AI answers a hit with security
    else if(N.ci&&!foes.length&&GC.turn-(N.sabT|0)>=6)N.ci=0;
    if(foes.length&&N.cash>GCV_COST*4){const t=foes[(gcvH(c+GC.turn)>>>0)%foes.length];if(!gcvActive(t)&&gcvRoll(c,t,'ai')<.3)gcvSabotage(c,t);}}
  GMOD_C.cache.clear();}
GMOD_HOOKS.push(gcvMonth);
GNT_W.gcvSabotage=0;GNT_W.gcvCI=0;
function gcvTargets(c){const L=Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&!grAllied(c,o));
  L.sort((x,y)=>(grAtWar(c,y)-grAtWar(c,x))||(gdOp(c,x)-gdOp(c,y))||(x<y?-1:1));return L.slice(0,8);}
npTab('cov','🕵','Intelligence',(code,body,c)=>{const N=GC.nat[code],own=c.own&&code===GC.me;
  let h='<div style="font-size:26px;margin-bottom:6px"><b>'+(N.ci?'Counter-intelligence ON':'Counter-intelligence off')+'</b></div>'+
   '<div style="opacity:.85;margin-bottom:8px">Spies reveal an enemy\'s armies. Sabotage ($'+GCV_COST+') cuts a rival\'s income 7% and raises its upkeep and unrest for '+GCV_M+' months, but it can be exposed and then the world turns against the sender. Counter-intelligence ($'+GCV_CI+'/month) halves enemy sabotage and doubles the chance they are caught. The AI at war does the same to you.</div>';
  if(gcvActive(code))h+='<div style="margin:8px 0;color:#ff9d8e">Sabotage damage until '+grMonStr(N.sabU+1)+' ('+(N.sabN|0)+' hit'+((N.sabN|0)===1?'':'s')+' so far).</div>';
  body.innerHTML=h;if(!own)return;
  const mk=(t,fn)=>{const b=document.createElement('button');b.textContent=t;b.type='button';b.style.cssText='font-size:15px;padding:4px 12px;cursor:pointer;margin:0 8px 6px 0';b.onclick=()=>{const e=fn();if(e)grLog(e,code);guTop();npDraw();};return b;};
  body.appendChild(mk(N.ci?'Stand down counter-intelligence':'Start counter-intelligence ($'+GCV_CI+'/month)',()=>gcvCI(code,!N.ci)));
  for(const t of gcvTargets(code)){const row=document.createElement('div');row.style.cssText='margin:6px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    const l=document.createElement('span');l.style.cssText='min-width:170px';l.textContent=GCM.nats.get(t).name+(grAtWar(code,t)?' (at war)':'')+(gcvActive(t)?' — burning':'');row.appendChild(l);
    row.appendChild(mk('Spies $'+GR_SPY_COST,()=>grSpy(code,t)));row.appendChild(mk('Sabotage $'+GCV_COST+' · '+Math.round(gcvChance(code,t)*100)+'%',()=>gcvSabotage(code,t)));body.appendChild(row);}});
alAdd('cov','🕵','Sabotage',c=>gcvActive(c)&&c===GC.me?{n:1,tip:'Sabotage is hurting our income — start counter-intelligence',go:()=>npOpen(c,'cov')}:null);
