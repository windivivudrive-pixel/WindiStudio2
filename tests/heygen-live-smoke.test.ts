import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

test.skipIf(process.env.RUN_HEYGEN_LIVE !== '1')('real free-model sentence packing and a single playable MP3', async () => {
  const { synthesizeHeyGen } = await import('../lib/voice/heygen');
  const sample = [
    'Buổi sáng hôm ấy, Minh mở cửa sổ và nhìn xuống con đường nhỏ ven sông. Những mái nhà còn chìm trong sương, chỉ có vài cửa hàng đã bật đèn để chuẩn bị cho một ngày mới. Anh pha một ấm trà, ngồi bên bàn gỗ và chậm rãi xem lại tấm bản đồ đã cũ.',
    'Trên tấm bản đồ có những dấu mực xanh đánh dấu các nơi anh từng ghé qua. Mỗi dấu chấm gợi lại một câu chuyện: một người bạn đã gặp, một món ăn giản dị hay một buổi chiều bất chợt gặp cơn mưa. Minh muốn viết lại những ký ức ấy trước khi chúng trở nên mờ nhạt.',
    'Anh lấy một cuốn sổ mới, viết ngày tháng ở góc trang rồi bắt đầu bằng chuyến đi đầu tiên. Đó là một thị trấn nhỏ nằm giữa những ngọn đồi, nơi con tàu chỉ dừng lại trong vài phút. Khi bước xuống sân ga, anh không biết rằng mình sẽ ở lại nơi ấy lâu hơn dự định.',
    'Người chủ quán gần nhà ga chào anh bằng nụ cười thân thiện và một tách trà nóng. Bà kể rằng vào mùa này, con đường lên đồi thường có sương mù, nhưng đến trưa bầu trời sẽ sáng dần. Anh nghe câu chuyện, ghi lại tên con đường và cảm ơn bà trước khi lên đường.',
    'Dọc hai bên đường, những khu vườn nhỏ hiện ra sau hàng rào gỗ. Một chú chó nằm ngủ trước hiên, tiếng lá cây khẽ xào xạc trong gió. Không gian yên tĩnh đến mức Minh nghe rõ tiếng bước chân của mình trên nền đất còn ẩm.',
    'Đến gần đỉnh đồi, anh gặp một người thợ đang sửa chiếc xe đạp. Hai người cùng tìm cách đặt lại sợi xích, vừa làm vừa trò chuyện về những nơi đáng đến trong vùng. Người thợ chỉ cho anh một lối rẽ dẫn đến thư viện cộng đồng bên cạnh ngôi trường cũ.',
    'Thư viện không lớn, nhưng những kệ sách được chăm sóc cẩn thận. Bên cửa sổ là một chiếc bàn dài với vài chậu cây nhỏ; trên tường treo những bức ảnh về lịch sử thị trấn. Người thủ thư đưa cho Minh xem một cuốn sách ghi lại câu chuyện của các thế hệ trước.',
    'Buổi chiều, mưa bắt đầu rơi trên mái hiên. Minh và người thủ thư ngồi bên cửa sổ, đọc từng trang sách trong tiếng mưa đều đặn. Ngoài đường, vài người đi ngang qua với chiếc ô nhiều màu, rồi mất hút sau hàng cây.',
    'Khi mưa tạnh, anh trở lại nhà ga và nhận ra chuyến tàu cuối cùng đã rời bến. Thay vì lo lắng, anh quyết định tìm một nơi nghỉ và dành thêm một ngày khám phá thị trấn. Người chủ quán buổi sáng giới thiệu một căn phòng nhỏ phía sau khu vườn.',
    'Đêm hôm đó, Minh ghi chép những điều đã trải qua và thấy mình nhớ rõ từng chi tiết. Anh nhận ra rằng những cuộc gặp gỡ bất ngờ thường để lại ấn tượng sâu hơn các kế hoạch hoàn hảo. Có lẽ điều quan trọng nhất trong một chuyến đi là sự sẵn sàng lắng nghe.',
    'Sáng hôm sau, anh trở lại thư viện để trả cuốn sách và chào người thủ thư. Bà tặng anh một tấm bưu thiếp có hình con đường lên đồi, phía sau chỉ viết một lời nhắn ngắn: hãy giữ sự tò mò của mình. Minh cất tấm thiệp vào sổ và hứa sẽ trở lại.',
    'Nhiều năm sau, khi ngồi bên cửa sổ nhìn con sông quen thuộc, Minh vẫn nhớ rõ lời nhắn ấy. Anh viết tiếp câu chuyện trong cuốn sổ mới, để những người chưa từng đến thị trấn cũng có thể hình dung ra buổi sáng có sương, tiếng mưa và những gương mặt thân thiện.'
  ].join(' ');
  const long = process.env.HEYGEN_LIVE_LONG === '1';
  const target = long ? 12000 : 6000;
  const draft = (sample + ' ').repeat(Math.ceil((target + 500) / sample.length));
  const text = draft.slice(0, draft.lastIndexOf('.', target - 1) + 1).trim();
  const requests: { characters: number; model: string }[] = [];
  const network = globalThis.fetch;
  vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === 'https://api.heygen.com/v3/models/audio/tts') {
      const body = JSON.parse(String(init?.body));
      requests.push({ characters: body.text.length, model: body.model });
      if (body.model !== 'heygen-voice-1-turbo-free') throw new Error('Live smoke only permits the free model');
    }
    return network(url, init);
  });
  try {
    const result = await synthesizeHeyGen({ text, voiceId: '7dc25b191a794ecba206cab6f0c70576', language: 'vi', speed: 1 }, '7dc25b191a794ecba206cab6f0c70576', 'heygen-voice-1-turbo-free');
    expect(requests.length).toBeGreaterThan(1);
    expect(requests.every(request => request.characters <= 5000)).toBe(true);
    expect(result.timestamps.words).toEqual(text.split(/\s+/u));
    expect(result.duration).toBeGreaterThan(0);
    expect(result.mp3.length).toBeGreaterThan(1000);
    const directory = long ? '.qa/heygen-5000/dinh-manh-12000' : '.qa/heygen-5000/dinh-manh-short';
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/sample.mp3`, result.mp3);
    await writeFile(`${directory}/source.txt`, text);
    await writeFile(`${directory}/timestamps.json`, JSON.stringify(result.timestamps, null, 2));
    const joins = result.joins.map(join => ({ ...join, before: text.slice(Math.max(0, join.sourceOffset - 100), join.sourceOffset).trim(), after: text.slice(join.sourceOffset, join.sourceOffset + 100).trim() }));
    await writeFile(`${directory}/summary.json`, JSON.stringify({ voice: 'Đình Mạnh', rule: result.rule, characters: [...text].length, requests, requestCount: result.requestCount, duration: result.duration, bytes: result.mp3.length, joins }, null, 2));
  } finally { vi.unstubAllGlobals(); }
}, 280000);
