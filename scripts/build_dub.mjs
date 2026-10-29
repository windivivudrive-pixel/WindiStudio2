import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const env = Object.fromEntries(
  readFileSync('/Users/win/Documents/WindiStudio2/.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const apiKey = env.CARTESIA_API_KEY_MAIN || env.CARTESIA_API_KEY_1;
const voiceId = '4499b44b-5180-4d65-9d76-e24405138493';
const modelId = 'sonic-3.6';

const workDir = '/tmp/windi-dubbing-perfect';
mkdirSync(workDir, { recursive: true });
mkdirSync(path.join(workDir, 'tts'), { recursive: true });
mkdirSync(path.join(workDir, 'captions'), { recursive: true });

// Segments with exact speech onset and offset verified on Instadocs-3m.mp4
// Speech starts at 12.0s, NOT at 1.12s!
const segments = [
  {
    id: "seg_01",
    start: 12.00,
    end: 16.10,
    text: "There's this saying like the future happens first in San Francisco.",
    translation: "Có câu nói rằng: tương lai luôn bắt đầu ở San Francisco.",
    speed: 1.05
  },
  {
    id: "seg_02",
    start: 16.16,
    end: 22.10,
    text: "I have friends here who spend more time talking to AI's than they do to humans.",
    translation: "Tôi có những người bạn ở đây dành nhiều thời gian trò chuyện với AI hơn là với con người.",
    speed: 1.08
  },
  {
    id: "seg_03",
    start: 22.10,
    end: 27.30,
    text: "They're in a bubble, we're in a bubble. I include myself in that somewhat.",
    translation: "Họ sống trong một cái bong bóng, chúng tôi cũng vậy. Và ở một góc độ nào đó, tôi cũng như thế.",
    speed: 1.10
  },
  {
    id: "seg_04",
    start: 27.30,
    end: 32.50, // Ends at 32.50s; 32.50s - 38.80s is music interlude
    text: "But everything gets filtered through that narrow rhythm.",
    translation: "Thế nhưng mọi thứ dường như đều bị nhìn nhận qua lăng kính chật hẹp ấy.",
    speed: 1.05
  },
  {
    id: "seg_05",
    start: 38.80,
    end: 43.00,
    text: "I think most people are resistant to change.",
    translation: "Tôi nghĩ phần lớn mọi người đều e ngại sự thay đổi.",
    speed: 1.08
  },
  {
    id: "seg_06",
    start: 43.00,
    end: 47.34,
    text: "We live our lives, we get up, we go to work.",
    translation: "Chúng ta sống cuộc đời mình, thức dậy mỗi sáng rồi đi làm.",
    speed: 1.10
  },
  {
    id: "seg_07",
    start: 47.34,
    end: 53.00,
    text: "We don't think about the possibility that the world is shifting under our feet.",
    translation: "Ta không nghĩ đến khả năng thế giới... đang chuyển dịch ngay dưới chân mình.",
    speed: 1.05
  },
  {
    id: "seg_08",
    start: 53.00,
    end: 57.80,
    text: "I don't think we're ready for AI to become smarter than us.",
    translation: "Tôi không nghĩ chúng ta đã sẵn sàng cho viễn cảnh AI thông minh hơn con người.",
    speed: 1.10
  },
  {
    id: "seg_09",
    start: 57.80,
    end: 60.10,
    text: "I don't think our institutions are ready.",
    translation: "Các thể chế của chúng ta chưa sẵn sàng.",
    speed: 1.12
  },
  {
    id: "seg_10",
    start: 60.10,
    end: 63.20,
    text: "I don't think our governments are ready.",
    translation: "Chính phủ của chúng ta cũng chưa sẵn sàng.",
    speed: 1.10
  },
  {
    id: "seg_11",
    start: 63.20,
    end: 66.90,
    text: "I don't think frankly our technology is ready.",
    translation: "Thậm chí nói thẳng ra, công nghệ của chúng ta cũng chưa sẵn sàng.",
    speed: 1.10
  },
  {
    id: "seg_12",
    start: 66.90,
    end: 72.30,
    text: "This is something that we saw in a hugging face attack.",
    translation: "Đây chính là điều chúng ta vừa thấy trong vụ tấn công Hugging Face.",
    speed: 1.10
  },
  {
    id: "seg_13",
    start: 72.30,
    end: 76.10,
    text: "You this morning an unprecedented AI security incident.",
    translation: "Bản tin sáng nay: một sự cố an ninh AI chưa từng có tiền lệ.",
    speed: 1.12
  },
  {
    id: "seg_14",
    start: 76.10,
    end: 82.80,
    text: "Open AI says two of its AI models went rogue and hacked into open source AI platform hugging face.",
    translation: "OpenAI cho biết hai mô hình AI đã mất kiểm soát và tự ý hack vào nền tảng Hugging Face.",
    speed: 1.15
  },
  {
    id: "seg_15",
    start: 82.80,
    end: 84.60,
    text: "They were out of control.",
    translation: "Chúng hoàn toàn vượt tầm kiểm soát.",
    speed: 1.12
  },
  {
    id: "seg_16",
    start: 84.60,
    end: 91.80,
    text: "This is the first major example that we've seen of an AI model independently conducting a hack outside of human control.",
    translation: "Đây là ví dụ lớn đầu tiên về việc mô hình AI tự ý tấn công mạng ngoài tầm kiểm soát của con người.",
    speed: 1.15
  },
  {
    id: "seg_17",
    start: 93.80,
    end: 98.60,
    text: "We have this deep fear that the things we create will eventually have power over us.",
    translation: "Chúng ta luôn có nỗi sợ sâu sắc rằng thứ mình tạo ra rốt cuộc sẽ thống trị chính mình.",
    speed: 1.10
  },
  {
    id: "seg_18",
    start: 98.60,
    end: 103.60,
    text: "If possible has indeed happened ages went rogue, it's how it's war games, it's asthma.",
    translation: "Điều không tưởng đã xảy ra: AI nổi loạn! Như HAL, WarGames hay Asimov.",
    speed: 1.15
  },
  {
    id: "seg_19",
    start: 103.60,
    end: 107.40,
    text: "Hopefully it's not terminator. I'll be back.",
    translation: "Hy vọng đó không phải là Kẻ Hủy Diệt: 'Tôi sẽ trở lại!'",
    speed: 1.10
  },
  {
    id: "seg_20",
    start: 107.40,
    end: 109.40,
    text: "I knew that people lose their minds and they didn't.",
    translation: "Tôi biết mọi người sẽ phát cuồng lên, và đúng là như vậy.",
    speed: 1.15
  },
  {
    id: "seg_21",
    start: 109.40,
    end: 116.00,
    text: "What in the sky net incident is happening here than 10% chance AI could kill us all.",
    translation: "Kịch bản Skynet gì thế này? Hơn mười phần trăm khả năng AI có thể tiêu diệt tất cả chúng ta.",
    speed: 1.15
  },
  {
    id: "seg_22",
    start: 116.00,
    end: 119.60,
    text: "This is like really, really, really, really, really, really science fiction back.",
    translation: "Khoa học viễn tưởng tồi tệ nhất thực sự đang bước ra đời thực.",
    speed: 1.10
  },
  {
    id: "seg_23",
    start: 119.60,
    end: 123.80,
    text: "I think you also have a public that is primed with fear.",
    translation: "Tôi nghĩ công chúng hiện tại cũng đang bị bao trùm trong nỗi sợ hãi.",
    speed: 1.10
  },
  {
    id: "seg_24",
    start: 123.80,
    end: 126.80,
    text: "Open AI is releasing six new reports of a metad justice close.",
    translation: "OpenAI vừa công bố sáu báo cáo mới về sự cố vừa qua.",
    speed: 1.15
  },
  {
    id: "seg_25",
    start: 126.80,
    end: 129.80,
    text: "And Robert now says open AI has hit pause on training.",
    translation: "Và các báo cáo cho biết OpenAI đã tạm dừng huấn luyện...",
    speed: 1.15
  },
  {
    id: "seg_26",
    start: 129.80,
    end: 131.20,
    text: "It's latest artificial intelligence.",
    translation: "...mô hình AI mới nhất của họ.",
    speed: 1.15
  },
  {
    id: "seg_27",
    start: 131.20,
    end: 134.80,
    text: "Another day another AI model doing something it's not supposed to know.",
    translation: "Lại một ngày khác, một mô hình AI lại làm điều không được phép.",
    speed: 1.15
  },
  {
    id: "seg_28",
    start: 134.80,
    end: 136.20,
    text: "People are asking a lot of questions.",
    translation: "Mọi người đang đặt ra rất nhiều câu hỏi.",
    speed: 1.15
  },
  {
    id: "seg_29",
    start: 136.20,
    end: 137.40,
    text: "They're demanding answers.",
    translation: "Họ đòi hỏi những câu trả lời thỏa đáng.",
    speed: 1.15
  },
  {
    id: "seg_30",
    start: 137.40,
    end: 140.00,
    text: "And we're going to be renaming it super intelligence.",
    translation: "Và rồi chúng ta sẽ gọi nó là siêu trí tuệ.",
    speed: 1.15
  },
  {
    id: "seg_31",
    start: 140.00,
    end: 146.40,
    text: "The biggest AI companies have all signed on an accord to self-govern after a meeting at the White House.",
    translation: "Các công ty AI lớn nhất đã ký thỏa thuận tự quản sau cuộc họp tại Nhà Trắng.",
    speed: 1.15
  },
  {
    id: "seg_32",
    start: 146.40,
    end: 152.40,
    text: "This is the best warning shot we've had so far and it might be the last warning shot we get.",
    translation: "Đây là phát súng cảnh báo rõ nhất chúng ta từng có, và có thể là phát súng cảnh báo cuối cùng.",
    speed: 1.10
  },
  {
    id: "seg_33",
    start: 165.40,
    end: 168.40,
    text: "So this is an open source robot called Richie Mini.",
    translation: "Đây là một robot mã nguồn mở tên là Reachy Mini.",
    speed: 1.10
  },
  {
    id: "seg_34",
    start: 168.40,
    end: 169.80,
    text: "It has several senses, right?",
    translation: "Nó có nhiều giác quan đúng không?",
    speed: 1.15
  },
  {
    id: "seg_35",
    start: 169.80,
    end: 174.50,
    text: "You can see, you can listen, you can move.",
    translation: "Nó có thể nhìn, có thể nghe, rồi có thể di chuyển.",
    speed: 1.10
  },
  {
    id: "seg_36",
    start: 176.80,
    end: 179.50,
    text: "It's really quite a versatile.",
    translation: "Nó thực sự rất đa năng.",
    speed: 1.10
  }
];

async function callCartesiaTTS(text) {
  const url = 'https://api.cartesia.ai/tts/bytes';
  const payload = {
    model_id: modelId,
    transcript: text,
    voice: {
      mode: 'id',
      id: voiceId
    },
    output_format: {
      container: 'wav',
      encoding: 'pcm_s16le',
      sample_rate: 48000
    },
    language: 'vi'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Cartesia-Version': '2024-06-10',
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cartesia error: ${res.status} ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getAudioDuration(filePath) {
  const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  return parseFloat(execSync(cmd).toString().trim());
}

async function run() {
  console.log('=== Step 1: Synthesizing TTS Voice Tracks ===');
  for (const s of segments) {
    const wavPath = path.join(workDir, 'tts', s.id + '.wav');
    const targetDur = s.end - s.start;

    // Check if we need to synthesize or re-synthesize
    let needSynth = !existsSync(wavPath);
    if (!needSynth) {
      const dur = getAudioDuration(wavPath);
      // If cached file overruns targetDur, we re-synth or speed adjust
      if (dur > targetDur) {
        console.log(`Audio for ${s.id} exceeds target duration (${dur.toFixed(2)}s > ${targetDur.toFixed(2)}s). Adjusting...`);
        needSynth = true;
      }
    }

    if (needSynth) {
      console.log(`Generating TTS for ${s.id} [${s.start}s - ${s.end}s, slot: ${targetDur.toFixed(2)}s]: "${s.translation}"`);
      const audioBuffer = await callCartesiaTTS(s.translation);
      writeFileSync(wavPath, audioBuffer);
    }

    // Verify duration and adjust with atempo if needed so it fits comfortably within the slot
    let dur = getAudioDuration(wavPath);
    if (dur > targetDur - 0.15) {
      const tempo = Math.min(2.0, (dur / (targetDur - 0.25)));
      console.log(`Fitting ${s.id}: ${dur.toFixed(2)}s -> tempo factor ${tempo.toFixed(2)}`);
      const fittedPath = path.join(workDir, 'tts', s.id + '_fit.wav');
      execSync(`ffmpeg -y -i "${wavPath}" -filter:a "atempo=${tempo.toFixed(4)}" -ar 48000 -c:a pcm_s16le "${fittedPath}" 2>/dev/null`);
      execSync(`mv "${fittedPath}" "${wavPath}"`);
      dur = getAudioDuration(wavPath);
    }
    console.log(` -> ${s.id}: ${dur.toFixed(2)}s (slot: ${targetDur.toFixed(2)}s) OK`);
  }

  console.log('=== Step 2: Generating Subtitle PNG Overlays ===');
  // Python script to render crisp white subtitles with soft shadow and comfortable safe margin
  const pyScript = `
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out_dir = Path("${path.join(workDir, 'captions')}")
font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
font = ImageFont.truetype(font_path, 42)

# Transparent empty frame
empty = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
empty.save(str(out_dir / 'empty.png'))

segments = ${JSON.stringify(segments)}

for s in segments:
    img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Word wrap with max width 75%
    words = s['translation'].split()
    lines = []
    line = ''
    for w in words:
        cand = (line + ' ' + w).strip()
        if draw.textlength(cand, font=font) > 1920 * 0.75 and line:
            lines.append(line)
            line = w
        else:
            line = cand
    if line:
        lines.append(line)
    text = '\\n'.join(lines)

    bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=10, align='center')
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (1920 - w) / 2 - bbox[0]
    # Comfortable height from bottom edge: 125px (safe zone, perfectly readable)
    y = 1080 - 125 - h - bbox[1]

    # 1. Subtle outline for sharp definition
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
        draw.multiline_text((x+dx, y+dy), text, font=font, fill=(0, 0, 0, 180), spacing=10, align='center')

    # 2. Soft drop shadow (shadow nhẹ)
    for dx, dy in [(2, 2), (3, 3), (2, 3), (3, 2), (4, 4)]:
        draw.multiline_text((x+dx, y+dy), text, font=font, fill=(0, 0, 0, 120), spacing=10, align='center')

    # 3. Main crisp white text (#FFFFFF)
    draw.multiline_text((x, y), text, font=font, fill=(255, 255, 255, 255), spacing=10, align='center')

    img.save(str(out_dir / (s['id'] + '.png')))

print('Rendered all caption PNGs with white text and soft shadow.')
`;
  writeFileSync(path.join(workDir, 'render_captions.py'), pyScript);
  execSync(`python3 "${path.join(workDir, 'render_captions.py')}"`);

  console.log('=== Step 3: Building Subtitle Timeline Concat File ===');
  let concatLines = ['ffconcat version 1.0'];
  let cursor = 0;
  for (const s of segments) {
    const gap = s.start - cursor;
    if (gap > 0.03) {
      concatLines.push(`file captions/empty.png`);
      concatLines.push(`duration ${gap.toFixed(3)}`);
    }
    const dur = s.end - s.start;
    concatLines.push(`file captions/${s.id}.png`);
    concatLines.push(`duration ${dur.toFixed(3)}`);
    cursor = s.end;
  }
  if (180.01 - cursor > 0.03) {
    concatLines.push(`file captions/empty.png`);
    concatLines.push(`duration ${(180.01 - cursor).toFixed(3)}`);
  }
  concatLines.push(`file captions/empty.png`);
  writeFileSync(path.join(workDir, 'captions.ffconcat'), concatLines.join('\n'));

  console.log('=== Step 4: Generating SRT Subtitle File ===');
  function formatSrt(sec) {
    const pad = (n, s) => String(n).padStart(s, '0');
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
  }
  const srtContent = segments.map((s, idx) => {
    return `${idx + 1}\n${formatSrt(s.start)} --> ${formatSrt(s.end)}\n${s.translation}\n`;
  }).join('\n');
  writeFileSync('/Users/win/Documents/WindiStudio2/public/Instadocs-3m-subtitles.srt', srtContent);

  console.log('=== Step 5: Building Dubbed Audio Bed ===');
  // Combine all voice segments into a master voice track with adelay
  const voiceInputs = [];
  const filterParts = [];
  segments.forEach((s, i) => {
    voiceInputs.push(`-i "${path.join(workDir, 'tts', s.id + '.wav')}"`);
    const delayMs = Math.round(s.start * 1000);
    filterParts.push(`[${i}:a]adelay=${delayMs}|${delayMs},aformat=sample_rates=48000:channel_layouts=stereo[a${i}]`);
  });
  const mixLabels = segments.map((_, i) => `[a${i}]`).join('');
  const voiceFilter = `${filterParts.join(';')};${mixLabels}amix=inputs=${segments.length}:duration=longest:normalize=0[voice_all]`;

  const voiceMixCmd = `ffmpeg -y ${voiceInputs.join(' ')} -filter_complex "${voiceFilter}" -map "[voice_all]" -c:a pcm_s16le "${path.join(workDir, 'voice_track.wav')}"`;
  console.log('Rendering all voices into master voice track...');
  execSync(voiceMixCmd);

  // Requirement: "giữ âm thanh gốc 35%" -> volume=0.35 on background audio!
  console.log('Mixing with original audio (0.35 background volume ducking) and applying loudnorm...');
  const finalAudioCmd = `ffmpeg -y -i "public/Instadocs-3m.mp4" -i "${path.join(workDir, 'voice_track.wav')}" -filter_complex "[0:a]volume=0.35,aformat=sample_rates=48000:channel_layouts=stereo[bg];[1:a]aformat=sample_rates=48000:channel_layouts=stereo[fg];[fg][bg]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo[aout]" -map "[aout]" -ar 48000 -c:a pcm_s16le "${path.join(workDir, 'dubbed_master.wav')}"`;
  execSync(finalAudioCmd);

  console.log('=== Step 6: Rendering Final 1080p MP4 in ONE continuous pass ===');
  const finalRenderCmd = `ffmpeg -y -i "public/Instadocs-3m.mp4" -f concat -safe 0 -i "${path.join(workDir, 'captions.ffconcat')}" -i "${path.join(workDir, 'dubbed_master.wav')}" -filter_complex "[0:v][1:v]overlay=0:0[v]" -map "[v]" -map 2:a -c:v libx264 -preset veryfast -crf 19 -c:a aac -b:a 192k -ar 48000 -movflags +faststart "public/Instadocs-3m-dubbed.mp4"`;
  console.log('Executing final render...');
  execSync(finalRenderCmd);
  console.log('Render complete! Saved to public/Instadocs-3m-dubbed.mp4');
}

run().catch(console.error);
