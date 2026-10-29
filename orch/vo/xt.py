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
def synth(text,lang,spk,temp=0.75,speed=1.08,seed=None):
    m=model();s=m.speaker_manager.speakers[spk]
    if seed is not None: torch.manual_seed(seed)
    with torch.inference_mode():
        o=m.inference(text,lang,s['gpt_cond_latent'],s['speaker_embedding'],temperature=temp,speed=speed,repetition_penalty=5.0,top_p=0.85,top_k=50,enable_text_splitting=False)
    return np.asarray(o['wav'],dtype=np.float32),24000
