// SUBJECTS (ctabs3 2026-11-08, EU4 "Subjects" tab; Abdullah 2026-11-07 20:11). ONE system for everyone you hold or back — extends, never copies:
//   vassals     GC.vas=[[overlord,subject]] (13i-grandrealstart; Syria = Turkey's vassal; peace deals add more in 13z-gpeace) — state per subject in GC.sub[code]
//   aid clients GC.cli=[[patron,client,level 1-3]] — states and allied movements a patron funds and arms (realistic Nov 2026 start in GSB_CLI)
//   militias   GC.px (13zq-gproxy, covert) — listed here so the player sees every commitment in one place; "Stop funding" ends it
// Liberty desire = how much they want to go their own way: their strength vs yours, their opinion of you, your support, troop demands, integration.
// Who reacts: a subject over 50% liberty stops paying tribute and refuses troops; over 75% for 6 months while it dislikes you, it declares
// independence (a war, and your rivals warm to it). Integration (24 months, Political points + cash) alarms the world (majors' opinion -5,
// the subject's own faction family -10). Aid costs cash every month, and the client's enemies resent the patron. AI overlords/patrons use the same rules.
// Estate crisis events (13o) also live here because the ONE event engine (13p) loads before this file and after 13o.
// Deterministic (state only, no random). Saved inside GC.
// crises (one engine: rows in GEV_ROWS, w:0 so they only fire from here)
GEV_ROWS.push(
 {id:'es_army',t:'The generals move against the government',x:'Senior officers, angry and powerful, demand a bigger say. Troops are seen near the ministries.',w:0,c:'always',ai:1,o:[
  {t:'Purge the plotters ($400)',fx:[['cash',-400],['est','army',-10,-5],['un',4],['man',-30]]},
  {t:'Meet their demands ($200)',fx:[['cash',-200],['est','army',20,5]]},
  {t:'Hand power to a military council',fx:[['fn','coupworld'],['est','army',30,10],['mod','warSupport',.06,12],['un',-4]]}]},
 {id:'es_work',t:'General strike',x:'The unions have called the whole country out. Ports, refineries and schools are shut.',w:0,c:'always',ai:0,o:[
  {t:'Raise wages ($350)',fx:[['cash',-350],['est','work',20,2],['un',-4]]},
  {t:'Break the strike',fx:[['est','work',-10,0],['un',8],['mod','income',-.05,6]]}]},
 {id:'es_clergy',t:'Clerics lead mass protests',x:'Senior clerics accuse the government of betraying the faith. Crowds fill the squares after prayers.',w:0,c:'always',ai:0,o:[
  {t:'Fund the seminaries ($300)',fx:[['cash',-300],['est','clergy',20,3]]},
  {t:'Arrest the ringleaders',fx:[['est','clergy',-10,0],['un',6],['mod','warSupport',-.03,6]]}]},
 {id:'es_biz',t:'Capital flight',x:'Business leaders are moving money abroad. The currency slides and banks ask for guarantees.',w:0,c:'always',ai:0,o:[
  {t:'Offer a tax holiday',fx:[['mod','income',-.06,12],['est','biz',20,2]]},
  {t:'Impose capital controls',fx:[['est','biz',-10,-3],['cash',200],['un',3]]}]},
 {id:'es_tribe',t:'Tribes take up arms',x:'Tribal elders say the capital has broken its word. Roads are blocked and outposts surrounded.',w:0,c:'always',ai:0,o:[
  {t:'Pay the elders ($300)',fx:[['cash',-300],['est','tribe',20,3]]},
  {t:'Send the army',fx:[['man',-40],['est','tribe',-10,-3],['un',4],['mod','warSupport',-.03,6]]}]},
 {id:'es_guard',t:'The Guard takes over ministries',x:'Guard commanders install their own men in key ministries and companies, citing security.',w:0,c:'always',ai:0,o:[
  {t:'Accept it',fx:[['est','guard',20,10]]},
  {t:'Rein them in',fx:[['est','guard',-15,-5],['un',5],['mod','warSupport',-.05,6]]}]},
 {id:'es_party',t:'Party hardliners challenge the leadership',x:'A faction in the party apparatus openly questions the leadership\'s course.',w:0,c:'always',ai:1,o:[
  {t:'Purge the faction ($200)',fx:[['cash',-200],['est','party',-10,-3],['un',4]]},
  {t:'Give them posts',fx:[['est','party',20,5]]}]});
const GSB_CLI=[['IR','RS',3],['IR','DW',2],['IR','RV',2],['US','IL',3],['US','JO',2],['US','EG',1],['US','UA',1],['DE','UA',2],['GB','UA',1],['FR','UA',1],['AE','EG',1],['CN','KP',1]];
const GSB_AID=40,GSB_INT=24,GSB_DEMCD=12;
function gsbInit(){if(!GC)return;if(!GC.sub)GC.sub={};if(!GC.cli)GC.cli=GSB_CLI.filter(x=>GC.nat[x[0]]&&GC.nat[x[1]]&&!GC.nat[x[0]].dead&&!GC.nat[x[1]].dead).map(x=>x.slice());}
function gsbRec(s){gsbInit();if(!GC.sub[s])GC.sub[s]={sup:0,dem:-99,int:null,hi:0,trib:0,men:0};return GC.sub[s];}
function gsbPow(c){let d=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)d+=p.dev||1;return d;}
function gsbOp(a,b){try{return Math.round(gdOp(a,b));}catch(e){return 0;}}
function gsbSubs(ov){return (GC.vas||[]).filter(v=>v[0]===ov&&GC.nat[v[1]]&&!GC.nat[v[1]].dead).map(v=>v[1]);}
function gsbClis(p){gsbInit();return GC.cli.filter(x=>x[0]===p&&GC.nat[x[1]]&&!GC.nat[x[1]].dead);}
function gsbLib(ov,s){const R=gsbRec(s),ratio=Math.min(1.5,gsbPow(s)/Math.max(1,gsbPow(ov)));
  return Math.max(0,Math.min(100,Math.round(15+50*ratio-0.25*gsbOp(s,ov)-12*R.sup+(GC.turn-R.dem<GSB_DEMCD?15:0)+(R.int?20:0))));}
function gsbCliLib(p,c,lvl){return Math.max(0,Math.min(100,Math.round(30+40*Math.min(1.5,gsbPow(c)/Math.max(1,gsbPow(p)))-0.3*gsbOp(c,p)-10*lvl)));}
function gsbTrib(ov,s){const N=GC.nat[s];return gsbLib(ov,s)>=50?0:Math.max(0,Math.round((N.inc||0)*.15));}
// ---- interactions (return '' on success, else the reason)
function gsbIsSub(ov,s){return (GC.vas||[]).some(v=>v[0]===ov&&v[1]===s);}
function gsbSupport(ov,s,d){if(!gsbIsSub(ov,s))return 'Not your subject.';const R=gsbRec(s),n=Math.max(0,Math.min(2,R.sup+d));if(n===R.sup)return '';R.sup=n;
  if(d<0)gdRel(s,ov,-8);if(ov===GC.me)grLog((d>0?'Raised':'Lowered')+' support for '+gdNatName(s)+' to $'+(GSB_AID*n)+'/month.',ov);return '';}
function gsbDemand(ov,s){if(!gsbIsSub(ov,s))return 'Not your subject.';const R=gsbRec(s);if(GC.turn-R.dem<GSB_DEMCD)return 'Asked recently — wait '+(GSB_DEMCD-(GC.turn-R.dem))+' months.';
  if(gsbLib(ov,s)>=50)return gdNatName(s)+' refuses: liberty desire is 50% or more.';const S=GC.nat[s],O=GC.nat[ov];if(!S.e||!O.e)return 'No manpower to give.';
  const m=Math.min(60,Math.round((S.e.man||0)*.3));if(m<5)return gdNatName(s)+' has no men to spare.';S.e.man-=m;O.e.man=(O.e.man||0)+m;R.dem=GC.turn;R.men+=m;gdRel(s,ov,-15);
  if(ov===GC.me)grLog(gdNatName(s)+' sends '+m+' manpower. They resent it (opinion -15, liberty +15% for a year).',ov);return '';}
function gsbIntOk(ov,s){if(!gsbIsSub(ov,s))return 'Not your subject.';const R=gsbRec(s);if(R.int)return 'Already integrating.';
  if(gsbOp(s,ov)<40)return 'Needs their opinion of you at 40+ (now '+gsbOp(s,ov)+').';if(gsbLib(ov,s)>=35)return 'Needs liberty desire under 35%.';
  if(gsWar(ov))return 'Not while you are at war.';const N=GC.nat[ov];if(!N.pp||N.pp.pol<30)return 'Needs 30 Political points to begin.';if(N.cash<500)return 'Needs $500 to begin.';return '';}
function gsbIntegrate(ov,s){const e=gsbIntOk(ov,s);if(e)return e;const R=gsbRec(s),N=GC.nat[ov];N.pp.pol-=30;N.cash-=500;R.int={t0:GC.turn,t:GC.turn+GSB_INT};
  const fam=grNat(s).fac;for(const o of Object.keys(GC.nat).sort()){if(o===ov||o===s||GC.nat[o].dead)continue;if(grNat(o).major)gdRel(o,ov,-5);if(grNat(o).fac===fam&&o!==ov)gdRel(o,ov,-5);}
  grLog(gdNatName(ov)+' begins absorbing '+gdNatName(s)+'. Foreign capitals and the UN voice concern.',ov);return '';}
function gsbIntCancel(ov,s){const R=gsbRec(s);if(!R.int)return '';R.int=null;gdRel(s,ov,5);if(ov===GC.me)grLog('Stopped integrating '+gdNatName(s)+'.',ov);return '';}
function gsbAnnex(ov,s){for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===s){const st=GC.prov[p.i];st.o=ov;if(typeof gsCores==='function'){const cr=gsCores(st);if(cr.indexOf(ov)<0)cr.push(ov);}}
  for(const a of GC.armies)if(a.o===s)a.o=ov;GC.vas=GC.vas.filter(v=>v[1]!==s);for(const k of Object.keys(GC.war))if(k.split('|').includes(s))delete GC.war[k];
  GC.nat[s].dead=1;delete GC.sub[s];GC.cli=GC.cli.filter(x=>x[0]!==s&&x[1]!==s);grLog(gdNatName(s)+' has been integrated into '+gdNatName(ov)+'.',ov);}
function gsbFree(ov,s){if(!gsbIsSub(ov,s))return 'Not your subject.';GC.vas=GC.vas.filter(v=>!(v[0]===ov&&v[1]===s));delete GC.sub[s];gdRel(s,ov,30);
  for(const o of Object.keys(GC.nat).sort())if(o!==ov&&o!==s&&!GC.nat[o].dead&&grNat(o).major)gdRel(o,ov,3);
  grLog(gdNatName(ov)+' grants '+gdNatName(s)+' full independence.',ov);return '';}
function gsbAid(p,c,d){gsbInit();let x=GC.cli.find(y=>y[0]===p&&y[1]===c);if(!x){if(d<=0)return 'You do not fund them.';if(p===c||grAtWar(p,c)||!GC.nat[c]||GC.nat[c].dead)return 'Not possible.';x=[p,c,0];GC.cli.push(x);}
  const n=Math.max(0,Math.min(3,x[2]+d));if(n===x[2])return '';if(n<x[2])gdRel(c,p,n?-8:-25);x[2]=n;if(!n)GC.cli=GC.cli.filter(y=>y!==x);
  if(p===GC.me)grLog(n?'Aid to '+gdNatName(c)+' set to $'+(GSB_AID*n)+'/month.':'Cut off aid to '+gdNatName(c)+'. They feel betrayed.',p);return '';}
function gsbStopPx(a,b){if(typeof gpxS!=='function')return '';gpxS();GC.px=GC.px.filter(x=>!(x[0]===a&&x[1]===b));if(a===GC.me)grLog('Stopped funding the militia inside '+gdNatName(b)+'.',a);return '';}
// ---- monthly
function gsbMonth(){if(!GC)return;gsbInit();
  for(const v of (GC.vas||[]).slice()){const ov=v[0],s=v[1],O=GC.nat[ov],S=GC.nat[s];if(!O||!S||O.dead||S.dead)continue;const R=gsbRec(s);
    const tr=gsbTrib(ov,s);S.cash-=tr;O.cash+=tr;R.trib=tr;
    if(R.sup){const a=GSB_AID*R.sup;O.cash-=a;S.cash+=a;if(gsbOp(s,ov)<80)gdRel(s,ov,R.sup);}
    if(R.int){if(gsWar(ov)||!O.pp||O.pp.pol<2||O.cash<100){R.int=null;if(ov===GC.me)grLog('Integration of '+gdNatName(s)+' stalled and was abandoned.',ov);}
      else{O.pp.pol-=2;O.cash-=100;if(GC.turn>=R.int.t){gsbAnnex(ov,s);continue;}}}
    const lib=gsbLib(ov,s);R.hi=lib>=75&&gsbOp(s,ov)<0?R.hi+1:0;
    if(R.hi>=6){GC.vas=GC.vas.filter(x=>x!==v);delete GC.sub[s];GC.war=GC.war||{};GC.war[grWk(s,ov)]=1;GC.wsT=GC.wsT||{};GC.wsT[grWk(s,ov)]=GC.turn;
      for(const o of Object.keys(GC.nat).sort())if(o!==ov&&o!==s&&!GC.nat[o].dead&&gsbOp(o,ov)<-20)gdRel(o,s,10);
      grLog(gdNatName(s)+' declares independence from '+gdNatName(ov)+'! War breaks out.',ov);continue;}
    if(ov!==GC.me&&O.ai!==false){   // AI overlord: same rules
      if(lib>=55&&R.sup<2&&O.cash>1500)gsbSupport(ov,s,1);else if(R.sup&&lib<25)gsbSupport(ov,s,-1);
      if(!R.int&&grNat(ov).major&&O.cash>3000&&!gsbIntOk(ov,s)&&gsbOp(s,ov)>=60)gsbIntegrate(ov,s);
      if(gsWar(ov)&&O.e&&(O.e.man||0)<40)gsbDemand(ov,s);}}
  for(const x of GC.cli.slice()){const p=x[0],c=x[1],P=GC.nat[p],C=GC.nat[c];if(!P||!C||P.dead||C.dead||grAtWar(p,c)){GC.cli=GC.cli.filter(y=>y!==x);continue;}
    const a=GSB_AID*x[2];if(P.cash<a&&p!==GC.me){x[2]--;if(!x[2])GC.cli=GC.cli.filter(y=>y!==x);continue;}
    P.cash-=a;C.cash+=a;if(C.e)C.e.man=(C.e.man||0)+3*x[2];if(gsbOp(c,p)<80)gdRel(c,p,1);
    for(const e of Object.keys(GC.nat).sort())if(e!==p&&e!==c&&!GC.nat[e].dead&&grAtWar(c,e))gdRel(e,p,-1);}}
GMOD_HOOKS.push(gsbMonth);
alAdd('subjects','🔗','Subjects',c=>{if(!GC||!GC.vas)return null;const hot=gsbSubs(c).filter(s=>gsbLib(c,s)>=50);return hot.length?{n:hot.length,bad:1,tip:hot.map(gdNatName).join(', ')+' want to break away — raise support',go:()=>{try{npOpen(c,'subj');}catch(e){}}}:null;});
// ---- the Subjects tab
npTab('subj','🔗','Subjects',(code,body,c)=>{gsbInit();const own=c.own&&code===GC.me;body.innerHTML='';
  const btn=(t,fn,dis,tip)=>{const b=document.createElement('button');b.textContent=t;b.style.cssText='font-size:13px;padding:2px 8px;margin:1px 2px;cursor:pointer;border-radius:5px;border:1px solid #5a7a96;background:#1a2c3e;color:#e8e4d8';b.disabled=!!dis;if(tip)b.title=tip;b.onclick=()=>{const e=fn();if(e&&typeof grLog==='function')grLog(e,code);npDraw();};return b;};
  const libc=v=>v>=75?'#e0533f':v>=50?'#e0a33f':'#6fdc8c',opc=v=>v>=40?'#6fdc8c':v<0?'#e0533f':'#d8c27a';
  const ov=typeof grOverlord==='function'?grOverlord(code):null;
  if(ov)body.appendChild(guEl('div','margin-bottom:10px;padding:8px 12px;border:1px solid #8a5a3b;border-radius:6px;background:#2a1d14','<b>'+gdNatName(code)+' is a vassal of '+gdNatName(ov)+'.</b> It fights in its overlord\'s wars and cannot make its own. Liberty desire <b style="color:'+libc(gsbLib(ov,code))+'">'+gsbLib(ov,code)+'%</b> · tribute $'+gsbTrib(ov,code)+'/month. Over 75% while it dislikes its overlord for 6 months, it breaks away.'));
  const subs=gsbSubs(code),clis=gsbClis(code),pxs=(GC.px||[]).filter(x=>x[0]===code);
  const table=(head,rows)=>{const t=guEl('table','width:100%;border-collapse:collapse;font-size:15px;margin-bottom:6px');const hr=document.createElement('tr');hr.innerHTML=head.map(h=>'<th style="text-align:left;padding:5px 8px;border-bottom:1px solid #c9a35a;opacity:.85;font-weight:normal;font-family:Georgia,serif;color:#ffe6a8">'+h+'</th>').join('');t.appendChild(hr);
    for(const r of rows){const tr=document.createElement('tr');for(const cell of r){const td=guEl('td','padding:5px 8px;border-bottom:1px solid #1f3246;vertical-align:middle');if(typeof cell==='string')td.innerHTML=cell;else td.appendChild(cell);tr.appendChild(td);}t.appendChild(tr);}body.appendChild(t);};
  const name=s=>{const n=grNat(s),a=guEl('span','cursor:pointer;white-space:nowrap','<span style="display:inline-block;width:16px;height:11px;border:1px solid #fff;border-radius:2px;vertical-align:middle;background:'+n.color+'"></span> <b>'+gdNatName(s)+'</b>');a.title='Open '+gdNatName(s);a.onclick=()=>npOpen(s);return a;};
  const h=(t,sub)=>body.appendChild(guEl('div','font-size:18px;font-family:Georgia,serif;color:#ffe6a8;margin:12px 0 2px',t+(sub?' <span style="font-size:13px;opacity:.7;font-family:inherit;color:#e8e4d8">'+sub+'</span>':'')));
  h('Vassals','they pay tribute, fight in your wars and cannot leave on their own');
  if(!subs.length)body.appendChild(guEl('div','opacity:.7;margin:2px 0 6px','No vassals. Win a war and demand vassalage in the peace deal.'));
  else table(['Subject','Opinion of us','Tribute','Liberty desire','Troops','Support',own?'Actions':''],subs.map(s=>{const R=gsbRec(s),lib=gsbLib(code,s),op=gsbOp(s,code),act=document.createElement('div');
    if(own){act.appendChild(btn('Demand troops',()=>gsbDemand(code,s),lib>=50||GC.turn-R.dem<GSB_DEMCD,'Take up to 60 manpower; opinion -15, liberty +15% for a year'));
      if(R.int)act.appendChild(btn('Stop integrating',()=>gsbIntCancel(code,s)));else act.appendChild(btn('Integrate',()=>gsbIntegrate(code,s),!!gsbIntOk(code,s),gsbIntOk(code,s)||'24 months: 30 Political + $500 now, then 2 Political + $100 a month. The world disapproves.'));
      act.appendChild(btn('Grant independence',()=>gsbFree(code,s),false,'They leave: opinion +30, no more tribute or troops'));}
    const sup=document.createElement('div');sup.innerHTML='$'+(GSB_AID*R.sup)+'/mo ';if(own){sup.appendChild(btn('+',()=>gsbSupport(code,s,1),R.sup>=2,'Pay them $'+GSB_AID+' more a month: liberty -12%, opinion up'));sup.appendChild(btn('−',()=>gsbSupport(code,s,-1),!R.sup,'Pay less: opinion -8'));}
    return [name(s),'<b style="color:'+opc(op)+'">'+(op>0?'+':'')+op+'</b>',lib>=50?'<span style="color:#e0533f">refused</span>':'+$'+gsbTrib(code,s)+'/mo',gsBar(lib,libc(lib))+' <b style="color:'+libc(lib)+'">'+lib+'%</b>'+(R.int?'<br><span style="font-size:13px;color:#ffe6a8">integrating: '+Math.max(0,R.int.t-GC.turn)+' months left</span>':''),'joins your wars'+(R.men?'<br><span style="font-size:13px;opacity:.75">'+R.men+' manpower sent</span>':''),sup,act];}));
  h('Aid partners','governments and allied movements you fund and arm; their enemies hold it against you');
  if(!clis.length)body.appendChild(guEl('div','opacity:.7;margin:2px 0 6px','You fund nobody.'));
  else table(['Partner','Opinion of us','Aid','Independence','Arms',own?'Actions':''],clis.map(x=>{const op=gsbOp(x[1],code),lib=gsbCliLib(code,x[1],x[2]),act=document.createElement('div');
    if(own){act.appendChild(btn('More aid',()=>gsbAid(code,x[1],1),x[2]>=3,'+$'+GSB_AID+'/month'));act.appendChild(btn('Less',()=>gsbAid(code,x[1],-1),false,'Opinion -8; at zero aid ends (opinion -25)'));act.appendChild(btn('Cut off',()=>gsbAid(code,x[1],-3),false,'End all aid: opinion -25'));}
    return [name(x[1]),'<b style="color:'+opc(op)+'">'+(op>0?'+':'')+op+'</b>','-$'+(GSB_AID*x[2])+'/mo ('+'●'.repeat(x[2])+'○'.repeat(3-x[2])+')',gsBar(lib,libc(lib))+' '+lib+'%','+'+3*x[2]+' manpower/mo to them',act];}));
  if(own){const cand=Object.keys(GC.nat).sort().filter(o=>o!==code&&!GC.nat[o].dead&&grAllied(code,o)&&!gsbIsSub(code,o)&&!clis.some(x=>x[1]===o));
    if(cand.length){const row=guEl('div','display:flex;gap:8px;align-items:center;margin:2px 0 8px;font-size:14px','<span style="opacity:.8">Start funding an ally:</span>');const sel=document.createElement('select');sel.style.cssText='font-size:14px;background:#1a2c3e;color:#e8e4d8;border:1px solid #5a7a96;border-radius:5px';
      for(const o of cand){const op=document.createElement('option');op.value=o;op.textContent=gdNatName(o);sel.appendChild(op);}row.appendChild(sel);row.appendChild(btn('Fund ($'+GSB_AID+'/mo)',()=>gsbAid(code,sel.value,1)));body.appendChild(row);}}
  h('Covert militias','funded in secret (start one from Diplomacy); exposure angers the world');
  if(!pxs.length)body.appendChild(guEl('div','opacity:.7;margin:2px 0 6px','None.'));
  else table(['Inside','Months left','Cost',own?'':''],pxs.map(x=>[name(x[1]),String(Math.max(0,x[2]-GC.turn)),'-$'+GPX_COST+'/mo',own?btn('Stop funding',()=>gsbStopPx(code,x[1])):'']));});
