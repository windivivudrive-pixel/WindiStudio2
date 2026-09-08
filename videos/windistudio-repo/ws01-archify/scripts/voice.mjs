import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../../../package.json',import.meta.url));
const env={...require('dotenv').parse(readFileSync(new URL('../../../../.env.local',import.meta.url))),...process.env};
const voiceId=env.CARTESIA_VOICE_ID||'de943f91-2f7f-47ca-88db-4a8d1cfc5291';
const scenes=[
['hook','Đừng vẽ lại từng ô.','Còn đang kéo từng ô để vẽ quy trình? Xem cách này trước khi làm sơ đồ tiếp theo.'],
['repo','Gặp Archify.','Archify biến mô tả thành sơ đồ tương tác.'],
['demo','Video workflow','Một: làm video. Ý tưởng, kịch bản, dựng, kiểm tra. Liếc là biết bước nào đang chờ.'],
['booking','Lịch hẹn tiệm tóc','Hai: lịch hẹn tiệm tóc. Khách nhắn, chốt giờ, nhắc lịch, làm dịch vụ, rồi chăm sóc. Customer journey này ai cũng hiểu.'],
['onboarding','Onboarding nhân sự mới','Ba: onboarding người mới. Hành chính tạo tài khoản, quản lý bàn giao, người mới xong checklist, rồi check-in tuần đầu. Swimlane cho thấy ai phụ trách việc nào.'],
['interact','Ba style, một công cụ','Cùng một công cụ, ba nhu cầu, ba style. Bấm từng bước, lần theo luồng, rồi gửi HTML cho cả đội.'],
['limit','Có một điều cần nhớ.','Nhưng kiểm tra mối nối. Sơ đồ đẹp chưa chắc đúng quy trình, chi phí AI tùy dịch vụ.'],
['cta','Lưu repo. Dùng lúc cần.','Hay giải thích workflow? Lưu Archify lại. Khám phá thêm công cụ tại Windi Studio chấm app.']];
writeFileSync(new URL('../public/scenes.json',import.meta.url),JSON.stringify(scenes.map(([id,title,text])=>({id,title,text})),null,2));
for(const [id,,text] of scenes){
 const dest=new URL(`../public/${id}.mp3`,import.meta.url);
 const transcript=text.replaceAll('Archify','Ác ki phai').replaceAll('HTML','hát tê em eo').replaceAll('workflow','quy trình').replaceAll('idea','ý tưởng');
 const r=await fetch('https://api.cartesia.ai/tts/bytes',{method:'POST',headers:{Authorization:`Bearer ${env.CARTESIA_API_KEY}`,'Cartesia-Version':'2026-08-14','Content-Type':'application/json'},body:JSON.stringify({model_id:'sonic-3.6',transcript,voice:voiceId,language:'vi',output_format:{container:'mp3',sample_rate:44100,bit_rate:128000},generation_config:{speed:1.15}})});
 if(!r.ok)throw new Error(`TTS ${id} HTTP ${r.status}`);
 const buf=Buffer.from(await r.arrayBuffer());writeFileSync(dest,buf);console.log(id,buf.length);
}
