import sys; sys.path.insert(0,'/home/claude/ww3/orch/vo')
from xt import synth
import soundfile as sf
T="The column is moving out. Hold the line and wait for my order, we do not leave anyone behind."
for spk in ['Damien Black','Baldur Sanjin']:
    w,sr=synth(T,'en',spk,temp=0.7,speed=1.0,seed=5)
    sf.write(f"refs/{spk.split()[0]}.wav",w,sr); print(spk,len(w)/sr)
