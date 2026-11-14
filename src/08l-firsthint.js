// FIRST-TEN-MINUTES HINT (polishE 2026-11-10): each mode opens with a short, skippable "what do I do first" card, shown once per mode
// (localStorage ww3_fh_<mode>), re-openable from the HUD "?" button. Esc / Got it closes. One card, text per mode; the guided lessons stay in the Tutorial system (08b-social).
const FH_TEXT={
  'Battle':['Battle: what to do first','Send the Supply Truck to a supply field: it hauls money back to your Command Center. Build a Supply Depot beside a far field.|Dozer: build Barracks, then a War Factory (Build tab), then train units there.|Supply lines (L): your units refill ammo near your buildings and on the green roads out of your Command Center and Supply Depots - push them forward with depots.|Left-click selects, right-click moves or attacks. Destroy every enemy building to win.'],
  'Mission':['Mission: what to do first','Read the objective at the top of the screen.|Left-click selects your units, right-click moves or attacks.|The mission ends when the objective is done or your force is lost.'],
  'Test range':['Test range: what to do first','Nothing here counts: spawn any unit or building and try it out.|Left-click selects, right-click moves or attacks.|Press Esc for the menu when you are done.']};
function fhKey(m){return 'ww3_fh_'+String(m).replace(/\W/g,'');}
/* automated test browsers (navigator.webdriver) never get the auto-popup - it would sit over the units the tests click; orch/polishplay.mjs sets ww3_fh_test=1 to see it */
function fhBot(){try{return !!navigator.webdriver&&localStorage.getItem('ww3_fh_test')!=='1';}catch(e){return false;}}
function fhSeen(m){try{return localStorage.getItem(fhKey(m))==='1';}catch(e){return true;}}
function fhClose(mark){const el=document.getElementById('fhint');if(!el)return false;const m=el.dataset.m;el.remove();if(mark){try{localStorage.setItem(fhKey(m),'1');}catch(e){}}return true;}
function fhMode(){try{if(G&&!G.over&&!G.tut&&G.teams&&G.teams[ME]&&typeof modeName==='function'){const m=modeName();if(m)return m;}}catch(e){}
  return '';}
function fhShow(force,mode){mode=mode||fhMode();const T=FH_TEXT[mode];if(!T)return false;if(document.getElementById('fhint')){fhClose(true);if(force)return false;}
  const el=document.createElement('div');el.id='fhint';el.dataset.m=mode;el.setAttribute('role','dialog');
  el.style.cssText='position:fixed;left:50%;top:64px;transform:translateX(-50%);width:min(520px,92vw);z-index:8500;background:#101c2aee;border:1px solid #5a7a96;border-radius:10px;color:#e8e4d8;font:15px/1.5 system-ui,sans-serif;padding:12px 16px 10px;box-shadow:0 6px 24px #0008';
  el.innerHTML='<div style="font-weight:700;font-size:16px;margin-bottom:6px;color:#ffe6a8">'+T[0]+'</div>'+T[1].split('|').map(s=>'<div style="margin:3px 0">• '+s+'</div>').join('')
    +'<div style="text-align:right;margin-top:8px"><span style="opacity:.6;font-size:12px;margin-right:10px">Reopen any time with the ? button</span><button type="button" id="fhOk" style="padding:4px 14px;border-radius:6px;border:1px solid #c9a35a;background:#3a3020;color:#ffe6a8;cursor:pointer;font-size:14px">Got it</button></div>';
  document.body.appendChild(el);el.querySelector('#fhOk').onclick=()=>fhClose(true);return true;}
if(!window._fhInit){window._fhInit=1;
  addEventListener('keydown',ev=>{if(ev.key==='Escape'&&document.getElementById('fhint')){ev.stopPropagation();ev.preventDefault();fhClose(true);}},true);
  setInterval(()=>{try{const m=fhMode(),el=document.getElementById('fhint');
    if(el&&(!m||el.dataset.m!==m))fhClose(false);
    else if(m&&!el&&!fhSeen(m)&&!fhBot()&&(G&&!window.LOADING)&&document.getElementById('menu')&&document.getElementById('menu').hidden!==false&&!window._fhShown?.[m]){(window._fhShown=window._fhShown||{})[m]=1;fhShow(false,m);}
    const b=document.getElementById('hudHelp');if(b&&!b._fh){b._fh=1;b.addEventListener('click',()=>{try{fhShow(true);}catch(e){}});}}catch(e){}},1000);}
