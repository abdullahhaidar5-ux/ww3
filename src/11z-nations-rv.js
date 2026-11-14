/* ===== nation-rv (Abdullah 2026-11-06 21:24): RV "River Shias" - Iraqi Shia volunteer-brigade faction, own nation in south Iraq =====
   Looks/names for the NEWNAT row in 01-data.js (visual/name only; the emblem is drawRV in 11-models.js). Voices stand in on IQ's set until the voices batch. */
{
const f='RV';
if(!KFAC.includes(f))KFAC.push(f);
EASTVEH.push(f);SOLV[f]='sol_e';MEFAC.add(f);
RMAP.tank[f]='t72';RMAP.heli[f]='mi24';RMAP.jet[f]='mig29';RMAP.dozer[f]='jd550';RMAP.ship[f]='fre';RMAP.sub[f]='subm';
MIL_TANK[f]={m:'technical',fit:'z',size:29};
FLOOK[f]={veh:'#9a8d66',ca:'#6e6244',cb:'#2f3126',uni:'#3a3d2e',pat:3};
CAMOX[f]={p:3,s:1,c:'#a09470',t:'#1fa24a',w:3};
AIRX[f]={b:'#8a9095',p:3,h:{b:'#5b6045',p:3}};
CHAMP_TINT[f]='#3a3b2b';
Object.assign(TK_ADJ,{RV:'Southern Iraqi'});
for(const[m,l]of Object.entries({mesopotamia:['RV'],hawizeh:['RV'],rivers:['RV'],euphrates:['RV']})){const M=MAPS[m];if(M){M.home=M.home||[];for(const q of l)if(!M.home.includes(q))M.home.push(q);}}
// voices: IQ's (Mesopotamian Arabic) lines stand in; war cries "Labbaik ya Hussein" (voices batch re-records later)
PHR_FAC.RV=PHR_FAC.IQ;if(PHR_ALT.IQ)PHR_ALT.RV=PHR_ALT.IQ;
FCRY.RV=FCRY.RS;if(FCRY_ALT.RS)FCRY_ALT.RV=FCRY_ALT.RS;FCRY_EN.RV=[['Ya Ali!'],null,['Labbaik ya Hussein!','Allahu Akbar!'],null,null];
}
