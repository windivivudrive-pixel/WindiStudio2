import net from 'node:net';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {home,socketPath,validProvider,parseLines} from './protocol.ts';

const provider=validProvider(process.argv[2]);
const config=JSON.parse(await readFile(path.join(home,'connections.json'),'utf8'));
const allowedOrigins=[config[provider],config.windi].filter(Boolean).map((id:string)=>`chrome-extension://${id}/`);
if(!allowedOrigins.includes(process.argv[3])) throw new Error('EXTENSION_ORIGIN_REJECTED');
const socket=net.createConnection(socketPath);
let buffer=Buffer.alloc(0);
function sendNative(message:unknown){const body=Buffer.from(JSON.stringify(message));if(body.length>900_000)throw new Error('NATIVE_MESSAGE_TOO_LARGE');const head=Buffer.alloc(4);head.writeUInt32LE(body.length);process.stdout.write(Buffer.concat([head,body]));}
socket.on('data',parseLines(sendNative));
socket.on('error',()=>process.exit(1));socket.on('close',()=>process.exit(0));
process.stdin.on('data',chunk=>{
  buffer=Buffer.concat([buffer,Buffer.from(chunk)]);
  while(buffer.length>=4){const length=buffer.readUInt32LE(0);if(length>900_000)process.exit(1);if(buffer.length<length+4)return;
    const message=JSON.parse(buffer.subarray(4,4+length).toString());buffer=buffer.subarray(4+length);
    if(message.type==='hello'){socket.write(JSON.stringify({...message,provider,type:'extension.hello'})+'\n');}
    else socket.write(JSON.stringify({...message,provider})+'\n');
  }
});
process.stdin.on('end',()=>socket.end());
