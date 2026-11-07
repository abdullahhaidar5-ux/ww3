// 13x-gtrade.js — lane B5 slice 2: TRADE NODES (EU4-style) on top of grand2's trade/oil market (geTrade stays; this adds the shared "world trade" layer).
// Every sea zone is a node. Its value = the ports around it (development, towns, oil exports x the oil price index), x1.5 at a chokepoint, x0.3 while the strait is closed;
// 30% of a node's value flows downstream into the busiest neighbouring zone. Each nation's trade POWER there = its ports (blockaded ports count 0, a rival at war that holds the strait
// cuts you to 40%, sanctions halve, a pushed node +40%). Share of value = share of power; the leader of a node keeps a 25% bonus on its cut. The cut becomes a GMOD income row
// ('trade_<nation>', diminishing returns). Cost/counter-play: push costs 40 Diplomatic points for 12 months; blockade, close or seize a strait, sanctions, war. State GC.tn={m,top,push} is JSON-safe, no random.
const GTR_PUSH=40,GTR_PUSHM=12;
function gtrTn(){if(!GC.tn)GC.tn={m:0,top:{},push:{}};return GC.tn;}
function gtrBase(n){const P=GCM.P,q=P[n];let v=0;for(const j of q.adj){const p=P[j];if(!p.land)continue;if(!(p.port||geCount(j,'port')))continue;v+=p.dev*.5+p.tw*2+(p.oil?3*((GC.eco&&GC.eco.oilIdx)||100)/100:0);}
  if(q.ck)v*=(GC.eco&&GC.eco.cl&&GC.eco.cl[n])?.3:1.5;return v;}
let GTR_C=null;   // per-month cache {m,nodes}
function gtrNodes(){const tn=gtrTn();if(GTR_C&&GTR_C.g===GC&&GTR_C.m===tn.m&&GTR_C.t===GC.turn)return GTR_C.nodes;
  const P=GCM.P,seas=P.filter(p=>p.sea),base={};for(const s of seas)base[s.i]=gtrBase(s.i);
  const into={};for(const s of seas){let b=-1,bv=base[s.i];for(const j of s.adj){const q=P[j];if(q.sea&&(base[j]>bv||(base[j]===bv&&b>=0&&j<b&&bv>0))){b=j;bv=base[j];}}if(b>=0)into[s.i]=b;}
  const val={};for(const s of seas)val[s.i]=base[s.i]*(into[s.i]!==undefined?.7:1);for(const k of Object.keys(into))val[into[k]]+=base[k]*.3;
  const nodes=[];for(const s of seas){const v=val[s.i];if(v<=0)continue;const pw={},hold=s.ck?geHolder(s.i):'';let tot=0;
    for(const j of s.adj){const p=P[j];if(!p.land||!(p.port||geCount(j,'port'))||gmilBk(j))continue;const o=GC.prov[j].o;if(!GC.nat[o]||GC.nat[o].dead)continue;
      let w=1+p.dev*.25+p.tw*.5;if(geFx(o,'trade'))w*=1.35;if(GC.nat[o].e&&GC.nat[o].e.sanc)w*=.5;if(hold&&hold!==o&&grAtWar(o,hold))w*=.4;
      const ps=tn.push[s.i];if(ps&&ps.c===o&&ps.u>tn.m)w*=1.4;pw[o]=(pw[o]||0)+w;tot+=w;}
    if(tot<=0)continue;let top='',tv=0;const sh={};for(const o of Object.keys(pw).sort()){sh[o]=pw[o]/tot;if(pw[o]>tv){tv=pw[o];top=o;}}
    nodes.push({i:s.i,n:s.n,v,sh,top,ck:!!s.ck,cl:!!(GC.eco&&GC.eco.cl&&GC.eco.cl[s.i]),hold});}
  GTR_C={g:GC,m:tn.m,t:GC.turn,nodes};return nodes;}
function gtrCut(c){let t=0;for(const n of gtrNodes()){const s=n.sh[c];if(s)t+=n.v*s*(n.top===c?1.25:1);}return t;}
function gtrBonus(c){const t=gtrCut(c);return .2*t/(t+60);}   // up to +20% income, steep early, flat late
function gtrSync(c){gmodRemove('trade_'+c);const f=gtrBonus(c);if(f>.002)gmodAdd({id:'trade_'+c,src:'Trade nodes (sea lanes)',scope:'nation',stat:'income',mul:1+f,t:c});}
function gtrPush(c,ni){const N=GC.nat[c],tn=gtrTn(),nd=gtrNodes().find(n=>n.i===ni);if(!N||!N.pp||!nd)return 'Not available.';if(!nd.sh[c])return 'You have no port on this sea lane.';
  const p=tn.push[ni];if(p&&p.c===c&&p.u>tn.m)return 'Already pushing here.';if(N.pp.dip<GTR_PUSH)return 'Needs '+GTR_PUSH+' Diplomatic points.';
  N.pp.dip-=GTR_PUSH;tn.push[ni]={c,u:tn.m+GTR_PUSHM};GTR_C=null;gtrSync(c);if(c===GC.me)grLog('Merchant fleets pushed into '+nd.n+' for a year.',c);return '';}
function gtrMonth(){if(!GC)return;const tn=gtrTn();tn.m++;GTR_C=null;const nodes=gtrNodes();
  for(const n of nodes){const old=tn.top[n.i];if(old!==n.top){tn.top[n.i]=n.top;if(old&&n.v>=12){const me=GC.me;if(old===me||n.top===me)grLog(n.top===me?('Your merchants now lead trade in '+n.n+'.'):(gdNatName(n.top)+' has taken the lead in '+n.n+' trade from you.'),me);}}}
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;gtrSync(c);
    if(c===GC.me||!N.pp)continue;const mine=nodes.filter(n=>n.sh[c]&&n.v>=10).sort((a,b)=>b.v*b.sh[c]-a.v*a.sh[c]||a.i-b.i);   // AI pushes its best contested node when it has points to spare
    for(const n of mine.slice(0,1)){if(N.pp.dip>=GTR_PUSH+60&&n.top!==c)gtrPush(c,n.i);}}}
GMOD_HOOKS.push(gtrMonth);
npTab('trade','⚓','Trade',(code,body,c)=>{const N=GC.nat[code],own=c.own&&code===GC.me,tn=gtrTn(),nodes=gtrNodes();const cut=gtrCut(code),f=gtrBonus(code);
  body.innerHTML='<div style="opacity:.85;margin-bottom:8px">Every sea lane is a trade node worth what the ports around it trade; part of it flows downstream. Your share follows your ports there — the leader keeps a bonus. Blockades, closed or enemy-held straits, sanctions and war cut your share. You collect <b>'+Math.round(cut)+'</b> trade value, worth <b>+'+(f*100).toFixed(1)+'%</b> income.</div>';
  const mine=nodes.filter(n=>n.sh[code]).sort((a,b)=>b.v*b.sh[code]-a.v*a.sh[code]||a.i-b.i);const rest=nodes.filter(n=>!n.sh[code]).sort((a,b)=>b.v-a.v||a.i-b.i).slice(0,Math.max(0,12-mine.length));
  const tbl=document.createElement('table');tbl.style.cssText='width:100%;border-collapse:collapse;font-size:15px';tbl.innerHTML='<tr><th style="text-align:left;padding:4px 8px">Sea lane</th><th>Value</th><th>Your share</th><th>Leader</th><th></th></tr>';
  for(const n of mine.slice(0,14).concat(rest)){const s=n.sh[code]||0,tr=document.createElement('tr');
    tr.innerHTML='<td style="padding:4px 8px"><b>'+n.n+'</b>'+(n.ck?' <span title="Chokepoint: x1.5 value">⛔</span>':'')+(n.cl?' <span style="opacity:.7">(closed)</span>':'')+'</td><td style="text-align:center">'+Math.round(n.v)+'</td><td style="text-align:center">'+Math.round(s*100)+'%</td><td style="text-align:center">'+(n.top===code?'<b>you</b>':gdNatName(n.top))+'</td>';
    const td=document.createElement('td');td.style.textAlign='center';const pu=tn.push[n.i];
    if(pu&&pu.c===code&&pu.u>tn.m)td.textContent='pushed ('+(pu.u-tn.m)+' mo)';
    else if(own&&s>0&&N.pp){const b=document.createElement('button');b.textContent='Push ('+GTR_PUSH+')';b.style.cssText='font-size:13px;cursor:pointer;padding:1px 6px';b.title='Spend Diplomatic points: +40% trade power here for a year';b.disabled=N.pp.dip<GTR_PUSH;b.onclick=()=>{const e=gtrPush(code,n.i);if(e)grLog(e,code);npDraw();};td.appendChild(b);}
    tr.appendChild(td);tbl.appendChild(tr);}
  body.appendChild(tbl);});
