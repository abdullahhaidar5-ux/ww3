// LEDGER GRAPHS over time (lane G, ⚡24): every living major's provinces and score recorded each turn (GC.gh = {code:[[turn,provs,score]]}, capped), drawn as line charts in a "Graphs" nation-panel tab.
function ggTurn(){if(!GC||!GC.nat)return;if(!GC.gh)GC.gh={};const cnt={};for(const p of GCM.P)if(p.land)cnt[GC.prov[p.i].o]=(cnt[GC.prov[p.i].o]|0)+1;
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||!grNat(c).major)continue;const a=GC.gh[c]||(GC.gh[c]=[]);a.push([GC.turn,cnt[c]|0,grScore(c)]);if(a.length>150)a.shift();}}
npTab('gr','📈','Graphs',(code,body)=>{const idx=NP.gk==='score'?2:1;const kind=idx===2?'score':'provinces';
  const bar=guEl('div','display:flex;gap:6px;margin-bottom:8px');for(const [k,nm] of [['prov','Provinces'],['score','Score']]){const b=guEl('button','padding:3px 12px;border-radius:12px;border:1px solid '+((k==='score')===(idx===2)?'#c9a35a':'#3d5a73')+';background:transparent;color:#dfe8f0;cursor:pointer',nm);b.type='button';b.onclick=()=>{NP.gk=k;npDraw();};bar.appendChild(b);}body.appendChild(bar);
  const H=GC.gh||{};const codes=Object.keys(H).filter(c=>H[c].length>1);if(!codes.length){body.appendChild(guEl('div','opacity:.7','Play a few turns and the history appears here.'));return;}
  const last=c=>H[c][H[c].length-1][idx];codes.sort((a,b)=>last(b)-last(a));const show=codes.slice(0,6);if(!show.includes(code)&&H[code])show.push(code);if(GC.me&&!show.includes(GC.me)&&H[GC.me])show.push(GC.me);
  const W=880,Hh=340,cv=document.createElement('canvas');cv.width=W;cv.height=Hh;cv.style.cssText='max-width:100%;height:auto;background:#0c1621;border-radius:6px';body.appendChild(cv);const g=cv.getContext('2d');
  let mx=1,t0=1e9,t1=0;for(const c of show)for(const r of H[c]){mx=Math.max(mx,r[idx]);t0=Math.min(t0,r[0]);t1=Math.max(t1,r[0]);}if(t1===t0)t1=t0+1;
  g.strokeStyle='#223546';g.fillStyle='#8aa0b4';g.font='12px sans-serif';for(let i=0;i<=4;i++){const y=20+(Hh-44)*i/4;g.beginPath();g.moveTo(44,y);g.lineTo(W-10,y);g.stroke();g.fillText(String(Math.round(mx*(1-i/4))),4,y+4);}
  g.fillText('turn '+t0,44,Hh-6);g.fillText('turn '+t1,W-70,Hh-6);
  const leg=guEl('div','display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:14px');
  for(const c of show){const col=grNat(c).color||'#aaa';g.beginPath();H[c].forEach((r,i)=>{const x=44+(r[0]-t0)/(t1-t0)*(W-54),y=20+(Hh-44)*(1-r[idx]/mx);i?g.lineTo(x,y):g.moveTo(x,y);});g.strokeStyle=col;g.lineWidth=c===code||c===GC.me?3.5:1.8;g.stroke();
    leg.appendChild(guEl('span','','<span style="display:inline-block;width:12px;height:4px;background:'+col+';margin-right:5px;vertical-align:middle"></span>'+gnName(c)+(c===GC.me?' (you)':'')+' <b>'+last(c)+'</b>'));}
  body.appendChild(leg);});
