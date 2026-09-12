import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Shared browser module.
import {reuseWorkspaceTab} from '../extension/workspace-tab.js';
test('repeated jobs and worker restarts reuse the exact workspace without focusing it',async()=>{
 const records:any[]=[];const created:any[]=[];
 const tabs={query:async()=>records,create:async(options:any)=>{created.push(options);const tab={id:records.length+1,...options};records.push(tab);return tab;}};
 const url='https://flow.google.com/project/a';
 assert.equal((await reuseWorkspaceTab(tabs,url)).id,1);
 assert.equal((await reuseWorkspaceTab(tabs,url+'/#preview')).id,1);
 assert.deepEqual(created,[{url,active:false}]);
 assert.equal((await reuseWorkspaceTab(tabs,'https://flow.google.com/project/b')).id,2);
 records.shift();assert.equal(created.length,2);
 await reuseWorkspaceTab(tabs,url);assert.equal(created.length,3);
});
test('does not adopt wrong origins or different query sessions',async()=>{
 let creations=0;
 const tabs={query:async()=>[{id:1,url:'https://evil.example/project/a'},{id:2,url:'https://flow.google.com/project/a?session=other'}],create:async(options:any)=>{creations++;return {id:3,...options};}};
 assert.equal((await reuseWorkspaceTab(tabs,'https://flow.google.com/project/a')).id,3);assert.equal(creations,1);
});
