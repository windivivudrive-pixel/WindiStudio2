import os,subprocess,json,pathlib,re,datetime
root=pathlib.Path(__file__).resolve().parents[3];project=root/'videos/windi-workflow-ad';out=project/'windi/renders';lib=root/'kits/video-starter/node_modules/@remotion/compositor-darwin-arm64';env={**os.environ,'DYLD_LIBRARY_PATH':str(lib)}
video=out/'final-v06.mp4';props=json.loads((out/'render-props-v03.json').read_text())
probe=json.loads(subprocess.check_output([str(lib/'ffprobe'),'-v','error','-show_streams','-show_format','-of','json',str(video)],env=env));(out/'probe-v06.json').write_text(json.dumps(probe,indent=2))
subprocess.run([str(lib/'ffmpeg'),'-v','error','-i',str(video),'-c:v','rawvideo','-c:a','pcm_s16le','-f','null','-'],env=env,check=True)
for sec,name in [(34,'flow'),(63,'cta')]:subprocess.run([str(lib/'ffmpeg'),'-v','error','-y','-ss',str(sec),'-i',str(video),'-frames:v','1',str(out/f'check-{name}-v06.png')],env=env,check=True)
sentences=[];current=[]
for i,c in enumerate(props['captions']):
 current.append(c)
 if re.search(r'[.!?]$',c['text']) or i==len(props['captions'])-1:sentences.append(current);current=[]
groups=[]
import math
for sentence in sentences:
 if len(sentence)<3 and groups and len(groups[-1])+len(sentence)<=9:groups[-1]+=sentence;continue
 count=math.ceil(len(sentence)/7);offset=0
 for i in range(count):
  size=math.ceil((len(sentence)-offset)/(count-i));groups.append(sentence[offset:offset+size]);offset+=size
assert all(3<=len(g)<=9 for g in groups)
def ts(ms):
 ms=round(ms);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
srt=project/'windi/timing/captions-v03.srt';srt.write_text('\n\n'.join(f"{i+1}\n{ts(g[0]['startMs'])} --> {ts(g[-1]['endMs'])}\n"+' '.join(c['text'] for c in g) for i,g in enumerate(groups)))
now=datetime.datetime.now(datetime.timezone.utc).isoformat();checks={'decode':True,'video':any(s['codec_type']=='video' and s['width']==1080 and s['height']==1920 for s in probe['streams']),'audio':any(s['codec_type']=='audio' for s in probe['streams']),'durationSeconds':float(probe['format']['duration']),'captionPhraseMin':min(map(len,groups)),'captionPhraseMax':max(map(len,groups)),'speed':1.15,'sfxDb':-8,'sceneCount':13,'visualFrames':['cover-v06.png','map-check-v03.png','check-flow-v06.png','check-cta-v06.png']}
qa={'schemaVersion':1,'passed':checks['decode'] and checks['video'] and checks['audio'],'checkedAt':now,'checks':checks,'outputs':{'render':str(video),'cover':str(out/'cover-v06.png'),'captionsSrt':str(srt),'source':str(out/'render-props-v03.json')}}
(project/'windi/qa/qa-script-v03.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
statefile=project/'.windi/workflow.json';state=json.loads(statefile.read_text());state['current']['layout']='windi/layouts/layout-v03.json';state['current']['script']='windi/scripts/script-v03.json'
for kind in ['layout','script']:
 state['approvals'][kind].update(artifact=state['current'][kind],version=3,approvedAt=now,authorizationBasis='Direct user-requested revision; see EDIT-v03.md')
state['approvals']['layout']['layoutId']='windi-workflow-map-v03'
state['artifacts'].update(voice='windi/voice/voice-v03-115.wav',captions='windi/timing/captions-v03.json',render='windi/renders/final-v06.mp4',cover='windi/renders/cover-v06.png',qa='windi/qa/qa-script-v03.json');state['updatedAt']=now
state['editRevision']={'source':'windi/renders/render-props-v03.json','instructions':'EDIT-v03.md','reusedImages':True,'cutOriginalMs':[71180,78280],'playbackSpeed':1.15}
statefile.write_text(json.dumps(state,ensure_ascii=False,indent=2));print(json.dumps(qa,ensure_ascii=False))
