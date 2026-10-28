/* ================= HOST NETCODE: snapshots, events, team panels (browser-free) =================
   Everything the authoritative side of a battle sends to its players: entity snapshots (encEnt, sendSnapP, …), the
   per-player event streams (visGrid, evWho, sendEvtP2P), team panels (teamMsg), order validation (cleanCmd),
   reconnects (hostRejoin, discTick), and the send loop (netTick). It uses only the battle (01-data, 02-map, 03-sim),
   the checkpoints in 07b-ckpt, and the room object NET.game ({emit(topic,data)->Promise, buffered?(to)}), so the
   same code can run in a host's browser today and in a server (Node or a Cloudflare Durable Object) for Stage 2.
   No DOM, no window, no Three.js here: orch/headless.mjs --hostsnap loads 01+02+03+07a+07b in plain Node.
   NET.p2p (true/false) overrides the transport style; unset = the page's own (window.WW3_P2P, the online edition). */
const NET={room:null,user:null,game:null,code:null,opp:null,hostPeer:null,myPeer:null,snapT:0,bT:0,evT:0,teamT:0,helloI:null,names:{}};
const FLG={built:1,cargo:2,dis:4,chg:8,hack:16,plant:32,land:64,hid:128,mem:256,mov:2048,busy:4096,nd:8192,stall:16384,supp:32768,mark:65536,rout:131072,shak:262144,last:524288,aband:1048576};
// per-player streams and bundles (online edition / servers) vs one broadcast per topic (claude.ai artifact room)
function hostP2P(){return NET.p2p!=null?!!NET.p2p:typeof window!=='undefined'&&!!window.WW3_P2P;}
const CMD_T=['go','atk','atkOil','fld','q','dq','bld','bldGo','tun','unl','board','up','sup','buy','pow','rally','stop','gar','atkCiv','ungar','give','def','line','ret'];
function cleanCmd(a){if(!a||typeof a!=='object'||!CMD_T.includes(a.t))return null;const o={t:a.t};const num=v=>typeof v==='number'&&isFinite(v)?v:0;
  if(Array.isArray(a.ids))o.ids=a.ids.slice(0,300).map(v=>num(v)|0);o.x=Math.max(0,Math.min(MAPW,num(a.x)));o.y=Math.max(0,Math.min(MAPH,num(a.y)));o.tid=num(a.tid)|0;o.fi=num(a.fi)|0;o.dz=num(a.dz)|0;o.ci=Math.max(0,num(a.ci)|0);o.to=Math.max(0,num(a.to)|0);o.amt=Math.max(0,Math.min(1e6,num(a.amt)));
  if(typeof a.k==='string'&&a.k.length<20)o.k=a.k;o.mode=a.mode==='amove'?'amove':'move';o.fm=a.fm?1:0;o.q=a.q?1:0;o.x2=Math.max(0,Math.min(MAPW,num(a.x2)));o.y2=Math.max(0,Math.min(MAPH,num(a.y2)));return o;}
const NET_PV=6;
// A dropped player gets 30 s to reconnect (same team, same units) before the AI takes over their side. A player counts as
// dropped after 8 s without a word, or 90 s while their keep-alive says they are still on the loading screen (NET.ldOf).
function hostRejoin(peer,tok){if(!tok||!NET.toks||!G)return;const ix=NET.toks.indexOf(tok);if(ix<0||ix===ME)return;const old=NET.peers[ix];if(old===peer)return;NET.peers[ix]=peer;NET.cseq[peer]=Math.max(NET.cseq[peer]||0,NET.cseq[old]||0,((NET.cseqSlot||[])[ix]||0));
  const T=G.teams[ix];T.discT=0;if(NET.tgS)delete NET.tgS[ix];if(T.aiTook){T.ai=null;T.aiTook=0;}if(NET.kf)NET.kf[ix]=0;if(NET.kf)NET.kf.all=0;const S=NET.startInfo;if(S)NET.game.emit('start',Object.assign({pv:NET_PV,seed:S.seed,facs:S.facs,slot:ix,to:peer,map:S.map,tm:S.tm,w:S.w|0},S.sv?{sv:1}:{})).catch(()=>{});
  for(const O of G.teams)log(O.id,`${T.F.name}'s commander reconnected.`,'g');
  // P2P: the rejoined player starts from a fresh map, so collapsed city blocks are re-sent as they come into view
  if(hostP2P()){(NET.gq=NET.gq||[])[ix]=[];(NET.civQ=NET.civQ||[])[ix]=(G.civ||[]).map((c,i)=>c.dead?i:-1).filter(i=>i>=0);}}
function discTick(){if(!NET.peers||!G)return;const now=performance.now();
  // the host's own page froze (loading, a slow PC): what queued up meanwhile is not the players' silence, so that gap is not counted
  if(NET.dtW&&now-NET.dtW>2500&&NET.seen){const gap=now-NET.dtW;for(const p in NET.seen)NET.seen[p]+=gap;}NET.dtW=now;for(let k=0;k<NET.peers.length;k++){const p=NET.peers[k];if(k===ME||!p)continue;const ls=(NET.seen||{})[p];if(ls&&now-ls>((NET.ldOf||{})[p]?90000:8000)&&!G.teams[k].discT&&!G.teams[k].ai){NET.peers[k]=null;playerLeft(k);}}for(let k=0;k<NET.peers.length;k++){const T=G.teams[k];if(k!==ME&&T&&T.discT&&G.t-T.discT>30&&!T.out){T.discT=0;T.ai=mkAI(1);T.aiTook=1;for(const O of G.teams)log(O.id,`${T.F.name}'s commander did not come back. The AI has taken over (they can still rejoin).`,'w');}}}
function playerLeft(ix){if(!G||G.over)return;const T=G.teams[ix];if(!T||T.out||T.ai)return;T.discT=G.t;for(const O of G.teams)log(O.id,`${T.F.name}'s commander lost connection. Waiting up to 30 s for them to reconnect…`,'w');}
/* ---------- host: what players send (shared by the browser host's wireHost and the server host) ----------
   A server-hosted battle has no side of its own (ME=-1), so every slot is a player; a browser host is slot ME=0. */
// a player's order (their presence order queue, or a 'cmd' message): only for their own side, while it is in the battle
function hostCmd(peer,data){if(MODE!=='host')return;const ix=NET.peers?NET.peers.indexOf(peer):-1;if(ix<0||ix===ME)return;if(G&&G.teams[ix]&&G.teams[ix].out)return;const a=cleanCmd(data);if(a)act(ix,a);}
// one player's presence (q: {peer,by,presence}): heard-from time, may-host flag, reconnects, the hello (hello(peer,by,
// nation,token): the lobby greeting, or a reconnect once the battle runs), ping answers, the numbered order queue
// (de-duplicated), and requests for a full snapshot
// (order numbers start at Date.now()/10, past 32 bits: never "|0" them, or acknowledgements and checkpoints garble them)
function hostPres(q,hello){const pr=q.presence;(NET.seen=NET.seen||{})[q.peer]=performance.now();
  if(pr.hi&&pr.hi.ed!=null)(NET.edOf=NET.edOf||{})[q.peer]=pr.hi.ed?1:0;
  if(pr.ld!=null)(NET.ldOf=NET.ldOf||{})[q.peer]=pr.ld?1:0;
  // a player the heartbeat marked as gone (e.g. their PC stalled while loading) is linked back as soon as they are heard from again
  if(MODE==='host'&&NET.peers&&pr.hi&&typeof pr.hi.tok==='string'&&NET.peers.indexOf(q.peer)<0)hostRejoin(q.peer,pr.hi.tok.slice(0,16));
  if(pr.hi&&(MODE==='single'||MODE==='host')&&(NET.lastHi||{})[q.peer]!==pr.hi.n){(NET.lastHi=NET.lastHi||{})[q.peer]=pr.hi.n;hello(q.peer,q.by,pr.hi.f,typeof pr.hi.tok==='string'?pr.hi.tok.slice(0,16):null);}
  if(typeof pr.pg==='number'&&(NET.lastPg||{})[q.peer]!==pr.pg){(NET.lastPg=NET.lastPg||{})[q.peer]=pr.pg;NET.game.emit('pong',{to:q.peer,t:pr.pg}).catch(()=>{});if(typeof pr.pi==='number')(NET.pings=NET.pings||{})[q.peer]=pr.pi;}
  if(Array.isArray(pr.cq)&&MODE==='host'){let last=NET.cseq[q.peer]||0;for(const c of pr.cq){if(!c||typeof c.s!=='number'||c.s<=last)continue;last=c.s;hostCmd(q.peer,c.a);}NET.cseq[q.peer]=last;const ix=NET.peers?NET.peers.indexOf(q.peer):-1;if(ix>=0&&ix!==ME)(NET.cseqSlot=NET.cseqSlot||[])[ix]=Math.max(((NET.cseqSlot||[])[ix]||0),last);}
  if(typeof pr.kr==='number'&&MODE==='host'&&NET.peers&&(NET.lastKr||{})[q.peer]!==pr.kr){(NET.lastKr=NET.lastKr||{})[q.peer]=pr.kr;const ix=NET.peers.indexOf(q.peer);if(ix>=0&&ix!==ME&&NET.kf)NET.kf[ix]=0;}}
// a player's connection closed during the battle: 30 s to come back before the AI takes their side (playerLeft)
function hostGone(peer){if(MODE!=='host'||!NET.peers)return;const ix=NET.peers.indexOf(peer);if(ix>=0&&ix!==ME){NET.peers[ix]=null;playerLeft(ix);}}
/* ---------- host: send ---------- */
function encEnt(e,mem){let f=0,x=0;if(e.isB){if(e.built<1){f|=FLG.built;x=Math.round(e.built*100);}if(e.dis>G.t)f|=FLG.dis;if(e.charge)f|=FLG.chg;if(e.kind==='uplink'){x=Math.round(G.teams[e.team].charge/G.teams[e.team].sup.charge*100);}if(e.kind==='garrison'&&e.civ){x=e.civ.occ.length*16+e.civ.cap;}if(e.kind==='factory'&&G.teams[e.team].q.factory.length)f|=FLG.busy;if(mem)f|=FLG.mem;if(e.nd&&e.built<1)f|=FLG.nd;if(e.stall&&e.built<1)f|=FLG.stall;}
  else{if(e.cargo)f|=FLG.cargo;if(e.hacking)f|=FLG.hack;if(e.planting)f|=FLG.plant;if(e.landed)f|=FLG.land;if(e.hid)f|=FLG.hid;if(G.t-(e.mv||-9)<.25)f|=FLG.mov;if(e.building)f|=FLG.busy;if((e.supp||0)>.5)f|=FLG.supp;if(e.rout>G.t)f|=FLG.rout;else if(e.s&&canRout(e)&&(e.fear||0)>courageOf(e)*.65)f|=FLG.shak;if(e.mark>G.t)f|=FLG.mark;if(e.last>G.t)f|=FLG.last;if(e.aband)f|=FLG.aband;f|=(e.rank||0)<<9;{const m=moraleOf(e);x=m?(m.st==='fearless'?101:Math.round(m.v*20)*5):-1;}}
  return[e.id,KINDS.indexOf(e.kind),e.team,Math.round(e.x),Math.round(e.y),Math.round((e.va||0)*100),Math.round((e.tang||0)*100),Math.round(e.hp),Math.round(e.max),f,x];}
function sendSnap(key,to,items,bit){NET.sc=NET.sc||{};NET.kf=NET.kf||{};NET.kt=NET.kt||{};const full=!(NET.kf[key]>G.t);if(full)NET.kf[key]=G.t+(bit?4+((key|0)%8)*.25:2);const old=NET.sc[key];let c=old;if(!c||full)c=NET.sc[key]=new Map();
  // the keep-alive list (ids of unchanged entities) only needs to beat the client's expiry, so it goes out every 0.5 s, not every tick
  const sendKeep=full||!(NET.kt[key]>G.t);if(sendKeep)NET.kt[key]=G.t+(bit?.4:0);
  const ch=[],keep=[],seen=new Set();for(const a of items){seen.add(a[0]);const s=a.join(',');if(c.get(a[0])===s){if(sendKeep){if(bit)keep.push(a[0]);else keep.push(a[0],a[11]|a[12]);}}else{c.set(a[0],s);ch.push(a);}}
  const dr=[];if(old)for(const id of old.keys())if(!seen.has(id)){if(old===c)c.delete(id);dr.push(id);}
  const base={t:+G.t.toFixed(2),iv:+NET.snapT.toFixed(2)};if(to)base.to=to;if(full)base.f=1;
  if(ch.length||!keep.length&&sendKeep||dr.length)snapOut(base,ch,snapDrops(dr));const per=bit?1400:700;for(let i=0;i<keep.length;i+=per)NET.game.emit('snap',Object.assign({},base,{e:[],k:keep.slice(i,i+per)},bit?{kb:1}:{})).catch(()=>{});}
// P2P: each entity's state is encoded and compared ONCE per tick (a version number per entity), then each player's
// cache only stores version*2+remembered-bit - no per-player strings, so the host's cost barely grows with player count.
function verItems(items){const V=NET.ver||(NET.ver=new Map());const st=NET.verSt=(NET.verSt|0)+1;
  for(const a of items){const s=a.slice(0,11).join(',');let r=V.get(a[0]);if(!r){r=[s,1,st];V.set(a[0],r);}else{if(r[0]!==s){r[0]=s;r[1]++;}r[2]=st;}a._v=r[1];}
  if(V.size>items.length*1.5+64)for(const [id,r] of V)if(r[2]!==st)V.delete(id);}
function sendSnapP(k,to,items){const b=1<<k,key=k;NET.sc=NET.sc||{};NET.kf=NET.kf||{};NET.kt=NET.kt||{};const full=!(NET.kf[key]>G.t);if(full)NET.kf[key]=G.t+4+(k%8)*.25;const old=NET.sc[key];let c=old;if(!c||full)c=NET.sc[key]=new Map();
  const sendKeep=full||!(NET.kt[key]>G.t);if(sendKeep)NET.kt[key]=G.t+.4;const ch=[],keep=[];let n=0,dv=null;
  for(const a of items){if(!((a[11]|a[12])&b))continue;n++;const mem=!(a[11]&b),code=a._v*2+(mem?1:0);if(c.get(a[0])===code){if(sendKeep)keep.push(a[0]);continue;}
    c.set(a[0],code);const r=a.slice(0,11);r[9]=mem?(r[9]|FLG.mem):(r[9]&~FLG.mem);ch.push(r);}
  const dr=[];if(old&&(old!==c||c.size>n)){const seen=new Set();for(const a of items)if((a[11]|a[12])&b)seen.add(a[0]);for(const [id,ov] of old)if(!seen.has(id)){if(old===c)c.delete(id);dr.push(id);if(ov%2===0)(dv||(dv=new Set())).add(id);}}
  const base={t:+G.t.toFixed(2),iv:+NET.snapT.toFixed(2)};if(to)base.to=to;if(full)base.f=1;
  // a remembered building that died out of this player's sight stays on their map until they see the spot ('gone' queue)
  if(dr.length&&NET.gq&&NET.gq[k]&&NET.gq[k].length){const q=new Set(NET.gq[k].map(g=>g[0]));for(let i=dr.length-1;i>=0;i--)if(q.has(dr[i]))dr.splice(i,1);}
  if(ch.length||!keep.length&&sendKeep||dr.length)snapOut(base,ch,snapDrops(dr));for(let i=0;i<keep.length;i+=1400)NET.game.emit('snap',Object.assign({},base,{e:[],k:keep.slice(i,i+1400),kb:1})).catch(()=>{});
  // just-died units left out of the drop list are still on this player's screen until their 'die' arrives (dieWho)
  if(dr.length&&NET.dyC){const dy=NET.dyC.s;for(const id of dr)if(dy.has(id)&&dv&&dv.has(id))dhSet(k).add(id);}}
function dhSet(k){if(NET.dhG!==G){NET.dhG=G;NET.dh=[];}const D=NET.dh;return D[k]||(D[k]=new Set());}
// P2P: one copy per player, so the two visibility masks are folded into that player's 'remembered' flag and dropped
function forPlayer(items,k){const b=1<<k,out=[];for(const a of items){if(!((a[11]|a[12])&b))continue;const c=a.slice(0,11);c[9]=(a[11]&b)?(c[9]&~FLG.mem):(c[9]|FLG.mem);out.push(c);}return out;}
// a player who sees nothing at all (their side was wiped out) still gets an empty snapshot every 0.4 s: it moves their
// clock on, so enemies that were in sight fade out instead of lingering as stale ghosts (it was sent as nothing)
function snapOut(base,ch,first){if(ch.length||first)sendChunks('snap',base,ch,first);else NET.game.emit('snap',{...base,e:[]}).catch(()=>{});}
// first (optional): extra fields carried by the first message only (a snapshot's drop list); sent even with no items
function sendChunks(topic,base,items,first){let cur=[],len=first?JSON.stringify(first).length:0;const flush=()=>{if(cur.length||first){NET.game.emit(topic,first?{...base,...first,e:cur}:{...base,e:cur}).catch(()=>{});first=null;cur=[];len=0;}};
  for(const it of items){const s=JSON.stringify(it).length+1;if(len+s>3500&&cur.length)flush();cur.push(it);len+=s;}flush();}
// Units that leave a player's view are named in that player's next snapshot ('dr': ids only, no position) so their
// screen drops them at once - before, they lingered up to ~1 s until the client's own expiry noticed the silence.
// Anything that just died is left out: its 'die' event (explosion, wreck) is still on its way and removes it.
function snapDrops(dr){if(!dr.length)return null;let c=NET.dyC;if(!c||c.t!==G.t||c.n!==G.out.length){const s=new Set();for(const v of G.out)if(Array.isArray(v)&&v[0]==='die')s.add(v[1]);c=NET.dyC={t:G.t,n:G.out.length,s};}const dy=c.s;
  const o=dr.filter(id=>!dy.has(id));return o.length?{dr:o.slice(0,400)}:null;}
// map-wide state (resource fields, oil derricks, who is out) is built once per flush and sent to a player only when it
// changed since what they last got, or once a second as a refresh - it was resent to everyone 4x a second
function teamGlobals(k){const g=NET.tgC;if(!g||g.t!==G.t){const fa=G.fields.map(f=>f.amt|0),oil=G.oil.map(o=>[o.owner,o.cp.map(v=>+v.toFixed(1)),o.dead?1:0,Math.round(o.hp)]),out=G.teams.map(O=>O.out?1:0);NET.tgC={t:G.t,v:{fa,oil,out},js:JSON.stringify([fa,oil,out])};}
  const C=NET.tgC,S=NET.tgS||(NET.tgS={}),last=S[k];if(last&&last.js===C.js&&G.t-last.t<1)return {};S[k]={js:C.js,t:G.t};return C.v;}
function teamMsg(T){const q={};for(const c of CATS)q[c]=T.q[c].map(i=>[i.kind,+(i.t/prodTime(T,stats(T.fac,i.kind))).toFixed(2)]);const rq={};for(const c in T.rq)if(T.rq[c])rq[c]=[T.rq[c].key,+(T.rq[c].t/UPG[T.rq[c].key].time).toFixed(2)];
  const pw={};for(const k in T.pw)pw[k]=[Math.ceil(T.pw[k].cd),T.pw[k].lv||1];
  return{c:Math.floor(T.credits),q,rq,u:Object.keys(T.upg),ch:+T.charge.toFixed(1),gx:T.gxp,rk:T.rank,sp:T.spent,pw,rv:T.reveals.map(r=>[r.x|0,r.y|0,r.r,+r.t.toFixed(1)]),rl:T.rally?[T.rally.x|0,T.rally.y|0]:null,...teamGlobals(T.id),tn:T.tun.length,tk:tunKinds(T),ac:G.teams.filter(O=>O.id!==T.id&&ally(O.id,T.id)).map(O=>[O.id,Math.floor(O.credits)]),wx:G.wx?G.wx.k:'clear',mg:NET.gen||0,sb:NET.sbSlot===T.id?1:0,mn:(G.mines||[]).filter(m=>m.team===T.id).map(m=>[m.x,m.y]),gt:+G.t.toFixed(2),ak:NET.cseq&&NET.peers[T.id]?Math.min((NET.cseq[NET.peers[T.id]]||0),NET.ckAk?(NET.ckAk[T.id]||0):0):0,to:NET.peers[T.id]};}
// P2P: everything a player gets in one tick (snapshot chunks, effects, panel) travels as ONE bundle ('b') - about 10
// messages a second per connection instead of ~17-24, less per-message overhead, and effects arrive with their snapshot.
function netTick(dt){if(!hostP2P()||MODE!=='host'||!NET.game||!NET.peers)return netTick0(dt);const g=NET.game,real=g.emit,B=new Map();
  g.emit=(t,d)=>{const to=d&&typeof d==='object'&&d.to;if(!to||t==='ck')return real.call(g,t,d);let L=B.get(to);if(!L){L=[];B.set(to,L);}const dd=Object.assign({},d);delete dd.to;L.push([t,dd]);if(L.length>=4)real.call(g,'b',{to,m:L.splice(0)}).catch(()=>{});return Promise.resolve();};
  try{netTick0(dt);}finally{g.emit=real;for(const [to,L] of B)if(L.length)real.call(g,'b',{to,m:L}).catch(()=>{});}}
function netTick0(dt){if(MODE!=='host'||!NET.game||!G||!NET.peers)return;discTick();if(NET.ckOut)ckFlush();NET.snapT-=dt;NET.evT-=dt;NET.teamT-=dt;NET.bT-=dt;const live=[];for(let k=0;k<NET.peers.length;k++)if(k!==ME&&NET.peers[k]&&!G.teams[k].ai)live.push(k);if(!live.length){if(G.out.length>400)G.out.length=0;return;}try{ckTick(dt,live);}catch(e){}
  // The room allows each sender about 40 messages a second, so with many players the host BROADCASTS one snapshot and
  // one event stream to everyone (each entity tagged with which players can see it, each client keeps only its own)
  // instead of one copy per player; team panels go out round-robin.
  // Delta snapshots: an entity whose state has not changed since the last copy that player got is listed only by id
  // (keeps it alive on their screen); full copies go out only for what changed, plus a full keyframe every 2 s that
  // also repairs anything a dropped message missed. Typical armies are mostly idle, so this cuts traffic several-fold.
  if(NET.snapT<=0){const items=[],SK=hostP2P()?(NET.sk=NET.sk||new Map()):null;
    for(const e of G.ents){if(e.dead)continue;let vm=0,mm=0;for(const k of live){const v=e.team===k||(e.vs&&e.vs[k]);if(e.isB){if(v)vm|=1<<k;else if((e.sn|0)&(1<<k))mm|=1<<k;}else if(v)vm|=1<<k;}
      if(!vm&&!mm)continue;if(SK)skNote(SK,e,vm,mm,live);const a=encEnt(e,false);a.push(vm,mm);items.push(a);}
    NET.snapT=hostP2P()?.1:Math.max(.2,Math.min(.6,Math.ceil(items.length/150)*.1));
    if(hostP2P()){verItems(items);for(const k of live){const to=NET.peers[k];if(NET.game.buffered&&NET.game.buffered(to)>12000)continue;sendSnapP(k,to,items);(NET.snapTo=NET.snapTo||[])[k]=G.t;}}else sendSnap('all',null,items);}
  if(NET.evT<=0){NET.evT=hostP2P()?.1:.15;let evs=G.out;G.out=[];
    // P2P: one filtered stream per player (sendEvtP2P); room mode: one broadcast stream as before
    if(hostP2P())sendEvtP2P(evs,live);else if(evs.length){let len=JSON.stringify(evs).length;if(len>3400){const imp=evs.filter(v=>v[0]!=='muz'&&v[0]!=='tr');const lo=evs.filter(v=>v[0]==='muz'||v[0]==='tr');evs=imp;len=JSON.stringify(evs).length;for(const v of lo){const s=JSON.stringify(v).length+1;if(len+s>3400)break;evs.push(v);len+=s;}}
    if(JSON.stringify(evs).length>3400)sendChunks('evt',{},evs);else if(evs.length)NET.game.emit('evt',{e:evs}).catch(()=>{});}}
  if(NET.teamT<=0){NET.teamT=.25;const per=hostP2P()?live.length:Math.min(live.length,3);NET.trr=NET.trr||0;for(let n=0;n<per;n++){const k=live[(NET.trr++)%live.length];NET.game.emit('team',teamMsg(G.teams[k])).catch(()=>{});}}}

/* ---------- host: per-player event streams (P2P only) ----------
   In P2P every player is sent their own copy of the event stream anyway, so each copy carries only what that player
   could perceive: effects inside their own or an ally's vision, messages addressed to them, their side's general's
   powers, and the few global announcements. Fights in the fog no longer reach (or give away) anyone who cannot see
   them. Vision is a coarse grid of team bitmasks rebuilt at each 0.15 s flush from the same sources as updateVis:
   every unit's and building's sight radius (shared with allies), each team's own reveals, plus the cell of anything a
   team currently sees (counter-battery reveals and the like). One lookup answers for all players at once. */
const VG={c:64,w:0,h:0,a:null,t:-1,AM:[]};
function visGrid(){if(VG.t===G.t&&VG.a)return;const c=VG.c,w=Math.ceil(MAPW/c)+1,h=Math.ceil(MAPH/c)+1,N=G.teams.length;
  if(!VG.a||VG.w!==w||VG.h!==h){VG.a=new Uint8Array(w*h);VG.w=w;VG.h=h;}else VG.a.fill(0);const a=VG.a,AM=VG.AM;AM.length=N;
  for(let i=0;i<N;i++){let m=0;for(let j=0;j<N;j++)if(ally(i,j))m|=1<<j;AM[i]=m;}
  // a cell counts as seen when its centre is within sight radius + half a cell (the client's own fog hole is drawn 8%
  // wider than the sight radius with a soft edge, so this matches what the player actually sees within a few metres)
  const disc=(x,y,R,m)=>{if(!m||!(R>0))return;const R2=(R+c*.5)**2,x0=Math.max(0,Math.floor((x-R)/c)),x1=Math.min(w-1,Math.floor((x+R)/c)),y0=Math.max(0,Math.floor((y-R)/c)),y1=Math.min(h-1,Math.floor((y+R)/c));
    for(let cy=y0;cy<=y1;cy++){const dy=(cy+.5)*c-y,dy2=dy*dy;if(dy2>R2)continue;const row=cy*w;for(let cx=x0;cx<=x1;cx++){const dx=(cx+.5)*c-x;if(dx*dx+dy2<=R2)a[row+cx]|=m;}}};
  for(const e of G.ents){if(e.dead||!(e.team>=0&&e.team<N))continue;disc(e.x,e.y,e._vr||visR(e),AM[e.team]);
    if(e.vs){let m=0;for(let k=0;k<N;k++)if(e.vs[k])m|=1<<k;const cx=Math.floor(e.x/c),cy=Math.floor(e.y/c);if(m&&cx>=0&&cy>=0&&cx<w&&cy<h)a[cy*w+cx]|=m;}}
  for(const T of G.teams)for(const r of T.reveals||[])disc(r.x,r.y,r.r,1<<T.id);VG.t=G.t;}
// bitmask of the teams that see any part of the circle (x,y,m)
function visAt(x,y,m){const c=VG.c,w=VG.w,h=VG.h,a=VG.a,cx=Math.floor(x/c),cy=Math.floor(y/c);
  if(!(m>c*.5))return cx>=0&&cy>=0&&cx<w&&cy<h?a[cy*w+cx]:0;
  const r=Math.ceil(m/c),M2=(m+c*.5)**2;let o=0;
  for(let j=Math.max(0,cy-r),j1=Math.min(h-1,cy+r);j<=j1;j++)for(let i=Math.max(0,cx-r),i1=Math.min(w-1,cx+r);i<=i1;i++){const dx=(i+.5)*c-x,dy=(j+.5)*c-y;if(dx*dx+dy*dy<=M2)o|=a[j*w+i];}return o;}
// who gets each kind of event (v = [type,...FXH args]); anything not listed (end, elim, oilDry, new types) goes to all
function evWho(v){const AM=VG.AM,own=v.own!=null?AM[v.own]|0:0;
  switch(v[0]){
    case 'muz':return visAt(v[1],v[2],v[5]>=13?60:20);                     // gun position; big guns throw smoke and dust
    case 'tr':case 'pj':return visAt(v[1],v[2],16)|visAt(v[4],v[5],16);     // either end in sight: you see it fly in/out
    case 'salvo':return visAt(v[1],v[2],30)|visAt(v[4],v[5],60);
    case 'boom':return own|visAt(v[1],v[2],Math.min(400,20+(+v[3]||0)*(v[4]?2.5:1.5)));  // fireball, smoke column and flash reach past the fog edge
    case 'hack':return visAt(v[1],v[2],40);
    case 'ping':case 'heal':case 'smoke':return own|visAt(v[1],v[2],+v[3]||0);
    case 'strike':return v[5]?255:own|visAt(v[1],v[2],(+v[4]||0)+40);      // superweapon-class warnings are global (alarm + "inbound" log)
    case 'bmis':return visAt(v[1],v[2],120);                                 // only where the launch is seen: never hands out the silo's position
    case 'plane':{const sx=v[1],sy=v[2],tx=v[3],ty=v[4],L=Math.hypot(tx-sx,ty-sy)||1,E=L*6/2.6,n=Math.min(24,Math.ceil(E/200));let m=AM[v[5]]|0;
      for(let i=0;i<=n;i++){const u=i/n*E/L;m|=visAt(sx+(tx-sx)*u,sy+(ty-sy)*u,150);}return m;}   // its whole flight path
    case 'toss':{const e=G.byId.get(v[1]);if(!e||e.dead||!e.vs)return 0;let m=AM[e.team]|0;for(let k=0;k<e.vs.length;k++)if(e.vs[k])m|=1<<k;return m;}
    case 'txt':{const t=v[4],w=v[5];let m=(t>=0?1<<t:0)|(w>=0?1<<w:0);if(w===-2)m|=(AM[t]|0)|visAt(v[1],v[2],0);return m;}
    case 'log':return v[1]>=0?1<<v[1]:0;
    case 'give':return (1<<v[1])|(1<<v[2]);
    default:return 255;}}
// what each player was last sent of an entity: r.t[k] = when it was last in k's snapshot as visible, r.m = players
// that hold it as a remembered (fogged) building
function skNote(SK,e,vm,mm,live){let r=SK.get(e.id);if(!r)SK.set(e.id,r={t:[],m:0,s:0});for(const k of live)if(vm&(1<<k))r.t[k]=G.t;r.m|=mm;r.s=G.t;}
// 'die' goes to everyone who sees the spot, and to anyone who still has that entity on screen: it is in the last
// snapshot cache for that player (NET.sc[k]; a snapshot skipped for a congested link leaves it there), or it was
// dropped from that cache only because it had just died (dhSet). A unit that walked out of sight was already named in
// that player's drop list, so it dying later in the fog shows them nothing (8.5 s covers the client's absolute expiry).
// A remembered building never expires on the client, so if it dies out of sight it is queued as a silent 'gone'.
function dieWho(v,live){const id=v[1],x=v[2],y=v[3],ki=v[4],isB=v[5];let m=visAt(x,y,isB?120:30);const r=NET.sk&&NET.sk.get(id);
  const dh=NET.dhG===G?NET.dh:null;let held=0;if(dh)for(const k of live)if(dh[k]&&dh[k].delete(id))held|=1<<k;
  if(r){NET.sk.delete(id);const sc=NET.sc||{};for(const k of live){const b=1<<k;if(m&b)continue;const t=r.t[k];
    if(t!=null&&((held&b)||sc[k]&&sc[k].get(id)%2===0)&&G.t-t<=8.5)m|=b;
    else if(isB&&(r.m&b)){const q=NET.gq[k]=NET.gq[k]||[];q.push([id,x,y,ki]);if(q.length>300)q.shift();}}}
  return m;}
// a city block collapsing changes the map (passability, cover), so every player must get it eventually: now if they see
// it, otherwise quietly (no explosion) once they do
function civWho(v,live){const c=G.civ&&G.civ[v[1]];if(!c)return 255;const m=visAt(c.x,c.y,60);for(const k of live)if(!(m&(1<<k)))(NET.civQ[k]=NET.civQ[k]||[]).push(v[1]);return m;}
function sendEvtP2P(evs,live){const gq=NET.gq=NET.gq||[],vq=NET.civQ=NET.civQ||[];let lm=0,pend=evs.length;
  for(const k of live){lm|=1<<k;pend+=(gq[k]||[]).length+(vq[k]||[]).length;}if(!pend)return;
  visGrid();const per=[];for(const k of live)per[k]=[];
  for(const v of evs){if(!Array.isArray(v))continue;const m=(v[0]==='die'||v[0]==='gone'?dieWho(v,live):v[0]==='civd'?civWho(v,live):evWho(v))&lm;if(!m)continue;
    const s=JSON.stringify(v);for(const k of live)if(m&(1<<k))per[k].push([v,s]);}
  for(const k of live){const b=1<<k,L=per[k],add=v=>L.push([v,JSON.stringify(v)]);
    if(gq[k]&&gq[k].length)gq[k]=gq[k].filter(g=>{if(!(visAt(g[1],g[2],40)&b))return true;add(['gone',...g]);return false;});
    if(vq[k]&&vq[k].length)vq[k]=vq[k].filter(i=>{const c=G.civ&&G.civ[i];if(!c)return false;if(!(visAt(c.x,c.y,60)&b))return true;add(['civd',i,1]);return false;});
    if(!L.length)continue;const to=NET.peers[k];
    // same budget per player as the broadcast had: ~3.4 KB per 0.15 s, muzzle flashes and tracers dropped first
    let len=1;for(const x of L)len+=x[1].length+1;let out=L;
    if(len>3400){out=[];len=1;const lo=[];for(const x of L){if(x[0][0]==='muz'||x[0][0]==='tr')lo.push(x);else{out.push(x);len+=x[1].length+1;}}
      for(const x of lo){if(len+x[1].length+1>3400)break;out.push(x);len+=x[1].length+1;}}
    const e=out.map(x=>x[0]);if(len>3400)sendChunks('evt',{to},e);else NET.game.emit('evt',{e,to}).catch(()=>{});}
  if(NET.sk&&!(NET.skP>G.t)){NET.skP=G.t+5;for(const [id,r] of NET.sk)if(G.t-r.s>15&&!G.byId.has(id))NET.sk.delete(id);}}
