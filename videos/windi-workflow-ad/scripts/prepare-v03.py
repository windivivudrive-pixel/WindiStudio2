import os, json, pathlib, shutil, unicodedata, subprocess
root=pathlib.Path(__file__).resolve().parents[3]; project=root/'videos/windi-workflow-ad'; renderer=root/'kits/video-starter'
source=pathlib.Path('/Users/win/Library/Application Support/WindiConnect/releases/0.5.6/renderer/public/windi-job/c1d0ca16-f73d-4cf7-bd80-d79c8f35381a')
stage=renderer/'public/windi-job/ad-v03'; stage.mkdir(parents=True,exist_ok=True)
p=json.loads((source/'render-props.json').read_text()); caps=p['captions']
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if c.isalnum() or c.isspace()).strip()
# Align each beat to its actual first spoken words, searching forward only.
cursor=0
for b in p['beats']:
    words=norm(b['voiceOver']).split()[:3]
    for i in range(cursor,len(caps)-2):
        if [norm(c['text']) for c in caps[i:i+3]]==words:
            b['startMs']=caps[i]['startMs'];cursor=i+3;break
    else:raise ValueError(b['id'])
p['beats'][0]['startMs']=0
cut_start,cut_end=71180,78280
warp=lambda t:round((t if t<=cut_start else t-(cut_end-cut_start))/1.15,3)
newcaps=[]
for c in caps:
    if cut_start<=c['startMs']<cut_end:continue
    c=dict(c)
    for k in ['startMs','endMs','timestampMs']:
        if c[k] is not None:c[k]=warp(c[k])
    newcaps.append(c)
for i,b in enumerate(p['beats']):
    b['endMs']=p['beats'][i+1]['startMs'] if i+1<len(p['beats']) else 81980
for b in p['beats']:
    b['startMs']=warp(b['startMs']);b['endMs']=warp(b['endMs'])
    name=pathlib.Path(b['image']).name;shutil.copy2(source/name,stage/name);b['image']='windi-job/ad-v03/'+name
p['beats'][-1]['voiceOver']='Bạn có thể dành thời gian đó cho video tiếp theo. Muốn làm nhanh hơn mà vẫn tự duyệt từng bước? Bắt đầu với Windi.'
p['beats'][-1]['onScreenText']='VIDEO TIẾP THEO.\nBẮT ĐẦU SỚM HƠN.'
p['captions']=newcaps;p['audio']='windi-job/ad-v03/voice-115.wav';p['layoutProfile']['id']='windi-workflow-map-v03'
ff=renderer/'node_modules/@remotion/compositor-darwin-arm64/ffmpeg'
subprocess.run([str(ff),'-y','-i',str(source/pathlib.Path(p.get('originalAudio','audio.mp3')).name),'-filter_complex',f'[0:a]atrim=end={cut_start/1000},asetpts=PTS-STARTPTS[a];[0:a]atrim=start={cut_end/1000},asetpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=0:a=1,atempo=1.15[out]','-map','[out]',str(stage/'voice-115.wav')],check=True,env={**os.environ,"DYLD_LIBRARY_PATH":str(ff.parent)})
for dest in [stage/'render-props.json',project/'windi/renders/render-props-v03.json']:dest.write_text(json.dumps(p,ensure_ascii=False,indent=2))
(project/'windi/timing/captions-v03.json').write_text(json.dumps(newcaps,ensure_ascii=False,indent=2))
shutil.copy2(stage/'voice-115.wav',project/'windi/voice/voice-v03-115.wav')
print('Prepared',p['beats'][-1]['endMs']/1000,'seconds')
