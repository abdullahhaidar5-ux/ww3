// people.json -> specs.json (look specs + morph params for mhmorph.py). usage: node prep.mjs
import fs from 'fs';import {specFor} from './spec.mjs';
const ppl=JSON.parse(fs.readFileSync(new URL('./people.json',import.meta.url)));
const specs=ppl.map(specFor);fs.writeFileSync(new URL('./specs.json',import.meta.url),JSON.stringify(specs));console.log(specs.length,'specs');
