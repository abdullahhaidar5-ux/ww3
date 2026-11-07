// Portrait tool: person (from src/13l-people.js) -> look spec. Deterministic from person.look.h. Used by sheet.html and bake.mjs.
const S=(h)=>{let a=h|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};};
const lerpC=(a,b,t)=>{const f=(c,s)=>(c>>s)&255;return(Math.round(f(a,16)+(f(b,16)-f(a,16))*t)<<16)|(Math.round(f(a,8)+(f(b,8)-f(a,8))*t)<<8)|Math.round(f(a,0)+(f(b,0)-f(a,0))*t);};
const SK={eu:[0xf0c9aa,0xdba682],me:[0xdcab80,0xb67b50],sa:[0xc88c60,0x9a6038],ea:[0xedc9a0,0xd6a877],se:[0xd9a477,0xb07a4a],af:[0x80502f,0x4a2c1c],la:[0xe0ae88,0xb67c54]};
// culture -> [race mix, skin key, hair palette, beard chance, headgear default]
const CU={fa:[{caucasian:.85,asian:.15},'me',0],cfa:[{caucasian:.85,asian:.15},'me',0],lb:[{caucasian:.9,african:.1},'me',0],clb:[{caucasian:.9,african:.1},'me',0],ye:[{caucasian:.6,african:.4},'me',0],cye:[{caucasian:.6,african:.4},'me',0],
 iq:[{caucasian:.85,african:.15},'me',0],sy:[{caucasian:.95,african:.05},'me',0],gu:[{caucasian:.8,african:.2},'me',0],jo:[{caucasian:.95,african:.05},'me',0],eg:[{caucasian:.7,african:.3},'me',0],ku:[{caucasian:.85,asian:.15},'me',0],
 tr:[{caucasian:.9,asian:.1},'me',0],az:[{caucasian:.85,asian:.15},'me',0],he:[{caucasian:1},'me',0],ru:[{caucasian:1},'eu',0],uk:[{caucasian:1},'eu',0],ko:[{asian:1},'ea',0],zh:[{asian:1},'ea',0],ja:[{asian:1},'ea',0],vi:[{asian:1},'se',0],
 hi:[{caucasian:.75,asian:.15,african:.1},'sa',0],ur:[{caucasian:.8,asian:.1,african:.1},'sa',0],af:[{caucasian:.8,asian:.2},'me',0],id:[{asian:.8,caucasian:.2},'se',0],ph:[{asian:.8,caucasian:.2},'se',0],th:[{asian:.9,caucasian:.1},'se',0],kz:[{asian:.6,caucasian:.4},'ea',0],
 ng:[{african:1},'af',0],za:[{african:.8,caucasian:.2},'af',0],et:[{african:.6,caucasian:.4},'af',0],la:[{caucasian:.65,african:.15,asian:.2},'la',0],br:[{caucasian:.55,african:.3,asian:.15},'la',0],
 fr:[{caucasian:1},'eu',0],de:[{caucasian:1},'eu',0],pl:[{caucasian:1},'eu',0],it:[{caucasian:1},'la',0],gr:[{caucasian:1},'la',0],es:[{caucasian:1},'la',0],se:[{caucasian:1},'eu',0],en:[{caucasian:1},'eu',0]};
const CLOTH={ // by nation: uniform colour [coat, trim]; KP/IR/etc handled in rules
 US:[0x3a4a3a,0xc9a64a],GB:[0x4a4f3a,0xc9a64a],FR:[0x2f3a5a,0xd8d8d8],DE:[0x4a4f4a,0xc9a64a],RU:[0x3a4a34,0xc23a2a],CN:[0x4f5a3a,0xc23a2a],KP:[0x6a6a3a,0xc23a2a],KR:[0x3a4a3a,0xc9a64a],JP:[0x2f3a4a,0xc9a64a],IR:[0x4a5a3a,0xc9a64a],IL:[0x6a7060,0xd8d8d8],TR:[0x4a3a3a,0xc23a2a],
 SA:[0x7a6a4a,0xc9a64a],AE:[0x5a5a4a,0xc9a64a],EG:[0x5a5a40,0xc9a64a],UA:[0x3a4a3a,0xd8c64a],PL:[0x4a4f3a,0xd8d8d8],IN:[0x4a5a3a,0xc9a64a],PK:[0x3a4a3a,0xc9a64a]};
const PAL=[0x3a4a3a,0x2f3a4a,0x4a4f3a,0x5a4a3a,0x3a3f4a,0x44503c];
export function specFor(p){const R=S(p.look.h),cul=p.look.cul,C=CU[cul]||CU.en,sx=p.sx||'m',role=p.role,age=p.look.age;
 const f=sx==='f'?0:1,tone=p.look.tone,sk=SK[C[1]],skin=lerpC(sk[0],sk[1],tone);
 const grey=age>57?.8:age>48?.35:.05,greyed=R()<grey;let hairCol=[0x14100e,0x2a1c12,0x3b2616,0x5a3a1f,0x8a6a3a][Math.floor(R()*(C[1]==='eu'?5:(C[1]==='la'?4:2)))];if(greyed)hairCol=[0xb8b8b4,0x9a9a98,0xd8d8d4][Math.floor(R()*3)];
 const cleric=p.ttl==='Ayatollah'||p.ttl==='Hojatoleslam',gulf=cul==='gu',ar=['lb','ye','iq','sy','jo','eg','ku','fa','tr','az'].includes(cul),mil=role==='general'||role==='heir'||(role==='leader'&&['KP','TW','CN','RU','EG','LY','SD','AF'].includes(p.c));
 let beard={style:'none',col:hairCol},hair={style:f?'bob':['buzz','short','short','swept','swept'][Math.floor(R()*5)],col:hairCol},hat={type:'none'},cloth;
 if(f===1){const br=R();if(ar||gulf||cul==='hi'||cul==='ur'||cul==='af'){beard.style=br<.35?'full':br<.7?'moustache':'stubble';}else if(br<.12)beard.style='stubble';else if(br<.18)beard.style='moustache';if(cleric){beard={style:'long',col:greyed||age>50?0xdcdcd6:0x1a1512};}}
 const uc=CLOTH[p.c]||[PAL[Math.floor(R()*PAL.length)],0xc9a64a];
 if(cleric){const black=R()<.5||p.role==='leader'&&R()<.5;hat={type:'turban',col:black?0x17140f:0xeeeae0};hair={style:'bald',col:hairCol};cloth={type:'robe',col:p.ttl==='Ayatollah'?0x2b2118:0x3a3228,col2:0xf0ece2,accent:0xc9a64a};}
 else if(gulf&&(role==='leader'||role==='heir'||R()<.5)){hat={type:'ghutra',col:0xf2f0ea,col2:0x161412};hair={style:'bald',col:hairCol};cloth={type:'thobe',col:role==='leader'?0x2a2118:0xf2f0ea,col2:0xf2f0ea,accent:0xc9a64a};}
 else if(p.c==='KP'&&role!=='general'){cloth={type:'tunic',col:p.role==='leader'?0x4a4a38:0x55553f,col2:0x55553f,accent:0xc9a64a};hair.style=role==='leader'?'swept':'short';}
 else if(mil){hat={type:R()<.78?'peaked':'beret',col:uc[0],col2:uc[1]};cloth={type:'uniform',col:uc[0],col2:0xe4e0d4,accent:uc[1],rank:p.look.age>52?3:2};if(hat.type==='beret'){hat.col=[0x6a2a2a,0x2a3a2a,0x1a1a20,0x3a3f4a][Math.floor(R()*4)];}}
 else{const cols=[0x1c2230,0x23262c,0x2a2a2e,0x2d2a26,0x1f2a38];cloth={type:'suit',col:cols[Math.floor(R()*cols.length)],col2:0xece8de,accent:[0x7a1e22,0x1f3a6a,0x2a4a3a,0x5a3a6a][Math.floor(R()*4)]};}
 if(cloth.type==='suit'&&R()<.5&&!['af','ng','za','et'].includes(cul)){/* glasses later */}
 const bg=p.c;let race=Object.assign({african:0,asian:0,caucasian:0},C[0]);
 return {id:p.id,name:p.nm,ttl:p.ttl,post:p.post,c:p.c,role,sx,age,gender:f?.97:.03,race,skin,hair,beard,hat,cloth,eye:[0x2a1a10,0x3a2414,0x4a3a22,0x3a4a5a,0x5a6a4a][C[1]==='eu'?Math.floor(R()*5):Math.floor(R()*3)],seed:p.look.h,build:p.look.build};}
