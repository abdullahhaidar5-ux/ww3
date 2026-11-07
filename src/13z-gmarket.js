// 13z-gmarket.js — lane B5b slice 3: TRADE GOODS & WORLD PRICES (EU4 economy). Oil keeps its own index (GC.eco.oilIdx); this adds Grain, Metals and Wares.
// Chain: each land province makes goods from its real profile (farm flag -> grain, mine -> metals, towns/dev -> wares); the WORLD PRICE of a good moves each month with
// supply/demand (supply = everyone's output, cut by closed/blockaded straits; demand = start level, metals +2.5%/war from arms demand). Who reacts: producers earn more when prices rise
// (income row), importers of grain get food-price unrest, everybody's army upkeep follows the metals price. Counter-play: grain subsidy (cash, 6 months); seize farms/mines, open straits.
// Cost: subsidy burns cash. State GC.mk={t,p,d,h,sub} is JSON-safe, no random; monthly via GMOD_HOOKS; effects are GMOD rows (income/upkeep/unrest), nothing bespoke.
const MK_G=[['grain','Grain','🌾'],['metals','Metals','⛏'],['wares','Wares','🏭']];
function mkSt(){if(!GC.mk){GC.mk={t:-1,p:{grain:100,metals:100,wares:100},d:null,h:{grain:[],metals:[],wares:[]},hi:{},sub:{}};}return GC.mk;}
function mkOut(i){const p=GCM.P[i];if(!p||!p.land)return null;return{grain:p.farm?2+p.tw*.5:0,metals:p.mine?2+p.tw*.5:0,wares:p.tw>=3?p.tw*.6+(p.dev>=6?1:0):0};}
function mkTotals(){const T={grain:0,metals:0,wares:0},by={};for(const p of GCM.P){if(!p.land)continue;const o=GC.prov[p.i]&&GC.prov[p.i].o;if(!o||!GC.nat[o]||GC.nat[o].dead||gmilBk(p.i))continue;const g=mkOut(p.i);
    const b=by[o]||(by[o]={grain:0,metals:0,wares:0,land:0});b.land++;for(const k in T){T[k]+=g[k];b[k]+=g[k];}}return{T,by};}
function mkWars(){let n=0;for(const k of Object.keys(GC.war))if(GC.war[k])n++;return n;}
function mkBlock(){let n=0;try{n=geClosed()*.03+geBlockN()*.02;}catch(e){}return Math.min(.3,n);}
function mkBaseline(){const mk=mkSt();if(!mk.d){const t=mkTotals().T;mk.d={grain:Math.max(1,t.grain),metals:Math.max(1,t.metals),wares:Math.max(1,t.wares)};}return mk.d;}
function mkBasket(c,by){const b=(by||mkTotals().by)[c];if(!b)return{r:1,w:0};const mk=mkSt();let v=0,w=0;for(const g of MK_G){v+=b[g[0]]*mk.p[g[0]]/100;w+=b[g[0]];}
  const oi=((GC.eco&&GC.eco.oilIdx)||100)/100,no=GCM.P.filter(p=>p.oil&&GC.prov[p.i].o===c).length*3;v+=no*oi;w+=no;return{r:w>0?v/w:1,w};}
function mkGrainDef(c,by){const b=(by||mkTotals().by)[c];return b?Math.max(0,b.land*.9-b.grain)/Math.max(1,b.land):0;}   // share of food need imported
function mkSync(c,by){gmodRemove('mk_inc_'+c);gmodRemove('mk_upk_'+c);gmodRemove('mk_un_'+c);const mk=mkSt(),N=GC.nat[c];if(!N||N.dead)return;
  const bk=mkBasket(c,by);if(bk.w>=1){const f=Math.max(-.15,Math.min(.15,.25*(bk.r-1)));if(Math.abs(f)>.004)gmodAdd({id:'mk_inc_'+c,src:'World prices (your goods)',scope:'nation',stat:'income',mul:1+f,t:c});}
  const mp=mk.p.metals/100,uf=Math.max(-.08,Math.min(.1,.12*(mp-1)));if(Math.abs(uf)>.004)gmodAdd({id:'mk_upk_'+c,src:'Metals price (arms and vehicles)',scope:'nation',stat:'upkeep',mul:1+uf,t:c});
  const gp=mk.p.grain,def=mkGrainDef(c,by),sb=mk.sub[c]&&mk.sub[c]>GC.turn;
  if(gp>=130&&def>.25&&!sb)gmodAdd({id:'mk_un_'+c,src:'Food prices (imported grain)',scope:'nation',stat:'unrest',add:gp>=160?2:1,t:c});}
function mkSubsidy(c){const N=GC.nat[c],mk=mkSt();if(!N)return 'Not available.';const cost=Math.max(100,Math.round(.1*Math.max(0,N.cash)));if(mk.sub[c]&&mk.sub[c]>GC.turn)return 'A subsidy is already running.';
  if(N.cash<cost)return 'Needs $'+cost+'.';N.cash-=cost;mk.sub[c]=GC.turn+6;mkSync(c);if(c===GC.me)grLog('Bread subsidy for six months (-$'+cost+').',c);return '';}
function mkMonth(){if(!GC||!GC.prov)return;const mk=mkSt();if(mk.t===GC.turn)return;mk.t=GC.turn;const d=mkBaseline(),{T,by}=mkTotals(),war=mkWars(),blk=mkBlock();
  for(const g of MK_G){const k=g[0];let dem=d[k]*(k==='metals'?1+.025*Math.min(8,war):k==='wares'?1+.01*Math.min(10,war):1),sup=Math.max(1,T[k]*(1-blk));
    const tgt=Math.max(60,Math.min(180,100*dem/sup)),old=mk.p[k];mk.p[k]=Math.round((old+.3*(tgt-old))*10)/10;const h=mk.h[k];h.push(Math.round(mk.p[k]));if(h.length>24)h.shift();
    if(mk.p[k]>=140&&!mk.hi[k]){mk.hi[k]=1;grLog(g[1]+' prices spike to '+Math.round(mk.p[k])+'% — '+(k==='grain'?'import-dependent nations face bread unrest.':k==='metals'?'armies cost more to keep.':'manufacturers profit.'),GC.me);}
    if(mk.p[k]<120)mk.hi[k]=0;}
  for(const c of Object.keys(GC.nat))mkSync(c,by);}
GMOD_HOOKS.push(mkMonth);
function mkSpark(a){if(!a.length)return '';const mx=Math.max(...a,120),mn=Math.min(...a,80);return '<svg width="120" height="28" style="vertical-align:middle"><polyline fill="none" stroke="#9fd0ff" stroke-width="2" points="'+a.map((v,i)=>(i*(116/Math.max(1,a.length-1))+2).toFixed(1)+','+(26-(v-mn)/(mx-mn||1)*24).toFixed(1)).join(' ')+'"/></svg>';}
npTab('mkt','🧺','World market',(code,body,c)=>{mkMonth();const mk=mkSt(),{T,by}=mkTotals(),own=c.own&&code===GC.me,b=by[code]||{grain:0,metals:0,wares:0,land:0};
  const oi=(GC.eco&&GC.eco.oilIdx)||100;
  let h='<div style="opacity:.85;margin-bottom:8px">Prices move with world supply and demand. Wars lift metals; closed or blockaded straits cut supply. Producers earn more at high prices; importers of grain suffer bread unrest; armies cost more to keep when metals are dear.</div>'+
   '<table style="border-collapse:collapse;font-size:16px"><tr style="opacity:.7"><td style="padding:3px 14px 3px 0">Good</td><td>Price</td><td style="padding:0 14px">Last 2 years</td><td>Your output</td><td style="padding-left:14px">World output</td></tr>';
  h+='<tr><td style="padding:3px 14px 3px 0">🛢 Oil</td><td><b>'+oi+'%</b></td><td style="padding:0 14px;opacity:.6">see Trade tab</td><td>'+GCM.P.filter(p=>p.oil&&GC.prov[p.i].o===code).length+' fields</td><td style="padding-left:14px">—</td></tr>';
  for(const g of MK_G){const k=g[0],p=mk.p[k],col=p>=130?'#ff9a8a':p<=80?'#8fd18f':'#e8e4d8';h+='<tr><td style="padding:3px 14px 3px 0">'+g[2]+' '+g[1]+'</td><td><b style="color:'+col+'">'+Math.round(p)+'%</b></td><td style="padding:0 14px">'+mkSpark(mk.h[k])+'</td><td>'+(Math.round(b[k]*10)/10)+'</td><td style="padding-left:14px">'+Math.round(T[k])+'</td></tr>';}
  h+='</table>';const bk=mkBasket(code,by),f=Math.max(-.15,Math.min(.15,.25*(bk.r-1)));
  h+='<div style="margin:10px 0">Your goods basket sells at <b>'+Math.round(bk.r*100)+'%</b> of the base price: income '+(f>=0?'+':'')+Math.round(f*100)+'%. Grain imported: <b>'+Math.round(mkGrainDef(code,by)*100)+'%</b> of your food need.</div>';
  const L=gmodLines('nation',code,'upkeep').concat(gmodLines('nation',code,'unrest')).filter(s=>/prices|Metals|Food/.test(s));if(L.length)h+='<div style="opacity:.85;margin:6px 0">'+L.join('<br>')+'</div>';
  body.innerHTML=h;
  if(own){const cost=Math.max(100,Math.round(.1*Math.max(0,GC.nat[code].cash))),on=mk.sub[code]&&mk.sub[code]>GC.turn,btn=document.createElement('button');
    btn.textContent=on?'Bread subsidy running':'Bread subsidy: 6 months ($'+cost+')';btn.style.cssText='font-size:16px;padding:5px 16px;cursor:pointer';btn.disabled=!!on||GC.nat[code].cash<cost;
    btn.onclick=()=>{const e=mkSubsidy(code);if(e)grLog(e,code);npDraw();};body.appendChild(btn);}});
alAdd('mkt','🌾','Food prices',c=>{const mk=GC.mk;if(!mk||mk.p.grain<130)return null;const N=GC.nat[c];if(!N||mkGrainDef(c)<=.25||(mk.sub[c]&&mk.sub[c]>GC.turn))return null;return{n:Math.round(mk.p.grain)+'%',tip:'grain is dear and you import food — open the World market tab',go:()=>npOpen(c,'mkt')};});
