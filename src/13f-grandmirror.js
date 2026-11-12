// ===== 13f-grandmirror: the towns and buildings of each province (state in the campaign save) =====
// GC.prov[pi].tn = [{nm name, k tier 3 city/2 town/1 hamlet, ow owner nation, ud loyalty offset, dm damage %}];
// GC.prov[pi].bl = province buildings [[kind, damage %]] (airfield, aa, fort, mfort, factory, port, ...) - every stage adds to
// this one list, never a second one. The economy, strikes, sieges (fort level, gwFort) and the map read it.
// (This file used to build a real-time battle map from the province. The grand campaign has no real-time battles since
// 2026-11-12 - Abdullah: "Abandon battles in grand campaign. Turn it into eu 4 rules" - so that builder is gone.)
const GM_STY_REG={NA:'america',SAM:'latin',EU:'europe',ME:'mideast',AF:'mideast',SA:'southasia',EA:'asia',SEA:'asia',OC:'america'};
const GM_STY_NAT={RU:'russia',BY:'russia',UA:'russia',KZ:'russia',UZ:'russia',KP:'korea',KR:'korea',AE:'gulfcity',QA:'gulfcity',KW:'gulfcity',DW:'yemen',
  GT:'latin',DO:'latin',CU:'latin',MX:'latin',TM:'southasia'};
const GM_POOL={mideast:'me',gulfcity:'me',southasia:'me',russia:'ru',europe:'eu',america:'eu',latin:'eu',yemen:'ye',korea:'as',asia:'as'};
function gmStyle(code){return GM_STY_NAT[code]||GM_STY_REG[(GCM.nats.get(code)||{}).reg]||'mideast';}
function gmHash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
// ---- the province's towns and buildings (state lives in GC.prov, so saves keep it) ----
function gmTowns(pi){const st=GC.prov[pi];if(st.tn)return st.tn;const p=GCM.P[pi],R=mulberry(pi*7919+101),sty=gmStyle(st.o0||st.o),pool=TOWN_NAMES[GM_POOL[sty]||'me'],n=Math.max(1,p.tw|0),L=[],h=gmHash(p.n);
  for(let k=0;k<n;k++){let nm=k===0?p.n:pool[(h+k*5)%pool.length];if(k>0&&nm===p.n)nm=pool[(h+k*5+1)%pool.length];if(L.some(q=>q.nm===nm))nm+=' '+(k+1);
    L.push({nm,k:k===0?((p.cap||p.dev>=4)?3:2):k<3?2:1,ow:st.o,ud:Math.round((R()-.5)*16),dm:0,hold:0});}
  return st.tn=L;}
function gmBuildings(pi){const st=GC.prov[pi];if(st.bl)return st.bl;const p=GCM.P[pi],L=[];if(p.port)L.push(['port',0]);if(p.cap)L.push(['aa',0]);
  if(p.dev>=3)for(let i=0;i<Math.min(3,Math.round(p.dev/3));i++)L.push(['fort',0]);return st.bl=L;}
function gmCaptured(pi,taker){const st=GC.prov[pi];if(!st.tn)return;for(const t of st.tn){t.ow=taker;t.hold=0;t.ud=0;}}
function gmRepair(){for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(st.tn)for(const t of st.tn){if(t.dm>0)t.dm=Math.max(0,t.dm-8);t.ud=Math.round(t.ud*.5);if(t.hold&&++t.hn>3){t.hold=0;t.hn=0;t.ow=st.o;}}
    if(st.bl)for(const b of st.bl)if(b[1]>0)b[1]=Math.max(0,b[1]-12);}}
