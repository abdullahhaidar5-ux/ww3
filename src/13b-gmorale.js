// ===== 13b-gmorale: army morale on the campaign map (one bar per army, a.mor 0..100, saved with the army) =====
// Read by the battle resolver (src/13a-gwar.js: an army's morale is what it brings into a battle, and what is left comes back),
// by the map (morale pip) and by the monthly tick. Styles come from MSTYLES (01-data): Zealous never fall back.
// (The bridge into the real-time battle that lived in this file was removed on 2026-11-12: campaign battles are resolved on the map.)
/* ---- A3b army morale (laneF): ONE bar per army, styles from MSTYLES (01-data); a.mor 0..100 saved with the army ---- */
const GMOR_MAX={zeal:100,prof:100,home:90,fire:80};   /* base ceilings; home defenders get +10 on core land, see gmMorMax */
function gmMorStyle(a){return MORALE_STYLE[(typeof grNat==='function'?grNat(a.o).fac:a.o)]||'home';}
function gmMorMax(a){const s=gmMorStyle(a);let m=GMOR_MAX[s]||90;if(s==='home'&&GC&&GC.prov[a.at]&&GC.prov[a.at].o===a.o)m=100;try{m=Math.max(m,Math.min(100,m+gfTradMor(a.o)));}catch(e){}try{m=Math.min(100,m+glMor(a.o));}catch(e){}return m;}
function gmMor(a){return a.mor==null?gmMorMax(a):Math.max(0,Math.min(gmMorMax(a),a.mor));}
function gmMorBattle(losers,winners){for(const a of losers){const s=gmMorStyle(a);let d=30;if(s==='zeal')d=15;else if(s==='prof')d=24;else if(s==='fire')d=40;
    a.mor=Math.max(5,gmMor(a)-d);
    gmRetreatStyle(a,s);
    if(s==='zeal'&&a.u.length>2){const k=Math.max(1,Math.round(a.u.length*.15));a.u.splice(a.u.length-k,k);}}   /* zealous fight on: heavier losses, steadier bar */
  for(const a of winners)a.mor=Math.max(10,gmMor(a)-8);}
/* retreat by morale style (A3b, laneF): Professional withdraw in good order (morale kept up), Home defenders fall back to the nearest own town and dig in, Firepower-reliant pull back one more step under cover; Zealous stay and fight on (see gmMorBattle) */
function gmRetreatStyle(a,s){if(a.fl||!a.u.length)return;const P=GCM.P,nm=a.nm+' ('+GCM.nats.get(a.o).name+')';
  if(s==='prof'){a.mor=Math.min(gmMorMax(a),a.mor+6);return;}
  const own=j=>GC.prov[j]&&!P[j].sea&&GC.prov[j].o===a.o;
  if(s==='home'){if(own(a.at)){a.mor=Math.min(gmMorMax(a),a.mor+10);return;}
    let seen=new Set([a.at]),ring=[a.at],to=-1;for(let d=0;d<3&&to<0;d++){const nx=[];for(const i of ring)for(const j of P[i].adj||[])if(!seen.has(j)){seen.add(j);if(P[j].sea)continue;if(own(j)&&to<0)to=j;nx.push(j);}ring=nx;}
    if(to>=0){a.at=to;a.mor=Math.min(gmMorMax(a),a.mor+10);grLog(nm+' fell back to '+P[to].n+' and dug in.',a.o);}return;}
  if(s==='fire'){for(const j of P[a.at].adj||[]){if(own(j)){a.at=j;a.mor=Math.min(gmMorMax(a),a.mor+8);grLog(nm+' pulled back to '+P[j].n+' under air cover.',a.o);return;}}}}
function gmMorTurn(){for(const a of GC.armies){if(a.fl)continue;const m=gmMor(a),mx=gmMorMax(a);let d=0;
    const ok=GC.prov[a.at]&&(GC.prov[a.at].o===a.o||(typeof grAllied==='function'&&grAllied(a.o,GC.prov[a.at].o)));
    let sup=true;try{sup=grSupplied(a);}catch(e){}
    if(ok&&sup)d=a.path&&a.path.length?1:(gmMorStyle(a)==='prof'?9:7);else if(sup)d=2;else d=-4;
    if(a.path&&a.path.length)d-=2;   /* forced march */
    a.mor=Math.max(0,Math.min(mx,m+d));}
  /* allied sharing (Abdullah pick 11): an allied army in the same/adjacent province lifts a weaker one a little (+3 max); computed from a snapshot so order doesn't matter */
  if(typeof grAllied==='function'){const snap=GC.armies.map(a=>a.fl?-1:gmMor(a));
    GC.armies.forEach((a,i)=>{if(a.fl)return;let best=-1;
      GC.armies.forEach((b,j)=>{if(j===i||b.fl||b.o===a.o||snap[j]<0||snap[j]<=snap[i])return;
        if(!(b.at===a.at||((GC.prov[a.at]&&GC.prov[a.at].adj)||[]).indexOf(b.at)>=0))return;
        let al=false;try{al=grAllied(a.o,b.o);}catch(e){}if(al&&snap[j]>best)best=snap[j];});
      if(best>=0)a.mor=Math.min(gmMorMax(a),gmMor(a)+Math.min(3,Math.ceil((best-snap[i])/10)));});}}
function gmMorBar(a){const m=Math.round(gmMor(a)),c=m>66?'#6fbf5a':m>33?'#e0b043':'#d9534f';return '<span title="Morale '+m+'%" style="display:inline-block;width:46px;height:6px;background:#222;border:1px solid #567;border-radius:3px;vertical-align:middle;margin-left:4px"><span style="display:block;height:100%;width:'+m+'%;background:'+c+'"></span></span>';}
