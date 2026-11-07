// 13l-galerts.js — Lane G: EU4-style alerts bar on the grand map (B2b). Registry: alAdd(id,icon,title,test(code)->{n,tip,go}|null).
// Every later system adds its alert with one alAdd call. Pure read-only UI: no sim state, nothing to checkpoint.
const AL={list:[]};
function alAdd(id,icon,title,test){const i=AL.list.findIndex(a=>a.id===id);const a={id,icon,title,test};if(i>=0)AL.list[i]=a;else AL.list.push(a);}
function alFly(pi){try{if(typeof npClose==='function')npClose();guCentre(pi,2.4);GV.sel=pi;guRedraw();guSide();}catch(e){}}
function alBar(){const t=document.getElementById('gTop');if(!t||!GC||!GC.me)return;let b=document.getElementById('gAlerts');
  if(!b){b=document.createElement('div');b.id='gAlerts';b.style.cssText='display:flex;gap:6px;align-items:center;padding:3px 10px;background:#0d1822;border-bottom:1px solid #22384b;min-height:26px;font-size:13px;flex-wrap:wrap';t.insertAdjacentElement('afterend',b);}
  b.innerHTML='';const code=GC.me;let any=0;
  for(const a of AL.list){let r=null;try{r=a.test(code);}catch(e){console.error('alert',a.id,e);}if(!r||!r.n)continue;any++;
    const el=document.createElement('button');el.type='button';el.title=a.title+(r.tip?' — '+r.tip:'');
    el.style.cssText='padding:2px 9px;border-radius:12px;border:1px solid '+(r.bad?'#b5605a':'#c9a35a')+';background:#1a2a3a;color:'+(r.bad?'#ffb3a8':'#ffe6a8')+';cursor:pointer;font-size:13px';
    el.innerHTML=a.icon+' <b>'+r.n+'</b> <span style="opacity:.75">'+a.title+'</span>';el.onclick=()=>{try{r.go&&r.go();}catch(e){console.error(e);}};b.appendChild(el);}
  if(!any){const s=document.createElement('span');s.style.cssText='opacity:.5';s.textContent='Nothing needs you right now.';b.appendChild(s);}}
(function(){
const my=c=>GC.armies.filter(a=>a.o===c&&!a.fl);
alAdd('idle','💤','Idle armies',c=>{const as=my(c).filter(a=>!a.path.length&&a.u.length);return as.length?{n:as.length,tip:'click to jump to the next one',go:()=>{AL.i=((AL.i||0)+1)%as.length;alFly(as[AL.i].at);}}:null;});
alAdd('cash','💸','Losing money',c=>{const N=GC.nat[c];return (N.inc||0)<0||N.cash<0?{n:Math.round(N.inc||0),bad:1,tip:'income is negative — open the economy tab',go:()=>npOpen(c,'eco')}:null;});
alAdd('hoard','💰','Unspent cash',c=>{const N=GC.nat[c];return N.cash>=8000&&(N.inc||0)>=0?{n:Math.floor(N.cash/1000)+'k',tip:'recruit, build or develop',go:()=>npOpen(c,'eco')}:null;});
alAdd('unrest','🔥','Unrest',c=>{const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].un>=60);return ps.length?{n:ps.length,bad:1,tip:'provinces near revolt — lower the tax there',go:()=>alFly(ps[0].i)}:null;});
alAdd('war','⚔','At war',c=>{const w=Object.keys(GC.nat).filter(o=>o!==c&&!GC.nat[o].dead&&grAtWar(c,o));return w.length?{n:w.length,bad:1,tip:w.map(o=>GCM.nats.get(o).name).join(', '),go:()=>npOpen(c,'dip')}:null;});
alAdd('supply','🚚','Out of supply',c=>{const as=my(c).filter(a=>a.sup);return as.length?{n:as.length,bad:1,tip:'armies cut off from supply',go:()=>alFly(as[0].at)}:null;});
})();
(function(){alAdd('truce','🕊','Truces ending',c=>{const k=Object.keys(GC.tr||{}).filter(x=>x.split('|').includes(c)&&GC.tr[x]===GC.turn+1);return k.length?{n:k.length,tip:'a truce ends next month',go:()=>npOpen(c,'dip')}:null;});})();
