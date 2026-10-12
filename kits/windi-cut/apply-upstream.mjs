import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const clone=path.join(root,'.local/opencut-classic');
const patch=fileURLToPath(new URL('./upstream.patch',import.meta.url));
const revision='cf5e79e919144200294fb9fed22a222592a0aeea';
function git(args){return spawnSync('git',args,{cwd:clone,encoding:'utf8'});}
const head=git(['rev-parse','HEAD']);
if(head.status!==0 || head.stdout.trim()!==revision){
  throw new Error(`Expected OpenCut Classic ${revision} in ${clone}; see README.md.`);
}
if(git(['apply','--reverse','--check',patch]).status===0){
  console.log('Windi patch already applied. No changes made.');
}else{
  const check=git(['apply','--check',patch]);
  if(check.status!==0)throw new Error(`Patch conflicts; existing changes preserved.\n${check.stderr}`);
  const applied=git(['apply',patch]);
  if(applied.status!==0)throw new Error(applied.stderr);
  console.log('Applied isolated Windi local-lab patch.');
}
