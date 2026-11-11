// Playtest card (Extras -> Playtest card): 10 things to try this week, thumbs up/down + one short note each, saved as one small
// file to send to Abdullah. Same route as "Report a problem" (src/08k-report.js): when its report file maker is in the page
// the game state and last errors ride along. No names, emails or addresses. The list is written by
// `node orch/playtest-digest.mjs --card` from the newest lines of orch/HISTORY.md - do not edit it by hand.
(function(){
/*PLAYTEST-ITEMS*/
const PLAYTEST_WEEK="2026-11-11";
const PLAYTEST_ITEMS=[
 ["73e2fb4b","The main menu is now Single player / Multiplayer / Test range (Grand campaign, Conquest, Battle, Missions, Tutorial inside Single player)"],
 ["7f51e67a","Buildings are called by their one official name everywhere (Strike Center, Defense Gun, War Factory, Anti-Air Missile Site); a check now stops old faction names or real groups' names from ever showing"],
 ["09179068","Computer opponent on Hard is smarter (same money): it goes round your weaker side, guards its artillery, keeps a few strike aircraft and sends them in with its ground attack"],
 ["92e530c3","Morocco (MA) now has its own Moroccan-Arabic soldier voices instead of a borrowed sheet"],
 ["437b49e3","Jordan (JO) and the Desert Islamic Faction (BI) now have their own Arabic soldier voices (Jordanian and Gulf wording)"],
 ["9129d991","Settings → Controls → \"Keyboard keys\" lists every key of the game from the one key table and lets you pick your own letters"],
 ["90b8b9be","Sound mix. Measured first: the old output clipped (+1.9 dB over full scale; unit voices bypassed the mixer)"],
 ["416cd5e6","Test range compound: the rooftop parapet frame (white concrete posts/caps) floated high above the roofs because the roof height was taken from the tallest part (radar dish/mast) instead of the.."],
 ["06e4b59f","Formation buttons show only with 2+ own units selected, so the bottom bar no longer widens/clips with a building (e.g. Shipyard) selected"],
 ["fcc81616","Dig-in/fortification line + campaign battles army-only (tabs, money, town tax panel hidden, banner), Conquest battlefield picker (search, filters, regions, paged, favorites/recent, keys)"]];
/*PLAYTEST-END*/
const KEY='ww3_playtest_'+PLAYTEST_WEEK;
let ST={};try{ST=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){ST={};}
function keep(){try{localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){}}
function data(){return {kind:'ww3-playtest',made:new Date().toISOString().slice(0,10),week:PLAYTEST_WEEK,version:(typeof NET_PV==='number'?NET_PV:0),
  items:PLAYTEST_ITEMS.map(([id,text])=>({id,text,vote:(ST[id]&&ST[id].v)|0,note:String(ST[id]&&ST[id].n||'').slice(0,200)}))};}
async function save(msg){const f=data();
  try{if(typeof window.wwReportFile==='function'){const r=await window.wwReportFile('');f.state=r.state;f.errors=r.errors;f.screen=r.screen;}}catch(e){}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(f)],{type:'application/json'}));a.download='ww3-playtest-'+f.made+'.json';
  document.body.appendChild(a);a.click();a.remove();if(msg)msg.textContent='Saved. Please send that file to Abdullah on Discord.';return f;}
function card(){const o=idOv('idPlay','Playtest card'),b=o.querySelector('.idbody');b.innerHTML='';
  const top=document.createElement('div');top.style.cssText='font:500 15px/1.4 system-ui,sans-serif;color:#dfe5da;margin:4px 0 10px;text-align:left';
  top.textContent='Ten new things to try this week. Give each one you tried a thumbs up or down and a short note, then save the file and send it to Abdullah.';b.appendChild(top);
  PLAYTEST_ITEMS.forEach(([id,text],i)=>{const s=ST[id]||(ST[id]={v:0,n:''});
    const d=document.createElement('div');d.className='ptrow';d.style.cssText='margin:8px 0;padding:8px 0;border-top:1px solid rgba(255,255,255,.12);text-align:left';
    const t=document.createElement('div');t.style.cssText='font:500 15px/1.4 system-ui,sans-serif;color:#dfe5da';t.textContent=(i+1)+'. '+text;
    const r=document.createElement('div');r.style.cssText='display:flex;gap:8px;align-items:center;margin-top:6px';
    const mk=(v,label,tip)=>{const x=document.createElement('button');x.type='button';x.className='ghost ptv';x.textContent=label;x.title=tip;x.setAttribute('aria-pressed','false');
      x.style.cssText='font-size:16px;padding:3px 10px;min-width:44px';x.onclick=()=>{s.v=s.v===v?0:v;keep();paint();};return x;};
    const up=mk(1,'👍','Good'),dn=mk(-1,'👎','Needs work');
    const paint=()=>{for(const [x,v] of [[up,1],[dn,-1]]){const on=s.v===v;x.setAttribute('aria-pressed',on?'true':'false');x.style.outline=on?'2px solid #f4e9c2':'none';x.style.opacity=on||!s.v?'1':'.45';}};
    const n=document.createElement('input');n.type='text';n.maxLength=200;n.placeholder='One-line note (optional)';n.value=s.n||'';
    n.style.cssText='flex:1;min-width:0;background:#0b0e12;color:#dde;border:1px solid #3a424c;border-radius:4px;padding:5px 8px;font:500 14px system-ui,sans-serif';
    n.oninput=()=>{s.n=n.value;keep();};n.addEventListener('keydown',e=>e.stopPropagation());
    r.append(up,dn,n);d.append(t,r);b.appendChild(d);paint();});
  const f=document.createElement('div');f.style.cssText='display:flex;gap:10px;align-items:center;margin-top:10px';
  const sv=document.createElement('button');sv.type='button';sv.className='ghost';sv.id='ptSave';sv.textContent='Save playtest file';
  const msg=document.createElement('span');msg.id='ptMsg';msg.style.cssText='font:500 13px system-ui,sans-serif;color:#dfe5da';
  msg.textContent='No names, emails or addresses are included.';sv.onclick=()=>save(msg);f.append(sv,msg);b.appendChild(f);o.hidden=false;}
window.wwPlaytest=card;window.wwPlaytestData=data;
})();
