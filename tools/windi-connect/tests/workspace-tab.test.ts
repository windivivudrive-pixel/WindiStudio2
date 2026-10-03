import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Shared browser module.
import {reuseWorkspaceTab,waitForWorkspaceTab} from '../extension/workspace-tab.js';
test('repeated jobs and worker restarts reuse the exact workspace without focusing it',async()=>{
 const records:any[]=[];const created:any[]=[];
 const tabs={query:async()=>records,update:async()=>{throw new Error('WORKSPACE_TAB_MUST_NOT_FOCUS');},create:async(options:any)=>{created.push(options);const tab={id:records.length+1,...options};records.push(tab);return tab;}};
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
test('a discarded provider tab is reloaded before it is used',async()=>{
 let reloads=0;let tab:any={id:7,url:'https://flow.google.com/',status:'complete',discarded:true};
 const tabs:any={get:async()=>tab,reload:async()=>{reloads++;tab={...tab,status:'loading',discarded:false};}};
 const pause=async()=>{tab={...tab,status:'complete'};};
 assert.equal((await waitForWorkspaceTab(tabs,7,(url:string)=>url==='https://flow.google.com/',{attempts:3,pause})).id,7);
 assert.equal(reloads,1);
});

test('Flow asset editors belong only to their original exact project and query',async()=>{
 // @ts-ignore Shared browser module.
 const {sameFlowProject}=await import('../extension/workspace-tab.js');
 const a='https://flow.google.com/project/814346b3-2731-4075-a3cc-aada2e43379d';
 assert.equal(sameFlowProject(a+'/edit/d8820cb5-472e-4709-887d-308ef9bb5053',a),true);
 assert.equal(sameFlowProject(a,'https://flow.google.com/project/a81a810f-b91d-40eb-9ec2-bc1674544178'),false);
 assert.equal(sameFlowProject(a+'?profile=other',a),false);
 assert.equal(sameFlowProject(a.replace('flow.google.com','example.com'),a),false);
});
