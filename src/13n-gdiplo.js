// EU4-STYLE DIPLOMACY (lane G, B6 first cut). ONE opinion number per pair (grOpinion / GC.rel) — every action reads and moves it.
// State lives in GC.dp (saved with the campaign): {ws:{pair:turnWarStarted}, tr:{pair:truceUntilTurn}, gu:{target:[guarantors]}, ac:{'a>b':1}, off:[[from,to,type,turn]]}
// Deterministic: every acceptance is a score vs a threshold shown to the player (no dice).
function gdS(){if(!GC.dp)GC.dp={ws:{},tr:{},gu:{},ac:{},off:[]};return GC.dp;}
function gdName(c){const n=GCM.nats.get(c);return n?n.name:c;}
function gdRel(a,b,d){if(!GC.rel)GC.rel={};const k=grWk(a,b);GC.rel[k]=Math.max(-100,Math.min(100,(GC.rel[k]||0)+d));}
function gdTruce(a,b){const t=gdS().tr[grWk(a,b)];return !!t&&t>GC.turn;}
function gdWarLen(a,b){const S=gdS(),k=grWk(a,b);if(S.ws[k]==null)S.ws[k]=GC.turn;return GC.turn-S.ws[k];}
function gdEnemies(c){return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));}
function gdAllies(c){return Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAllied(c,o));}
// war score: provinces each side holds that were the other's at the start
function gdScore(a,b){let x=0,y=0;for(const p of GCM.P){if(!p.land)continue;const s=GC.prov[p.i];if(s.o===a&&s.o0===b)x++;else if(s.o===b&&s.o0===a)y++;}return [x,y];}
// --- chance + reasons for one action (a acts on b). returns {can, pct, why:[[text,value]], cost, need}
function gdCheck(act,a,b){const w=[],op=grOpinion(a,b),war=grAtWar(a,b),al=grAllied(a,b);let r={can:true,pct:100,why:w,cost:0};
  const shared=gdEnemies(a).filter(e=>grAtWar(b,e)).length;
  const need=(txt)=>{r.can=false;r.pct=0;r.why.push([txt,'']);return r;};
  if(act==='improve'){if(war)return need('At war');r.cost=150;w.push(['Costs $150, +8 opinion','']);return r;}
  if(act==='aid'){if(war)return need('At war');r.cost=500;w.push(['Costs $500, +20 opinion','']);return r;}
  if(act==='ally'){if(war)return need('At war');if(al)return need('Already allied');let s=op*.8;w.push(['Their opinion of you',Math.round(op*.8)]);if(shared){s+=15*shared;w.push(['Shared enemies',15*shared]);}
    const hs=gdEnemies(b).includes(a);const rv=gdAllies(b).filter(x=>grOpinion(a,x)<=-25).length;if(rv){s-=25*rv;w.push(['Their ally is your rival',-25*rv]);}
    if(grNat(a).reg&&grNat(a).reg===grNat(b).reg){s+=8;w.push(['Same region',8]);}
    r.pct=Math.max(0,Math.min(100,Math.round(50+(s-40)*2.5)));r.can=s>=40;r.score=s;if(!r.can)w.push(['Needs 40 to accept',Math.round(s)]);return r;}
  if(act==='unally'){if(!al)return need('Not allied');r.cost=0;w.push(['Ends the alliance, -15 opinion','']);return r;}
  if(act==='access'){if(war)return need('At war');if(gdS().ac[a+'>'+b])return need('Already granted');r.can=op>=20;r.pct=r.can?100:0;w.push(['Their opinion of you',op]);if(!r.can)w.push(['Needs 20','']);return r;}
  if(act==='guard'){if(war)return need('At war');if((gdS().gu[b]||[]).includes(a))return need('Already guaranteeing');r.cost=100;w.push(['Costs $100. If anyone attacks them you join the war; +10 opinion','']);return r;}
  if(act==='war'){if(war)return need('Already at war');if(al)return need('Allied');if(gdTruce(a,b))return need('Truce for '+(gdS().tr[grWk(a,b)]-GC.turn)+' more turns');
    const cb=op<=-25||gdEnemies(b).some(e=>grAllied(a,e));w.push([cb?'You have a reason for war':'No reason for war: others lose trust in you','']);r.cb=cb;r.pct=100;return r;}
  if(act==='peace'||act==='tribute'){if(!war)return need('Not at war');const [x,y]=gdScore(a,b),len=gdWarLen(a,b);w.push(['Provinces you hold of theirs',x]);w.push(['Provinces they hold of yours',y]);w.push(['War length (turns)',len]);
    const lead=x-y;let ok;if(act==='peace'){ok=lead<=0||len>=6||lead<=1;if(lead>0&&len<6&&lead>1)w.push(['They think they can still win','']);}
    else{ok=lead>=2;r.cost=-Math.round(lead*350);w.push(['Reparations $'+Math.max(0,lead*350),'']);if(!ok)w.push(['Needs a lead of 2 provinces','']);}
    r.can=ok;r.pct=ok?100:0;return r;}
  return need('?');}
function gdPeace(a,b){const S=gdS();delete GC.war[grWk(a,b)];delete S.ws[grWk(a,b)];S.tr[grWk(a,b)]=GC.turn+12;gdRel(a,b,15);S.off=S.off.filter(o=>!(o[0]===a&&o[1]===b||o[0]===b&&o[1]===a));
  for(const ar of GC.armies){const e=ar.o===a?b:ar.o===b?a:null;if(e&&GCM.P[ar.at].land&&GC.prov[ar.at].o===e){const d=grNearOwn(ar.o,ar.at);if(d>=0){ar.at=d;ar.path=[];ar.pg=0;ar.from=-1;}}}
  grLog(gdName(a)+' and '+gdName(b)+' made peace (12-turn truce).',a);}
function gdAddAlly(a,b){GC.alz=GC.alz||[];const x=GC.alz.find(z=>z[1].includes(a)&&!z[1].includes(b)&&z[1].length<8&&z[0]!=='NATO');GC.alz.push(['Pact '+a+'-'+b,[a,b]]);}
// --- do it. returns a one-line result text
function gdDo(act,a,b){const c=gdCheck(act,a,b);if(!c.can)return 'Refused: '+(c.why.map(x=>x[0]).join('; '));const N=GC.nat[a];if(c.cost>0&&N.cash<c.cost)return 'Not enough money.';
  if(c.cost>0)N.cash-=c.cost;if(c.cost<0)N.cash-=c.cost,GC.nat[b].cash+=c.cost;const S=gdS();let t='';
  if(act==='improve'){gdRel(a,b,8);t='Relations with '+gdName(b)+' improve.';}
  else if(act==='aid'){gdRel(a,b,20);t='Aid sent to '+gdName(b)+'.';}
  else if(act==='ally'){gdAddAlly(a,b);gdRel(a,b,10);grLog(gdName(a)+' and '+gdName(b)+' signed an alliance.',a);t='Alliance with '+gdName(b)+' signed.';}
  else if(act==='unally'){for(const z of (GC.alz||[]))if(z[1].includes(a)&&z[1].includes(b))z[1]=z[1].filter(x=>x!==a);GC.alz=(GC.alz||[]).filter(z=>z[1].length>1);gdRel(a,b,-15);grLog(gdName(a)+' left its alliance with '+gdName(b)+'.',a);t='Alliance ended.';}
  else if(act==='access'){S.ac[a+'>'+b]=1;gdRel(a,b,3);t='Military access requested (granted).';}
  else if(act==='guard'){(S.gu[b]=S.gu[b]||[]).push(a);gdRel(a,b,10);grLog(gdName(a)+' guarantees '+gdName(b)+'.',a);t=gdName(b)+' is now under your guarantee.';}
  else if(act==='war'){if(!c.cb)for(const o of Object.keys(GC.nat))if(o!==a&&o!==b&&!GC.nat[o].dead)gdRel(a,o,-5);grDeclare(a,b);t='War declared on '+gdName(b)+'.';}
  else if(act==='peace'||act==='tribute'){gdPeace(a,b);t=act==='peace'?'White peace signed.':'Peace signed; reparations paid.';}
  return t;}
// war declared (hook in grDeclare): guarantors and allies of the victim join; depth-limited
let GD_DEPTH=0;
function gdOnDeclare(a,b){const S=gdS();S.ws[grWk(a,b)]=GC.turn;if(GD_DEPTH>1)return;GD_DEPTH++;
  try{const call=(GC.alz||[]).filter(z=>z[1].includes(b)&&!z[1].includes(a)).flatMap(z=>z[1]).concat(S.gu[b]||[]);
    for(const g of Array.from(new Set(call)).sort()){if(g===a||g===b||GC.nat[g].dead||grAtWar(g,a)||grAllied(g,a)||gdTruce(g,a))continue;
      if(GC.nat[g].ai||g===GC.me){GC.war[grWk(g,a)]=1;S.ws[grWk(g,a)]=GC.turn;grLog(gdName(g)+' joins the war against '+gdName(a)+' to defend '+gdName(b)+'.',g);}}}finally{GD_DEPTH--;}}
// each turn: AI-vs-AI peace, AI offers peace to the player when losing, truces tick
function gdTurn(){if(!GC||!GC.nat)return;const S=gdS();try{gevTurn();}catch(e){console.error('gevTurn',e);}try{gachTurn();}catch(e){console.error('gachTurn',e);}const done=new Set();
  for(const k of Object.keys(GC.war).sort()){const [a,b]=k.split('|');if(!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead){delete GC.war[k];continue;}
    const len=gdWarLen(a,b);if(len<8)continue;const [x,y]=gdScore(a,b);
    const loser=x>y?b:y>x?a:null,winner=loser===a?b:a;
    if(!loser&&len<14)continue;
    const pair=loser||a;const other=loser?winner:b;
    if(other===GC.me&&GC.nat[pair].ai){if(!S.off.some(o=>o[0]===pair&&o[1]===other))S.off.push([pair,other,'peace',GC.turn]);}
    else if(pair===GC.me){if(!GC.nat[other].ai)continue;}
    else if(GC.nat[pair].ai&&GC.nat[other].ai&&(GC.turn+len)%3===0){gdPeace(pair,other);}}
  S.off=S.off.filter(o=>grAtWar(o[0],o[1])&&GC.turn-o[3]<8);}
// --- alerts: peace offers (galertAdd is defined in 13m)
if(typeof galertAdd==='function')galertAdd('peaceoffer','🕊','Peace offer',c=>{const o=gdS().off.filter(x=>x[1]===c);return o.length?{n:o.length,tip:o.map(x=>gdName(x[0])).join(', ')+' offer white peace',tab:'dip',go:()=>{NP.dt=o[0][0];npOpen(c,'dip');}}:null;});
// --- the Diplomacy tab (replaces Lane B's read-only first cut; same tab id so the panel just uses this)
const GD_ACTS=[['improve','Improve relations'],['aid','Send aid'],['ally','Propose alliance'],['unally','Leave alliance'],['access','Military access'],['guard','Guarantee'],['peace','Offer white peace'],['tribute','Demand reparations'],['war','Declare war']];
function gdRowFlag(c){const n=grNat(c);return '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;border:1px solid #fff8;background:'+(n.color||'#888')+';margin-right:6px;vertical-align:-1px"></span>';}
function gdFlags(list,cls){return list.length?list.map(c=>'<a data-c="'+c+'" style="cursor:pointer;color:'+cls+';margin-right:12px;white-space:nowrap">'+gdRowFlag(c)+gdName(c)+'</a>').join(''):'<span style="opacity:.55">none</span>';}
function gdRender(code,body){const me=GC.me;if(!me){body.textContent='Diplomacy needs a nation.';return;}
  const own=code===me;let tgt=own?(NP.dt&&GC.nat[NP.dt]&&NP.dt!==me?NP.dt:null):code;const flt=NP.df||'all';
  const w=guEl('div','display:grid;grid-template-columns:'+(own?'minmax(250px,1fr) ':'')+'1.4fr;gap:14px;align-items:start');body.appendChild(w);
  const line=(l,list,col)=>'<div style="margin:3px 0"><b style="display:inline-block;min-width:130px;opacity:.85">'+l+'</b>'+gdFlags(list,col)+'</div>';
  const subj=own?me:code;
  if(own){const left=guEl('div','');const tabs=guEl('div','display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px');
    for(const [id,nm] of [['all','All'],['near','Neighbours'],['war','At war'],['ally','Allies'],['great','Great powers']]){const b=guEl('button','padding:2px 9px;border-radius:12px;border:1px solid '+(flt===id?'#c9a35a':'#3d5a73')+';background:'+(flt===id?'#2a3a4c':'transparent')+';color:#dfe8f0;cursor:pointer;font-size:13px',nm);b.type='button';b.onclick=()=>{NP.df=id;npDraw();};tabs.appendChild(b);}
    const wb=guEl('button','padding:2px 9px;border-radius:12px;border:1px solid #5b8bb0;background:transparent;color:#9ec8ff;cursor:pointer;font-size:13px','Web ◎');wb.type='button';wb.title='Who is allied or at war with whom';wb.onclick=()=>gwebOpen();tabs.appendChild(wb);
    left.appendChild(tabs);
    const nb=new Set();for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===me)for(const j of p.adj){const q=GCM.P[j];if(q.land&&GC.prov[j].o!==me)nb.add(GC.prov[j].o);}
    let list=Object.keys(GC.nat).filter(c=>c!==me&&!GC.nat[c].dead);
    if(flt==='near')list=list.filter(c=>nb.has(c));else if(flt==='war')list=list.filter(c=>grAtWar(me,c));else if(flt==='ally')list=list.filter(c=>grAllied(me,c));else if(flt==='great')list=list.filter(c=>grNat(c).major);
    list.sort((a,b)=>grOpinion(me,b)-grOpinion(me,a)||(a<b?-1:1));
    const box=guEl('div','max-height:46vh;overflow:auto;border:1px solid #2b4259;border-radius:6px');
    for(const c of list.slice(0,80)){const o=grOpinion(me,c),r=guEl('div','padding:5px 9px;cursor:pointer;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #1d3042;'+(c===tgt?'background:#27425a':''),'<span>'+gdRowFlag(c)+gdName(c)+(grAtWar(me,c)?' <span style="color:#ff9d8e">⚔</span>':grAllied(me,c)?' <span style="color:#9fe39f">🤝</span>':'')+'</span><b style="color:'+(o>=25?'#9fe39f':o<=-25?'#ff9d8e':'#e8e4d8')+'">'+(o>0?'+':'')+o+'</b>');r.onclick=()=>{NP.dt=c;npDraw();};box.appendChild(r);}
    if(!list.length)box.innerHTML='<div style="padding:10px;opacity:.6">Nobody here.</div>';left.appendChild(box);w.appendChild(left);}
  const right=guEl('div','');w.appendChild(right);
  right.innerHTML=line('Enemies',gdEnemies(subj),'#ff9d8e')+line('Allies',gdAllies(subj),'#9fe39f')+line('Guaranteed',Object.keys(gdS().gu).filter(t=>gdS().gu[t].includes(subj)),'#9ec8ff')+line('Guaranteed by',gdS().gu[subj]||[],'#9ec8ff');
  right.querySelectorAll('a[data-c]').forEach(a=>a.onclick=()=>{if(own){NP.dt=a.dataset.c;npDraw();}else{NP.code=a.dataset.c;npDraw();}});
  if(!own||tgt){const t=own?tgt:code;if(t===me){return;}
    const hd=guEl('div','margin:10px 0 6px;font-size:18px','<b>'+gdRowFlag(t)+gdName(t)+'</b> <span style="opacity:.75">opinion of you '+(grOpinion(me,t)>0?'+':'')+grOpinion(me,t)+'</span>');right.appendChild(hd);
    const msg=guEl('div','min-height:20px;color:#ffe6a8;margin:4px 0');right.appendChild(msg);
    const of=gdS().off.find(o=>o[0]===t&&o[1]===me);if(of){const pr=guEl('div','padding:8px;border:1px solid #c9a35a;border-radius:6px;margin:6px 0','<b>'+gdName(t)+' offers white peace.</b> ');const y=guEl('button','margin-left:8px;padding:3px 12px;border-radius:5px;border:1px solid #7aa84f;background:#4f6b32;color:#fff;cursor:pointer','Accept'),n=guEl('button','margin-left:6px;padding:3px 12px;border-radius:5px;border:1px solid #6b7a8a;background:transparent;color:#dfe8f0;cursor:pointer','Refuse');y.type=n.type='button';
      y.onclick=()=>{gdPeace(me,t);guTop();grandMapRefresh();npDraw();};n.onclick=()=>{gdS().off=gdS().off.filter(o=>o!==of);npDraw();};pr.appendChild(y);pr.appendChild(n);right.appendChild(pr);}
    for(const [id,nm] of GD_ACTS){const c=gdCheck(id,me,t);if(!c.can&&c.why.length&&/^(Not at war|Not allied|At war|Already)/.test(c.why[0][0]))continue;
      const row=guEl('div','display:flex;align-items:center;gap:10px;margin:4px 0');const b=guEl('button','min-width:170px;text-align:left;padding:5px 12px;border-radius:5px;border:1px solid '+(c.can?(id==='war'?'#c4574a':'#c9a35a'):'#3d5a73')+';background:'+(c.can?'#2a3a4c':'#18222d')+';color:'+(c.can?'#ffe6a8':'#8fa0b0')+';cursor:pointer;font-size:15px',nm);b.type='button';
      const why=c.why.map(x=>x[0]+(x[1]!==''?' '+(typeof x[1]==='number'&&x[1]>0?'+':'')+x[1]:'')).join('\n');b.title=why;
      b.onclick=()=>{const res=gdDo(id,me,t);try{guTop();grandMapRefresh();}catch(e){}npDraw();setTimeout(()=>{const m=document.getElementById('gdMsg');if(m)m.textContent=res;},0);};
      const tx=guEl('span','font-size:13px;opacity:.8',c.can?(c.pct<100?c.pct+'% likely':(c.cost>0?'$'+c.cost:c.cost<0?'+$'+(-c.cost):'')) :c.why.map(x=>x[0]).join('; '));
      row.appendChild(b);row.appendChild(tx);right.appendChild(row);}
    msg.id='gdMsg';}
  else right.appendChild(guEl('div','margin-top:14px;opacity:.7','Pick a nation on the left to see what you can do — each button shows how likely it is and why.'));}
npTab('dip','🤝','Diplomacy',gdRender);
