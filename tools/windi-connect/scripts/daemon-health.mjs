import net from 'node:net';
import {randomUUID} from 'node:crypto';

export function probeDaemon(endpoint,{timeout=2000,version=2}={}) {
  return new Promise((resolve,reject)=>{
    const id=randomUUID();
    const socket=net.createConnection(endpoint);
    let buffer='';
    const finish=(error,result)=>{clearTimeout(timer);socket.destroy();error?reject(error):resolve(result);};
    const timer=setTimeout(()=>finish(new Error('Daemon health check timed out')),timeout);
    socket.on('error',error=>finish(error));
    socket.on('connect',()=>socket.write(JSON.stringify({version,id,op:'doctor',args:{}})+'\n'));
    socket.setEncoding('utf8');
    socket.on('data',chunk=>{
      buffer+=chunk;
      if(buffer.length>1024*1024)return finish(new Error('Invalid daemon response'));
      let end;
      while((end=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,end);buffer=buffer.slice(end+1);
        try{const message=JSON.parse(line);if(message.id===id){
          if(message.error)return finish(new Error(JSON.stringify(message.error)));
          if(message.result?.version!==version)return finish(new Error('Daemon protocol mismatch'));
          return finish(null,message.result);
        }}catch(error){return finish(error);}
      }
    });
  });
}
