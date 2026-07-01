from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"E:\03_Projects\software-cup")
OUT = ROOT / "tmp" / "home-image-demo" / "memory-emoji-replacement-board.png"

TANG = Path(r"E:\03_Projects\Kimi_Agent_大唐灵山素材清单\tang-lingshan-v2-compressed")
HISTORY = Path(r"E:\03_Projects\history")
EXPLORE = Path(r"E:\03_Projects\历史探索素材包\Kimi_Agent_墨境穿越素材需求\history")
LOCAL = ROOT / "software" / "mobile" / "assets" / "images" / "history"


def font(size: int, bold=False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\simsun.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


F_TITLE = font(42, True)
F_SUB = font(20)
F_CARD_TITLE = font(24, True)
F_CARD_BODY = font(16)
F_TAG = font(13, True)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def cover(path: Path, size):
    img = Image.open(path).convert("RGB")
    ratio = max(size[0] / img.width, size[1] / img.height)
    img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
    left = (img.width - size[0]) // 2
    top = (img.height - size[1]) // 2
    return img.crop((left, top, left + size[0], top + size[1])).convert("RGBA")


def contain(path: Path, size, fill=(246, 238, 224)):
    img = Image.open(path).convert("RGB")
    ratio = min(size[0] * 0.9 / img.width, size[1] * 0.86 / img.height)
    img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
    base = Image.new("RGBA", size, fill + (255,))
    base.alpha_composite(img.convert("RGBA"), ((size[0] - img.width) // 2, (size[1] - img.height) // 2))
    return base


def paste_round(base, img, xy, radius):
    base.paste(img.convert("RGBA"), xy, rounded_mask(img.size, radius))


def add_route_overlay(img):
    draw = ImageDraw.Draw(img)
    pts = [(36, 172), (118, 128), (190, 144), (270, 94), (360, 74)]
    for a, b in zip(pts, pts[1:]):
        draw.line((a, b), fill=(255, 246, 219, 235), width=6)
    for i, (x, y) in enumerate(pts):
        r = 10 if i in (0, len(pts) - 1) else 7
        fill = (42, 77, 110, 245) if i == len(pts) - 1 else (255, 246, 219, 235)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=(255, 253, 247, 240), width=2)
    return img


def add_chat_overlay(img):
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((230, 34, 378, 86), 20, fill=(255, 253, 247, 232))
    draw.polygon([(266, 86), (294, 86), (252, 124)], fill=(255, 253, 247, 232))
    draw.rounded_rectangle((36, 150, 184, 202), 20, fill=(42, 37, 32, 214))
    draw.polygon([(150, 202), (176, 202), (208, 230)], fill=(42, 37, 32, 214))
    for x in (274, 304, 334):
        draw.ellipse((x - 5, 56, x + 5, 66), fill=(200, 75, 49, 245))
    for x in (78, 108, 138):
        draw.ellipse((x - 5, 172, x + 5, 182), fill=(255, 246, 219, 245))
    return img


def draw_card(base, x, y, title, replaces, path, badge, accent, mode="contain", overlay=None):
    draw = ImageDraw.Draw(base)
    w, h = 410, 292
    shadow = Image.new("RGBA", (w + 22, h + 22), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((11, 11, w + 11, h + 11), 22, fill=(42, 37, 32, 30))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    base.alpha_composite(shadow, (x - 11, y - 7))
    draw.rounded_rectangle((x, y, x + w, y + h), 22, fill=(255, 253, 247), outline=(224, 207, 180), width=1)

    image = contain(path, (w - 28, 168)) if mode == "contain" else cover(path, (w - 28, 168))
    if overlay:
        image = overlay(image)
    paste_round(base, image, (x + 14, y + 14), 16)

    tag_w = draw.textbbox((0, 0), badge, font=F_TAG)[2] + 26
    draw.rounded_rectangle((x + 24, y + 24, x + 24 + tag_w, y + 48), 12, fill=accent)
    draw.text((x + 37, y + 36), badge, font=F_TAG, fill=(255, 253, 247), anchor="lm")

    draw.text((x + 18, y + 204), title, font=F_CARD_TITLE, fill=(42, 37, 32))
    draw.text((x + 18, y + 238), replaces, font=F_CARD_BODY, fill=(114, 103, 88))


def main():
    W, H = 930, 1500
    base = Image.new("RGBA", (W, H), (246, 238, 224, 255))
    draw = ImageDraw.Draw(base)

    for y in range(0, H, 8):
        draw.line((0, y, W, y), fill=(230, 219, 202, 42))
    for x in range(0, W, 8):
        draw.line((x, 0, x, H), fill=(230, 219, 202, 34))

    draw.text((48, 54), "记忆页 emoji 替换素材建议", font=F_TITLE, fill=(42, 37, 32))
    draw.text((50, 112), "从你给的历史 / 大唐 / 北宋素材里按功能画面挑，不按文件名判断", font=F_SUB, fill=(112, 101, 87))
    draw.line((50, 150, 880, 150), fill=(200, 75, 49), width=4)

    cards = [
        ("写一条记忆", "替换：写记忆按钮 / 空状态写笔", TANG / "exhibit-deed-scroll.png", "书写", (106, 156, 137), "contain", None),
        ("和小灵聊聊", "替换：空状态聊天 / 从对话生成入口", TANG / "exhibit-poets-gathering.png", "对话", (200, 75, 49), "contain", add_chat_overlay),
        ("朋友圈分享", "替换：朋友圈按钮 / 分享预览", TANG / "exhibit-poem-baijuyi.png", "分享", (42, 77, 110), "contain", None),
        ("记忆胶囊", "替换：胶囊 / 锁定 / 解锁 / 信件", TANG / "exhibit-letter-xuanzang.png", "封存", (155, 95, 168), "contain", None),
        ("旅程总结", "替换：旅程总结空状态", TANG / "bg-tang-overview.png", "总结", (154, 102, 58), "contain", None),
        ("今日回顾", "替换：路线 / 今日地点展示", TANG / "bg-tang-overview.png", "路线", (42, 77, 110), "contain", add_route_overlay),
        ("照片记录", "替换：记忆卡照片角标", TANG / "exhibit-buddha-face.png", "照片", (200, 75, 49), "cover", None),
        ("心情印章", "替换：开心 / 平静 / 兴奋等心情", HISTORY / "img-seal-tang.png", "心情", (188, 156, 72), "contain", None),
    ]

    start_x, start_y = 48, 196
    gap_x, gap_y = 30, 34
    for i, card in enumerate(cards):
        col = i % 2
        row = i // 2
        draw_card(base, start_x + col * (410 + gap_x), start_y + row * (292 + gap_y), *card)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUT, quality=94)
    print(OUT)


if __name__ == "__main__":
    main()
