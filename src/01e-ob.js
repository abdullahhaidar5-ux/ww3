/* ---- OB "Hamas": a light urban resistance force (Abdullah 2026-11-15 00:20 "Palestinian units are not realistic" / "They have wrong unit types") ----
   Before this OB borrowed Egypt's army (tanks, jets, attack helicopters, frigate) and only renamed it. Now it has no regular-army heavy kit:
   AK rifle squads, RPG teams, ATGM teams, snipers, mortars, armed technicals (heavy MG, ZU-23), home-made rocket trucks and quadcopter drone teams.
   No jets / airfield / helicopters / warships (noAir, noShip); a coastal skiff stays. Fictional, inspired-by only; military vs military.
   Same slots as every nation (the bar, queues, AI and saves read roster()); the "Long-Range Rocket Salvo" stays its general's power. */
{const F=FACTIONS.OB;if(F){F.noAir=true;F.noShip=true;F.light=true;F.extra=[...(F.extra||[]),'atk','mortar','hero','drone'].filter((k,i,a)=>a.indexOf(k)===i);
  const U=F.units;
  U.inf={name:'Brigade Fighter Squad',desc:'Rifle squad with AK-pattern rifles. Cheap, fights best from rubble and its own streets.'};
  U.at={name:'RPG Ambush Team',hp:105,rng:185,dmg:44,cost:275,desc:'RPG gunners that wait in rubble and strike vehicles from close range.'};
  U.atk={name:'ATGM Team',hp:120,cost:475,desc:'Guided anti-tank missiles from a hidden position, longer reach than an RPG.'};
  U.mortar={name:'Mortar Team',cost:425,desc:'Light mortar team that lobs shells from behind buildings.'};
  U.hero={name:'Sniper Team',hp:130,cost:700,time:14,limit:2,desc:'Marksman and spotter; hidden until they fire.'};
  U.tank={name:'Armed Technical',hp:320,spd:92,rng:200,dmg:22,rof:.3,wpn:'gun',aa:1,cost:450,time:6,desc:'Pickup truck with a heavy machine gun. Fast and cheap, but any real armor kills it.'};
  U.aa={name:'ZU-23 Technical',hp:260,spd:88,cost:400,desc:'Pickup with a twin 23 mm gun: shoots down low aircraft and drones, and rakes infantry.'};
  U.arty={name:'Home-Made Rocket Battery',rocket:true,hp:200,rng:400,minr:100,dmg:62,splash:52,rof:3.6,cost:650,time:9,desc:'Truck with home-made rocket rails. Inaccurate, but a salvo hurts a crowded street.'};
  U.drone={name:'Quadcopter Drone Team',hp:45,spd:85,dmg:110,splash:30,cost:150,time:5,desc:'Small quadcopters that drop light munitions on military targets. One use.'};
  U.boat={name:'Coastal Fishing Skiff',hp:320,spd:120,cost:450};
  U.fast=Object.assign({},U.fast||{},{name:'Fast Coastal Skiff'});
  delete U.heli;delete U.jet;delete U.ship;   /* no helicopter, jet or frigate for OB */
  if(typeof XL==='object')XL.OB={};   /* Egypt's Abrams discount copied here by the base-nation row: not for a technical */
  if(typeof BAL==='object'&&BAL.OB)delete BAL.OB.arty;}}
