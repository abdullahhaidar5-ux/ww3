// 13zr-garms.js — lane B RG12: ARMS TRADE. Buy/sell tanks, helicopters, AA, artillery and ATGM teams between nations; deliveries arrive in the buyer's capital after 2 months.
// Who reacts: the seller (cash, +opinion, caps its own yearly exports), the buyer's enemies (opinion of the seller drops), the UN (sanctioned nations can neither buy nor sell), embargoes.
// Second order: arms money feeds the seller's treasury, arms flow to nations already at war, and a bloc partner's embargo shuts a supplier. Counter-play: embargo a rival (5 Diplomatic points)
// so nobody of ours sells to him; or find another supplier. Costs: the price (opinion-scaled, +40% for a poor relationship, +25% in wartime), a 12-month export cap per seller.
// State: GC.arms={q:[deliveries],sold:{seller:[turns]},emb:{by:{target:turn}},n:count}. Deterministic; AI buys in the monthly hook.
const GAR_KINDS={tank:['Main battle tanks',90],heli:['Attack helicopters',120],aa:['Air-defence batteries',70],arty:['Artillery batteries',80],at:['Anti-tank teams',40]};
const GAR_CAP=8,GAR_DELAY=2,GAR_EMB_COST=5,GAR_EMB_LEN=24;
function garS(){if(!GC.arms)GC.arms={q:[],sold:{},emb:{},n:0};return GC.arms;}
function garSoldYr(s){const S=garS(),L=(S.sold[s]||[]).filter(t=>t[0]>GC.turn-12);S.sold[s]=L;return L.reduce((a,b)=>a+b[1],0);}
function garEmbargoed(s,b){const S=garS(),E=S.emb;for(const by of Object.keys(E)){if(by!==s&&!(grAllied(by,s)&&by!==b))continue;const t=E[by][b];if(t!==undefined&&t>=GC.turn)return by;}return '';}
function garUN(c){return typeof unSanctioned==='function'&&unSanctioned(c);}
function garPrice(s,b,k,n){const op=gdOp(s,b);let m=1+(op<10?.4:op<40?.15:0)+(gdEnemies(s).length?.25:0);return Math.round(GAR_KINDS[k][1]*n*m);}
function garCan(s,b,k,n){const S=GC&&GC.nat;if(!S||!S[s]||!S[b]||S[s].dead||S[b].dead||s===b||!GAR_KINDS[k])return 'Not available.';
  if(!grHasKind(grNat(s).fac,k))return gdNatName(s)+' does not make those.';
  if(grAtWar(s,b))return 'They are at war with us.';if(garUN(s)||garUN(b))return 'UN sanctions forbid the sale.';
  const e=garEmbargoed(s,b);if(e)return gdNatName(e)+' has an arms embargo on '+gdNatName(b)+'.';
  if(gdOp(s,b)<-10)return gdNatName(s)+' will not sell to us (opinion too low).';
  if(garSoldYr(s)+n>GAR_CAP)return gdNatName(s)+' has no spare production this year.';if(GC.nat[b].cap<0)return 'No capital to deliver to.';return '';}
function garBuy(b,s,k,n){n=n|0||2;const e=garCan(s,b,k,n);if(e)return e;const N=GC.nat[b],p=garPrice(s,b,k,n);if(N.cash<p)return 'Needs $'+p+'.';
  N.cash-=p;GC.nat[s].cash+=p;const S=garS();S.q.push({b,s,k,n,at:GC.turn+GAR_DELAY});(S.sold[s]=S.sold[s]||[]).push([GC.turn,n]);S.n++;
  gdRel(s,b,3);for(const f of gdEnemies(b))if(f!==s&&f!==b)gdRel(f,s,-3);
  grLog(gdNatName(b)+' buys '+n+' × '+GAR_KINDS[k][0].toLowerCase()+' from '+gdNatName(s)+' for $'+p+'.',b===GC.me||s===GC.me?GC.me:b);return '';}
function garEmbargo(by,t){gidN(by);const N=GC.nat[by],S=garS();if(!GC.nat[t]||t===by)return 'Not available.';if(by===GC.me){if(N.pp.dip<GAR_EMB_COST)return 'Needs '+GAR_EMB_COST+' Diplomatic points.';N.pp.dip-=GAR_EMB_COST;}
  (S.emb[by]=S.emb[by]||{})[t]=GC.turn+GAR_EMB_LEN;gdRel(by,t,-6);grLog(gdNatName(by)+' imposes an arms embargo on '+gdNatName(t)+' — allies stop selling too.',by===GC.me||t===GC.me?GC.me:by);return '';}
function garMonth(){if(!GC||!GC.nat)return;const S=garS();if(S.mT===GC.turn)return;S.mT=GC.turn;
  const keep=[];for(const d of S.q){if(d.at>GC.turn){keep.push(d);continue;}const N=GC.nat[d.b];if(!N||N.dead||N.cap<0){if(N&&!N.dead)N.cash+=garPrice(d.s,d.b,d.k,d.n);continue;}
    grArrive(d.b,N.cap,d.k,d.n);if(d.b===GC.me)grLog(d.n+' × '+GAR_KINDS[d.k][0].toLowerCase()+' from '+gdNatName(d.s)+' arrive in the capital.',d.b);}
  S.q=keep;for(const by of Object.keys(S.emb))for(const t of Object.keys(S.emb[by]))if(S.emb[by][t]<GC.turn)delete S.emb[by][t];
  // AI: nations at war with spare cash buy from their best-liked supplier; others embargo the worst aggressor of a friend
  for(const b of Object.keys(GC.nat).sort()){const N=GC.nat[b];if(N.dead||b===GC.me)continue;const foes=gdEnemies(b);
    if(foes.length&&N.cash>2500&&(GC.turn+b.charCodeAt(0))%3===0){let best=null,bo=-1e9;for(const s of Object.keys(GC.nat).sort()){if(s===b)continue;const o=gdOp(s,b);if(o>bo&&!garCan(s,b,'tank',2)){bo=o;best=s;}}
      if(best){const ks=['tank','aa','heli','arty','at'].filter(k=>!garCan(best,b,k,2));if(ks.length)garBuy(b,best,ks[(GC.turn>>1)%ks.length],2);}}
    if(!foes.length&&(GC.turn+b.charCodeAt(1||0))%12===0)for(const o of Object.keys(GC.nat).sort()){if(o===b||GC.nat[o].dead||!grAtWar(o,b)&&!gdEnemies(o).some(x=>grAllied(x,b)))continue;if(gdOp(b,o)<-40&&!(garS().emb[b]||{})[o]){garEmbargo(b,o);break;}}}
}
GMOD_HOOKS.push(garMonth);
npTab('arms','🛒','Arms trade',(code,body,c)=>{const own=c.own&&code===GC.me,S=garS();
  let h='<div style="opacity:.85;margin-bottom:8px">Buy weapons from friendly makers; they arrive in the capital after '+GAR_DELAY+' months. Price rises with a cold relationship and in wartime. Each maker sells at most '+GAR_CAP+' lots a year. Embargoes and UN sanctions shut deals; enemies of the buyer think less of the seller.</div>';
  const ems=[];for(const by of Object.keys(S.emb))for(const t of Object.keys(S.emb[by]))if(S.emb[by][t]>=GC.turn&&(by===code||t===code))ems.push(gdNatName(by)+' ⛔ '+gdNatName(t));
  if(ems.length)h+='<div style="margin:6px 0;color:#ffb36b">Embargoes: '+ems.join(' · ')+'</div>';
  const inc=S.q.filter(d=>d.b===code);if(inc.length)h+='<div style="margin:6px 0"><b>On the way:</b> '+inc.map(d=>d.n+'× '+GAR_KINDS[d.k][0].toLowerCase()+' ('+gdNatName(d.s)+', month '+d.at+')').join(' · ')+'</div>';
  body.innerHTML=h;if(!own)return;
  const sup=Object.keys(GC.nat).filter(s=>s!==code&&!GC.nat[s].dead&&Object.keys(GAR_KINDS).some(k=>!garCan(s,code,k,2))).sort((a,b)=>gdOp(b,code)-gdOp(a,code)||(a<b?-1:1)).slice(0,8);
  const hd=document.createElement('div');hd.style.cssText='margin:8px 0;opacity:.8';hd.textContent='Suppliers (best relations first) — cash $'+Math.floor(GC.nat[code].cash);body.appendChild(hd);
  for(const s of sup){const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;margin:4px 0;flex-wrap:wrap';const nm=document.createElement('span');nm.style.cssText='min-width:150px';nm.textContent=gdNatName(s)+' ('+gdOp(s,code)+')';row.appendChild(nm);
    for(const k of Object.keys(GAR_KINDS)){if(garCan(s,code,k,2))continue;const b=document.createElement('button');b.textContent='2× '+GAR_KINDS[k][0].split(' ')[0]+' $'+garPrice(s,code,k,2);b.style.cssText='font-size:14px;padding:3px 9px;cursor:pointer';b.onclick=()=>{const e=garBuy(code,s,k,2);if(e)grLog(e,code);npDraw();};row.appendChild(b);}
    body.appendChild(row);}
  const foes=gdEnemies(code).sort();if(foes.length){const d=document.createElement('div');d.style.cssText='margin-top:10px';d.textContent='Embargo an enemy ('+GAR_EMB_COST+' Dip, '+GAR_EMB_LEN+' months): ';for(const t of foes.slice(0,5)){const b=document.createElement('button');b.textContent=gdNatName(t);b.style.cssText='font-size:14px;padding:3px 9px;margin:0 6px 4px 0;cursor:pointer';b.onclick=()=>{const e=garEmbargo(code,t);if(e)grLog(e,code);npDraw();};d.appendChild(b);}body.appendChild(d);}
});
alAdd('arms','🛒','Arms delivery',c=>{const S=GC&&GC.arms;const d=S&&S.q.filter(x=>x.b===c);return d&&d.length?{n:d.length,tip:'Arms deliveries on the way — open the arms trade tab',go:()=>npOpen(c,'arms')}:null;});
