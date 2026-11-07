// 13zu-gun.js — lane G RG2: UN SECURITY COUNCIL (condemnations + sanctions). 15 seats: 5 permanent with a VETO (US, RU, CN, GB, FR) + 10 elected (rotate yearly, seeded).
// A resolution needs 9 yes votes and no veto. Members vote by real interests: allies of the target and friends (opinion >= 40) shield it; a permanent member always vetoes a measure aimed at itself.
// Effects are GMOD rows only: condemnation = -2% war support 6 months + opinion hit; sanctions = income x0.9 and -3% war support for 12 months + bigger opinion hit.
// Cost: proposing = 30 Diplomatic points (AI: one proposal a month, only against nations whose expansion alarm is high). Counter-play: lobby the council (25 Dip), or plead for relief (40 Dip, after 3 months).
// State GC.un = {sanc:{code:endMonth}, last:{code:month}, log:[]} — saved with the campaign, deterministic (seeded by campaign seed + month).
const UN_PERM=['US','RU','CN','GB','FR'], UN_NEED=9, UN_COST=30, UN_LOBBY=25, UN_RELIEF=40, UN_SLEN=12, UN_CLEN=6;
function unS(){if(!GC.un)GC.un={sanc:{},last:{},log:[]};return GC.un;}
function unAlive(c){return !!GC.nat[c]&&!GC.nat[c].dead;}
function unMembers(){const perm=UN_PERM.filter(unAlive);const pool=Object.keys(GC.nat).filter(c=>unAlive(c)&&!perm.includes(c)&&grNat(c).major).sort();
  const R=grRng((GC.seed|0)*977+Math.floor(GC.turn/12)+11);for(let i=pool.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return {perm,el:pool.slice(0,15-perm.length)};}
function unVote(m,kind,t,by){if(m===t)return 'no';if(grAllied(m,t))return 'no';const op=gdOp(m,t);
  if(op>=40)return 'no';if(m===by)return 'yes';if(op<(kind==='sanction'?5:20)||(by&&gdOp(m,by)>=30&&op<30))return 'yes';return 'abstain';}
function unTally(kind,t,by){const M=unMembers(),all=M.perm.concat(M.el);let yes=0,no=0,veto=null;
  for(const m of all){const v=unVote(m,kind,t,by);if(v==='yes')yes++;else if(v==='no')no++;
    if(M.perm.includes(m)&&(m===t||grAllied(m,t)||gdOp(m,t)>=40)&&!veto)veto=m;}
  return {yes,no,veto,all,pass:!veto&&yes>=UN_NEED};}
function unSanctioned(c){const S=GC&&GC.un;return !!(S&&S.sanc[c]!==undefined&&S.sanc[c]>=GC.turn);}
GMOD_COND.unsanc=(k)=>unSanctioned(k);
// the standing sanction rows: static (read off GC.un), so no per-resolution row bookkeeping
GMOD_ROWS.push({id:'un_sanc_inc',src:'UN sanctions',scope:'nation',stat:'income',mul:.9,cond:'unsanc'},
               {id:'un_sanc_ws',src:'UN sanctions',scope:'nation',stat:'warSupport',add:-.03,cond:'unsanc'});
function unCan(by,kind,t,free){gidN(by);const N=GC.nat[by],T=GC.nat[t];if(!N||!T||T.dead||by===t)return 'Not available.';if(grAllied(by,t))return 'We will not move against an ally.';
  if(unSanctioned(t)&&kind==='sanction')return 'Already under sanctions.';
  if(!free&&(!N.pp||N.pp.dip<UN_COST))return 'Needs '+UN_COST+' Diplomatic points.';return '';}
function unPropose(by,kind,t,free){const e=unCan(by,kind,t,free);if(e)return e;const S=unS();if(!free)GC.nat[by].pp.dip-=UN_COST;
  const r=unTally(kind,t,by),word=kind==='sanction'?'sanctions on':'a condemnation of',who=gdNatName(by),tn=gdNatName(t);
  if(r.pass){for(const m of r.all)if(unVote(m,kind,t,by)==='yes')gdRel(m,t,kind==='sanction'?-8:-4);
    if(kind==='sanction'){S.sanc[t]=GC.turn+UN_SLEN;S.last[t]=GC.turn;}else{GMOD_C.cache.clear();gmodAdd({id:'un_cond_'+t,src:'UN condemnation',scope:'nation',stat:'warSupport',add:-.02,t:t,until:GC.turn+UN_CLEN});}
    GMOD_C.cache.clear();grLog('The UN Security Council passes '+word+' '+tn+' ('+r.yes+' for). Proposed by '+who+'.',t);
    if(t===GC.me||by===GC.me)try{gevToast(['🏛 UN: '+(kind==='sanction'?'sanctions':'condemnation')+' passed against '+tn]);}catch(x){}return '';}
  if(r.veto){gdRel(r.veto,by,-5);grLog(gdNatName(r.veto)+' vetoes '+word+' '+tn+' at the UN Security Council.',by);if(by===GC.me||t===GC.me)try{gevToast(['🏛 UN: '+gdNatName(r.veto)+' used its veto']);}catch(x){}return 'Vetoed by '+gdNatName(r.veto)+'.';}
  grLog('The vote on '+word+' '+tn+' fails: only '+r.yes+' of '+UN_NEED+' needed.',by);return 'Not enough votes ('+r.yes+'/'+UN_NEED+').';}
function unLobby(c){gidN(c);const N=GC.nat[c];if(!N||!N.pp||N.pp.dip<UN_LOBBY)return 'Needs '+UN_LOBBY+' Diplomatic points.';N.pp.dip-=UN_LOBBY;
  const M=unMembers(),l=M.perm.concat(M.el).filter(m=>m!==c&&!grAtWar(m,c)).sort((a,b)=>gdOp(a,c)-gdOp(b,c)||(a<b?-1:1)).slice(0,4);for(const m of l)gdRel(m,c,6);GMOD_C.cache.clear();return '';}
function unRelief(c){gidN(c);const N=GC.nat[c],S=unS();if(!unSanctioned(c))return 'Not under sanctions.';if(S.sanc[c]-UN_SLEN+3>GC.turn)return 'Too early: ask after 3 months.';if(!N.pp||N.pp.dip<UN_RELIEF)return 'Needs '+UN_RELIEF+' Diplomatic points.';
  N.pp.dip-=UN_RELIEF;const r=unTally('sanction',c,null);if(r.yes>=UN_NEED+2&&!r.veto){return 'The council is still set on sanctions.';}delete S.sanc[c];GMOD_C.cache.clear();grLog('The UN Security Council lifts sanctions on '+gdNatName(c)+' after negotiations.',c);return '';}
function unMonth(){if(!GC||!GC.nat)return;const S=unS();for(const c of Object.keys(S.sanc))if(S.sanc[c]<GC.turn){delete S.sanc[c];if(unAlive(c))grLog('UN sanctions on '+gdNatName(c)+' expire.',c);}
  // one AI proposal a month, against the most alarming nation, by the AI that likes it least
  let best=null;for(const t of Object.keys(GC.nat).sort()){const T=GC.nat[t];if(T.dead||(T.ae||0)<AE_THR||(S.last[t]!==undefined&&GC.turn-S.last[t]<12))continue;if(!best||T.ae>GC.nat[best].ae)best=t;}
  if(!best)return;let by=null,bo=1e9;for(const a of Object.keys(GC.nat).sort()){const A=GC.nat[a];if(a===best||A.dead||!A.ai||!grNat(a).major||grAllied(a,best))continue;const o=gdOp(a,best);if(o<bo){bo=o;by=a;}}
  if(!by||bo>0)return;S.last[best]=GC.turn;unPropose(by,GC.nat[best].ae>=AE_THR*2?'sanction':'condemn',best,true);}
GMOD_HOOKS.push(unMonth);
alAdd('un','🏛','UN sanctions',c=>unSanctioned(c)?{n:GC.un.sanc[c]-GC.turn+1,bad:1,tip:'UN sanctions: income -10%, war support -3% — open the council tab',go:()=>npOpen(c,'un')}:null);
npTab('un','🏛','UN Security Council',(code,body,c)=>{gidN(code);const M=unMembers(),own=c.own&&code===GC.me,N=GC.nat[code];
  const nm=m=>gdNatName(m)+(m===code?' ◀':'');
  body.innerHTML='<div style="opacity:.85;margin-bottom:8px">Fifteen seats: five permanent members with a veto and ten elected for the year. A measure needs '+UN_NEED+' votes and no veto. Allies and friends of the target shield it; a permanent member always vetoes a measure aimed at itself.</div>'+
   '<div style="margin:6px 0"><b>Permanent:</b> '+M.perm.map(nm).join(', ')+'</div><div style="margin:6px 0"><b>Elected:</b> '+M.el.map(nm).join(', ')+'</div>'+
   '<div style="margin:6px 0">'+(unSanctioned(code)?'<b style="color:#ff9d8e">Under UN sanctions until month '+GC.un.sanc[code]+'</b> (income -10%, war support -3%).':'Not under sanctions.')+'</div>';
  const act=Object.keys(GC.un?GC.un.sanc:{}).filter(unSanctioned);if(act.length){const d=document.createElement('div');d.style.cssText='margin:6px 0';d.innerHTML='<b>Sanctioned now:</b> '+act.map(gdNatName).join(', ');body.appendChild(d);}
  if(!own)return;
  const msg=document.createElement('div');msg.style.cssText='margin:8px 0;color:#ffe6a8;min-height:20px';body.appendChild(msg);
  const mk=(t,tip,fn)=>{const b=document.createElement('button');b.textContent=t;b.title=tip;b.style.cssText='font-size:15px;padding:4px 12px;cursor:pointer;margin-right:8px';b.onclick=()=>{const x=fn();if(x)msg.textContent=x;else npDraw();};return b;};
  const tg=Object.keys(GC.nat).filter(t=>t!==code&&unAlive(t)&&grNat(t).major&&!grAllied(code,t)).sort((a,b)=>((GC.nat[b].ae||0)-(GC.nat[a].ae||0))||(a<b?-1:1)).slice(0,10);
  const h=document.createElement('div');h.innerHTML='<b>Put a measure to the council</b> ('+UN_COST+' Diplomatic points each; you have '+Math.floor(N.pp?N.pp.dip:0)+')';body.appendChild(h);
  for(const t of tg){const row=document.createElement('div');row.style.cssText='display:flex;gap:10px;align-items:center;margin:4px 0';const rc=unTally('condemn',t,code),rs=unTally('sanction',t,code);
    const sp=document.createElement('span');sp.style.cssText='min-width:200px';sp.textContent=gdNatName(t)+' — alarm '+Math.round(GC.nat[t].ae||0);row.appendChild(sp);
    row.appendChild(mk('Condemn ('+rc.yes+(rc.veto?', veto':'')+')','Likely votes in favour',()=>unPropose(code,'condemn',t)));
    row.appendChild(mk('Sanction ('+rs.yes+(rs.veto?', veto':'')+')','Likely votes in favour',()=>unPropose(code,'sanction',t)));body.appendChild(row);}
  const f=document.createElement('div');f.style.cssText='margin-top:10px';f.appendChild(mk('Lobby the council (-'+UN_LOBBY+' Dip)','Improves four members\' opinion of us',()=>unLobby(code)));
  f.appendChild(mk('Plead for relief (-'+UN_RELIEF+' Dip)','Ask the council to end sanctions on us',()=>unRelief(code)));body.appendChild(f);});
