// "Report a problem" — one click opens a pre-filled GitHub issue (label `player`). No personal data: only version, mode, nation, map, last console errors.
(function(){
const ERR=[];
function push(s){try{ERR.push(String(s).slice(0,240));if(ERR.length>20)ERR.shift();}catch(e){}}
window.addEventListener('error',e=>push((e&&e.message||'error')+(e&&e.filename?' @'+String(e.filename).split('/').pop()+':'+e.lineno:'')));
window.addEventListener('unhandledrejection',e=>push('promise: '+(e&&e.reason&&e.reason.message||e&&e.reason||'')));
const ce=console.error;console.error=function(){try{push(Array.prototype.map.call(arguments,a=>a&&a.message||String(a)).join(' '));}catch(e){}return ce.apply(console,arguments);};
function info(){let g='menu';try{if(typeof G!=='undefined'&&G){g='mode='+MODE+' nation='+(G.pl&&G.pl[ME]&&G.pl[ME].fac||'?')+' map='+(G.map&&(G.map.name||G.map.id)||G.mapId||'?')+' t='+Math.round(G.t||0)+'s';}}catch(e){}
  try{if(window.GC&&GC.on)g+=' grand-map day='+(GC.day||'?');}catch(e){}return g;}
function report(){
  const body='**What happened?** (write here)\n\n**What did you expect?**\n\n---\n_Auto-filled, no personal data:_\n- Page: '+location.pathname+'\n- State: '+info()+'\n- Browser: '+navigator.userAgent.slice(0,120)+'\n- Screen: '+innerWidth+'x'+innerHeight+'\n- Last errors:\n```\n'+(ERR.length?ERR.join('\n'):'none')+'\n```\n';
  const url='https://github.com/abdullahhaidar5-ux/ww3/issues/new?labels=player&title='+encodeURIComponent('Problem: ')+'&body='+encodeURIComponent(body).slice(0,6000);
  window.open(url,'_blank','noopener');}
// Form first: what happened (optional) + an automatic attachment (picture, version, mode/map/nations, last errors, replay).
// "Download report file" saves one small .json to send to Abdullah on Discord; "Open on GitHub" is the older route.
function shot(){return new Promise(res=>{try{const c=document.querySelector('canvas');if(!c)return res('');requestAnimationFrame(()=>{try{const u=c.toDataURL('image/jpeg',.5);res(u&&u.length>3000&&u.length<900000?u:'');}catch(e){res('');}});}catch(e){res('');}});}
function b64(u){let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);}
async function makeFile(text){const f={kind:'ww3-problem-report',made:new Date().toISOString().slice(0,10),version:(typeof NET_PV==='number'?NET_PV:0),page:location.pathname,state:info(),text:String(text||'').slice(0,2000),errors:ERR.slice(),screen:innerWidth+'x'+innerHeight};
  f.screenshot=await shot();
  try{if(typeof rpPack==='function'){const u=await rpPack();if(u&&u.length<4e6)f.replay=b64(u);}}catch(e){}
  return f;}
function form(){const old=document.getElementById('rpForm');if(old)old.remove();const d=document.createElement('div');d.id='rpForm';
  d.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font:14px IBM Plex Sans,sans-serif';
  d.innerHTML='<div style="background:#14181d;color:#dde;border:1px solid #3a424c;border-radius:8px;padding:18px;width:min(440px,92vw)"><div style="font-weight:700;margin-bottom:8px">Report a problem</div>'+
  '<textarea id="rpTxt" rows="4" placeholder="What happened? (optional)" style="width:100%;box-sizing:border-box;background:#0b0e12;color:#dde;border:1px solid #3a424c;border-radius:4px;padding:6px"></textarea>'+
  '<div style="font-size:12px;opacity:.75;margin:8px 0">Attached automatically: a picture of the game, game version, mode/map/nations, the last error messages and the battle replay. No names, emails or IP addresses are included or stored.</div>'+
  '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" class="ghost" id="rpX">Cancel</button><button type="button" class="ghost" id="rpGh">Open on GitHub</button><button type="button" class="ghost" id="rpDl">Download report file</button></div><div id="rpMsg" style="font-size:12px;margin-top:6px"></div></div>';
  document.body.appendChild(d);
  const q=id=>d.querySelector('#'+id);q('rpX').onclick=()=>d.remove();q('rpGh').onclick=()=>{report();d.remove();};
  q('rpDl').onclick=async()=>{q('rpMsg').textContent='Preparing...';const f=await makeFile(q('rpTxt').value);const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(f)],{type:'application/json'}));a.download='ww3-report-'+f.made+'.json';document.body.appendChild(a);a.click();a.remove();
    q('rpMsg').textContent='Saved. Please send that file to Abdullah on Discord.';};}
window.wwReportProblem=form;window.wwReportFile=makeFile;
function mk(cls,id){const b=document.createElement('button');b.className=cls;b.id=id;b.textContent='Report a problem';b.title='Describe a problem and save a report file to send to Abdullah';b.onclick=form;return b;}
function add(){
  const op=document.getElementById('openSettings');
  if(op&&op.parentNode&&!document.getElementById('rpMenu')){const b=mk('big ghost','rpMenu');b.style.cssText='font-size:15px;padding:7px 16px';op.parentNode.appendChild(b);}
  const s=document.getElementById('aSet');
  if(s&&s.parentNode&&!document.getElementById('rpPause')){const b=mk(s.className,'rpPause');b.setAttribute('role','menuitem');s.parentNode.insertBefore(b,s.nextSibling);}
  const st=document.getElementById('sDone');
  if(st&&st.parentNode&&!document.getElementById('rpSet')){const b=mk('ghost','rpSet');st.parentNode.insertBefore(b,st);}
}
add();setTimeout(add,1500);
})();
