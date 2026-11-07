// 13zx-gtv.js — Lane G RG5: TV news broadcasts. Presentation only: a lower-third "broadcast" card after the turn for the
// biggest story of the month. Fed by GC.log (the one event engine writes there through grLog: world events, war, capitals,
// peace, revolts, pacts). Nothing is saved. Fictional channels and fictional anchors only — no real networks or people.
const GTV_CH=[{n:'Meridian 24',c:'#b8322a'},{n:'Global Eye',c:'#1f6fb2'},{n:'Horizon News',c:'#2e8b57'},{n:'Continental Wire',c:'#6f4fa0'},{n:'Northstar TV',c:'#c27a12'}];
const GTV_AN=['Mara Lind','Tomas Verhoeven','Ines Kalder','Samir Dorn','Yuki Tanabe','Ada Okafor','Lukas Brandt','Priya Venkat'];
const GTV_BIG=/declared war|capital|eliminated|peace|nuclear|coup|revolt|captured|WORLD:|pact|alliance|guarantee/i;
const GTV_HOT=/declared war|capital|eliminated|nuclear|coup/i;
let GTV_LAST=-1;
// the month's biggest story: world events weigh most, then our own nation's news, then anything hot (war, capitals, nukes)
function gtvPick(){if(!GC||!GC.log)return null;const T=GC.turn-1;let best=null,bw=-1;
  for(const l of GC.log){if(l[0]!==T||!(l[2]===''||GTV_BIG.test(l[1])))continue;
    const w=(l[2]===''?3:0)+(l[2]===GC.me?4:0)+(GTV_HOT.test(l[1])?5:0)+(/WORLD:/.test(l[1])?2:0);if(w>bw){bw=w;best=l;}}
  return best;}
function gtvShow(){if(!GC||!GC.me||GTV_LAST===GC.turn)return;const b=gtvPick();if(!b)return;GTV_LAST=GC.turn;
  const host=document.getElementById('gMapWrap');if(!host)return;let old=document.getElementById('gTV');if(old)old.remove();
  const seed=GC.seed|0,ch=GTV_CH[(seed+GC.turn)%GTV_CH.length],an=GTV_AN[(seed*7+GC.turn*3)%GTV_AN.length];
  const hot=GTV_HOT.test(b[1]);const d=document.createElement('div');d.id='gTV';
  d.style.cssText='position:absolute;left:0;right:0;bottom:0;display:flex;align-items:stretch;height:66px;background:rgba(14,18,26,.94);border-top:3px solid '+ch.c+';box-shadow:0 -6px 18px rgba(0,0,0,.45);color:#f4f1ea;font:15px system-ui,sans-serif;z-index:6;cursor:pointer;transform:translateY(20px);opacity:0;transition:opacity .4s,transform .4s';
  const tag=document.createElement('div');tag.style.cssText='background:'+ch.c+';color:#fff;min-width:150px;display:flex;flex-direction:column;justify-content:center;padding:0 14px;font-weight:700;letter-spacing:.5px';
  const live=document.createElement('span');live.textContent=(hot?'BREAKING':'LIVE')+' ● ';live.style.cssText='font-size:11px;opacity:.9';
  const cn=document.createElement('span');cn.textContent=ch.n;cn.style.cssText='font-size:15px';tag.appendChild(live);tag.appendChild(cn);
  const body=document.createElement('div');body.style.cssText='flex:1;display:flex;flex-direction:column;justify-content:center;padding:4px 16px;min-width:0';
  const hd=document.createElement('div');hd.textContent=b[1].replace(/\.$/,'');hd.style.cssText='font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
  const sub=document.createElement('div');sub.textContent='Anchor '+an+' · '+grMonStr(GC.turn-1);sub.style.cssText='font-size:11px;opacity:.65;margin-top:2px;letter-spacing:.3px';
  body.appendChild(hd);body.appendChild(sub);d.appendChild(tag);d.appendChild(body);host.appendChild(d);
  d.onclick=()=>d.remove();
  requestAnimationFrame(()=>{d.style.opacity='1';d.style.transform='translateY(0)';});
  setTimeout(()=>{if(!d.isConnected)return;d.style.opacity='0';d.style.transform='translateY(20px)';setTimeout(()=>d.remove(),450);},9000);}
