// Grok Web protocol adapted from chenyme/grok2api (MIT), commit 906b9493.
// Runs only in a Grok-owned tab. Browser cookies stay inside the browser.
export async function grokWebPage(op,args){
  if(location.origin!=='https://grok.com')throw new Error('GROK_WRONG_ORIGIN');
  const root=window.__windiGrokWebV1 ||= {jobs:{},uploads:{}};
  const trusted=value=>{const u=new URL(value,'https://assets.grok.com/');if(u.protocol!=='https:'||u.username||u.password||u.port||!['assets.grok.com','imagine-public.x.ai','imgen.x.ai','grok.com'].includes(u.hostname))throw new Error('GROK_UNTRUSTED_MEDIA_URL');return u.href;};
  const request=async(endpoint,body)=>{
    const response=await fetch(endpoint,{method:'POST',credentials:'include',headers:body instanceof FormData?{}:{'Content-Type':'application/json'},body:body instanceof FormData?body:JSON.stringify(body),signal:AbortSignal.timeout(600000)});
    if(!response.ok){
      const detail=await response.text().catch(()=>"");
      if(response.status===401)throw new Error('GROK_LOGIN_REQUIRED');
      if(response.status===403){
        if(/page is out of date|reload to continue/i.test(detail))throw new Error('GROK_WEB_PAGE_OUTDATED');
        if(/challenge|captcha|cloudflare/i.test(detail))throw new Error('GROK_WEB_CHALLENGE');
        throw new Error('GROK_WEB_EDIT_BLOCKED');
      }
      if(response.status===429)throw new Error('GROK_QUOTA_EXCEEDED');
      throw new Error(`GROK_HTTP_${response.status}`);
    }
    return response;
  };
  if(op==='status'){
    await request('/rest/media/imagine/quota_info',{}).then(r=>r.json());
    return {authenticated:true,transport:'web',authPending:false};
  }
  if(op==='uploadBegin'){
    if(!/^[a-f0-9]{64}$/.test(args.sha256)||args.size>20*1024*1024||args.size<64)throw new Error('GROK_INVALID_REFERENCE');
    root.uploads[args.key]={...args,chunks:[],length:0,time:Date.now()};
    for(const [key,item] of Object.entries(root.uploads))if(Date.now()-item.time>300000)delete root.uploads[key];
    return {ready:true};
  }
  if(op==='uploadChunk'){
    const item=root.uploads[args.key];
    if(!item||args.index!==item.chunks.length||typeof args.data!=='string'||args.data.length>262144||! /^[A-Za-z0-9+/]*={0,2}$/.test(args.data)||item.length+args.data.length>Math.ceil(item.size/3)*4)throw new Error('GROK_INVALID_REFERENCE_CHUNK');
    item.chunks.push(args.data);item.length+=args.data.length;return {received:args.index};
  }
  if(op==='uploadFinish'){
    const item=root.uploads[args.key];delete root.uploads[args.key];if(!item)throw new Error('GROK_REFERENCE_MISSING');
    const bytes=Uint8Array.from(atob(item.chunks.join('')),c=>c.charCodeAt(0));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    if(bytes.length!==item.size||hash!==item.sha256)throw new Error('GROK_REFERENCE_HASH_MISMATCH');
    const body=new FormData();body.append('file',new Blob([bytes],{type:item.mime}),item.name);body.append('file_source','IMAGINE_SELF_UPLOAD_FILE_SOURCE');
    const uploaded=await (await request('/http/upload-file-v2/direct',body)).json();
    if(uploaded.terminalError||!uploaded.fileMetadata?.fileMetadataId)throw new Error('GROK_REFERENCE_UPLOAD_FAILED');
    if(args.ui)(root.refs ||= {})[uploaded.fileMetadata.fileMetadataId]={name:item.name,mime:item.mime};
    return {assetId:uploaded.fileMetadata.fileMetadataId,sha256:hash};
  }
  if(op==='poll')return root.jobs[args.jobId]?{...root.jobs[args.jobId],socket:undefined}:{state:'missing'};
  if(op!=='start')throw new Error('GROK_INVALID_OPERATION');
  if(root.jobs[args.jobId])return {started:true,reused:true};
  const job=root.jobs[args.jobId]={state:'generating',progress:0,startedAt:Date.now()};
  const finish=(value,blob)=>{
    if(value)job.url=trusted(value);
    else if(typeof blob==='string'&&blob.length&&blob.length<45*1024*1024){const encoded=blob.replace(/^data:image\/[a-z0-9.+-]+;base64,/i,'');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));job.url=URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));}
    else throw new Error('GROK_WEB_RESULT_UNKNOWN');
    job.state='complete';job.progress=100;
  };
  const fail=error=>{job.state='failed';job.error=/^GROK_[A-Z0-9_]+$/.test(error.message)?error.message:'GROK_WEB_RESULT_UNKNOWN';};
  const stream=async()=>{
    const image= args.media==='image';
    const payload=image?{modelName:'imagine-image-edit',message:args.prompt,enableImageStreaming:true,enableSideBySide:true,sendFinalMetadata:true,mediaGenInput:{imageToImage:{prompt:args.prompt,inputAssets:args.assets,aspectRatio:args.aspect}}}:
      {modelName:'imagine-video-gen',message:args.prompt+' --mode=custom',enableImageStreaming:true,enableSideBySide:true,sendFinalMetadata:true,responseMetadata:{experiments:[],modelConfigOverride:{modelMap:{}}},mediaGenInput:{textToVideo:{prompt:args.prompt,aspectRatio:args.aspect,duration:args.duration,resolutionName:args.resolution}},kind:'CONVERSATION_KIND_IMAGINE'};
    const response=await request('/rest/app-chat/conversations/new',payload);const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    const consume=line=>{line=line.replace(/^data:\s*/,'').trim();if(!line.startsWith('{'))return;let data;try{data=JSON.parse(line);}catch{return;}
      const r=data.result?.response;if(data.error||r?.error)throw new Error('GROK_WEB_GENERATION_FAILED');
      const conversation=data.result?.conversation?.conversationId||r?.conversationId;if(conversation)job.conversationId=conversation;
      const frame=image?r?.streamingImageGenerationResponse:r?.streamingVideoGenerationResponse;
      if(frame){if(frame.moderated)throw new Error('GROK_CONTENT_FILTERED');job.progress=Number(frame.progress)||0;
        const url=image?(frame.imageUrl||frame.url):(frame.videoUrl||frame.contentUrl||frame.contentURL||frame.assetUrl||frame.fileUri);
        if(url&&(frame.progress>=100||frame.isFinal))finish(url);
      }
      if(!image&&job.state!=='complete')for(const file of r?.modelResponse?.fileAttachments||[])if(typeof file==='string'&&/\.mp4(?:\?|$)/.test(file))finish(file);
    };
    // Grok currently returns both SSE and a compact stream of adjacent JSON
    // values. Splitting only on newlines drops the latter's final video URL.
    // Extract balanced JSON objects so a job stays connected until the final
    // media event is observed, regardless of transfer framing.
    const drain=()=>{let start=-1,depth=0,inString=false,escaped=false,consumed=0;
      for(let index=0;index<buffer.length;index++){const char=buffer[index];
        if(start<0){if(char==='{'){start=index;depth=1;}continue;}
        if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='\"')inString=false;continue;}
        if(char==='\"'){inString=true;continue;}if(char==='{')depth++;else if(char==='}')depth--;
        if(depth===0){consume(buffer.slice(start,index+1));consumed=index+1;start=-1;if(job.state==='complete')break;}
      }
      buffer=start>=0?buffer.slice(start):buffer.slice(consumed);
    };
    try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});if(buffer.length>8*1024*1024)throw new Error('GROK_RESPONSE_TOO_LARGE');drain();if(job.state==='complete')break;}buffer+=decoder.decode();drain();if(job.state!=='complete')throw new Error('GROK_WEB_RESULT_UNKNOWN');}finally{await reader.cancel().catch(()=>{});}
  };
  if(args.media==='video'||args.assets?.length){void stream().catch(fail);return {started:true};}
  const socket=new WebSocket('wss://grok.com/ws/imagine/listen');const slots=new Map();
  const timer=setTimeout(()=>{fail(new Error('GROK_WEB_TIMEOUT_UNKNOWN'));socket.close();},300000);
  const message=content=>({type:'conversation.item.create',timestamp:Date.now(),item:{type:'message',content}});
  socket.onopen=()=>{
    socket.send(JSON.stringify(message([{type:'reset'}])));
    socket.send(JSON.stringify(message([{requestId:args.jobId,text:args.prompt,type:'input_text',properties:{section_count:0,is_kids_mode:false,enable_nsfw:false,skip_upsampler:false,enable_side_by_side:true,is_initial:false,aspect_ratio:args.aspect,enable_pro:true,num_generations:1}}])));
  };
  socket.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type==='error')throw new Error('GROK_WEB_GENERATION_FAILED');
    const id=data.image_id||data.job_id||data.id||data.url;if(!id)return;const slot=slots.get(id)||{};slots.set(id,slot);
    if(data.type==='image'&&(!Number.isFinite(data.percentage_complete)||data.percentage_complete>=100)){slot.final=true;slot.url=data.url;slot.blob=data.blob;}
    if(data.type==='json'&&data.current_status==='completed'){slot.completed=true;slot.moderated=data.moderated;if(data.url||data.blob){slot.url=data.url;slot.blob=data.blob;slot.final=true;}}
    job.progress=Number(data.percentage_complete)||job.progress;
    if(slot.completed&&slot.final&&!slot.moderated&&(slot.url||slot.blob)){finish(slot.url,slot.blob);clearTimeout(timer);socket.close();}
  }catch(error){fail(error);clearTimeout(timer);socket.close();}};
  socket.onerror=()=>{fail(new Error('GROK_WEB_SOCKET_FAILED'));clearTimeout(timer);};
  socket.onclose=()=>{clearTimeout(timer);if(job.state==='generating')fail(new Error('GROK_WEB_RESULT_UNKNOWN'));};
  return {started:true};
}
