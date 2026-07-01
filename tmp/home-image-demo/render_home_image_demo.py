from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"E:\03_Projects\software-cup")
OUT = ROOT / "tmp" / "home-image-demo" / "home-image-themed-demo.png"

ASSETS = ROOT / "software" / "mobile" / "assets" / "images"
HISTORY = ASSETS / "history"
THEME = ROOT / "tmp" / "home-image-demo" / "theme-assets"


def font(size: int, bold: bool = False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\simsun.ttc",
    ]
    for item in candidates:
        if Path(item).exists():
            return ImageFont.truetype(item, size)
    return ImageFont.load_default()


F_TITLE = font(34, True)
F_H2 = font(20, True)
F_BODY = font(14)
F_SMALL = font(11)
F_TINY = font(9)
F_BUTTON = font(16, True)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def cover(path: Path, size):
    img = Image.open(path).convert("RGB")
    target_w, target_h = size
    ratio = max(target_w / img.width, target_h / img.height)
    img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
    left = (img.width - target_w) // 2
    top = (img.height - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def fit(path: Path, size, fill=(244, 236, 221)):
    img = Image.open(path).convert("RGB")
    target_w, target_h = size
    ratio = min(target_w / img.width, target_h / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
    base = Image.new("RGB", size, fill)
    left = (target_w - resized.width) // 2
    top = (target_h - resized.height) // 2
    base.paste(resized, (left, top))
    return base


def paste_round(base, img, xy, radius):
    mask = rounded_mask(img.size, radius)
    base.paste(img, xy, mask)


def add_gradient_overlay(img, top_alpha=20, bottom_alpha=165):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    pix = overlay.load()
    for y in range(img.height):
        alpha = int(top_alpha + (bottom_alpha - top_alpha) * (y / max(1, img.height - 1)))
        for x in range(img.width):
            pix[x, y] = (0, 0, 0, alpha)
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def draw_text(draw, xy, text, fnt, fill, anchor=None, spacing=4):
    draw.text(xy, text, font=fnt, fill=fill, anchor=anchor, spacing=spacing)


def text_width(text, fnt):
    box = ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), text, font=fnt)
    return box[2] - box[0]


def draw_chip(draw, x, y, text, fill, outline=None):
    w = text_width(text, F_TINY) + 18
    draw.rounded_rectangle((x, y, x + w, y + 24), 12, fill=fill, outline=outline)
    draw.text((x + w / 2, y + 12), text, font=F_TINY, fill=(255, 253, 247), anchor="mm")
    return w


def draw_image_button(base, x, y, w, h, image_path, title, desc, accent):
    draw = ImageDraw.Draw(base)
    shadow = Image.new("RGBA", (w + 18, h + 18), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((9, 9, w + 9, h + 9), 18, fill=(42, 37, 32, 34))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    base.alpha_composite(shadow, (x - 9, y - 5))
    draw.rounded_rectangle((x, y, x + w, y + h), 18, fill=(255, 253, 247), outline=(232, 219, 199), width=1)

    img = fit(image_path, (w - 18, 70))
    paste_round(base, img, (x + 9, y + 9), 14)
    draw.rounded_rectangle((x + 9, y + 9, x + w - 9, y + 79), 14, outline=(255, 255, 255, 110), width=1)

    tx = x + 13
    draw_text(draw, (tx, y + 100), title, F_BUTTON, (42, 37, 32))
    draw_text(draw, (tx, y + 124), desc, F_TINY, (112, 101, 87))
    draw.rounded_rectangle((x + w - 62, y + 105, x + w - 14, y + 129), 12, fill=accent)
    draw.text((x + w - 38, y + 117), "进入", font=F_TINY, fill=(255, 253, 247), anchor="mm")


def draw_feature(base, x, y, w, h, image_path, title, desc, tag, accent):
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x, y, x + w, y + h), 16, fill=(255, 253, 247), outline=(231, 219, 201), width=1)
    img = fit(image_path, (w - 16, 82))
    paste_round(base, img, (x + 8, y + 8), 12)
    ImageDraw.Draw(base).rounded_rectangle((x + 8, y + 8, x + w - 8, y + 90), 12, outline=(255, 255, 255, 95), width=1)
    draw.rounded_rectangle((x + 14, y + 14, x + 14 + text_width(tag, F_TINY) + 14, y + 36), 11, fill=accent)
    draw.text((x + 21, y + 25), tag, font=F_TINY, fill=(255, 253, 247), anchor="lm")
    draw_text(draw, (x + 12, y + 108), title, F_BODY, (42, 37, 32))
    draw_text(draw, (x + 12, y + 132), desc, F_TINY, (126, 115, 98))


def main():
    W, H = 390, 1120
    base = Image.new("RGBA", (W, H), (245, 238, 225, 255))
    draw = ImageDraw.Draw(base)

    # Subtle paper grid.
    for y in range(0, H, 8):
        draw.line((0, y, W, y), fill=(232, 222, 204, 38), width=1)
    for x in range(0, W, 8):
        draw.line((x, 0, x, H), fill=(232, 222, 204, 28), width=1)

    hero = cover(ASSETS / "hero-bg-mobile.jpg", (W, 392)).convert("RGBA")
    hero = add_gradient_overlay(hero, 18, 178)
    base.alpha_composite(hero, (0, 0))

    # Header.
    draw.rounded_rectangle((20, 28, 112, 58), 15, fill=(255, 253, 247, 220))
    draw.text((36, 43), "灵山胜境", font=F_SMALL, fill=(42, 37, 32), anchor="lm")
    avatar = cover(HISTORY / "highlight-xuanzang.jpg", (34, 34))
    paste_round(base, avatar, (336, 26), 17)
    draw.ellipse((336, 26, 370, 60), outline=(255, 253, 247, 210), width=2)

    draw_text(draw, (24, 112), "小灵带你游灵山", F_TITLE, (255, 253, 247))
    draw_text(draw, (25, 154), "真实图片替换 emoji / 汉字缩略按钮", F_SMALL, (244, 232, 207))
    draw.line((25, 180, 116, 180), fill=(209, 82, 52), width=3)
    draw_chip(draw, 25, 197, "AI 导览", (106, 156, 137, 230))
    draw_chip(draw, 92, 197, "路线规划", (200, 75, 49, 230))
    draw_chip(draw, 174, 197, "历史探索", (42, 77, 110, 220))

    draw_image_button(
        base,
        20,
        266,
        168,
        138,
        THEME / "home-free-explore.png",
        "自由逛逛",
        "看地图找景点",
        (106, 156, 137),
    )
    draw_image_button(
        base,
        202,
        266,
        168,
        138,
        THEME / "home-guided-tour.png",
        "小灵带路",
        "规划路线讲解",
        (200, 75, 49),
    )

    # Body panel.
    draw.rounded_rectangle((0, 414, W, H + 40), 34, fill=(248, 242, 232, 255))
    draw_text(draw, (22, 456), "功能入口改成图片 tile", F_H2, (42, 37, 32))
    draw_text(draw, (23, 486), "每个功能用一张真实素材表达，不再靠单字识别。", F_SMALL, (126, 115, 98))

    features = [
        ("对话导览", "向小灵提问", "问询", THEME / "feature-chat-guide.png", (106, 156, 137)),
        ("景点探索", "大佛 / 梵宫", "景点", THEME / "feature-attractions.png", (200, 75, 49)),
        ("景区导航", "定位与路线", "地图", THEME / "feature-map-nav.png", (42, 77, 110)),
        ("路线导览", "推荐游线", "路线", THEME / "feature-route-guide.png", (74, 124, 110)),
        ("时空穿越", "唐宋历史", "历史", THEME / "feature-history.png", (154, 102, 58)),
        ("旅行记忆", "手帐留念", "记忆", THEME / "feature-memory.png", (188, 156, 72)),
    ]
    card_w, card_h = 164, 164
    start_x, start_y = 22, 524
    gap_x, gap_y = 18, 18
    for i, (title, desc, tag, img, accent) in enumerate(features):
        col = i % 2
        row = i // 2
        draw_feature(
            base,
            start_x + col * (card_w + gap_x),
            start_y + row * (card_h + gap_y),
            card_w,
            card_h,
            img,
            title,
            desc,
            tag,
            accent,
        )

    draw.rounded_rectangle((22, 1050, 368, 1090), 16, fill=(42, 37, 32))
    draw.text((195, 1070), "Demo: 首页 emoji / 单字按钮替换为真实图片素材", font=F_TINY, fill=(244, 232, 207), anchor="mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUT, quality=94)
    print(OUT)


if __name__ == "__main__":
    main()
