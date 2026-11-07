// EU4-style ALERTS BAR (lane G, B2b). A row of small icons in the grand top bar that light up when something needs you; click = jump to it.
// Every later system adds its alert with ONE call:  galertAdd(id, icon, label, fn)  where fn(code) returns null (nothing) or
//   {n:count, tip:'text', pis:[province indexes to cycle through], tab:'dip' (open that nation-panel tab), go:()=>{} (custom click)}.
const GALERTS=[];let GALERT_I={};
function galertAdd(id,icon,label,fn){const i=GALERTS.findIndex(a=>a.id===id);const a={id,icon,label,fn};if(i>=0)GALERTS[i]=a;else GALERTS.push(a);}
function galertJump(pi){try{GV.sel=pi;guCentre(pi,2.4);guRedraw();guSide();}catch(e){}}
function galertsTop(t){if(!GC||!GC.me||!GC.nat[GC.me])return;const code=GC.me;const box=guEl('span','display:flex;gap:3px;align-items:center');box.id='gAlerts';
  for(const a of GALERTS){let r=null;try{r=a.fn(code);}catch(e){console.error('galert',a.id,e);}if(!r||!r.n)continue;
    const b=guEl('button','position:relative;padding:3px 7px;border-radius:5px;border:1px solid '+(r.bad?'#c4574a':'#c9a35a')+';background:#1c2b3b;color:#ffe6a8;cursor:pointer;font-size:15px;line-height:1.1',a.icon+'<span style="font-size:11px;margin-left:3px;opacity:.9">'+(r.n>1?r.n:'')+'</span>');
    b.type='button';b.title=a.label+(r.tip?' — '+r.tip:'');b.dataset.alert=a.id;
    b.onclick=()=>{if(r.go){r.go();return;}if(r.pis&&r.pis.length){const k=(GALERT_I[a.id]=((GALERT_I[a.id]|0)+1)%r.pis.length);galertJump(r.pis[k]);}if(r.tab&&typeof npOpen==='function')npOpen(code,r.tab);};
    box.appendChild(b);}
  if(box.children.length)t.appendChild(box);}
// --- the first alerts (read-only on the sim; deterministic) ---
galertAdd('idle','🪖','Idle armies',c=>{const as=GC.armies.filter(a=>a.o===c&&!a.path.length&&a.u.length&&!a.sup);return as.length?{n:as.length,tip:as.length+' armies have no orders — click to cycle',pis:as.map(a=>a.at)}:null;});
galertAdd('cash','💸','Money',c=>{const N=GC.nat[c];if((N.cash||0)<0||(N.inc||0)<-50)return {n:1,bad:1,tip:(N.cash<0?'in debt':'income $'+Math.round(N.inc)+'/turn'),tab:'eco'};
  if(N.cash>=6000&&(N.inc||0)>=0)return {n:1,tip:'$'+Math.round(N.cash).toLocaleString()+' unspent — raise armies or build',tab:'eco'};return null;});
galertAdd('unrest','🔥','Unrest',c=>{const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].un>=60).map(p=>p.i);return ps.length?{n:ps.length,bad:1,tip:ps.length+' provinces near revolt',pis:ps}:null;});
galertAdd('supply','⛽','Out of supply',c=>{const as=GC.armies.filter(a=>a.o===c&&a.sup);return as.length?{n:as.length,bad:1,tip:as.length+' armies cut off',pis:as.map(a=>a.at)}:null;});
galertAdd('war','⚔','At war',c=>{let n=0;for(const o of Object.keys(GC.nat))if(o!==c&&!GC.nat[o].dead&&grAtWar(c,o))n++;return n?{n,tip:'at war with '+n+' nations',tab:'dip'}:null;});
galertAdd('front','🛡','Empty frontier',c=>{const ps=GCM.P.filter(p=>{if(!p.land||GC.prov[p.i].o!==c||GC.prov[p.i].gar.length)return false;return p.adj.some(j=>GCM.P[j]&&GCM.P[j].land&&GC.prov[j].o!==c&&grAtWar(c,GC.prov[j].o))&&!GC.armies.some(a=>a.at===p.i&&a.o===c);}).map(p=>p.i);return ps.length?{n:ps.length,bad:1,tip:ps.length+' border provinces facing the enemy with no garrison or army',pis:ps}:null;});
