import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {generateKeyPairSync,createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(path.join(root,'.local'),{recursive:true});
let keys=JSON.parse(await readFile(path.join(root,'.local/extension-keys.json'),'utf8').catch(()=>'{}'));
const ids={};
for(const provider of ['flow','chatgpt']){
  // Only the public key is needed for stable unpacked extension IDs. Never
  // reuse third-party identities or include a signing private key in releases.
  keys[provider]??=generateKeyPairSync('rsa',{modulusLength:2048}).publicKey.export({type:'spki',format:'der'}).toString('base64');
  const id=createHash('sha256').update(Buffer.from(keys[provider],'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));ids[provider]=id;
  const out=path.join(root,'dist/extensions',provider);await mkdir(out,{recursive:true});
  const domains=provider==='flow'?['https://flow.google.com/*','https://labs.google/*']:['https://chatgpt.com/*'];
  await writeFile(path.join(out,'manifest.json'),JSON.stringify({manifest_version:3,name:`Windi ${provider==='flow'?'Flow':'ChatGPT'} Connect`,version:'0.2.0',description:'Cầu nối riêng với Windi trên máy của bạn.',key:keys[provider],permissions:['nativeMessaging','storage','alarms','tabs','debugger','downloads'],host_permissions:domains,background:{service_worker:'background.js',type:'module'},action:{default_popup:'popup.html'}},null,2));
  await writeFile(path.join(out,'provider.js'),`export const PROVIDER=${JSON.stringify(provider)};\nexport const HOST="com.windistudio.connect.${provider}";\n`);
  for(const name of ['background.js','popup.js','popup.html'])await copyFile(path.join(root,'extension',name),path.join(out,name));
  await mkdir(path.join(out,'icons'),{recursive:true});
  for(const size of [16,32,48,128])await copyFile(path.join(root,'extension','icons',`icon-${size}.png`),path.join(out,'icons',`icon-${size}.png`));
  await copyFile(path.resolve(root,'../..','public/SVN-Calling Code Regular.otf'),path.join(out,'SVN-Calling Code Regular.otf'));
}
keys.windi??=generateKeyPairSync('rsa',{modulusLength:2048}).publicKey.export({type:'spki',format:'der'}).toString('base64');
ids.windi=createHash('sha256').update(Buffer.from(keys.windi,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
const combined=path.join(root,'dist/extensions/windi');await mkdir(combined,{recursive:true});
await writeFile(path.join(combined,'manifest.json'),JSON.stringify({manifest_version:3,name:'Windi Connect',version:'0.5.6',description:'Một cầu nối Windi dùng chung cho Flow và ChatGPT.',key:keys.windi,icons:{16:'icons/icon-16.png',32:'icons/icon-32.png',48:'icons/icon-48.png',128:'icons/icon-128.png'},permissions:['nativeMessaging','storage','alarms','tabs','debugger','downloads','webRequest','declarativeNetRequest'],host_permissions:['https://flow.google.com/*','https://labs.google/*','https://aisandbox-pa.googleapis.com/*','https://storage.googleapis.com/*','https://flow-content.google/*','https://chatgpt.com/*'],declarative_net_request:{rule_resources:[{id:'windi_flow_headers',enabled:true,path:'windi-flow-rules.json'}]},background:{service_worker:'background.js',type:'module'},action:{default_popup:'popup.html',default_icon:{16:'icons/icon-16.png',32:'icons/icon-32.png',48:'icons/icon-48.png',128:'icons/icon-128.png'}}},null,2));
await copyFile(path.join(root,'extension/combined-background.js'),path.join(combined,'background.js'));
await copyFile(path.join(root,'extension/download-store.js'),path.join(combined,'download-store.js'));
await copyFile(path.join(root,'extension/flow-adapter.js'),path.join(combined,'flow-adapter.js'));
await copyFile(path.join(root,'extension/reference-transfer.js'),path.join(combined,'reference-transfer.js'));
await copyFile(path.join(root,'extension/workspace-tab.js'),path.join(combined,'workspace-tab.js'));
await copyFile(path.join(root,'extension/flow-rpc.js'),path.join(combined,'flow-rpc.js'));
await copyFile(path.join(root,'extension/windi-flow-rules.json'),path.join(combined,'windi-flow-rules.json'));
await copyFile(path.join(root,'extension/combined-popup.js'),path.join(combined,'popup.js'));
await copyFile(path.join(root,'extension/combined-popup.html'),path.join(combined,'popup.html'));
await mkdir(path.join(combined,'icons'),{recursive:true});
for(const size of [16,32,48,128])await copyFile(path.join(root,'extension','icons',`icon-${size}.png`),path.join(combined,'icons',`icon-${size}.png`));
await copyFile(path.resolve(root,'../..','public/SVN-Calling Code Regular.otf'),path.join(combined,'SVN-Calling Code Regular.otf'));
await writeFile(path.join(root,'.local/extension-keys.json'),JSON.stringify(keys,null,2));
await writeFile(path.join(root,'dist/connections.json'),JSON.stringify(ids,null,2));
console.log(JSON.stringify(ids,null,2));
