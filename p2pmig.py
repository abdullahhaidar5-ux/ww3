import time,subprocess,functools,json
print=functools.partial(print,flush=True)
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['node','pj/node_modules/peer/dist/bin/peerjs.js','--port','9000','--path','/myapp','--host','127.0.0.1'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
time.sleep(2)
INIT="window.P2P_SERVER={host:'127.0.0.1',port:9000,path:'/myapp',secure:false,config:{iceServers:[]}};"
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pgs=[];errs=[];ctxs=[]
    for i in range(3):
        ctx=b.new_context(viewport={'width':800,'height':560});ctx.add_init_script(INIT);ctxs.append(ctx)
        pg=ctx.new_page();pg.on('pageerror',lambda e,i=i:errs.append((i,str(e)[:300])))
        pg.route('https://fonts.googleapis.com/**',lambda r:r.abort())
        pg.goto('http://localhost:8765/ww3-online/index.html');pgs.append(pg)
    H,C1,C2=pgs
    for k in range(60):
        time.sleep(1)
        if all(pg.evaluate("()=>typeof NET!=='undefined'&&!!NET.room") for pg in pgs):break
    for pg in pgs:pg.evaluate("()=>{try{localStorage.setItem('ww3_welcomed','1');}catch(e){}const w=document.getElementById('ww3Welcome');if(w)w.remove();}")
    # no rendering in the test (3 software-rendered windows starve the machine): drive the game logic directly
    for pg in pgs:pg.evaluate("()=>{window.__stopLoop=1;setInterval(()=>{try{if(MODE==='host'){simUpdate(.05);netTick(.05);}else if(MODE==='client'){clientTick(.05);}}catch(e){console.error(e)}},50);}")
    H.evaluate("()=>{setup.p='US';setup.map='strait';hostGame();}");time.sleep(4)
    code=H.evaluate("()=>NET.code");print('code',code)
    C1.evaluate("(c)=>{setup.p='RU';joinByCode(c);}",code);time.sleep(3)
    C2.evaluate("(c)=>{setup.p='CN';joinByCode(c);}",code)
    for k in range(30):
        time.sleep(1)
        if H.evaluate("()=>NET.lobby.length")>=2:break
    print('lobby',H.evaluate("()=>NET.lobby.map(p=>p.f).join(',')"))
    print('launch',time.strftime('%X'));H.evaluate("()=>launchMP()")
    for k in range(90):
        time.sleep(2)
        if C1.evaluate("()=>MODE")=='client' and C2.evaluate("()=>MODE")=='client' and C1.evaluate("()=>!!NET.lastCk"):break
    print('diag',C1.evaluate("()=>({hp:NET.hostPeer,me:NET.myPeer,rx:NET.lastRx|0,via:NET.via})"),H.evaluate("()=>({peers:NET.peers,live:G.teams.length})"))
    print('in game',time.strftime('%X'),'C1 standby ck bytes',C1.evaluate("()=>NET.lastCk?NET.lastCk.length:0"),'C2 ck',C2.evaluate("()=>NET.lastCk?NET.lastCk.length:0"))
    # host vanishes (tab closed)
    hostUnits=H.evaluate("()=>G.ents.filter(e=>!e.dead).length")
    ctxs[0].close();print('host closed',time.strftime('%X'),'host ents',hostUnits)
    for k in range(60):
        time.sleep(2)
        s1=C1.evaluate("()=>({mode:MODE,code:NET.code,gen:NET.gen,recon:!!NET.recon})");s2=C2.evaluate("()=>({mode:MODE,gen:NET.gen,recon:!!NET.recon,hostPeer:NET.hostPeer,rx:Math.round(performance.now()-(NET.lastRx||0))})")
        if k%3==0:print('  ',k,s1,s2)
        if s1['mode']=='host' and not s2['recon'] and s2['rx']<3000:print('TAKEOVER DONE after about',(k+1)*2,'s');break
    print('after: C1',C1.evaluate("()=>({mode:MODE,ME,peers:NET.peers,ents:G.ents.filter(e=>!e.dead).length,hostAI:!!G.teams[0].ai,t:G.t.toFixed(1)})"))
    print('after: C2',C2.evaluate("()=>({mode:MODE,ME,own:G.ents.filter(e=>e.team===ME&&!e.dead).length,hostPeer:NET.hostPeer})"))
    C1.evaluate("()=>{window.ACTS=[];const a0=act;window.act=function(t,a){ACTS.push([t,a.t]);return a0(t,a);};}")
    C2.evaluate("()=>{const ids=G.ents.filter(e=>e.team===ME&&!e.isB).map(e=>e.id);doAct({t:'go',ids,x:MAPW/2,y:MAPH/2,mode:'move'});}");time.sleep(4)
    print('new host got orders',C1.evaluate("()=>JSON.stringify(ACTS.slice(0,3))"))
    print('errs',errs[:6]);b.close()
finally:
    srv.kill()
