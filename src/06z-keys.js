/* ================= THE ONE KEY TABLE (queue "Settings": a Controls screen listing every key, with rebinding) =================
   Every keyboard key the game listens to is one row here; Settings -> Controls -> Keyboard keys (src/08m-controls.js) lists
   exactly this table. A NEW HOTKEY = A NEW ROW HERE (CLAUDE.md "new hotkeys go in the one key table"; orch/polishtest.mjs
   presses every rebindable row and fails when a key in the handlers has no row).
   Rows: {id, ctx:'battle'|'grand', grp, name, def} = a letter key the player may move to another letter (or a spare key: \\ ` F2 F4 F8 F9);
         {ctx, grp, name, fix:'text'}      = a fixed key, listed so the screen is complete.
   Rebinding does not touch the handlers: this file registers the FIRST key listener of the page; when the player moved an
   action from its standard letter to another one, the press of the new letter is passed on to the game as a press of the
   standard letter, and the standard letter itself (now free) does nothing. W A S D only ever scroll the camera
   (Abdullah 2026-10-28) and can't be given to anything; a letter that is in use is refused with a plain message.
   View / input only: nothing here reaches the simulation, so multiplayer sync is untouched. */
const KEYTAB=[
  {ctx:'battle',grp:'Camera',name:'Scroll the camera',fix:'W A S D · arrow keys'},
  {id:'camrot',ctx:'battle',grp:'Camera',name:'Rotate the camera (hold + mouse; tap = 45°, with Shift the other way)',def:'q'},
  {ctx:'battle',grp:'Camera',name:'Camera back to north-up',fix:'Home'},
  {ctx:'battle',grp:'Camera',name:'Tilt the camera',fix:'Page Up · Page Down'},
  {ctx:'battle',grp:'Camera',name:'Zoom in / out',fix:'+ · −'},
  {id:'hq',ctx:'battle',grp:'Camera',name:'Jump to your headquarters',def:'h'},
  {ctx:'battle',grp:'Camera',name:'Look at the place of the last radio report',fix:'Space'},
  {ctx:'battle',grp:'Selection',name:'Select your whole army',fix:'Ctrl + A'},
  {id:'seltype',ctx:'battle',grp:'Selection',name:'Select every unit of the same type',def:'t'},
  {ctx:'battle',grp:'Selection',name:'Select squad / make the selection a squad',fix:'1 – 9 · Ctrl + 1 – 9'},
  {id:'amove',ctx:'battle',grp:'Orders',name:'Attack-move (then click)',def:'f'},
  {id:'guard',ctx:'battle',grp:'Orders',name:'Guard (then click)',def:'g'},
  {id:'stop',ctx:'battle',grp:'Orders',name:'Stop',def:'x'},
  {id:'ret',ctx:'battle',grp:'Orders',name:'Return to base',def:'r'},
  {id:'stance',ctx:'battle',grp:'Orders',name:'Next stance (hold: talk to your team)',def:'v'},
  {id:'form',ctx:'battle',grp:'Orders',name:'Next formation / plan a team order',def:'o'},
  {id:'dig',ctx:'battle',grp:'Orders',name:'Dig in (dozers: trench)',def:'i'},
  {id:'resup',ctx:'battle',grp:'Orders',name:'Resupply ammunition',def:'z'},
  {id:'abil',ctx:'battle',grp:'Orders',name:'Unit or leader ability, sonar ping, Recon power (with Shift: leader\'s ultimate)',def:'e'},
  {ctx:'battle',grp:'Orders',name:'Cancel the last item being built or trained',fix:'Backspace · Delete'},
  {id:'p_para',ctx:'battle',grp:'General\'s powers',name:'Airborne drop',def:'c'},
  {id:'p_barrage',ctx:'battle',grp:'General\'s powers',name:'Artillery barrage',def:'b'},
  {id:'p_repair',ctx:'battle',grp:'General\'s powers',name:'Repair',def:'y'},
  {id:'p_mil',ctx:'battle',grp:'General\'s powers',name:'Militia',def:'m'},
  {id:'p_bb',ctx:'battle',grp:'General\'s powers',name:'Bunker Buster',def:'n'},
  {id:'p_sanc',ctx:'battle',grp:'General\'s powers',name:'Sanctions / open the auto-build list',def:'u'},
  {id:'p_reinf',ctx:'battle',grp:'General\'s powers',name:'Reinforcements',def:'k'},
  {id:'p_flare',ctx:'battle',grp:'General\'s powers',name:'Flares / show supply lines (Conquest)',def:'l'},
  {id:'p_nat',ctx:'battle',grp:'General\'s powers',name:'Your nation\'s own power',def:'j'},
  {id:'p_hack',ctx:'battle',grp:'General\'s powers',name:'Cyber attack',def:'['},
  {id:'p_emp',ctx:'battle',grp:'General\'s powers',name:'EMP',def:']'},
  {id:'pause',ctx:'battle',grp:'Game',name:'Pause (single player) / photo mode',def:'p'},
  {ctx:'battle',grp:'Game',name:'Menu · cancel · one step back',fix:'Esc'},
  {ctx:'battle',grp:'Game',name:'Team play: give the "go" signal',fix:'Enter'},
  {ctx:'battle',grp:'Game',name:'Team play: ping, draw, circle on the map',fix:', . / \' ;'},
  {ctx:'grand',grp:'Grand campaign map',name:'Pause / run time',fix:'Space'},
  {ctx:'grand',grp:'Grand campaign map',name:'Time slower / faster, pick a speed',fix:'− · + · 1 – 5'},
  {id:'g_outl',ctx:'grand',grp:'Grand campaign map',name:'Province outlines on / off',def:'o'},
  {id:'g_drill',ctx:'grand',grp:'Grand campaign map',name:'Drill the selected army',def:'t'},
  {ctx:'grand',grp:'Grand campaign map',name:'Close the top window · one step back',fix:'Esc'},
];
const KB={cur:{},map:{battle:{},grand:{}},dead:{battle:{},grand:{}},win:false,onKey:null};
const KB_FIXED='wasd',KB_CODE={BracketLeft:'[',BracketRight:']',Backslash:'\\',Backquote:'`'},KB_SPARE='\\ ` F2 F4 F8 F9';   // every letter has a job already, so a few spare keys can be chosen too
function kbOk(k){return /^[a-z\[\]\\`]$/.test(k)||/^F[2489]$/.test(k);}
function kbShow(k){return !k?'':k.length===1?k.toUpperCase():k;}
function kbPhys(e){const k=e.key||'';return KB_CODE[e.code]||(k.length===1?k.toLowerCase():k);}
function kbCodeOf(k){for(const c in KB_CODE)if(KB_CODE[c]===k)return c;return 'Key'+k.toUpperCase();}
function kbRows(ctx){return KEYTAB.filter(r=>r.def&&(!ctx||r.ctx===ctx));}
function kbBuild(){for(const c of ['battle','grand']){const m={},used={},dead={};
  for(const r of kbRows(c)){const k=KB.cur[r.id]||r.def;used[k]=1;if(k!==r.def)m[k]=r.def;}
  for(const r of kbRows(c))if(!used[r.def])dead[r.def]=1;
  KB.map[c]=m;KB.dead[c]=dead;}}
function kbLoad(){let o={};try{o=JSON.parse(localStorage.getItem('ww3_keys')||'{}')||{};}catch(e){}KB.cur={};
  for(const c of ['battle','grand']){const seen={};
    for(const r of kbRows(c)){const k=o[r.id];if(typeof k==='string'&&kbOk(k)&&!KB_FIXED.includes(k)&&!seen[k]){KB.cur[r.id]=k;seen[k]=1;}}
    for(const r of kbRows(c))if(!KB.cur[r.id]){if(seen[r.def]){for(const x of kbRows(c))if(KB.cur[x.id]===r.def&&x.def!==r.def)delete KB.cur[x.id];}}   // a damaged list never leaves two actions on one key
    for(const r of kbRows(c))if(!KB.cur[r.id])KB.cur[r.id]=r.def;}
  kbBuild();}
function kbSave(){try{const o={};for(const r of kbRows())if(KB.cur[r.id]!==r.def)o[r.id]=KB.cur[r.id];if(Object.keys(o).length)localStorage.setItem('ww3_keys',JSON.stringify(o));else localStorage.removeItem('ww3_keys');}catch(e){}}
function kbKey(id){return kbShow(KB.cur[id]||'');}
/* give action `id` the letter `key`; returns '' when done, otherwise a plain sentence saying why not */
function kbSet(id,key){const r=KEYTAB.find(x=>x.id===id);if(!r||!r.def)return 'That key is fixed and can\'t be changed.';
  key=String(key==null?'':key);const k=key.length===1?key.toLowerCase():key;
  if(k.length===1&&KB_FIXED.includes(k))return 'W, A, S and D always scroll the camera. Pick another letter.';
  if(!kbOk(k))return 'Only letters and the spare keys '+KB_SPARE+' can be chosen.';
  const o=kbRows(r.ctx).find(x=>x.id!==id&&KB.cur[x.id]===k);
  if(o)return kbShow(k)+' is already used for "'+o.name.replace(/ \(.*$/,'')+'". Move that one first (spare keys: '+KB_SPARE+').';
  KB.cur[id]=k;kbSave();kbBuild();return '';}
function kbReset(){try{localStorage.removeItem('ww3_keys');}catch(e){}kbLoad();}
function kbChanged(){return kbRows().some(r=>KB.cur[r.id]!==r.def);}
function kbCtx(){try{const g=(typeof G!=='undefined'&&G)?G:null,gs=document.getElementById('grandScreen');
  if(gs&&!(g&&!g.over))return 'grand';const m=document.getElementById('menu');if(g&&m&&m.hidden)return 'battle';}catch(e){}return '';}
function kbRemap(e){if(e._kb)return;
  if(KB.win){e.stopImmediatePropagation();e.preventDefault();if(e.type==='keydown'&&!e.repeat&&KB.onKey){try{KB.onKey(e);}catch(_){}}return;}   // the Keyboard keys window is open: every press belongs to it
  if(e.ctrlKey||e.metaKey||e.altKey)return;const lk=kbPhys(e);if(!lk||!kbOk(lk))return;
  const t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName||'')||t.isContentEditable))return;
  const c=kbCtx();if(!c)return;const to=KB.map[c][lk];
  if(to){e.stopImmediatePropagation();if(lk.length>1)e.preventDefault();const ev=new KeyboardEvent(e.type,{key:e.shiftKey&&/^[a-z]$/.test(to)?to.toUpperCase():to,code:kbCodeOf(to),bubbles:true,cancelable:true,shiftKey:e.shiftKey,repeat:e.repeat});ev._kb=1;
    if(!(t&&t.dispatchEvent?t:window).dispatchEvent(ev))e.preventDefault();}
  else if(KB.dead[c][lk])e.stopImmediatePropagation();}
kbLoad();
try{addEventListener('keydown',kbRemap,true);addEventListener('keyup',kbRemap,true);}catch(e){}
