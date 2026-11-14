import torch,numpy as np
torch.set_num_threads(2)
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
_m=None
def model():
    global _m
    if _m is None:
        c=XttsConfig();c.load_json('/home/claude/xtts/m/config.json')
        m=Xtts.init_from_config(c);m.load_checkpoint(c,checkpoint_dir='/home/claude/xtts/m',use_deepspeed=False);m.eval();_m=m
    return _m
MALE=['Andrew Chipper','Badr Odhiambo','Dionisio Schuyler','Royston Min','Viktor Eka','Abrahan Mack','Adde Michal','Baldur Sanjin','Craig Gutsy','Damien Black','Gilberto Mathias','Ilkin Urbano','Kazuhiko Atallah','Ludvig Milivoj','Suad Qasim','Torcull Diarmuid','Viktor Menelaos','Zacharie Aimilios','Ige Behringer','Filip Traverse','Damjan Chapman','Wulf Carlevaro','Aaron Dreschner','Kumar Dahl','Eugenio Mataracı','Ferran Simen','Xavier Hayasaka','Luis Moray','Marcos Rudaski']
# American cloned voices (2026-11-14, "Americans sound British"): speakers named 'clone:<key>' are cloned from public-domain US
# government recordings kept in tools/voices/refs/ (credits in tools/voices/refs/CREDITS.md)
import os
REFS=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','tools','voices','refs')
_cl={}
def clone_latents(key):
    if key not in _cl:
        m=model();g,e=m.get_conditioning_latents(audio_path=[os.path.join(REFS,key+'.flac')],gpt_cond_len=12,gpt_cond_chunk_len=12,max_ref_length=15)
        _cl[key]={'gpt_cond_latent':g,'speaker_embedding':e}
    return _cl[key]
def synth(text,lang,spk,temp=0.75,speed=1.08,seed=None):
    m=model();s=clone_latents(spk[6:]) if spk.startswith('clone:') else m.speaker_manager.speakers[spk]
    if seed is not None: torch.manual_seed(seed)
    with torch.inference_mode():
        o=m.inference(text,lang,s['gpt_cond_latent'],s['speaker_embedding'],temperature=temp,speed=speed,repetition_penalty=5.0,top_p=0.85,top_k=50,enable_text_splitting=False)
    return np.asarray(o['wav'],dtype=np.float32),24000
