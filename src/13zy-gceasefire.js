// CEASEFIRES THAT CAN BREAK (lane G, RG20, first cut). Every truce in force (GC.tr, from peace deals and the UN) can be violated:
// each month a seeded roll per truce (4%; 2% when a third nation guarantees one side, GC.gu) brings a shooting incident:
// opinion -5, and one incident in three collapses the truce back into war. Neutral wording; no real places or people.
// Deterministic from seed + turn (multiplayer safe). UN peacekeepers / guarantees are the counter-play (they halve the odds).
function gcfTurn(){if(!GC||!GC.tr||!GC.nat)return;const R=grRng((GC.seed|0)*449+GC.turn*7);
  for(const k of Object.keys(GC.tr).sort()){if(!(GC.tr[k]>GC.turn))continue;const [a,b]=k.split('|');
    if(!GC.nat[a]||!GC.nat[b]||GC.nat[a].dead||GC.nat[b].dead)continue;
    const r=R(),r2=R();const guar=(GC.gu||[]).some(g=>(g[1]===a||g[1]===b)&&g[0]!==a&&g[0]!==b);
    if(r>(guar?.02:.04))continue;
    gdRel(a,b,-5);
    if(r2<.33){delete GC.tr[k];GC.war[k]=1;GC.wsT=GC.wsT||{};GC.wsT[k]=GC.turn;
      grLog('The ceasefire between '+gdNatName(a)+' and '+gdNatName(b)+' has collapsed after a shooting incident on the line.',a);}
    else grLog('Ceasefire violation between '+gdNatName(a)+' and '+gdNatName(b)+'. Both sides blame each other.',a);}}
