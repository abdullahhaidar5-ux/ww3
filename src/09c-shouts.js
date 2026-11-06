/* ===== Soldier shouts (Abdullah 2026-11-05 19:01 "battlefeel") =====
   The host raises FXE('shout',[type,x,y,team]) from real sim events (03g-battlefeel.js: RPG fired, man down, reloading, grenade, first
   contact, tank spotted, wounded calling for a medic), already throttled per team / type / unit. Here each shout plays one short clip
   from the nation's shout sheet vo/CODE_s.mp3 (rendered by orch/vo/roles.py with VO_LINES=shout_lines VO_SUF=_s: same XTTS-v2 "tough2"
   voices and radio treatment as the other lines, native language). Positional: louder and panned by where it happens; a shout off screen
   gets an extra band-limited radio treatment; far enemy shouts are not heard. A nation without a sheet yet stays silent (never robotic
   device speech). VOS (offsets) is written by tools/voices/patch_map.py. */
const VOS={};
const VOSB={},VOSS={end:0,type:{}};
function vosLoad(fac){if(!AU.ctx||!VOS[fac]||VOSB[fac])return;VOSB[fac]='loading';fetch('vo/'+fac+'_s.mp3?v=1').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();}).then(b=>decodeAB(AU.ctx,b)).then(buf=>{VOSB[fac]=buf;}).catch(e=>{VOSB[fac]='fail';});}
function bfShoutPlay(ty,x,y,team){if(!G||!AU.ctx||!auOn()||!AU.voiceOn||!G.teams[team])return false;const fac=G.teams[team].fac,M=VOS[fac];if(!M)return false;vosLoad(fac);const buf=VOSB[fac];if(!buf||typeof buf==='string')return false;
  const type=BF_SHOUT[ty],set=M[type];if(!set||!set.length)return false;const c=AU.ctx,now=c.currentTime;if(now<VOSS.end-.05||now-(VOSS.type[type]||-99)<5)return false;
  const dx=x-cam.x,dy=y-cam.y,d=Math.hypot(dx,dy),mine=typeof sameTm==='function'?sameTm(team,ME):team===ME;if(d>(mine?1500:650))return false;
  const on=typeof inView==='function'?inView(x,y,0):true,j=Math.floor(Math.random()*set.length),[o,len]=set[j],src=c.createBufferSource(),g=c.createGain();src.buffer=buf;
  const vol=Math.max(0,Math.min(1.5,SET.vo/100*1.25))*Math.max(.18,1.05-d/1500)*(on?1:.8),t0=now+.02;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.005);g.gain.setValueAtTime(vol,Math.max(t0+.006,t0+len-.05));g.gain.linearRampToValueAtTime(0,t0+len);
  let node=src;if(!on&&c.createBiquadFilter){const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=520;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;src.connect(hp);hp.connect(lp);node=lp;}   // heard over the radio, off screen
  if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=Math.max(-.9,Math.min(.9,dx/900));node.connect(p);p.connect(g);}else node.connect(g);g.connect(c.destination);
  VOSS.end=t0+len;VOSS.type[type]=now;src.start(t0,o,len);return true;}
