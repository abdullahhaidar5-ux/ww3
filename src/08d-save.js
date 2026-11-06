/* ================= SAVE GAMES (Abdullah 2026-11-05: "Make it so a game can be saved.") =================
   Builds on the host-migration checkpoint (07b-ckpt.js: ckEncode / ckRestore / ckPack / ckUnpack) - there is no second
   serializer. A save = the checkpoint (whole battle) + what is needed to rebuild the match around it: the newGame()
   arguments (map, seed, nations, teams, colours, slots), the camera, the squads and a minimap thumbnail.
   Stored in IndexedDB (database "ww3-saves": "meta" = the list, "data" = the packed checkpoints), a copy can be
   downloaded as a .ww3save file and loaded on another PC. One rotating "Autosave" slot is written every 3 minutes.
   Loading = newGame(saved arguments) -> ckRestore(checkpoint) -> the normal loading screen -> paused with "Press P". */
const SV_FMT=1,SV_MAGIC='WW3SAVE',SV_AUTO_MS=180000,SV_MAX=40;
const SAVE={busy:false,autoT:performance.now(),lastErr:'',ok:true};
{const _ng=newGame;newGame=function(o){const r=_ng.apply(this,arguments);try{G.ng=JSON.parse(JSON.stringify(o));}catch(e){}return r;};}  // remember how this match was built
function svClock(t){t=Math.max(0,Math.floor(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
function svEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
/* ---------- storage ---------- */
function svDB(){return new Promise((res,rej)=>{let q;try{q=indexedDB.open('ww3-saves',1);}catch(e){rej(e);return;}
  q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'id'});if(!d.objectStoreNames.contains('data'))d.createObjectStore('data');};
  q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error||new Error('storage blocked'));q.onblocked=()=>rej(new Error('storage blocked'));});}
function svTx(stores,mode,fn){return svDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction(stores,mode);let out;try{out=fn(tx);}catch(e){rej(e);return;}
  tx.oncomplete=()=>{db.close();res(out&&out.result!==undefined?out.result:out);};tx.onerror=()=>{db.close();rej(tx.error);};tx.onabort=()=>{db.close();rej(tx.error||new Error('aborted'));};}));}
function svList(){return svTx(['meta'],'readonly',tx=>tx.objectStore('meta').getAll()).then(a=>{a=(a||[]).filter(r=>r&&r.id);a.sort((x,y)=>y.ts-x.ts);return a;});}
function svPut(meta,packed){return svTx(['meta','data'],'readwrite',tx=>{tx.objectStore('meta').put(meta);tx.objectStore('data').put(packed,meta.id);});}
function svGetData(id){return svTx(['data'],'readonly',tx=>tx.objectStore('data').get(id));}
function svDel(id){return svTx(['meta','data'],'readwrite',tx=>{tx.objectStore('meta').delete(id);tx.objectStore('data').delete(id);});}
function svStorageMsg(e){const m=String(e&&e.message||e||'');return 'Your browser is blocking game storage ('+(m||'unknown')+'). Use "Download save" instead, or allow site data for this page.';}
/* ---------- capture ---------- */
function svThumb(){try{if(typeof mm==='undefined'||!mm||!mm.width)return null;const c=document.createElement('canvas');c.width=160;c.height=Math.max(1,Math.round(160*mm.height/mm.width));c.getContext('2d').drawImage(mm,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.7);}catch(e){return null;}}
function svCanSave(){return !!(G&&!G.over&&!G.rp&&MODE==='single'&&!window.LOADING&&G.ng&&!G.sandbox);}
function svMeta(id,name,kind){const T=G.teams[ME]||G.teams[0],mp=MAPS[G.mapKey];return {id,name,kind,ts:Date.now(),fmt:SV_FMT,pv:NET_PV,map:G.mapKey,mapName:mp&&mp.name||G.mapKey,fac:T.fac,facName:T.F&&T.F.name||T.fac,
  t:Math.round(G.t),camp:G.camp?G.camp.id:null,n:G.teams.filter(x=>!x.reb).length,thumb:svThumb()};}
async function svCapture(name,kind){
  const ck=ckEncode();ck.sv={me:ME,ng:G.ng,cam:{x:cam.x,y:cam.y,tx:cam.tx,ty:cam.ty,dist:cam.dist,yaw:cam.yaw,z:cam.z},
    setup:(()=>{try{return JSON.parse(JSON.stringify(setup));}catch(e){return null;}})()};
  const meta=svMeta(kind==='auto'?'auto':'m:'+String(name).toLowerCase(),kind==='auto'?'Autosave':name,kind||'manual');
  const packed=await ckPack(ck);return {meta,packed};}
async function svSave(name,kind){
  if(!svCanSave())return {ok:false,msg:'Saving is only possible during a single-player battle.'};
  if(SAVE.busy)return {ok:false,msg:'Still saving…'};SAVE.busy=true;
  try{const rec=await svCapture(name,kind);
    try{await svPut(rec.meta,rec.packed);}catch(e){SAVE.ok=false;SAVE.lastErr=svStorageMsg(e);return {ok:false,msg:SAVE.lastErr,rec};}
    SAVE.ok=true;
    if(kind!=='auto'){const all=await svList().catch(()=>[]);const man=all.filter(x=>x.kind!=='auto');for(const x of man.slice(SV_MAX))svDel(x.id).catch(()=>{});}
    return {ok:true,rec};}
  catch(e){console.warn('save failed',e);return {ok:false,msg:'The game could not be saved: '+(e&&e.message||e)};}
  finally{SAVE.busy=false;}}
/* autosave: every 3 minutes of real play, started in an idle moment; the heavy part (compression, storage) is asynchronous */
function svAutoTick(){if(performance.now()-SAVE.autoT<SV_AUTO_MS)return;if(!svCanSave()||G.paused||SAVE.busy||!SAVE.ok)return;SAVE.autoT=performance.now();
  const go=()=>{if(svCanSave()&&!G.paused)svSave('Autosave','auto');};
  if(typeof requestIdleCallback==='function')requestIdleCallback(go,{timeout:4000});else setTimeout(go,50);}
setInterval(()=>{try{svAutoTick();}catch(e){}},5000);
/* ---------- state hash (positions, HP, money, town owners) - used by orch/savetest.mjs ---------- */
function svStateHash(){let h=2166136261>>>0;const mix=v=>{h^=v|0;h=Math.imul(h,16777619)>>>0;};const f=x=>Math.round(x*10);
  const L=G.ents.filter(e=>!e.dead).sort((a,b)=>a.id-b.id);for(const e of L){mix(e.id);mix(f(e.x));mix(f(e.y));mix(Math.round(e.hp));mix(e.team);}
  for(const T of G.teams){mix(Math.round(T.credits));mix(T.kills|0);}for(const t of (G.towns||[])){mix(t.ow);mix(Math.round(t.un));mix(Math.round(t.rate*10));}
  return {h,units:L.length,money:G.teams.map(T=>Math.round(T.credits)),towns:(G.towns||[]).map(t=>t.ow).join(',')};}
/* ---------- load ---------- */
function svCheck(meta){if(!meta||meta.fmt!==SV_FMT||meta.pv!==NET_PV)return 'This save is from an older version and can\'t be loaded.';return '';}
async function svLoad(meta,packed){
  const bad=svCheck(meta);if(bad)return {ok:false,msg:bad};
  let ck;try{ck=await ckUnpack(packed);}catch(e){return {ok:false,msg:'This save file is damaged and can\'t be loaded.'};}
  const sv=ck&&ck.sv,o=sv&&sv.ng;
  if(!sv||!o||!Array.isArray(o.facs)||!Array.isArray(ck.ents)||(ck.v|0)<2||!o.facs.every(f=>FKEYS.includes(f))||!MAPS[o.map])return {ok:false,msg:'This save is from an older version and can\'t be loaded.'};
  if(G&&!G.over){try{quitGame();}catch(e){}}
  try{MODE='single';ME=sv.me|0;
    TERR_DEFER=true;try{newGame(JSON.parse(JSON.stringify(o)));ckRestore(ck);}finally{TERR_DEFER=false;}
    G.ldHold=1;G.sel=[];
    const cm=sv.cam;
    try{$('menu').hidden=true;}catch(e){}
    await afterStart();
    if(G&&cm&&Number.isFinite(cm.x)){for(const k of ['x','y','tx','ty','dist','yaw','z'])if(Number.isFinite(cm[k]))cam[k]=cm[k];cam._xl=cam.x;cam._yl=cam.y;}
    if(G){G.ldHold=0;G.paused=false;togglePause(true);$('pauseSub').textContent='Game loaded. Press P to continue.';SAVE.autoT=performance.now();}
    return {ok:true};}
  catch(e){console.error('load failed',e);try{G=null;MODE='single';ME=0;loadHide();$('menu').hidden=false;}catch(_){}return {ok:false,msg:'This save could not be loaded ('+(e&&e.message||e)+').'};}}
async function svLoadId(id){let meta;try{const L=await svList();meta=L.find(x=>x.id===id);}catch(e){return {ok:false,msg:svStorageMsg(e)};}
  if(!meta)return {ok:false,msg:'That save no longer exists.'};const bad=svCheck(meta);if(bad)return {ok:false,msg:bad};
  let packed;try{packed=await svGetData(id);}catch(e){return {ok:false,msg:svStorageMsg(e)};}if(!packed)return {ok:false,msg:'That save is empty or damaged.'};
  return svLoad(meta,packed);}
/* ---------- files ---------- */
function svDownload(meta,packed){const body=JSON.stringify({magic:SV_MAGIC,fmt:SV_FMT,meta,data:packed});const b=new Blob([body],{type:'application/octet-stream'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=String(meta.name||'battle').replace(/[^\w\- .]+/g,'_').slice(0,60)+'.ww3save';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
async function svDownloadId(id){const L=await svList(),m=L.find(x=>x.id===id),d=m&&await svGetData(id);if(!m||!d)return false;svDownload(m,d);return true;}
async function svReadFile(file){let j;try{j=JSON.parse(await file.text());}catch(e){return {ok:false,msg:'That is not a World War 3 save file.'};}
  if(!j||j.magic!==SV_MAGIC||typeof j.data!=='string'||!j.meta)return {ok:false,msg:'That is not a World War 3 save file.'};
  const bad=svCheck(j.meta);if(bad)return {ok:false,msg:bad};return {ok:true,meta:j.meta,packed:j.data};}
/* ---------- dialogs ---------- */
function svOv(id,build){let o=$(id);if(o)o.remove();o=document.createElement('div');o.id=id;o.className='overlay';o.style.cssText='z-index:900;background:rgba(8,11,10,.82);display:flex;align-items:center;justify-content:center';
  const c=document.createElement('div');c.className='card';c.style.cssText='max-width:720px;width:min(720px,94vw);max-height:90vh;overflow:auto;background:rgba(16,21,13,.97);border:1px solid #4a5a3a;border-radius:10px;padding:18px 22px';o.appendChild(c);document.body.appendChild(o);build(c,()=>o.remove());return o;}
function svRow(m){const d=new Date(m.ts);const st=d.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  const old=svCheck(m);return {title:svEsc(m.name),sub:svEsc((m.camp?'Mission · ':'')+m.mapName+' · '+m.facName+' · '+svClock(m.t)+' in · '+st)+(old?'<br><span style="color:#e07a6a">'+svEsc(old)+'</span>':''),old};}
function svBtn(t,fn,ghost,dis){const b=document.createElement('button');b.type='button';b.className='big'+(ghost?' ghost':'');b.textContent=t;b.style.cssText='font-size:15px;padding:7px 14px;margin:2px';if(dis)b.disabled=true;b.onclick=fn;return b;}
function svMsg(c,txt,bad){let m=c.querySelector('.svmsg');if(!m){m=document.createElement('div');m.className='svmsg';m.style.cssText='margin:8px 0;min-height:1.3em;font-size:15px';c.appendChild(m);}m.style.color=bad?'#e07a6a':'#9fd36b';m.textContent=txt||'';}
function svListUI(c,list,opts){const box=document.createElement('div');box.style.cssText='display:flex;flex-direction:column;gap:6px;margin:8px 0';
  if(!list.length){const e=document.createElement('div');e.className='empty';e.textContent=opts.empty||'No saved games yet.';box.appendChild(e);}
  for(const m of list){const r=svRow(m),row=document.createElement('div');row.className='svrow';row.dataset.id=m.id;row.style.cssText='display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.05);border:1px solid #3a4630;border-radius:8px;padding:6px';
    const im=document.createElement('div');im.style.cssText='width:96px;height:64px;flex:none;background:#1a2016 center/cover no-repeat;border-radius:4px'+(m.thumb?';background-image:url('+m.thumb+')':'');row.appendChild(im);
    const tx=document.createElement('div');tx.style.cssText='flex:1;min-width:0;font-size:15px;line-height:1.35';tx.innerHTML='<b>'+r.title+'</b>'+(m.kind==='auto'?' <small style="opacity:.6">(automatic)</small>':'')+'<br><span style="opacity:.8">'+r.sub+'</span>';row.appendChild(tx);
    opts.actions(m,r,row).forEach(b=>row.appendChild(b));box.appendChild(row);}
  c.appendChild(box);return box;}
async function svSaveDialog(){if(!G)return;
  svOv('svOv',async(c,close)=>{c.innerHTML='<h1>Save game</h1>';
    if(!svCanSave()){c.insertAdjacentHTML('beforeend','<p>'+(MODE!=='single'?'Online battles can only be saved by the host (coming soon).':'This battle can\'t be saved.')+'</p>');c.appendChild(svBtn('Close',close,true));return;}
    const inp=document.createElement('input');inp.id='svName';inp.maxLength=40;inp.style.cssText='width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:8px;background:var(--panel2);color:var(--fg);border:1px solid var(--line);margin:6px 0';
    const mp=MAPS[G.mapKey],T=G.teams[ME];inp.value=((mp&&mp.name||G.mapKey)+' · '+(T.F&&T.F.name||T.fac)+' · '+svClock(G.t)).slice(0,40);c.appendChild(inp);
    const row=document.createElement('div');let list=[];
    try{list=(await svList()).filter(m=>m.kind!=='auto'||true);}catch(e){svMsg(c,svStorageMsg(e),true);}
    const sv=svBtn('Save',async()=>{const name=inp.value.trim().replace(/\s+/g,' ');if(!name){svMsg(c,'Give the save a name.',true);return;}
      if(list.some(m=>m.id==='m:'+name.toLowerCase())&&!sv.dataset.ok){sv.dataset.ok=1;sv.textContent='Overwrite "'+name.slice(0,18)+'"?';svMsg(c,'A save with that name exists. Press again to overwrite it.',true);return;}
      sv.disabled=true;svMsg(c,'Saving…');const r=await svSave(name,'manual');
      if(r.ok){pushLog('Game saved: '+name,'g');close();}else{svMsg(c,r.msg,true);sv.disabled=false;
        if(r.rec)c.appendChild(svBtn('Download save instead',()=>svDownload(r.rec.meta,r.rec.packed),true));}});
    inp.oninput=()=>{delete sv.dataset.ok;sv.textContent='Save';};
    row.appendChild(sv);row.appendChild(svBtn('Download save',async()=>{try{const r=await svCapture(inp.value.trim()||'battle','manual');svDownload(r.meta,r.packed);svMsg(c,'Downloaded as a .ww3save file.');}catch(e){svMsg(c,'Could not make the file: '+(e&&e.message||e),true);}},true));
    row.appendChild(svBtn('Cancel',close,true));c.appendChild(row);
    c.insertAdjacentHTML('beforeend','<div class="label">Your saves (click one to use its name)</div>');
    svListUI(c,list,{empty:'No saved games yet.',actions:m=>[svBtn('Use name',()=>{if(m.kind!=='auto'){inp.value=m.name;inp.oninput();}},true,m.kind==='auto')]});
    inp.focus();inp.select();});}
async function svLoadDialog(){
  svOv('svLd',async(c,close)=>{c.innerHTML='<h1>Load game</h1>';let list=[];try{list=await svList();}catch(e){svMsg(c,svStorageMsg(e),true);}
    const fi=document.createElement('input');fi.type='file';fi.accept='.ww3save,application/json';fi.style.display='none';
    fi.onchange=async()=>{const f=fi.files&&fi.files[0];if(!f)return;svMsg(c,'Reading file…');const r=await svReadFile(f);if(!r.ok){svMsg(c,r.msg,true);return;}
      svMsg(c,'Loading…');const lr=await svLoad(r.meta,r.packed);if(lr.ok)close();else svMsg(c,lr.msg,true);};
    const top=document.createElement('div');top.appendChild(svBtn('Load from file…',()=>fi.click(),true));top.appendChild(svBtn('Close',close,true));top.appendChild(fi);c.appendChild(top);
    const render=()=>{c.querySelectorAll('.svlist').forEach(x=>x.remove());const box=svListUI(c,list,{empty:'No saved games yet. Press Esc during a battle and choose "Save game".',actions:(m,r,row)=>{
      const go=svBtn('Load',async()=>{if(r.old){svMsg(c,svCheck(m),true);return;}svMsg(c,'Loading…');const lr=await svLoadId(m.id);if(lr.ok)close();else svMsg(c,lr.msg,true);},false,!!r.old);
      const dl=svBtn('Download',()=>svDownloadId(m.id),true);
      const del=svBtn('Delete',()=>{if(!del.dataset.ok){del.dataset.ok=1;del.textContent='Sure?';setTimeout(()=>{del.dataset.ok='';del.textContent='Delete';},3000);return;}
        svDel(m.id).then(()=>{list=list.filter(x=>x.id!==m.id);render();svMenuSync();}).catch(e=>svMsg(c,svStorageMsg(e),true));},true);return [go,dl,del];}});box.classList.add('svlist');};
    render();});}
/* ---------- buttons: pause menu + main menu ---------- */
let svLatest=null;
async function svMenuSync(){const cb=$('svContinue');if(!cb)return;try{const L=await svList();svLatest=L.find(m=>!svCheck(m))||null;const any=L.length>0;
  cb.hidden=!svLatest;if(svLatest)cb.textContent='▶ Continue — '+svLatest.mapName+' · '+svLatest.facName+' · '+svClock(svLatest.t);
  const lb=$('svLoadBtn');if(lb)lb.hidden=false;}catch(e){cb.hidden=true;}}
function svInstall(){const rs=$('resumeBtn');if(rs&&!$('svSave')){const b=document.createElement('button');b.id='svSave';b.type='button';b.className='big ghost';b.textContent='Save game';b.onclick=()=>svSaveDialog();rs.after(b);}
  const st=$('start');if(st&&!$('svLoadBtn')){const l=document.createElement('button');l.id='svLoadBtn';l.type='button';l.className='big ghost';l.textContent='Load game';l.title='Load a saved battle (or a .ww3save file)';l.onclick=()=>svLoadDialog();
    const c=document.createElement('button');c.id='svContinue';c.type='button';c.className='big';c.hidden=true;c.onclick=async()=>{if(!svLatest)return;c.disabled=true;const r=await svLoadId(svLatest.id);c.disabled=false;if(!r.ok)alert(r.msg);};
    st.before(c);st.after(l);svMenuSync();}}
try{svInstall();new MutationObserver(()=>{if(!$('menu').hidden)svMenuSync();}).observe($('menu'),{attributes:true,attributeFilter:['hidden']});}catch(e){console.warn('save buttons',e);}
