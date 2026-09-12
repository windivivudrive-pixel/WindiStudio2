import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// @ts-ignore Shared browser module.
import {ReferenceTransfer} from '../extension/reference-transfer.js';
// @ts-ignore Shared browser module.
import {buildFlowUploadRequest,buildFlowImageRequest,flowUploadedMedia} from '../extension/flow-rpc.js';
const projectId='19c0caf9-a7e4-46e8-8206-bdc7c83a8b30';
test('upload and generation carry the actual reference media id in ingredient field',()=>{
 const request=buildFlowUploadRequest({projectId,base64:'YWJj',mime:'image/png',name:'ref.png',captcha:'upload-token'});
 assert.equal(request[0][5],projectId);assert.equal(request[1],'YWJj');assert.equal(request[2],'image/png');assert.equal(request[8],'ref.png');
 const mediaId=flowUploadedMedia([['uploaded-media-id']]);
 const generation=buildFlowImageRequest({projectId,prompt:'Use reference',model:'NARWHAL',aspect:'landscape',references:[mediaId]});
 assert.deepEqual(generation[1][0][2],[['uploaded-media-id',null,null,null,1]]);
 assert.throws(()=>flowUploadedMedia([[]]),/FLOW_UPLOAD_RESULT_INVALID/);
 assert.throws(()=>buildFlowUploadRequest({projectId,base64:'bad!',mime:'image/png'}),/INVALID_FLOW_REFERENCE/);
});
test('large reference chunks stay under native message size and verify full-file hash',async()=>{
 const bytes=Buffer.alloc(1400000,42),encoded=bytes.toString('base64');
 const meta={size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),mime:'image/png'};
 const transfer=new ReferenceTransfer();transfer.begin('job',meta);
 assert.throws(()=>transfer.append('job',1,'AAAA'),/REFERENCE_CHUNK_INVALID/);
 for(let offset=0,index=0;offset<encoded.length;offset+=524288,index++)transfer.append('job',index,encoded.slice(offset,offset+524288));
 assert.equal((await transfer.finish('job')).base64,encoded);assert.equal(transfer.pending.size,0);
 transfer.begin('corrupt',{...meta,sha256:'0'.repeat(64)});transfer.append('corrupt',0,'AAAA');await assert.rejects(transfer.finish('corrupt'),/REFERENCE_HASH_MISMATCH/);
});
