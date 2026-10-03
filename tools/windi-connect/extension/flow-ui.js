// Flow UI adapter: explicit settings, durable job ownership, one submission.
export async function waitFlowImageSettings({tabId,evaluate,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  for(let attempt=0;attempt<40;attempt++) {
    const ready=await evaluate('flow',tabId,()=>{
      const radios=[...document.querySelectorAll('[role="radio"],input[type="radio"]')];
      return radios.some(el=>/(?:^|\s)(image|hình ảnh)$/i.test((el.innerText||el.getAttribute('aria-label')||'').trim()));
    });
    if(ready)return;
    await pause(150);
  }
  throw new Error('FLOW_UI_SETTINGS_NOT_READY');
}
export async function flowUiSubmit({tabId,jobId,prompt,aspect,model='NARWHAL',storage,evaluate,cdp,click}) {
    prompt=String(prompt||'').trim();
    if(!/^[a-zA-Z0-9_-]+$/.test(jobId)||!prompt||prompt.length>24000)throw new Error('INVALID_TEXT');
    const ratio={portrait:'9:16',landscape:'16:9',square:'1:1','3x4':'3:4','4x3':'4:3'}[aspect];
    if(!ratio)throw new Error('FLOW_UI_ASPECT_UNSUPPORTED');
    if(!['NARWHAL','GEM_PIX_2','HARBOR_SEAL'].includes(model))throw new Error('FLOW_UI_MODEL_UNSUPPORTED');
    const key=`flowUiJob:${jobId}`;
    const prior=(await storage.get(key))[key];
    if(prior&&['submitting','submitted','downloaded'].includes(prior.phase))throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');
    let prepared;
    for(let attempt=0;attempt<30;attempt++){
      prepared=await evaluate('flow',tabId,()=>{
      const editor=document.querySelector('.ProseMirror[contenteditable="true"], [contenteditable="true"]');
      if(!editor||editor.getBoundingClientRect().width<2)return {error:'FLOW_UI_PROMPT_NOT_FOUND'};
      if((editor.innerText||'').trim()){try{const sel=window.getSelection();const range=document.createRange();range.selectNodeContents(editor);sel.removeAllRanges();sel.addRange(range);document.execCommand('delete',false,null);}catch(_){}}
      if((editor.innerText||'').trim())return {error:'FLOW_UI_PROMPT_NOT_EMPTY'};
      const settings=[...document.querySelectorAll('button')].find(el=>/^(settings trigger|điều kiện kích hoạt cài đặt)$/i.test(el.getAttribute('aria-label')||''));
      if(!settings)return {error:'FLOW_UI_IMAGE_MODEL_NOT_SELECTED'};
      const agent=[...document.querySelectorAll('button,[role="button"]')].find(el=>/^(agent|tác nhân)$/i.test(el.getAttribute('aria-label')||el.innerText||''));
      if(agent?.getAttribute('aria-pressed')==='true')agent.click();
      editor.focus();
      const tiles=[...document.querySelectorAll('img[alt*="Tile displaying"],img[alt*="Ô hiển thị"],img[alt*="Ô thể hiện"]')];
      return {visibility:document.visibilityState,beforeTiles:tiles.length,beforeTileSources:tiles.map(img=>img.currentSrc||img.src)};
      });
      if(prepared?.error!=='FLOW_UI_PROMPT_NOT_FOUND')break;
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(prepared?.error)throw new Error(prepared.error);
    const settings=await evaluate('flow',tabId,()=>{
      const trigger=[...document.querySelectorAll('button')].find(el=>/^(settings trigger|điều kiện kích hoạt cài đặt)$/i.test(el.getAttribute('aria-label')||''));
      if(!trigger)return {error:'FLOW_UI_SETTINGS_NOT_FOUND'};
      const options=[...document.querySelectorAll('[role="radio"],input[type="radio"]')];
      if(!options.some(element=>/^(?:16:9|9:16|4:3|3:4|1:1)$/.test((element.innerText||element.getAttribute('aria-label')||'').trim().split(/\s+/).at(-1))))trigger.click();
      return {opened:true};
    });
    if(settings?.error)throw new Error(settings.error);
    await waitFlowImageSettings({tabId,evaluate});
    const configured=await evaluate('flow',tabId,()=>{
      const radios=[...document.querySelectorAll('[role="radio"],input[type="radio"]')];
      const text=el=>(el.innerText||el.getAttribute('aria-label')||'').trim();
      const image=radios.find(el=>/(?:^|\s)(image|hình ảnh)$/i.test(text(el)));
      if(!image)return {error:'FLOW_UI_IMAGE_MODE_NOT_FOUND'};image.click();
      const one=radios.find(el=>/^x1$/i.test(text(el)));
      if(!one)return {error:'FLOW_UI_COUNT_NOT_FOUND'};one.click();
      return {configured:true};
    });
    if(configured?.error)throw new Error(configured.error);
    const modelLabel={NARWHAL:'Nano Banana 2',GEM_PIX_2:'Nano Banana Pro',HARBOR_SEAL:'Nano Banana 2 Lite'}[model];
    const selectedModel=await evaluate('flow',tabId,label=>{
      const trigger=[...document.querySelectorAll('button')].find(el=>/^(settings trigger|điều kiện kích hoạt cài đặt)$/i.test(el.getAttribute('aria-label')||''));
      return (trigger?.innerText||'').split('\n')[0].replace(/🍌/g,'').trim()===label;
    },modelLabel);
    if(!selectedModel){
      const opened=await evaluate('flow',tabId,()=>{
        const button=[...document.querySelectorAll('button,[role="combobox"]')].find(el=>/select model family|choose model|chọn nhóm mô hình/i.test(el.getAttribute('aria-label')||''));
        if(!button)return false;button.click();return true;
      });
      if(!opened)throw new Error('FLOW_UI_MODEL_NOT_FOUND');
      await new Promise(resolve=>setTimeout(resolve,150));
      const applied=await evaluate('flow',tabId,label=>{
        const option=[...document.querySelectorAll('[role="option"],[role="menuitem"]')].find(el=>(el.innerText||el.textContent||'').replace(/🍌/g,'').trim()===label);
        if(!option)return false;option.click();return true;
      },modelLabel);
      if(!applied)throw new Error('FLOW_UI_MODEL_NOT_FOUND');
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    const ratioOption=await evaluate('flow',tabId,wanted=>{
      const option=[...document.querySelectorAll('[role="radio"],input[type="radio"]')].find(element=>(element.innerText||element.getAttribute('aria-label')||'').trim().split(/\s+/).at(-1)===wanted);
      if(!option)return {error:'FLOW_UI_ASPECT_NOT_FOUND'};
      option.click();
      return {selected:option.getAttribute('aria-checked')==='true'||option.checked===true};
    },ratio);
    if(ratioOption?.error)throw new Error(ratioOption.error);
    await new Promise(resolve=>setTimeout(resolve,150));
    const selected=await evaluate('flow',tabId,wanted=>{
      const option=[...document.querySelectorAll('[role="radio"],input[type="radio"]')].find(element=>(element.innerText||element.getAttribute('aria-label')||'').trim().split(/\s+/).at(-1)===wanted);
      return Boolean(option&&(option.getAttribute('aria-checked')==='true'||option.checked===true));
    },ratio);
    if(!selected)throw new Error('FLOW_UI_ASPECT_NOT_SELECTED');
    await cdp('flow',tabId,'Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await cdp('flow',tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await evaluate('flow',tabId,()=>document.querySelector('.ProseMirror[contenteditable="true"], [contenteditable="true"]')?.focus());
    await cdp('flow',tabId,'Input.insertText',{text:prompt});
    await new Promise(resolve=>setTimeout(resolve,300));
    const ready=await evaluate('flow',tabId,wanted=>{
      const editor=document.querySelector('.ProseMirror[contenteditable="true"], [contenteditable="true"]');
      if((editor?.innerText||'').trim()!==wanted)return {error:'FLOW_UI_PROMPT_MISMATCH'};
      const button=[...document.querySelectorAll('button')].find(el=>/start generation|bắt đầu tạo/i.test(el.getAttribute('aria-label')||''));
      if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return {error:'FLOW_UI_START_NOT_READY'};
      const rect=button.getBoundingClientRect();
      if(rect.width<2||rect.height<2)return {error:'FLOW_UI_START_NOT_VISIBLE'};
      return {point:{x:rect.left+rect.width/2,y:rect.top+rect.height/2}};
    },prompt);
    if(ready?.error)throw new Error(ready.error);
    const state={jobId,prompt,beforeTiles:prepared.beforeTiles,beforeTileSources:prepared.beforeTileSources,workspaceUrl:await evaluate('flow',tabId,()=>location.href),phase:'submitting',model,aspect,createdAt:new Date().toISOString()};
    await storage.set({[key]:state});
    // One trusted click. A second click after a slow acknowledgement could
    // spend quota twice; the durable marker forbids an automatic resubmission.
    await click(ready.point);
    for(let attempt=0;attempt<40;attempt++){
      await new Promise(resolve=>setTimeout(resolve,250));
      const accepted=await evaluate('flow',tabId,wanted=>{
        const editor=document.querySelector('.ProseMirror[contenteditable="true"], [contenteditable="true"]');
        return (editor?.innerText||'').trim()!==wanted;
      },prompt);
      if(accepted){await storage.set({[key]:{...state,phase:'submitted'}});return {submitted:true,visibility:prepared.visibility,beforeTiles:prepared.beforeTiles};}
    }
    throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');

}
export async function flowUiResult({tabId,jobId,prompt,beforeTiles,storage,evaluate,downloads,remember}) {
    prompt=String(prompt||'').trim();
    const saved=(await storage.get(`flowUiJob:${jobId}`))[`flowUiJob:${jobId}`];
    if(!saved||saved.prompt!==prompt)throw new Error('DOWNLOAD_RESULT_UNCLEAR');
    const current=await evaluate('flow',tabId,()=>location.href);
    if(new URL(current).origin!==new URL(saved.workspaceUrl).origin||!new URL(current).pathname.startsWith(new URL(saved.workspaceUrl).pathname.replace(/\/edit\/.*$/,'')))throw new Error('TAB_NOT_OWNED_OR_WRONG_PROVIDER');
    if(saved.downloadId){const [download]=await downloads.search({id:saved.downloadId});if(download&&download.state!=='interrupted'){await remember(download.id);return {phase:'downloading',downloadId:download.id};}}
    const state=await evaluate('flow',tabId,({wanted,beforeTiles,beforeSources,rejected})=>{
      const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().toLocaleLowerCase();
      const target=normalize(wanted);
      const visible=element=>{const rect=element.getBoundingClientRect();return rect.width>1&&rect.height>1;};
      const matches=[...document.querySelectorAll('div,p,span')].filter(visible).filter(element=>normalize(element.innerText||element.textContent).includes(target)).sort((a,b)=>normalize(a.innerText||a.textContent).length-normalize(b.innerText||b.textContent).length);
      const textElement=matches[0];
      if(location.pathname.includes('/edit/'))return textElement?{phase:'asset-open',url:location.href}:{phase:'wrong-asset'};
      const tiles=[...document.querySelectorAll('img[alt*="Tile displaying"],img[alt*="Ô hiển thị"],img[alt*="Ô thể hiện"]')].filter(visible);
      if(!Number.isInteger(beforeTiles)||beforeTiles<0||tiles.length<=beforeTiles)return {phase:'waiting'};
      const tile=tiles.find(img=>!(beforeSources||[]).includes(img.currentSrc||img.src)&&!(rejected||[]).includes(img.currentSrc||img.src));
      if(!tile)return {phase:'waiting'};
      (tile.closest('button,[role="button"]')||tile).click();
      return {phase:'opening',source:tile.currentSrc||tile.src};
    },{wanted:prompt,beforeTiles:saved.beforeTiles??beforeTiles,beforeSources:saved.beforeTileSources,rejected:saved.rejectedTileSources});
    if(state.phase==='opening'){await storage.set({[`flowUiJob:${jobId}`]:{...saved,pendingTileSource:state.source}});return state;}
    if(state.phase==='wrong-asset'&&saved.pendingTileSource){
      await storage.set({[`flowUiJob:${jobId}`]:{...saved,pendingTileSource:null,rejectedTileSources:[...(saved.rejectedTileSources||[]),saved.pendingTileSource]}});
      await evaluate('flow',tabId,()=>{const back=[...document.querySelectorAll('button')].find(el=>/back button to return|nút quay lại để quay về trang trước/i.test(el.getAttribute('aria-label')||''));if(back)back.click();});
      return {phase:'waiting'};
    }
    if(state.phase!=='asset-open')return state;
    const menu=await evaluate('flow',tabId,()=>{
      const button=[...document.querySelectorAll('button')].find(element=>/download media|tải nội dung nghe nhìn/i.test(element.getAttribute('aria-label')||''));
      if(!button)return {phase:'waiting'};
      button.click();return {phase:'menu-open'};
    });
    if(menu.phase!=='menu-open')return menu;
    await new Promise(resolve=>setTimeout(resolve,200));
    const before=new Set((await downloads.search({limit:50,orderBy:['-startTime']})).map(item=>item.id));
    const picked=await evaluate('flow',tabId,()=>{
      const exact=value=>/^1k\s+(original\s+size|kích thước gốc)$/i.test(String(value||'').normalize('NFC').replace(/\s+/g,' ').trim());
      const options=[...document.querySelectorAll('[role="menuitem"],button,div,span')].filter(element=>exact(element.innerText||element.textContent)||exact(element.getAttribute('aria-label'))).sort((a,b)=>a.getBoundingClientRect().width*a.getBoundingClientRect().height-b.getBoundingClientRect().width*b.getBoundingClientRect().height);
      const option=options[0];if(!option)return false;option.click();return true;
    });
    if(!picked)return {phase:'download-option-missing'};
    for(let attempt=0;attempt<20;attempt++){
      await new Promise(resolve=>setTimeout(resolve,250));
      const items=await downloads.search({limit:50,orderBy:['-startTime']});
      const candidates=items.filter(item=>!before.has(item.id)&&item.referrer?.startsWith('https://flow.google.com/')&&((item.mime||'').startsWith('image/')||/\.(?:png|jpe?g|webp)$/i.test(item.filename||'')));
      if(candidates.length>1)throw new Error('DOWNLOAD_RESULT_UNCLEAR');
      const fresh=candidates[0];
      if(fresh){await remember(fresh.id);await storage.set({[`flowUiJob:${jobId}`]:{...saved,phase:'downloaded',downloadId:fresh.id}});return {phase:'downloading',downloadId:fresh.id};}
    }
    throw new Error('FLOW_UI_DOWNLOAD_NOT_OBSERVED');
}

export async function flowUiAttachReferences({tabId,files,evaluate,cdp}) {
  // Ingredient chips are independent of the prompt text. Clear the old
  // composition even for a job with no refs, before binding this job's files.
  const cleared=await evaluate('flow',tabId,()=>{
    const chips=[...document.querySelectorAll('button')].filter(el=>/^(ingredient|thành phần)$/i.test((el.getAttribute('aria-label')||'').normalize('NFC')));
    for(const chip of chips)chip.click();
    return chips.length;
  });
  if(cleared)await new Promise(resolve=>setTimeout(resolve,200));
  let expected=0;
  for(const file of files){
    let opened=false;
    for(let attempt=0;attempt<30&&!opened;attempt++){
    opened=await evaluate('flow',tabId,()=>{
      const button=[...document.querySelectorAll('button')].find(el=>/add ingredients to prompt|thêm thành phần vào ô nhập câu lệnh/i.test((el.getAttribute('aria-label')||'').normalize('NFC')));
      if(!button)return false;button.click();return true;
    });
    if(!opened)await new Promise(resolve=>setTimeout(resolve,500));
    }
    if(!opened)throw new Error('FLOW_UI_REFERENCE_PICKER_NOT_FOUND');
    await new Promise(resolve=>setTimeout(resolve,300));
    await cdp('flow',tabId,'Page.setInterceptFileChooserDialog',{enabled:true});
    try{
      const uploaded=await evaluate('flow',tabId,()=>{
        const button=[...document.querySelectorAll('button')].find(el=>/upload media|tải nội dung nghe nhìn lên/i.test(el.getAttribute('aria-label')||el.innerText||''));
        if(!button)return false;button.click();return true;
      });
      if(!uploaded)throw new Error('FLOW_UI_REFERENCE_UPLOAD_NOT_FOUND');
      const doc=await cdp('flow',tabId,'DOM.getDocument',{depth:-1,pierce:true});
      const input=await cdp('flow',tabId,'DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"]'});
      if(!input.nodeId)throw new Error('FLOW_UI_REFERENCE_UPLOAD_NOT_FOUND');
      await cdp('flow',tabId,'DOM.setFileInputFiles',{nodeId:input.nodeId,files:[file]});
    }finally{await cdp('flow',tabId,'Page.setInterceptFileChooserDialog',{enabled:false});}
    let attached=false;
    for(let attempt=0;attempt<120;attempt++){
      await new Promise(resolve=>setTimeout(resolve,500));
      const added=await evaluate('flow',tabId,()=>{
        const button=[...document.querySelectorAll('button')].find(el=>/^(add to prompt|thêm vào câu lệnh)$/i.test((el.getAttribute('aria-label')||el.innerText||'').normalize('NFC').trim()));
        if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return false;
        button.click();return true;
      });
      if(!added)continue;
      for(let check=0;check<30;check++){
        await new Promise(resolve=>setTimeout(resolve,200));
        const count=await evaluate('flow',tabId,()=>[...document.querySelectorAll('button')].filter(el=>/^(ingredient|thành phần)$/i.test((el.getAttribute('aria-label')||'').normalize('NFC'))).filter(el=>[...el.querySelectorAll('img')].some(img=>img.complete&&img.naturalWidth>0)).length);
        if(count===expected+1){attached=true;expected=count;break;}
      }
      break;
    }
    if(!attached)throw new Error('FLOW_UI_REFERENCE_NOT_ATTACHED');
    await cdp('flow',tabId,'Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await cdp('flow',tabId,'Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  }
  return {attached:files.length};
}
