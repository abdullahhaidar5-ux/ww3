# PNG -> JPG under size budgets, plus the A/B/C strip. Usage: python3 orch/looktestjpg.py
from PIL import Image, ImageDraw, ImageFont
import os
D=os.path.join(os.path.dirname(__file__),'concepts','looktest')
def save(im,p,lim):
    for q in range(90,30,-4):
        im.save(p,'JPEG',quality=q,optimize=True,progressive=True)
        if os.path.getsize(p)<lim: return q
for n in ['a','b','c','a-wide','b-wide','c-wide']:
    s=os.path.join(D,n+'.png')
    if os.path.exists(s): print(n,save(Image.open(s).convert('RGB'),os.path.join(D,n+'.jpg'),295_000),os.path.getsize(os.path.join(D,n+'.jpg')))
W,H=640,360;S=Image.new('RGB',(W*3+8,H),(10,10,10))
try: f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',26)
except Exception: f=ImageFont.load_default()
for i,(k,t) in enumerate([('a','A  Today'),('b','B  Cinematic'),('c','C  Drone feed')]):
    im=Image.open(os.path.join(D,k+'.png')).convert('RGB').resize((W,H),Image.LANCZOS);d=ImageDraw.Draw(im);d.rectangle([0,0,230,40],fill=(0,0,0));d.text((10,5),t,fill=(255,255,255),font=f);S.paste(im,(i*(W+4),0))
print('strip',save(S,os.path.join(D,'looks-abc.jpg'),395_000),os.path.getsize(os.path.join(D,'looks-abc.jpg')))
