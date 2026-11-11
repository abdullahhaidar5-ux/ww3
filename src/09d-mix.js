/* ================= SOUND MIX: button clicks everywhere + the quiet battlefield bed =================
   (The mixer itself - buses, limiter, voice ducking - lives in 09-audio.js initAudio/duck. Test: orch/mixtest.mjs.)
   1) Every button clicks. One listener for the whole page: anything a player can press (buttons, menu items, toggles,
      anything shown with the hand cursor) makes a soft tick, unless its own handler already played a UI sound.
   2) Battlefield bed by biome, made in code (no files): desert = low dry wind with gusts and a trace of blowing sand,
      green = wind in leaves, snow = a thin howling wind. On top, "distant fire": shots and explosions too far from the
      camera to be heard directly (counted by sfxShot/sfxBoom into AU.farH) come back as muffled far-off thumps and
      crackle, so a battle elsewhere on the map is heard as a battle elsewhere. All of it sits far below the weapons,
      follows the Sound switch/volume and the voice ducking, and stops when the battle is paused or over. */
const UI_PRESS='button,[role=button],a[href],select,summary,label,input[type=checkbox],input[type=radio],input[type=range],.btn,[onclick],[data-click]';
function uiTick(){if(!auOn()||!AU.sfxOn||!AU.ui)return;AU.uiT=performance.now();AU.uiN=(AU.uiN||0)+1;const t=AU.ctx.currentTime;nz(AU.ui,t,.018,'bandpass',2400,0,.05,1.6);osc(AU.ui,t,'sine',540,330,.04,.05,.002);}
function uiPressable(el){try{if(!el||el.nodeType!==1)return null;const b=el.closest(UI_PRESS);if(b)return b.disabled||b.getAttribute('aria-disabled')==='true'?null:b;
  if(el.tagName==='CANVAS'||el===document.body||el===document.documentElement)return null;return getComputedStyle(el).cursor==='pointer'?el:null;}catch(e){return null;}}
// capture phase so a handler that stops the event cannot silence it; the tick waits one turn so a button with its own sound keeps just that one
window.addEventListener('click',e=>{try{if(!AU.ctx||!AU.sfxOn)return;if(!uiPressable(e.target))return;const t0=performance.now();setTimeout(()=>{if((AU.uiT||0)>=t0-2)return;uiTick();},0);}catch(_){}},{capture:true,passive:true});

const AMB={cx:null,k:'',g:null,pop:null,nodes:[],lvl:0};
const AMB_BIOME={// [buffer, filter type, Hz, Q, level, gust depth, gust Hz, (sweep Hz, sweep rate)]
  desert:[['brown','bandpass',250,.5,.34,.2,.061],['brown','lowpass',120,.7,.2,.1,.037],['noise','highpass',5200,.7,.006,.005,.093]],
  green:[['brown','lowpass',300,.7,.2,.1,.047],['noise','bandpass',1700,.4,.016,.012,.083],['noise','bandpass',3400,.6,.006,.005,.131]],
  snow:[['brown','bandpass',470,3,.3,.2,.071,150,.113],['brown','lowpass',160,.7,.16,.08,.041],['noise','highpass',6200,.7,.004,.003,.097]]};
function ambStop(){for(const n of AMB.nodes){try{n.stop&&n.stop();}catch(e){}try{n.disconnect();}catch(e){}}AMB.nodes=[];AMB.g=null;AMB.pop=null;AMB.k='';}
function ambBuild(theme){const c=AU.ctx;ambStop();AMB.cx=c;AMB.k=AMB_BIOME[theme]?theme:'desert';AMB.lvl=0;
  const g=c.createGain();g.gain.value=0;g.connect(AU.sfx);const pop=c.createGain();pop.gain.value=0;pop.connect(AU.sfx);AMB.g=g;AMB.pop=pop;AMB.nodes.push(g,pop);
  for(const [bk,type,hz,q,lv,gd,gh,sw,sr] of AMB_BIOME[AMB.k]){const s=c.createBufferSource();s.buffer=bk==='brown'?AU.brown:AU.noise;s.loop=true;const f=c.createBiquadFilter();f.type=type;f.frequency.value=hz;f.Q.value=q;
    const a=c.createGain();a.gain.value=lv;const l=c.createOscillator(),lg=c.createGain();l.type='sine';l.frequency.value=gh;lg.gain.value=gd;l.connect(lg);lg.connect(a.gain);   // slow gusts
    s.connect(f);f.connect(a);a.connect(g);s.start(0,Math.random()*1.5);l.start();AMB.nodes.push(s,f,a,l,lg);
    if(sw){const o=c.createOscillator(),og=c.createGain();o.type='sine';o.frequency.value=sr;og.gain.value=sw;o.connect(og);og.connect(f.frequency);o.start();AMB.nodes.push(o,og);}}}
// called by envAudio every 0.15 s
function ambTick(on){const c=AU.ctx;if(!c||!G||!G.map||!AU.sfx||!AU.brown)return;const th=G.map.theme||'desert';
  if(AMB.cx!==c||AMB.k!==(AMB_BIOME[th]?th:'desert')||!AMB.g){if(!on)return;ambBuild(th);}
  const wx=G.wx&&G.wx.k||'clear',storm=wx==='blizzard'||wx==='sandstorm'?2.2:wx==='rain'?.7:1,t=c.currentTime;
  AMB.g.gain.setTargetAtTime(on?.13*storm:0,t,on?1.2:.25);AMB.pop.gain.setTargetAtTime(on?1:0,t,.2);
  let h=AU.farH||0;AU.farH=h*.9;if(!on||h<.05)return;if(Math.random()>Math.min(.45,h*.1))return;
  // one far-off event: a muffled thump (shell, bomb) or a short crackle (small arms), somewhere left or right
  let d=AMB.pop;if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=Math.random()*1.6-.8;p.connect(AMB.pop);d=p;}
  const t0=t+Math.random()*.1,v=.5+Math.random()*.5;
  if(Math.random()<Math.min(.7,.25+h*.08)){osc(d,t0,'sine',62+Math.random()*20,30,.45,.085*v,.012);nz(d,t0,.5,'lowpass',340,90,.07*v,.6,AU.brown);}
  else{const n=2+(Math.random()*4|0);for(let i=0;i<n;i++)nz(d,t0+i*(.07+Math.random()*.05),.05,'bandpass',620+Math.random()*260,0,.022*v,1.1);}}
