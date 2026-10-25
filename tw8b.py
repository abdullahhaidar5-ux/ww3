# Worldwide multiplayer test: host + N clients with realistic internet delays (one-way, via a relay), jitter, in-order
# delivery and occasional lag spikes. Measures order latency, position drift, bandwidth and errors.
from playwright.sync_api import sync_playwright
import time,json,sys,os,random,math
random.seed(4)
MAP=os.environ.get('MAP','strait');stub=open('three.min.js').read()
NC=int(sys.argv[1]) if len(sys.argv)>1 else 3;STEPS=int(sys.argv[2]) if len(sys.argv)>2 else 600
# host in Chicago; one-way ms to each player through the relay
WHERE=[('London',95),('Tokyo',120),('Sydney',150),('Mumbai',160),('Sao Paulo',110),('Lagos',170),('Berlin',100)][:NC]
FACS=['US','RU','IR','CN','TR','IN','EU','KR'][:NC+1]
DT=.1
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pages=[];errs=[]
    for i in range(NC+1):
        pg=b.new_page(viewport={'width':320,'height':240});pg.on('pageerror',lambda e,i=i:errs.append((i,str(e)[:300])))
        pg.route('**/three.min.js',lambda r:r.fulfill(body=stub,content_type='application/javascript'));pg.route('https://fonts.googleapis.com/**',lambda r:r.abort())
        pg.set_content(open('theater-command.html').read());time.sleep(.4)
        pg.evaluate("()=>{window.__stopLoop=1;window.warmShaders=()=>{};window.WW3_P2P=1;window.OUTQ=[];NET.game={emit:(t,d)=>{OUTQ.push([t,JSON.parse(JSON.stringify(d))]);return Promise.resolve();},presence:(p)=>{OUTQ.push(['pres',JSON.parse(JSON.stringify(p))]);return Promise.resolve();},peers:()=>[],leave:()=>Promise.resolve(),on(){},onPeers(){}};}")
        pages.append(pg)
    H=pages[0];C=pages[1:];peers=[None]+['p%d'%k for k in range(1,NC+1)]
    H.evaluate("(a)=>{NET.peers=a[0];startMP('host',777,a[1],0,a[2]);POST.on=false;window.renderFrame=()=>{};window.SU=simUpdate;window.NT=netTick;window.simUpdate=()=>{};window.netTick=()=>{};}",[peers,FACS,MAP])
    for k,pg in enumerate(C,1):
        pg.evaluate("(a)=>{NET.myPeer=a[0];NET.hostPeer='h';startMP('client',777,a[1],a[2],a[3]);POST.on=false;window.RF=renderFrame;window.renderFrame=()=>{};window.CT=clientTick;window.clientTick=()=>{};}",[peers[k],FACS,k,MAP])
    down={k:[] for k in range(1,NC+1)};up={k:[] for k in range(1,NC+1)};lastD={k:0 for k in down};lastU={k:0 for k in up}
    def delay(k):
        ow=WHERE[k-1][1]+random.uniform(-30,30)
        if random.random()<.02: ow+=random.uniform(400,900)   # lag spike
        return ow/1000
    BYTES={};HT=[];EM=[];orders={};lat_host={};lat_seen={};drift=[];ap=0
    for step in range(STEPS):
        now=step*DT
        t0=time.time();H.evaluate("(dt)=>{SU(dt/2);SU(dt/2);NT(dt);}",DT);HT.append((time.time()-t0)*1000)
        hq=H.evaluate("()=>{const q=OUTQ;OUTQ=[];return q;}");EM.append(len(hq))
        for t,d in hq:
            L=len(json.dumps(d))
            for k in range(1,NC+1):
                if d.get('to') and d['to']!=peers[k]:continue
                BYTES[k]=BYTES.get(k,0)+L;at=max(now+delay(k),lastD[k]);lastD[k]=at;down[k].append((at,t,d))
        for k,pg in enumerate(C,1):
            due=[(t,d) for at,t,d in down[k] if at<=now];down[k]=[x for x in down[k] if x[0]>now]
            pg.evaluate("(a)=>{for(const [t,d] of a[0]){if(t==='snap')applySnap(d);else if(t==='evt')applyEvents(d);else if(t==='team')applyTeam(d);}CT(a[1]);}",[due,DT])
            for t,d in pg.evaluate("()=>{const q=OUTQ;OUTQ=[];return q;}"):
                at=max(now+delay(k),lastU[k]);lastU[k]=at;up[k].append((at,t,d))
            dueU=[(t,d) for at,t,d in up[k] if at<=now];up[k]=[x for x in up[k] if x[0]>now]
            if dueU:
                H.evaluate("(a)=>{window.LS=window.LS||{};for(const [t,d] of a[1]){if(t==='cmd'){const x=cleanCmd(d);if(x)act(a[0],x);}else if(t==='pres'&&Array.isArray(d.cq)){let l=LS[a[0]]||0;for(const c of d.cq){if(c.s<=l)continue;l=c.s;const x=cleanCmd(c.a);if(x)act(a[0],x);}LS[a[0]]=l;}}}",[k,dueU])
                for t,d in dueU:
                    if k in orders and k not in lat_host and ((t=='cmd' and d.get('t')=='go') or (t=='pres' and any(c['a'].get('t')=='go' for c in d.get('cq',[])))): lat_host[k]=now-orders[k]
        if step==20:
            for pg in C: pg.evaluate("()=>{doAct({t:'q',k:'inf'});doAct({t:'q',k:'inf'});doAct({t:'q',k:'inf'});}")
        if step==200:
            for k,pg in enumerate(C,1):
                ids=pg.evaluate("()=>{const hq=G.ents.find(e=>e.team===ME&&e.kind==='hq');const u=G.ents.filter(e=>e.team===ME&&!e.isB&&e.kind==='inf');window.TG=[hq.x+(hq.x<MAPW/2?300:-300),hq.y];doAct({t:'go',ids:u.map(e=>e.id),x:TG[0],y:TG[1],mode:'move'});window.P0=u.map(e=>[e.id,e.x,e.y]);return u.length}")
                orders[k]=now
        if step>200:
            for k,pg in enumerate(C,1):
                if k in lat_seen:continue
                if pg.evaluate("()=>(window.P0||[]).some(([id,x,y])=>{const e=G.byId.get(id);return e&&Math.hypot(e.x-x,e.y-y)>6;})"):lat_seen[k]=now-orders[k]
        if step%50==0:print('PROG step',step,time.strftime('%X'),flush=True)
        if step%50==49:
            for k,pg in enumerate(C,1):
                hp=dict((i,(x,y)) for i,x,y in H.evaluate("(k)=>G.ents.filter(e=>e.team===k&&!e.isB&&!e.dead).map(e=>[e.id,e.x,e.y])",k))
                cp=pg.evaluate("()=>G.ents.filter(e=>e.team===ME&&!e.isB&&!e.dead).map(e=>[e.id,e.x,e.y])")
                ds=[math.hypot(x-hp[i][0],y-hp[i][1]) for i,x,y in cp if i in hp]
                if ds:drift.append((k,max(ds),sum(ds)/len(ds)))
            # one visual frame per client now and then to catch render errors
            for pg in C: pg.evaluate("()=>{try{RF(.05);}catch(e){console.error(e)}}")
    print('RESULT');print('players:',', '.join(f"{FACS[k]} in {WHERE[k-1][0]} (~{WHERE[k-1][1]*2} ms round trip)" for k in range(1,NC+1)),'| host',FACS[0],'Chicago')
    for k in range(1,NC+1):
        dk=[d for d in drift if d[0]==k]
        print(f"  {WHERE[k-1][0]}: order reached host after {lat_host.get(k,-1)*1000:.0f} ms, units seen moving on own screen after {lat_seen.get(k,-1)*1000:.0f} ms; own-unit position error max {max([d[1] for d in dk] or [0]):.0f} avg {sum(d[2] for d in dk)/max(1,len(dk)):.1f} (unit ~14 tall); {BYTES.get(k,0)/1024/(STEPS*DT):.1f} KB/s")
        pg=C[k-1];print('     client state:',pg.evaluate("()=>({t:+G.t.toFixed(1),ents:G.ents.length,own:G.ents.filter(e=>e.team===ME).length,credits:G.teams[ME].credits,over:G.over})"))
    print('host ms per 0.1 s game: avg',round(sum(HT)/len(HT),1),'max',round(max(HT),1),'| host game time',H.evaluate('()=>G.t.toFixed(1)'))
    print('host messages per second: avg',round(sum(EM)/len(EM)/DT,1),'peak (1 s window)',max(sum(EM[i:i+10]) for i in range(0,len(EM)-10)) if len(EM)>10 else 0,'(room budget ~40/s, burst 80)')
    print('errs',errs[:6]);b.close()
