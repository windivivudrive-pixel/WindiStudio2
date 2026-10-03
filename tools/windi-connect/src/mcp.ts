import net from 'node:net';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {socketPath,VERSION,parseLines} from './protocol.ts';
import {approveTikTokPost,checkTikTokSession,prepareTikTokPost,publishTikTokPost,tikTokPostStatus} from './tiktok-lightpanda.ts';
import {approveFacebookReel,checkFacebookPage,facebookReelStatus,prepareFacebookReel,refreshFacebookReel,submitFacebookReel} from './facebook-reels.ts';
import {approvePostizPost,inspectPostizPost,listPostizChannels,postizPostStatus,preparePostizPost,submitPostizPost} from './postiz-publish.ts';

function daemon(op:string,args:Record<string,unknown>={}){return new Promise<any>((resolve,reject)=>{const socket=net.createConnection(socketPath),id=randomUUID();const timer=setTimeout(()=>{socket.destroy();reject(new Error('DAEMON_TIMEOUT'));},70_000);socket.on('connect',()=>socket.write(`${JSON.stringify({version:VERSION,id,op,args})}\n`));socket.on('data',parseLines(message=>{if(message.id!==id)return;clearTimeout(timer);socket.end();message.error?reject(new Error(message.error)):resolve(message.result);}));socket.on('error',error=>{clearTimeout(timer);reject(error);});});}

const tools=[
  {name:'windi_workflow_status',description:'Đọc trạng thái bền vững và bước hợp lệ tiếp theo của Windi project.',inputSchema:{type:'object',properties:{project:{type:'string'}},required:['project']}},
  {name:'windi_workflow_start',description:'Bắt đầu workflow video dọc. Không tạo media và dừng ở cổng duyệt ý tưởng.',inputSchema:{type:'object',properties:{project:{type:'string'},topic:{type:'string'},audience:{type:'string'},style:{type:'string'},imageProvider:{enum:['flow','chatgpt','grok']}},required:['project','topic','audience','style']}},
  {name:'windi_choose_layout',description:'Sau khi idea được duyệt, chọn một trong hai layout Windi có sẵn. Việc chọn chưa phải là duyệt layout.',inputSchema:{type:'object',properties:{project:{type:'string'},preset:{enum:['paper-editorial','dark-cinematic']}},required:['project','preset']}},
  {name:'windi_write_artifact',description:'Đăng ký một file idea, layout hoặc script JSON đã được agent ghi trong project. Layout tham chiếu phải có bằng chứng từ bradautomates/claude-video.',inputSchema:{type:'object',properties:{project:{type:'string'},kind:{enum:['idea','layout','script']},file:{type:'string'}},required:['project','kind','file']}},
  {name:'windi_approve_artifact',description:'Ghi nhận duyệt rõ ràng cho đúng idea ID, layout version hoặc script version. Chỉ gọi sau khi người dùng đã duyệt trong cuộc hội thoại hiện tại.',inputSchema:{type:'object',properties:{project:{type:'string'},kind:{enum:['idea','layout','script']},value:{type:'string'}},required:['project','kind','value']}},
  {name:'windi_workflow_continue',description:'Tiếp tục đúng một bước hợp lệ. Không vượt cổng duyệt và không đổi provider khi lỗi.',inputSchema:{type:'object',properties:{project:{type:'string'}},required:['project']}},
  {name:'windi_image_create',description:'Tạo một job ảnh qua Flow, ChatGPT hoặc Grok với request key chống trùng.',inputSchema:{type:'object',properties:{project:{type:'string'},provider:{enum:['flow','chatgpt','grok']},aspect:{type:'string'},count:{type:'integer',minimum:1,maximum:4},seed:{type:'integer',minimum:0,maximum:2147483647},resolution:{type:'string'},model:{type:'string'},quality:{type:'string'},promptFile:{type:'string'},output:{type:'string'},references:{type:'array',items:{type:'string'}},requestKey:{type:'string'}},required:['project','provider','promptFile','output','requestKey']}},
  {name:'windi_image_edit',description:'Sửa ảnh với Flow hoặc Grok; input đứng trước các references. Flow tối đa 4 ảnh tổng cộng; Grok tối đa 8 ảnh và dùng @image1… theo thứ tự.',inputSchema:{type:'object',properties:{project:{type:'string'},provider:{enum:['flow','grok']},model:{type:'string'},promptFile:{type:'string'},input:{type:'string'},references:{type:'array',items:{type:'string'},maxItems:7},output:{type:'string'},requestKey:{type:'string'},aspect:{type:'string'},resolution:{type:'string'}},required:['project','provider','promptFile','input','output','requestKey']}},
  {name:'windi_video_create',description:'Tạo video qua Grok Imagine Web, tối đa 2 ảnh ref theo thứ tự @image1/@image2, tự lưu MP4 vào project. Một ref dùng aspect auto; hai ref chọn được 9:16/16:9.',inputSchema:{type:'object',properties:{project:{type:'string'},provider:{enum:['grok']},promptFile:{type:'string'},output:{type:'string'},requestKey:{type:'string'},aspect:{type:'string'},resolution:{enum:['480p','720p']},duration:{type:'integer',enum:[6,10,15]},input:{type:'string'},references:{type:'array',maxItems:2,items:{type:'string'}}},required:['project','provider','promptFile','output','requestKey']}},
  {name:'windi_job_status',description:'Lấy tiến độ và đường dẫn ảnh/video gốc sau khi job hoàn tất.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']}},
  {name:'windi_grok_status',description:'Đọc trạng thái đăng nhập Grok, không tạo media.',inputSchema:{type:'object',properties:{}}},
  {name:'windi_voice_import',description:'Đăng ký voice do khách cung cấp và Caption JSON tùy chọn vào workflow đã duyệt script.',inputSchema:{type:'object',properties:{project:{type:'string'},audio:{type:'string'},captions:{type:'string'}},required:['project','audio']}},
  {name:'windi_tiktok_prepare',description:'Chuẩn bị bản xem duyệt TikTok riêng tư từ MP4 đã QA, caption và tài khoản. Trả về mã gắn với hash video; không upload.',inputSchema:{type:'object',properties:{project:{type:'string'},account:{type:'string'},caption:{type:'string'}},required:['project','account','caption']}},
  {name:'windi_tiktok_approve',description:'Chỉ gọi khi người dùng đã duyệt đúng MP4, caption, tài khoản và chế độ riêng tư trong cuộc hội thoại hiện tại. Không upload.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'}},required:['project','code']}},
  {name:'windi_tiktok_status',description:'Đọc trạng thái bền vững của đúng video TikTok và liên kết bài đăng nếu đã quan sát được.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'}},required:['project','code']}},
  {name:'windi_tiktok_session',description:'Chỉ kiểm tra phiên TikTok Studio trong Lightpanda cục bộ; cookie ở file trên máy, không trả cookie.',inputSchema:{type:'object',properties:{cookieFile:{type:'string'},account:{type:'string'}},required:['cookieFile']}},
  {name:'windi_tiktok_publish',description:'Chỉ gọi sau khi người dùng duyệt đúng bản video và mã đã được approve. Có thể bấm Đăng một lần; không tự thử lại nếu kết quả không rõ.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'},cookieFile:{type:'string'}},required:['project','code','cookieFile']}},
  {name:'windi_facebook_page',description:'Kiểm tra Page access token lưu tại file cục bộ có thuộc đúng Facebook Page không. Không trả token.',inputSchema:{type:'object',properties:{pageId:{type:'string'},tokenFile:{type:'string'},apiVersion:{type:'string'}},required:['pageId','tokenFile']}},
  {name:'windi_facebook_prepare',description:'Chuẩn bị Facebook Page Reel từ MP4 đã QA, caption và Page ID. Mặc định là bản nháp; public=true nghĩa là bài công khai sau khi duyệt.',inputSchema:{type:'object',properties:{project:{type:'string'},pageId:{type:'string'},caption:{type:'string'},public:{type:'boolean'}},required:['project','pageId','caption']}},
  {name:'windi_facebook_approve',description:'Chỉ gọi khi người dùng đã duyệt đúng MP4, caption, Page và trạng thái nháp/công khai trong cuộc hội thoại hiện tại.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'}},required:['project','code']}},
  {name:'windi_facebook_status',description:'Đọc trạng thái Facebook Reel; có tokenFile thì đối chiếu thêm với Meta, không gửi lại bài.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'},tokenFile:{type:'string'},apiVersion:{type:'string'}},required:['project','code']}},
  {name:'windi_facebook_submit',description:'Chỉ gọi sau khi người dùng duyệt đúng bản và mã approve. Tạo, upload và hoàn tất Page Reel một lần; không tự thử lại nếu kết quả mơ hồ.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'},tokenFile:{type:'string'},apiVersion:{type:'string'}},required:['project','code','tokenFile']}},
  {name:'windi_postiz_channels',description:'Liệt kê kênh TikTok/Facebook đã kết nối trong Postiz; API key đọc từ file cục bộ.',inputSchema:{type:'object',properties:{apiUrl:{type:'string'},keyFile:{type:'string'}},required:['apiUrl','keyFile']}},
  {name:'windi_postiz_prepare',description:'Chuẩn bị bản duyệt gồm MP4 đã QA, caption, kênh Postiz và visibility. TikTok mặc định riêng tư; chưa upload.',inputSchema:{type:'object',properties:{project:{type:'string'},apiUrl:{type:'string'},keyFile:{type:'string'},integrationId:{type:'string'},caption:{type:'string'},public:{type:'boolean'}},required:['project','apiUrl','keyFile','integrationId','caption']}},
  {name:'windi_postiz_approve',description:'Chỉ gọi sau khi người dùng duyệt đúng bản video, caption, tài khoản và visibility trong chat hiện tại.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'}},required:['project','code']}},
  {name:'windi_postiz_status',description:'Đọc trạng thái cục bộ; truyền keyFile để đọc thêm trạng thái bài từ Postiz mà không gửi lại. PUBLISHED ở Postiz chưa thay thế kiểm tra bài trên nền tảng.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'},keyFile:{type:'string'}},required:['project','code']}},
  {name:'windi_postiz_submit',description:'Sau khi người dùng duyệt, upload MP4 và tạo bài đúng kênh một lần. Nếu kết quả mơ hồ thì dừng, không tự gửi lại.',inputSchema:{type:'object',properties:{project:{type:'string'},code:{type:'string'},keyFile:{type:'string'}},required:['project','code','keyFile']}},
] as const;

async function call(name:string,args:Record<string,any>){
  if(name==='windi_workflow_status')return daemon('workflow.status',args);
  if(name==='windi_workflow_start')return daemon('workflow.start',args);
  if(name==='windi_choose_layout')return daemon('workflow.layout.choose',args);
  if(name==='windi_write_artifact')return daemon('workflow.artifact',args);
  if(name==='windi_approve_artifact')return daemon('workflow.approve',args);
  if(name==='windi_workflow_continue')return daemon('workflow.continue',args);
  if(name==='windi_voice_import')return daemon('workflow.voice.import',args);
  if(name==='windi_image_create')return daemon('job.create',{...args,kind:'create',media:'image'});
  if(name==='windi_image_edit')return daemon('job.create',{...args,provider:'grok',kind:'edit',media:'image'});
  if(name==='windi_video_create')return daemon('job.create',{...args,provider:'grok',kind:'create',media:'video'});
  if(name==='windi_job_status')return daemon('job.get',{id:args.id});
  if(name==='windi_grok_status')return daemon('grok.status',{});
  if(name==='windi_tiktok_prepare')return prepareTikTokPost(args.project,args.caption,args.account);
  if(name==='windi_tiktok_approve')return approveTikTokPost(args.project,args.code);
  if(name==='windi_tiktok_status')return tikTokPostStatus(args.project,args.code);
  if(name==='windi_tiktok_session')return checkTikTokSession(args.cookieFile,args.account);
  if(name==='windi_tiktok_publish')return publishTikTokPost(args.project,args.code,args.cookieFile);
  if(name==='windi_facebook_page')return checkFacebookPage(args.tokenFile,args.pageId,args.apiVersion||'v26.0');
  if(name==='windi_facebook_prepare')return prepareFacebookReel(args.project,args.caption,args.pageId,args.public===true?'PUBLISHED':'DRAFT');
  if(name==='windi_facebook_approve')return approveFacebookReel(args.project,args.code);
  if(name==='windi_facebook_status')return args.tokenFile?refreshFacebookReel(args.project,args.code,args.tokenFile,args.apiVersion||'v26.0'):facebookReelStatus(args.project,args.code);
  if(name==='windi_facebook_submit')return submitFacebookReel(args.project,args.code,args.tokenFile,args.apiVersion||'v26.0');
  if(name==='windi_postiz_channels')return listPostizChannels(args.apiUrl,args.keyFile);
  if(name==='windi_postiz_prepare')return preparePostizPost(args.project,args.caption,args.integrationId,args.apiUrl,args.keyFile,args.public===true?'PUBLIC_TO_EVERYONE':undefined);
  if(name==='windi_postiz_approve')return approvePostizPost(args.project,args.code);
  if(name==='windi_postiz_status')return args.keyFile?inspectPostizPost(args.project,args.code,args.keyFile):postizPostStatus(args.project,args.code);
  if(name==='windi_postiz_submit')return submitPostizPost(args.project,args.code,args.keyFile);
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
