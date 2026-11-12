// ===== 13ab-gwarui: what the player sees of battles and sieges on the campaign map (prefix gwu*) =====
// The fighting itself is src/13a-gwar.js. Here: crossed-swords / siege markers over the provinces (ONE points object =
// one draw call for all of them), a compact BATTLE window and SIEGE window (opened by clicking the marker or the line in
// the province panel - never forced open), and a small result card when a fight of yours ends. One job per window.
const GWU={win:null,seen:-1,odds:{},sig:'',marks:[],tex:null};
const GWU_KC={inf:'#9fb58a',at:'#c9b06a',tank:'#8795ad',arty:'#d0926a',aa:'#7fc3cc',air:'#b99ad6',nav:'#6fa6dc',hero:'#ffe27a'};
function gwuCss(){if(document.getElementById('gwuCss'))return;const s=document.createElement('style');s.id='gwuCss';
  s.textContent='#gwWin{position:absolute;right:10px;bottom:10px;z-index:45;width:min(470px,calc(100% - 20px));background:rgba(13,21,30,.96);border:1px solid #4a6580;border-radius:8px;box-shadow:0 6px 22px #000a;color:#e8e4d8;font-size:13px;line-height:1.4}'
   +'#gwWin .hd{display:flex;align-items:baseline;gap:10px;padding:9px 12px 7px;border-bottom:1px solid #2c4358}#gwWin .hd b{white-space:nowrap}#gwWin .hd small{opacity:.7;font-size:12px}'
   +'#gwWin .two{display:flex;gap:10px;padding:8px 10px 4px}#gwWin .two>div{flex:1;min-width:0}#gwWin .nm{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
   +'#gwWin .dim{opacity:.72;font-size:12px}#gwWin .bar{height:7px;border-radius:4px;background:#22303d;overflow:hidden;margin:3px 0}#gwWin .bar i{display:block;height:100%}'
   +'#gwWin .row{display:flex;flex-wrap:wrap;gap:2px;margin:2px 0;min-height:9px}#gwWin .u{width:8px;height:8px;border-radius:1px;display:inline-block}'
   +'#gwWin .die{display:inline-block;min-width:22px;height:22px;line-height:22px;text-align:center;border-radius:4px;background:#e8e4d8;color:#14202b;font-weight:700;margin-right:6px}'
   +'#gwWin .mods{font-size:12px;opacity:.9}#gwWin .mods span{color:#9fd36b}#gwWin .mods span.n{color:#e58d7c}'
   +'#gwWin .ft{display:flex;align-items:center;gap:8px;padding:6px 10px 8px;border-top:1px solid #2c4358}#gwWin .ft button{padding:3px 10px;border-radius:5px;border:1px solid #6b7a8a;background:transparent;color:#fff;cursor:pointer;font-size:12px}#gwWin .ft button:disabled{opacity:.45;cursor:default}#gwWin .ft button.warn{border-color:#a8674f}'
   +'#gwCards{position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:44;display:flex;flex-direction:column;gap:6px;pointer-events:none}'
   +'#gwCards .c{pointer-events:auto;cursor:pointer;min-width:300px;max-width:440px;background:rgba(13,21,30,.96);border:1px solid #4a6580;border-left:4px solid #9fd36b;border-radius:6px;padding:6px 10px;font-size:13px;line-height:1.4;color:#e8e4d8;box-shadow:0 4px 14px #0009}#gwCards .c.l{border-left-color:#e07a6a}#gwCards .c.n{border-left-color:#8fa3b8}#gwCards .c{padding-right:46px}#gwCards .c b{font-size:14px}#gwCards .gpx-x{pointer-events:auto}'
   +'.gwLink{display:block;margin:6px 0 2px;padding:4px 7px;border:1px solid #6a5a3a;border-radius:5px;background:#2a2416;color:#ffe6a8;cursor:pointer;font-size:13px}.gwLink:hover{border-color:#c9a35a}';
  document.head.appendChild(s);}
function gwuFlag(c,w){w=w||22;let u='';try{u=g3FlagUrl(c)||'';}catch(e){}const h=Math.round(w*.68),col=(grNat(c)||{}).color||'#666';
  return u?'<img alt="" src="'+u+'" style="width:'+w+'px;height:'+h+'px;object-fit:cover;border-radius:2px;border:1px solid #000a;vertical-align:middle;margin-right:6px">':'<span style="display:inline-block;width:'+w+'px;height:'+h+'px;border-radius:2px;border:1px solid #000a;vertical-align:middle;margin-right:6px;background:'+col+'"></span>';}
function gwuName(c){return (GCM.nats.get(c)||{}).name||c;}
function gwuMine(c){return !!GC.me&&c===GC.me;}
function gwuPips(n){let s='';for(let i=0;i<2;i++)s+=i<n?'●':'○';return s;}
function gwuKind(ro,k){return k==='champ'?'hero':ro.nav?'nav':ro.air?'air':ro.aa?'aa':ro.arty?'arty':ro.mv?'tank':k==='at'?'at':'inf';}
function gwuChips(row){let h='';for(const e of row){const hp=Math.max(0,Math.min(100,e.r[1]));h+='<i class="u" title="'+grKindName(e.g.fac,e.r[0])+' · health '+Math.round(hp)+'%" style="background:'+GWU_KC[gwuKind(e.ro,e.r[0])]+';opacity:'+(.35+.65*hp/100).toFixed(2)+'"></i>';}return h;}
function gwuMorBar(m,ls){const c=ls?'#c9a35a':m>60?'#6fbf5a':m>30?'#e0b043':'#d9534f';return '<div class="bar" title="Morale '+Math.round(m)+(ls?' - last stand: this side will not leave the field':'')+'"><i style="width:'+Math.max(ls?100:2,Math.min(100,m))+'%;background:'+c+'"></i></div>';}
function gwuMods(L,die,tot){let h='<span class="die" title="This phase\'s die (0-9)">'+die+'</span><span class="mods">';for(const m of L)h+='<span class="'+(m[1]<0?'n':'')+'">'+(m[1]>0?'+':'')+m[1]+'</span> '+m[0]+' · ';return h+'<b>= '+tot+'</b></span>';}
/* open the window for the battle or siege in province pi (toggle) */
function gwuOpen(pi){gwuCss();const B=gwBattleAt(pi),S=gwSiegeAt(pi);if(!B&&!S)return;if(GWU.win&&GWU.win.p===pi){gwuClose();return;}GWU.win={p:pi,k:B?'b':'s',id:(B||S).id};gwuDraw();}
function gwuClose(){GWU.win=null;const e=document.getElementById('gwWin');if(e)e.remove();}
function gwuEl(){const w=document.getElementById('gMapWrap');if(!w)return null;let e=document.getElementById('gwWin');if(!e){e=document.createElement('div');e.id='gwWin';e.innerHTML='<div class="hd"><b></b><small></small></div><div class="bd"></div>';e.addEventListener('mousedown',ev=>ev.stopPropagation());e.addEventListener('wheel',ev=>ev.stopPropagation());w.appendChild(e);}return e;}
/* fill the window: title and sub-line stay the same elements (the shared frame, close X and Esc come from the panel registry, 13zzz-gpanels.js) */
function gwuFill(el,t){el.querySelector('.hd b').textContent=t[0];el.querySelector('.hd small').textContent=t[1];el.querySelector('.bd').innerHTML=t[2];}
function gwuOddsOf(B){const k=B.id+':'+B.d;if(GWU.odds.k!==k){GWU.odds={k,o:null};try{GWU.odds.o=gwOdds(B,10);}catch(e){}}return GWU.odds.o;}
function gwuDraw(){const W=GWU.win;if(!W||!GC)return;gwuCss();const B=gwS().bt.find(x=>x.id===W.id),S=GC.sg.find(x=>x.id===W.id),R=GC.br.find(x=>x.id===W.id);
  if(!B&&!S&&!R){const nb=gwBattleAt(W.p),ns=gwSiegeAt(W.p);if(nb||ns){GWU.win={p:W.p,k:nb?'b':'s',id:(nb||ns).id};return gwuDraw();}return gwuClose();}
  const el=gwuEl();if(!el)return;const P=GCM.P[W.p];
  gwuFill(el,B?gwuBattleHtml(B,P):S?gwuSiegeHtml(S,P):gwuResultHtml(R));
  el.querySelectorAll('button[data-w]').forEach(b=>{b.onclick=()=>{const r=gwWithdraw(+b.dataset.w);if(r){GV.hint=r;guHint();}grandMapRefresh();};});
  const ab=el.querySelector('button[data-as]');if(ab)ab.onclick=()=>{const aid=+ab.dataset.as,q=gwAssaultOdds(S);
    guConfirm('Storm the fort at '+P.n+'?','Only the line troops go in (not artillery or aircraft). Expect to lose about '+Math.round((q.ratio>=1?q.loss:.5)*60)+'% of them'+(q.ratio>=1.15?'; the fort should fall.':q.ratio>=.85?'; it could go either way.':'; the garrison will probably hold.'),()=>{const r=gwAssault(aid);if(r){GV.hint=r;guHint();}grandMapRefresh();});};}
function gwuSideHtml(B,side,X){const isDef=side==='def',nat=isDef?B.dn:B.an,L=isDef?X.D:X.A,Ln=gwLine(L,B,isDef),g=gwLead(L),p=gwPips(g),mor=isDef?B.md:B.ma,ls=isDef?B.lsd:B.lsa,n0=isDef?B.nd0:B.na0,lost=isDef?B.ld:B.la;
  const others=[...new Set(L.map(q=>q.nat).filter(c=>c!==nat))];
  return '<div><div class="nm">'+gwuFlag(nat)+gwuName(nat)+(others.length?' <span class="dim">+ '+others.map(gwuName).join(', ')+'</span>':'')+'</div>'
   +'<div class="dim">'+(isDef?'Defending':'Attacking')+' · '+(g?gwGenName(g)+' <span title="The general\'s skill in the Fires and Assault phases (added to the die)">Fires '+gwuPips(p[0])+' Assault '+gwuPips(p[1])+'</span>':'no general')+'</div>'
   +gwuMorBar(mor,ls)+'<div class="dim">'+(ls?'<b style="color:#e6c36a">Last stand</b> · ':'Morale '+Math.max(0,Math.round(mor))+' · ')+Ln.n+' units'+(lost?' · <span style="color:#e58d7c">'+lost+' lost</span>':'')+'</div>'
   +'<div class="row" title="Front line: these units fight today">'+gwuChips(Ln.front)+'</div><div class="row" title="Support row: artillery, rockets, air defense and aircraft fire from behind">'+gwuChips(Ln.back)+'</div>'
   +'<div class="dim">'+Ln.front.length+' in the line · '+Ln.back.length+' in support'+(Ln.res?' · '+Ln.res+' in reserve':'')+((B.fl===1&&!isDef)||(B.fl===2&&isDef)?' · <b style="color:#9fd36b">outflanking</b>':'')+'</div></div>';}
function gwuBattleHtml(B,P){const X=gwCtx(B,0),ph=B.ph|0,dp=B.d?((B.d-1)%3)+1:0,o=gwuOddsOf(B),me=GC.me;
  const T=['Battle of '+P.n,(B.d?'day '+B.d+' · '+GW_PH[ph]+' phase ('+dp+' of 3)':'the armies are closing')+' · '+(B.sea?'at sea':guTerrName(P.t).toLowerCase())];
  let h='<div class="two">'+gwuSideHtml(B,'att',X)+gwuSideHtml(B,'def',X)+'</div>';
  if(B.dice)h+='<div class="two" style="padding-top:2px"><div>'+gwuMods(B.mo[0],B.dice[0],B.rl[0])+'</div><div>'+gwuMods(B.mo[1],B.dice[1],B.rl[1])+'</div></div>';
  h+='<div class="ft">';
  if(o){const who=o.pct>=50?B.an:B.dn,pc=o.pct>=50?o.pct:100-o.pct;h+='<span title="The same rules played forward from today with fresh dice, 10 times">Expected: <b>'+gwuName(who)+'</b> '+(pc>=85?'should win':pc>=60?'is ahead':'has a slight edge')+' ('+pc+'%) · about '+Math.max(1,o.days)+' more day'+(o.days>1?'s':'')+'</span>';}
  const mine=me?GC.armies.filter(a=>a.o===me&&a.bt===B.id):[];
  if(mine.length){const early=B.d<GW_MINDAY;h+='<span style="margin-left:auto"></span>';for(const a of mine.slice(0,2))h+='<button type="button" class="warn" data-w="'+a.id+'"'+(early?' disabled':'')+' title="'+(early?'Locked in combat for '+(GW_MINDAY-B.d)+' more day(s)':'Pull '+a.nm+' back to a friendly province. The enemy keeps the field.')+'">Withdraw'+(mine.length>1?' '+a.nm:'')+'</button>';}
  return [T[0],T[1],h+'</div>'];}
function gwuSiegeHtml(S,P){const st=GC.prov[S.p],L=gwBesiegers(S),fort=gwFort(S.p),M=gwSiegeMods(S),ch=gwSiegeChance(S),g=gwLead(L.map(a=>({arr:a}))),n=L.reduce((s,a)=>s+a.u.length,0),need=gwSiegeNeed(S),me=GC.me;
  const fn=geEff(S.p,'mfort')>.05?'Mountain Fortress':(GC.nat[st.o]&&GC.nat[st.o].cap===S.p&&st.o0===st.o)?'Capital defenses':'Fort';
  const T=['Siege of '+P.n,'day '+S.d+' · next roll in '+Math.max(1,S.nx-S.d)+' day'+(S.nx-S.d>1?'s':'')];let h='<div class="two">';
  h+='<div><div class="nm">'+gwuFlag(S.an)+gwuName(S.an)+'</div><div class="dim">Besieging · '+(g?gwGenName(g)+' <span title="Siege skill (added to the roll)">Siege '+gwuPips(gwPips(g)[3])+'</span>':'no general')+'</div><div class="dim">'+n+' units'+(n<need?' · <b style="color:#e58d7c">too few to seal the fort (needs '+need+')</b>':'')+'</div></div>';
  h+='<div><div class="nm">'+gwuFlag(st.o)+gwuName(st.o)+'</div><div class="dim">'+fn+' · level '+fort+'</div><div class="dim">Garrison '+st.gar.length+' unit'+(st.gar.length===1?'':'s')+(S.br?' · '+S.br+' breach'+(S.br>1?'es':''):'')+'</div></div></div>';
  h+='<div style="padding:2px 10px 6px"><div class="bar" style="height:9px" title="Chance that the next roll ends the siege"><i style="width:'+ch+'%;background:#c9a35a"></i></div><div><b>'+ch+'%</b> chance the fort falls at the next roll <span class="dim">(a roll of 1-14 plus the list below must reach '+GW_SG_WIN+')</span></div>';
  h+='<div class="mods" style="margin-top:3px">';for(const m of M)h+='<span class="'+(m[1]<0?'n':'')+'">'+(m[1]>0?'+':'')+m[1]+'</span> '+m[0]+' · ';h+='</div>';
  h+='<div class="dim" style="margin-top:3px">'+(S.roll?'Last roll '+S.roll+' (total '+S.tot+'): ':'')+S.last+'</div></div>';
  const mine=me?L.find(a=>a.o===me):null;h+='<div class="ft"><span class="dim">The garrison cannot be relieved through the lines; an army arriving from outside must fight the besiegers.</span>';
  if(mine)h+='<span style="margin-left:auto"></span><button type="button" class="warn" data-as="'+mine.id+'" title="Storm the walls now: fast, but it costs many line troops">Assault</button>';
  return [T[0],T[1],h+'</div>'];}
function gwuHow(R){return R.how==='siege'?(R.txt||'The fort fell.'):R.how==='wipe'?'The losing force was destroyed.':R.how==='sunk'?'The troops were caught at sea without an escort and went down.':R.how==='shatter'?'The losers broke in the first days and scattered.':R.how==='retreat'?'The losers were ordered back.':R.how==='left'?'One side left the field.':'The losers fell back with broken morale.';}
function gwuResultText(R){const me=GC.me,won=R.win==='att'?R.an:R.dn,lost=R.win==='att'?R.dn:R.an;
  if(R.sg)return '<b>'+gwuName(R.an)+' took '+R.pn+'</b> after a siege of '+R.d+' days. '+gwuHow(R);
  return '<b>'+gwuName(won)+' beat '+gwuName(lost)+'</b> at '+R.pn+' after '+R.d+' day'+(R.d>1?'s':'')+'. Losses: '+gwuName(R.an)+' '+R.la+' of '+R.na0+' units, '+gwuName(R.dn)+' '+R.ld+' of '+R.nd0+'. '+gwuHow(R);}
function gwuResultHtml(R){const won=R.win==='att'?R.an:R.dn;return [(R.sg?'Siege of ':'Battle of ')+R.pn+' — over',grDateStr(R.t,Math.max(0,(R.day|0)-1)),'<div style="padding:8px 10px 10px">'+gwuFlag(won,26)+gwuResultText(R)+'</div>'];}
/* the map opens (new campaign, a loaded save, a friend's world arriving): results already in the save are old news, only new ones get a card */
function gwuInit(){if(!GC)return;GWU.seenC=GC.seed;GWU.seen=GC.brn|0;GWU.win=null;GWU.odds={};}
/* result cards: fights the player was part of; nothing pops up for other nations' wars */
function gwuCards(){if(!GC||!GC.br)return;const me=GC.me;if(GWU.seen<0||GWU.seenC!==GC.seed||(GC.brn|0)<GWU.seen)gwuInit();
  const fresh=GC.br.filter(r=>(r.n|0)>GWU.seen);if(!fresh.length)return;GWU.seen=GC.brn|0;if(!me)return;gwuCss();const w=document.getElementById('gMapWrap');if(!w)return;
  let box=document.getElementById('gwCards');if(!box){box=document.createElement('div');box.id='gwCards';w.appendChild(box);}
  for(const R of fresh){if(!(R.who||[R.an,R.dn]).includes(me))continue;const won=(R.win==='att')===((R.wa||[R.an]).includes(me));const c=document.createElement('div');c.className='c '+(won?'':'l');
    c.innerHTML='<b>'+(won?'Victory':'Defeat')+' · '+R.pn+'</b><br>'+gwuResultText(R)+' <span class="dim" style="opacity:.6">click to close</span>';const gone=()=>{c.remove();if(!box.querySelector('.c'))box.remove();};c.onclick=()=>{gone();try{guCentre(R.p);GV.sel=R.p;grandMapRefresh();}catch(e){}};
    box.appendChild(c);while(box.querySelectorAll('.c').length>3)box.querySelector('.c').remove();setTimeout(()=>{if(c.isConnected)gone();},40000);}
  if(!box.querySelector('.c'))box.remove();}
/* the line in the province panel: the way into the window without hunting for the marker */
function gwuProvLine(pi){if(!GC||!GC.bt)return '';const B=gwBattleAt(pi),S=gwSiegeAt(pi);if(B)return '<span class="gwLink" data-p="'+pi+'">⚔ Battle in progress · day '+B.d+' · '+GW_PH[B.ph|0]+' phase <span style="opacity:.7">— open</span></span>';
  if(S)return '<span class="gwLink" data-p="'+pi+'">Under siege · day '+S.d+' · '+gwSiegeChance(S)+'% at the next roll <span style="opacity:.7">— open</span></span>';return '';}
function gwuBind(s){gwuCss();s.querySelectorAll('.gwLink').forEach(e=>{e.onclick=()=>gwuOpen(+e.dataset.p);});}
/* odds line for the order hint: the same rules, played forward for the armies you are sending */
function gwuOddsHint(ids,pi){try{const o=gwOddsAt(GC.me,ids,pi);if(o.none)return o.siege?' · a siege awaits there (fort level '+o.siege+')':'';
    return ' · as things stand: about '+o.pct+'% to win the battle, ~'+Math.max(1,o.days)+' days'+(o.siege?', then a siege (fort level '+o.siege+')':'');}catch(e){return '';}}

// ---------- map markers: one THREE.Points for every battle and siege (a single draw call) ----------
function gwuTex(){if(GWU.tex)return GWU.tex;const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');
  const badge=(ox,rim)=>{x.beginPath();x.arc(ox+64,64,54,0,7);x.fillStyle='rgba(16,22,30,.92)';x.fill();x.lineWidth=7;x.strokeStyle=rim;x.stroke();};
  /* crossed swords (own drawing): two blades with guards */
  badge(0,'#e2b45a');x.lineCap='round';for(const s of [1,-1]){x.save();x.translate(64,64);x.rotate(s*Math.PI/4);x.strokeStyle='#eef2f6';x.lineWidth=9;x.beginPath();x.moveTo(0,-38);x.lineTo(0,22);x.stroke();
    x.strokeStyle='#e2b45a';x.lineWidth=8;x.beginPath();x.moveTo(-15,22);x.lineTo(15,22);x.stroke();x.lineWidth=9;x.beginPath();x.moveTo(0,24);x.lineTo(0,38);x.stroke();x.restore();}
  /* siege: a tower with battlements inside a ring */
  badge(128,'#d98a5a');x.fillStyle='#eef2f6';x.fillRect(128+40,54,48,42);for(let i=0;i<3;i++)x.fillRect(128+40+i*18,38,12,18);x.fillStyle='rgba(16,22,30,.95)';x.beginPath();x.moveTo(128+55,96);x.lineTo(128+55,78);x.arc(128+64,78,9,Math.PI,0);x.lineTo(128+73,96);x.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;GWU.tex=t;return t;}
function gwuMarkList(){const L=[];if(!GC||!GC.bt)return L;for(const B of GC.bt)L.push({p:B.p,k:0});for(const S of GC.sg)if(!GC.bt.some(B=>B.p===S.p))L.push({p:S.p,k:1});return L;}
function gwuMarks(){if(typeof G3==='undefined'||!G3.sc||typeof THREE==='undefined')return;if(GWU.pts&&GWU.pts.parent!==G3.sc){GWU.pts=null;GWU.sig='';}const L=gwuMarkList(),sig=L.map(m=>m.p+':'+m.k).join(',');if(sig===GWU.sig&&(GWU.pts||!L.length))return;GWU.sig=sig;
  if(GWU.pts){G3.sc.remove(GWU.pts);GWU.pts.geometry.dispose();GWU.pts=null;}GWU.marks=[];if(!L.length)return;const P=[],K=[];
  for(const m of L){const p=GCM.P[m.p];let x=p.x,z=p.y;try{const tw=p.land&&g3Main(m.p);if(tw){x=tw.x;z=tw.z;}}catch(e){}let y=2;try{y=g3HeightAt(x,z);}catch(e){}y+=p.land?16:9;P.push(x,y,z);K.push(m.k);GWU.marks.push({p:m.p,k:m.k,x,y,z});}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('aK',new THREE.Float32BufferAttribute(K,1));
  if(!GWU.mat)GWU.mat=new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,uniforms:{uMap:{value:gwuTex()},uPx:{value:1}},
    vertexShader:'attribute float aK;uniform float uPx;varying float vK;void main(){vK=aK;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(2600./-mv.z,30.,46.)*uPx;}',
    fragmentShader:'uniform sampler2D uMap;varying float vK;void main(){vec2 uv=vec2((gl_PointCoord.x+vK)*.5,1.-gl_PointCoord.y);vec4 c=texture2D(uMap,uv);if(c.a<.05)discard;gl_FragColor=c;}'});
  try{GWU.mat.uniforms.uPx.value=G3.R?G3.R.getPixelRatio():1;}catch(e){}
  GWU.pts=new THREE.Points(g,GWU.mat);GWU.pts.frustumCulled=false;GWU.pts.renderOrder=50;G3.sc.add(GWU.pts);}
/* a click on a marker opens its window; returns true when it took the click */
function gwuClick(mx,my){if(!GWU.marks.length||typeof G3==='undefined'||!G3.cam)return false;const v=new THREE.Vector3();let best=null,bd=24;
  for(const m of GWU.marks){v.set(m.x,m.y,m.z).project(G3.cam);if(v.z>1||v.z<-1)continue;const d=Math.hypot((v.x*.5+.5)*GV.w-mx,(-v.y*.5+.5)*GV.h-my);if(d<bd){bd=d;best=m;}}
  if(!best)return false;GV.sel=best.p;if(!(GWU.win&&GWU.win.p===best.p))gwuOpen(best.p);try{guSide();}catch(e){}return true;}
/* called after every map refresh and every battle day: markers, the open window, result cards */
function gwuSync(){if(!GC)return;try{gwuMarks();}catch(e){console.error('gwuMarks',e);}try{if(GWU.win)gwuDraw();}catch(e){console.error('gwuDraw',e);}try{gwuCards();}catch(e){console.error('gwuCards',e);}}
function gwUiDay(){gwuSync();}
