import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const hook=fileURLToPath(new URL('../agent-adapters/windi-video-workflow/hooks/guard-image-source.mjs',import.meta.url));
function decision(workspace:string,transcript:string){
  const run=spawnSync(process.execPath,[hook],{input:JSON.stringify({toolCall:{name:'generate_image',args:{}},workspacePaths:[workspace],transcriptPath:transcript}),encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  return JSON.parse(run.stdout).decision;
}

test('Antigravity image hook blocks Windi requests without blocking unrelated image work',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'windi-hook-'));
  try{
    const transcript=path.join(root,'transcript.jsonl');
    await writeFile(transcript,JSON.stringify({source:'USER_EXPLICIT',type:'USER_INPUT',content:'<USER_REQUEST>dùng windi connect để tạo hình phù hợp</USER_REQUEST>'})+'\n');
    assert.equal(decision(root,transcript),'deny');
    await writeFile(transcript,JSON.stringify({source:'USER_EXPLICIT',type:'USER_INPUT',content:'<USER_REQUEST>tạo một hình bằng Gemini</USER_REQUEST>'})+'\n');
    assert.equal(decision(root,transcript),'allow');
    await mkdir(path.join(root,'.windi'));
    await writeFile(path.join(root,'.windi','project.json'),JSON.stringify({defaults:{provider:'flow'}}));
    assert.equal(decision(root,transcript),'deny');
  }finally{await rm(root,{recursive:true,force:true});}
});
