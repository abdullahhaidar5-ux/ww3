/* ================= GRAND MAP: ONE STYLE FOR EVERY PANEL (queue "Campaign panels", orch/polishP2) =================
   Every window / panel / dialog of the grand campaign is one row of GPAN (top-most first). gpxDress() gives each of them the
   same frame: same font, same border and corner radius, same title style, and the same close X in the same (top-right) corner.
   ONE Esc handler (gpxEsc) closes the top-most open panel, one per press; a dialog that needs an answer (battle prompt, event
   with choices) is never skipped: Esc presses its plain "No / Close / Back" button when it has one, otherwise does nothing.
   The old per-panel Esc handlers and per-panel close buttons are gone - a NEW PANEL = A NEW ROW HERE (list for people:
   orch/reports/panels.md; guards: orch/decisions.mjs static + orch/polishtest.mjs opens every row and closes it with Esc).
   kind: screen = full page before the map (Esc = its Back button) · dialog = centred question · window = centred, closable ·
         side = docked next to the province column · note = small notice on the map (keeps its own theme, gets the X + Esc).
   View only: nothing here touches the campaign state. */
const GPAN=[
  {id:'gOver',name:'Campaign over (victory / defeat)',kind:'dialog',card:1,title:'h1'},
  {id:'gWeb',name:'Diplomatic web',kind:'window',card:1,title:'b'},
  {id:'gpDeal',name:'Peace deal',kind:'window',card:1,title:'h2,b'},
  {id:'gModal',name:'Dialog: confirm · event · battle prompt · auto-resolve result · strike target',kind:'dialog',card:1,title:'h1,h2'},
  {id:'npWin',name:'Nation window (every tab: overview, diplomacy, economy, people, ideas, graphs …)',kind:'window',title:':scope>div>div:nth-child(2)>div',close:()=>{npClose();}},
  {id:'gMil',name:'Military (generals · fronts · strikes · fleets)',kind:'side',title:'b'},
  {id:'gEco',name:'Empire economy',kind:'side',title:'b'},
  {id:'gTV',name:'TV news ticker',kind:'note'},
  {id:'gNews',name:'Newspaper headline',kind:'note'},
  {id:'gCoach',name:'First-steps coach',kind:'note'},
  {id:'campScreen',name:'Grand campaign menu · New campaign · Campaign lobby',kind:'screen'},
];
function gpxCss(){if(document.getElementById('gpxCss'))return;const s=document.createElement('style');s.id='gpxCss';s.textContent=`
.gpx{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;border:1px solid #4a6580!important;border-top:2px solid #c9a35a!important;border-radius:8px!important;background:#101c2af5!important;color:#e8e4d8!important;box-shadow:0 8px 40px rgba(0,0,0,.55)!important}
.gpx.gpx-rel{position:relative!important}
.gpx .gpx-t{font-size:18px!important;font-weight:700!important;color:#ffe6a8!important;letter-spacing:.02em;margin-top:0!important}
.gpx button{font-family:inherit!important;border-radius:6px!important}
.gpx-x{width:28px;height:28px;padding:0;border-radius:6px!important;border:1px solid #5a7593;background:rgba(16,28,42,.9);color:#e8e4d8;font:15px/1 system-ui,sans-serif;cursor:pointer;z-index:9;opacity:.85}
.gpx-x:hover{opacity:1;border-color:#c9a35a}
.gpx-x.gpx-xa{position:absolute;top:10px;right:12px}
.gpx-x.gpx-xs{position:sticky;top:10px;float:right;margin:0 0 4px 10px}
.gpx-pad{padding-right:46px!important}`;document.head.appendChild(s);}
function gpxShown(e){return !!(e&&e.isConnected&&e.getClientRects().length>0);}
function gpxEl(p){return document.getElementById(p.id);}
function gpxCard(p,e){return p.card?(e.firstElementChild||e):e;}
function gpxEscBtn(e){return e.querySelector('button[data-esc="1"]')||[...e.querySelectorAll('button')].find(b=>/^(‹ )?(Back|Close|Cancel|No)$/.test((b.textContent||'').trim()));}
/* can this panel be closed without answering it? dialogs / screens only through their own plain Back / No / Close button */
function gpxClosable(p,e){return (p.kind==='dialog'||p.kind==='screen')?!!gpxEscBtn(e):true;}
function gpxClose(id){const p=GPAN.find(x=>x.id===id),e=p&&gpxEl(p);if(!e)return false;
  if(p.kind==='dialog'||p.kind==='screen'){const b=gpxEscBtn(e);if(!b)return false;b.click();return true;}
  if(p.close)p.close();else e.remove();return true;}
function gpxOpen(){return GPAN.filter(p=>gpxShown(gpxEl(p)));}
/* the top-most open panel that Esc acts on; {p, blocked:true} when a dialog on top needs an answer first */
function gpxTop(){for(const p of GPAN){const e=gpxEl(p);if(!gpxShown(e))continue;return {p,blocked:!gpxClosable(p,e)};}return null;}
function gpxCloseTop(){const t=gpxTop();if(!t)return '';if(t.blocked)return 'blocked';return gpxClose(t.p.id)?t.p.id:'';}
function gpxDress(){for(const p of GPAN){if(p.kind==='screen')continue;const e=gpxEl(p);if(!e)continue;const c=gpxCard(p,e);if(!c)continue;
    if(p.kind!=='note'&&!c.classList.contains('gpx')){c.classList.add('gpx');if(getComputedStyle(c).position==='static')c.classList.add('gpx-rel');}
    if(p.title&&p.kind!=='note'){const t=c.querySelector(p.title);if(t&&!t.classList.contains('gpx-t'))t.classList.add('gpx-t');}
    let x=null;for(const k of c.children)if(k.classList&&k.classList.contains('gpx-x')){x=k;break;}
    const can=gpxClosable(p,e);if(x&&!can){x.remove();continue;}if(x||!can)continue;
    x=document.createElement('button');x.type='button';x.textContent='✕';x.title='Close (Esc)';x.setAttribute('aria-label','Close');x.onclick=ev=>{ev.stopPropagation();gpxClose(p.id);};
    const scroll=/auto|scroll/.test(getComputedStyle(c).overflowY);x.className='gpx-x '+(scroll?'gpx-xs':'gpx-xa');
    if(scroll){const cs=getComputedStyle(c);x.style.marginTop=x.style.top=(10-parseFloat(cs.paddingTop||0))+'px';x.style.marginRight=(12-parseFloat(cs.paddingRight||0))+'px';c.insertBefore(x,c.firstChild);}else{c.appendChild(x);if(getComputedStyle(c).position==='static')c.classList.add('gpx-rel');const h=c.firstElementChild;if(h&&h!==x&&p.kind!=='note')h.classList.add('gpx-pad');}}}
function gpxEsc(ev){if(ev.key!=='Escape')return;if(typeof G!=='undefined'&&G&&!G.over)return;   // a battle is running: its own Esc rules apply
  const gs=document.getElementById('grandScreen'),cs=document.getElementById('campScreen');if(!gpxShown(gs)&&!gpxShown(cs))return;
  const r=gpxCloseTop();if(r){ev.preventDefault();ev.stopImmediatePropagation();}}
try{gpxCss();if(!window._gpx){window._gpx=1;addEventListener('keydown',gpxEsc,true);
  /* dressed in the same moment a panel appears (observer callbacks run before the next paint), so a panel is never seen without its frame.
     Only the page's top level is watched all the time; the inside of the grand screen / of an open panel is watched while it exists - a battle's HUD updates cost nothing here. */
  let busy=0;const run=()=>{if(busy)return;busy=1;try{for(const id of ['grandScreen'].concat(GPAN.map(p=>p.id))){const e=document.getElementById(id);if(e&&!e._gpxObs&&e.parentNode===document.body){e._gpxObs=new MutationObserver(run);e._gpxObs.observe(e,{childList:true,subtree:true});}}gpxDress();}catch(e){}busy=0;};
  new MutationObserver(run).observe(document.body,{childList:true});run();}}catch(e){console.warn('gpanels',e);}
