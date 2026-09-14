import {mkdir,cp,copyFile,writeFile,chmod,rm,access,readFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

if(process.platform!=='darwin'||process.arch!=='arm64')throw new Error('Windi Connect Installer currently targets macOS Apple Silicon');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Customer bundles contain source only. Runtime Node and npm dependencies are
// fetched and integrity-checked during the first customer installation.
const bundleFilter=source=>{const relative=path.relative(path.resolve(root,'../..','kits/video-starter'),source);return !['public/windi-job','node_modules','build','out','.windi','.git','.next'].some(excluded=>relative===excluded||relative.startsWith(excluded+path.sep))&&!path.basename(source).startsWith('.env');};
const extensions=path.join(root,'dist/extensions');try{await access(extensions,constants.R_OK);}catch{throw new Error('Build extensions first: npm run build:extensions');}
const app=path.join(root,'dist','Windi Connect Installer.app');
// This is a reproducible build artifact under tools/windi-connect/dist only.
await rm(app,{recursive:true,force:true});
const contents=path.join(app,'Contents');const macos=path.join(contents,'MacOS');const resources=path.join(contents,'Resources','windi-connect');await mkdir(macos,{recursive:true});await mkdir(resources,{recursive:true});
await copyFile(path.join(root,'package-lock.json'),path.join(resources,'package-lock.json'));
await mkdir(path.join(resources,'dist'),{recursive:true});
await copyFile(path.join(root,'dist/connections.json'),path.join(resources,'dist/connections.json'));
await cp(path.join(root,'src'),path.join(resources,'src'),{recursive:true});await cp(path.join(root,'scripts'),path.join(resources,'scripts'),{recursive:true});await cp(path.join(root,'agent-adapters'),path.join(resources,'agent-adapters'),{recursive:true});await cp(path.resolve(root,'../..','kits/video-starter'),path.join(resources,'renderer'),{recursive:true,filter:bundleFilter});await cp(extensions,path.join(resources,'dist/extensions'),{recursive:true});await copyFile(path.join(root,'package.json'),path.join(resources,'package.json'));
const watchCandidates=[path.join(root,'vendor','watch'),path.join(homedir(),'.codex','skills','watch'),path.join(homedir(),'.agents','skills','watch')];let watchSource=null;for(const candidate of watchCandidates){if(await access(candidate,constants.R_OK).then(()=>true).catch(()=>false)){watchSource=candidate;break;}}if(!watchSource)throw new Error('Missing bradautomates/claude-video watch skill. Install the pinned MIT dependency before packaging.');const watchProvenance=await readFile(path.join(watchSource,'UPSTREAM.md'),'utf8');if(!watchProvenance.includes('83da59fa78c3eee9e20f515fe75c438bb5166efd'))throw new Error('Unexpected claude-video revision; review and pin it before packaging.');await access(path.join(watchSource,'LICENSE'),constants.R_OK);await cp(watchSource,path.join(resources,'vendor','watch'),{recursive:true});
await writeFile(path.join(contents,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>Windi Connect Installer</string><key>CFBundleIdentifier</key><string>com.windistudio.connect.installer</string><key>CFBundleName</key><string>Windi Connect Installer</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>0.5.9</string></dict></plist>`);
const launcher=`#!/bin/sh\nAPP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"\nopen -a Terminal "$APP_ROOT/Resources/windi-connect/Install Windi Connect.command"\n`;
const installer='#!/bin/sh\nset -eu\nROOT="$(cd "$(dirname "$0")" && pwd)"\nexec /bin/sh "$ROOT/scripts/bootstrap.sh"\n';
await writeFile(path.join(macos,'Windi Connect Installer'),launcher,{mode:0o755});await writeFile(path.join(resources,'Install Windi Connect.command'),installer,{mode:0o755});
console.log(app);
