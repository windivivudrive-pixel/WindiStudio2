import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../../../../package.json', import.meta.url));
const env = {
  ...require('dotenv').parse(readFileSync(new URL('../../../../.env.local', import.meta.url))),
  ...process.env,
};

if (process.argv.includes('--stdin-key')) {
  const stdinKey = await new Promise((resolve) => {
    let value = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { value += chunk; });
    process.stdin.on('end', () => resolve(value.trim()));
  });
  if (stdinKey) env.CARTESIA_API_KEY = stdinKey;
}

if (!env.CARTESIA_API_KEY) throw new Error('Missing CARTESIA_API_KEY');

const voiceId = env.CARTESIA_VOICE_ID || 'de943f91-2f7f-47ca-88db-4a8d1cfc5291';
const modelId = env.CARTESIA_MODEL_ID || 'sonic-3.6';
const speed = Number(env.CARTESIA_SPEED || '1.15');
const scenes = [
  {
    id: 'hook',
    title: 'Chưa xong đã bị đá ra',
    text: 'Đang sửa máy cho bố mẹ bằng TeamViewer, chưa xong đã bị đá ra? Đây là lúc bạn nên biết RustDesk.',
  },
  {
    id: 'solution',
    title: 'Remote chủ động hơn',
    text: 'RustDesk cũng cho phép bạn nhìn và điều khiển máy tính từ xa. Khi cần, bạn có thể dùng máy chủ do mình quản lý, để bớt phụ thuộc vào giới hạn của dịch vụ khác.',
  },
  {
    id: 'family',
    title: 'Sửa máy cho bố mẹ',
    text: 'Bố mẹ gọi vì máy tính lỗi? Nhập mã kết nối, nhìn thấy màn hình và xử lý ngay, không cần chạy qua tận nơi.',
  },
  {
    id: 'office',
    title: 'Lấy file ở văn phòng',
    text: 'Hoặc file khách hàng nằm trong máy văn phòng: mở RustDesk, vào đúng máy và lấy file dù bạn đang ở ngoài.',
  },
  {
    id: 'route',
    title: 'Có đường dự phòng',
    text: 'Hai máy ưu tiên nối trực tiếp. Nếu mạng chặn, vẫn có đường dự phòng để phiên hỗ trợ tiếp tục.',
  },
  {
    id: 'tradeoff',
    title: 'Dùng thử trước, tự dựng sau',
    text: 'Máy chủ riêng vẫn cần người cài đặt, cập nhật và trả chi phí máy chạy. Vì vậy, hãy thử RustDesk trước, rồi chỉ tự dựng khi thực sự cần.',
  },
  {
    id: 'cta',
    title: 'Lưu RustDesk cho lúc cần',
    text: 'Nếu bạn là người cả nhà gọi mỗi khi máy lỗi, hoặc thường xuyên cần vào máy văn phòng, lưu RustDesk lại. Khám phá thêm công cụ hữu dụng tại Windi Studio chấm app.',
  },
];

mkdirSync(new URL('../public/', import.meta.url), {recursive: true});
writeFileSync(new URL('../public/scenes.json', import.meta.url), JSON.stringify(scenes, null, 2));

const requestedIds = process.argv.slice(2).filter((arg) => arg !== '--stdin-key');
const targetScenes = requestedIds.length > 0 ? scenes.filter(({id}) => requestedIds.includes(id)) : scenes;

for (const {id, text} of targetScenes) {
  const transcript = text
    .replaceAll('RustDesk', 'Rớt Đét')
    .replaceAll('remote', 'ri-mốt');
  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      'Cartesia-Version': '2026-03-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: modelId,
      transcript,
      voice: {id: voiceId},
      language: 'vi',
      output_format: {container: 'mp3', sample_rate: 44100, bit_rate: 128000},
      generation_config: {speed},
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TTS ${id} HTTP ${response.status}: ${detail}`);
  }
  const audio = Buffer.from(await response.arrayBuffer());
  writeFileSync(new URL(`../public/${id}.mp3`, import.meta.url), audio);
  console.log(`${id}: ${audio.length} bytes`);
}
