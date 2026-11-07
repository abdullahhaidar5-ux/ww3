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
  try{if(taker===GC.me||prev===GC.me||r.h===GC.me)gevToast(['🕌 '+r.n+' has changed hands']);}catch(e){}}
function hsList(c){return hsIdx().filter(r=>GC.prov[r.i].o===c);}
