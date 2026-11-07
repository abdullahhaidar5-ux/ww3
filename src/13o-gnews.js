// NEWSPAPER HEADLINES between turns (lane G, ⚡16). Turns the last turn's log lines into a short newspaper strip. Pure presentation:
// reads GC.log only, never touches the sim (so it cannot break determinism). Add a rule = add a row to GNEWS_RULES.
const GNEWS_RULES=[
 [/lost its capital/i,2,['CAPITAL FALLS: $0','$0 reels as the capital is taken','Shock in the capital — $0']],
 [/declared war on/i,1,['WAR: $0','$0 — armies are on the move','Diplomacy fails: $0']],
 [/joins the war/i,1,['Allies rally: $0','The war widens: $0','$0']],
 [/captured/i,1,['$0','Flag raised: $0','Province changes hands: $0']],
 [/made peace/i,1,['Guns fall silent: $0','Peace at last: $0','$0']],
 [/signed an alliance/i,0,['Pact signed: $0','New partnership: $0']],
 [/guarantees/i,0,['Guarantee issued: $0']],
 [/revolt|rebel/i,1,['Unrest spreads: $0','$0']],
 [/strike|missile|raid/i,1,['Strikes reported: $0','$0']]];
function gnewsMake(turn){if(!GC)return [];const out=[];const seen=new Set();
  for(const l of GC.log){if(l[0]!==turn)continue;const t=l[1];for(const [re,w,tp] of GNEWS_RULES){if(re.test(t)){if(seen.has(t))break;seen.add(t);const k=(GC.seed|0)+turn*7+t.length;out.push({w,h:tp[((k%tp.length)+tp.length)%tp.length].replace('$0',t.replace(/\.$/,'')),nat:l[2]});break;}}}
  out.sort((a,b)=>b.w-a.w);return out.slice(0,3);}
function gnewsShow(){if(!GC||!GC.me||GV.noNews)return;const hs=gnewsMake(GC.turn-1);const old=document.getElementById('gNews');if(old)old.remove();if(!hs.length)return;
  const box=guEl('div','position:fixed;left:50%;top:62px;transform:translateX(-50%);z-index:8300;width:min(640px,92vw);background:#e9e2cf;color:#1a1a1a;border:2px solid #3a3326;border-radius:3px;box-shadow:0 6px 26px rgba(0,0,0,.55);padding:8px 14px 10px;font-family:Georgia,serif;cursor:pointer;transition:opacity .6s');box.id='gNews';
  box.innerHTML='<div style="display:flex;justify-content:space-between;font-size:12px;letter-spacing:.18em;border-bottom:1px solid #3a3326;padding-bottom:3px;margin-bottom:5px"><span>THE WORLD DISPATCH</span><span>Turn '+(GC.turn-1)+'</span></div>'+hs.map((h,i)=>'<div style="font-weight:bold;font-size:'+(i?'15px':'20px')+';line-height:1.25;margin:'+(i?'3px':'0')+' 0">'+h.h+'</div>').join('');
  box.onclick=()=>box.remove();document.body.appendChild(box);setTimeout(()=>{box.style.opacity='0';setTimeout(()=>box.remove(),700);},7000);}
