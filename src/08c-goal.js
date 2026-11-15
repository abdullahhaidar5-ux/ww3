/* ---------- Battle goal line + power meter numbers (was inside the Conquest town file; Conquest and the town UI are gone, 2026-11-14) ---------- */
/* Battle power meter numbers (same derivation on host and clients, refreshed twice a second) */
function pwView(){const k=Math.floor(G.t*2),c=G._pwv;if(c&&c.k===k)return c;const p=pwrOf(ME);return G._pwv={k,make:p.make,use:p.use,low:p.use>p.make};}
/* THE goal line (Abdullah 2026-11-13 17:31 "clearer goals on screen"): one calm line under the top bar that says what wins this
   game and how far along it is, updated live; a short flash when it moves (a base building falls, a town is taken).
   Battle: Destroy every enemy building (N left). Missions: the current objective with its check state (replaces the old
   mission objectives box). Missile / uplink countdowns stay as a small second line under it. */
const GOAL={pk:{},key:'',fl:0};
function goalText(){if(GOAL.g!==G){GOAL.g=G;GOAL.pk={};GOAL.key='';}const me=G.teams[ME];if(!me)return null;const enemy=T=>!T.reb&&!T.out&&!ally(T.id,ME);const B=['hq','barracks','factory','airfield','shipyard'];
  if(G.camp){const c=G.camp,m=c.m,done=m.obj.filter(o=>c.o[o[0]]).length,cur=m.obj.find(o=>!c.o[o[0]]);
    return{k:'m'+done+(cur?cur[0]:''),h:`<b>${m.title}</b><i>·</i>`+(cur?`<span class="gb">☐</span> ${cur[1]}`:`<span class="gk">☑</span> All objectives complete`)+`<i>·</i><span class="gn">${done} of ${m.obj.length} done</span>`+(c.status?`<i>·</i><span class="gs">${c.status}</span>`:'')};}
  if(G.battle){let n=0;for(const e of G.ents)if(e.isB&&!e.dead&&e.built>=1&&e.kind!=='garrison'&&e.team>=0&&G.teams[e.team]&&enemy(G.teams[e.team]))n++;
    return{k:'b'+n,h:`<b>Battle</b><i>·</i>Destroy every enemy building <span class="gn">(${n} left)</span>`};}
  return null;}
function cqBanner(){if(!G||!(G.battle||G.camp)||window.LOADING){const o=$('cqBn');if(o&&o.dataset.h){o.dataset.h='';o.innerHTML='';}return;}
  if(G.over){const o=$('cqBn');if(o&&o.dataset.h){o.dataset.h='';o.innerHTML='';}return;}let b=$('cqBn');
  if(!b){if(!$('goalCss')){const st=document.createElement('style');st.id='goalCss';st.textContent=`#cqBn{position:fixed;top:44px;left:50%;transform:translateX(-50%);z-index:55;pointer-events:none;text-align:center;max-width:calc(100vw - 420px);color:#e6e1cc;font:500 13px/1.5 system-ui,sans-serif;letter-spacing:.01em;text-shadow:0 1px 2px #000,0 0 6px rgba(0,0,0,.6)}
#cqBn .gl{display:inline-block;padding:2px 20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;border-radius:3px;background:linear-gradient(90deg,rgba(10,13,10,0),rgba(10,13,10,.62) 18%,rgba(10,13,10,.62) 82%,rgba(10,13,10,0))}
#cqBn b{font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:#d9c48a}#cqBn i{font-style:normal;opacity:.45;margin:0 8px}#cqBn .gn{color:#f3dc8c}#cqBn .gs{color:#ffd77a}#cqBn .gk{color:#9fd36b}#cqBn .gb{opacity:.8}
#cqBn .gl.fl{animation:goalFl 1.3s ease-out}@keyframes goalFl{0%{background-color:rgba(243,220,140,.45);color:#fff}100%{background-color:rgba(243,220,140,0)}}
#cqBn .sl{font-size:11.5px;margin-top:1px}`;document.head.appendChild(st);}
    b=document.createElement('div');b.id='cqBn';document.body.appendChild(b);}
  const g=goalText();if(!g){if(b.dataset.h){b.dataset.h='';b.innerHTML='';}return;}
  if(g.k!==GOAL.key){if(GOAL.key&&GOAL.key[0]===g.k[0])GOAL.fl=performance.now();GOAL.key=g.k;}
  let h=`<div class="gl${performance.now()-GOAL.fl<1300?' fl':''}">${g.h}</div>`;
  if(G.battle){const pw=pwView(),pc=pw.low?'#ff6a55':'#7fe08a',fr=Math.min(1,pw.make/Math.max(1,pw.use,pw.make));h+=`<div id="pwMeter" style="margin-top:3px;display:inline-flex;align-items:center;gap:8px;font:700 12px system-ui,sans-serif;color:${pc};background:rgba(8,12,10,.72);border:1px solid ${pc};border-radius:6px;padding:2px 10px"><span>&#9889; POWER ${pw.make} produced &middot; ${pw.use} used</span><span style="display:inline-block;width:70px;height:7px;background:rgba(255,255,255,.18);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(fr*100)}%;background:${pc}"></i></span>${pw.low?'<span>LOW POWER - build a Generator</span>':''}</div>`;}
  if(!G.camp){const tm=x=>Math.floor(x/60)+':'+String(Math.floor(x%60)).padStart(2,'0');
   for(const T of G.teams){if(T.reb||T.out||!T.sup)continue;const sec=strikeSecs(T);if(sec<0)continue;const mine=ally(T.id,ME);
     h+=`<div class="sl" style="color:${mine?'#bfe8c4':'#ffb4a8'}">${T.F.name} ${UPLINK[T.fac]?UPLINK[T.fac][0]:'missile strike'}: ${sec<=0.5?'READY':'ready in '+tm(sec)}</div>`;}}
  if(b.dataset.h!==h){b.dataset.h=h;b.innerHTML=h;}}
function strikeSecs(T){let f;if(MODE==='client'&&G.sfd)f=G.sfd[T.id];else f=T._upl?100*T.charge/T.sup.charge:-1;if(f==null||f<0)return -1;return (1-f/100)*T.sup.charge/.5;}
setInterval(()=>{try{if(G&&!G.camp)cqBanner();}catch(e){}},400);
