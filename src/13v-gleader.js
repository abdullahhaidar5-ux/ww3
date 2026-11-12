// NATIONAL LEADER FIGURES (lane G, AY): ONE shared Ayatollah leads IR+RS+DW (the Resistance bloc); KP has its own Dear Leader.
// A leader stands in one province and tours: ~1 month per stop. While there: that province calms down (-3 unrest/month) and a
// battle there is fought with fervour (+1 on the die in every Assault phase, 13a-gwar.js). Nation-wide ("the people clamour for war"): +war support, faster manpower,
// slower weariness (modifier rows, cond 'ldr'). Cost: 24 months of peace builds war-fever unrest. State GC.ldr = {AY:{at,tgt,eta,since,req}, DL:{..}, pc:{nation:peaceMonths}}.
const LDR_DEF={AY:{title:'Supreme Ayatollah',who:()=>(typeof RES_BLOC!=='undefined'?RES_BLOC:['IR','RS','DW']),home:'IR',own:'IR'},
               DL:{title:'Dear Leader',who:()=>['KP'],home:'KP',own:'KP'}};
function ldrId(c){for(const k of Object.keys(LDR_DEF))if(LDR_DEF[k].who().includes(c))return k;return null;}
function ldrProvs(k){const w=LDR_DEF[k].who(),o=[];if(!GC)return o;for(const p of GCM.P)if(p.land&&w.includes(GC.prov[p.i].o)&&!GC.nat[GC.prov[p.i].o].dead)o.push(p.i);return o;}
function ldrS(k){if(!GC.ldr)GC.ldr={pc:{}};let L=GC.ldr[k];const ps=ldrProvs(k);
  if(!L){const d=LDR_DEF[k],hn=GC.nat[d.home];L=GC.ldr[k]={at:hn&&!hn.dead?hn.cap:(ps[0]||0),tgt:-1,eta:0,since:GC.turn,req:-1};}
  if(L.at!==undefined&&ps.length&&!ps.includes(L.at)){const hn=GC.nat[LDR_DEF[k].home];L.at=hn&&!hn.dead&&ps.includes(hn.cap)?hn.cap:ps[0];L.tgt=-1;}
  return L;}
function ldrName(k){try{const r=pplRoster(LDR_DEF[k].own);return LDR_DEF[k].title+' '+pplName(r.leader).replace(/^(Ayatollah|Dear Leader|Supreme Leader)\s*/,'');}catch(e){return LDR_DEF[k].title;}}
function ldrPlayerRuns(k){return GC.me===LDR_DEF[k].own;}
function ldrGo(k,pi){const L=ldrS(k);if(!ldrProvs(k).includes(pi)||pi===L.at)return false;L.tgt=pi;L.eta=GC.turn+1;grLog(ldrName(k)+' sets out for '+GCM.P[pi].n+'.',LDR_DEF[k].own);return true;}
function ldrAt(c,pi){const k=ldrId(c);if(!k||!GC||!GC.ldr||!GC.ldr[k])return false;return GC.ldr[k].at===pi&&GC.ldr[k].tgt<0;}
function ldrFervour(c,pi){return ldrAt(c,pi);}   // read by the battle resolver (gwMods)
GMOD_COND.ldr=(c)=>!!ldrId(c);
GMOD_ROWS.push({id:'ldr_war',src:'The people clamor for war',scope:'nation',stat:'warSupport',add:.08,cond:'ldr'},
               {id:'ldr_man',src:'Volunteers rally to the leader',scope:'nation',stat:'manpower',mul:1.12,cond:'ldr'},
               {id:'ldr_wea',src:'Slow war weariness',scope:'nation',stat:'weariness',mul:.7,cond:'ldr'});
function ldrMonth(){if(!GC||!GC.nat||!GC.prov)return;
  for(const k of Object.keys(LDR_DEF)){if(!GC.nat[LDR_DEF[k].own])continue;const L=ldrS(k);
    if(L.tgt>=0&&GC.turn>=L.eta){L.at=L.tgt;L.tgt=-1;L.since=GC.turn;grLog(ldrName(k)+' arrives in '+GCM.P[L.at].n+'.',LDR_DEF[k].own);}
    if(L.tgt<0&&GC.prov[L.at]){const st=GC.prov[L.at];st.un=Math.max(0,st.un-3);}
    // the AI (or an unplayed leader) tours the most restless province, or a visit an ally asked for
    if(!ldrPlayerRuns(k)&&L.tgt<0&&GC.turn-L.since>=3){const ps=ldrProvs(k);let best=-1,bu=-1;
      if(L.req>=0&&ps.includes(L.req)){best=L.req;}else for(const i of ps){const u=GC.prov[i].un;if(u>bu&&i!==L.at){bu=u;best=i;}}
      L.req=-1;if(best>=0)ldrGo(k,best);}
    // war-fever: long peace builds unrest in every nation he leads
    for(const c of LDR_DEF[k].who()){const N=GC.nat[c];if(!N||N.dead)continue;const pc=GC.ldr.pc;
      pc[c]=gdEnemies(c).length?0:(pc[c]||0)+1;
      if(pc[c]>24)for(const p of GCM.P)if(p.land&&GC.prov[p.i].o===c){const st=GC.prov[p.i];st.un=Math.min(100,st.un+1);}}}}
GMOD_HOOKS.push(ldrMonth);
alAdd('ldr','🕌','Leader idle',(c)=>{const k=ldrId(c);if(!k||!ldrPlayerRuns(k)||!GC.ldr||!GC.ldr[k])return null;const L=GC.ldr[k];
  return L.tgt<0&&GC.turn-L.since>=2?{n:1,tip:ldrName(k)+' is waiting in '+GCM.P[L.at].n+' — send him on tour.',go:()=>{try{npOpen(c,'ldr');}catch(e){}}}:null;});
npTab('ldr','🕌','Leader',(code,body)=>{const k=ldrId(code);if(!k){body.textContent='';return;}const L=ldrS(k),mine=ldrPlayerRuns(k)&&code===GC.me,pc=(GC.ldr.pc[code]||0);
  const peaceLine=pc>24?'<span style="color:#ffb3a8">War-fever: '+pc+' months of peace is stirring unrest.</span>':'Months of peace: '+pc+' (war-fever builds after 24).';
  body.innerHTML='<div style="font-size:17px;margin-bottom:6px"><b>'+ldrName(k)+'</b></div><div>Stands in <b>'+GCM.P[L.at].n+'</b>'+(L.tgt>=0?' — traveling to <b>'+GCM.P[L.tgt].n+'</b>':'')+'.</div>'
   +'<div style="margin:8px 0;opacity:.85">Where he stands: unrest falls each month and his troops fighting a battle there get +1 on the die in every Assault phase. Nation-wide: the people clamor for war (+8% war support, +12% manpower, weariness grows slower).</div><div>'+peaceLine+'</div>'
   +(k==='AY'?'<div style="margin-top:6px;opacity:.8">One leader for the Resistance bloc: Iran, the Lebanese Shia and Yemen share him and his effects.</div>':'');
  const mk=(txt,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=txt;b.style.cssText='margin:4px 6px 0 0;padding:3px 10px;border-radius:12px;border:1px solid #3b556e;background:#16222e;color:#cfe3f5;cursor:pointer;font-size:14px';b.onclick=fn;return b;};
  const lst=ldrProvs(k).filter(i=>i!==L.at).sort((a,b)=>GC.prov[b].un-GC.prov[a].un).slice(0,12);
  const h=document.createElement('div');h.style.cssText='margin-top:10px;font-size:14px;opacity:.8';h.textContent=mine?'Send on tour (about a month per stop), restless provinces first:':(code!==LDR_DEF[k].own?'Ask for a visit (the ruler of '+gdNatName(LDR_DEF[k].own)+' decides the route):':'');body.appendChild(h);
  if(mine||code!==LDR_DEF[k].own){const w=document.createElement('div');body.appendChild(w);
    for(const i of lst){if(!mine&&GC.prov[i].o!==code)continue;w.appendChild(mk(GCM.P[i].n+' ('+Math.round(GC.prov[i].un)+'% unrest)',()=>{if(mine)ldrGo(k,i);else L.req=i;npDraw();}));}}},
  (code)=>!!ldrId(code));
