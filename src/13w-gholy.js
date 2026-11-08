// HOLY SITES (lane G, RG17): provinces that hold a faith's great shrines. Respectful and equal for every faith: each site you hold gives a small
// war-support lift (national pride, modifier rows); taking one by force angers the world a little and its faith's home nation a lot, and unsettles the province.
// Sites are DATA rows (province name, faith, name of the shrine city, home nation). No new sim state beyond GC.hs (the last-seen holder), saved with the campaign.
const HS_ROWS=[
 {p:'Hejaz',f:'Islam',n:'Mecca and Medina',h:'SA'},{p:'Baghdad',f:'Islam',n:'Najaf and Karbala',h:'IQ'},{p:'Khorasan',f:'Islam',n:'Mashhad',h:'IR'},
 {p:'Tehran',f:'Islam',n:'Qom',h:'IR'},{p:'Tel Aviv',f:'Judaism, Christianity and Islam',n:'Jerusalem',h:'IL'}];
function hsIdx(){if(!GCM._hs)GCM._hs=HS_ROWS.map(r=>{const p=GCM.P.find(q=>q.n===r.p);return p?Object.assign({i:p.i},r):null;}).filter(Boolean);return GCM._hs;}
function hsCount(c){return hsIdx().filter(r=>GC.prov[r.i]&&GC.prov[r.i].o===c).length;}
GMOD_COND.holy=(k,arg)=>!!GC&&hsCount(k)>=(+arg||1);
GMOD_ROWS.push({id:'holy1',src:'Holds a holy site',scope:'nation',stat:'warSupport',add:.02,cond:'holy:1'},
               {id:'holy2',src:'Holds two holy sites',scope:'nation',stat:'warSupport',add:.02,cond:'holy:2'});
function hsCaptured(pi,taker,prev){const r=hsIdx().find(x=>x.i===pi);if(!r||!GC||taker===prev)return;
  for(const c of Object.keys(GC.nat)){if(c===taker||GC.nat[c].dead)continue;try{gdRel(c,taker,c===r.h?-30:-6);}catch(e){}}
  for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===taker&&p.i===pi){GC.prov[pi].un=Math.min(100,GC.prov[pi].un+10);}
  grLog(gdNatName(taker)+' took '+r.n+' ('+r.f+'). The world watches; '+gdNatName(r.h)+' is outraged.',taker);
  try{pilCapturedExtra(taker);}catch(e){}
  try{if(taker===GC.me||prev===GC.me||r.h===GC.me)gevToast(['🕌 '+r.n+' has changed hands']);}catch(e){}}
function hsList(c){return hsIdx().filter(r=>GC.prov[r.i].o===c);}
// PILGRIMAGE SEASONS (lane G, RG60): Hajj (late May) and Arbaeen (early August, 2026 dates from the Islamic lunar calendar, approximate) are one-month seasons.
// Every nation that holds a holy site gets a pride lift in its season (GMOD row), and taking a holy site during a season angers the world more.
// The season is DATA (month index 0 = Jan). Respectful and equal: every faith's site counts the same. Truces expected in season: open (AI does not yet hold back).
const PIL_SEASONS=[{k:'hajj',n:'Hajj season',m:4},{k:'arbaeen',n:'Arbaeen season',m:7}];
function pilNow(){if(!GC)return null;const m=((GC.turn|0)-1+grM0())%12;return PIL_SEASONS.find(s=>s.m===m)||null;}
GMOD_COND.pil=(k)=>!!GC&&!!pilNow()&&hsCount(k)>=1;
GMOD_ROWS.push({id:'pil1',src:'Pilgrimage season: holy sites lift pride',scope:'nation',stat:'warSupport',add:.03,cond:'pil:1'});
function pilMonth(){if(!GC)return;const s=pilNow(),key=s?s.k:'';if(GC._pilA===key)return;GC._pilA=key;
  if(s){grLog(s.n+' has begun. Pilgrims crowd the holy cities; every holder of a site feels it.');
    try{if(hsIdx().some(r=>GC.prov[r.i]&&(GC.prov[r.i].o===GC.me)))gevToast(['🕌 '+s.n+' has begun']);}catch(e){}}}
GMOD_HOOKS.push(pilMonth);
function pilCapturedExtra(taker){if(!pilNow()||!GC)return;for(const c of Object.keys(GC.nat)){if(c===taker||GC.nat[c].dead)continue;try{gdRel(c,taker,-8);}catch(e){}}
  grLog('Taking a holy site during a pilgrimage season: the pilgrims\' world is shocked.',taker);}
