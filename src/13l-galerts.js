// 13l-galerts.js — Lane G: EU4-style alerts bar on the grand map (B2b). Registry: alAdd(id,icon,title,test(code)->{n,tip,go}|null).
// Every later system adds its alert with one alAdd call. Pure read-only UI: no sim state, nothing to checkpoint.
const AL={list:[],max:5};
function alAdd(id,icon,title,test){const i=AL.list.findIndex(a=>a.id===id);const a={id,icon,title,test};if(i>=0)AL.list[i]=a;else AL.list.push(a);}
function alFly(pi){try{if(typeof npClose==='function')npClose();guCentre(pi,2.4);GV.sel=pi;guRedraw();guSide();}catch(e){}}
/* camphud (Abdullah 2026-11-11 19:25): at most AL.max chips, most urgent first; the rest wait behind "+N more".
   Urgency: 0 red = needs you now (the test returned bad:1) · 1 amber = soon · 2 gray = for your information (AL_INFO, or the test returns lv).
   Never color alone: each level also has its own mark (▲ ◆ ●). */
const AL_INFO=['idle','hoard','dev','res','claims','subjects','arms','prop','ldr','elect','estates','un'];
function alLv(a,r){return r.lv!==undefined?r.lv:r.bad?0:AL_INFO.includes(a.id)?2:1;}
function alItems(code){const o=[];AL.list.forEach((a,i)=>{let r=null;try{r=a.test(code);}catch(e){console.error('alert',a.id,e);}if(r&&r.n)o.push({a,r,lv:alLv(a,r),i});});return o.sort((x,y)=>x.lv-y.lv||x.i-y.i);}
function alChip(it){const a=it.a,r=it.r,el=document.createElement('button');el.type='button';el.className='gal l'+it.lv;el.dataset.al=a.id;
  el.title=['Needs you now','Soon','For your information'][it.lv]+': '+a.title+(r.tip?' — '+String(r.tip).replace(/\s*[—-]\s*open (the )?[\w &→]+ tab\b/i,''):'')+'. Click to go there.';
  el.innerHTML='<u>'+['▲','◆','●'][it.lv]+'</u>'+a.icon+' <b>'+r.n+'</b> '+a.title;el.onclick=()=>{if(typeof guPopClose==='function')guPopClose();try{r.go&&r.go();}catch(e){console.error(e);}};return el;}
function alBar(){const t=document.getElementById('gTop');if(!t||!GC||!GC.me)return;let b=document.getElementById('gAlerts');
  if(!b){b=document.createElement('div');b.id='gAlerts';t.insertAdjacentElement('afterend',b);}
  const open=!!document.getElementById('gAlPop');if(open&&typeof guPopClose==='function')guPopClose();
  b.innerHTML='';const items=alItems(GC.me),rest=items.slice(AL.max);for(const it of items.slice(0,AL.max))b.appendChild(alChip(it));
  if(rest.length){const m=document.createElement('button');m.type='button';m.id='gAlMore';m.className='gal';m.dataset.pop='1';m.textContent='+'+rest.length+' more ▾';m.title=rest.length+' more: '+rest.map(it=>it.a.title).join(', ');
    m.onclick=()=>guPop(m,'gAlPop',alItems(GC.me).slice(AL.max).map(it=>({el:alChip(it)})));b.appendChild(m);if(open)m.onclick();}
  if(!items.length){const s=document.createElement('span');s.style.cssText='opacity:.5';s.textContent='Nothing needs you right now.';b.appendChild(s);}}
(function(){
const my=c=>GC.armies.filter(a=>a.o===c&&!a.fl);
alAdd('idle','💤','Idle armies',c=>{const as=my(c).filter(a=>!a.path.length&&a.u.length);return as.length?{n:as.length,tip:'click to jump to the next one',go:()=>{AL.i=((AL.i||0)+1)%as.length;alFly(as[AL.i].at);}}:null;});
alAdd('cash','💸','Losing money',c=>{const N=GC.nat[c];return (N.inc||0)<0||N.cash<0?{n:Math.round(N.inc||0),bad:1,tip:'income is negative — open the economy tab',go:()=>npOpen(c,'eco')}:null;});
alAdd('hoard','💰','Unspent cash',c=>{const N=GC.nat[c];return N.cash>=8000&&(N.inc||0)>=0?{n:Math.floor(N.cash/1000)+'k',tip:'recruit, build or develop',go:()=>npOpen(c,'eco')}:null;});
alAdd('unrest','🔥','Unrest',c=>{const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].un>=60);return ps.length?{n:ps.length,bad:1,tip:'provinces near revolt — lower the tax there',go:()=>alFly(ps[0].i)}:null;});
alAdd('war','⚔','At war',c=>{const w=Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));return w.length?{n:w.length,bad:1,tip:w.map(o=>GCM.nats.get(o).name).join(', '),go:()=>npOpen(c,'dip')}:null;});
alAdd('supply','🚚','Out of supply',c=>{const as=my(c).filter(a=>a.sup);return as.length?{n:as.length,bad:1,tip:'armies cut off from supply',go:()=>alFly(as[0].at)}:null;});
alAdd('shells','🎯','Shells running low',c=>{if(!GC.mil||typeof gmilN!=='function')return null;const Q=gmilN(c),war=Object.keys(GC.war).some(k=>k.split('|').includes(c));
  return war&&Q.sh<=1?{n:1,bad:Q.sh<=0?1:0,tip:(Q.sh<=0?'Out of artillery shells: armies refill ammunition at a quarter of the normal rate':'One shell load left')+' — open Military → Stockpiles',go:()=>{GMILUI.tab='sk';if(document.getElementById('gMil'))gmilUiPanel(true);else gmilUiPanel();}}:null;});
})();
(function(){alAdd('truce','🕊','Truces ending',c=>{const k=Object.keys(GC.tr||{}).filter(x=>x.split('|').includes(c)&&GC.tr[x]===GC.turn+1);return k.length?{n:k.length,tip:'a truce ends next month',go:()=>npOpen(c,'dip')}:null;});})();
