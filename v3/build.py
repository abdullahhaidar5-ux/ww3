import glob
s=open('shell.html').read()
js='\n'.join(open(f).read() for f in sorted(glob.glob('[0-9]*.js')))
import json,base64,gzip,os
A='../assets/';keys=['tank','truck','inf','hero','heli','jet','boat','ship','technical','toontank','tree1','tree2','tree3','tree4','container','containerG','crate','barrel','sandbag','watertower','tent','pallet','fence','missile','sam','b_hq','b_barr','b_fact','b_pad','b_dock','b_crane','b_turret','b_radar','tankE','soldier','drone','m_t90','m_hilux','m_jd550','m_apache','m_mi24','m_f15','m_f18','m_su35','m_rafale','m_typhoon','m_j10','m_mig29','m_f16','m_g6','m_ozelot']
import struct
def fixglb(b):
    n=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+n]);rest=b[20+n:]
    binoff=8;bl=struct.unpack('<I',rest[0:4])[0] if rest else 0;bin_=rest[8:8+bl] if rest else b''
    ch=False
    import io
    from PIL import Image
    ims=j.get('images',[])
    if any(str(i.get('uri','')).startswith('data:') for i in ims):
        cols=[]
        for im in ims:
            u=im.get('uri','')
            if u.startswith('data:'):
                px=Image.open(io.BytesIO(base64.b64decode(u.split(',',1)[1]))).convert('RGB').resize((1,1)).getpixel((0,0))
                cols.append([((c/255)**2.2) for c in px])
            else: cols.append([1,1,1])
        for m in j.get('materials',[]):
            pb=m.get('pbrMetallicRoughness',{})
            t=pb.pop('baseColorTexture',None)
            if t is not None:
                src=j['textures'][t['index']]['source'];f=pb.get('baseColorFactor',[1,1,1,1]);c=cols[src]
                pb['baseColorFactor']=[f[0]*c[0],f[1]*c[1],f[2]*c[2],f[3]];m['pbrMetallicRoughness']=pb
        for k2 in ('images','textures','samplers'):j.pop(k2,None)
        for m in j.get('materials',[]):
            for k2 in ('normalTexture','occlusionTexture','emissiveTexture'):m.pop(k2,None)
            m.get('pbrMetallicRoughness',{}).pop('metallicRoughnessTexture',None)
        ch=True
    for im in j.get('images',[]):
        if not im.get('mimeType') and 'bufferView' in im:
            bv=j['bufferViews'][im['bufferView']];o=bv.get('byteOffset',0);head=bin_[o:o+4]
            im['mimeType']='image/png' if head[:4]==b'\x89PNG' else 'image/jpeg';ch=True
    if not ch:return b
    js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((4-len(js)%4)%4)
    out=struct.pack('<4sII',b'glTF',2,0)+struct.pack('<I4s',len(js),b'JSON')+js+rest
    return out[:8]+struct.pack('<I',len(out))+out[12:]
pack={k:base64.b64encode(fixglb(open(A+k+'.glb','rb').read())).decode() for k in keys}
gz=base64.b64encode(gzip.compress(json.dumps(pack).encode(),9)).decode()
s=s.replace('/*GLTF*/',open(A+'GLTFLoader_safe.js').read()).replace('/*SKEL*/',open(A+'SkeletonUtils.js').read())
s=s.replace('/*PACK*/','const MODEL_PACK="'+gz+'";')
import os as _os
vm=open('../tts/vo/vo_map.json').read() if _os.path.exists('../tts/vo/vo_map.json') else '{}'
js=js.replace('/*VOMAP*/{}',vm)
sm=open('../smp/smp.json').read() if _os.path.exists('../smp/smp.json') else '{}'
js=js.replace('/*SMPMAP*/{}',sm)
fc=open('../smp/fcal.json').read() if _os.path.exists('../smp/fcal.json') else '{}'
js=js.replace('/*FCAL*/{}',fc)
open('../theater-command.html','w').write(s.replace('/*SCRIPT*/',js))
open('all.js','w').write(js)
print(len(s)+len(js))

# ---- Online edition: a standalone page with peer-to-peer multiplayer (PeerJS), for itch.io / GitHub Pages / any web host
import shutil
pj=open('../pj/node_modules/peerjs/dist/peerjs.min.js').read().replace('</script','<\\/script')
p2p=open('../pj/trystero.iife.js').read().replace('</script','<\\/script')+'\n'+open('p2p.js').read()
head='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0e1311"><link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"></head><body>'
th=open('../three.min.js').read().replace('</script','<\\/script')
s_on=s.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>','<script>'+th+'</script>')
vin={}
for f in glob.glob('../vo24/*.mp3'):vin[_os.path.basename(f)[:-4]]=base64.b64encode(open(f,'rb').read()).decode()
vo_js='window.VO_INLINE='+json.dumps(vin,separators=(',',':'))+';'
on=head+'<script>'+pj+'</script><script>'+p2p+'</script>'+s_on.replace('/*SCRIPT*/',js)+'</body></html>'
on1=head+'<script>'+pj+'</script><script>'+p2p+'</script><script>'+vo_js+'</script>'+s_on.replace('/*SCRIPT*/',js)+'</body></html>'
open('../ww3.html','w').write(on1)
D='../ww3-online';_os.makedirs(D,exist_ok=True)
open(D+'/index.html','w').write(on)
for sub,src in (('vo','../tts/vo'),('mus','../mus')):
    _os.makedirs(D+'/'+sub,exist_ok=True)
    for f in glob.glob(src+'/*.mp3'):shutil.copy(f,D+'/'+sub+'/')
print('online',len(on))
