import {test} from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {probeDaemon} from '../scripts/daemon-health.mjs';

for(const scenario of ['ready','error','timeout'])test(`installer daemon probe: ${scenario}`,async()=>{
  const sockets=new Set<net.Socket>();
  const server=net.createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
    socket.on('data',bytes=>{
      const request=JSON.parse(bytes.toString());
      assert.equal(request.op,'doctor');
      if(scenario==='timeout')return;
      const response=JSON.stringify({id:request.id,...(scenario==='error'?{error:'broken'}:{result:{version:2}})})+'\n';
      socket.write(response.slice(0,8));setTimeout(()=>socket.write(response.slice(8)),5);
    });
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  try{
    const endpoint={host:'127.0.0.1',port:(server.address() as net.AddressInfo).port};
    if(scenario==='ready')assert.equal((await probeDaemon(endpoint)).version,2);
    else await assert.rejects(probeDaemon(endpoint,{timeout:100}),scenario==='error'?/broken/:/timed out/);
  }finally{for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
