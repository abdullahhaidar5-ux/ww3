// "Report a problem" — one click opens a pre-filled GitHub issue (label `player`). No personal data: only version, mode, nation, map, last console errors.
(function(){
const ERR=[];
function push(s){try{ERR.push(String(s).slice(0,240));if(ERR.length>20)ERR.shift();}catch(e){}}
window.addEventListener('error',e=>push((e&&e.message||'error')+(e&&e.filename?' @'+String(e.filename).split('/').pop()+':'+e.lineno:'')));
window.addEventListener('unhandledrejection',e=>push('promise: '+(e&&e.reason&&e.reason.message||e&&e.reason||'')));
const ce=console.error;console.error=function(){try{push(Array.prototype.map.call(arguments,a=>a&&a.message||String(a)).join(' '));}catch(e){}return ce.apply(console,arguments);};
function info(){let g='menu';try{if(typeof G!=='undefined'&&G){g='mode='+MODE+' nation='+(G.pl&&G.pl[ME]&&G.pl[ME].fac||'?')+' map='+(G.map&&(G.map.name||G.map.id)||G.mapId||'?')+' t='+Math.round(G.t||0)+'s';}}catch(e){}
  return g;}
function report(){
  const body='**What happened?** (write here)\n\n**What did you expect?**\n\n---\n_Auto-filled, no personal data:_\n- Page: '+location.pathname+'\n- State: '+info()+'\n- Browser: '+navigator.userAgent.slice(0,120)+'\n- Screen: '+innerWidth+'x'+innerHeight+'\n- Last errors:\n```\n'+(ERR.length?ERR.join('\n'):'none')+'\n```\n';
  const url='https://github.com/abdullahhaidar5-ux/ww3/issues/new?labels=player&title='+encodeURIComponent('Problem: ')+'&body='+encodeURIComponent(body).slice(0,6000);
  window.open(url,'_blank','noopener');}
window.wwReportProblem=report;
function mk(cls,id){const b=document.createElement('button');b.className=cls;b.id=id;b.textContent='Report a problem';b.title='Opens a pre-filled bug report (needs a free GitHub account)';b.onclick=report;return b;}
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
