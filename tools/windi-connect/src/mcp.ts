import net from 'node:net';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {socketPath,VERSION,parseLines} from './protocol.ts';

function daemon(op:string,args:Record<string,unknown>={}){return new Promise<any>((resolve,reject)=>{const socket=net.createConnection(socketPath),id=randomUUID();const timer=setTimeout(()=>{socket.destroy();reject(new Error('DAEMON_TIMEOUT'));},70_000);socket.on('connect',()=>socket.write(`${JSON.stringify({version:VERSION,id,op,args})}\n`));socket.on('data',parseLines(message=>{if(message.id!==id)return;clearTimeout(timer);socket.end();message.error?reject(new Error(message.error)):resolve(message.result);}));socket.on('error',error=>{clearTimeout(timer);reject(error);});});}

const tools=[
  {name:'windi_workflow_status',description:'Đọc trạng thái bền vững và bước hợp lệ tiếp theo của Windi project.',inputSchema:{type:'object',properties:{project:{type:'string'}},required:['project']}},
  {name:'windi_workflow_start',description:'Bắt đầu workflow video dọc. Không tạo media và dừng ở cổng duyệt ý tưởng.',inputSchema:{type:'object',properties:{project:{type:'string'},topic:{type:'string'},audience:{type:'string'},style:{type:'string'},imageProvider:{enum:['flow','chatgpt']}},required:['project','topic','audience','style']}},
  {name:'windi_choose_layout',description:'Sau khi idea được duyệt, chọn một trong hai layout Windi có sẵn. Việc chọn chưa phải là duyệt layout.',inputSchema:{type:'object',properties:{project:{type:'string'},preset:{enum:['paper-editorial','dark-cinematic']}},required:['project','preset']}},
  {name:'windi_write_artifact',description:'Đăng ký một file idea, layout hoặc script JSON đã được agent ghi trong project. Layout tham chiếu phải có bằng chứng từ bradautomates/claude-video.',inputSchema:{type:'object',properties:{project:{type:'string'},kind:{enum:['idea','layout','script']},file:{type:'string'}},required:['project','kind','file']}},
  {name:'windi_approve_artifact',description:'Ghi nhận duyệt rõ ràng cho đúng idea ID, layout version hoặc script version. Chỉ gọi sau khi người dùng đã duyệt trong cuộc hội thoại hiện tại.',inputSchema:{type:'object',properties:{project:{type:'string'},kind:{enum:['idea','layout','script']},value:{type:'string'}},required:['project','kind','value']}},
  {name:'windi_workflow_continue',description:'Tiếp tục đúng một bước hợp lệ. Không vượt cổng duyệt và không đổi provider khi lỗi.',inputSchema:{type:'object',properties:{project:{type:'string'}},required:['project']}},
  {name:'windi_image_create',description:'Tạo một job ảnh qua Flow hoặc ChatGPT với request key chống trùng.',inputSchema:{type:'object',properties:{project:{type:'string'},provider:{enum:['flow','chatgpt']},promptFile:{type:'string'},output:{type:'string'},references:{type:'array',items:{type:'string'}},requestKey:{type:'string'}},required:['project','provider','promptFile','output','requestKey']}},
  {name:'windi_voice_import',description:'Đăng ký voice do khách cung cấp và Caption JSON tùy chọn vào workflow đã duyệt script.',inputSchema:{type:'object',properties:{project:{type:'string'},audio:{type:'string'},captions:{type:'string'}},required:['project','audio']}},
] as const;

async function call(name:string,args:Record<string,any>){
  if(name==='windi_workflow_status')return daemon('workflow.status',args);
  if(name==='windi_workflow_start')return daemon('workflow.start',args);
  if(name==='windi_choose_layout')return daemon('workflow.layout.choose',args);
  if(name==='windi_write_artifact')return daemon('workflow.artifact',args);
  if(name==='windi_approve_artifact')return daemon('workflow.approve',args);
  if(name==='windi_workflow_continue')return daemon('workflow.continue',args);
  if(name==='windi_voice_import')return daemon('workflow.voice.import',args);
  if(name==='windi_image_create')return daemon('job.create',{project:args.project,provider:args.provider,kind:'create',promptFile:args.promptFile,references:args.references||[],output:args.output,requestKey:args.requestKey});
  throw new Error('UNKNOWN_TOOL');
}
function send(message:unknown){process.stdout.write(`${JSON.stringify(message)}\n`);}
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
input.on('line',line=>{void (async()=>{
  let request:any;
  try{
    request=JSON.parse(line);
    if(request.method==='initialize'){send({jsonrpc:'2.0',id:request.id,result:{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'windi-video-workflow',version:'0.5.0'}}});return;}
    if(request.method==='notifications/initialized')return;
    if(request.method==='tools/list'){send({jsonrpc:'2.0',id:request.id,result:{tools}});return;}
    if(request.method==='tools/call'){
      const result=await call(request.params?.name,request.params?.arguments||{});
      send({jsonrpc:'2.0',id:request.id,result:{content:[{type:'text',text:JSON.stringify(result,null,2)}],structuredContent:result}});return;
    }
    send({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}});
  }catch(error){send({jsonrpc:'2.0',id:request?.id??null,error:{code:-32000,message:error instanceof Error?error.message:String(error)}});}
})();});
