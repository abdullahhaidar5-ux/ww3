// 13w-gdev.js — lane B5 slice 1: DEVELOPMENT (EU4-style). Each province can gain Tax / Production / Manpower levels (st.dv=[t,p,m], saved with the campaign),
// bought with Political / Diplomatic / Military points (N.pp). Effects are GMOD rows (id 'dev_<nation>' in GC.mod, rewritten when levels change):
// each tax or production level +0.5% income, each manpower level +1.5% manpower. Deterministic (AI picks by turn, no random). Trade nodes = next slice.
const GDV_KIND=[['t','Tax','pol','Political',.005,'income'],['p','Production','dip','Diplomatic',.005,'income'],['m','Manpower','mil','Military',.015,'manpower']];
const GDV_MAX=10;
function gdvOf(pi){const st=GC.prov[pi];if(!st.dv)st.dv=[0,0,0];return st.dv;}
function gdvCost(pi,k){return 30+10*gdvOf(pi)[k];}
function gdvTot(c){let t=[0,0,0];for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c&&GC.prov[p.i].dv)for(let k=0;k<3;k++)t[k]+=GC.prov[p.i].dv[k];return t;}
function gdvSync(c){const t=gdvTot(c);gmodRemove('dev_'+c+'_i');gmodRemove('dev_'+c+'_m');
  const inc=(t[0]*GDV_KIND[0][4]+t[1]*GDV_KIND[1][4]);if(inc)gmodAdd({id:'dev_'+c+'_i',src:'Development (tax and production)',scope:'nation',stat:'income',mul:1+inc,t:c});
  if(t[2])gmodAdd({id:'dev_'+c+'_m',src:'Development (manpower)',scope:'nation',stat:'manpower',mul:1+t[2]*GDV_KIND[2][4],t:c});}
function gdvBuy(c,pi,k){const N=GC.nat[c],st=GC.prov[pi];if(!N||!st||st.o!==c)return 'Not your province.';if(!N.pp)return 'Not available.';const kd=GDV_KIND[k],d=gdvOf(pi);
  if(d[k]>=GDV_MAX)return kd[1]+' is at its maximum here.';const cost=gdvCost(pi,k);if(N.pp[kd[2]]<cost)return 'Needs '+cost+' '+kd[3]+' points.';
  N.pp[kd[2]]-=cost;d[k]++;gdvSync(c);if(c===GC.me)grLog('Developed '+kd[1].toLowerCase()+' in '+GCM.P[pi].n+' (level '+d[k]+').',c);return '';}
function gdvMonth(){if(!GC)return;for(const c of Object.keys(GC.nat).sort()){const N=GC.nat[c];if(N.dead||!N.pp)continue;
    if(!GC.mod||!GC.mod.some(r=>r.id==='dev_'+c+'_i'||r.id==='dev_'+c+'_m'))gdvSync(c);   // rows are re-made after loads
    if(c===GC.me)continue;const ps=GCM.P.filter(p=>p.land&&GC.prov[p.i].o===c);if(!ps.length)continue;
    for(let k=0;k<3;k++){const pi=ps[(GC.turn*7+k*3)%ps.length].i;if(N.pp[GDV_KIND[k][2]]>=gdvCost(pi,k)+20)gdvBuy(c,pi,k);}}}
GMOD_HOOKS.push(gdvMonth);
npTab('dev','🏗','Development',(code,body,c)=>{const N=GC.nat[code],own=c.own&&code===GC.me,t=gdvTot(code);
  let h='<div style="opacity:.85;margin-bottom:8px">Spend capital points to raise a province. Each Tax or Production level adds 0.5% income, each Manpower level 1.5% recruits. Total levels bought: Tax <b>'+t[0]+'</b>, Production <b>'+t[1]+'</b>, Manpower <b>'+t[2]+'</b>.</div>';
  body.innerHTML=h;
  if(own&&N.pp){const pp=document.createElement('div');pp.style.cssText='margin-bottom:6px;opacity:.8';pp.textContent='Points: Political '+Math.floor(N.pp.pol)+' · Diplomatic '+Math.floor(N.pp.dip)+' · Military '+Math.floor(N.pp.mil);body.appendChild(pp);}
  const ps=c.S.ps.slice().sort((a,b)=>b.dev-a.dev).slice(0,16);
  const tbl=document.createElement('table');tbl.style.cssText='width:100%;border-collapse:collapse;font-size:15px';tbl.innerHTML='<tr><th style="text-align:left;padding:4px 8px">Province</th><th>Base</th>'+GDV_KIND.map(k=>'<th>'+k[1]+'</th>').join('')+'</tr>';
  for(const p of ps){const d=gdvOf(p.i),tr=document.createElement('tr');tr.innerHTML='<td style="padding:4px 8px"><b>'+p.n+'</b></td><td style="text-align:center">'+p.dev+'</td>';
    for(let k=0;k<3;k++){const td=document.createElement('td');td.style.textAlign='center';td.appendChild(document.createTextNode(d[k]+' '));
      if(own){const b=document.createElement('button');b.textContent='+ ('+gdvCost(p.i,k)+')';b.style.cssText='font-size:13px;cursor:pointer;padding:1px 6px';b.title='Costs '+GDV_KIND[k][3]+' points';
        b.disabled=d[k]>=GDV_MAX||N.pp[GDV_KIND[k][2]]<gdvCost(p.i,k);b.onclick=()=>{const e=gdvBuy(code,p.i,k);if(e)grLog(e,code);npDraw();};td.appendChild(b);}
      tr.appendChild(td);}
    tbl.appendChild(tr);}
  body.appendChild(tbl);});
alAdd('dev','🏗','Development',c=>{const N=GC.nat[c];if(!N||!N.pp)return null;const m=Math.max(N.pp.pol,N.pp.dip,N.pp.mil);return m>=150?{n:'+',tip:'you have spare capital points — develop a province',go:()=>npOpen(c,'dev')}:null;});
