/* ---------- Battle checkpoints (for host migration) ----------
   The host periodically packs the whole battle into a compact checkpoint and sends it to a standby player. If the host
   drops out, the standby restores the latest checkpoint and carries on as the new host; everyone else reconnects to it.
   Entities, resource fields, oil derricks and civilian buildings referenced inside other objects are stored by id or
   index, unit stat blocks are shared through a table, and anything visual or derived is rebuilt after loading. */
const CK_G=['truce','tOff','aidQ','t','nid','aiT','visT','endT','over','bs','real','cbrTeams','mT','ecT','wx','wxN','fixWx','wxB','ssn','mines','smokes','shields','smugs','craters','ruins','aiTT','upN','sqOf',
  'refs','leaf','refId','polA','spoofs','mban','mbanN','dug','dugN','dugV','dugId','lgd','ec','wnd','wndN','wndV','wndId','dams','damV','fln',
  'todM','live','todH0','humA','rebT','radT','stT','gprT','supT','prT','tbT','pwT','dgT','n2T','wndS','bfWd','strikes','sq','pfTok','bfFire','bfScorch','bfHulk','bfSmS','bfT','auT','bfFxT','bfSent','bfNewSc','battle','reb','N','seed','mapKey','roadV','_fmQ','boccS'];  // EW radar-spoof fake contacts and martyr banners (unit spfT, team mart/clr ride along on ents/teams); save games 2026-11-06: clocks, Conquest setup timer, strikes in flight
const CK_TEAM_SKIP=new Set(['F','ai','id','fac','color','dark']);
// (a unit that just went into a tunnel / the fortress / a city building is saved inside it: it leaves G.ents only at the
// end of the sim step)
const ckSafe=(k,v)=>k==='oil'?undefined:v;   /* an order aimed at an oil derrick points at the derrick row, which points back at its target (circular): leave the row out when comparing */
/* underscore fields are caches and are not saved, EXCEPT these, which the simulation reads to decide things (2026-11-14 savesync: a loaded save or a migrated host played on differently): _fc, artillery first-shot clock _arT (damage), cover cache _cvT/_cvK (who sees whom), AI target spreading _dv/_dvT/_dvTg */
const CK_UKEEP=new Set(['_fc','_arT','_cvT','_cvK','_dv','_dvT','_dvTg']);
function ckEncode(){const ids=new Map();for(const e of G.ents)if(!e.inTun)ids.set(e,e.id);const fi=new Map(G.fields.map((f,i)=>[f,i])),oi=new Map(G.oil.map((o,i)=>[o,i])),ci=new Map((G.civ||[]).map((c,i)=>[c,i]));
  const S=[],SI=new Map();const sref=s=>{let i=SI.get(s);if(i==null){i=S.length;SI.set(s,i);S.push(s);}return i;};
  const seen=new WeakSet();
  const enc=(v,depth)=>{if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;if(v.isObject3D||v.isMaterial||v.isBufferGeometry)return undefined;
    if(ids.has(v)&&depth>0)return {$e:ids.get(v)};if(fi.has(v))return {$f:fi.get(v)};if(oi.has(v))return {$o:oi.get(v)};if(ci.has(v)&&depth>0)return {$c:ci.get(v)};
    if(v instanceof Map||v instanceof Set||v instanceof WeakSet||ArrayBuffer.isView(v))return undefined;if(depth>7||seen.has(v))return undefined;seen.add(v);
    // a unit kept off the map (inside a tunnel or the Mountain Fortress) shares its stat block through the table too
    const unit=!Array.isArray(v)&&typeof v.id==='number'&&typeof v.kind==='string'&&v.s&&typeof v.s==='object'&&!ids.has(v);
    let out;if(Array.isArray(v)){out=v.map(x=>{const y=enc(x,depth+1);return y===undefined?null:y;});}else{out={};for(const k in v){if(unit&&(k==='s'||k==='vs'||k==='_vr'||(k[0]==='_'&&!CK_UKEEP.has(k)))){if(k==='s')out.$s=sref(v.s);continue;}const y=enc(v[k],depth+1);if(y!==undefined)out[k]=y;}}seen.delete(v);return out;};
  const ents=G.ents.filter(e=>!e.dead&&!e.inTun).map(e=>{const o={};for(const k in e){if(k==='s'){o.$s=sref(e.s);continue;}if(k==='vs'||k==='_vr'||(k[0]==='_'&&!CK_UKEEP.has(k)))continue;const y=enc(e[k],1);if(y!==undefined)o[k]=y;}if(e.vs){let m=0;for(let i=0;i<e.vs.length&&i<31;i++)if(e.vs[i])m|=1<<i;o.$vs=m;}return o;});  // who sees it: the AI decides from this, and it is only refreshed every few ticks
  const teams=G.teams.map(T=>{const o={};for(const k in T){if(CK_TEAM_SKIP.has(k))continue;const y=enc(T[k],1);if(y!==undefined)o[k]=y;}o.$ai=!!T.ai;o.$aiD=T.ai?T.ai.d+10*(T.ai.p|0):null;o.$aiS=T.ai?enc(T.ai,1):null;o.aiTook=!!T.aiTook;return o;});
  const g={};for(const k of CK_G)if(G[k]!==undefined){const y=enc(G[k],1);if(y!==undefined)g[k]=y;}
  const fields=G.fields.map(f=>({amt:f.amt,owner:f.owner}));
  const oil=G.oil.map(o=>{const r={};for(const k in o){if(k==='tg')continue;const y=enc(o[k],1);if(y!==undefined&&(typeof y!=='object'||Array.isArray(y)||y===null||y.$e!=null))r[k]=y;}return r;});
  const civ=(G.civ||[]).map(c=>{const r={};for(const k in c){if(k==='obj'||k==='mesh')continue;const y=enc(c[k],2);if(y!==undefined)r[k]=y;}return r;});
  const okRef=v=>v&&(ids.has(v)||fi.has(v)||oi.has(v)||ci.has(v));const proj=(G.proj||[]).filter(p=>p&&ids.has(p.src)&&okRef(p.tgt)).map(p=>{const o={};for(const k in p){const y=enc(p[k],1);if(y!==undefined)o[k]=y;}return o;});
  const camp=G.camp?(()=>{const o={};for(const k in G.camp){if(k==='m'||k==='R')continue;const y=enc(G.camp[k],1);if(y!==undefined)o[k]=y;}return o;})():null;
  const L=G.lg,lgc=L?{sig:L.sig,cvT:L.cvT,cvs:L.cvs,csig:L.csig,rcA:L.rcA,lgv:G.lgv,reach:L.reach?L.reach.map(a=>a?Array.from(a):null):null,trade:L.trade?L.trade.map(a=>a?Array.from(a):null):null,cov:L.cov?enc(L.cov,1):null,bead:L.bead?enc(L.bead,1):null}:null;   /* redfixE: the supply network as last worked out (it is refreshed once a second, so a fresh rebuild on load differs) */
  const ffc=ckFfcSave();
  return {v:2,lgc,ffc,proj,camp,ents,S:S.map(s=>enc(s,1)),teams,g,fields,oil,civ,toks:tokSafe(),start:NET.startInfo||null,me:ME,cs:NET.peers?NET.peers.map((p,i)=>Math.max(p&&NET.cseq?(NET.cseq[p]||0):0,((NET.cseqSlot||[])[i]||0))):null};}
/* redfixE: the route fields the units follow (FFC in 03-sim, last 8 goals) are part of what the battle does next (a fresh one costs route budget, a stale
   one is used until there is budget) - the checkpoint lists them: fresh ones are rebuilt on load (same map state = same field), stale ones are stored as they are */
const ckB64F=a=>{const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let b='';for(let i=0;i<u.length;i+=32768)b+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(b);};
const ckF64B=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Float32Array(u.buffer);};
function ckFfcSave(){if(typeof FFC==='undefined')return null;const out=[];for(const [k,F] of FFC){const ok=F.gv===(G.gridV|0)&&F.bv===(G.boccV|0)&&F.pn===PN;
    out.push({k,t:F.t,ok:ok?1:0,no:F.f===false?1:0,g:F.f?F.f.goal:null,d:!ok&&F.f&&F.pn===PN?ckB64F(F.f.d):null});}return {L:out,bd:G.bdirty?1:0};}
function ckFfcLoad(c){if(typeof FFC==='undefined')return;FFC.clear();if(!c||!Array.isArray(c.L))return;const pn=G.pfN;G.boccU=G.upN;try{bocc();}catch(e){}
  for(const q of c.L){let f;if(q.no)f=false;else if(q.ok){P_B=true;try{f=ffBuild((q.k%GW)*CELL+CELL/2,((q.k/GW)|0)*CELL+CELL/2);}finally{P_B=false;}}else if(q.d){const d=ckF64B(q.d);if(d.length!==PN)continue;f={d,goal:q.g};}else continue;
    FFC.set(q.k,{f,gv:q.ok?G.gridV|0:-1,bv:q.ok?G.boccV|0:-1,t:q.t,pn:PN});}
  G.pfN=pn;if(c.bd)G.bdirty=true;}
function ckDecode(ck){const byId=new Map();const S=ck.S;const ents=ck.ents.map(o=>Object.assign({},o));for(const e of ents)byId.set(e.id,e);
  let sTab=[];const dec=v=>{if(v==null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(dec);if(v.$e!=null)return byId.get(v.$e)||null;if(v.$f!=null)return G.fields[v.$f]||null;if(v.$o!=null)return G.oil[v.$o]||null;if(v.$c!=null)return (G.civ||[])[v.$c]||null;
    const o={};for(const k in v){if(k==='$s')continue;o[k]=dec(v[k]);}if(v.$s!=null&&sTab[v.$s]){o.s=sTab[v.$s];o.vs=new Array(G.teams.length).fill(false);}return o;};  // $s: a unit off the map (tunnel / fortress)
  sTab=S.map(s=>dec(s));
  {const cn=new Array(sTab.length);for(const e of ents){const i=e.$s;if(i==null||cn[i]!==undefined||!sTab[i])continue;cn[i]=null;try{const T=G.teams[e.team],c=T&&T.fac&&stats(T.fac,e.kind);if(c&&JSON.stringify(c)===JSON.stringify(sTab[i])){sTab[i]=c;cn[i]=c;}}catch(_){}}}   // redfixE: a unit whose stats are the nation's shared table gets that same table back (new units of that kind share it, as before the save)
  for(const e of ents){for(const k in e){if(k==='$s')continue;e[k]=dec(e[k]);}e.s=sTab[e.$s];delete e.$s;e.vs=new Array(G.teams.length).fill(false);}
  return {ents,byId,dec};}
// Turn this page (currently a client in the battle) into the host, from a checkpoint.
function ckRestore(ck){const N=G.teams.length;dugEnsure(ck.civ?ck.civ.length:0);const {ents,byId,dec}=ckDecode(ck);  // dugout slots are added to the civ list after the map's own buildings: make room before refs are resolved
  G.ents=ents;G.byId=byId;G.proj=[];G.strikes=[];G.timers=[];G.planes=[];G.out=[];G.spoofs=[];G.mban=[];G.mbanN=0;G._ewv=null;  // defaults for checkpoints from before these were saved
  for(const k in ck.g){const d=ck.g[k];G[k]=(d&&typeof d==='object')?JSON.parse(JSON.stringify(d)):d;}
  const reb=dec;
  for(const k of ['mines','smokes','shields','ruins'])if(Array.isArray(G[k]))G[k]=reb(G[k]);   // ruins: map buildings stored by index (redfixE: were left as {$c} stubs)
  ck.fields.forEach((f,i)=>{if(G.fields[i])Object.assign(G.fields[i],f);});
  ck.oil.forEach((o,i)=>{if(G.oil[i])Object.assign(G.oil[i],reb(o));});
  (ck.civ||[]).forEach((c,i)=>{const C=G.civ&&G.civ[i];if(C)for(const k in c)C[k]=reb(c[k]);});dugAtRebuild();
  if(Array.isArray(ck.proj))G.proj=ck.proj.map(p=>{const o={};for(const k in p)o[k]=reb(p[k]);return o;}).filter(p=>p.src&&p.tgt);
  if(ck.camp&&G.camp)for(const k in ck.camp){const v=reb(ck.camp[k]);if(typeof G.camp[k]!=='function')G.camp[k]=v;}try{rubSync();bfSync();}catch(e){}
  ck.teams.forEach((t,i)=>{const T=G.teams[i];if(!T)return;for(const k in t){if(k==='$ai'||k==='$aiD'||k==='$aiS'||k==='aiTook')continue;T[k]=reb(t[k]);}T.ai=(t.$ai||t.aiTook)?mkAI(t.$aiD!=null?t.$aiD:1):null;if(T.ai&&t.$aiS){const S=reb(t.$aiS);for(const k in S)T.ai[k]=S[k];}T.aiTook=!!t.aiTook;});
  for(const T of G.teams){if(T.q){for(const c of CATS){const L=(T.q[c]||[]);if(!L.length)continue;const b=G.ents.filter(e=>e.isB&&e.team===T.id&&e.kind===c&&e.built>=1&&!e.dead).sort((x,y)=>x.id-y.id)[0];if(b)b.q=(b.q||[]).concat(L.map(i=>({kind:i.kind,t:i.t||0,c:Math.round((BASE[i.kind]&&BASE[i.kind].cost)||0)})));else for(const i of L)T.credits+=BASE[i.kind]?BASE[i.kind].cost:0;}delete T.q;}}  // old saves: the shared queue of a building type moves onto its first building (no building left: refunded)
  for(const e of ents){if(e.so&&e.order&&e.so!==e.order&&JSON.stringify(e.so,ckSafe)===JSON.stringify(e.order,ckSafe))e.so=e.order;}  // stall watch compares the order by identity
  for(const e of ents){const p=e.path,w=e.npW;if(w&&p&&p[0]&&w[0]===p[0][0]&&w[1]===p[0][1])e.npW=p[0];}  // path-progress watch compares the waypoint by identity
  try{lgSync();}catch(e){}try{const c=ck.lgc,L=G.lg;if(c&&L){const U8=a=>a?Uint8Array.from(a):null;L.sig=c.sig;L.cvT=c.cvT;L.cvs=c.cvs;L.csig=c.csig;L.rcA=c.rcA;if(c.lgv!=null)G.lgv=c.lgv;if(c.reach)L.reach=c.reach.map(U8);if(c.trade)L.trade=c.trade.map(U8);if(c.cov)L.cov=JSON.parse(JSON.stringify(c.cov));if(c.bead)L.bead=JSON.parse(JSON.stringify(c.bead));}}catch(e){}try{damSync();}catch(e){}G.civDirty=true;G.bdirty=true;G.hash=null;try{buildHash();}catch(e){}try{ckFfcLoad(ck.ffc);}catch(e){}try{updateVis();}catch(e){}
  for(const e of ents){if(e.$vs!=null){const m=e.$vs;for(let i=0;i<e.vs.length&&i<31;i++)e.vs[i]=!!(m>>i&1);delete e.$vs;e.vis=e.vs[ME]||(e.isB&&!!((e.sn|0)&(1<<ME)));}}G.sel=G.sel.filter(e=>byId.has(e.id)).map(e=>byId.get(e.id));}
/* ---------- Host migration ----------
   Every 8 s the host packs a checkpoint (gzip, ~25 KB for a busy 8-player battle) and sends it to one standby player
   (the first connected player who is allowed to host). If the host disappears, everyone first tries to reconnect to
   the same room; after two failed tries the standby restores the checkpoint and opens the follow-up room
   "<code>-m1"; the other players move there automatically and rejoin as their own commanders. The old host's army is
   handed to the AI. */
async function ckPack(ck){const js=JSON.stringify(ck);if(typeof CompressionStream==='undefined'||typeof Blob==='undefined')return 'J'+js;
  const buf=new Uint8Array(await new Response(new Blob([js]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let b='';for(let i=0;i<buf.length;i+=32768)b+=String.fromCharCode.apply(null,buf.subarray(i,i+32768));return 'Z'+btoa(b);}
async function ckUnpack(s){if(s[0]==='J')return JSON.parse(s.slice(1));const bin=atob(s.slice(1)),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
function migRoom(gen){return gen>0?NET.baseCode+'-m'+gen:NET.baseCode;}
// the standby (who takes the battle over if the host goes, or if a Cloudflare host can't keep up): the strongest player
// PC, by the short benchmark each page reports (hi.hp, 07-net hostPower) and its ping; players who can't send (ed 0)
// never. The current standby keeps the job unless someone is clearly (15%) better, so checkpoints don't hop around.
function sbScore(k){const q=NET.peers[k],hp=(NET.hpOf||{})[q],pi=(NET.pings||{})[q];return (hp>0?hp:50)/(1+(pi>0?Math.min(pi,2000):100)/200);}
function sbPick(live){const c=live.filter(k=>(NET.edOf||{})[NET.peers[k]]!==0);if(!c.length)return null;let b=c[0];for(const k of c)if(sbScore(k)>sbScore(b))b=k;
  const cur=NET.sbSlot;return cur!=null&&cur!==b&&c.includes(cur)&&sbScore(cur)>=.85*sbScore(b)?cur:b;}
function ckTick(dt,live){NET.ckT=(NET.ckT==null?4:NET.ckT)-dt;if(NET.ckT>0||NET.ckBusy||NET.ckOut||!live.length||!NET.game)return;NET.ckT=8;
  const sb=sbPick(live);if(sb==null)return;const to=NET.peers[sb];NET.ckBusy=true;
  let ck;try{ck=ckEncode();ck.gen=NET.gen||0;}catch(e){console.warn('checkpoint',e);NET.ckBusy=false;return;}
  // packing (JSON + gzip) waits for the next turn of the event loop: a separate slice from the step that took the checkpoint
  new Promise(r=>setTimeout(r,0)).then(()=>ckPack(ck)).then(s=>{if(!NET.game)return;const id=(NET.ckId=(NET.ckId||0)+1),n=Math.ceil(s.length/3000);NET.ckOut={to,sb,id,n,s,i:0,cs:ck.cs};}).catch(()=>{}).finally(()=>{NET.ckBusy=false;});}
// the checkpoint trickles out 2 chunks per tick (it used to go in one ~30 KB burst that delayed that player's snapshots)
function ckFlush(){const O=NET.ckOut;if(!O||!NET.game){NET.ckOut=null;return;}if(NET.game.buffered&&NET.game.buffered(O.to)>12000)return;for(let k=0;k<2&&O.i<O.n;k++,O.i++)NET.game.emit('ck',{to:O.to,id:O.id,i:O.i,n:O.n,d:O.s.slice(O.i*3000,(O.i+1)*3000)}).catch(()=>{});if(O.i>=O.n){NET.ckAk=O.cs;NET.sbSlot=O.sb;NET.ckOut=null;}}  // the standby flag moves only once the new standby holds a whole checkpoint
function ckReceive(d){if(!d||typeof d.d!=='string'||!(d.n>0)||d.n>400)return;const P=NET.ckParts||(NET.ckParts={});let e=P[d.id];if(!e){e=P[d.id]={n:d.n,got:0,a:new Array(d.n)};for(const k in P)if(+k<d.id-2)delete P[k];}
  if(e.a[d.i]==null){e.a[d.i]=d.d;e.got++;}if(e.got===e.n){NET.lastCk=e.a.join('');NET.isStandby=true;delete P[d.id];}}
async function promoteToHost(){let ck;try{ck=await ckUnpack(NET.lastCk);}catch(e){console.warn('checkpoint unpack',e);return false;}
  const gen=(ck.gen||0)+1,code2=migRoom(gen),me=ME;
  // open the follow-up room first, while still a client: if another player already opened it (two players held a
  // checkpoint), this page stays a client and simply joins that room instead of restoring and splitting the battle
  {const og=NET.game;NET.game=null;try{if(og)og.leave().catch(()=>{});}catch(e){}}NET.code=code2;
  // (at most 12 s: a matchmaking service that never answers must not hold up the takeover for good; it is tried again)
  // "taken" usually means another player already opened it (then this page steps back). But right after one of OUR tries
  // timed out, the room may still be held by that late, abandoned attempt of ours (it is being closed): giving up then
  // left nobody to take over (no standby any more), so for 30 s after a timeout of ours, "taken" means try again.
  let g;try{g=await joinT('tc-'+code2,12000,1);}catch(e){NET.code='join';const t=e&&e.type;console.warn('new host room',t||e);if(t==='timeout')NET.promoLateW=performance.now();
    return t==='unavailable-id'&&!(NET.promoLateW&&performance.now()-NET.promoLateW<30000)?false:'retry';}
  if(MODE!=='client'||!G||G.over){NET.code='join';try{g.leave().catch(()=>{});}catch(e){}return false;}
  // Only one player may take over. A shared room (claude.ai room, or the Nostr network when this page could not get the
  // game's id on PeerJS) lets two standbys in at once, so each first stakes a claim [checkpoint time, side] in the room
  // for ~0.8 s: the newest checkpoint wins, then the lowest side number. A player who sees a better claim, or a host
  // already there, steps back and simply rejoins as a player.
  const cl=[+(ck.g&&ck.g.t)||0,me],beats=c=>Array.isArray(c)&&(+c[0]>cl[0]+1e-6||Math.abs(+c[0]-cl[0])<=1e-6&&(c[1]|0)<me);
  const rival=()=>g.peers().some(q=>!q.sameTab&&q.presence&&(q.presence.h||beats(q.presence.cl)));
  for(let k=0,kn=window.WW3_P2P?4:10;k<kn&&!rival();k++){g.presence({cl}).catch(()=>{});await new Promise(r=>setTimeout(r,200));}
  if(rival()||MODE!=='client'||!G||G.over){console.info('takeover: another player is taking over');NET.code='join';try{g.leave().catch(()=>{});}catch(e){}return false;}
  try{ckRestore(ck);}catch(e){console.warn('checkpoint restore',e);NET.code='join';try{g.leave().catch(()=>{});}catch(_){}return false;}
  MODE='host';ME=me;NET.gen=gen;NET.toks=ck.toks||[];NET.startInfo=ck.start;NET.peers=new Array(G.teams.length).fill(null);NET.cseq={};NET.cseqSlot=Array.isArray(ck.cs)?ck.cs.slice():[];NET.ckAk=null;NET.ckOut=null;NET.sbSlot=null;NET.iaDev=0;NET.tgC=null;NET.tgS=null;NET.ver=null;NET.sk=null;NET.gq=[];NET.civQ=[];NET.snapTo=[];NET.sc={};NET.kt={};NET.kf={};NET.isStandby=false;NET.lastCk=null;NET.edOf={};try{if(NET.room&&NET.startInfo)NET.room.presence({g:{c:NET.baseCode||NET.jcode,f:G.teams[me].fac,s:'full',n:G.teams.length,m:NET.startInfo.map}}).catch(()=>{});}catch(e){}
  const oldHost=ck.me|0;for(let k=0;k<G.teams.length;k++){const T=G.teams[k];if(k===ME){T.ai=null;T.discT=0;continue;}if(k===oldHost){if(!T.ai){T.ai=mkAI(1);T.aiTook=1;}continue;}if(!T.ai&&!T.out)T.discT=G.t;}
  // the host flag goes out again each second for 10 s, so a claimant that only reaches the room now still sees it
  // In its first 10 s a new host that sees another host with a better claim (the two never saw each other's claims in
  // time) steps down: it leaves and rejoins that host as a player, so the battle doesn't split in two.
  NET.game=g;wireHost(g);g.presence({h:1,cl}).catch(()=>{});
  for(let k=1;k<=10;k++)setTimeout(()=>{if(MODE!=='host'||NET.game!==g)return;
    if(g.peers().some(q=>!q.sameTab&&q.presence&&q.presence.h&&beats(q.presence.cl))){console.info('takeover: another player took over first, rejoining as a player');
      NET.game=null;try{g.leave().catch(()=>{});}catch(e){}MODE='client';NET.code='join';NET.gen=gen-1;NET.isStandby=false;NET.lastCk=null;NET.lastRx=performance.now();
      // this screen still shows the restored checkpoint (a host's view, with no client bookkeeping): from now on the other
      // host's updates draw it, and whatever they don't show (units in the fog) fades out as on any player's screen,
      // instead of standing frozen forever. This page no longer lists the battle in the game list either.
      for(const e of G.ents){e.seenAt=NET.lastSnapT||0;e.seenL=G.t;if(!e.isB){e.fx=e.tx=e.x;e.fy=e.ty=e.y;e.it=1;}}
      try{if(NET.room)NET.room.presence({g:null}).catch(()=>{});}catch(e){}
      clientReconnect();return;}
    g.presence({h:1,cl}).catch(()=>{});},k*1000);
  for(const O of G.teams)log(O.id,`Connection lost for a moment. The battle goes on; the other commanders are reconnecting.`,'w');return true;}
