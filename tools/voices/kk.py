import espeakng_loader, torch, numpy as np
from phonemizer.backend.espeak.wrapper import EspeakWrapper
EspeakWrapper.set_library(espeakng_loader.get_library_path()); EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
from misaki import espeak
from kokoro import KModel
from huggingface_hub import hf_hub_download
_m=None; _g={}; _v={}
def synth(text,voice,lang='en-us',speed=1.0):
    global _m
    if _m is None: _m=KModel().eval()
    if lang not in _g:
        if lang=='zh':
            from misaki import zh
            _g[lang]=zh.ZHG2P()
        else: _g[lang]=espeak.EspeakG2P(language=lang)
    if voice not in _v: _v[voice]=torch.load(hf_hub_download('hexgrad/Kokoro-82M',f'voices/{voice}.pt'),weights_only=True)
    ps=_g[lang](text); ps=ps[0] if isinstance(ps,tuple) else ps
    with torch.no_grad(): a=_m(ps,_v[voice][len(ps)-1],speed)
    return a.numpy(),24000
if __name__=='__main__':
    import soundfile as sf
    a,sr=synth('Moving out, sir. Weapons free!','am_michael'); sf.write('t_en.wav',a,sr); print(len(a)/sr)
