// 13z-gresearch.js — lane G B7: RESEARCH (spend capital points on three tracks) + CABINET (each minister's skill adds a small bonus). All effects are GMOD rows; one buy function for player and AI.
// Chain: points -> track level -> income / diplomacy points / manpower+fire support; counter-play: rivals out-research you (AI buys in fixed order); cost: the points are not spent on ideas, development or stability.
// Cabinet: 4 fictional ministers per nation (pplRoster); skill 1-3 comes from the name (same every game); Foreign->Diplomatic points, Defence->Military points, Finance->income, Interior->Political points.
// State: N.rs={gov,dip,mil} levels (saved). Deterministic.
const RS_TRACKS={gov:{n:'Governance',pool:'pol',ic:'🏛',txt:'+2% income per level'},dip:{n:'Diplomacy',pool:'dip',ic:'🕊',txt:'+4% Diplomatic points per level'},mil:{n:'Armed forces',pool:'mil',ic:'🎖',txt:'+2% manpower and +3% fire support per level'}};
const RS_COST=[40,55,70,90,110], RS_MAX=5;
for(let L=1;L<=RS_MAX;L++){GMOD_ROWS.push({id:'rs_gov'+L,src:'Governance research '+L,scope:'nation',stat:'income',add:.02,cond:'rs:gov:'+L},
  {id:'rs_dip'+L,src:'Diplomacy research '+L,scope:'nation',stat:'ppDip',add:.04,cond:'rs:dip:'+L},
  {id:'rs_man'+L,src:'Armed forces research '+L,scope:'nation',stat:'manpower',add:.02,cond:'rs:mil:'+L},
  {id:'rs_fire'+L,src:'Armed forces research '+L,scope:'nation',stat:'fireSupport',add:.03,cond:'rs:mil:'+L});}
GMOD_COND.rs=(k,arg)=>{const N=GC&&GC.nat[k];if(!N||!N.rs)return false;const [t,l]=arg.split(':');return (N.rs[t]|0)>=+l;};
const CAB=[['dip','ppDip','Foreign Affairs',.05],['mil','ppMil','Defense',.05],['pol','income','Finance',.015],['pol','ppPol','Interior',.05]]; // post -> [pool, stat, title, per skill]
function cabSkill(c,i){try{const p=pplOf(c,'minister',i);return p?(pplHash(pplName(p))%3)+1:1;}catch(e){return 1;}}
GMOD_COND.cab=(k,arg)=>{if(!GC||!GC.nat[k])return false;const [i,s]=arg.split(':');return cabSkill(k,+i)===+s;};
for(let i=0;i<CAB.length;i++)for(let s=1;s<=3;s++)GMOD_ROWS.push({id:'cab'+i+'_'+s,src:'Minister of '+CAB[i][2]+' (skill '+s+')',scope:'nation',stat:CAB[i][1],add:CAB[i][3]*s,cond:'cab:'+i+':'+s});
function rsN(c){const N=GC&&GC.nat[c];if(!N)return null;if(!N.rs)N.rs={gov:0,dip:0,mil:0};return N;}
function rsBuy(c,t){const N=rsN(c);if(!N||!RS_TRACKS[t])return 'Not available.';gidN(c);const L=N.rs[t];if(L>=RS_MAX)return 'Fully researched.';const k=RS_TRACKS[t].pool;
  if(N.pp[k]<RS_COST[L])return 'Needs '+RS_COST[L]+' '+GID_POOL[k]+' points.';N.pp[k]-=RS_COST[L];N.rs[t]=L+1;GMOD_C.cache.clear();
  if(c===GC.me)grLog('Research: '+RS_TRACKS[t].n+' reaches level '+(L+1)+'.',c);return '';}
function rsMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||c===GC.me||!N.ai)continue;rsN(c);gidN(c);
    // AI: buys the cheapest next level it can afford once its idea groups are served (keeps 60 points spare)
    for(const t of ['gov','mil','dip']){const L=N.rs[t];if(L<RS_MAX&&N.pp[RS_TRACKS[t].pool]>=RS_COST[L]+60){rsBuy(c,t);break;}}}}
GMOD_HOOKS.push(rsMonth);
npTab('res','🔬','Research & cabinet',(code,body,c)=>{const N=rsN(code),own=c.own&&code===GC.me;gidN(code);body.innerHTML='';
  const h=document.createElement('div');h.style.cssText='opacity:.85;margin-bottom:8px';h.textContent='Research costs capital points, so it competes with ideas, development and stability. Every nation has the same three tracks and the same costs.';body.appendChild(h);
  for(const t of Object.keys(RS_TRACKS)){const T=RS_TRACKS[t],L=N.rs[t],row=document.createElement('div');row.style.cssText='display:flex;gap:12px;align-items:center;margin:6px 0';
    row.innerHTML='<span style="min-width:200px">'+T.ic+' <b>'+T.n+'</b> — level '+L+'/'+RS_MAX+'</span><span style="opacity:.75;min-width:260px">'+T.txt+'</span>';
    if(own){const b=document.createElement('button');b.style.cssText='font-size:15px;padding:4px 12px;cursor:pointer';b.textContent=L>=RS_MAX?'Done':'Research (-'+RS_COST[L]+' '+GID_POOL[T.pool]+')';b.disabled=L>=RS_MAX||N.pp[T.pool]<RS_COST[L];b.onclick=()=>{const e=rsBuy(code,t);if(e)grLog(e,code);npDraw();};row.appendChild(b);}
    body.appendChild(row);}
  const ch=document.createElement('div');ch.style.cssText='margin-top:14px';ch.innerHTML='<b>Cabinet</b> <span style="opacity:.7">(skill 1–3 from the minister; bonus to the matching pool)</span>';body.appendChild(ch);
  for(let i=0;i<CAB.length;i++){let nm='?';try{nm=pplName(pplOf(code,'minister',i));}catch(e){}const s=cabSkill(code,i),r=document.createElement('div');r.style.margin='4px 0';
    r.textContent='Minister of '+CAB[i][2]+': '+nm+' — skill '+'★'.repeat(s)+'☆'.repeat(3-s)+' ('+(CAB[i][1]==='income'?'+'+Math.round(CAB[i][3]*s*1000)/10+'% income':'+'+Math.round(CAB[i][3]*s*100)+'% '+({ppDip:'Diplomatic',ppMil:'Military',ppPol:'Political'})[CAB[i][1]]+' points')+')';body.appendChild(r);}});
alAdd('res','🔬','Research',c=>{const N=rsN(c);if(!N||c!==GC.me)return null;gidN(c);for(const t of Object.keys(RS_TRACKS)){const L=N.rs[t];if(L<RS_MAX&&N.pp[RS_TRACKS[t].pool]>=RS_COST[L]+100)return {n:'!',tip:'enough points banked to research '+RS_TRACKS[t].n,go:()=>npOpen(c,'res')};}return null;});
