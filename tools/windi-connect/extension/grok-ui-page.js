// Video uses Imagine's own composer so the site's session and request signing
// remain under Grok's control. Never replay requests or solve verification.
export async function grokUIPage(op,args){
  if(location.origin!=='https://grok.com')throw new Error('GROK_WRONG_ORIGIN');
  const key='windi.grok.ui.'+args.jobId;
  const visible=e=>Boolean(e.getClientRects().length)&&getComputedStyle(e).visibility!=='hidden';
  const label=e=>(e.getAttribute('aria-label')||e.textContent||'').trim();
  const find=name=>[...document.querySelectorAll('button,[role="tab"],[role="radio"],[role="menuitem"],[role="menuitemradio"],[role="option"]')].find(e=>visible(e)&&label(e)===name);
  const wait=async(fn,code,ms=10000)=>{const end=Date.now()+ms;while(Date.now()<end){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,150));}throw new Error(code);};
  const save=value=>{sessionStorage.setItem(key,JSON.stringify(value));return value;};
  if(op==='reset'){sessionStorage.removeItem(key);return {ready:true};}
  let job=JSON.parse(sessionStorage.getItem(key)||'null')||args.record;
  if(op==='poll'){
    if(!job)return {state:'missing'};
    if(job.state==='complete'||job.state==='failed')return job;
    const url=new URL(location.href);
    if(/^\/imagine\/post\/[a-f0-9-]+$/.test(url.pathname)&&url.searchParams.get('conversation')){
      // Grok replaces its placeholder post ID while the same conversation
      // generates. The conversation is the stable submission identity.
      const expected=job.conversationId||(job.postUrl?new URL(job.postUrl).searchParams.get('conversation'):null);
      if(expected&&expected!==url.searchParams.get('conversation'))return {...job,state:'missing'};
      job.postUrl=url.href;job.conversationId=url.searchParams.get('conversation');
      const candidates=[...document.querySelectorAll('video')].filter(e=>{
        if(!visible(e))return false;const r=e.getBoundingClientRect();
        return r.width>=200&&r.height>=200&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;
      });
      const videos=[...new Map(candidates.filter(v=>v.currentSrc||v.src).map(v=>[v.currentSrc||v.src,v])).values()];
      const progress=document.body.innerText.match(/Generating\s*(\d+)\s*%/i);
      job.progress=progress?Number(progress[1]):job.progress;
      const download=find('Download');
      job.observation={videoCount:videos.length,readyStates:videos.map(v=>v.readyState),downloadReady:Boolean(download&&!download.disabled),generating:Boolean(progress)};
      // Only the correlated post, one playable video and an enabled Download
      // constitute a final result. Never select the newest library thumbnail.
      if(!progress&&videos.length===1&&videos[0].readyState>=1&&videos[0].videoWidth&&download&&!download.disabled){
        const src=videos[0].currentSrc||videos[0].src;
        if(src){job.url=src;job.state='complete';job.progress=100;job.width=videos[0].videoWidth;job.height=videos[0].videoHeight;job.duration=videos[0].duration;}
      }
    }
    return save(job);
  }
  if(op!=='start')throw new Error('GROK_INVALID_OPERATION');
  if(job)return {started:true,reused:true,...job};
  if(location.pathname!=='/imagine')throw new Error('GROK_UI_WRONG_PAGE');
  const choose=async(name,value)=>{
    const select=[...document.querySelectorAll('select')].find(e=>e.getAttribute('aria-label')===name);
    if(select){
      const option=[...select.options].find(e=>e.textContent.trim()===value||e.textContent.trim().startsWith(value));
      if(!option||option.disabled)throw new Error('GROK_UI_OPTION_UNAVAILABLE');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,option.value);
      select.dispatchEvent(new Event('change',{bubbles:true}));
      await wait(()=>select.value===option.value,'GROK_UI_OPTION_NOT_APPLIED');return;
    }
    const trigger=await wait(()=>find(name),'GROK_UI_CONTROL_MISSING');trigger.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'mouse'}));trigger.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,pointerType:'mouse'}));trigger.click();
    const option=await wait(()=>[...document.querySelectorAll('[role="menuitemradio"],[role="menuitemcheckbox"],[role="radio"],[role="menuitem"],[role="option"],button')].find(e=>visible(e)&&(label(e)===value||label(e).startsWith(value))),'GROK_UI_OPTION_UNAVAILABLE');
    if(option.disabled||option.getAttribute('aria-disabled')==='true')throw new Error('GROK_UI_OPTION_UNAVAILABLE');option.click();
    await wait(()=>!option.isConnected||!visible(option),'GROK_UI_OPTION_NOT_APPLIED',3000);
  };
  (await wait(()=>find('Video'),'GROK_UI_CONTROL_MISSING')).click();
  const refs=args.assets||[];
  if(refs.length){
    (await wait(()=>find('Upload'),'GROK_UI_CONTROL_MISSING')).click();
    (await wait(()=>find('Uploads'),'GROK_UI_UPLOAD_MISSING')).click();
  }
  for(const [index,id] of refs.entries()){
    const ref=window.__windiGrokWebV1?.refs?.[id];if(!ref)throw new Error('GROK_REFERENCE_MISSING');
    (await wait(()=>find(`Select image ${ref.name}`),'GROK_UI_REFERENCE_NOT_LISTED',20000)).click();
    await wait(()=>[...document.querySelectorAll('button')].filter(e=>visible(e)&&label(e)==='Remove image').length===index+1,'GROK_UI_REFERENCE_NOT_ATTACHED',5000);
    delete window.__windiGrokWebV1.refs[id];
  }
  if(refs.length)find('Upload')?.click();
  // A single image defaults to first-frame mode; an explicit ratio must be
  // available, otherwise stop before spending credits instead of silently
  // returning a video with the source image's aspect.
  await choose('Video resolution',args.resolution);
  await choose('Video duration',`${args.duration}s`);
  if(refs.length!==1)await choose('Aspect Ratio',args.aspect==='auto'?'Auto':args.aspect);
  const editor=await wait(()=>[...document.querySelectorAll('[contenteditable="true"],textarea')].find(e=>visible(e)&&(e.getAttribute('aria-label')==='Ask Grok anything'||e.getAttribute('data-placeholder')==='Type to imagine')),'GROK_UI_COMPOSER_MISSING');
  editor.focus();
  if(editor.tagName==='TEXTAREA'){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(editor,args.prompt);editor.dispatchEvent(new Event('input',{bubbles:true}));}
  else{document.execCommand('selectAll',false);document.execCommand('insertText',false,args.prompt);}
  const submit=await wait(()=>{const e=find('Submit');return e&&!e.disabled?e:null;},'GROK_UI_SUBMIT_UNAVAILABLE');
  job=save({state:'generating',progress:0,startedAt:Date.now(),referenceCount:refs.length,submitIntent:true});
  submit.click();
  return {started:true,...job};
}
