import {NodeIO} from '@gltf-transform/core';import {ALL_EXTENSIONS} from '@gltf-transform/extensions';import {dequantize,getBounds} from '@gltf-transform/functions';import {MeshoptDecoder,MeshoptEncoder} from 'meshoptimizer';
await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const src=process.argv[2],out=process.argv[3];const d=await io.read(src);await d.transform(dequantize());
for(const x of d.getRoot().listExtensionsUsed())x.dispose();
let tris=0,skins=d.getRoot().listSkins().length,anims=d.getRoot().listAnimations().length;for(const m of d.getRoot().listMeshes())for(const p of m.listPrimitives()){const i=p.getIndices();tris+=(i?i.getCount():p.getAttribute('POSITION').getCount())/3;}
let tex=d.getRoot().listTextures().map(t=>t.getSize()?.join('x')).join(',');
const b=getBounds(d.getRoot().listScenes()[0]);await io.write(out,d);
console.log(src.split('/').pop(),'tris',tris,'skins',skins,'anims',anims,'tex',tex||'-','size',b.max.map((v,i)=>(v-b.min[i]).toFixed(2)).join('x'));
