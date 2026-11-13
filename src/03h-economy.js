/* ---------- ECONOMY, part 1 - earning and towns (branch orch/economy1; Abdullah 2026-11-05 19:04) ----------
   Builds on the Conquest towns (03-sim "CONQUEST: towns"), roads/convoys/ports (03c-logistics) and the oil/hamlet placement; adds:
   1 TRADE CARAVANS  two of your towns joined by a road network you hold -> civilian trucks shuttle between them, each leg pays a
                     bonus; enemies can shoot them (the route is drawn on the world + minimap).
   2 FOOD            plots of farmland around every town feed it. ONE bar per town (t.fd 0-100). Shelled / burnt plots (they replant after
                     ECB_T s) and cut-off towns go hungry -> unrest and less tax; fed towns are calmer and can grow.
   3 MINES/FACTORIES quarries (home hamlet), factories (forward hamlet) and mines (the contested hamlets) sit beside hamlets chosen by the
                     same fair placement as the hamlets themselves (each base gets the same). Hold them with units standing there:
                     quarry/mine = steady income, factory = production buildings within ECF_R cost a bit less and build faster.
   4 PORT TRADE      every open port pays (first full, others half) per second - 03c-logistics lgToll; a blockade cuts it. HUD shows /min.
   5 GROWTH          t.lv 0 hamlet / 1 town / 2 city: well-run towns (calm, fed, connected, not shelled/damaged) fill t.gp and grow
                     (+20% tax per level above their start, more local militia, more houses drawn); shelled/starved towns shrink.
   6 INVEST          power / water / road paving per town (t.inv bits): +10% tax each and 25% faster growth; water also helps the food bar,
                     paving speeds repairs and caravan pay, power calms unrest a little.
   7 REBUILD         damaged / collapsed houses (t.dm 0-1) cut tax until locals (slowly) or engineers (dozers nearby, fast) repair them.
   Host-authoritative and deterministic (no random numbers; everything from state + time). t.* fields are saved by the checkpoint
   (07b-ckpt copies every town field), G.ec by CK_G; clients get a compact pack (ecPack/ecApply inside hmPack). All nations the same;
   the AI invests, trades and sends units at mines like a player. */
const EC_N=[];
const ECB_T=150,ECG_T=300,ECF_R=900,ECI_COST=[260,210,170],ECI_NAME=['Power grid','Water supply','Road paving'],EC_LV=['Hamlet','Town','City'];
const EC_CAV_COST=30,EC_CAV_MAX=2,EC_CAV_EVERY=36,EC_PT_R=170,EC_PT_INC=[1.0,2.0,0],EC_PT_NAME=['Quarry','Mine','Factory'];
function ecInit(){G.ec={pts:[],cav:[],rt:[],rtT:0,cvT:0,aiT:0,pi:0,v:0};G.ecPl={};
  for(const t of G.towns){t.lv0=t.lv=t.ham?0:(t.prize?2:1);t.gp=0;t.inv=0;t.dm=0;t.rbd=0;t.nd=0;t.em=1;t.fx=0;t.fd=70;t.fb=[];t.shl=0;t.ecT=0;t.ecL=0;}}
// farmland plots around a town: pure function of the town + map, so host and clients agree (cached, not checkpointed)
function ecPlots(t){const C=G.ecPl||(G.ecPl={});if(C[t.i])return C[t.i];const n=t.ham?2:t.prize?6:4,out=[];
  for(let k=0;k<n;k++){const a=t.i*1.3+k*(6.2832/n)+.4,rr=(t.r||160)+95+(k%2)*45;let x=t.x+Math.cos(a)*rr,y=t.y+Math.sin(a)*rr;x=Math.max(70,Math.min(MAPW-70,x));y=Math.max(70,Math.min(MAPH-70,y));
    const q=nearestPassXY('ground',x,y);if(!q||Math.hypot(q[0]-x,q[1]-y)>50)continue;if(out.some(p=>Math.hypot(p[0]-q[0],p[1]-q[1])<80))continue;out.push([q[0],q[1],a]);}
  return C[t.i]=out;}
function ecAlive(t){const P=ecPlots(t);let a=0;for(let k=0;k<P.length;k++)if(!((t.fb&&t.fb[k])>G.t))a++;return{n:P.length,a};}
// a blast burns / shells the farmland (and counts as shelling for growth)
function ecBoom(x,y,r){if(!G.ec||!G.towns||r<14)return;for(const t of G.towns){const d=Math.hypot(t.x-x,t.y-y);if(d>(t.r||160)+260+r)continue;
    if(d<(t.r||160)*1.2+90&&r>=18)t.shl=G.t+25;const P=ecPlots(t);for(let k=0;k<P.length;k++)if(Math.hypot(P[k][0]-x,P[k][1]-y)<r+28){if(!t.fb)t.fb=[];t.fb[k]=G.t+ECB_T;}}}
// ---- per-town economy, called from updTowns for every held town (after the front-line count, before the unrest sum) ----
function ecTown(t,st){if(t.fd==null)ecTownFix(t);const T=G.teams[t.ow];
  const inv=t.inv|0,nv=(inv&1?1:0)+(inv&2?1:0)+(inv&4?1:0),cut=!!t.cut;
  // food: fields feed the town; cut-off and shelling starve it
  const A=ecAlive(t),frac=A.n?A.a/A.n:.7,rate=(frac*1.1-.45-(cut?.7:0)-(t.shl>G.t?.2:0)+(inv&2?.12:0))*1.0;t.fd=Math.max(0,Math.min(100,t.fd+rate*st));
  t.fx=(t.fd>=60?-.2:t.fd<=0?1.2:t.fd<25?.7:0)+(inv&1?-.15:0);
  // damage / rebuild (cells scanned every 2 s)
  t.ecL+=st;if(G.t>=t.ecT){const dt=Math.max(.5,t.ecL);t.ecL=0;t.ecT=G.t+2;ecDamage(t,dt,T);}
  // growth / shrink
  const good=t.un<35&&t.fd>=60&&!cut&&t.dm<.25&&!(t.shl>G.t)&&!(t.fr>0)&&t.reb<=G.t,bad=t.fd<10||t.dm>.55||(t.shl>G.t&&t.dm>.2);
  if(good){if(t.lv<2){t.gp+=100/ECG_T*(1+.25*nv)*st;if(t.gp>=100){t.lv++;t.gp=0;G.ec.v++;ecGrowLog(t,1);}}}
  else if(bad){t.gp-=100/ECG_T*.8*st;if(t.gp<=0){if(t.lv>Math.max(0,t.lv0-1)){t.lv--;t.gp=50;G.ec.v++;ecGrowLog(t,-1);}else t.gp=0;}}
  // the multiplier townIncome() uses: growth x investment x hunger x damage
  const dl=t.lv-t.lv0,gm=dl>=0?1+.2*dl:1+.15*dl;t.em=gm*(1+.1*nv)*(t.fd<25?.85:1)*(1-.6*Math.min(1,t.dm*1.5));}
function ecTownFix(t){t.lv0=t.lv0==null?(t.ham?0:(t.prize?2:1)):t.lv0;if(t.lv==null)t.lv=t.lv0;t.gp=t.gp||0;t.inv=t.inv|0;t.dm=t.dm||0;t.rbd=t.rbd||0;t.nd=t.nd|0;t.em=t.em||1;t.fx=t.fx||0;t.fd=t.fd==null?70:t.fd;t.fb=t.fb||[];t.shl=t.shl||0;t.ecT=t.ecT||0;t.ecL=t.ecL||0;}
function ecGrowLog(t,d){const o=t.ow;if(o<0)return;if(d>0)log(o,`${t.name} has grown into a ${EC_LV[t.lv].toLowerCase()} - more tax, more militia.`,'g');else log(o,`${t.name} is shrinking (shelling, hunger or ruins) - it is now a ${EC_LV[t.lv].toLowerCase()}.`,'bad');}
function ecDamage(t,dt,T){let n=0,loss=0,nd=0;for(const c of t.cells){n++;if(c.dead){nd++;loss+=1-(t.rbd||0);}else if(c.max)loss+=Math.max(0,1-c.hp/c.max);}
  if(nd>t.nd&&t.nd>0)t.rbd=(t.rbd||0)*t.nd/nd;else if(nd>t.nd)t.rbd=0;t.nd=nd;t.dm=n?loss/n:0;
  if(t.dm<=.001&&t.rbd>=1)return;if(t.fr>0||t.shl>G.t)return;   // no rebuilding under fire
  let dz=0;for(const e of nearby(t.x,t.y,T_GAR_R+60,EC_N))if(!e.dead&&!e.isB&&e.kind==='dozer'&&ally(e.team,t.ow))dz++;
  const k=(.0016+Math.min(3,dz)*.0075)*(t.inv&4?1.5:1)*(t.un<50?1:.4)*dt;   // locals ~10 min for a full rebuild, with engineers ~1.5 min
  for(const c of t.cells){if(c.dead||!c.max||c.hp>=c.max)continue;c.hp=Math.min(c.max,c.hp+c.max*k*2);const f=c.hp/c.max;if(f>.66&&(c.stg|0)>0)c.stg=0;else if(f>.33&&(c.stg|0)>1)c.stg=1;}
  if(nd&&t.rbd<1)t.rbd=Math.min(1,t.rbd+k*1.4);}
// ---- investing ----
function ecInvCost(t,k){return Math.round(ECI_COST[k]*(t.ham?.6:t.lv>=2?1.4:1)*(G.bs||1));}
function ecCmd(team,a){const t=G.towns&&G.towns[a.ti|0],T=G.teams[team],k=a.k|0;if(!t||!T||T.out||T.reb||t.ow<0||!ally(t.ow,team)||t.reb>G.t||k<0||k>2||((t.inv|0)&(1<<k)))return;
  const c=ecInvCost(t,k);if(T.credits<c){if(!T.ai)log(team,`Not enough money for ${ECI_NAME[k].toLowerCase()} in ${t.name} ($${c}).`,'w');return;}
  T.credits-=c;t.inv=(t.inv|0)|(1<<k);G.ec.v++;log(team,`${t.name}: ${ECI_NAME[k]} built - more tax and faster growth from now on.`,'g');}
// ---- mines, quarries, factories beside the fairly placed hamlets ----
function ecPlacePts(){const E=G.ec;E.pi=1;E.pts=[];if(typeof BASES==='undefined'||!BASES||!BASES.length)return;
  const ham=G.towns.filter(t=>t.ham&&t.cells&&t.cells.length),used=new Set(),cx=MAPW/2,cy=MAPH/2,NB=BASES.length;
  const nb=h=>{let b=0,bd=1e18;for(let i=0;i<NB;i++){const d=Math.hypot(h.x-BASES[i][0],h.y-BASES[i][1]);if(d<bd){bd=d;b=i;}}return b;};
  const mk=(h,k,hb)=>{let dx=cx-h.x,dy=cy-h.y;if(hb!=null){dx=h.x-BASES[hb][0];dy=h.y-BASES[hb][1];}const L=Math.hypot(dx,dy);if(L<60){dx=1;dy=0;}else{dx/=L;dy/=L;}   // home sites sit the same step beyond their hamlet away from the base, contested mines towards the map centre
    const q=nearestPassXY('ground',h.x+dx*135,h.y+dy*135);if(!q)return false;
    E.pts.push({i:E.pts.length,k,x:q[0],y:q[1],ow:-1,cp:0,cpT:-1,ti:h.i,inc:0});used.add(h.i);return true;};
  for(const k of [0,2])for(let i=0;i<NB;i++){let best=null,bd=1e18;for(const h of ham){if(used.has(h.i)||nb(h)!==i)continue;const d=Math.hypot(h.x-BASES[i][0],h.y-BASES[i][1]);if(d<bd){bd=d;best=h;}}if(best)mk(best,k,i);}
  for(const h of ham)if(!used.has(h.i))mk(h,1);E.v++;}
function ecPoints(st){const E=G.ec,N=G.teams.length;if(!E.pi)ecPlacePts();
  for(const T of G.teams)T.ecM=0;
  for(const p of E.pts){const cnt=new Array(N).fill(0);let any=0;
    for(const e of nearby(p.x,p.y,EC_PT_R,EC_N)){if(e.dead||e.isB||e.inTun||e.team<0||e.team>=N||!e.s||e.s.dom!=='ground'||e.s.noAttack||e.kind==='harv'||e.kind==='dozer'||G.teams[e.team].reb)continue;if(Math.hypot(e.x-p.x,e.y-p.y)>EC_PT_R)continue;cnt[e.team]++;any++;}
    let w=-1,c=0,foe=0;for(let k=0;k<N;k++)if(cnt[k]>c){c=cnt[k];w=k;}if(w>=0)for(let k=0;k<N;k++)if(k!==w&&cnt[k]>0&&!ally(k,w))foe+=cnt[k];
    if(w>=0&&!foe&&!G.teams[w].reb&&!(p.ow>=0&&ally(p.ow,w))){if(p.cpT!==w){p.cpT=w;p.cp=0;}p.cp+=st*Math.min(c,4)/22;
      if(p.cp>=1){const prev=p.ow;p.ow=w;p.cp=0;p.cpT=-1;E.v++;const nm=EC_PT_NAME[p.k].toLowerCase();log(w,`${EC_PT_NAME[p.k]} captured - ${p.k===2?'production near it is cheaper and faster':'it pays $'+(EC_PT_INC[p.k]*(G.bs||1)).toFixed(1)+'/s'}.`,'g');if(prev>=0&&!ally(prev,w))log(prev,`We lost a ${nm} to the enemy.`,'bad');FXE('txt',[p.x|0,p.y|0,EC_PT_NAME[p.k].toUpperCase(),w,-2]);}}
    else if(p.cp>0&&any===0)p.cp=Math.max(0,p.cp-st/40);
    if(p.ow>=0&&p.ow<N){const T=G.teams[p.ow];if(T&&!T.out&&!T.reb&&EC_PT_INC[p.k]>0){const v=EC_PT_INC[p.k]*(G.bs||1);T.credits+=v*st;T.ecM+=v;}}}}
// factories: cost / speed bonus for production buildings near a factory you hold
function ecFacNear(team,x,y){const E=G.ec;if(!E||!E.pts)return false;for(const p of E.pts)if(p.k===2&&p.ow>=0&&ally(p.ow,team)&&Math.hypot(p.x-x,p.y-y)<ECF_R)return true;return false;}
function ecCostMul(team,cat){const E=G.ec;if(!E||!E.pts||!E.pts.some(p=>p.k===2&&p.ow>=0&&ally(p.ow,team)))return 1;for(const e of G.ents)if(e.isB&&e.team===team&&e.kind===cat&&e.built>=1&&!e.dead&&ecFacNear(team,e.x,e.y))return .92;return 1;}
function ecSpeedMul(team,bl){const E=G.ec;if(!E||!E.pts||!bl.length||!E.pts.some(p=>p.k===2&&p.ow>=0&&ally(p.ow,team)))return 1;let n=0;for(const e of bl)if(ecFacNear(team,e.x,e.y))n++;return 1+.12*n/bl.length;}
// ---- trade caravans ----
function ecRoutes(){const E=G.ec,L=G.lg;if(!L||!L.reach||!L.trade)return;E.rt=E.rt.filter(r=>{const a=G.towns[r.a],b=G.towns[r.b],T=G.teams[r.team];return a&&b&&T&&!T.out&&!T.reb&&a.ow===r.team&&b.ow===r.team&&!a.cut&&!b.cut&&a.trade&&b.trade&&a.reb<=G.t&&b.reb<=G.t;});
  for(const T of G.teams){if(T.out||T.reb||E.rt.some(r=>r.team===T.id))continue;
    const my=G.towns.filter(t=>t.ow===T.id&&!t.cut&&t.trade&&t.reb<=G.t&&L.tn[t.i]!=null);if(my.length<2)continue;
    const pr=[];for(let i=0;i<my.length;i++)for(let j=i+1;j<my.length;j++){const d=Math.hypot(my[i].x-my[j].x,my[i].y-my[j].y);if(d>650&&d<3200)pr.push([d,my[i],my[j]]);}
    pr.sort((p,q)=>q[0]-p[0]||p[1].i-q[1].i||p[2].i-q[2].i);   // the longest pairs first (more risk, more pay)
    for(let k=0;k<Math.min(3,pr.length);k++){const [d,a,b]=pr[k],r=lgRoute(T.id,L.tn[a.i],L.tn[b.i]);if(!r||r.pts.length<2||r.len>d*2.6)continue;
      E.rt.push({team:T.id,a:a.i,b:b.i,pts:r.pts,len:Math.round(r.len)});E.v++;log(T.id,`Trade route opened: ${a.name} - ${b.name}. Caravans will run between them; guard the road.`,'g');break;}}}
function ecCaravans(st){const E=G.ec;if(!G.conq||!G.lg||!G.lg.reach)return;
  E.cav=E.cav.filter(id=>{const u=G.byId.get(id);if(u&&u.dead&&u.cv&&!u.cv.rep){u.cv.rep=1;log(u.team,'A trade caravan was destroyed! Escort the road or the trade stops.','bad');FXE('tping',[u.team,u.x|0,u.y|0,0]);}return u&&!u.dead;});
  E.rtT+=st;if(E.rtT>=15){E.rtT=0;ecRoutes();}
  E.cvT+=st;if(E.cvT<EC_CAV_EVERY)return;E.cvT=0;
  for(const r of E.rt){const T=G.teams[r.team];if(!T||T.credits<EC_CAV_COST+150)continue;let n=0;for(const id of E.cav){const u=G.byId.get(id);if(u&&u.team===r.team)n++;}if(n>=EC_CAV_MAX)continue;
    const a=r.pts[0],sp=nearestPassXY('ground',a[0],a[1])||a,u=addUnit(r.team,'harv',sp[0],sp[1]);if(!u)continue;T.credits-=EC_CAV_COST;u.cv={cav:1,ti:-1,dp:0,pts:r.pts.slice(),i:1,ret:0,esc:0,w:0,k:0,a:r.a,b:r.b,len:r.len,leg:0};E.cav.push(u.id);E.v++;}}
function ecCaravan(u,dt){const c=u.cv,P=c.pts;c.k+=dt;
  if(c.k>=2){c.k=0;const A=G.towns[c.a],B=G.towns[c.b];if(!A||!B||A.ow!==u.team||B.ow!==u.team||A.cut||B.cut||!G.ec.rt.some(r=>r.team===u.team&&r.a===c.a&&r.b===c.b)){u.dead=true;c.rep=1;return;}}
  if(c.sk==null){c.sk=0;c.sx=u.x;c.sy=u.y;}c.sk+=dt;
  if(c.sk>=4){if(Math.hypot(u.x-c.sx,u.y-c.sy)<10){c.stk=(c.stk||0)+c.sk;if(c.stk>=8&&c.i<P.length-1){c.i++;c.stk=0;}if((c.stk||0)>=40){c.rep=1;u.dead=true;return;}}else c.stk=0;c.sk=0;c.sx=u.x;c.sy=u.y;}   // jammed on a building / another truck: skip the point, then give up
  if(c.i>=P.length){c.rep=1;u.dead=true;return;}
  const tp=P[c.i],E=G.lgd&&G.lgd.cr?G.lgd.cr[tp[2]]:null;if(E&&E.t>G.t){c.w+=dt;if(c.w>25){c.rep=1;u.dead=true;}return;}c.w=0;
  if(Math.hypot(tp[0]-u.x,tp[1]-u.y)<(c.i===P.length-1?90:46)){c.i++;
    if(c.i>=P.length){const A=G.towns[c.a],B=G.towns[c.b],T=G.teams[u.team],pv=1+((A&&(A.inv&4))?.15:0)+((B&&(B.inv&4))?.15:0),pay=Math.round((16+c.len*.010)*pv*(G.bs||1));
      if(T&&!T.out){T.credits+=pay;T.ecC=(T.ecC||0)+pay;FXE('txt',[u.x|0,u.y|0,'+$'+pay,u.team,-2]);}
      c.leg++;c.pts=P.slice().reverse();c.i=1;}return;}
  navTo(u,tp[0],tp[1],dt);}
// ---- AI: invests in safe calm towns, sends a few units at mines ----
function ecAI(st){const E=G.ec;E.aiT+=st;if(E.aiT<12)return;E.aiT=0;
  for(const T of G.teams){if(!T.ai||T.out||T.reb)continue;
    let best=null,bk=-1,bc=1e9;for(const t of G.towns){if(t.ow!==T.id||t.reb>G.t||t.fr>0||t.un>=40)continue;for(let k=0;k<3;k++){if((t.inv|0)&(1<<k))continue;const c=ecInvCost(t,k);if(c<bc){bc=c;best=t;bk=k;}}}
    if(best&&T.credits>bc+900)ecCmd(T.id,{ti:best.i,k:bk});
    if(G.t<G.setupEnd+60||(E.aiN=(E.aiN|0)+1)%5)continue;   // every ~60 s: two idle soldiers walk to the nearest mine that is not ours
    const hq=G.ents.find(e=>e.isB&&e.team===T.id&&e.kind==='hq'&&!e.dead);if(!hq)continue;let tg=null,td=1e9;for(const p of E.pts){if(p.ow>=0&&ally(p.ow,T.id))continue;const d=Math.hypot(p.x-hq.x,p.y-hq.y);if(d<td&&d<2600){td=d;tg=p;}}
    if(!tg)continue;let n=0;for(const u of G.ents){if(n>=2)break;if(u.dead||u.isB||u.team!==T.id||u.inTun||u.kind==='harv'||u.kind==='dozer'||!u.s||u.s.dom!=='ground'||u.s.noAttack||u.order||u.target)continue;setMove(u,tg.x+n*30,tg.y,'amove');n++;}}}
// ---- one call per step from updTowns ----
function ecTick(st){const E=G.ec;if(!E)return;ecPoints(st);ecCaravans(st);ecAI(st);
  E.sm=(E.sm||0)+st;if(E.sm>=1){E.sm=0;for(const T of G.teams){const dc=(T.ecC||0)-(T.ecCs||0);T.ecCs=T.ecC||0;T.eco=(T.eco||0)*.875+((T.ecM||0)+(T.seaR||0)+dc)*.125;}}}   /* money per second from mines + ports + caravans, smoothed, for the HUD */
// ---- network: compact pack for clients (rides inside hmPack) ----
function ecPack(){const E=G.ec;if(!E)return 0;const th=[];for(const t of G.towns){let m=0;if(t.fb)for(let k=0;k<t.fb.length&&k<8;k++)if(t.fb[k]>G.t)m|=1<<k;
    th.push(Math.round(t.fd==null?70:t.fd),t.lv==null?1:t.lv,Math.round(t.gp||0),t.inv|0,Math.round((t.dm||0)*100),m,Math.round((t.em||1)*100));}
  const sub=pts=>{const o=[],n=pts.length,s=Math.max(1,Math.ceil(n/18));for(let i=0;i<n;i+=s)o.push(Math.round(pts[i][0]),Math.round(pts[i][1]));const l=pts[n-1];o.push(Math.round(l[0]),Math.round(l[1]));return o;};
  return{th,pt:E.pts.map(p=>[Math.round(p.x),Math.round(p.y),p.k,p.ow,Math.round(p.cp*100),p.ti]),cv:E.cav.filter(id=>{const u=G.byId.get(id);return u&&!u.dead;}),rt:E.rt.map(r=>[r.team,r.a,r.b,r.len,sub(r.pts)]),
    tm:G.teams.map(T=>[Math.round((T.eco||0)*10),Math.round((T.seaR||0)*10),Math.round((T.ecM||0)*10)]),v:E.v};}
function ecApply(d){if(!d||!G.towns)return;if(!G.ec)G.ec={pts:[],cav:[],rt:[],pi:1,v:0};const E=G.ec,v=d.th||[];
  for(let i=0;i<G.towns.length&&(i+1)*7<=v.length;i++){const t=G.towns[i],o=i*7;t.fd=v[o];t.lv=v[o+1];t.gp=v[o+2];t.inv=v[o+3];t.dm=v[o+4]/100;t.em=v[o+6]/100;const m=v[o+5];t.fb=[];for(let k=0;k<8;k++)t.fb[k]=(m>>k)&1?G.t+60:0;}
  E.pts=(d.pt||[]).map((q,i)=>({i,x:q[0],y:q[1],k:q[2],ow:q[3],cp:q[4]/100,ti:q[5]}));E.cav=d.cv||[];
  E.rt=(d.rt||[]).map(r=>{const p=[];for(let i=0;i+1<r[4].length;i+=2)p.push([r[4][i],r[4][i+1],-1]);return{team:r[0],a:r[1],b:r[2],len:r[3],pts:p};});
  (d.tm||[]).forEach((q,i)=>{const T=G.teams[i];if(T){T.eco=q[0]/10;T.seaR=q[1]/10;T.ecM=q[2]/10;}});E.v=d.v|0;G.ecCv=new Set(E.cav);}
