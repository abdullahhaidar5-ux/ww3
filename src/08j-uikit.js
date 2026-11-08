// ===== In-game UI kit (ingameui 2026-11-07, Abdullah 12:06 "Menus in game need to be much more intuitive and professional").
// ONE set of in-game components, styled like the redesigned main menu (Saira Condensed headers, gold accent, quiet panels):
// UK.tabs (text tab bar, one pane shown), UK.chip (icon + number), UK.sec (small caps header), UK.card (icon card with
// name/count/cost/time, disabled reason on hover), UK.seg (segmented choice), UK.tip (the one tooltip style, see slice 4).
// Used by: grand-map province panel (13c guSide), battle command panel, pause menu. Extend here, never add a second kit.
const UK=(function(){
const E=(t,c,x)=>{const d=document.createElement(t);if(c)d.className=c;if(x!=null)d.textContent=x;return d;};
const st=E('style');st.id='ukCss';st.textContent=`
.uk{font:14px/1.4 var(--mono,monospace);color:#e6e2d6}
.uk-hd{display:flex;align-items:center;gap:10px;margin:0 0 6px}
.uk-hd canvas{width:36px;height:24px;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.35),0 2px 6px rgba(0,0,0,.5);flex:none}
.uk-hd h2{margin:0;font:600 24px/1 var(--display,sans-serif);letter-spacing:.02em;color:#f2ead2}
.uk-sub{font-size:13px;color:#a9b4bd;margin-top:2px}
.uk-badge{display:inline-block;font:600 11px/1 var(--display,sans-serif);letter-spacing:.12em;text-transform:uppercase;padding:3px 6px;border-radius:3px;border:1px solid #e3b341;color:#e3b341;margin-left:6px;vertical-align:1px}
.uk-badge.red{border-color:#e07a68;color:#ff9d8e}
.uk-chips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 10px}
.uk-chip{display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;background:#0c1620;border:1px solid #23384b;font-size:13px;cursor:default}
.uk-chip i{font-style:normal;opacity:.9}.uk-chip b{color:#f2ead2;font-weight:600}.uk-chip.warn b{color:#ff9d8e}.uk-chip.good b{color:#9ee07a}
.uk-tabs{display:flex;gap:2px;border-bottom:1px solid #2c4358;margin:4px 0 10px}
.uk-tab{flex:1;background:none;border:0;border-bottom:2px solid transparent;color:#8fa2b2;font:600 15px/1 var(--display,sans-serif);letter-spacing:.05em;white-space:nowrap;text-transform:uppercase;padding:8px 2px 7px;cursor:pointer;transition:color .15s,border-color .15s}
.uk-tab:hover{color:#e6e2d6}.uk-tab.on{color:#e3b341;border-bottom-color:#e3b341}
.uk-tab sup{font:600 10px var(--mono,monospace);color:#e3b341;margin-left:3px;letter-spacing:0}
.uk-pane{display:none}.uk-pane.on{display:block;animation:ukIn .18s ease-out}
@keyframes ukIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.uk-sec{font:600 12px/1 var(--display,sans-serif);letter-spacing:.16em;text-transform:uppercase;color:#8fa2b2;margin:12px 0 6px;display:flex;justify-content:space-between;align-items:baseline;gap:6px}
.uk-sec:first-child{margin-top:2px}.uk-sec span{font:12px var(--mono,monospace);letter-spacing:0;text-transform:none;color:#a9b4bd}
.uk-note{font-size:13px;color:#a9b4bd;margin:4px 0}
.uk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.uk-list{display:grid;grid-template-columns:1fr;gap:5px}
.uk-list .uk-card .ic{width:52px;height:38px}.uk-list .uk-card .mt{padding-right:0}.uk-list .uk-card .ct{top:50%;transform:translateY(-50%);right:34px;font-size:14px}
.uk-card{position:relative;display:flex;gap:8px;align-items:center;text-align:left;padding:6px;border-radius:5px;background:linear-gradient(#162636,#111d29);border:1px solid #2a4157;color:#e6e2d6;cursor:pointer;font:inherit;min-width:0;transition:border-color .12s,background .12s,transform .12s}
.uk-card:hover{border-color:#e3b341;background:linear-gradient(#1c3044,#14222f)}.uk-card:active{transform:translateY(1px)}
.uk-card.off{opacity:.5;cursor:not-allowed;filter:grayscale(.6)}.uk-card.off:hover{border-color:#2a4157}
.uk-card.sel{border-color:#e3b341;box-shadow:inset 0 0 0 1px #e3b341}
.uk-card .ic{flex:none;width:44px;height:34px;border-radius:3px;display:flex;align-items:center;justify-content:center;font:700 16px var(--display,sans-serif);overflow:hidden}
.uk-card .ic canvas{width:100%;height:100%}
.uk-card .tx{min-width:0;flex:1}.uk-card .nm{font:600 15px/1.1 var(--display,sans-serif);letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uk-card .mt{padding-right:20px;font-size:12px;color:#a9b4bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.uk-card .mt b{color:#e3b341;font-weight:600}
.uk-card .ct{position:absolute;top:3px;right:5px;font:600 12px var(--mono,monospace);color:#e3b341}
.uk-list .uk-card .rp{top:50%;bottom:auto;transform:translateY(-50%);font-size:15px;padding:2px 6px}
.uk-card .rp{position:absolute;bottom:3px;right:4px;font-size:12px;padding:0 4px;border-radius:3px;color:#8fa2b2;border:1px solid transparent}
.uk-card .rp:hover{color:#fff;border-color:#4a6580}.uk-card .rp.on{color:#e3b341;border-color:#e3b341}
.uk-seg{display:flex;border:1px solid #2c4358;border-radius:5px;overflow:hidden}
.uk-seg button{flex:1;background:#101c28;border:0;border-right:1px solid #2c4358;color:#a9b4bd;font:600 14px/1 var(--display,sans-serif);letter-spacing:.06em;padding:7px 4px;cursor:pointer}
.uk-seg button:last-child{border-right:0}.uk-seg button:hover{color:#fff}.uk-seg button.on{background:#3a3418;color:#f2d27a}
.uk-link{background:none;border:0;padding:4px 0;color:#e3b341;font:600 14px var(--display,sans-serif);letter-spacing:.06em;cursor:pointer;text-transform:uppercase}
.uk-link:hover{color:#ffe08a;text-decoration:underline}.uk-link.dim{color:#8fa2b2}
.uk-acts{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px}
.uk-q{font-size:12px;color:#c9c3b0;margin-top:6px;padding:5px 7px;border-left:2px solid #e3b341;background:#0c1620}
/* battle command panel (slice 2): silhouette icon cards, selected-unit card */
#panel .btn.hasic{padding-left:47px!important}
#panel .btn .uic{position:absolute;left:4px;top:50%;transform:translateY(-50%);width:38px;height:30px;border-radius:2px;background:linear-gradient(180deg,#36473d,#141b17);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
#panel .btn.on .uic{box-shadow:inset 0 0 0 1px var(--accent,#e3b341)}
#info .ukU{display:flex;gap:9px;align-items:center;margin:0 0 4px}
#info .ukU img{width:52px;height:40px;flex:none;border-radius:3px;background:linear-gradient(180deg,#36473d,#141b17);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
#info .ukUt{min-width:0;flex:1}#info .ukUt b{display:block;font:600 16px/1.1 var(--display,sans-serif)}
#info .ukHp{display:block;height:5px;background:#0008;border-radius:2px;margin:3px 0 2px;overflow:hidden}#info .ukHp b{display:block;height:100%}
#info .ukV{font:600 11px var(--display,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#e3b341)}
#info .ukG{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 4px}#info .ukG span{position:relative}#info .ukG img{width:40px;height:30px;border-radius:2px;background:linear-gradient(180deg,#36473d,#141b17)}
#info .ukG em{position:absolute;right:2px;bottom:0;font:600 11px var(--mono,monospace);font-style:normal;color:#fff;text-shadow:0 1px 2px #000}
#ukTip{position:fixed;z-index:99990;pointer-events:none;max-width:320px;background:rgba(14,19,17,.97);border:1px solid #4a5a52;border-left:3px solid var(--accent,#e3b341);border-radius:2px;padding:8px 10px;color:#e6e2d6;font:13px/1.4 var(--mono,monospace);box-shadow:0 8px 24px rgba(0,0,0,.55);opacity:0;transition:opacity .12s}
#ukTip.on{opacity:1}#ukTip .t{font:700 15px/1.15 var(--display,sans-serif);letter-spacing:.02em;color:#f2ead2;margin-bottom:3px}
#ukTip .d{color:#b9c2c9}#ukTip .r{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #23384b;margin-top:5px;padding-top:4px;color:#e3b341}
#ukTip .w{color:#ff9d8e;margin-top:4px}
`;
(document.head||document.documentElement).appendChild(st);
function drawUnit(c,k,W,H,col){c.save();c.translate(W/2,H/2);const s=Math.min(W/100,H/76);c.scale(s,s);
  c.fillStyle='#e9e4d4';c.strokeStyle='#e9e4d4';c.lineWidth=3;const cx=0,cy=0;
  if(k==='tank'||/tank|mbt|ifv|apc|veh/.test(k)){c.fillRect(cx-26,cy+4,52,12);c.beginPath();c.ellipse(cx,cy+2,15,9,0,0,7);c.fill();c.fillRect(cx,cy-1,32,4);c.fillStyle='#0008';for(let i=-22;i<=22;i+=11){c.beginPath();c.arc(cx+i,cy+11,4,0,7);c.fill();}}
  else if(k==='arty'||/arty|mlrs|how/.test(k)){c.beginPath();c.moveTo(cx-22,cy+14);c.lineTo(cx+22,cy-14);c.lineWidth=7;c.stroke();c.lineWidth=3;c.beginPath();c.arc(cx-8,cy+14,8,0,7);c.stroke();}
  else if(k==='aa'){c.lineWidth=5;c.beginPath();c.moveTo(cx-6,cy+12);c.lineTo(cx-14,cy-18);c.moveTo(cx+6,cy+12);c.lineTo(cx+14,cy-18);c.stroke();c.fillRect(cx-16,cy+10,32,8);}
  else if(k==='heli'||/heli|chop/.test(k)){c.beginPath();c.ellipse(cx,cy+3,14,8,0,0,7);c.fill();c.fillRect(cx+10,cy+1,22,3);c.fillRect(cx-26,cy-12,52,3);c.fillRect(cx-1,cy-10,3,8);}
  else if(/jet|airlift|plane|bomb/.test(k)){c.beginPath();c.moveTo(cx+30,cy);c.lineTo(cx-22,cy-4);c.lineTo(cx-22,cy+4);c.closePath();c.fill();c.beginPath();c.moveTo(cx+4,cy);c.lineTo(cx-10,cy-22);c.lineTo(cx-16,cy-22);c.lineTo(cx-8,cy);c.lineTo(cx-16,cy+22);c.lineTo(cx-10,cy+22);c.closePath();c.fill();c.fillRect(cx-26,cy-9,6,18);}
  else if(/boat|fast|ship|sub|lander|minel|sweep|carrier/.test(k)){c.beginPath();c.moveTo(cx-30,cy+4);c.lineTo(cx+30,cy+4);c.lineTo(cx+22,cy+14);c.lineTo(cx-26,cy+14);c.closePath();c.fill();if(k!=='sub'){c.fillRect(cx-8,cy-8,16,12);c.fillRect(cx-2,cy-18,3,10);}else{c.fillRect(cx-4,cy-4,10,8);}}
  else if(/harv|truck|supply|dozer/.test(k)){c.fillRect(cx-24,cy-8,30,18);c.fillRect(cx+8,cy-2,16,12);c.fillStyle='#0008';for(const i of [-16,0,16]){c.beginPath();c.arc(cx+i,cy+13,5,0,7);c.fill();}if(k==='dozer'){c.fillStyle='#e9e4d4';c.fillRect(cx+24,cy-4,5,16);}}
  else if(/drone|uav|shahed|lancet|loiter|fpv|quad|mq|tb2|delta/.test(k)){/* one-way attack drone: delta wing with a nose cone and twin wingtip fins */c.beginPath();c.moveTo(cx+30,cy);c.lineTo(cx-20,cy-24);c.lineTo(cx-14,cy);c.lineTo(cx-20,cy+24);c.closePath();c.fill();c.fillRect(cx-24,cy-3,50,6);c.beginPath();c.arc(cx+28,cy,4,0,7);c.fill();c.fillRect(cx-22,cy-27,5,8);c.fillRect(cx-22,cy+19,5,8);c.fillStyle='#0008';c.fillRect(cx-28,cy-4,5,8);}
  else if(k==='medic'){c.fillRect(cx-5,cy-16,10,32);c.fillRect(cx-16,cy-5,32,10);}
  else if(k==='champ'||k==='cleric'){c.beginPath();for(let i=0;i<10;i++){const r=i%2?8:20,a=-Math.PI/2+i*Math.PI/5;c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}c.closePath();c.fill();}
  else{c.beginPath();c.arc(cx,cy-9,8,0,7);c.fill();c.beginPath();c.arc(cx,cy-12,10,3.14,6.28);c.fillStyle=col;c.fill();c.fillStyle='#e9e4d4';c.beginPath();c.moveTo(cx-18,cy+20);c.quadraticCurveTo(cx-18,cy+2,cx,cy+2);c.quadraticCurveTo(cx+18,cy+2,cx+18,cy+20);c.fill();if(k==='at'){c.fillRect(cx+8,cy-4,26,5);}}
  c.restore();}
/* building silhouettes for the battle BUILD tab (same hand as drawUnit) */
function drawBld(c,k,W,H){c.save();c.translate(W/2,H/2);const s=Math.min(W/100,H/76);c.scale(s,s);c.fillStyle='#e9e4d4';c.strokeStyle='#e9e4d4';c.lineWidth=3;
  if(/factory/.test(k)){c.beginPath();c.moveTo(-28,16);for(let i=0;i<3;i++){c.lineTo(-28+i*16,-2);c.lineTo(-12+i*16,-10);c.lineTo(-12+i*16,-2);}c.lineTo(22,16);c.closePath();c.fill();c.fillRect(22,-22,7,38);}
  else if(/airfield/.test(k)){c.fillRect(-30,10,60,6);c.fillRect(-6,-16,10,26);c.fillRect(-12,-24,22,9);}
  else if(/shipyard|coast/.test(k)){c.fillRect(-28,8,56,8);c.fillRect(-18,-22,5,30);c.fillRect(-18,-22,34,4);c.fillRect(12,-18,2,16);}
  else if(/depot/.test(k)){for(const [x,y] of [[-22,0],[-4,0],[14,0],[-13,-16],[5,-16]])c.fillRect(x,y,15,14);}
  else if(/econ|oil/.test(k)){c.beginPath();c.moveTo(-16,16);c.lineTo(0,-24);c.lineTo(16,16);c.stroke();c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.moveTo(-6,-10);c.lineTo(6,-10);c.stroke();c.fillRect(-20,14,40,4);}
  else if(/turret|gun|sam|battery|missile/.test(k)){c.fillRect(-20,4,40,12);c.beginPath();c.arc(0,4,11,Math.PI,0);c.fill();c.lineWidth=5;c.beginPath();c.moveTo(4,-2);c.lineTo(28,-16);c.stroke();}
  else if(/tunnel/.test(k)){c.beginPath();c.moveTo(-26,16);c.lineTo(-26,0);c.arc(0,0,26,Math.PI,0);c.lineTo(26,16);c.closePath();c.fill();c.fillStyle='#101a24';c.beginPath();c.moveTo(-12,16);c.lineTo(-12,2);c.arc(0,2,12,Math.PI,0);c.lineTo(12,16);c.fill();}
  else if(/fort/.test(k)){c.beginPath();c.moveTo(-28,16);c.lineTo(-22,-6);c.lineTo(22,-6);c.lineTo(28,16);c.closePath();c.fill();c.fillStyle='#101a24';c.fillRect(-14,0,28,4);}
  else if(/radio|uplink/.test(k)){c.beginPath();c.moveTo(-12,16);c.lineTo(0,-24);c.lineTo(12,16);c.stroke();c.beginPath();c.arc(0,-24,6,0,7);c.stroke();c.beginPath();c.arc(0,-24,13,-.9,.9);c.stroke();}
  else if(/hq/.test(k)){c.fillRect(-28,-2,56,18);c.fillRect(-12,-14,24,12);c.fillRect(10,-30,2,18);c.fillRect(12,-30,12,7);}
  else{c.fillRect(-26,-4,52,20);c.beginPath();c.moveTo(-30,-4);c.lineTo(0,-20);c.lineTo(30,-4);c.closePath();c.fill();}
  c.restore();}
function tabs(host,list,cur,onPick){const bar=E('div','uk-tabs'),panes={};let pick=list.some(t=>t[0]===cur)?cur:list[0][0];
  for(const [k,label,badge] of list){const b=E('button','uk-tab'+(k===pick?' on':''),label);b.type='button';b.dataset.pt=k;if(badge){const s=E('sup','',String(badge));b.appendChild(s);}
    b.onclick=()=>{bar.querySelectorAll('.uk-tab').forEach(x=>x.classList.toggle('on',x===b));for(const q in panes)panes[q].classList.toggle('on',q===k);if(onPick)onPick(k);};bar.appendChild(b);
    panes[k]=E('div','uk-pane'+(k===pick?' on':''));panes[k].dataset.pane=k;}
  host.appendChild(bar);for(const [k] of list)host.appendChild(panes[k]);return panes;}
function chip(icon,val,label,tone){const c=E('span','uk-chip'+(tone?' '+tone:''));c.innerHTML='<i>'+icon+'</i><b></b>';c.querySelector('b').textContent=val;if(label)c.dataset.tt=label;return c;}
function sec(title,right){const d=E('div','uk-sec',title);if(right!=null){const s=E('span','',right);d.appendChild(s);}return d;}
function card(o){const b=E('button','uk-card'+(o.on===false?' off':'')+(o.sel?' sel':''));b.type='button';const ic=E('div','ic');
  if(o.icon instanceof HTMLElement)ic.appendChild(o.icon);else{ic.textContent=o.icon||'';ic.style.background=(o.col||'#4a6580')+'33';ic.style.border='1px solid '+(o.col||'#4a6580');ic.style.color=o.col||'#e6e2d6';}
  b.appendChild(ic);const tx=E('div','tx');tx.appendChild(E('div','nm',o.name));const mt=E('div','mt');mt.innerHTML=o.meta||'';tx.appendChild(mt);b.appendChild(tx);
  if(o.count)b.appendChild(E('span','ct',o.count));
  b.dataset.tt=JSON.stringify({t:o.name,d:o.desc||'',r:o.rows||[],w:o.on===false?(o.why||''):''});
  b.onclick=e=>{if(e.target.classList.contains('rp'))return;if(o.on===false){if(o.onDenied)o.onDenied();return;}if(o.onclick)o.onclick();};return b;}
function seg(names,cur,fn,tips){const s=E('div','uk-seg');names.forEach((n,i)=>{const b=E('button',i===cur?'on':'',n);b.type='button';if(tips&&tips[i])b.dataset.tt=tips[i];b.onclick=()=>fn(i);s.appendChild(b);});return s;}
function link(t,fn,tip,dim){const b=E('button','uk-link'+(dim?' dim':''),t);b.type='button';if(tip)b.dataset.tt=tip;b.onclick=fn;return b;}
/* ---- the one tooltip: any element with data-tt (plain text or JSON {t,d,r:[[k,v]],w}) or a title attribute inside game UI ---- */
const icC={};function icon(k,col,bld){const key=k+'|'+col+'|'+(bld?1:0);let u=icC[key];if(!u){const cv=document.createElement('canvas');cv.width=104;cv.height=80;const x=cv.getContext('2d');try{if(bld)drawBld(x,k,104,80);else drawUnit(x,k,104,80,col||'#7a8a6a');}catch(e){}u=icC[key]=cv.toDataURL();}const im=document.createElement('img');im.src=u;im.alt='';return im;}
let tipEl=null,tipFor=null;
function tipShow(el,x,y){let raw=el.dataset.tt;if(raw==null)return;let o;if(raw[0]==='{'){try{o=JSON.parse(raw);}catch(e){o={d:raw};}}else{const L=raw.split(/\n| — | - (?=[A-Z])/);o=L.length>1&&L[0].length<40?{t:L[0],d:L.slice(1).join(' ')}:{d:raw};}
  if(!o.t&&!o.d)return;if(!tipEl){tipEl=E('div');tipEl.id='ukTip';document.body.appendChild(tipEl);}
  tipEl.innerHTML='';if(o.t)tipEl.appendChild(E('div','t',o.t));if(o.d)tipEl.appendChild(E('div','d',o.d));for(const r of (o.r||[])){const d=E('div','r');d.appendChild(E('span','',r[0]));d.appendChild(E('b','',String(r[1])));tipEl.appendChild(d);}if(o.w)tipEl.appendChild(E('div','w',o.w));
  tipFor=el;tipMove(x,y);tipEl.classList.add('on');}
function tipMove(x,y){if(!tipEl)return;const w=tipEl.offsetWidth,h=tipEl.offsetHeight;let L=x+16,T=y+18;if(L+w>innerWidth-6)L=x-w-12;if(T+h>innerHeight-6)T=y-h-12;tipEl.style.left=Math.max(4,L)+'px';tipEl.style.top=Math.max(4,T)+'px';}
function tipHide(){tipFor=null;if(tipEl)tipEl.classList.remove('on');}
function tipAt(t){for(let e=t,i=0;e&&e!==document.body&&i<6;e=e.parentElement,i++){if(e.nodeType!==1)continue;   /* a fresh title (code may rewrite it) wins over an older converted one */
    if(e.title&&typeof e.title==='string'){e.dataset.tt=e.title;e.removeAttribute('title');return e;}if(e.dataset&&e.dataset.tt!=null)return e;}return null;}
document.addEventListener('mouseover',e=>{const el=tipAt(e.target);if(!el){if(tipFor)tipHide();return;}if(el!==tipFor)tipShow(el,e.clientX,e.clientY);},true);
document.addEventListener('mousemove',e=>{if(tipFor){if(!tipFor.isConnected)tipHide();else if(tipFor.title){const el=tipFor;tipFor=null;tipAt(el);tipShow(el,e.clientX,e.clientY);}else tipMove(e.clientX,e.clientY);}},{passive:true});
document.addEventListener('mousedown',()=>tipHide(),true);
return {E,drawUnit,drawBld,icon,tabs,chip,sec,card,seg,link,tipHide};
})();
/* ===== ingameui slice 3: pause menu = one centred panel with a vertical text menu; Settings in tabs; Esc = one step back ===== */
(function(){const $$=id=>document.getElementById(id);
  const st=document.createElement('style');st.textContent=`
#pauseOv.ukP{display:flex;align-items:center;justify-content:center}#pauseOv[hidden]{display:none!important}
#pauseOv.ukP .card{width:min(380px,92vw);padding:26px 30px 22px;background:linear-gradient(180deg,rgba(24,31,27,.97),rgba(14,19,17,.97));border:1px solid #3d4d44;border-top:2px solid var(--accent,#e3b341);box-shadow:0 18px 50px rgba(0,0,0,.6);text-align:left;animation:ukIn .2s ease-out}
#pauseOv.ukP h1{font:600 34px/1 var(--display,sans-serif);letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px;color:#f2ead2}
#pauseOv.ukP #pauseSub{font:13px/1.45 var(--mono,monospace);color:var(--dim,#8a9a92);margin:0 0 16px}
#pauseOv.ukP .ukMenu{display:flex;flex-direction:column;border-top:1px solid #2c3833}
#pauseOv.ukP .ukMenu button{all:unset;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;width:100%;padding:11px 4px;border-bottom:1px solid #2c3833;font:600 19px/1 var(--display,sans-serif);letter-spacing:.08em;text-transform:uppercase;color:#cfd8d2;cursor:pointer;transition:color .12s,padding .12s,background .12s}
#pauseOv.ukP .ukMenu button::after{content:'›';opacity:0;color:var(--accent,#e3b341);transition:opacity .12s}
#pauseOv.ukP .ukMenu button:hover,#pauseOv.ukP .ukMenu button:focus-visible{color:var(--accent,#e3b341);padding-left:10px;background:rgba(227,179,65,.05)}#pauseOv.ukP .ukMenu button:hover::after{opacity:1}
#pauseOv.ukP .ukMenu button.pri{color:var(--accent,#e3b341)}#pauseOv.ukP .ukMenu button.dng{color:#d99a8e}#pauseOv.ukP .ukMenu button[hidden]{display:none}
#pauseOv.ukP .ukMenu .gap{height:10px;border-bottom:1px solid #2c3833}
#pauseOv.ukP .ukKeys{margin-top:12px;font:12px var(--mono,monospace);color:var(--dim,#8a9a92)}
#settings .uk-tabs{margin:2px 0 12px}#settings .uk-tab{font-size:16px}
#settings .uk-pane .label:first-child{margin-top:0}
#settings .uk-pane .sethd{display:none}`;document.head.appendChild(st);
  function pauseInstall(){const ov=$$('pauseOv');if(!ov||ov.classList.contains('ukP'))return;const card=ov.querySelector('.card'),row=card&&card.querySelector('.row');if(!row)return;ov.classList.add('ukP');
    const m=document.createElement('nav');m.className='ukMenu';m.setAttribute('role','menu');const add=(b,cls)=>{if(!b)return;b.className=cls||'';b.setAttribute('role','menuitem');m.append(b);};
    const mk=(id,t,fn,tip)=>{const b=document.createElement('button');b.type='button';b.id=id;b.textContent=t;b.onclick=fn;if(tip)b.dataset.tt=tip;return b;};
    add($$('resumeBtn'),'pri');
    add(mk('pSettings','Settings',()=>{try{openSettings();}catch(e){}},'Graphics, sound, mouse and gameplay options'));
    add($$('svSave'));
    add(mk('pLoad','Load game',()=>{try{svLoadDialog();}catch(e){}},'Load a saved battle'));
    add(mk('pEnc','Encyclopedia',()=>{try{encOpen();}catch(e){}},'Every unit, building and nation, with counters'));
    const g=document.createElement('div');g.className='gap';m.append(g);
    add($$('pRestart'));const q=$$('pQuit');if(q){q.textContent='Quit to menu';add(q,'dng');}
    row.replaceWith(m);const k=document.createElement('div');k.className='ukKeys';k.textContent='Esc or P — resume';card.append(k);}
  /* Settings: one tab per job (Gameplay · Controls · Graphics · Audio); rows keep their ids and handlers, only move into panes */
  const SET_TAB=[['aud',/^(sMus|sTrk|myF|myN|myNx|sFx|sVo)/,/music|soundtrack|volume|voice|radio chatter|sound/i],['gfx',/^(sGfx|sFps|sHp)/,/graphic|quality|frame-rate|shadow|resolution|painterly|bloom|\bfps\b|health bar/i],['ctl',/^(sScr|sZm|sInv|sDbl|sTol|sMmc|sMpan|sEdge|sM[A-Z])/,/mouse|scroll|zoom|click|cursor|hotkey|keyboard|camera|drag/i]];
  function setTabs(){const body=$$('setBody');if(!body)return;let P=body._ukP;
    if(!P){const h1=body.querySelector('h1');const host=document.createElement('div');P=body._ukP=UK.tabs(host,[['game','Gameplay'],['ctl','Controls'],['gfx','Graphics'],['aud','Audio']],(UK._setTab||'gfx'),k=>{UK._setTab=k;});
      const kids=[...host.childNodes];if(h1)h1.after(...kids);else body.prepend(...kids);body._ukBar=kids[0];}
    const panes=new Set(Object.values(P));let cur=null;
    for(const el of [...body.children]){if(el===body._ukBar||panes.has(el)||el.tagName==='H1')continue;
      if(el.classList.contains('sethd')){el.remove();continue;}
      if(el.classList.contains('label')||el.id==='relayBox'||!cur){const nid=el.nextElementSibling?el.nextElementSibling.id||'':'',tx=el.textContent||'';const r=SET_TAB.find(t=>t[1].test(el.id)||t[1].test(nid))||SET_TAB.find(t=>t[2].test(tx));cur=P[r?r[0]:'game'];if(el.id==='relayBox')cur=P.game;}
      cur.append(el);}
    for(const k in P){const b=body._ukBar.querySelector('[data-pt="'+k+'"]');if(b)b.hidden=!P[k].children.length;}}
  try{pauseInstall();}catch(e){console.warn('ukPause',e);}
  try{const o=openSettings;openSettings=function(){o.apply(this,arguments);try{setTabs();}catch(e){console.warn('ukSet',e);}};const b1=$$('openSettings'),b2=$$('aSet');if(b1)b1.onclick=openSettings;if(b2)b2.onclick=openSettings;}catch(e){}
  /* Esc steps back one window: Settings → (pause menu / main menu) */
  addEventListener('keydown',e=>{if(e.key!=='Escape')return;const s=$$('settings');if(s&&!s.hidden){e.preventDefault();e.stopImmediatePropagation();s.hidden=true;}},true);
})();
