import type {WindiCaption} from './types';
export function ws1CaptionGroups(captions:WindiCaption[]){
  const blocks:WindiCaption[][]=[];let block:WindiCaption[]=[];
  captions.forEach((c,i)=>{block.push(c);if(i===captions.length-1||captions[i+1].startMs-c.endMs>650){blocks.push(block);block=[];}});
  return blocks.flatMap(b=>{
    if(b.length<4)return [b];
    const costs=Array<number>(b.length+1).fill(Infinity),sizes=Array<number>(b.length+1).fill(0);costs[b.length]=0;
    for(let i=b.length-1;i>=0;i--)for(let size=4;size<=9&&i+size<=b.length;size++){
      const score=costs[i+size]+Math.abs(size-6)*.2+(/[.!?…]$/.test(b[i+size-1].text.trim())?0:1);
      if(score<costs[i]){costs[i]=score;sizes[i]=size;}
    }
    const result:WindiCaption[][]=[];for(let i=0;i<b.length;){const size=sizes[i];if(!size)throw new Error('WS1_CAPTION_GROUP_INVALID');result.push(b.slice(i,i+size));i+=size;}return result;
  });
}
