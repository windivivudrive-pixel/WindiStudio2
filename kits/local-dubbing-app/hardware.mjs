import os from 'node:os';
import {dirname,join} from 'node:path';
import {statfsSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
export const GB=1024**3;
export function inspectHardware(path=process.cwd()){
  let freeBytes=null,gpu=null;
  while(!existsSync(path)&&dirname(path)!==path)path=dirname(path);
  try{const disk=statfsSync(path);freeBytes=disk.bavail*disk.bsize;}catch{}
  try{gpu=execFileSync('nvidia-smi',['--query-gpu=name,memory.total','--format=csv,noheader,nounits'],{timeout:1200,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().slice(0,200);}catch{}
  return {os:`${os.type()} ${os.release()}`,architecture:os.arch(),cpu:os.cpus()[0]?.model||'CPU',cores:os.cpus().length,ramBytes:os.totalmem(),freeBytes,gpu};
}
// Conservative CPU planning thresholds, not benchmarked minimum requirements.
export function hardwarePlan(machine){
  const ram=machine.ramBytes/GB,weak=ram<8;
  const config={mode:weak?'v3nano':'v3turbo',whisperModel:ram<8?'tiny':ram<20?'base':'small',resolution:720};
  const warnings=[];
  if(machine.cores<=4)warnings.push('CPU ít luồng có thể tạo voice lâu; thử Pro trước, chỉ chuyển Lite nếu tốc độ xử lý không đáp ứng.');
  if(ram<4)warnings.push('RAM dưới 4 GB: ưu tiên nhận diện trong chat và giọng API.');
  if(machine.freeBytes===null)warnings.push('Chưa đo được dung lượng trống; kiểm tra ổ lưu model trước khi chạy.');
  else if(machine.freeBytes<6*GB)warnings.push('Ổ lưu model còn dưới 6 GB; có thể thiếu chỗ cho môi trường và model.');
  return {config,warnings,description:'Đề xuất bảo thủ cho CPU theo RAM và số luồng; không phải benchmark. GPU hiển thị chỉ là phát hiện phần cứng, chưa xác nhận runtime CUDA. Local Voice Lite nhẹ hơn nhưng giảm chất lượng, nhất là tiếng Anh.'};
}
export function assertModelCapacity(machine,kind,model){
  const budget=kind==='whisper'?({tiny:[4,1],base:[6,1],small:[8,2],medium:[16,4]})[model]:({v3nano:[4,1],v3turbo:[8,3],standard:[16,4]})[model];
  if(!budget)throw new Error('Model local không hợp lệ.');
  if(machine.ramBytes<budget[0]*GB)throw new Error(`Model đã chọn vượt ngưỡng RAM bảo thủ (${budget[0]} GB). Chọn model nhẹ hơn trong thiết lập hoặc dùng API; chưa tải model.`);
  if(machine.freeBytes!==null&&machine.freeBytes<(budget[1]+1)*GB)throw new Error('Thiếu dung lượng dự phòng cho model đã chọn. Dọn ổ lưu model hoặc chọn model nhẹ hơn; chưa tải model.');
}

export function modelStorage(kind,root){
  return kind==='whisper'?join(root,'cache/whisper'):(process.env.HF_HOME||join(process.env.XDG_CACHE_HOME||join(os.homedir(),'.cache'),'huggingface'));
}
