import json,math,wave,struct,re
from pathlib import Path
p=Path(__file__).resolve().parent.parent
j=json.loads((p/'evidence/asr/voice.json').read_text());caps=[];done=False
for s in j['segments']:
 if done:break
 words=s['words']; groups=[];g=[]
 for w in words:
  g.append(w)
  if len(g)>=5 or re.search(r'[,.;?!]$',w['word']):groups.append(g);g=[]
 if g:groups.append(g)
 for g in groups:
  text=' '.join(w['word'].strip() for w in g).replace('AA','AI').replace('căng','căn').replace('Liết','Liếc').replace('check -in','check-in').replace('Swim lên','Swimlane').replace('Hãy giải thích quy trình','Hay giải thích quy trình').replace('lưu át key file lại','lưu Archify lại').replace('windystudio .app','WindiStudio.app').replace('windystudio.app','WindiStudio.app')
  caps.append({'start':g[0]['start'],'end':g[-1]['end']+0.045,'text':text})
  if 'WindiStudio.app' in text:done=True;break
for i,c in enumerate(caps[:-1]):c['end']=min(c['end'],caps[i+1]['start'])
(p/'src/captions.json').write_text(json.dumps(caps,ensure_ascii=False,indent=2))
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(p/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i,c in enumerate(caps))+'\n')
t=json.loads((p/'src/timeline.json').read_text());duration=t['frames']/30;sr=44100
# Original quiet, retro synth bed: A-minor / F / C / G, no sampled copyrighted audio.
notes=[220,261.626,329.628,261.626,174.614,220,261.626,220,130.813,164.814,195.998,164.814,195.998,246.942,293.665,246.942]
with wave.open(str(p/'public/music.wav'),'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);buf=bytearray()
 for i in range(round(sr*duration)):
  sec=i/sr; beat=sec/.32; n=notes[int(beat)%len(notes)];phase=beat%1;env=min(1,phase/.06)*math.exp(-phase*4);fade=min(1,sec/.7,(duration-sec)/.8)
  v=.2*env*(math.sin(2*math.pi*n*sec)+.12*math.sin(2*math.pi*n*2*sec))*max(0,fade)
  for start in [0,4.966,10.9,17.3,23.7,30.833,38.3]:
   dt=sec-start
   if 0<=dt<.09:v+=.2*math.sin(2*math.pi*(700+700*dt)*dt)*math.exp(-dt*55)
  buf+=struct.pack('<h',round(max(-1,min(1,v))*32767))
 w.writeframes(buf)
lines=['# WS01 — Archify','', '## Lời đọc','']+[s['text'] for s in t['scenes']]+['','## Timeline theo voice thực tế','','| Giây | Cảnh |','|---|---|']+[f'| {s["start"]:.2f}–{s["end"]:.2f} | {s["title"]} |' for s in t['scenes']]+['','Nguồn: https://github.com/tt-a1i/archify — demo tạo thật bằng Archify, hai receipt và hai file HTML trong evidence/public.','Voice: Clone Pro 2.1, model sonic-3.6, tiếng Việt, voice ID de943f91-2f7f-47ca-88db-4a8d1cfc5291, speed 1.15. Nhạc nền tự tổng hợp.','CTA chung về WindiStudio; không tuyên bố có hướng dẫn Archify trên web.']
(p/'script.md').write_text('\n\n'.join(lines))
print('captions',len(caps),'duration',duration)
