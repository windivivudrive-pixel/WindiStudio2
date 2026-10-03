import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,stat,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sharp from 'sharp';
import {GrokAuth,xaiUrl,type Transport} from '../src/grok/auth.ts';
import {GrokMedia,mediaPayload,downloadMedia,inspectVideo,mediaUrl} from '../src/grok/media.ts';
import {createGrokJob,resumeGrokJob} from '../src/grok/jobs.ts';
import {referencePrompt,grokOptions} from '../src/grok/options.ts';
import {openStore} from '../src/store.ts';
import {registerProject} from '../src/project.ts';
import {allowedUrl} from '../src/protocol.ts';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function fixture(context:any){
  const root=await realpath(await mkdtemp(path.join(tmpdir(),'windi-grok-')));context.after(()=>rm(root,{recursive:true,force:true}));
  const project=path.join(root,'project');await mkdir(project);const store=await openStore(path.join(root,'state.sqlite'));context.after(()=>store.close());await registerProject(store,project);
  const a=await sharp({create:{width:32,height:48,channels:3,background:'#ff3366'}}).png().toBuffer(),b=await sharp({create:{width:48,height:32,channels:3,background:'#3366ff'}}).png().toBuffer();await writeFile(path.join(project,'a.png'),a);await writeFile(path.join(project,'b.png'),b);
  const directory=path.join(root,'auth');await mkdir(directory);await writeFile(path.join(directory,'auth.json'),JSON.stringify({access:'test-only-access',refresh:'test-only-refresh',expiresAt:Date.now()+3600_000,tokenEndpoint:'https://auth.x.ai/oauth2/token'}),{mode:0o600});return {root,project,store,directory,a,b};
}
test('reference numbering is ordered, validated, and independent from browser providers',()=>{
  assert.equal(referencePrompt('Giữ @image2, nền @image1 và @image2',2),'Giữ <IMAGE_1>, nền <IMAGE_0> và <IMAGE_1>');
  for(const prompt of ['@image0','@image3','<IMAGE_2>'])assert.throws(()=>referencePrompt(prompt,2),/REFERENCE_NOT_FOUND/);
  assert.throws(()=>grokOptions({media:'video'},1,true),/EXCLUSIVE/);
  assert.throws(()=>grokOptions({media:'video',resolution:'1080p'},7,false),/720P/);
  assert.throws(()=>grokOptions({},5,true),/TOO_MANY/);
  assert.equal(grokOptions({media:'video'},7,false).duration,8);
  assert.equal(allowedUrl('grok','https://flow.google.com/'),false);
});
test('credential transport rejects untrusted URLs and concurrent refresh happens once',async context=>{
  const f=await fixture(context);let refreshed=0;
  const fetcher:Transport=async(url,init)=>{assert.equal(String(url),'https://auth.x.ai/oauth2/token');assert.equal(new URLSearchParams(String(init?.body)).get('grant_type'),'refresh_token');refreshed++;return json({access_token:'refreshed-test-token',expires_in:3600});};
  const auth=new GrokAuth(f.directory,fetcher);await auth.load();await Promise.all([auth.access(true),auth.access(true)]);assert.equal(refreshed,1);
  assert.equal(JSON.parse(await readFile(path.join(f.directory,'auth.json'),'utf8')).refresh,'test-only-refresh');
  assert.equal((await stat(path.join(f.directory,'auth.json'))).mode&0o777,0o600);
  assert.doesNotMatch(JSON.stringify(auth.status()),/test-only|refreshed-test-token/);
  for(const url of ['https://x.ai.evil.test','http://api.x.ai','https://user:pass@api.x.ai','https://api.x.ai:8443'])assert.throws(()=>xaiUrl(url));
  await auth.logout();await assert.rejects(()=>auth.access(),/LOGIN_REQUIRED/);
});
test('401 refresh retries once while entitlement and quota are explicit failures',async context=>{
  const f=await fixture(context);let requests=0,refreshes=0;
  const auth=new GrokAuth(f.directory,async(url)=>{if(String(url).includes('oauth2/token')){refreshes++;return json({access_token:'next-test',expires_in:3600});}requests++;return requests===1?json({},401):json({data:[]});});await auth.load();await auth.request('/models');assert.equal(requests,2);assert.equal(refreshes,1);
  for(const [status,code] of [[403,'ENTITLEMENT'],[429,'QUOTA']] as const){const rejected=new GrokAuth(f.directory,async()=>json({},status));await rejected.load();await assert.rejects(()=>rejected.request('/models'),new RegExp(code));}
});
test('image refs select edits and stable @ aliases map to ordered data URIs',async context=>{
  const f=await fixture(context);const args={project:f.project,provider:'grok',kind:'edit',input:'a.png',references:['b.png'],prompt:'Giữ @image1, màu @image2',output:'assets/grok/image',requestKey:'image'};
  const {job}=await createGrokJob(f.store,args),options=JSON.parse(job.options_json!);const request=await mediaPayload(job,f.store,options);
  assert.equal(request.endpoint,'/images/edits');assert.equal(request.payload.prompt,'Giữ <IMAGE_0>, màu <IMAGE_1>');const images=(request.payload as any).images;assert.equal(images[0].url,`data:image/png;base64,${f.a.toString('base64')}`);assert.equal(images[1].url,`data:image/png;base64,${f.b.toString('base64')}`);
  assert.equal((await createGrokJob(f.store,args)).reused,true);await assert.rejects(()=>createGrokJob(f.store,{...args,aspect:'1:1'}),/REQUEST_KEY_CONTENT_MISMATCH/);
  await assert.rejects(()=>createGrokJob(f.store,{...args,requestKey:'outside',references:['../outside.png']}));
});
test('image downloads to project and resumed result never submits a second generation',async context=>{
  const f=await fixture(context);let posts=0;
  const auth=new GrokAuth(f.directory,async(url,init)=>{if(String(url).includes('/images/')){posts++;return json({data:[{url:'https://imgen.x.ai/result.png'}]});}assert.equal(init?.headers,undefined);return new Response(new Uint8Array(f.b));});await auth.load();
  const job=(await createGrokJob(f.store,{project:f.project,kind:'create',prompt:'@image1',references:['a.png'],output:'assets/grok/generated'})).job;
  const media=new GrokMedia(auth,f.store,path.join(f.root,'stage'),()=>{});await media.run(job);const done=f.store.job(job.id)!;assert.equal(done.status,'complete');const result=JSON.parse(done.result_json!);assert.deepEqual(await readFile(result.path),f.b);assert.ok(result.path.startsWith(f.project));assert.equal(result.mime,'image/png');assert.equal(posts,1);
  f.store.updateJob(job.id,{status:'failed'});await media.run(resumeGrokJob(f.store,f.store.job(job.id)!));assert.equal(posts,1);assert.equal(f.store.latestAssets('grok').length,1);
});
test('video payload, MP4 verification and request-id recovery avoid a second POST',async context=>{
  const f=await fixture(context),video=path.join(f.root,'fixture.mp4');await promisify(execFile)(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=64x96:d=1','-c:v','libx264','-pix_fmt','yuv420p',video]);const bytes=await readFile(video);assert.equal((await inspectVideo(video)).mime,'video/mp4');
  let posts=0,polls=0;const auth=new GrokAuth(f.directory,async(url,init)=>{if(init?.method==='POST'){posts++;throw new Error('must not submit');}if(String(url).includes('/videos/')){polls++;return json({status:'done',video:{url:'https://vidgen.x.ai/result.mp4'}});}return new Response(new Uint8Array(bytes));});await auth.load();
  const job=(await createGrokJob(f.store,{project:f.project,kind:'create',media:'video',prompt:'A slow scenic pan',output:'assets/grok/clip'})).job;
  const payload=await mediaPayload(job,f.store,JSON.parse(job.options_json!));assert.equal((payload.payload as any).reference_images,undefined);assert.equal((payload.payload as any).image,undefined);
  f.store.updateJob(job.id,{status:'unknown_result',submitted_at:new Date().toISOString(),result_json:JSON.stringify({requestId:'existing-video',submitted:true})});
  const media=new GrokMedia(auth,f.store,path.join(f.root,'stage'),()=>{});await media.run(resumeGrokJob(f.store,f.store.job(job.id)!));const result=JSON.parse(f.store.job(job.id)!.result_json!);assert.equal(posts,0);assert.equal(polls,1);assert.equal(result.duration,1);assert.equal(result.width,64);assert.deepEqual(await readFile(result.path),bytes);
});
test('ambiguous result needs explicit confirmation and stored browser rows remain unchanged',async context=>{
  const f=await fixture(context),project=f.store.projectByRoot(f.project)!;
  const flow=f.store.insertJob({projectId:project.id,provider:'flow',kind:'create',fingerprint:'flow',prompt:'flow',references:[],outputPath:'a'}).job;
  const gpt=f.store.insertJob({projectId:project.id,provider:'chatgpt',kind:'create',fingerprint:'gpt',prompt:'gpt',references:[],outputPath:'b'}).job;
  const before=[f.store.job(flow.id),f.store.job(gpt.id)];
  const {job}=await createGrokJob(f.store,{project:f.project,prompt:'hello',output:'c'});f.store.updateJob(job.id,{status:'unknown_result',submitted_at:new Date().toISOString(),result_json:'{"submitted":true}'});
  assert.throws(()=>resumeGrokJob(f.store,f.store.job(job.id)!),/RESULT_UNKNOWN/);assert.equal(resumeGrokJob(f.store,f.store.job(job.id)!,true).submitted_at,null);assert.deepEqual([f.store.job(flow.id),f.store.job(gpt.id)],before);
});
test('media redirects never carry bearer credentials or reach unrelated hosts',async context=>{
  const f=await fixture(context);let requests=0;await assert.rejects(()=>downloadMedia('https://imgen.x.ai/a',path.join(f.root,'out'),async(_url,init)=>{requests++;assert.equal(init?.headers,undefined);return new Response(null,{status:302,headers:{location:'https://evil.test/collect'}});}),/UNTRUSTED_MEDIA/);assert.equal(requests,1);
  assert.throws(()=>mediaUrl('https://127.0.0.1/secret'));
});

test('OAuth loopback validates state, exchanges PKCE, and persists only local credentials',async context=>{
  const f=await fixture(context);let exchange:any;
  const auth=new GrokAuth(f.directory,async(url,init)=>{
    if(String(url).includes('openid-configuration'))return json({authorization_endpoint:'https://auth.x.ai/oauth2/authorize',token_endpoint:'https://auth.x.ai/oauth2/token'});
    exchange=new URLSearchParams(String(init?.body));return json({access_token:'oauth-test-token',refresh_token:'oauth-test-refresh',expires_in:3600});
  });context.after(()=>auth.logout());
  const login=await auth.startLogin();const u=new URL(login.authorizationUrl);
  assert.equal(u.searchParams.get('plan'),'generic');assert.equal(u.searchParams.get('code_challenge_method'),'S256');
  const callback=new URL(u.searchParams.get('redirect_uri')!);callback.search=new URLSearchParams({state:'incorrect',code:'test-code'}).toString();assert.equal((await fetch(callback)).status,400);assert.equal(auth.status().authenticated,false);
  callback.search=new URLSearchParams({state:u.searchParams.get('state')!,code:'test-code'}).toString();const response=await fetch(callback);assert.equal(response.status,200);await response.text();assert.equal(auth.status().authenticated,true);assert.equal(exchange.get('code_challenge'),u.searchParams.get('code_challenge'));assert.ok(exchange.get('code_verifier'));
  assert.doesNotMatch(JSON.stringify(auth.status()),/oauth-test/);
});

test('network ambiguity is persisted and a rejected request can safely resume after login',async context=>{
  const f=await fixture(context),auth=new GrokAuth(f.directory,async()=>{throw new Error('offline');});await auth.load();
  const job=(await createGrokJob(f.store,{project:f.project,prompt:'test',output:'image'})).job;
  await assert.rejects(()=>new GrokMedia(auth,f.store,path.join(f.root,'stage'),()=>{}).run(job),/NETWORK_RESULT_UNKNOWN/);assert.ok(f.store.job(job.id)!.submitted_at);
  f.store.updateJob(job.id,{status:'unknown_result'});assert.throws(()=>resumeGrokJob(f.store,f.store.job(job.id)!),/RESULT_UNKNOWN/);
  const blocked=new GrokAuth(f.directory,async()=>json({},403));await blocked.load();
  const second=(await createGrokJob(f.store,{project:f.project,prompt:'test2',output:'image2'})).job;
  await assert.rejects(()=>new GrokMedia(blocked,f.store,path.join(f.root,'stage'),()=>{}).run(second),/ENTITLEMENT/);assert.equal(f.store.job(second.id)!.submitted_at,null);
});
