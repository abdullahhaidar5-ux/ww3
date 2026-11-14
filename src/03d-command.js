/* ---------- 03d-command: team play (Abdullah 2026-11-05 18:49 "command-teams") ----------
   Ceasefire offers (free-for-all only), map pings + drawings + quick lines for allies, allied aid (money fee/delay,
   gifting units). Everything arrives through act() (cases cf/cfa/cfd/cfb, mp, md, say, gift), so host, clients, replays
   and host migration all see the same thing. No RNG. State: G.truce {pairKey: expiry}, G.tOff [{f,t,d,e,ai}], G.aidQ,
   T.oath (oathbreaker until), T.cfCd, T.mpT, T.giftT, T.aidT (all in the checkpoint: CK_G + team keys).
   Battle plans and battle groups are client-side (08g-command.js): they only issue ordinary orders. */
const CF={DUR:[60,120,180],OFFER:25,OATH:240,COOL:180,UNREST:25,WARN:10,AID_FEE:.1,AID_DELAY:4,AID_CD:3,GIFT_CD:120,GIFT_MAX:5,
  PING_CD:.5,DRAW_CD:1.5,SAY_CD:1.5,DRAW_PTS:14,LINES:['Attack here!','Defend here!','Danger!','Need money','Need help','Thanks','Well done','Wait for me']};
function sameTm(a,b){if(a===b)return true;if(a==null||b==null||a<0||b<0||!G||!G.teams[a]||!G.teams[b])return false;return G.teams[a].tm===G.teams[b].tm;}
function truced(a,b){return !!(G&&G.truce)&&G.truce[a<b?a*32+b:b*32+a]>G.t;}
function ctMask(t){let m=0;if(!G)return 0;for(let j=0;j<G.teams.length;j++)if(sameTm(t,j))m|=1<<j;return m;}
/* free-for-all: three or more players, everybody on a team of their own; never in missions, the tutorial or the sandbox */
function ctFFA(){if(!G||G.camp||G.tut||G.sandbox||G.rp)return false;const L=G.teams.filter(T=>!T.reb);return L.length>=3&&new Set(L.map(T=>T.tm)).size===L.length;}
function ctPower(id){let p=0;for(const e of G.ents)if(e.team===id&&!e.dead&&!e.isB&&e.s&&e.kind!=='harv'&&e.kind!=='dozer')p+=e.s.cost||100;return p;}
function ctName(id){const T=G.teams[id];return T?((T.F&&T.F.name)||T.fac):'?';}
/* an AI answers sensibly: no deal with an oathbreaker, and it takes a truce when it is not the stronger side or when other enemies are on its back */
function ctAiAnswer(to,from){const T=G.teams[to],F=G.teams[from];if(!T||!F||(F.oath||0)>G.t)return false;
  const mine=ctPower(to),theirs=ctPower(from),others=G.teams.filter(O=>!O.reb&&!O.out&&O.id!==to&&O.id!==from&&!ally(O.id,to)).length;
  if(mine<=theirs*1.1)return true;return others>=1&&mine<=theirs*1.6;}
function cfOffer(from,to,di){if(!G.tOff)G.tOff=[];const A=G.teams[from],B=G.teams[to];di=di|0;if(!A||!B||from===to||A.out||B.out||A.reb||B.reb||di<0||di>2||!ctFFA())return false;
  if(truced(from,to)||G.tOff.some(o=>o.f===from&&o.t===to))return false;
  if((A.oath||0)>G.t){if(!A.ai)log(from,`Nobody trusts an oathbreaker for another ${Math.ceil(A.oath-G.t)} seconds.`,'w');return false;}
  if((A.cfCd||0)>G.t){if(!A.ai)log(from,'You broke a truce too recently to offer another.','w');return false;}
  if(G.tOff.filter(o=>o.f===from).length>=3)return false;
  const dur=CF.DUR[di];G.tOff.push({f:from,t:to,d:dur,e:G.t+CF.OFFER,ai:B.ai?G.t+2:0});
  if(!A.ai)log(from,`Truce offered to ${ctName(to)} for ${dur} seconds.`,'g');if(!B.ai)log(to,`${ctName(from)} offers a ${dur}-second truce. Accept or decline in the Allies box.`,'g');FXE('cfo',[from,to,dur]);return true;}
function cfStart(a,b,dur){G.truce=G.truce||{};G.truce[a<b?a*32+b:b*32+a]=G.t+dur;G.tOff=G.tOff.filter(o=>!((o.f===a&&o.t===b)||(o.f===b&&o.t===a)));
  for(const e of G.ents){if(e.dead||e.isB)continue;if(e.team!==a&&e.team!==b)continue;const t=e.target;if(t&&t.team!==e.team&&ally(e.team,t.team))e.target=null;
    const o=e.order;if(o&&o.type==='attack'&&o.target&&ally(e.team,o.target.team)){e.order=null;e.path=null;}}
  for(const x of [a,b]){const o=x===a?b:a;log(x,`Truce with ${ctName(o)}: ${dur} seconds without shooting each other. Breaking it early costs you dearly.`,'g');}
  for(const T of G.teams)if(T.id!==a&&T.id!==b&&!T.reb&&!T.out)log(T.id,`${ctName(a)} and ${ctName(b)} agreed a ${dur}-second truce.`,'w');FXE('cfs',[a,b,dur]);}
function cfAnswer(team,from,yes){const i=G.tOff.findIndex(o=>o.f===from&&o.t===team);if(i<0)return false;const o=G.tOff[i];G.tOff.splice(i,1);
  if(yes&&!G.teams[from].out&&!G.teams[team].out&&!truced(from,team)){cfStart(from,team,o.d);return true;}
  if(!G.teams[from].ai)log(from,`${ctName(team)} declined the truce.`,'w');return false;}
function cfBreak(team,other){const k=team<other?team*32+other:other*32+team;if(!G.truce||!(G.truce[k]>G.t))return false;delete G.truce[k];const T=G.teams[team];
  T.oath=G.t+CF.OATH;T.cfCd=G.t+CF.COOL;
  log(team,`You broke the truce with ${ctName(other)}. Nobody will trust you for ${CF.OATH/60} minutes.`,'bad');
  for(const O of G.teams)if(O.id!==team&&!O.reb&&!O.out)log(O.id,`${ctName(team)} BROKE its truce with ${ctName(other)} - oathbreaker!`,'w');FXE('cfb',[team,other]);return true;}
function ctTick(dt){if(!G.tOff)G.tOff=[];if(!G.aidQ)G.aidQ=[];
  for(let i=G.tOff.length-1;i>=0;i--){const o=G.tOff[i];if(G.t>=o.e){if(!G.teams[o.f].ai)log(o.f,`${ctName(o.t)} did not answer your truce offer.`,'w');G.tOff.splice(i,1);continue;}
    if(o.ai&&G.t>=o.ai){const yes=ctAiAnswer(o.t,o.f);o.ai=0;cfAnswer(o.t,o.f,yes);}}
  if(G.truce)for(const k in G.truce){const ex=G.truce[k],a=Math.floor(k/32),b=k%32;
    if(ex<=G.t){delete G.truce[k];log(a,`The truce with ${ctName(b)} is over.`,'w');log(b,`The truce with ${ctName(a)} is over.`,'w');continue;}
    if(ex-G.t<=CF.WARN&&!G.tWarn?.[k]){(G.tWarn=G.tWarn||{})[k]=1;log(a,`The truce with ${ctName(b)} ends in ${CF.WARN} seconds.`,'w');log(b,`The truce with ${ctName(a)} ends in ${CF.WARN} seconds.`,'w');}}
  for(let i=G.aidQ.length-1;i>=0;i--){const q=G.aidQ[i];if(G.t<q.at)continue;G.aidQ.splice(i,1);const B=G.teams[q.to],A=G.teams[q.f];if(!B||B.out){if(A)A.credits+=q.amt;continue;}
    B.credits+=q.amt;stOf(B).got+=q.amt;log(q.to,`${ctName(q.f)}'s aid arrived: $${q.amt}.`,'g');FXE('give',[q.f,q.to,q.amt]);}}
/* allied aid: money goes through a 10% fee and a 4 s delay (and a short cooldown), so it cannot be bounced around for tricks */
function ctGive(from,to,amt){const A=G.teams[from],B=G.teams[to];if(!A||!B||from===to||!sameTm(from,to)||B.out||A.out||(A.aidT||0)>G.t)return false;
  amt=Math.floor(Math.min(+amt||0,A.credits)/50)*50;if(amt<50)return false;const net=Math.floor(amt*(1-CF.AID_FEE));
  A.credits-=amt;A.gave=(A.gave||0)+amt;A.aidT=G.t+CF.AID_CD;(G.aidQ=G.aidQ||[]).push({f:from,to,amt:net,at:G.t+CF.AID_DELAY});
  log(from,`Sent $${amt} to ${ctName(to)} (fee $${amt-net}). It arrives in ${CF.AID_DELAY} seconds.`,'g');return true;}
/* give control of units to a teammate: up to 5 combat units, not while they are being shot at, one gift per 2 min */
function ctGift(team,ids,to){const A=G.teams[team],B=G.teams[to];if(!A||!B||team===to||!sameTm(team,to)||A.out||B.out||(A.giftT||0)>G.t||!Array.isArray(ids))return false;
  const us=ids.slice(0,40).map(i=>G.byId.get(i)).filter(u=>u&&!u.isB&&!u.dead&&u.team===team&&u.kind!=='harv'&&u.kind!=='dozer'&&!u.inTun&&!(u.cargo&&u.cargo.length)&&G.t-(u.hitT||-99)>5).slice(0,CF.GIFT_MAX);
  if(!us.length)return false;A.giftT=G.t+CF.GIFT_CD;
  for(const u of us){const fr=u.hp/u.max;u.team=to;u.order=null;u.target=null;u.path=null;u.wq=null;u.sq=0;u.aband=0;u.cp=0;try{const ns=stats(B.fac,u.kind);if(ns&&ns.hp){u.s=ns;u.max=ns.hp;u.hp=Math.max(1,ns.hp*fr);}}catch(e){}}
  log(team,`Gave ${us.length} unit${us.length>1?'s':''} to ${ctName(to)}.`,'g');log(to,`${ctName(team)} gave you control of ${us.length} unit${us.length>1?'s':''}.`,'g');return true;}
/* pings (0 attack here, 1 defend here, 2 danger), drawings (a short polyline or a circle) and quick lines: allies only */
function ctPing(team,k,x,y){const T=G.teams[team];k=k|0;x=+x;y=+y;if(!T||T.out||k<0||k>2||!isFinite(x)||!isFinite(y)||(T.mpT||0)>G.t)return false;
  T.mpT=G.t+CF.PING_CD;FXE('mping',[team,k,Math.max(0,Math.min(MAPW,x|0)),Math.max(0,Math.min(MAPH,y|0))],team);return true;}
function ctDraw(team,c,pts){const T=G.teams[team];if(!T||T.out||(T.mdT||0)>G.t||!Array.isArray(pts)||pts.length<4||pts.length>CF.DRAW_PTS*2)return false;
  const o=[];for(let i=0;i+1<pts.length;i+=2){const x=+pts[i],y=+pts[i+1];if(!isFinite(x)||!isFinite(y))return false;o.push(Math.max(0,Math.min(MAPW,x|0)),Math.max(0,Math.min(MAPH,y|0)));}
  T.mdT=G.t+CF.DRAW_CD;FXE('mdraw',[team,c|0?1:0,o],team);return true;}
function ctSay(team,i){const T=G.teams[team];i=i|0;if(!T||T.out||i<0||i>=CF.LINES.length||(T.sayT||0)>G.t)return false;T.sayT=G.t+CF.SAY_CD;FXE('say',[team,i],team);return true;}
/* snapshot: running truces (everyone sees them), the offers aimed at / made by this team, oathbreakers; the client rebuilds G.truce / G.tOff from it */
function ctPack(id){const tr=[],of=[],oa=[];if(G.truce)for(const k in G.truce){const r=G.truce[k]-G.t;if(r>0)tr.push([Math.floor(k/32),k%32,+r.toFixed(1)]);}
  for(const o of G.tOff||[])if(o.f===id||o.t===id)of.push([o.f,o.t,o.d,+(o.e-G.t).toFixed(1)]);
  for(const T of G.teams)if((T.oath||0)>G.t)oa.push([T.id,+(T.oath-G.t).toFixed(1)]);
  return tr.length||of.length||oa.length?{tr,of,oa}:0;}
function ctApply(d){if(!G)return;G.truce={};G.tOff=[];if(!d)return;for(const [a,b,r] of d.tr||[])G.truce[a<b?a*32+b:b*32+a]=G.t+r;
  for(const [f,t,dd,r] of d.of||[])G.tOff.push({f,t,d:dd,e:G.t+r});for(const T of G.teams)T.oath=0;for(const [i,r] of d.oa||[])if(G.teams[i])G.teams[i].oath=G.t+r;}
