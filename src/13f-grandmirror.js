// ===== 13f-grandmirror: a "Fight it" battle MIRRORS the province it is fought in (Abdullah 2026-11-06 08:09 "full mirror") =====
// One map system: the province's battle map is a CUSTOM MAP (the map-editor format in 02-map.js, key cm_<hash>) generated
// deterministically from the grand-map data (seed = province id): terrain/biome, relief, sea side, river with a bridge and a ford,
// forests, roads and the province's towns. The attacker's start slot is the map edge its army came from. Provinces that have a
// hand-made real-place map (p.map) keep it, and their towns are matched to the map's towns by size.
// Towns: GC.prov[pi].tn = [{nm name, k tier 3 city/2 town/1 hamlet, ow owner nation, ud loyalty offset, dm damage %}]; the battle
// copies names / owner / unrest / tax / damage onto G.towns and the results flow back (gmWriteBack). GC.prov[pi].bl = province
// buildings [[kind, damage %]] (airfield, aa, fort, mfort, factory, port) - later grand stages add to it, never a second list.
const GM_STY_REG={NA:'america',SAM:'latin',EU:'europe',ME:'mideast',AF:'mideast',SA:'southasia',EA:'asia',SEA:'asia',OC:'america'};
const GM_STY_NAT={RU:'russia',BY:'russia',UA:'russia',KZ:'russia',UZ:'russia',KP:'korea',KR:'korea',AE:'gulfcity',QA:'gulfcity',KW:'gulfcity',DW:'yemen',
  GT:'latin',DO:'latin',CU:'latin',MX:'latin',TM:'southasia'};
const GM_POOL={mideast:'me',gulfcity:'me',southasia:'me',russia:'ru',europe:'eu',america:'eu',latin:'eu',yemen:'ye',korea:'as',asia:'as'};
const GM_CACHE=new Map();
function gmStyle(code){return GM_STY_NAT[code]||GM_STY_REG[(GCM.nats.get(code)||{}).reg]||'mideast';}
function gmHash(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;}
// ---- the province's towns and buildings (state lives in GC.prov, so saves keep it) ----
function gmTowns(pi){const st=GC.prov[pi];if(st.tn)return st.tn;const p=GCM.P[pi],R=mulberry(pi*7919+101),sty=gmStyle(st.o0||st.o),pool=TOWN_NAMES[GM_POOL[sty]||'me'],n=Math.max(1,p.tw|0),L=[],h=gmHash(p.n);
  for(let k=0;k<n;k++){let nm=k===0?p.n:pool[(h+k*5)%pool.length];if(k>0&&nm===p.n)nm=pool[(h+k*5+1)%pool.length];if(L.some(q=>q.nm===nm))nm+=' '+(k+1);
    L.push({nm,k:k===0?((p.cap||p.dev>=4)?3:2):k<3?2:1,ow:st.o,ud:Math.round((R()-.5)*16),dm:0,hold:0});}
  return st.tn=L;}
function gmBuildings(pi){const st=GC.prov[pi];if(st.bl)return st.bl;const p=GCM.P[pi],L=[];if(p.port)L.push(['port',0]);if(p.cap)L.push(['aa',0]);
  if(p.dev>=3)for(let i=0;i<Math.min(3,Math.round(p.dev/3));i++)L.push(['fort',0]);return st.bl=L;}
// each town's unrest / tax follow its province, its owner too unless it was taken in a battle this turn
function gmSync(pi){const st=GC.prov[pi];if(!st)return;for(const t of gmTowns(pi)){if(!t.hold)t.ow=st.o;t.un=Math.max(0,Math.min(100,Math.round((st.un|0)+t.ud)));t.rt=Math.max(0,Math.min(3,st.tax|0));}}
function gmCaptured(pi,taker){const st=GC.prov[pi];if(!st.tn)return;for(const t of st.tn){t.ow=taker;t.hold=0;t.ud=0;}}
function gmRepair(){for(const p of GCM.P){if(!p.land)continue;const st=GC.prov[p.i];if(st.tn)for(const t of st.tn){if(t.dm>0)t.dm=Math.max(0,t.dm-8);t.ud=Math.round(t.ud*.5);if(t.hold&&++t.hn>3){t.hold=0;t.hn=0;t.ow=st.o;}}
    if(st.bl)for(const b of st.bl)if(b[1]>0)b[1]=Math.max(0,b[1]-12);}}
// ---- the generated map ----
function gmRiverProv(pi){const p=GCM.P[pi];if(p.t==='r')return true;for(const r of GM_RIVER)if(r[0]===pi||r[1]===pi)return true;return false;}
function gmOct(pi,from){const P=GCM.P;if(from==null||from<0||from===pi||!P[from])return 6;const a=Math.atan2(P[from].y-P[pi].y,P[from].x-P[pi].x);return ((Math.round(a/(Math.PI/4))%8)+8)%8;}
function gmCanon(pi,oct){const p=GCM.P[pi],st=GC.prov[pi],tn=gmTowns(pi),R=mulberry(pi*7919+55),rr=(a,b)=>a+R()*(b-a);
  const ang=oct*Math.PI/4,u={x:-Math.cos(ang),y:-Math.sin(ang)},lt={x:-u.y,y:u.x};      // u = from the attacker's edge towards the defender's
  const sm=Math.min(1350/(Math.abs(u.x)||1e-9),900/(Math.abs(u.y)||1e-9)),lm=Math.min(1350/(Math.abs(lt.x)||1e-9),900/(Math.abs(lt.y)||1e-9));
  const P=(s,l)=>[Math.round(Math.max(130,Math.min(3070,1600+u.x*s*sm+lt.x*l*lm))),Math.round(Math.max(130,Math.min(2070,1100+u.y*s*sm+lt.y*l*lm)))];
  const reg=(GCM.nats.get(st.o0||st.o)||{}).reg,t=p.t;
  const th=t==='s'?'snow':(t==='f'||t==='j'||t==='r'||((t==='c'||t==='u')&&/EU|NA|SAM|SEA|EA|OC/.test(reg||'')))?'green':'desert';
  const A=P(-.94,0),D=P(.94,0),hasR=gmRiverProv(pi),hasM=t==='m',ch1=.42+rr(-.04,.04),ch2=-.42+rr(-.04,.04);
  const rv=[],rg=[],br=[],lk=[],pk=[],wd=[],rd=[],ct=[],hm=[],oil=[];const ux=Math.round(Math.atan2(u.y,u.x)*180/Math.PI);
  const seg=pts=>{const o=[];for(const q of pts)o.push(q[0],q[1]);return o;};
  const sOf=q=>((q[0]-1600)*u.x+(q[1]-1100)*u.y)/sm,lOf=q=>((q[0]-1600)*lt.x+(q[1]-1100)*lt.y)/lm;
  // river across the line of advance: a bridge on one road, a ford (gap in the river) on the other - two real crossings
  let sr=0;if(hasR){sr=rr(-.12,.12);const line=(l0,l1)=>{const q=[];for(let l=l0;l<=l1+1e-6;l+=.1)q.push(P(sr+Math.sin(l*7+pi)*.035,l));return q;};
    rv.push([36,...seg(line(-1.15,ch2-.07))]);rv.push([36,...seg(line(ch2+.07,1.15))]);const bp=P(sr+Math.sin(ch1*7+pi)*.035,ch1);br.push([bp[0],bp[1],ux]);}
  // mountain ridge with two passes (on the two roads)
  let sg=0;if(hasM){sg=hasR?.38:rr(-.1,.12);const line=(l0,l1)=>{const q=[];for(let l=l0;l<=l1+1e-6;l+=.1)q.push(P(sg+Math.sin(l*5+pi)*.04,l));return q;};
    rg.push([85,...seg(line(-1.15,ch2-.1))]);rg.push([85,...seg(line(ch2+.1,ch1-.1))]);rg.push([85,...seg(line(ch1+.1,1.15))]);
    for(let i=0;i<9;i++){const q=P(sg+rr(-.25,.25),rr(-1,1));if(Math.abs(lOf(q)-ch1)<.12||Math.abs(lOf(q)-ch2)<.12)continue;pk.push([q[0],q[1],Math.round(rr(40,110))]);}}
  // sea side: a coastal province has the sea along one flank (never across the line of advance)
  if(p.coast&&(t==='c'||p.port||R()<.35)){let best=null,bd=1e9;for(const j of p.adj){const q=GCM.P[j];if(!q.sea)continue;const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=q;}}
    if(best){let dx=best.x-p.x,dy=best.y-p.y;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;if(Math.abs(dx*u.x+dy*u.y)>.6){const sg2=(dx*lt.x+dy*lt.y)>=0?1:-1;dx=lt.x*sg2;dy=lt.y*sg2;}
      lk.push([Math.round(1600+dx*1650),Math.round(1100+dy*1130),t==='c'?640:430]);}}
  // towns: the first near the middle, the rest spread along the line of advance on both flanks, never on the river/ridge or a start
  const pos=[],far=(x,y,d)=>pos.every(q=>Math.hypot(q[0]-x,q[1]-y)>d);
  for(let k=0;k<tn.length;k++){let q=null;for(let tr=0;tr<60&&!q;tr++){const s=k===0?rr(-.2,.2):-.62+1.24*(k-.5)/Math.max(1,tn.length-1)+rr(-.12,.12),l=k===0?rr(-.45,.45):(k%2?1:-1)*rr(.3,.75),c=P(s,l);
      if(Math.hypot(c[0]-A[0],c[1]-A[1])<500||Math.hypot(c[0]-D[0],c[1]-D[1])<500||!far(c[0],c[1],tr<40?520:380))continue;
      if(hasR&&Math.abs(s-sr)<.14)continue;if(hasM&&Math.abs(s-sg)<.12)continue;if(lk.some(z=>Math.hypot(z[0]-c[0],z[1]-c[1])<z[2]+190))continue;q=c;}
    if(!q)q=P(-.6+1.2*k/Math.max(1,tn.length),(k%2?1:-1)*.5);pos.push(q);}
  const sty=Math.max(0,CM_STYLES.indexOf(gmStyle(st.o0||st.o)));
  tn.forEach((tw,k)=>{const q=pos[k];if(tw.k>=2)ct.push([q[0],q[1],tw.k===3?(p.cap?230:200):120,sty]);else hm.push([q[0],q[1]]);});
  // roads along the two channels (bridge channel and ford channel) with a spur into every town
  const road=ch=>{const w=[A,P(-.55,ch)];if(hasR||hasM)w.push(P(hasR?sr:sg,ch));w.push(P(.55,ch),D);return seg(w);};
  rd.push(road(ch1),road(ch2));
  pos.forEach(q=>{const ln=lOf(q),ch=Math.abs(ln-ch1)<Math.abs(ln-ch2)?ch1:ch2,a=P(sOf(q),ch);rd.push([q[0],q[1],a[0],a[1]]);});
  // woods by biome
  const nW={f:16,j:30,u:5,d:3,m:9,s:16,c:7,r:14}[t]||6;
  for(let i=0,got=0;i<nW*10&&got<nW;i++){const c=P(rr(-.9,.9),rr(-1,1));if(Math.hypot(c[0]-A[0],c[1]-A[1])<420||Math.hypot(c[0]-D[0],c[1]-D[1])<420)continue;if(pos.some(q=>Math.hypot(q[0]-c[0],q[1]-c[1])<330))continue;
    if(lk.some(z=>Math.hypot(z[0]-c[0],z[1]-c[1])<z[2]+60))continue;if(hasR&&Math.abs(sOf(c)-sr)<.08)continue;wd.push([c[0],c[1],Math.round(rr(90,220))]);got++;}
  if(p.oil){oil.push(P(rr(-.15,.15),.8),P(rr(-.15,.15),-.8));}
  return{canon:{nm:p.n.slice(0,26),z:p.dev>=4?1:0,th,sl:[A,D],rv,rg,rd,lk,pk,wd,ct,hm,oil,fl:[],br},pos};}
// the battle map for a province: {key, real, tp (town positions in design units, index = GC.prov[pi].tn index)}; cached per province+edge
function gmMap(pi,from){const p=GCM.P[pi];
  if(p.map&&MAPS[p.map]&&(MAPS[p.map].min||2)<=2)return{key:p.map,real:true,tp:null};
  const oct=gmOct(pi,from),sig=[p.t,p.tw,p.oil?1:0,p.port?1:0,p.cap?1:0,p.coast?1:0,oct,GC.prov[pi].o0||GC.prov[pi].o].join('|'),ck=pi+':'+oct,c=GM_CACHE.get(ck);
  if(c&&c.sig===sig)return c.v;
  const g=gmCanon(pi,oct),key=registerCustomMap(g.canon);if(!key)return{key:'oasis',real:true,tp:null};
  const M=MAPS[key];M.manual=true;M.name=p.n;M.tag='battle for '+p.n;   // manual: no auto-placed extra hamlets / oil - the towns are exactly the province's
  const v={key,real:false,tp:g.pos};GM_CACHE.set(ck,{sig,v});return v;}
// ---- inside the battle ----
function gmTeamOf(nat,m){return nat===m.nat[0]?0:nat===m.nat[1]?1:-1;}
function gmKillCell(c){c.dead=true;c.ow=-1;c.cp=0;c.hp=0;try{if(G.grid[c.k]===3)gridOpen(c.k);}catch(e){}try{rubMark(c);}catch(e){}G.civDirty=true;}
function gmApply(){const g=G.grand,m=g&&g.mir;if(!m)return;const tn=gmTowns(m.pi);gmSync(m.pi);
  const rank=tn.map((t,i)=>i).sort((a,b)=>tn[b].k-tn[a].k||a-b),pairs=[];
  if(!m.real&&m.tp){const used=new Set();tn.forEach((tw,k)=>{let bi=-1,bd=1e9;G.towns.forEach((t,i)=>{if(used.has(i))return;const d=Math.hypot(t.x-m.tp[k][0]*WK,t.y-m.tp[k][1]*WK);if(d<bd){bd=d;bi=i;}});if(bi>=0&&bd<260*WK){used.add(bi);pairs.push([k,bi]);}});}
  else{const order=G.towns.map((t,i)=>i).sort((a,b)=>G.towns[b].r-G.towns[a].r||a-b);rank.forEach((k,j)=>{if(order[j]!=null)pairs.push([k,order[j]]);});}
  g.tmap=[];
  for(const [k,ti] of pairs){const t=G.towns[ti],rec=tn[k],tm=gmTeamOf(rec.ow,m);t.name=rec.nm;t.gk=k;t.rate=rec.rt;t.un=rec.un;t.hold=-200;t.fresh=0;t.w70=t.w90=0;
    t.ow=tm;for(const c of t.cells){c.ow=tm;c.cp=0;c.cpT=-1;}
    // current damage: the outermost buildings are already rubble, one is half-wrecked (a razed town is all rubble)
    if(rec.dm>0){const cs=t.cells,tot=cs.reduce((a,c)=>a+(c.max||1),0),keep=rec.dm>=100?0:(cs.find(c=>c.key)||cs[0]);let goal=rec.dm/100*tot,acc=0;
      for(let i=cs.length-1;i>=0&&acc<goal;i--){const c=cs[i];if(c===keep)continue;const w=c.max||1;if(acc+w<=goal+.5){gmKillCell(c);acc+=w;}else{c.hp=Math.max(1,Math.round(w-(goal-acc)));acc=goal;}}}
    g.tmap.push([k,ti]);}
  // province buildings on the owner's side (forts, AA/SAM, airfield, factory, port, Mountain Fortress), with their current damage
  g.bmap=[];const owT=gmTeamOf(GC.prov[m.pi].o,m);
  if(owT>=0){const B=BASES[owT],a=baseFacing(owT),fac=G.teams[owT].fac,KIND={fort:'turret',aa:'sam',airfield:'airfield',factory:'factory',port:'shipyard',mfort:'fort'},bl=gmBuildings(m.pi);let n=0;
    for(const rec of bl){const kind=KIND[rec[0]];if(!kind||!bldAllowed(fac,kind))continue;if(kind==='shipyard'&&!GCM.P[m.pi].coast)continue;let ok=null;
      for(let k=0;k<110&&!ok;k++){const r=(kind==='turret'||kind==='sam'?170:260)+k*9,ang=a+((k%7)-3)*.42+n*.55,px=B[0]+Math.cos(ang)*r,py=B[1]+Math.sin(ang)*r;
        const q=nearestPassXY('ground',px,py);if(!q||Math.hypot(q[0]-px,q[1]-py)>70)continue;if(G.ents.some(e=>e.isB&&Math.hypot(e.x-q[0],e.y-q[1])<110))continue;ok=q;}
      n++;if(!ok)continue;const e=addBld(owT,kind,ok[0],ok[1],true);if(!e)continue;if(rec[1]>0)e.hp=Math.max(1,Math.round(e.max*(1-Math.min(rec[1],95)/100)));g.bmap.push([rec,e]);}}}
// results go back to the province: captured towns, loyalty, damage (and rubble), building damage
function gmWriteBack(){const g=G.grand,m=g&&g.mir;if(!m||!g.tmap)return;const tn=gmTowns(m.pi),st=GC.prov[m.pi];let sum=0,cnt=0;
  for(const [k,ti] of g.tmap){const t=G.towns[ti],rec=tn[k];if(t.ow===0||t.ow===1)rec.ow=m.nat[t.ow];
    rec.hold=rec.ow!==st.o?1:0;rec.hn=0;rec.uu=Math.round(t.un);sum+=t.un;cnt++;
    let hp=0,mx=0;for(const c of t.cells){mx+=c.max||1;hp+=c.dead?0:Math.max(0,c.hp);}rec.dm=mx?Math.max(0,Math.min(100,Math.round(100*(1-hp/mx)))):0;}
  if(cnt)st.un=Math.round(Math.max(0,Math.min(100,(st.un*(tn.length-cnt)+sum)/tn.length)));
  for(const [k] of g.tmap){const rec=tn[k];rec.ud=Math.max(-40,Math.min(60,rec.uu-(st.un|0)));delete rec.uu;}
  for(const [rec,e] of g.bmap)rec[1]=(e.dead||!G.byId.has(e.id))?100:Math.max(0,Math.min(99,Math.round(100*(1-e.hp/e.max))));}
