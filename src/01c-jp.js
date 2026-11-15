// ---------- JAPAN (JP) — full nation (Abdullah 2026-11-05 19:45). Self-Defense Forces style, no real leaders.
// One system per idea: JP is registered in the SAME per-nation tables as every other nation (FACTIONS, UPG/UPGL, NATPOW, GPOW,
// DOCT, XL, TRN, SUBN, MDN, COASTN, UPLINK, ECON, HEROES, SPEC, COURAGE, BAL, GDOC_*). Loaded right after 01-data.js.
(function(){
FACTIONS.JP=F_('JP','Japan','#e8e8f0','ja-JP','eastasia','Maritime defense & precision: sensors see 12% farther, units self-repair, weapons deal 4% more damage, warships and submarines are 20% tougher and hit 10% harder, Type 10 tanks have better fire control.',{dmg:1.04,regen:3,sight:1.12},'hero',
  {inf:{name:'JGSDF Rifle Squad'},at:{name:'Type 01 LMAT Team'},hero:{name:'Special Forces Group Commando',demo:true},aa:{name:'Type 87 SPAAG'},tank:{name:'Type 10 Tank'},arty:{name:'Type 99 Howitzer'},heli:{name:'AH-64DJP Apache'},jet:{name:'F-2 Viper Zero'},boat:{name:'Hayabusa Missile Boat'},ship:{name:'Maya-class Aegis Destroyer'}},
  {name:'Type 12 Missile Salvo',charge:160,n:2,dmg:600,r:125,spread:80},'k2fcs');

UPLINK.JP=['Standoff Missile Command','vls'];
ECON.JP='Electronics & Robotics Plant';
COURAGE.JP=1.03;
SPEC.JP=['hero',{name:'Special Forces Group Commando',mark:1}];
HEROES.JP=['Special Forces Group Operators','strike'];
GDOC_AI.JP='air';
GDOC_FLV.JP={r3:'Type 99 Fire Drills',r4:'Domestic Foundry',a1:'Type 10 Assembly Line'};
NATPOW.JP={name:'Type 12 Salvo',type:'precise',cd:180,r:80,desc:'Eight accurate guided shells on a tight area'};
GPOW.JP=JSON.parse(JSON.stringify(GPOW.KR));
DOCT.JP={name:'Active Defense',homeland:1};
XL.JP={ship:{hp:1.2,dmg:1.1},sub:{hp:1.2,dmg:1.1},arty:{rof:.9}};
TRN.JP=['Landing Craft Air Cushion','CH-47J Chinook'];
SUBN.JP='Soryu-class Submarine';
MDN.JP='Type 03 Chu-SAM Battery';
COASTN.JP='Type 12 Coastal Missile Battery';
BAL.JP={'_':0.85};
// nine upgrades in the Japanese idiom, cloned from the shared tier layout (same price/time per tier as every nation)
const names=['Ranger Training','Special Operations Course','Type 10 Fire Control','Hybrid Suspension Armor','F-35B/F-2 Avionics','Apache Upgrades','Keiretsu Contracts','FPS-5 Radar Network','Aegis Combat System'];
UPGL.JP=[];
for(let i=1;i<=9;i++){const o=JSON.parse(JSON.stringify(UPG['kr'+i]));o.name=names[i-1];o.fac='JP';UPG['jp'+i]=o;UPGL.JP.push('jp'+i);}
{const TIER={barracks:[1300,1200,1100],factory:[1300,1100,1000],airfield:[1000,850],hq:[1400,1400,1200],shipyard:[650]},cnt={};
 for(const k of UPGL.JP){const U=UPG[k],t=TIER[U.at];if(!t)continue;const n=cnt[U.at]=(cnt[U.at]||0);cnt[U.at]++;U.cost=t[Math.min(n,t.length-1)];U.time=Math.round(U.cost/46);}}
// doctrine/courage text (same as the loop at the end of 01-data)
{const F=FACTIONS.JP,D=DOCT.JP;const tr=Object.keys(DOCT_TXT).filter(q=>D[q]).map(q=>DOCT_TXT[q]);
 F._dt=1;F.doctrineName=D.name;F.docShort=D.name+' · courage: steady';F.doctrine='Doctrine: '+D.name+' ('+tr.join('; ')+'). Courage: steady. '+F.doctrine;}
})();
