// RG4 elections & refugees (lane G). NO new engine: approval reads the ONE war-support meter (13v) + provincial unrest; results are GMOD rows;
// refugees are a monthly GMOD_HOOK moving unrest to peaceful neighbours. State GC.el = {nx:{code:month}, camp:{code:bonus}, ref:{code:pool}, log:[]} (saved with the campaign).
// Electoral democracies as of Nov 2026 (data row; Ukraine's elections are suspended under martial law, so it is left out on purpose).
const EL_DEM=['US','IL','GB','FR','DE','PL','IT','GR','ES','SE','JP','KR','TW','IN','AU','CA','BR','MX','AR','CO','CL','ZA','ID','PH','NG','TR','EU'];
const EL_TERM=48, EL_CAMP=300, EL_LOSE_WS=-.08, EL_WIN_INC=.03;
function elS(){if(!GC.el)GC.el={nx:{},camp:{},ref:{},log:[]};return GC.el;}
function elHash(c){let h=7;for(let i=0;i<c.length;i++)h=(h*31+c.charCodeAt(i))%9973;return h;}
function elIsDem(c){return EL_DEM.includes(c)&&GC.nat[c]&&!GC.nat[c].dead;}
function elNext(c){const S=elS();if(S.nx[c]===undefined){const r=typeof GR_REAL==='object'&&GR_REAL.el&&GR_REAL.el[c];   /* real26: the real election calendar first */
    S.nx[c]=r?Math.max(GC.turn||1,grRealTurn(r[0],r[1])):(GC.turn||0)+6+elHash(c+(GC.seed||''))%EL_TERM;}return S.nx[c];}
function elUn(c){let s=0,n=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c){s+=GC.prov[p.i].un;n++;}return n?s/n:0;}
function elApproval(c){const S=elS();const ws=typeof wsOf==='function'?wsOf(c):60;return Math.max(0,Math.min(100,Math.round(ws*.6+(100-Math.min(100,elUn(c)*1.5))*.4+(S.camp[c]||0))));}
function elCampaign(c){const N=GC.nat[c],S=elS();if(!elIsDem(c))return 'No election to fight.';if(N.cash<EL_CAMP)return 'Need $'+EL_CAMP+'.';if((S.camp[c]||0)>=8)return 'The campaign is already at full strength.';N.cash-=EL_CAMP;S.camp[c]=8;return '';}
function elHold(c){const S=elS(),N=GC.nat[c],a=elApproval(c),win=a>=50;S.nx[c]=GC.turn+EL_TERM;S.camp[c]=0;
  if(win){gmodAdd({id:'el_win_'+c,src:'Election mandate',scope:'nation',stat:'income',add:EL_WIN_INC,t:c,until:GC.turn+12});}
  else{gmodAdd({id:'el_lose_'+c,src:'New government',scope:'nation',stat:'warSupport',add:EL_LOSE_WS,t:c,until:GC.turn+12});
    for(const e of gdEnemies(c))gdRel(c,e,10);
    for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)GC.prov[p.i].un=Math.max(0,GC.prov[p.i].un-3);}
  S.log.push([GC.turn,c,a,win?1:0]);if(S.log.length>60)S.log.shift();
  grLog('Election in '+gdNatName(c)+': approval '+a+'% — '+(win?'the government is returned.':'the government falls'+(gdEnemies(c).length?' and the new cabinet seeks talks.':'.')),c);return win;}
// refugees: front-line provinces of a nation at war send people out; peaceful neighbours take them in (unrest), the origin pays in rebuilding (income)
function elRefugees(){const S=elS();
  for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead)continue;const foes=gdEnemies(c);let pool=S.ref[c]||0;
    if(foes.length){let front=0;for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)for(const j of p.adj){const q=GCM.P[j];if(q&&q.land&&foes.includes(GC.prov[j].o)){front++;break;}}pool+=Math.min(6,front);}
    pool*=.97;if(pool<.5)pool=0;pool=Math.min(100,pool);if(pool)S.ref[c]=Math.round(pool*10)/10;else delete S.ref[c];
    if(pool>=4)gmodAdd({id:'el_rebuild_'+c,src:'Refugees & rebuilding',scope:'nation',stat:'income',add:-Math.min(.1,pool/400),t:c,until:GC.turn+2});
    if(pool>=8){const cnt=new Map();for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c)for(const j of p.adj){const q=GCM.P[j];if(q&&q.land){const o=GC.prov[j].o;if(o!==c&&GC.nat[o]&&!GC.nat[o].dead&&!gdEnemies(o).length)cnt.set(j,o);}}
      for(const [j] of [...cnt].sort((a,b)=>a[0]-b[0]))GC.prov[j].un=Math.min(100,GC.prov[j].un+Math.min(2,pool/20));}}}
function elMonth(){if(!GC||!GC.nat)return;const S=elS();elRefugees();
  for(const c of Object.keys(GC.nat).sort()){if(!elIsDem(c))continue;if(GC.turn>=elNext(c))elHold(c);}}
GMOD_HOOKS.push(elMonth);
alAdd('elect','🗳','Election',c=>{if(!elIsDem(c))return null;const m=elNext(c)-GC.turn;return m<=6?{n:Math.max(0,m),tip:'Election in '+Math.max(0,m)+' months — approval '+elApproval(c)+'%. Campaign in the Elections tab.',go:()=>npOpen(c,'elect')}:null;});
npTab('elect','🗳','Elections & refugees',(code,body,c)=>{const S=elS(),own=c.own&&code===GC.me;
  let h='';if(elIsDem(code)){const a=elApproval(code),m=Math.max(0,elNext(code)-GC.turn),col=a>=50?'#7fd48a':'#ff9d8e';
    h+='<div style="font-size:24px"><b style="color:'+col+'">Approval '+a+'%</b></div><div style="opacity:.85;margin:6px 0">Voters judge war support and unrest at home. Election in '+m+' months; at 50% or more the government is returned (+3% income for a year); below it a new cabinet takes over (war support -8% for a year, and it reaches out to enemies).'+((S.camp[code]||0)?' <b>Campaign running (+'+S.camp[code]+').</b>':'')+'</div>';}
  else h+='<div style="opacity:.85;margin:6px 0">This nation holds no competitive elections; its stability rests on war support and unrest instead.</div>';
  const pool=S.ref[code]||0;h+='<div style="margin:8px 0"><b>Refugees from the fighting: '+Math.round(pool)+'</b>'+(pool>=4?' — rebuilding costs reduce income.':'')+(pool>=8?' Neighbouring provinces are taking people in and feel the strain.':'')+'</div>';
  const nb=Object.keys(S.ref).filter(o=>o!==code&&S.ref[o]>=8&&GCM&&gevNb(code).includes(o));if(nb.length)h+='<div style="margin:8px 0;color:#ffe6a8">Refugees are arriving from '+nb.map(gdNatName).join(', ')+' (unrest on the border).</div>';
  body.innerHTML=h;if(own&&elIsDem(code)){const msg=document.createElement('div');msg.style.cssText='margin:8px 0;color:#ffe6a8';body.appendChild(msg);const b=document.createElement('button');b.textContent='Campaign ($'+EL_CAMP+')';b.title='+8 approval at the next election';b.style.cssText='font-size:15px;padding:4px 12px;cursor:pointer';b.onclick=()=>{const x=elCampaign(code);if(x)msg.textContent=x;else npDraw();};body.appendChild(b);}});
