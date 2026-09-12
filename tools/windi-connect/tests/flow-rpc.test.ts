import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore JavaScript protocol adapter shared with the extension.
import {buildFlowImageRequest,parseFlowRpc,flowRpcOriginal} from '../extension/flow-rpc.js';

test('Flow RPC maps prompt/project/model explicitly, without UI selectors',()=>{
  const request=buildFlowImageRequest({projectId:'19c0caf9-a7e4-46e8-8206-bdc7c83a8b30',prompt:'Hello',model:'NARWHAL',aspect:'portrait',seed:42,captcha:'test',batchId:'batch'});
  assert.equal(request[3][5],'19c0caf9-a7e4-46e8-8206-bdc7c83a8b30');
  assert.equal(request[1][0][5],'NARWHAL');
  assert.equal(request[1][0][4],2);
  assert.deepEqual(request[1][0][8],[[['Hello']]]);
  assert.throws(()=>buildFlowImageRequest({projectId:'19c0caf9-a7e4-46e8-8206-bdc7c83a8b30',prompt:'Hello',model:'auto',aspect:'portrait'}),/MODEL_UNSUPPORTED/);
});
test('Flow RPC parses framed response and never treats HTTP 200 as success by itself',()=>{
  const row=['wrb.fr','ogiZ0b',JSON.stringify([[]])];
  assert.deepEqual(parseFlowRpc(")]}'\n\n123\n"+JSON.stringify([row]),'ogiZ0b'),[[]]);
  assert.throws(()=>parseFlowRpc(JSON.stringify([['er','ogiZ0b',7]]),'ogiZ0b'),/FLOW_RPC_ERROR_7/);
  assert.throws(()=>parseFlowRpc('<html>login</html>','ogiZ0b'),/UNKNOWN/);
  assert.throws(()=>parseFlowRpc(JSON.stringify([row,row]),'ogiZ0b'),/UNKNOWN/);
});
test('Flow original selects generated media only, never reference thumbnails',()=>{
  const generated:any[]=[];generated[13]='https://lh3.googleusercontent.com/example=s512-rw';
  const media:any[]=[];media[0]='media-1';media[6]=[generated];
  const data=[[media],['https://example.com/reference.png']];
  assert.deepEqual(flowRpcOriginal(data),{mediaId:'media-1',url:'https://lh3.googleusercontent.com/example=s512-rw'});
  generated[13]='https://flow-content.google/image/token=abc?signature=a%2Bb';
  assert.equal(flowRpcOriginal(data).url,generated[13]);
  assert.throws(()=>flowRpcOriginal([[]]),/RECONCILIATION/);
  assert.throws(()=>flowRpcOriginal([[media,media]]),/RECONCILIATION/);
  generated[13]='https://evil.example/a';assert.throws(()=>flowRpcOriginal(data),/INVALID_ORIGINAL_URL/);
});
