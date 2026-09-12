import test from 'node:test';
import assert from 'node:assert/strict';
import {createDownloadStore} from '../extension/download-store.js';
test('overlapping download events preserve both jobs and latest metadata',async()=>{
  let stored:any={downloads:[]};
  const storage={get:async()=>structuredClone(stored),set:async(value:any)=>{stored=structuredClone(value);}};
  const update=createDownloadStore(storage);
  await Promise.all([
    update(async(list:any[])=>{await new Promise(r=>setTimeout(r,10));list.push({id:1,jobId:'a'});}),
    update((list:any[])=>{list.push({id:2,jobId:'b'});}),
    update((list:any[])=>{list.find(x=>x.id===1).state='complete';})
  ]);
  assert.deepEqual(stored.downloads,[{id:1,jobId:'a',state:'complete'},{id:2,jobId:'b'}]);
});
