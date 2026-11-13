/* ================= GRAND CAMPAIGN LOADER (orch/loadF) =================
   The grand-campaign modules (src/13*.js, ~1.1 MB) are NOT in the page: orch/build.py writes them to grand.<hash>.js and the
   shell names it in GRAND_FILE. They load when the player opens the Grand campaign (or follows a #gcamp= invite link).
   In automated browsers (navigator.webdriver) they load with the page so every test sees the whole game, unless the URL has
   ?lazy=1 (smoke uses that to prove battles run without the grand modules). The artifact / --single build keeps them inline
   (grandMenu already exists then) and this loader does nothing but wire the menu button. */
var GRAND_P=null;
function loadGrand(){
  if(typeof grandMenu==='function')return Promise.resolve(true);
  if(GRAND_P)return GRAND_P;
  GRAND_P=new Promise((res,rej)=>{
    if(typeof GRAND_FILE!=='string'||!GRAND_FILE){rej(new Error('no grand file'));return;}
    const s=document.createElement('script');s.src=GRAND_FILE;s.async=false;
    s.onload=()=>res(true);s.onerror=()=>{GRAND_P=null;s.remove();rej(new Error('grand modules failed to load'));};
    document.head.appendChild(s);
  });
  return GRAND_P;
}
(function(){
  const sb=document.getElementById('sandbox');
  if(sb&&!document.getElementById('grandBtn')){
    const b=document.createElement('button');b.className='big';b.id='grandBtn';b.type='button';b.textContent='Grand campaign';
    b.title='The world map: run a nation; battles, sea fights and sieges are decided on the map';
    b.onclick=()=>{try{initAudio();}catch(e){}
      const t=b.textContent;b.textContent='Loading the world map…';
      loadGrand().then(()=>{b.textContent=t;grandMenu();}).catch(()=>{b.textContent=t;
        try{alert('The grand campaign could not be loaded. Check your connection and try again.');}catch(e){}});};
    const camp=document.getElementById('campaign')||sb;camp.parentNode.insertBefore(b,camp);
    const st=document.getElementById('start');if(st)st.textContent='Conquest — deploy vs AI';
  }
  const eager=/[#&]gcamp=/i.test(location.hash||'')||(navigator.webdriver&&!/[?&]lazy=1/.test(location.search));
  if(typeof grandMenu!=='function'&&typeof GRAND_FILE==='string'&&GRAND_FILE){
    if(eager){
      if(document.readyState==='loading'&&!/[#&]gcamp=/i.test(location.hash||''))document.write('<scr'+'ipt src="'+GRAND_FILE+'"></scr'+'ipt>');
      else loadGrand().catch(()=>{});
    }else{
      // quiet warm-up: fetch (not run) the grand modules once the menu is up, so opening the campaign is instant
      const pre=()=>{try{const l=document.createElement('link');l.rel='prefetch';l.href=GRAND_FILE;l.as='script';document.head.appendChild(l);}catch(e){}};
      addEventListener('load',()=>setTimeout(pre,4000));
    }
  }
})();
