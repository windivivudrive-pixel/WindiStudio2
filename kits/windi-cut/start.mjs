import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cwd=path.join(root,'.local/opencut-classic/apps/web');
const next=path.join(cwd,'node_modules/next/dist/bin/next');
await access(next).catch(()=>{throw new Error('Chưa cài OpenCut Classic. Xem kits/windi-cut/README.md.');});
// Unused upstream cloud integrations receive only local placeholders. This
// process never inherits Windi production credentials or runs DB migrations.
const allowed=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','HOME','TMPDIR','SHELL','LANG','LC_ALL','TERM'].includes(key)));
const env={...allowed,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:4320',NEXT_PUBLIC_MARBLE_API_URL:'http://127.0.0.1:4320/disabled',DATABASE_URL:'postgresql://unused:unused@127.0.0.1:5432/unused',BETTER_AUTH_SECRET:'local-windi-cut-not-an-auth-server-2026',UPSTASH_REDIS_REST_URL:'http://127.0.0.1:4320/disabled',UPSTASH_REDIS_REST_TOKEN:'',MARBLE_WORKSPACE_KEY:'',FREESOUND_CLIENT_ID:'',FREESOUND_API_KEY:''};
const child=spawn(process.execPath,[next,'dev','--turbopack','-H','127.0.0.1','-p','4320'],{cwd,env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
