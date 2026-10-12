import {existsSync} from 'node:fs';
import {join} from 'node:path';
const windows=join(process.env.WINDIR||'C:/Windows','Fonts');
const mac='/System/Library/Fonts/Supplemental';
const definitions=[
  ['arial','Arial','arialbd.ttf','Arial Bold.ttf'],
  ['verdana','Verdana','verdanab.ttf','Verdana Bold.ttf'],
  ['georgia','Georgia','georgiab.ttf','Georgia Bold.ttf'],
  ['times','Times New Roman','timesbd.ttf','Times New Roman Bold.ttf'],
  ['tahoma','Tahoma','tahomabd.ttf','Tahoma Bold.ttf'],
  ['trebuchet','Trebuchet MS','trebucbd.ttf','Trebuchet MS Bold.ttf'],
  ['dejavu-sans','DejaVu Sans',null,null,'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
  ['dejavu-serif','DejaVu Serif',null,null,'/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'],
];
export const fontIds=['sans',...definitions.map(([id])=>id)];
function installed(){return definitions.flatMap(([id,family,win,apple,linux])=>{
  const path=[win&&join(windows,win),apple&&join(mac,apple),linux].find(p=>p&&existsSync(p));
  return path?[{id,label:family,family,path}]:[];
});}
export function subtitleFonts(){const fonts=installed(),fallback=fonts.find(f=>f.id==='arial')||fonts.find(f=>f.id==='dejavu-sans');return [...(fallback?[{...fallback,id:'sans',label:'Mặc định · '+fallback.family}]:[]),...fonts].map(({path,...font})=>font);}
export function resolveSubtitleFont(id='sans'){
  const fonts=installed(),font=id==='sans'?fonts.find(f=>f.id==='arial')||fonts.find(f=>f.id==='dejavu-sans'):fonts.find(f=>f.id===id);
  if(!font)throw new Error('Font phụ đề đã chọn chưa có trên máy. Chọn lại font có sẵn trong Giao diện & phụ đề.');
  return font;
}
