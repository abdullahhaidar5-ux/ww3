/* ================= MAP EDITOR (Abdullah 2026-11-03) =================
   Full-screen editor opened from the main menu. A map is the plain data described in 02-map.js (CUSTOM MAPS). Painting works
   in design units (3200 x 2200); the Mirror setting repeats every stroke so symmetric maps are quick to make. Saved maps live
   in localStorage ('ww3_maps'); Share = a code string / link / file; a custom map is used in skirmish and online lobbies
   like any built-in one (the host sends its code along with the battle, and everyone checks its hash). */
const ED_LIB_KEY='ww3_maps',ED_DRAFT_KEY='ww3_ed_draft';
const ED={c:null,tool:'raise',brush:70,mirror:'off',style:0,undo:[],redo:[],view:{x:0,y:0,z:1},ptrs:new Map(),stroke:null,snap:null,showPrev:false,prevImg:null,prevT:0,tmpKeys:new Set(),res:null,open:false,msg:'',cur:null};
const ED_TOOLS=[['pan','✋','Move','Drag to move the view. Two fingers or the mouse wheel zoom.'],['raise','⛰','Raise','Paint mountains (rock you cannot drive over).'],
  ['lower','🕳','Lower','Dig ponds and lakes (water).'],['flat','▭','Flatten','Clear mountains and ponds under the brush.'],
  ['river','🌊','River','Drag to draw a river. Add a bridge or the two sides cannot reach each other.'],['bridge','🌉','Bridge','Tap a river to put a bridge across it (or drag across the water).'],
  ['road','🛣','Road','Drag to lay a road.'],['forest','🌲','Forest','Paint woods: cover for infantry, slows vehicles.'],['rocks','🪨','Rocks','Stamp small rock outcrops.'],
  ['town','🏘','Town','Tap to put a town of civilian buildings.'],['oil','🛢','Oil','Tap to put an oil derrick.'],['ham','🛖','Hamlet','Tap to put a hamlet: a few houses infantry can garrison for cover. Put one behind each start and some in the middle.'],['supply','📦','Supply','Tap to put a supply field.'],
  ['start','🚩','Start','Tap to place a start position (numbered in the order placed).'],['erase','🧽','Erase','Remove anything under the brush.']];
const ED_STYLE_NAMES=['Middle East','Russia','Europe','America','Yemen','Gulf city','Korea','Asia','Latin America','South Asia'];
function edBlank(){return{nm:'My map',n:2,z:1,th:'desert',sl:[],rv:[],rg:[],rd:[],lk:[],pk:[],wd:[],ct:[],oil:[],hm:[],fl:[],br:[]};}
function edVars(){const m=ED.mirror;return m==='x'?[[1,1],[-1,1]]:m==='y'?[[1,1],[1,-1]]:m==='p'?[[1,1],[-1,-1]]:m==='q'?[[1,1],[-1,1],[1,-1],[-1,-1]]:[[1,1]];}
const edPX=(x,v)=>v[0]>0?x:3200-x,edPY=(y,v)=>v[1]>0?y:2200-y;
function edSnap(){return JSON.stringify(ED.c);}
function edChanged(){ED.res=null;ED.prevT=Date.now();try{localStorage.setItem(ED_DRAFT_KEY,JSON.stringify(ED.c));}catch(e){}edUI();edDraw();if(ED.showPrev)edPrevSoon();}
function edPushUndo(s){ED.undo.push(s);if(ED.undo.length>80)ED.undo.shift();ED.redo.length=0;}
function edUndo(){if(!ED.undo.length)return;ED.redo.push(edSnap());ED.c=JSON.parse(ED.undo.pop());edChanged();}
function edRedo(){if(!ED.redo.length)return;ED.undo.push(edSnap());ED.c=JSON.parse(ED.redo.pop());edChanged();}
// ---- geometry helpers
function edSimplify(P,tol){if(P.length<3)return P;let best=0,bi=0;const a=P[0],b=P[P.length-1];for(let i=1;i<P.length-1;i++){const d=segDist(P[i][0],P[i][1],a[0],a[1],b[0],b[1])[0];if(d>best){best=d;bi=i;}}
  if(best<=tol)return[a,b];return edSimplify(P.slice(0,bi+1),tol).slice(0,-1).concat(edSimplify(P.slice(bi),tol));}
function edLineFit(P,mx){let tol=10,out=edSimplify(P,tol);while(out.length>mx&&tol<400){tol*=1.5;out=edSimplify(P,tol);}return out;}
function edErase(kinds,x,y,rad){const c=ED.c;let n=0;
  const poly=(L,hasW)=>{const keep=L.filter(r=>{const w=hasW?r[0]:0,P=hasW?r.slice(1):r;for(let i=0;i+3<P.length;i+=2)if(segDist(x,y,P[i],P[i+1],P[i+2],P[i+3])[0]<rad+w*.6)return false;return true;});n+=L.length-keep.length;return keep;};
  const pts=(L,ri)=>{const keep=L.filter(q=>Math.hypot(q[0]-x,q[1]-y)>=rad+(ri?q[2]*(ri):0));n+=L.length-keep.length;return keep;};
  if(kinds.includes('rg'))c.rg=poly(c.rg,true);if(kinds.includes('rv'))c.rv=poly(c.rv,true);if(kinds.includes('rd'))c.rd=poly(c.rd,false);
  if(kinds.includes('pk'))c.pk=pts(c.pk,1);if(kinds.includes('lk'))c.lk=pts(c.lk,1);if(kinds.includes('wd'))c.wd=pts(c.wd,.8);if(kinds.includes('ct'))c.ct=pts(c.ct,.8);
  if(kinds.includes('oil'))c.oil=pts(c.oil,0);if(kinds.includes('hm'))c.hm=pts(c.hm||[],0);if(kinds.includes('fl'))c.fl=pts(c.fl,0);if(kinds.includes('br'))c.br=pts(c.br,0);if(kinds.includes('sl'))c.sl=pts(c.sl,0);return n;}
// ---- applying a tool at a point / stroke (every mirror copy)
function edStamp(tool,x,y,ang){const c=ED.c,B=ED.brush;const seen=[];
  for(const v of edVars()){const X=Math.round(edPX(x,v)),Y=Math.round(edPY(y,v));if(seen.some(q=>Math.hypot(q[0]-X,q[1]-Y)<8))continue;seen.push([X,Y,v]);}
  for(const [X,Y,v] of seen){
    if(tool==='lower'){if(!c.lk.some(q=>Math.hypot(q[0]-X,q[1]-Y)<B*.7&&q[2]>=B*1.4*.9)&&c.lk.length<120)c.lk.push([X,Y,Math.round(B*1.4)]);}
    else if(tool==='forest'){if(!c.wd.some(q=>Math.hypot(q[0]-X,q[1]-Y)<B*.8)&&c.wd.length<200)c.wd.push([X,Y,Math.max(40,Math.round(B*1.3))]);}
    else if(tool==='rocks'){const r=Math.max(12,Math.min(60,Math.round(B*.35)));if(!c.pk.some(q=>Math.hypot(q[0]-X,q[1]-Y)<r*1.2)&&c.pk.length<200)c.pk.push([X,Y,r]);}
    else if(tool==='town'){if(c.ct.length<40)c.ct.push([X,Y,Math.max(50,Math.min(240,Math.round(B*1.3))),ED.style]);}
    else if(tool==='oil'){if(c.oil.length<40)c.oil.push([X,Y]);}
    else if(tool==='ham'){c.hm=c.hm||[];if(c.hm.length<24&&!c.hm.some(q=>Math.hypot(q[0]-X,q[1]-Y)<120))c.hm.push([X,Y]);}
    else if(tool==='supply'){if(c.fl.length<40)c.fl.push([X,Y]);}
    else if(tool==='start'){if(c.sl.length<c.n&&!c.sl.some(q=>Math.hypot(q[0]-X,q[1]-Y)<120))c.sl.push([Math.max(150,Math.min(3050,X)),Math.max(150,Math.min(2050,Y))]);}
    else if(tool==='bridge'&&ang!=null){const a=ang*Math.PI/180,nx=Math.cos(a)*v[0],ny=Math.sin(a)*v[1];if(c.br.length<40)c.br.push([X,Y,Math.round(Math.atan2(ny,nx)*180/Math.PI)]);}
    else if(tool==='flat'){edErase(['rg','pk','lk'],X,Y,B);}
    else if(tool==='erase'){edErase(['rg','rv','rd','pk','lk','wd','ct','oil','hm','fl','br','sl'],X,Y,B);}}}
function edStrokeCommit(tool,P){const c=ED.c;if(P.length<2)return;const Q=edLineFit(P,tool==='road'?70:60);if(Q.length<2)return;
  const seen=[];for(const v of edVars()){const Z=Q.map(([x,y])=>[Math.round(edPX(x,v)),Math.round(edPY(y,v))]);
    if(seen.some(S=>S.every((q,i)=>Math.hypot(q[0]-Z[i][0],q[1]-Z[i][1])<10)))continue;seen.push(Z);
    const flat=Z.flat();if(tool==='raise'){if(c.rg.length<60)c.rg.push([Math.max(30,Math.round(ED.brush*.9)),...flat]);}
    else if(tool==='river'){if(c.rv.length<40)c.rv.push([Math.max(40,Math.round(ED.brush)),...flat]);}
    else if(tool==='road'){if(c.rd.length<40)c.rd.push(flat);}}}
function edBridgeAt(x,y){ // direction across the nearest river (degrees), or null
  let best=null,bd=1e9;for(const r of ED.c.rv){const w=r[0],P=r.slice(1);for(let i=0;i+3<P.length;i+=2){const [d]=segDist(x,y,P[i],P[i+1],P[i+2],P[i+3]);if(d<w+90&&d<bd){bd=d;best=Math.atan2(P[i+3]-P[i+1],P[i+2]-P[i])*180/Math.PI+90;}}}
  if(best==null)return null;return Math.round(((best+180)%360+360)%360-180);}
// ---- whole-map transforms
function edFlip(fx,fy){const c=ED.c,s=edSnap(),P=a=>a.map(q=>[fx<0?3200-q[0]:q[0],fy<0?2200-q[1]:q[1],...q.slice(2)]);
  const L=a=>a.map(r=>{const o=[r[0]];for(let i=1;i+1<r.length;i+=2)o.push(fx<0?3200-r[i]:r[i],fy<0?2200-r[i+1]:r[i+1]);return o;}),R=a=>a.map(r=>{const o=[];for(let i=0;i+1<r.length;i+=2)o.push(fx<0?3200-r[i]:r[i],fy<0?2200-r[i+1]:r[i+1]);return o;});
  c.sl=P(c.sl);c.lk=P(c.lk);c.pk=P(c.pk);c.wd=P(c.wd);c.ct=P(c.ct);c.oil=P(c.oil);c.hm=P(c.hm||[]);c.fl=P(c.fl);c.rv=L(c.rv);c.rg=L(c.rg);c.rd=R(c.rd);
  c.br=c.br.map(([x,y,d])=>{const a=d*Math.PI/180;return[fx<0?3200-x:x,fy<0?2200-y:y,Math.round(Math.atan2(Math.sin(a)*fy,Math.cos(a)*fx)*180/Math.PI)];});edPushUndo(s);edChanged();}
function edApplySym(){const m=ED.mirror;if(m==='off'){ED.msg='Pick a Mirror mode first (left-right, top-bottom, 180° or 4-way).';edUI();return;}
  const c=ED.c,s=edSnap(),src=JSON.parse(s);const keys=['lk','pk','wd','ct','oil','hm','fl','rv','rg','rd','br','sl'];const old=ED.c;
  for(const v of edVars().slice(1)){const t=JSON.parse(s);ED.c=t;edFlipInto(t,v);for(const k of keys)for(const e of t[k]){if(k==='sl'&&c.sl.length>=c.n)continue;c[k].push(e);}}
  ED.c=c;edPushUndo(s);ED.msg='Mirrored copy added.';edChanged();}
function edFlipInto(t,v){const fx=v[0],fy=v[1],X=x=>fx<0?3200-x:x,Y=y=>fy<0?2200-y:y;
  for(const k of ['sl','lk','pk','wd','ct','oil','hm','fl'])t[k]=(t[k]||[]).map(q=>[X(q[0]),Y(q[1]),...q.slice(2)]);
  for(const k of ['rv','rg'])t[k]=t[k].map(r=>{const o=[r[0]];for(let i=1;i+1<r.length;i+=2)o.push(X(r[i]),Y(r[i+1]));return o;});
  t.rd=t.rd.map(r=>{const o=[];for(let i=0;i+1<r.length;i+=2)o.push(X(r[i]),Y(r[i+1]));return o;});
  t.br=t.br.map(([x,y,d])=>{const a=d*Math.PI/180;return[X(x),Y(y),Math.round(Math.atan2(Math.sin(a)*fy,Math.cos(a)*fx)*180/Math.PI)];});}
// ---- checks (run on Save and on the Check button)
function edCheck(c0){
  const R=[],bad=(m)=>R.push({l:'err',m}),warn=(m)=>R.push({l:'warn',m});const c=cmCanon(c0);
  if(!c){bad('Place at least 2 start positions (🚩) first.');return R;}
  if(c.sl.length<c0.n)bad(`Only ${c.sl.length} of ${c0.n} start positions placed.`);
  const key=registerCustomMap(c);ED.tmpKeys.add(key);const keep={wk:WK,srand,B:BASES,S:BASE_SLOTS};
  try{setWorld(1);setBases(c.sl.length,key);const M=mkMap(777,key),N=BASES.length,cellOf=(x,y)=>Math.floor(y/CELL)*GW+Math.floor(x/CELL);
    BASES.forEach(([x,y],i)=>{if(M.mtn(x,y)>-50)bad(`Start ${i+1} is inside or beside a mountain.`);});
    const DB=BASES.map(([x,y])=>gridDist(M.grid,x,y));let cut=0;
    for(let i=0;i<N;i++)for(let j=i+1;j<N;j++)if(!(DB[i][cellOf(BASES[j][0],BASES[j][1])]<1e8)&&cut++<3)bad(`No ground path between start ${i+1} and start ${j+1}: water or mountains block it. Add a bridge or open a gap.`);
    if(cut>3)bad(`${cut-3} more pairs of starts cannot reach each other.`);
    if(!cut){ // fairness of the ground
      const eD=BASES.map((b,i)=>Math.min(...BASES.map((q,j)=>j===i?1e9:DB[i][cellOf(q[0],q[1])])));const lo=Math.min(...eD),hi=Math.max(...eD);
      if(hi>lo*1.35)warn(`Start ${eD.indexOf(lo)+1} has an enemy only ${Math.round(lo)} away by road, but start ${eD.indexOf(hi)+1} has ${Math.round(hi)}: the starts are not evenly spaced.`);
      const Rr=Math.max(500,lo*.5),cnt=BASES.map((b,i)=>{const near=(P)=>P.filter(p=>{const d=DB[i][cellOf(p.x,p.y)];return d<Rr;}).length;return[near(M.fields),near(M.oil)];});
      cnt.forEach((q,i)=>{if(q[0]+q[1]===0)bad(`Start ${i+1} has no supply field or oil derrick within reach. Add some (📦 🛢).`);});
      const fl=cnt.map(q=>q[0]),ol=cnt.map(q=>q[1]);
      if(Math.max(...fl)-Math.min(...fl)>=2)warn(`Supply is uneven: start ${fl.indexOf(Math.min(...fl))+1} has ${Math.min(...fl)} nearby field(s), start ${fl.indexOf(Math.max(...fl))+1} has ${Math.max(...fl)}.`);
      if(Math.max(...ol)-Math.min(...ol)>=2)warn(`Oil is uneven: start ${ol.indexOf(Math.min(...ol))+1} has ${Math.min(...ol)} nearby derrick(s), start ${ol.indexOf(Math.max(...ol))+1} has ${Math.max(...ol)}.`);
      // at least two ways between neighbours: block the road of the shortest route and see if another remains
      const g=M.grid,ps=v=>v===0||v===2,NC=GW*GH,bfs=(s,t,blk)=>{const par=new Int32Array(NC).fill(-2),q=new Int32Array(NC);let h=0,e=0;par[s]=-1;q[e++]=s;
        while(h<e){const k=q[h++];if(k===t)break;const cx=k%GW,cy=(k/GW)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=GW||ny>=GH)continue;const n=ny*GW+nx;if(par[n]!==-2||!ps(g[n])||(blk&&blk[n]))continue;par[n]=k;q[e++]=n;}}
        if(par[t]===-2)return null;const path=[];for(let k=t;k>=0;k=par[k])path.push(k);return path;};
      const seenP=new Set();let one=0;
      for(let i=0;i<N;i++){const j=BASES.findIndex((q,k)=>k!==i&&DB[i][cellOf(q[0],q[1])]===eD[i]);if(j<0)continue;const key2=Math.min(i,j)+'-'+Math.max(i,j);if(seenP.has(key2))continue;seenP.add(key2);
        const a=cellOf(BASES[i][0],BASES[i][1]),b=cellOf(BASES[j][0],BASES[j][1]),p=bfs(a,b,null);if(!p)continue;const blk=new Uint8Array(NC),rc=Math.ceil(170/CELL),ax=BASES[i],bx=BASES[j];
        for(const k of p){const x=(k%GW+.5)*CELL,y=((k/GW|0)+.5)*CELL;if(Math.hypot(x-ax[0],y-ax[1])<480||Math.hypot(x-bx[0],y-bx[1])<480)continue;const cx=k%GW,cy=(k/GW)|0;
          for(let yy=-rc;yy<=rc;yy++)for(let xx=-rc;xx<=rc;xx++){if(xx*xx+yy*yy>rc*rc)continue;const X=cx+xx,Y=cy+yy;if(X>=0&&Y>=0&&X<GW&&Y<GH)blk[Y*GW+X]=1;}}
        if(!bfs(a,b,blk)&&one++<2)warn(`Only one real route between start ${i+1} and start ${j+1}. A fair map has at least two ways to attack: add a bridge, a gap, or a flank road.`);}
    }
    // symmetric starts
    const sym=[['x',([x,y])=>[3200-x,y]],['y',([x,y])=>[x,2200-y]],['p',([x,y])=>[3200-x,2200-y]]];
    const ok=sym.some(([m,f])=>c.sl.every(s=>c.sl.some(t=>Math.hypot(t[0]-f(s)[0],t[1]-f(s)[1])<140)));
    if(!ok)warn('The start positions are not mirror images of each other. Use the Mirror setting when you place them for a fair map.');
    // same ground for every side? rough land share around each start
    const gnd=BASES.map(([bx,by])=>{let n=0,t=0;for(let y=-600;y<=600;y+=40)for(let x=-600;x<=600;x+=40){const X=bx+x,Y=by+y;if(X<0||Y<0||X>=MAPW||Y>=MAPH)continue;t++;if(M.grid[cellOf(X,Y)]===0||M.grid[cellOf(X,Y)]===2)n++;}return n/Math.max(1,t);});
    if(Math.max(...gnd)-Math.min(...gnd)>.22)warn(`Start ${gnd.indexOf(Math.min(...gnd))+1} has far less open ground around it than start ${gnd.indexOf(Math.max(...gnd))+1}.`);
  }catch(e){bad('The map could not be built: '+(e&&e.message||e));}
  finally{srand=keep.srand;BASES=keep.B;BASE_SLOTS=keep.S;setWorld(keep.wk);}
  if(!R.length)R.push({l:'ok',m:'All checks passed: reachable starts, supply near each, two routes, and the starts look fair.'});
  return R;}
// ---- saved maps (this device)
function edLib(){try{const a=JSON.parse(localStorage.getItem(ED_LIB_KEY)||'[]');return Array.isArray(a)?a.filter(e=>e&&typeof e.code==='string'):[];}catch(e){return[];}}
function edLibSet(a){try{localStorage.setItem(ED_LIB_KEY,JSON.stringify(a));return true;}catch(e){ED.msg='Could not save on this device (storage is full or blocked). Use Share to keep the code.';return false;}}
function edSave(){const c=cmCanon(ED.c);if(!c){ED.msg='Place at least 2 start positions first.';edUI();return;}ED.res=edCheck(ED.c);const key=registerCustomMap(c),code=customMapCode(key),a=edLib();
  const ix=a.findIndex(e=>e.id===ED.id);const e={id:ED.id||(ED.id='m'+Date.now().toString(36)),name:c.nm,code,t:Date.now()};if(ix>=0)a[ix]=e;else a.push(e);
  const bad=ED.res.some(r=>r.l==='err'),warn=ED.res.some(r=>r.l==='warn');
  if(edLibSet(a)){ED.tmpKeys.delete(key);ED.msg=bad?'Saved, but it has problems (below): friends may not be able to play it fairly.':warn?'Saved. Some things look unfair (below).':'Saved on this device.';}edUI();}
function edLoadCode(src,keepId){const o=cmParse(src),c=cmCanon(o);if(!c){ED.msg='That is not a World War 3 map code.';edUI();return false;}
  edPushUndo(edSnap());ED.c=JSON.parse(JSON.stringify(Object.assign({},c)));ED.c.n=Math.max(c.n,2);ED.id=keepId||null;ED.res=null;ED.msg='Opened “'+c.nm+'”.';edFit();edChanged();return true;}
function edImportToLib(src){const k=registerCustomMap(src);if(!k)return null;const a=edLib(),code=customMapCode(k);if(!a.some(e=>e.code===code)){a.push({id:'m'+Date.now().toString(36)+a.length,name:MAPS[k].name,code,t:Date.now()});edLibSet(a);}return k;}
function edShareText(){const k=registerCustomMap(ED.c);return k?customMapCode(k):'';}
function edCopy(t,what){try{navigator.clipboard.writeText(t).then(()=>{ED.msg=what+' copied.';edUI();},()=>{ED.msg='Could not copy: select the code and copy it by hand.';edUI();});}catch(e){ED.msg='Could not copy: select the code and copy it by hand.';edUI();}}
function edDownload(){const t=edShareText();if(!t){ED.msg='Place at least 2 start positions first.';edUI();return;}const b=new Blob([t],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(ED.c.nm||'map').replace(/[^A-Za-z0-9_-]+/g,'_')+'.ww3map';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
// ---- play it
function edPlay(){const c=cmCanon(ED.c);if(!c){ED.msg='Place at least 2 start positions first.';edUI();return;}ED.res=edCheck(ED.c);const key=registerCustomMap(c);ED.tmpKeys.delete(key);
  try{setup.map=key;setup.slot=-1;setup.st=[];setup.stK=null;setup.n=Math.max(1,Math.min(7,MAPS[key].max-1));}catch(e){}
  edClose();try{if(typeof mapCards==='function')mapCards();}catch(e){}try{initAudio();}catch(e){}startSingle();}
// ---- view
function edFit(){const cv=ED.cv;if(!cv)return;ED.userView=false;const w=cv.clientWidth||800,h=cv.clientHeight||500,z=Math.min(w/3200,h/2200)*.96;ED.view={z,x:(w-3200*z)/2,y:(h-2200*z)/2};}
const edW2S=(x,y)=>[x*ED.view.z+ED.view.x,y*ED.view.z+ED.view.y],edS2W=(x,y)=>[(x-ED.view.x)/ED.view.z,(y-ED.view.y)/ED.view.z];
// ---- drawing
function edDraw(){const cv=ED.cv;if(!cv)return;const dpr=Math.min(2,window.devicePixelRatio||1),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
  const g=cv.getContext('2d'),c=ED.c,V=ED.view;g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#0b0f0d';g.fillRect(0,0,w,h);g.save();g.translate(V.x,V.y);g.scale(V.z,V.z);
  const th=c.th,land=th==='snow'?'#d9dfe6':th==='green'?'#7d9758':'#c8ac7a',water='#2c5c66',rock=th==='snow'?'#8c93a0':'#6e6354';
  g.fillStyle=land;g.fillRect(0,0,3200,2200);
  if(ED.showPrev&&ED.prevImg){g.imageSmoothingEnabled=true;g.drawImage(ED.prevImg,0,0,3200,2200);}
  else{g.lineCap='round';g.lineJoin='round';
    const path=(P,st)=>{g.beginPath();for(let i=st;i+1<P.length;i+=2)i===st?g.moveTo(P[i],P[i+1]):g.lineTo(P[i],P[i+1]);};
    g.strokeStyle='rgba(60,50,35,.55)';for(const r of c.rd){path(r,0);g.lineWidth=34;g.stroke();}
    g.strokeStyle=water;for(const r of c.rv){path(r,1);g.lineWidth=r[0]*2;g.stroke();}g.fillStyle=water;for(const [x,y,r] of c.lk){g.beginPath();g.arc(x,y,r,0,7);g.fill();}
    g.strokeStyle=rock;for(const r of c.rg){path(r,1);g.lineWidth=r[0]*2;g.stroke();}g.fillStyle=rock;for(const [x,y,r] of c.pk){g.beginPath();g.arc(x,y,r,0,7);g.fill();}
    g.fillStyle='rgba(40,90,40,.55)';for(const [x,y,r] of c.wd){g.beginPath();g.arc(x,y,r,0,7);g.fill();}
    g.fillStyle='rgba(90,85,75,.8)';for(const [x,y,r] of c.ct){g.beginPath();g.arc(x,y,r,0,7);g.fill();}}
  // bridges
  for(const [x,y,d] of c.br){g.save();g.translate(x,y);g.rotate(d*Math.PI/180);g.fillStyle='#8a7b63';g.strokeStyle='#241c10';g.lineWidth=5;g.fillRect(-90,-22,180,44);g.strokeRect(-90,-22,180,44);g.restore();}
  if(!(ED.showPrev&&ED.prevImg)||true){g.font='bold 54px system-ui';g.textAlign='center';g.textBaseline='middle';
    for(const [x,y] of (c.hm||[])){g.fillStyle='#3a2f22';g.beginPath();g.arc(x,y,26,0,7);g.fill();g.fillStyle='#e8d7b0';g.fillText('🛖',x,y+3);}
    for(const [x,y] of c.oil){g.fillStyle='#161616';g.beginPath();g.arc(x,y,34,0,7);g.fill();g.fillStyle='#e8c040';g.fillText('⛽',x,y+3);}
    for(const [x,y] of c.fl){g.fillStyle='#4a3a1c';g.beginPath();g.arc(x,y,42,0,7);g.fill();g.fillStyle='#f0d070';g.fillText('$',x,y+3);}
    for(const [x,y,r,s] of c.ct){g.fillStyle='#fff';g.font='bold 40px system-ui';g.fillText('🏘',x,y);}}
  c.sl.forEach(([x,y],i)=>{g.fillStyle='rgba(20,30,20,.35)';g.beginPath();g.arc(x,y,300,0,7);g.fill();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=5;g.stroke();g.fillStyle=i<ED.c.n?'#d8352a':'#888';g.beginPath();g.arc(x,y,62,0,7);g.fill();g.fillStyle='#fff';g.font='bold 78px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(String(i+1),x,y+4);});
  // frame + mirror axes
  g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=6;g.strokeRect(0,0,3200,2200);g.setLineDash([30,26]);g.strokeStyle='rgba(255,230,120,.8)';g.lineWidth=5;
  const m=ED.mirror;if(m==='x'||m==='q'){g.beginPath();g.moveTo(1600,0);g.lineTo(1600,2200);g.stroke();}if(m==='y'||m==='q'){g.beginPath();g.moveTo(0,1100);g.lineTo(3200,1100);g.stroke();}if(m==='p'){g.beginPath();g.arc(1600,1100,40,0,7);g.stroke();}g.setLineDash([]);
  // stroke in progress (with mirror copies)
  if(ED.stroke&&ED.stroke.P.length>1){const t=ED.stroke.tool;g.strokeStyle=t==='raise'?rock:t==='river'?water:'rgba(60,50,35,.7)';g.lineWidth=t==='road'?34:(t==='raise'?ED.brush*1.8:ED.brush*2);g.globalAlpha=.8;
    for(const v of edVars()){g.beginPath();ED.stroke.P.forEach(([x,y],i)=>i?g.lineTo(edPX(x,v),edPY(y,v)):g.moveTo(edPX(x,v),edPY(y,v)));g.stroke();}g.globalAlpha=1;}
  g.restore();
  if(ED.cur&&ED.tool!=='pan'){const [sx,sy]=edW2S(ED.cur[0],ED.cur[1]);g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.5;const r=edToolR()*V.z;
    for(const v of edVars()){const [px,py]=edW2S(edPX(ED.cur[0],v),edPY(ED.cur[1],v));g.beginPath();g.arc(px,py,Math.max(4,r),0,7);g.stroke();}}
  const st=$('edStat');if(st){const t=ED.cur?`x ${Math.round(ED.cur[0])}  y ${Math.round(ED.cur[1])}`:'';st.textContent=t;}}
function edToolR(){const t=ED.tool,B=ED.brush;return t==='start'?150:t==='oil'||t==='supply'||t==='ham'?40:t==='town'?Math.max(50,Math.min(240,B*1.3)):t==='rocks'?Math.max(12,Math.min(60,B*.35)):t==='forest'?B*1.3:t==='lower'?B*1.4:t==='bridge'?60:t==='road'?20:B;}
let edPrevTmr=0;function edPrevSoon(){clearTimeout(edPrevTmr);edPrevTmr=setTimeout(edPrev,350);}
function edPrev(){if(!ED.open)return;const c=cmCanon(ED.c);if(!c){ED.prevImg=null;edDraw();return;}const key=registerCustomMap(c);ED.tmpKeys.add(key);const keep={wk:WK,srand,B:BASES,S:BASE_SLOTS};
  try{setWorld(1);const cv=document.createElement('canvas');cv.width=640;cv.height=440;mapPreview(key,cv);ED.prevImg=cv;}catch(e){ED.prevImg=null;ED.msg='Preview failed: '+(e&&e.message||e);}finally{srand=keep.srand;BASES=keep.B;BASE_SLOTS=keep.S;setWorld(keep.wk);}edDraw();edUI();}
// ---- pointer input
function edDown(e){const cv=ED.cv;cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;ED.ptrs.set(e.pointerId,{sx,sy});
  if(ED.ptrs.size===2){if(ED.snap&&ED.stroke!==null||ED.snap){ED.c=JSON.parse(ED.snap);}ED.snap=null;ED.stroke=null;const [a,b]=[...ED.ptrs.values()];ED.pinch={d:Math.hypot(a.sx-b.sx,a.sy-b.sy),mx:(a.sx+b.sx)/2,my:(a.sy+b.sy)/2};edDraw();return;}
  if(ED.ptrs.size>2)return;const [x,y]=edS2W(sx,sy);ED.cur=[x,y];
  if(ED.tool==='pan'||e.button===1||e.button===2){ED.pan={sx,sy,vx:ED.view.x,vy:ED.view.y};return;}
  ED.snap=edSnap();const t=ED.tool;
  if(t==='raise'||t==='river'||t==='road'){ED.stroke={tool:t,P:[[x,y]]};}
  else if(t==='bridge'){ED.stroke={tool:t,P:[[x,y]],bridge:1};}
  else{ED.stroke={tool:t,P:[[x,y]],stamp:1,last:[x,y]};edStamp(t,x,y);ED.dirty=1;}
  edDraw();}
function edMove(e){const cv=ED.cv,r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,p=ED.ptrs.get(e.pointerId);const [x,y]=edS2W(sx,sy);ED.cur=[x,y];
  if(p){p.sx=sx;p.sy=sy;}
  if(ED.ptrs.size>=2&&ED.pinch){const [a,b]=[...ED.ptrs.values()],d=Math.hypot(a.sx-b.sx,a.sy-b.sy),mx=(a.sx+b.sx)/2,my=(a.sy+b.sy)/2,k=d/Math.max(1,ED.pinch.d),V=ED.view,z=Math.max(.12,Math.min(2.5,V.z*k));
    ED.userView=true;V.x=mx-(ED.pinch.mx-V.x)*(z/V.z)+0;V.y=my-(ED.pinch.my-V.y)*(z/V.z);V.z=z;ED.pinch={d,mx,my};edDraw();return;}
  if(ED.pan&&p){ED.userView=true;ED.view.x=ED.pan.vx+(sx-ED.pan.sx);ED.view.y=ED.pan.vy+(sy-ED.pan.sy);edDraw();return;}
  const S=ED.stroke;if(!S||!p){edDraw();return;}
  if(S.stamp){const rr=Math.max(10,edToolR()*.55);if(Math.hypot(x-S.last[0],y-S.last[1])>=rr&&['lower','forest','rocks','flat','erase'].includes(S.tool)){edStamp(S.tool,x,y);S.last=[x,y];}}
  else{const L=S.P[S.P.length-1];if(Math.hypot(x-L[0],y-L[1])>22/ED.view.z*.6+8)S.P.push([x,y]);}
  edDraw();}
function edUp(e){const had=ED.ptrs.delete(e.pointerId);if(ED.pinch){if(ED.ptrs.size<2)ED.pinch=null;return;}if(ED.pan){ED.pan=null;return;}const S=ED.stroke;if(!S||!had)return;ED.stroke=null;
  const r=ED.cv.getBoundingClientRect(),[x,y]=edS2W(e.clientX-r.left,e.clientY-r.top);
  if(S.bridge){const p0=S.P[0];let ang=null;const dx=x-p0[0],dy=y-p0[1];if(Math.hypot(dx,dy)>60/ED.view.z)ang=Math.round(Math.atan2(dy,dx)*180/Math.PI);else ang=edBridgeAt(p0[0],p0[1]);
    if(ang==null){ED.msg='Bridges go across water: tap a river, or drag from one bank across the water to the other.';ED.snap=null;edUI();return;}edStamp('bridge',p0[0],p0[1],ang);ED.dirty=1;}
  else if(!S.stamp){S.P.push([x,y]);edStrokeCommit(S.tool,S.P);ED.dirty=1;}
  if(ED.snap&&ED.snap!==edSnap())edPushUndo(ED.snap);ED.snap=null;ED.msg='';edChanged();}
function edCancel(e){ED.ptrs.delete(e.pointerId);if(ED.snap){ED.c=JSON.parse(ED.snap);ED.snap=null;}ED.stroke=null;ED.pan=null;if(ED.ptrs.size<2)ED.pinch=null;edDraw();}
function edWheel(e){e.preventDefault();const r=ED.cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,V=ED.view,z=Math.max(.12,Math.min(2.5,V.z*(e.deltaY<0?1.15:1/1.15)));ED.userView=true;V.x=sx-(sx-V.x)*(z/V.z);V.y=sy-(sy-V.y)*(z/V.z);V.z=z;edDraw();}
// ---- the screen
let edBuilt=false;
function edBuild(){if(edBuilt)return;edBuilt=true;
  const st=document.createElement('style');st.textContent=`#edOv{position:fixed;inset:0;z-index:9000;background:#0b0f0d;color:#e8e4d4;display:none;flex-direction:column;font:14px/1.3 system-ui,sans-serif;-webkit-user-select:none;user-select:none}#edOv.on{display:flex}
#edOv button,#edOv select,#edOv input,#edOv textarea{font:inherit;color:#e8e4d4;background:#1d2620;border:1px solid #3a4a3e;border-radius:6px;padding:7px 10px;min-height:38px}#edOv button{cursor:pointer}#edOv button:active,#edOv button.on{background:#3d5a2e;border-color:#8fbf5a}#edOv button:disabled{opacity:.4}
#edOv .top{display:flex;gap:6px;padding:6px 8px;flex-wrap:wrap;align-items:center;background:#121a15;border-bottom:1px solid #2a382d}#edOv .top b{font-size:16px;margin-right:4px}#edOv .top input{width:150px}
#edOv .main{flex:1;display:flex;min-height:0}#edOv .tools{display:flex;flex-direction:column;gap:4px;padding:6px;overflow:auto;background:#101713;border-right:1px solid #2a382d;width:84px;flex:none}#edOv .tools button{display:flex;flex-direction:column;align-items:center;gap:0;padding:5px 2px;min-height:48px;font-size:11px}#edOv .tools button span{font-size:20px;line-height:1.1}
#edOv .cvw{flex:1;position:relative;min-width:0}#edOv canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}#edStat{position:absolute;left:8px;bottom:6px;font-size:12px;opacity:.8;pointer-events:none;text-shadow:0 1px 2px #000}
#edOv .side{width:270px;flex:none;overflow:auto;padding:8px;background:#101713;border-left:1px solid #2a382d;display:flex;flex-direction:column;gap:8px}#edOv .side h4{margin:4px 0 2px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#9fb58a}#edOv .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}#edOv .row>*{flex:1 1 auto}#edOv .row label{flex:none;font-size:12px;opacity:.85}
#edOv .msg{padding:6px 8px;border-radius:6px;background:#22301f;font-size:13px}#edOv .res{padding:6px 8px;border-radius:6px;font-size:13px;margin:2px 0}#edOv .res.err{background:#4a1f1b;border-left:4px solid #e0443a}#edOv .res.warn{background:#4a3d18;border-left:4px solid #e8b030}#edOv .res.ok{background:#1f3a22;border-left:4px solid #5fbf5f}
#edOv .lib{display:flex;gap:4px;align-items:center}#edOv .lib span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#edOv textarea{width:100%;min-height:70px;font-size:11px;user-select:text;-webkit-user-select:text}#edOv .hint{font-size:12px;opacity:.75}
@media (max-width:760px){#edOv .main{flex-direction:column}#edOv .tools{flex-direction:row;width:auto;border-right:0;border-bottom:1px solid #2a382d;padding:4px}#edOv .tools button{min-width:54px}#edOv .side{width:auto;height:38%;border-left:0;border-top:1px solid #2a382d}#edOv .top input{width:110px}}`;
  document.head.append(st);
  const ov=document.createElement('div');ov.id='edOv';ov.innerHTML=`<div class="top"><b>Map editor</b><input id="edName" maxlength="28" aria-label="Map name" placeholder="Map name"><button id="edUndo">↶ Undo</button><button id="edRedo">↷ Redo</button><button id="edSave">💾 Save</button><button id="edPlay">▶ Play this map</button><button id="edX" style="margin-left:auto">✕ Close</button></div>
<div class="main"><div class="tools" id="edTools"></div><div class="cvw"><canvas id="edCv"></canvas><div id="edStat"></div></div><div class="side" id="edSide"></div></div>`;
  document.body.append(ov);ED.cv=$('edCv');
  for(const [id,ic,lab,hint] of ED_TOOLS){const b=document.createElement('button');b.type='button';b.dataset.t=id;b.title=hint;b.innerHTML=`<span>${ic}</span>${lab}`;b.onclick=()=>{ED.tool=id;ED.msg=hint;edUI();edDraw();};$('edTools').append(b);}
  const cv=ED.cv;cv.addEventListener('pointerdown',edDown);cv.addEventListener('pointermove',edMove);cv.addEventListener('pointerup',edUp);cv.addEventListener('pointercancel',edCancel);cv.addEventListener('pointerleave',()=>{if(!ED.ptrs.size){ED.cur=null;edDraw();}});cv.addEventListener('wheel',edWheel,{passive:false});cv.addEventListener('contextmenu',e=>e.preventDefault());
  $('edUndo').onclick=edUndo;$('edRedo').onclick=edRedo;$('edSave').onclick=edSave;$('edPlay').onclick=edPlay;$('edX').onclick=edClose;
  $('edName').oninput=e=>{ED.c.nm=e.target.value.slice(0,28);try{localStorage.setItem(ED_DRAFT_KEY,JSON.stringify(ED.c));}catch(_){}};
  window.addEventListener('resize',()=>{if(ED.open){edFit();edDraw();}});try{new ResizeObserver(()=>{if(ED.open){if(!ED.userView)edFit();edDraw();}}).observe(ED.cv.parentNode);}catch(e){}
  addEventListener('keydown',e=>{if(!ED.open)return;const k=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?edRedo():edUndo();}else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();edRedo();}else if(k==='escape')edClose();},true);}
function edSel(id,lab,opts,val,fn){const w=document.createElement('div');w.className='row';const l=document.createElement('label');l.textContent=lab;const s=document.createElement('select');for(const [v,t] of opts){const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o);}s.value=val;s.onchange=()=>fn(s.value);w.append(l,s);return w;}
function edBtn(t,fn,cls){const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=fn;if(cls)b.className=cls;return b;}
function edUI(){if(!ED.open||!edBuilt)return;const c=ED.c,side=$('edSide');
  document.querySelectorAll('#edTools button').forEach(b=>b.classList.toggle('on',b.dataset.t===ED.tool));$('edUndo').disabled=!ED.undo.length;$('edRedo').disabled=!ED.redo.length;if(document.activeElement!==$('edName'))$('edName').value=c.nm;
  if(side.contains(document.activeElement)&&/TEXTAREA|INPUT/.test(document.activeElement.tagName)&&document.activeElement.id!=='edBrush')return;
  side.innerHTML='';const add=(...n)=>side.append(...n);
  if(ED.msg){const m=document.createElement('div');m.className='msg';m.textContent=ED.msg;add(m);}
  const h=t=>{const e=document.createElement('h4');e.textContent=t;return e;};
  add(h('Map'));add(edSel('n','Players',[2,3,4,5,6,7,8].map(v=>[v,v+' players']),c.n,v=>{edPushUndo(edSnap());c.n=+v;if(c.sl.length>c.n)c.sl.length=c.n;edChanged();}));
  add(edSel('z','Size',CM_SIZES.map((t,i)=>[i,t+(i===1?' (like the built-in maps)':'')]),c.z,v=>{c.z=+v;edChanged();}));
  add(edSel('th','Look',[['desert','Desert'],['snow','Snow'],['green','Green']],c.th,v=>{c.th=v;edChanged();}));
  add(h('Brush & mirror'));
  {const w=document.createElement('div');w.className='row';const l=document.createElement('label');l.textContent='Brush';const r=document.createElement('input');r.type='range';r.id='edBrush';r.min=20;r.max=200;r.value=ED.brush;r.oninput=()=>{ED.brush=+r.value;edDraw();};w.append(l,r);add(w);}
  add(edSel('m','Mirror',[['off','Off'],['x','Left ↔ right'],['y','Top ↔ bottom'],['p','Turn 180°'],['q','4-way']],ED.mirror,v=>{ED.mirror=v;edUI();edDraw();}));
  if(ED.tool==='town')add(edSel('s','Town look',ED_STYLE_NAMES.map((t,i)=>[i,t]),ED.style,v=>{ED.style=+v;}));
  {const w=document.createElement('div');w.className='row';w.append(edBtn('Copy to other side',edApplySym),edBtn('Flip ↔',()=>edFlip(-1,1)),edBtn('Flip ↕',()=>edFlip(1,-1)),edBtn('Turn 180°',()=>edFlip(-1,-1)));add(w);}
  {const w=document.createElement('div');w.className='row';w.append(edBtn(ED.showPrev?'Terrain preview: on':'Terrain preview: off',()=>{ED.showPrev=!ED.showPrev;if(ED.showPrev)edPrev();else edDraw();edUI();},ED.showPrev?'on':''),edBtn('Fit view',()=>{edFit();edDraw();}),edBtn('New map',()=>{edPushUndo(edSnap());ED.c=edBlank();ED.id=null;ED.res=null;ED.msg='Blank map.';edChanged();}));add(w);}
  const cnt=`${c.sl.length}/${c.n} starts · ${c.oil.length} oil · ${(c.hm||[]).length} hamlets · ${c.fl.length} supply · ${c.ct.length} towns`;const sm=document.createElement('div');sm.className='hint';sm.textContent=cnt+' · '+(ED_TOOLS.find(t=>t[0]===ED.tool)||[])[3];add(sm);
  add(h('Fair-play check'));add(edBtn('Check this map',()=>{ED.res=edCheck(ED.c);edUI();}));
  for(const r of (ED.res||[])){const d=document.createElement('div');d.className='res '+r.l;d.textContent=r.m;add(d);}
  add(h('Share'));
  {const w=document.createElement('div');w.className='row';w.append(edBtn('Copy code',()=>{const t=edShareText();t?edCopy(t,'Code'):(ED.msg='Place at least 2 start positions first.',edUI());}),edBtn('Copy link',()=>{const t=edShareText();t?edCopy(location.origin+location.pathname+'#map='+t,'Link'):(ED.msg='Place at least 2 start positions first.',edUI());}),edBtn('Download file',edDownload));add(w);}
  {const ta=document.createElement('textarea');ta.id='edCode';ta.placeholder='Paste a map code or link here, then press Import';add(ta);
   const w=document.createElement('div');w.className='row';const fl=document.createElement('input');fl.type='file';fl.accept='.ww3map,.txt,text/plain';fl.onchange=()=>{const f=fl.files[0];if(!f)return;f.text().then(t=>{if(edImportToLib(t))edLoadCode(t);else{ED.msg='That file is not a World War 3 map.';edUI();}});};
   w.append(edBtn('Import',()=>{const t=ta.value;if(edImportToLib(t))edLoadCode(t);else{ED.msg='That is not a World War 3 map code.';edUI();}}),fl);add(w);}
  add(h('My maps (this device)'));const lib=edLib();if(!lib.length){const e=document.createElement('div');e.className='hint';e.textContent='Nothing saved yet. Press Save.';add(e);}
  for(const m of lib){const d=document.createElement('div');d.className='lib';const s=document.createElement('span');s.textContent=m.name;d.append(s,edBtn('Open',()=>edLoadCode(m.code,m.id)),edBtn('🗑',()=>{edLibSet(edLib().filter(x=>x.id!==m.id));edUI();}));add(d);}}
function edOpen(){edBuild();if(!ED.c){let d=null;try{d=JSON.parse(localStorage.getItem(ED_DRAFT_KEY)||'null');}catch(e){}ED.c=d&&Array.isArray(d.sl)&&Array.isArray(d.rv)?Object.assign(edBlank(),d):edBlank();}
  ED.open=true;$('edOv').classList.add('on');$('menu')&&($('menu').style.visibility='hidden');ED.msg=ED.msg||'';requestAnimationFrame(()=>{edFit();edUI();edDraw();});}
function edClose(){ED.open=false;$('edOv')&&$('edOv').classList.remove('on');$('menu')&&($('menu').style.visibility='');for(const k of ED.tmpKeys){if(!edLib().some(e=>e.code===customMapCode(k))&&!(typeof setup!=='undefined'&&setup.map===k)){delete MAPS[k];delete CM[k];}}ED.tmpKeys.clear();
  try{if(typeof mapCards==='function')mapCards();}catch(e){}}
// ---- hooks into the menu
// saved maps under "My maps" in the battlefield list (skirmish and online lobbies share this list)
function editorAddMaps(sel){const lib=edLib();if(!lib.length&&!(typeof setup!=='undefined'&&setup.map&&CM[setup.map]))return;const og=document.createElement('optgroup');og.label='My maps';const seen=new Set();
  const keys=[];for(const e of lib){const k=registerCustomMap(e.code);if(k&&!seen.has(k)){seen.add(k);keys.push(k);}}if(typeof setup!=='undefined'&&CM[setup.map]&&!seen.has(setup.map))keys.push(setup.map);
  for(const k of keys){const o=document.createElement('option');o.value=k;o.textContent=`${MAPS[k].name} (custom, 2–${MAPS[k].max} players)`;og.append(o);}sel.append(og);}
function edAddMenuButton(){const po=$('playOnline');if(!po||$('edBtn'))return;const b=document.createElement('button');b.type='button';b.id='edBtn';b.className=po.className||'';b.textContent='🗺 Map editor';b.onclick=()=>{try{initAudio();}catch(e){}edOpen();};po.parentNode.insertBefore(b,po.nextSibling);}
function edToast(t){const d=document.createElement('div');d.textContent=t;d.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:max(18px,env(safe-area-inset-bottom,0px));z-index:9500;background:#22301f;color:#e8e4d4;border:1px solid #8fbf5a;border-radius:8px;padding:10px 14px;max-width:90vw;font:14px system-ui';document.body.append(d);setTimeout(()=>d.remove(),9000);}
// a shared link (…/#map=CODE) adds the map to this device's list
function edHashImport(){try{const m=location.hash.match(/^#map=(.+)$/);if(!m)return;const k=edImportToLib(m[1]);history.replaceState(null,'',location.pathname+location.search);
  if(k){setup.map=k;setup.slot=-1;setup.st=[];setup.stK=null;try{mapCards();}catch(e){}edToast(`Map “${MAPS[k].name}” added. It is chosen as your battlefield (Skirmish and Play online).`);}else edToast('That map link is not valid.');}catch(e){}}
try{edAddMenuButton();}catch(e){}
try{if(typeof mapCards==='function')mapCards();}catch(e){} // the list was built before this file loaded: add "My maps"
try{edHashImport();}catch(e){}
