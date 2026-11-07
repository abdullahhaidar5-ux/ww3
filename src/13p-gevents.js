// THE ONE EVENT / DECISION ENGINE (lane G, B7). Events are DATA rows in GEV_ROWS; effects are a tiny vocabulary applied by gevApply:
//   ['cash',n] money · ['un',n] unrest in all your provinces · ['man',n] manpower · ['rel',who,n] opinion with who ('$nb' = a neighbour,'$foe' = an enemy)
//   ['mod',stat,add,turns] a temporary modifier row in the ONE modifier engine (GMOD) · ['chain',id,delay] schedule a follow-up event
// State GC.ev = {last:{code:turn}, sch:[[turn,code,id]], pend:[[code,id]], hist:[[turn,code,id,opt]]} (saved with the campaign). Deterministic (seeded by turn+nation).
// Neutral wording: no real politicians or organisations; titles only.
const GEV_ROWS=[
 {id:'harvest',t:'A bumper harvest',x:'Good weather has filled the granaries across the provinces.',w:3,c:'peace',o:[{t:'Sell the surplus abroad',fx:[['cash',400]]},{t:'Store it for the army',fx:[['mod','warSupport',.04,6]]}]},
 {id:'drought',t:'Drought in the farmlands',x:'Rivers run low and prices climb in the markets.',w:3,c:'always',o:[{t:'Import grain ($300)',fx:[['cash',-300]]},{t:'Ration and endure',fx:[['un',6]]}]},
 {id:'strike',t:'Dockworkers walk out',x:'A strike at the main port is slowing the shipping of goods.',w:3,c:'peace',o:[{t:'Meet their demands ($350)',fx:[['cash',-350],['un',-3]]},{t:'Order them back to work',fx:[['un',7],['cash',150]]}]},
 {id:'oilfind',t:'New oil survey',x:'Geologists report a promising field near an existing well.',w:2,c:'always',o:[{t:'Fund development ($400)',fx:[['cash',-400],['chain','oilpay',4]]},{t:'Sell the survey rights',fx:[['cash',300]]}]},
 {id:'oilpay',t:'The new field comes online',x:'Development has paid off: output is flowing.',w:0,c:'always',o:[{t:'Excellent',fx:[['cash',900]]}]},
 {id:'recruits',t:'A wave of volunteers',x:'Young men and women queue at the recruiting offices.',w:3,c:'war',o:[{t:'Enlist them all',fx:[['man',60]]},{t:'Take only the best and pay a bonus',fx:[['man',25],['mod','warSupport',.05,8]]}]},
 {id:'warweary',t:'Weariness at home',x:'Letters from the front have turned public mood sour.',w:4,c:'war',o:[{t:'Hold rallies ($250)',fx:[['cash',-250],['un',-4]]},{t:'Press on regardless',fx:[['un',6],['mod','warSupport',-.04,6]]}]},
 {id:'spy',t:'A spy ring is uncovered',x:'Counter-intelligence has found a network feeding secrets to a rival.',w:2,c:'foe',o:[{t:'Expel the diplomats',fx:[['rel','$foe',-10],['un',-2]]},{t:'Feed them false reports',fx:[['mod','warSupport',.05,6]]}]},
 {id:'refugees',t:'Refugees at the border',x:'Families fleeing a neighbouring conflict ask for shelter.',w:2,c:'nbwar',o:[{t:'Open the border ($200)',fx:[['cash',-200],['rel','$nb',15],['man',20]]},{t:'Close the border',fx:[['rel','$nb',-8]]}]},
 {id:'trade',t:'A trade delegation arrives',x:'A neighbour proposes a commercial agreement.',w:3,c:'peace',o:[{t:'Sign the deal',fx:[['rel','$nb',12],['cash',250]]},{t:'Decline politely',fx:[]}]},
 {id:'jubilee',t:'National holiday',x:'A day of remembrance and pride is marked across the country.',w:2,c:'always',o:[{t:'Grand celebrations ($200)',fx:[['cash',-200],['mod','warSupport',.06,8],['un',-4]]},{t:'A quiet observance',fx:[['un',-2]]}]},
 {id:'earthq',t:'Earthquake damage',x:'A strong tremor has damaged buildings in a province.',w:1,c:'always',o:[{t:'Rebuild at once ($500)',fx:[['cash',-500]]},{t:'Rebuild slowly',fx:[['un',8]]}]},
 {id:'mutiny',t:'Grumbling in the barracks',x:'Pay is late and the garrison mutters about it.',w:2,c:'poor',o:[{t:'Pay them from reserves ($300)',fx:[['cash',-300]]},{t:'Promise pay next month',fx:[['un',9],['mod','warSupport',-.05,6]]}]},
 {id:'arms',t:'Arms dealers call',x:'Foreign agents offer surplus weapons at a discount.',w:2,c:'rich',o:[{t:'Buy a shipment ($500)',fx:[['cash',-500],['mod','fireSupport',.1,10]]},{t:'Refuse',fx:[]}]},
 {id:'rivalry',t:'Border incident',x:'Shots were exchanged at a frontier post. Both sides blame each other.',w:3,c:'nb',o:[{t:'Protest formally',fx:[['rel','$nb',-6]]},{t:'Offer a joint inquiry',fx:[['rel','$nb',8]]}]},
 {id:'g_oil',g:1,t:'WORLD: oil price shock',x:'A supply scare sends fuel prices soaring across the world.',w:0,c:'always',o:[{t:'Pay the premium ($400)',fx:[['cash',-400]]},{t:'Ration fuel',fx:[['un',5],['mod','fireSupport',-.05,6]]}]},
 {id:'g_cyber',g:1,t:'WORLD: cyber attack on banks',x:'Hackers have disrupted banking networks in many countries.',w:0,c:'always',o:[{t:'Restore from backups ($300)',fx:[['cash',-300]]},{t:'Freeze accounts and wait',fx:[['un',4],['cash',-100]]}]},
 {id:'g_boom',g:1,t:'WORLD: trade boom',x:'Global demand is up and merchants are busy everywhere.',w:0,c:'always',o:[{t:'Tax the windfall',fx:[['cash',500],['un',3]]},{t:'Let merchants keep it',fx:[['cash',200],['un',-3]]}]},
 {id:'g_summit',g:1,t:'WORLD: peace summit',x:'Leaders gather to calm tensions; every nation is pressed to act.',w:0,c:'always',o:[{t:'Attend and make concessions',fx:[['rel','$nb',10],['un',-3]]},{t:'Send a low-level delegation',fx:[['mod','warSupport',.03,6]]}]},
 {id:'techgift',t:'A university breakthrough',x:'Engineers have found a way to cut costs in the arms factories.',w:2,c:'always',o:[{t:'Fund the lab ($300)',fx:[['cash',-300],['mod','fireSupport',.08,12]]},{t:'Patent and sell it',fx:[['cash',350]]}]}];
function gdNatName(c){const n=GCM.nats.get(c);return n?n.name:c;}
function gevCond(c,code){const nat=GC.nat[code];const foes=gdEnemies(code);
  const nb=gevNb(code);
  switch(c){case 'always':return true;case 'peace':return !foes.length;case 'war':return foes.length>0;case 'foe':return foes.length>0;case 'poor':return nat.cash<600;case 'rich':return nat.cash>2500;
   case 'nb':return !!nb.length;case 'nbwar':return nb.some(o=>gdEnemies(o).length>0);}return true;}
function gevNb(code){const s=new Set();for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===code)for(const j of p.adj){const q=GCM.P[j];if(q&&q.land&&GC.prov[j].o!==code&&!GC.nat[GC.prov[j].o].dead)s.add(GC.prov[j].o);}return Array.from(s).sort();}
function gevS(){if(!GC.ev)GC.ev={last:{},sch:[],pend:[],hist:[]};return GC.ev;}
function gevApply(code,fx){const N=GC.nat[code],R=grRng((GC.seed|0)*31+GC.turn*11+code.charCodeAt(0));const lines=[];
  for(const f of fx){const k=f[0];
   if(k==='cash'){N.cash+=f[1];lines.push((f[1]>0?'+$':'-$')+Math.abs(f[1]));}
   else if(k==='un'){for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===code)GC.prov[p.i].un=Math.max(0,Math.min(100,GC.prov[p.i].un+f[1]));lines.push((f[1]>0?'Unrest +':'Unrest ')+f[1]);}
   else if(k==='man'){if(N.e)N.e.man=Math.max(0,(N.e.man||0)+f[1]);lines.push('Manpower '+(f[1]>0?'+':'')+f[1]);}
   else if(k==='rel'){let w=f[1];if(w==='$nb'){const l=gevNb(code);w=l.length?l[Math.floor(R()*l.length)]:null;}else if(w==='$foe'){const l=gdEnemies(code);w=l.length?l[Math.floor(R()*l.length)]:null;}
     if(w){gdRel(code,w,f[2]);lines.push('Opinion of '+gdNatName(w)+' '+(f[2]>0?'+':'')+f[2]);}}
   else if(k==='mod'){gmodAdd({id:'ev_'+code+'_'+f[1]+'_'+GC.turn,src:'Event',scope:'nation',stat:f[1],add:f[2],t:code,until:GC.turn+f[3]});lines.push((GMOD_STATS[f[1]]||f[1])+' '+(f[2]>0?'+':'')+Math.round(f[2]*100)+'% for '+f[3]+' months');}
   else if(k==='chain'){gevS().sch.push([GC.turn+f[2],code,f[1]]);}}
  return lines;}
function gevFire(code,id){const row=GEV_ROWS.find(r=>r.id===id);if(!row)return;const S=gevS();S.last[code]=GC.turn;
  if(!GC.nat[code].ai){S.pend.push([code,id]);return;}   /* every human leader answers their own events: the host (GC.me) and online friends (ai=false, laneA A2b) */
  const o=row.o[Math.min(row.o.length-1,(row.ai!=null?row.ai:0))];gevApply(code,o.fx);S.hist.push([GC.turn,code,id,0]);}
function gevChoose(code,id,i){const row=GEV_ROWS.find(r=>r.id===id);if(!row)return [];const S=gevS();S.pend=S.pend.filter(p=>!(p[0]===code&&p[1]===id));const o=row.o[i];const l=gevApply(code,o.fx);S.hist.push([GC.turn,code,id,i]);if(S.hist.length>200)S.hist.shift();grLog(gdNatName(code)+': '+row.t+' — '+o.t,code);return l;}
// per turn (called from gdTurn): scheduled follow-ups first, then a seeded roll per nation (≈1 in 7 months each)
function gevTurn(){const S=gevS();for(const p of S.pend.slice())if(!GC.nat[p[0]]||GC.nat[p[0]].dead||GC.nat[p[0]].ai){const row=GEV_ROWS.find(r=>r.id===p[1]);S.pend=S.pend.filter(x=>x!==p);if(row&&GC.nat[p[0]]&&!GC.nat[p[0]].dead){gevApply(p[0],row.o[Math.min(row.o.length-1,row.ai!=null?row.ai:0)].fx);S.hist.push([GC.turn,p[0],p[1],0]);}}   /* a friend who left: their generals answer the open events */
  const due=S.sch.filter(x=>x[0]<=GC.turn);S.sch=S.sch.filter(x=>x[0]>GC.turn);for(const [,c,id] of due)if(GC.nat[c]&&!GC.nat[c].dead)gevFire(c,id);
  {const RG=grRng((GC.seed|0)*613+GC.turn*29),gs=GEV_ROWS.filter(e=>e.g);if(gs.length&&(S.lastG==null||GC.turn-S.lastG>=10)&&RG()<.08){const pick=gs[Math.floor(RG()*gs.length)];S.lastG=GC.turn;grLog(pick.t,'');for(const c of Object.keys(GC.nat).sort())if(!GC.nat[c].dead&&grNat(c).major)gevFire(c,pick.id);}}
  const R=grRng((GC.seed|0)*977+GC.turn*13);for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];const r=R(),r2=R();if(N.dead||!grNat(c).major)continue;if(S.last[c]!=null&&GC.turn-S.last[c]<5)continue;if(S.pend.some(p=>p[0]===c))continue;if(r>.17)continue;
    const ok=GEV_ROWS.filter(e=>e.w>0&&gevCond(e.c,c));if(!ok.length)continue;let tot=0;for(const e of ok)tot+=e.w;let x=r2*tot;let pick=ok[0];for(const e of ok){x-=e.w;if(x<=0){pick=e;break;}}gevFire(c,pick.id);}}
function gevShow(){if(!GC||!GC.me)return;const S=gevS();const p=S.pend.find(x=>x[0]===GC.me);if(!p||document.getElementById('gModal'))return;const row=GEV_ROWS.find(r=>r.id===p[1]);if(!row)return;
  const bs=row.o.map((o,i)=>[o.t,()=>{const l=gevChoose(GC.me,row.id,i);try{guTop();grandMapRefresh();}catch(e){}gevToast(l);gevShow();},i===0?1:0]);
  guModal('<h2 style="margin:0 0 8px;font-size:21px">📜 '+row.t+'</h2><div style="line-height:1.5;margin-bottom:6px">'+row.x+'</div>',bs);}
function gevToast(l){if(!l||!l.length)return;const t=guEl('div','position:fixed;left:50%;bottom:130px;transform:translateX(-50%);z-index:8600;background:#1c2b3b;border:1px solid #c9a35a;color:#ffe6a8;padding:7px 16px;border-radius:7px;font-size:15px;transition:opacity .6s',l.join(' · '));document.body.appendChild(t);setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),700);},3500);}
if(typeof alAdd==='function')alAdd('event','📜','Decision waiting',c=>{const p=(GC.ev&&GC.ev.pend||[]).filter(x=>x[0]===c);return p.length?{n:p.length,tip:'an event needs your choice',go:()=>gevShow()}:null;});
