import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// @ts-ignore Browser-only JavaScript module.
import {withFlowBackground} from '../extension/flow-background.js';

test('background renderer focus is scoped and never changes OS focus',async()=>{
  const calls:any[]=[];
  const cdp=async(provider:string,tabId:number,method:string,params:any)=>{calls.push({provider,tabId,method,params});};
  const result=await withFlowBackground({tabId:17,cdp},async()=>{calls.push('submit');return {submitted:true};});
  assert.deepEqual(result,{submitted:true});
  assert.deepEqual(calls,[{provider:'flow',tabId:17,method:'Emulation.setFocusEmulationEnabled',params:{enabled:true}},'submit',{provider:'flow',tabId:17,method:'Emulation.setFocusEmulationEnabled',params:{enabled:false}}]);
  const source=await readFile(new URL('../extension/combined-background.js',import.meta.url),'utf8');
  const submit=source.slice(source.indexOf("op==='flowBackgroundSubmit'"),source.indexOf("op==='flowBackgroundResult'"));
  assert.doesNotMatch(submit,/windows\.update|tabs\.update|getLastFocused/);
  assert.match(source,/focused:false,type:'normal',state:'minimized'/);
});

test('unsupported background focus fails before submission',async()=>{
  let submitted=false;
  await assert.rejects(withFlowBackground({tabId:17,cdp:async()=>{throw new Error('method unsupported');}},async()=>{submitted=true;}),/FLOW_BACKGROUND_UNAVAILABLE/);
  assert.equal(submitted,false);
});

test('submission errors restore renderer state and preserve the original error on detach',async()=>{
  const enabled:boolean[]=[];
  const cdp=async(_p:string,_t:number,_m:string,args:any)=>{enabled.push(args.enabled);if(!args.enabled)throw new Error('tab closed');};
  await assert.rejects(withFlowBackground({tabId:17,cdp},async()=>{throw new Error('RESULT_UNCLEAR');}),/RESULT_UNCLEAR/);
  assert.deepEqual(enabled,[true,false]);
});

// @ts-ignore Browser-only JavaScript module.
import {waitFlowImageSettings} from '../extension/flow-ui.js';
test('settings wait for async background popover without toggling it repeatedly',async()=>{
  let reads=0,pauses=0;
  await waitFlowImageSettings({tabId:17,evaluate:async()=>++reads===4,pause:async()=>{pauses++;}});
  assert.equal(reads,4);assert.equal(pauses,3);
  await assert.rejects(waitFlowImageSettings({tabId:17,evaluate:async()=>false,pause:async()=>{}}),/FLOW_UI_SETTINGS_NOT_READY/);
});
