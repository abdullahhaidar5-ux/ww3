import time,functools
print=functools.partial(print,flush=True)
from playwright.sync_api import sync_playwright
t0=time.time()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    print('launched',round(time.time()-t0))
    pg=b.new_page(viewport={'width':360,'height':260});pg.on('console',lambda m:print('console',m.text[:150]) if (m.type in('error','warning') and 'toNonIndexed' not in m.text) or 'warm-up' in m.text else None)
    pg.route('https://fonts.googleapis.com/**',lambda r:r.abort())
    pg.goto('http://localhost:8765/theater-command.html',wait_until='commit');print('commit',round(time.time()-t0))
    for k in range(30):
        time.sleep(2)
        try:print(k,pg.evaluate("()=>[typeof startSingle,typeof MODELS!=='undefined'&&!!MODELS.loading,document.readyState]"),round(time.time()-t0))
        except Exception as e:print('eval err',str(e)[:100])
        if pg.evaluate("()=>typeof startSingle==='function'&&document.readyState==='complete'"):break
    print('loaded')
    print('models',pg.evaluate("async()=>{const t=performance.now();const r=await Promise.race([MODELS.loading.then(()=>'ok'),new Promise(r=>setTimeout(()=>r('timeout'),20000))]);return [r,Math.round(performance.now()-t)];}"))
    print('start',pg.evaluate("()=>{const t=performance.now();setup.map='strait';setup.p='US';setup.n=4;setup.tm=null;startSingle();window.__stopLoop=1;return Math.round(performance.now()-t);}"))
    print('sim',pg.evaluate("()=>{const t=performance.now();for(let i=0;i<40;i++)simUpdate(.05);return Math.round(performance.now()-t);}"))
    print('render',pg.evaluate("()=>{const t=performance.now();renderFrame(.1);return Math.round(performance.now()-t);}"))
    print('progs',pg.evaluate('()=>{window.__np=R3.info.programs.length;return R3.info.programs.length}'));print('strikes',pg.evaluate("""()=>{const hq=G.ents.find(e=>e.team===0&&e.isB);const x=hq.x+60,y=hq.y+40;
      for(let k=0;k<3;k++)for(let i=0;i<4;i++){const tx=x+Math.random()*120-60,ty=y+Math.random()*120-60,t=1+i*.28+k*.1;addStrike(tx,ty,t,60,200,1,'sup');FXE('bmis',[(hq.x+400)|0,(hq.y-300)|0,tx|0,ty|0,+t.toFixed(2),i]);}return pBudget();}"""))
    for k in range(22):
        print(k,pg.evaluate("""()=>{const a=performance.now();simUpdate(.1);renderFrame(.1);const P=R3.info.programs;const n0=window.__np||0;window.__np=P.length;return [PARTS.length,Math.round(performance.now()-a),G.strikes.length,P.slice(n0).map(p=>p.name+'#'+p.cacheKey.length).join(' ')];}"""),round(time.time()-t0))
    b.close()
