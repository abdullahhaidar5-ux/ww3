import subprocess, sys, os
C='/home/claude/out/clips/clips/'
# (name, clip, start offset s, dur, flash, speed)
PLAN=[
 ('a01','base-flags', 0.0, 3.4,'dark',1.0),
 ('card1','c1.png',   0,   1.2,'card',0),
 ('a03','dunesB-arty',0.6, 2.5,'white',1.0),
 ('a04','storm-low',  0.4, 2.4,'white',1.0),
 ('a05','dunesA-crane',0.8,2.5,'white',1.0),
 ('a06','base-parade',0.3, 2.0,'white',1.0),
 ('a07','fort-bb',    3.2, 3.0,'white',1.0),
 ('a08','dunesB-air',0.3,2.5,'white',1.0),
 ('a09','dunesB-push',0.5, 2.0,'white',1.0),
 ('a10','dunesA-track',1.0,1.5,'white',1.0),
 ('card3','c3.png',   0,   3.0,'card',0),
 ('end','end.png',    0,   4.0,'card',0),
]
GR="eq=contrast=1.12:saturation=1.15:gamma=0.97,colorbalance=rs=.06:gs=.02:bs=-.08:rm=.04:bm=-.06,vignette=PI/4.4,noise=alls=6:allf=t+u"
LB="drawbox=x=0:y=0:w=iw:h=138:color=black:t=fill,drawbox=x=0:y=ih-138:w=iw:h=138:color=black:t=fill"
ENC=['-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-r','30','-an']
def run(a,n):
    tmp=f'seg/{n}.tmp.mp4'
    r=subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-y']+a+ENC+[tmp])
    if r.returncode==0: os.rename(tmp,f'seg/{n}.mp4'); print('ok',n,flush=True)
    else: print('FAIL',n,flush=True)
def build(p):
    n,src,off,d,fl,sp=p; N=int(round(d*30))
    if fl=='card':
        z={'card1':.05,'card3':.10,'end':.03}[n]
        vf=(f"scale=3840:2160,zoompan=z='1+{z}*on/{N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={N}:s=1920x1080:fps=30,"
            f"noise=alls=5:allf=t,fade=in:st=0:d={0.25 if n!='card3' else 0.08:.2f},fade=out:st={d-0.3:.2f}:d=0.30")
        return run(['-loop','1','-framerate','30','-i',src,'-vf',vf,'-frames:v',str(N)],n)
    f=C+src+'.mp4'
    if not os.path.exists(f): print('MISSING',src); return
    vf=f"{GR},{LB}"
    vf+=",fade=in:st=0:d=0.15:color=white" if fl=='white' else ",eq=brightness=-0.04:saturation=0.9,fade=in:st=0:d=1.0"
    run(['-ss',str(off),'-i',f,'-vf',vf,'-frames:v',str(N)],n)
if sys.argv[1]=='all':
    for p in PLAN: build(p)
elif sys.argv[1]=='list':
    t=0
    with open('list.txt','w') as L:
        for p in PLAN: L.write(f"file 'seg/{p[0]}.mp4'\n"); print(p[0],round(t,2)); t+=p[3]
    print('total',round(t,2))
else:
    for p in PLAN:
        if p[0]==sys.argv[1]: build(p)
