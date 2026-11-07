// 13n-gnews.js — Lane G ⚡16: newspaper headline after each turn, generated from the turn's log lines (templates, no hand-written rows).
// Read-only UI over GC.log; nothing to save. Neutral wording, nation names only.
const GN={tpl:[[/declared war on/,['WAR: {t}','{t} — the world holds its breath','Guns speak: {t}']],[/captured .* from/,['{t}','FRONT: {t}','Banner changes hands: {t}']],[/Peace between|peace/i,['PEACE: {t}','Guns fall silent: {t}']],[/lost its capital/,['CAPITAL FALLS: {t}']],[/Revolt in/,['UNREST: {t}']],[/alliance|guarantee/i,['PACT: {t}','DIPLOMACY: {t}']],[/eliminated/,['END OF A STATE: {t}']]]};
function gnPick(ls){const T=GC.turn-1;let best=null,bi=-1;for(const l of ls){if(l[0]!==T)continue;for(let i=0;i<GN.tpl.length;i++){const [re,arr]=GN.tpl[i];if(re.test(l[1])){const w=(GN.tpl.length-i)+(l[2]===GC.me?8:0);if(!best||w>bi){best={t:l[1].replace(/\.$/,''),arr};bi=w;}break;}}}
  if(!best)return null;return best.arr[(GC.seed+GC.turn)%best.arr.length].replace('{t}',best.t);}
function gdNews(){if(!GC||!GC.me)return;const h=gnPick(GC.log);if(!h)return;let d=document.getElementById('gNews');if(d)d.remove();
  const host=document.getElementById('gMapWrap');if(!host)return;d=document.createElement('div');d.id='gNews';
  d.style.cssText='position:absolute;left:50%;top:8px;transform:translateX(-50%);max-width:70%;padding:8px 18px;background:#e9e2cf;color:#1a1a1a;border:2px solid #3a3226;box-shadow:0 4px 16px rgba(0,0,0,.5);font:bold 17px Georgia,serif;letter-spacing:.3px;z-index:6;cursor:pointer;opacity:0;transition:opacity .4s';
  d.innerHTML='<div style="font-size:10px;letter-spacing:3px;opacity:.6;font-weight:normal">THE WORLD TRIBUNE · MONTH '+(GC.turn-1)+'</div>'+h.replace(/</g,'&lt;');host.appendChild(d);d.onclick=()=>d.remove();
  requestAnimationFrame(()=>{d.style.opacity='1';});setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),500);},7000);}
