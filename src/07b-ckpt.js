/* ---------- Battle checkpoints (for host migration) ----------
   The host periodically packs the whole battle into a compact checkpoint and sends it to a standby player. If the host
   drops out, the standby restores the latest checkpoint and carries on as the new host; everyone else reconnects to it.
   Entities, resource fields, oil derricks and civilian buildings referenced inside other objects are stored by id or
   index, unit stat blocks are shared through a table, and anything visual or derived is rebuilt after loading. */
const CK_G=['t','nid','aiT','visT','endT','over','bs','cbrTeams','mT','ecT','wx','mines','smokes','shields','craters','ruins','aiTT','sqOf',
  'spoofs','mban','mbanN'];  // EW radar-spoof fake contacts and martyr banners (unit spfT, team mart/clr ride along on ents/teams)
const CK_TEAM_SKIP=new Set(['_uk','_ut','F','ai','id','fac','color','dark']);
function ckEncode(){const ids=new Map();for(const e of G.ents)ids.set(e,e.id);const fi=new Map(G.fields.map((f,i)=>[f,i])),oi=new Map(G.oil.map((o,i)=>[o,i])),ci=new Map((G.civ||[]).map((c,i)=>[c,i]));
  const S=[],SI=new Map();const sref=s=>{let i=SI.get(s);if(i==null){i=S.length;SI.set(s,i);S.push(s);}return i;};
  const seen=new WeakSet();
  const enc=(v,depth)=>{if(v==null||typeof v!=='object')return typeof v==='function'?undefined:v;if(v.isObject3D||v.isMaterial||v.isBufferGeometry)return undefined;
    if(ids.has(v)&&depth>0)return {$e:ids.get(v)};if(fi.has(v))return {$f:fi.get(v)};if(oi.has(v))return {$o:oi.get(v)};if(ci.has(v)&&depth>0)return {$c:ci.get(v)};
    if(v instanceof Map||v instanceof Set||v instanceof WeakSet||ArrayBuffer.isView(v))return undefined;if(depth>7||seen.has(v))return undefined;seen.add(v);
    let out;if(Array.isArray(v)){out=v.map(x=>{const y=enc(x,depth+1);return y===undefined?null:y;});}else{out={};for(const k in v){const y=enc(v[k],depth+1);if(y!==undefined)out[k]=y;}}seen.delete(v);return out;};
  const ents=G.ents.filter(e=>!e.dead).map(e=>{const o={};for(const k in e){if(k==='s'){o.$s=sref(e.s);continue;}if(k==='vs'||k==='_vr'||k[0]==='_')continue;const y=enc(e[k],1);if(y!==undefined)o[k]=y;}return o;});
  const teams=G.teams.map(T=>{const o={};for(const k in T){if(CK_TEAM_SKIP.has(k))continue;const y=enc(T[k],1);if(y!==undefined)o[k]=y;}o.$ai=!!T.ai;o.$aiD=T.ai?T.ai.d:null;o.aiTook=!!T.aiTook;return o;});
  const g={};for(const k of CK_G)if(G[k]!==undefined){const y=enc(G[k],1);if(y!==undefined)g[k]=y;}
  const fields=G.fields.map(f=>({amt:f.amt,owner:f.owner}));
  const oil=G.oil.map(o=>{const r={};for(const k in o){if(k==='tg')continue;const y=enc(o[k],1);if(y!==undefined&&(typeof y!=='object'||Array.isArray(y)||y===null||y.$e!=null))r[k]=y;}return r;});
  const civ=(G.civ||[]).map(c=>{const r={};for(const k in c){if(k==='obj'||k==='mesh')continue;const y=enc(c[k],2);if(y!==undefined)r[k]=y;}return r;});
  return {v:1,ents,S:S.map(s=>enc(s,1)),teams,g,fields,oil,civ,toks:tokSafe(),start:NET.startInfo||null,me:ME,cs:NET.peers?NET.peers.map((p,i)=>Math.max(p&&NET.cseq?(NET.cseq[p]||0):0,((NET.cseqSlot||[])[i]||0))):null};}
function ckDecode(ck){const byId=new Map();const S=ck.S;const ents=ck.ents.map(o=>Object.assign({},o));for(const e of ents)byId.set(e.id,e);
  const dec=v=>{if(v==null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(dec);if(v.$e!=null)return byId.get(v.$e)||null;if(v.$f!=null)return G.fields[v.$f]||null;if(v.$o!=null)return G.oil[v.$o]||null;if(v.$c!=null)return (G.civ||[])[v.$c]||null;
    const o={};for(const k in v)o[k]=dec(v[k]);return o;};
  const sTab=S.map(s=>dec(s));
  for(const e of ents){for(const k in e){if(k==='$s')continue;e[k]=dec(e[k]);}e.s=sTab[e.$s];delete e.$s;e.vs=new Array(G.teams.length).fill(false);}
  return {ents,byId};}
// Turn this page (currently a client in the battle) into the host, from a checkpoint.
function ckRestore(ck){const N=G.teams.length;const {ents,byId}=ckDecode(ck);
  G.ents=ents;G.byId=byId;G.proj=[];G.strikes=[];G.timers=[];G.planes=[];G.out=[];G.spoofs=[];G.mban=[];G._ewv=null;  // defaults for checkpoints from before these were saved
  for(const k in ck.g){const d=ck.g[k];G[k]=(d&&typeof d==='object')?JSON.parse(JSON.stringify(d)):d;}
  const reb=v=>{if(v==null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(reb);if(v.$e!=null)return byId.get(v.$e)||null;if(v.$f!=null)return G.fields[v.$f]||null;if(v.$o!=null)return G.oil[v.$o]||null;if(v.$c!=null)return (G.civ||[])[v.$c]||null;const o={};for(const k in v)o[k]=reb(v[k]);return o;};
  for(const k of ['mines','smokes','shields'])if(Array.isArray(G[k]))G[k]=reb(G[k]);
  ck.fields.forEach((f,i)=>{if(G.fields[i])Object.assign(G.fields[i],f);});
  ck.oil.forEach((o,i)=>{if(G.oil[i])Object.assign(G.oil[i],reb(o));});
  (ck.civ||[]).forEach((c,i)=>{const C=G.civ&&G.civ[i];if(C)for(const k in c)C[k]=reb(c[k]);});
  ck.teams.forEach((t,i)=>{const T=G.teams[i];if(!T)return;for(const k in t){if(k==='$ai'||k==='$aiD'||k==='aiTook')continue;T[k]=reb(t[k]);}T.ai=(t.$ai||t.aiTook)?mkAI(t.$aiD!=null?t.$aiD:1):null;T.aiTook=!!t.aiTook;});
  G.bdirty=true;G.hash=null;try{buildHash();}catch(e){}try{updateVis();}catch(e){}G.sel=G.sel.filter(e=>byId.has(e.id)).map(e=>byId.get(e.id));}
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
function ckTick(dt,live){NET.ckT=(NET.ckT==null?4:NET.ckT)-dt;if(NET.ckT>0||NET.ckBusy||NET.ckOut||!live.length||!NET.game)return;NET.ckT=8;
  const sb=live.find(k=>(NET.edOf||{})[NET.peers[k]]!==0);if(sb==null)return;const to=NET.peers[sb];NET.ckBusy=true;
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
  let g;try{g=await joinT('tc-'+code2,12000,1);}catch(e){NET.code='join';console.warn('new host room',e&&e.type||e);return e&&e.type==='unavailable-id'?false:'retry';}
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
