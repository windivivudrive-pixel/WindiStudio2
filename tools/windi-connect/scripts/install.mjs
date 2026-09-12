import {mkdir,readFile,writeFile,cp,copyFile,chmod,appendFile,access} from 'node:fs/promises';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
if(process.platform!=='darwin'||process.arch!=='arm64')throw new Error('This gate installer targets macOS Apple Silicon');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browserArg=process.argv.find(value=>value.startsWith('--browser='))?.slice('--browser='.length);
if(browserArg&&browserArg!=='chrome'&&browserArg!=='coccoc')throw new Error('Browser must be chrome or coccoc');
const home=path.join(homedir(),'Library/Application Support/WindiConnect');
const release=path.join(home,'releases','0.5.6');
await mkdir(release,{recursive:true,mode:0o700});
await cp(path.join(root,'node_modules'),path.join(release,'node_modules'),{recursive:true});
await cp(path.join(root,'src'),path.join(release,'src'),{recursive:true});
await cp(path.join(root,'dist/extensions'),path.join(release,'extensions'),{recursive:true});
await cp(path.join(root,'agent-adapters'),path.join(release,'agent-adapters'),{recursive:true});
const packagedRenderer=path.join(root,'renderer');const sourceRenderer=await access(packagedRenderer).then(()=>packagedRenderer).catch(()=>path.resolve(root,'../..','kits/video-starter'));await cp(sourceRenderer,path.join(release,'renderer'),{recursive:true});
// Extensions are loaded from this stable folder. Future releases only require
// pressing Reload in the browser instead of choosing a new folder.
const installedExtensions=path.join(home,'extensions');await cp(path.join(root,'dist/extensions'),installedExtensions,{recursive:true,force:true});
await copyFile(process.execPath,path.join(release,'node'));await chmod(path.join(release,'node'),0o755);
await writeFile(path.join(release,'package.json'),'{"type":"module"}');
const accountFile=path.join(root,'windi-account.json');
if(await access(accountFile).then(()=>true).catch(()=>false)){
  const config=JSON.parse(await readFile(accountFile,'utf8'));
  const {activateLicense}=await import('../src/license-api.ts');
  await activateLicense(config.token,false,config.apiUrl);
}

const connections=JSON.parse(await readFile(path.join(root,'dist/connections.json'),'utf8'));
await writeFile(path.join(home,'connections.json'),JSON.stringify(connections),{mode:0o600});
const bin=path.join(homedir(),'.local/bin');await mkdir(bin,{recursive:true});
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
await writeFile(path.join(bin,'windi'),`#!/bin/sh\nexec ${quote(path.join(release,'node'))} --no-warnings ${quote(path.join(release,'src/cli.ts'))} "$@"\n`,{mode:0o755});
const zprofile=path.join(homedir(),'.zprofile');const pathMarker='# Windi Connect CLI';const existingProfile=await readFile(zprofile,'utf8').catch(()=>"");
if(!existingProfile.includes(pathMarker))await appendFile(zprofile,`\n${pathMarker}\nexport PATH="$HOME/.local/bin:$PATH"\n`,{mode:0o600});
const adapter=path.join(release,'agent-adapters','windi-video-workflow');
const codexSkill=path.join(homedir(),'.codex','skills','windi-video-workflow');await mkdir(path.dirname(codexSkill),{recursive:true,mode:0o700});await cp(path.join(adapter,'skills','windi-video-workflow'),codexSkill,{recursive:true,force:true});
const antigravityPlugin=path.join(homedir(),'.gemini','config','plugins','windi-video-workflow');await mkdir(path.dirname(antigravityPlugin),{recursive:true,mode:0o700});await cp(adapter,antigravityPlugin,{recursive:true,force:true});
const bundledWatch=path.join(root,'vendor','watch');if(await access(bundledWatch).then(()=>true).catch(()=>false)){for(const target of [path.join(homedir(),'.codex','skills','watch'),path.join(homedir(),'.agents','skills','watch')]){await mkdir(path.dirname(target),{recursive:true,mode:0o700});await cp(bundledWatch,target,{recursive:true,force:true});}}
const hostDirs=[
  path.join(homedir(),'Library/Application Support/Google/Chrome/NativeMessagingHosts'),
  path.join(homedir(),'Library/Application Support/CocCoc/Browser/NativeMessagingHosts'),
];
for(const hostDir of hostDirs)await mkdir(hostDir,{recursive:true,mode:0o700});
for(const provider of ['flow','chatgpt']){
  const launcher=path.join(release,`native-${provider}`);
  await writeFile(launcher,`#!/bin/sh\nexec ${quote(path.join(release,'node'))} --no-warnings ${quote(path.join(release,'src/native.ts'))} ${provider} "$@"\n`,{mode:0o755});
  const manifest=JSON.stringify({name:`com.windistudio.connect.${provider}`,description:'Windi Connect local bridge',path:launcher,type:'stdio',allowed_origins:[`chrome-extension://${connections.windi}/`,`chrome-extension://${connections[provider]}/`]},null,2);
  for(const hostDir of hostDirs)await writeFile(path.join(hostDir,`com.windistudio.connect.${provider}.json`),manifest,{mode:0o644});
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const agents=path.join(homedir(),'Library/LaunchAgents');await mkdir(agents,{recursive:true});
const plist=path.join(agents,'com.windistudio.connect.plist');
await writeFile(plist,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>com.windistudio.connect</string><key>ProgramArguments</key><array><string>${escape(path.join(release,'node'))}</string><string>--no-warnings</string><string>${escape(path.join(release,'src/daemon.ts'))}</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>StandardErrorPath</key><string>${escape(path.join(home,'daemon.log'))}</string></dict></plist>`);
try{execFileSync('launchctl',['bootout',`gui/${process.getuid()}/com.windistudio.connect`],{stdio:'ignore'});}catch{}
// bootout returns before launchd always releases the label. A bounded retry
// handles installing an update while the previous process is terminating.
for(let attempt=0;attempt<10;attempt++){
  await delay(300);
  try{execFileSync('launchctl',['bootstrap',`gui/${process.getuid()}`,plist],{stdio:'pipe'});break;}
  catch(error){if(attempt===9)throw error;}
}
for(let attempt=0;attempt<30;attempt++){
  try{execFileSync(path.join(release,'node'),['--no-warnings',path.join(release,'src/cli.ts'),'doctor'],{stdio:'pipe',timeout:3000});break;}
  catch(error){if(attempt===29)throw error;await delay(500);}
}
if(browserArg){const app=browserArg==='chrome'?'/Applications/Google Chrome.app':'/Applications/CocCoc.app';try{execFileSync('open',['-a',app,'chrome://extensions/'],{stdio:'ignore'});}catch{console.warn(`Could not open ${app}; open chrome://extensions/ manually.`);}}
console.log(JSON.stringify({phase:'production-candidate',cli:path.join(bin,'windi'),extension:path.join(installedExtensions,'windi'),legacyExtensions:[path.join(installedExtensions,'flow'),path.join(installedExtensions,'chatgpt')],browser:browserArg||null,browsers:['Google Chrome','CocCoc'],connections,next:'Load the single Windi Connect extension once. The two legacy extensions remain available only for rollback.'},null,2));
