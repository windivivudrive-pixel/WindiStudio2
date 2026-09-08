import json, subprocess, wave, math
from pathlib import Path
p=Path(__file__).resolve().parent.parent
ff=str(p/'scripts/ffmpeg-wrapper.sh')
scenes=json.loads((p/'public/scenes.json').read_text()); cursor=0; audio=[]
for s in scenes:
 out=p/'public'/f'{s["id"]}.wav'
 subprocess.run([ff,'-v','error','-y','-i',str(p/'public'/f'{s["id"]}.mp3'),'-ar','44100','-ac','1',str(out)],check=True)
 with wave.open(str(out)) as w:frames=w.getnframes();raw=w.readframes(frames)
 n=math.ceil((frames/44100+0.12)*30); target=n*1470
 audio.append(raw+b'\x00\x00'*(target-frames));s.update(start=cursor/30,end=(cursor+n)/30,fromFrame=cursor,durationInFrames=n);cursor+=n
with wave.open(str(p/'public/voice-raw.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(44100);w.writeframes(b''.join(audio))
subprocess.run([ff,'-v','error','-y','-i',str(p/'public/voice-raw.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','44100',str(p/'public/voice.wav')],check=True)
(p/'src/timeline.json').write_text(json.dumps({'frames':cursor+18,'scenes':scenes},ensure_ascii=False,indent=2));print('duration',cursor/30,'seconds');print([(s['id'],s['start'],s['end']) for s in scenes])
