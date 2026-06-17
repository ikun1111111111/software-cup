"""Annotate the ink painting with building markers for visual verification."""
from PIL import Image, ImageDraw, ImageFont

img = Image.open(r'e:\03_Projects\software-cup\software\mobile\image\map-bg_20260616200026.png')
W, H = img.size  # 1536 x 1024

# Markers: (id, x_pct, y_pct, label)
MARKERS = [
    (1,  45.5, 12.7, '灵山大佛'),
    (2,  26.0, 30.3, '梵宫'),
    (3,  45.0, 43.9, '九龙灌浴'),
    (4,   9.8, 39.1, '五印坛城'),
    (5,  61.3, 33.2, '祥符禅寺'),
    (6,  43.7, 37.1, '佛手广场'),
    (7,  83.4, 37.1, '百子戏弥勒'),
    (8,  73.0, 29.3, '曼飞龙塔'),
    (9,  66.4, 27.3, '灵山精舍'),
    (10, 16.3, 45.9, '大照壁'),
    (11, 40.4, 60.5, '菩提大道'),
    (12, 21.5, 51.8, '五明桥'),
    (13, 39.1, 41.0, '佛足坛'),
    (14, 27.4, 49.8, '五智门'),
    (15, 48.9, 39.1, '降魔浮雕'),
    (16, 52.8, 41.0, '阿育王柱'),
    (17, 44.3, 22.5, '佛教文化博览馆'),
    (18, 18.3, 57.6, '三圣殿'),
    (19, 70.3, 43.0, '无尽意斋'),
]

draw = ImageDraw.Draw(img)

try:
    font = ImageFont.truetype("msyh.ttc", 20)
    font_small = ImageFont.truetype("msyh.ttc", 16)
except:
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
        font_small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 16)
    except:
        font = ImageFont.load_default()
        font_small = font

R = 18

for idx, x_pct, y_pct, label in MARKERS:
    cx = int(W * x_pct / 100)
    cy = int(H * y_pct / 100)

    draw.ellipse([cx - R - 2, cy - R - 2, cx + R + 2, cy + R + 2], fill='white')
    draw.ellipse([cx - R, cy - R, cx + R, cy + R], fill='#E53935')

    num_text = str(idx)
    bbox = draw.textbbox((0, 0), num_text, font=font_small)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 1), num_text, fill='white', font=font_small)

    label_bbox = draw.textbbox((0, 0), label, font=font)
    lw, lh = label_bbox[2] - label_bbox[0], label_bbox[3] - label_bbox[1]

    lx = cx - lw // 2
    ly = cy - R - lh - 8
    if ly < 5:
        ly = cy + R + 6

    pad = 4
    draw.rectangle([lx - pad, ly - pad, lx + lw + pad, ly + lh + pad],
                    fill=(255, 255, 255, 220), outline='#E53935', width=1)
    draw.text((lx, ly), label, fill='#222', font=font)

out_path = r'e:\03_Projects\software-cup\backend\_annotated_map.png'
img.save(out_path)
print(f'Saved: {out_path}')
