"""Rasterize Vietnamese captions locally; no dependency on FFmpeg libass."""
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

r = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
width, height = r['width'], r['height']
fonts = [Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts/arial.ttf', Path('/System/Library/Fonts/Supplemental/Arial.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
font_path = next((p for p in fonts if p.exists()), None)
if not font_path:
    raise RuntimeError('Cần font Arial hoặc DejaVu Sans có hỗ trợ tiếng Việt trên máy.')
for s in r['segments']:
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
        draw.rounded_rectangle((x+box[0]-12,y+box[1]-8,x+box[2]+12,y+box[3]+8), radius=8, fill=(12,20,16,210))
    draw.multiline_text((x,y), text, font=font, fill=r['color'], stroke_width=2, stroke_fill=(10,15,12,255), spacing=6, align='center')
    image.save(str(Path(r['directory'])/(s['id']+'.png')))
print(json.dumps({'done': True}))
