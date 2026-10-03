import {mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';

// Never run npm ci over a live Windows release: native modules may be locked.
export async function allocateRelease(home,version,{windows=false,target}={}) {
  if(target)return target;
  const releases=path.join(home,'releases');
  await mkdir(releases,{recursive:true});
  return windows ? mkdtemp(path.join(releases,`${version}-install-`)) : path.join(releases,version);
}
