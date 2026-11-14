/* ---------- 08d-lobby: friend-battle lobby for guests (Ready / nation / team) + landing from an invite link ----------
   UI only. Guests send one small 'pick' message {f:nation, t:team, r:ready}; a browser host answers with a 'lobr' roster,
   a Cloudflare battle sends the same facts inside its 'blob' (seats[].r). The leader's Start button lights when every
   friend is ready (07-net renderLobby); a leader can always press "Start anyway". No sim state is touched. */
const GLB={landing:null,me:{f:null,t:-1,r:0},roster:null,el:null,sent:0};
(function(){const s=document.createElement('style');s.textContent=`
#glob{position:fixed;inset:0;z-index:300;background:rgba(6,9,8,.94);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;color:#e8efe9}
#glob .gbox{animation:lkIn .25s ease-out;width:min(600px,100%);max-height:100%;overflow:auto;background:#121a16;border:1px solid #2d4a3a;border-radius:10px;padding:18px 18px 16px;box-shadow:0 10px 40px #000a}
#glob h2{margin:0 0 2px;font-size:22px;letter-spacing:.04em}#glob .gsub{opacity:.7;font-size:14px;margin-bottom:12px}
#glob .gtag{font-size:12px;padding:2px 7px;border-radius:9px;background:#33443b;text-transform:uppercase;letter-spacing:.05em}
#glob .gbtn{display:block;width:100%;margin-top:10px;padding:13px;font-size:19px;font-weight:700;border-radius:8px;border:0;cursor:pointer;background:#c9892a;color:#17110a}
#glob .gbtn.on{background:#2a9a55;color:#fff}#glob .gbtn.sec{background:#2a3a33;color:#cfe0d5;font-size:15px;font-weight:500;padding:9px}
`;document.head.appendChild(s);})();
function glName(r,k){return r.me?'You':r.h?'Leader':'Friend '+k;}
// what the lobby looks like to a guest: from the Cloudflare blob or the browser host's roster
function glData(){const B=NET.cf&&NET.cf.blob;
  if(B&&!B.own&&Array.isArray(B.seats)){const rows=B.seats.filter(s=>s.h).map((s,k)=>({me:k===(B.you|0),h:k===0,f:s.f,tm:s.tm|0,rd:s.r}));
    for(const s of B.seats)if(s.ai)rows.push({ai:1,f:s.f,tm:s.tm|0});return {map:B.map,mx:B.mx|0,rows,srv:1,w:B.w};}
  const R=GLB.rg===NET.game?GLB.roster:null;if(R&&Array.isArray(R.r))return {map:R.m,mx:R.mx|0,rows:R.r.map(x=>({me:x.p===NET.myPeer,h:!!x.h,ai:!!x.ai,f:x.f,tm:x.t|0,rd:x.h||x.ai?undefined:x.d})),srv:0};
  return null;}
function glSend(){if(!NET.game||MODE!=='single'||NET.wantSpec)return;const m=GLB.me;NET.game.emit('pick',{f:m.f,t:m.t,r:m.r?1:0}).catch(()=>{});}
// the browser host tells everybody in the lobby who is here (called from renderLobby; an old guest page ignores it)
function glBroadcast(mk,mx){if(!NET.game||MODE!=='single'||NET.cf&&NET.cf.own)return;
  const r=[{p:NET.myPeer||'',h:1,f:setup.p,t:NET.tm[0]|0}];NET.lobby.forEach((p,k)=>r.push({p:p.peer,f:p.f,t:NET.tm[k+1]|0,d:p.r?1:0}));(NET.ais||[]).forEach(a=>r.push({ai:1,f:a.f,t:a.tm|0}));
  NET.game.emit('lobr',{m:mk,mx,r}).catch(()=>{});}
function glRender(){const guest=MODE==='single'&&NET.game&&NET.code==='join'&&!(NET.cf&&NET.cf.own);
  if(guest&&NET.joined&&GLB.g!==NET.game&&!NET.wantSpec){GLB.g=NET.game;GLB.me={f:setup.p,t:-1,r:0};glSend();}
  if(!guest&&!GLB.landing){if(GLB.el){GLB.el.remove();GLB.el=null;}return;}
  if(MODE!=='single'&&GLB.el){GLB.el.remove();GLB.el=null;GLB.landing=null;return;}
  const D=guest&&!NET.wantSpec?glData():null;
  if(!GLB.el&&!D){GLB.el=document.createElement('div');GLB.el.id='glob';document.body.appendChild(GLB.el);}
  const E=(t,c,x)=>{const d=document.createElement(t);if(c)d.className=c;if(x!=null)d.textContent=x;return d;};
  const box=E('div','gbox');
  if(!D){ // still connecting (or watching): mirror the status line
    const st=($('mpstatus')&&$('mpstatus').textContent||'').trim(),bad=/not found|not a game|different versions|full|refused|wrong|Too many/i.test(st);
    box.append(E('h2','','⚔ World War 3'),LK.empty(bad?st.slice(0,220):GLB.landing?'Joining battle '+String(GLB.landing).toUpperCase():(NET.wantSpec?'Watching':'Connecting'),bad,!bad));
    if(!bad&&st)box.append(E('div','gnote',st.slice(0,220)));
    const b=E('button','gbtn sec','Back to menu');b.onclick=()=>{GLB.landing=null;try{leaveNet();}catch(e){}glRender();};box.append(b);
    const key='c'+(NET.game?1:0)+st;if(GLB.key!==key||!GLB.el.firstChild){GLB.key=key;GLB.el.innerHTML='';GLB.el.append(box);}
    if(!NET.game&&GLB.landing&&GLB.t0&&performance.now()-GLB.t0>22000&&!/Looking|Joining|Connecting/.test(st)){GLB.landing=null;}
    return;}
  GLB.landing=null;if(!GLB.me.f)GLB.me.f=setup.p;
  const mine=D.rows.find(r=>r.me),mx=Math.max(D.mx||0,D.rows.length),all=D.rows.map(r=>r.tm|0);
  LK.watch('g',D.rows.filter(r=>!r.me).map((r,k)=>r.ai?'Computer '+(k+1):r.h?'The leader':'Friend '+(k+1)+' ('+((FACTIONS[r.f]||{}).name||r.f)+')'));
  // keep a select the person is using open: only redraw when something changed
  if(GLB.el){GLB.el.remove();GLB.el=null;}
  const key=JSON.stringify([D.rows,GLB.me,D.mx,D.w,MPL.el?1:0]);if(GLB.key===key&&MPL.el)return;GLB.key=key;
  const rows=D.rows.map((r,k)=>r.ai?{kind:'ai',d:r.d|0,f:r.f,tm:r.tm|0,ed:null}:{kind:'human',you:!!r.me,host:!!r.h,name:glName(r,k),f:r.me?GLB.me.f:r.f,tm:r.me&&GLB.me.t>=0?GLB.me.t:r.tm|0,rd:r.me?GLB.me.r:r.rd,
    ed:r.me?{f:v=>{GLB.me.f=v;setup.p=v;try{facCards();}catch(e){}glSend();glRender();},t:v=>{GLB.me.t=v;glSend();glRender();}}:null});
  for(let i=D.rows.length;i<mx;i++)rows.push({kind:'open'});
  mplShow({code:lobbyCode(),mk:D.map,mx,nn:D.rows.length,rows,all,w:D.w,net:typeof cfNetText==='function'?cfNetText():'',notes:['Waiting for the leader to start'],
    ready:{on:!!GLB.me.r,fn:()=>{GLB.me.r=GLB.me.r?0:1;glSend();glRender();}},back:()=>{try{leaveNet();}catch(e){}GLB.landing=null;mplHide();glRender();}});
}
// invite link landing: the game opens straight into the battle's lobby instead of the menu
function glLanding(code){GLB.landing=code;GLB.t0=performance.now();glRender();}
setInterval(()=>{try{glRender();}catch(e){}},500);
