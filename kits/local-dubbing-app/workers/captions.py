"""Rasterize Vietnamese captions locally; no dependency on FFmpeg libass."""
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageColor

r = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
width, height = r['width'], r['height']
font_path = Path(r['fontPath'])
if not font_path.is_file():
    raise RuntimeError('Font phụ đề đã chọn chưa có trên máy.')
def static_caption(s):
    image = Image.new('RGBA', (width, height))
    draw = ImageDraw.Draw(image)
    size = max(16, round(r['fontSize'] * height / 720))
    while True:
        font = ImageFont.truetype(str(font_path), size)
        lines, line = [], ''
        for word in s['translation'].split():
            candidate = (line + ' ' + word).strip()
            if draw.textlength(candidate, font=font) > width * .87 and line:
                lines.append(line)
                line = word
            else:
                line = candidate
        if line:
            lines.append(line)
        text = '\n'.join(lines)
        box = draw.multiline_textbbox((0, 0), text, font=font, spacing=6, stroke_width=2)
        if box[3]-box[1] < height * .4 or size <= 16:
            break
        size -= 2
    text_width, text_height = box[2]-box[0], box[3]-box[1]
    x, y = (width-text_width)/2-box[0], height*.92-text_height-box[1]
    if r['subtitle'] == 'box':
        draw.rounded_rectangle((x+box[0]-12,y+box[1]-8,x+box[2]+12,y+box[3]+8), radius=8, fill=(*ImageColor.getrgb(r.get('backgroundColor', '#0c1410')), round(255*r.get('backgroundOpacity', 82)/100)))
    draw.multiline_text((x,y), text, font=font, fill=r['color'], stroke_width=2, stroke_fill=(10,15,12,255), spacing=6, align='center')
    image.save(str(Path(r['directory'])/(s['id']+'.png')))


def karaoke_caption(s):
    words = s['translation'].split()
    # Bound rasterization work even for imported very long captions.
    if len(words) > 300:
        raise ValueError('Karaoke tối đa 300 từ mỗi câu. Chia câu ngắn hơn trước khi xuất.')
    size = max(16, round(r['fontSize'] * height / 720))
    scale = 1 if r.get('karaokeStyle') == 'color' else r.get('karaokeScale', 120) / 100
    directory = Path(r['directory'])
    frames = []
    for index, word in enumerate(words):
        chunk_start = (index // 5) * 5
        chunk = words[chunk_start:chunk_start+5]
        active = index - chunk_start
        image = Image.new('RGBA', (width, height))
        draw = ImageDraw.Draw(image)
        current_size = size
        while True:
            font = ImageFont.truetype(str(font_path), current_size)
            big = ImageFont.truetype(str(font_path), round(current_size * scale))
            shown = [word] if r.get('karaokeStyle') == 'popup' else chunk
            focus = 0 if r.get('karaokeStyle') == 'popup' else active
            fonts = [big if i == focus else font for i in range(len(shown))]
            widths = [draw.textlength(w, font=f) for w, f in zip(shown, fonts)]
            gap = draw.textlength(' ', font=font)
            total = sum(widths) + gap * (len(shown)-1)
            if total < width * .87 or current_size <= 8:
                break
            current_size -= 1
        ascent = max(f.getmetrics()[0] for f in fonts)
        descent = max(f.getmetrics()[1] for f in fonts)
        x, baseline = (width-total)/2, height*.92-descent
        if r['subtitle'] == 'box':
            draw.rounded_rectangle((x-12, baseline-ascent-8, x+total+12, baseline+descent+8), radius=8, fill=(*ImageColor.getrgb(r.get('backgroundColor','#0c1410')),round(255*r.get('backgroundOpacity',82)/100)))
        for i, (w,f,span) in enumerate(zip(shown,fonts,widths)):
            draw.text((x,baseline),w,font=f,anchor='ls',fill=r.get('karaokeColor','#a8ed82') if i==focus else r['color'],stroke_width=2,stroke_fill=(10,15,12,255))
            x += span + gap
        name = s['id'] + '-k' + str(index) + '.png'
        image.save(str(directory/name))
        frames.append(name)
    duration = float(s.get('captionDuration', s.get('end',1)-s.get('start',0))) / max(1,len(frames))
    # Relative filenames contain only validated segment IDs and generated suffixes.
    manifest = 'ffconcat version 1.0\n' + ''.join("file '"+name+"'\nduration "+str(duration)+"\n" for name in frames)
    if frames:
        manifest += "file '" + frames[-1] + "'\n"
    (directory/(s['id']+'.ffconcat')).write_text(manifest,encoding='utf-8')

for segment in r['segments']:
    if r.get('karaoke'):
        karaoke_caption(segment)
    else:
        static_caption(segment)
print(json.dumps({'done': True}))
