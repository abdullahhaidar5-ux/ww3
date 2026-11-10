// real26 (Abdullah 2026-11-07 20:20 "start from the world as it really is"): the REAL dated events of the next 24 months, as rows in the ONE
// event engine (13p GEV_ROWS). w:0 = never rolled at random; they fire only on their real month, seeded by grRealWorld (13i, GR_REAL.ev).
// Sources per row: orch/REAL-2026.md. Neutral wording, titles only (no real politicians' or organisations' names). AI picks option `ai`.
GEV_ROWS.push(
 {id:'r26_mid',t:'Midterm elections: the opposition wins the legislature',x:'After a year of war and oil above $100, voters hand both chambers to the opposition. Every deployment and war budget will now be fought over.',w:0,c:'always',ai:0,
  o:[{t:'Work with the new legislature',fx:[['mod','warSupport',-.05,24],['un',-2]]},{t:'Govern by executive order',fx:[['un',5],['mod','income',-.02,12],['mod','warSupport',-.02,24]]}]},
 {id:'r26_ilcoal',t:'No majority after the election',x:'Neither bloc reached 61 of 120 seats in the October vote. Coalition talks are deadlocked and a caretaker cabinet runs the war.',w:0,c:'always',ai:0,
  o:[{t:'Form a narrow minority government',fx:[['un',4],['mod','warSupport',-.03,12]]},{t:'Call a repeat election',fx:[['fn','r26_reelect'],['un',2]]}]},
 {id:'r26_cop31',t:'The world climate summit opens on our coast',x:'Delegations from every nation arrive for the annual climate conference, which we host this month.',w:0,c:'always',ai:0,
  o:[{t:'Host it in style ($250)',fx:[['cash',-250],['mod','income',.02,6],['rel','$nb',8]]},{t:'Keep it low-key',fx:[['cash',100]]}]},
 {id:'r26_g20',t:'Leaders of the twenty largest economies meet',x:'We host the G20 summit in December. Oil above $100 and the closed Strait of Hormuz top the agenda.',w:0,c:'always',ai:0,
  o:[{t:'Push for a Hormuz deal',fx:[['rel','IR',10],['rel','CN',5],['mod','income',.01,6]]},{t:'Push for tougher sanctions',fx:[['rel','IR',-10],['rel','RU',-5],['mod','warSupport',.02,6]]}]},
 {id:'r26_unifil',t:'The UN peacekeepers leave the south',x:'The UN force\'s mandate in Lebanon ends on 31 December after nearly fifty years. The army is left alone between the lines.',w:0,c:'always',ai:0,
  o:[{t:'Let the army take over the posts',fx:[['un',3],['rel','IL',-5]]},{t:'Rebuild positions in the south',fx:[['man',20],['rel','IL',-15]]}]},
 {id:'r26_trial',t:'The deposed president goes on trial abroad',x:'The former head of state, seized in January 2026, faces trial in a foreign court. The interim government must take a stand.',w:0,c:'always',ai:0,
  o:[{t:'Stay quiet and keep the oil deal',fx:[['rel','US',5],['un',3]]},{t:'Protest the trial',fx:[['rel','US',-15],['un',-3]]}]},
 {id:'r26_eusanc',t:'European sanctions on Russia expire this month',x:'The economic sanctions run until 31 July and must be renewed unanimously, or they lapse.',w:0,c:'always',ai:0,
  o:[{t:'Renew them',fx:[['rel','RU',-5],['mod','income',-.01,6]]},{t:'Let them lapse',fx:[['fn','r26_lift'],['rel','RU',15],['rel','UA',-20],['rel','US',-5]]}]},
 {id:'r26_gazamand',t:'The UN mandate for Gaza\'s transition expires',x:'The Security Council mandate for Gaza\'s transitional board and stabilisation force ends on 31 December.',w:0,c:'always',ai:0,
  o:[{t:'Back a renewal',fx:[['rel','OB',5],['rel','EG',5]]},{t:'Let it lapse and keep the security zone',fx:[['rel','OB',-15],['un',2]]}]});
GCR_FN.r26_reelect=code=>{if(typeof elS!=='function')return '';elS().nx[code]=GC.turn+5;grLog(gdNatName(code)+' heads for a repeat election in 5 months.',code);return 'Repeat election in 5 months';};
GCR_FN.r26_lift=code=>{if(typeof geEmbargo!=='function'||!GC.nat.RU)return '';geEmbargo(code,'RU',false);return 'Sanctions on Russia lapse';};
