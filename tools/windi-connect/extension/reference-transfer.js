export class ReferenceTransfer {
  constructor(){this.pending=new Map();}
  begin(key,meta){
    if(!/^[a-f0-9]{64}$/.test(meta.sha256)||!Number.isInteger(meta.size)||meta.size<64||meta.size>20*1024*1024||!['image/png','image/jpeg','image/webp'].includes(meta.mime))throw new Error('INVALID_FLOW_REFERENCE');
    for(const [id,value] of this.pending)if(Date.now()-value.started>300000)this.pending.delete(id);
    if(this.pending.size>=5&&!this.pending.has(key))throw new Error('REFERENCE_TRANSFER_BUSY');
    this.pending.set(key,{...meta,chunks:[],length:0,started:Date.now()});
  }
  append(key,index,data){
    const item=this.pending.get(key);
    if(!item||item.chunks.length!==index||typeof data!=='string'||!data.length||data.length>524288||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw new Error('REFERENCE_CHUNK_INVALID');
    if(item.length+data.length>Math.ceil(item.size/3)*4)throw new Error('REFERENCE_TOO_LARGE');
    item.chunks.push(data);item.length+=data.length;
  }
  async finish(key){
    const item=this.pending.get(key);this.pending.delete(key);
    if(!item)throw new Error('REFERENCE_TRANSFER_MISSING');
    const base64=item.chunks.join('');const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    if(bytes.length!==item.size||hash!==item.sha256)throw new Error('REFERENCE_HASH_MISMATCH');
    return {...item,base64};
  }
}
