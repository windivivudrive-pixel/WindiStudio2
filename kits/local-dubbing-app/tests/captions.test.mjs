import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {resolveSubtitleFont,subtitleFonts} from '../fonts.mjs';

test('caption PNG uses selected font and background color/alpha, including transparent and opaque',t=>{
 const python=process.platform==='win32'?'python':'python3';
 try{execFileSync(python,['-c','from PIL import Image, ImageFont'],{stdio:'ignore'});}catch{t.skip('Python/Pillow not installed');return;}
 const fonts=subtitleFonts();if(!fonts.length){t.skip('No supported installed fonts');return;}
 const root=mkdtempSync(join(tmpdir(),'windi-caption-'));
 try{
  const font=resolveSubtitleFont('sans');
  const render=(name,opacity,fontPath=font.path,options={})=>{
   const directory=join(root,name);mkdirSync(directory);
   const file=join(directory,'request.json');writeFileSync(file,JSON.stringify({width:640,height:360,fontSize:44,fontPath,subtitle:'box',color:'#ffffff',backgroundColor:'#345678',backgroundOpacity:opacity,directory,segments:[{id:'caption',translation:'Một câu chuyện tiếng Việt.',start:0,end:5}],...options}));
   execFileSync(python,[join(dirname(fileURLToPath(import.meta.url)),'../workers/captions.py'),file]);
   return join(directory,options.karaoke?'caption-k0.png':'caption.png');
  };
  for(const opacity of [0,35,100]){
   const file=render(String(opacity),opacity);
   const output=JSON.parse(execFileSync(python,['-c',"from PIL import Image;from collections import Counter;import sys,json;im=Image.open(sys.argv[1]);pixels=im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata();a=Counter(p[3] for p in pixels if p[:3]==(52,86,120));print(json.dumps({'size':im.size,'alpha':a.most_common(1)[0][0],'pixels':a.most_common(1)[0][1]}))",file],{encoding:'utf8'}));
   assert.deepEqual(output.size,[640,360]);assert.equal(output.alpha,Math.round(255*opacity/100));assert.ok(output.pixels>1000);
  }
  const different=fonts.find(f=>f.family!==font.family);
  if(different)assert.notDeepEqual(readFileSync(render('other-font',35,resolveSubtitleFont(different.id).path)),readFileSync(join(root,'35','caption.png')));
  const first=render('color-only',35,font.path,{karaoke:true,karaokeStyle:'color',karaokeScale:150,karaokeColor:'#00ff00'});
  const second=join(root,'color-only','caption-k1.png');
  const sameShape=execFileSync(python,['-c',"from PIL import Image;import sys; a=Image.open(sys.argv[1]);b=Image.open(sys.argv[2]);assert a.getchannel('A').tobytes()==b.getchannel('A').tobytes();assert a.tobytes()!=b.tobytes();print('same geometry, different color')",first,second],{encoding:'utf8'});
  assert.match(sameShape,/same geometry/);
  assert.ok(fonts.every(f=>!('path' in f)));assert.throws(()=>resolveSubtitleFont('../secret.ttf'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
