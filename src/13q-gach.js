// ACHIEVEMENTS per nation (lane G, ⚡26). Rows = {id,icon,name,desc,test(code)}; checked once per turn for every living nation (deterministic, read-only on the sim);
// the player gets a toast and a tab in the nation panel. State: GC.ach = {code:[ids]} (saved with the campaign).
const GACH_ROWS=[
 {id:'p5',i:'🏙',n:'Landlord',d:'Hold 8 provinces.',t:c=>GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c).length>=8},
 {id:'p15',i:'🌍',n:'Regional power',d:'Hold 15 provinces.',t:c=>GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c).length>=15},
 {id:'conq',i:'🚩',n:'First conquest',d:'Take a province from an enemy.',t:c=>GCM.P.some(p=>p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].o0&&GC.prov[p.i].o0!==c)},
 {id:'rich',i:'💰',n:'Full treasury',d:'Hold $10,000.',t:c=>GC.nat[c].cash>=10000},
 {id:'peace',i:'🕊',n:'Peacemaker',d:'Be in a truce.',t:c=>Object.keys(GC.tr||{}).some(k=>k.split('|').includes(c)&&GC.tr[k]>GC.turn)},
 {id:'ally',i:'🤝',n:'Diplomat',d:'Have an ally.',t:c=>gdAllies(c).length>0},
 {id:'bloc',i:'🛡',n:'Alliance builder',d:'Have 3 allies.',t:c=>gdAllies(c).length>=3},
 {id:'guard',i:'🔰',n:'Protector',d:'Guarantee another nation.',t:c=>(GC.gu||[]).some(g=>g[0]===c)},
 {id:'dec',i:'📜',n:'Decision maker',d:'Settle 3 events.',t:c=>(GC.ev&&GC.ev.hist||[]).filter(h=>h[1]===c).length>=3},
 {id:'t20',i:'⏳',n:'Endurance',d:'Survive 20 months still standing.',t:c=>GC.turn>=20},
 {id:'wars',i:'⚔',n:'Many fronts',d:'Be at war with 3 nations at once.',t:c=>gdEnemies(c).length>=3}];
function gachTurn(){if(!GC||!GC.nat)return;if(!GC.ach)GC.ach={};for(const c of Object.keys(GC.nat).sort()){if(GC.nat[c].dead||!grNat(c).major)continue;const have=GC.ach[c]||(GC.ach[c]=[]);
  for(const a of GACH_ROWS){if(have.includes(a.id))continue;let ok=false;try{ok=a.t(c);}catch(e){}if(ok){have.push(a.id);if(c===GC.me){grLog('Achievement: '+a.n,c);try{gevToast([a.i+' Achievement — '+a.n+': '+a.d]);}catch(e){}}}}}}
npTab('ach','🏆','Achievements',(code,body)=>{const have=(GC.ach&&GC.ach[code])||[];body.innerHTML='<div style="margin-bottom:8px">'+have.length+' of '+GACH_ROWS.length+' earned.</div>'+GACH_ROWS.map(a=>{const h=have.includes(a.id);return '<div style="padding:6px 10px;margin:3px 0;border:1px solid '+(h?'#c9a35a':'#2b4259')+';border-radius:6px;opacity:'+(h?1:.5)+'"><b>'+a.i+' '+a.n+'</b> <span style="opacity:.8">— '+a.d+'</span></div>';}).join('');});
