from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(r"E:\03_Projects\software-cup")
OUT = ROOT / "tmp" / "home-image-demo" / "memory-page-image-demo.png"

TANG = Path(r"E:\03_Projects\Kimi_Agent_大唐灵山素材清单\tang-lingshan-v2-compressed")
HISTORY = Path(r"E:\03_Projects\history")


def font(size: int, bold: bool = False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\simsun.ttc",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


F_HERO = font(34, True)
F_TITLE = font(22, True)
F_SECTION = font(18, True)
F_BODY = font(13)
F_BODY_BOLD = font(13, True)
F_SMALL = font(11)
F_SMALL_BOLD = font(11, True)
F_TINY = font(9, True)


PAPER = (246, 239, 226)
CARD = (255, 253, 248)
INK = (44, 37, 31)
MUTED = (117, 104, 88)
LINE = (222, 207, 183)
RED = (199, 73, 49)
TEAL = (78, 135, 121)
BLUE = (42, 78, 110)
GOLD = (176, 136, 63)
VIOLET = (143, 91, 156)


def mask(size, radius):
    layer = Image.new("L", size, 0)
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return layer


def cover(path: Path, size, focus=(0.5, 0.5)):
    image = Image.open(path).convert("RGB")
    scale = max(size[0] / image.width, size[1] / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = round((image.width - size[0]) * focus[0])
    top = round((image.height - size[1]) * focus[1])
    left = max(0, min(left, image.width - size[0]))
    top = max(0, min(top, image.height - size[1]))
    return image.crop((left, top, left + size[0], top + size[1])).convert("RGBA")


def contain(path: Path, size, fill=(243, 234, 217), padding=0.12):
    image = Image.open(path).convert("RGBA")
    max_w = int(size[0] * (1 - padding))
    max_h = int(size[1] * (1 - padding))
    scale = min(max_w / image.width, max_h / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    base = Image.new("RGBA", size, fill + (255,))
    base.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return base


def paste_round(base, image, xy, radius):
    base.paste(image.convert("RGBA"), xy, mask(image.size, radius))


def shadowed_card(base, xy, size, radius=18, fill=CARD, outline=LINE, shadow=True):
    x, y = xy
    w, h = size
    if shadow:
        layer = Image.new("RGBA", (w + 30, h + 30), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle((15, 15, w + 15, h + 15), radius, fill=(52, 41, 31, 28))
        layer = layer.filter(ImageFilter.GaussianBlur(12))
        base.alpha_composite(layer, (x - 15, y - 10))
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((x, y, x + w, y + h), radius, fill=fill, outline=outline, width=1)


def text(draw, xy, content, fnt, fill=INK, anchor=None):
    draw.text(xy, content, font=fnt, fill=fill, anchor=anchor)


def wrapped_text(draw, xy, content, fnt, width, fill=MUTED, line_gap=4, max_lines=3):
    x, y = xy
    lines = []
    current = ""
    for char in content:
        trial = current + char
        if draw.textlength(trial, font=fnt) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = char
        if len(lines) == max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(current)

    line_height = draw.textbbox((0, 0), "字", font=fnt)[3] + line_gap
    for index, line in enumerate(lines[:max_lines]):
        if index == max_lines - 1 and len("".join(lines)) < len(content):
            while draw.textlength(line + "...", font=fnt) > width and line:
                line = line[:-1]
            line += "..."
        text(draw, (x, y + index * line_height), line, fnt, fill)


def pill(draw, xy, label, fill, fg=(255, 253, 248), icon=None):
    x, y = xy
    bbox = draw.textbbox((0, 0), label, font=F_SMALL_BOLD)
    width = bbox[2] - bbox[0] + 24 + (20 if icon else 0)
    draw.rounded_rectangle((x, y, x + width, y + 25), 12, fill=fill)
    if icon:
        draw.ellipse((x + 7, y + 7, x + 17, y + 17), fill=icon)
        text(draw, (x + 25, y + 12), label, F_SMALL_BOLD, fg, "lm")
    else:
        text(draw, (x + 12, y + 12), label, F_SMALL_BOLD, fg, "lm")
    return width


def add_dark_gradient(image, top_alpha=20, bottom_alpha=165):
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    pixels = overlay.load()
    for y in range(image.height):
        alpha = int(top_alpha + (bottom_alpha - top_alpha) * (y / max(1, image.height - 1)))
        for x in range(image.width):
            pixels[x, y] = (0, 0, 0, alpha)
    image.alpha_composite(overlay)
    return image


def route_overlay(image):
    d = ImageDraw.Draw(image)
    points = [(36, 118), (94, 88), (156, 104), (215, 72), (294, 58)]
    for a, b in zip(points, points[1:]):
        d.line((a, b), fill=(255, 246, 222, 235), width=5)
    for i, (x, y) in enumerate(points):
        r = 8 if i in (0, len(points) - 1) else 6
        fill = BLUE + (245,) if i == len(points) - 1 else (255, 246, 222, 245)
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill, outline=(255, 253, 248, 245), width=2)
    return image


def draw_action(base, x, y, title, subtitle, image_path, badge, color, mode="contain"):
    draw = ImageDraw.Draw(base)
    shadowed_card(base, (x, y), (86, 126), radius=17, shadow=False)
    image = contain(image_path, (66, 52), padding=0.18) if mode == "contain" else cover(image_path, (66, 52))
    paste_round(base, image, (x + 10, y + 10), 12)
    draw.rounded_rectangle((x + 10, y + 10, x + 33, y + 26), 8, fill=color + (245,))
    text(draw, (x + 21.5, y + 18), badge, F_TINY, (255, 253, 248), "mm")
    text(draw, (x + 43, y + 79), title, F_SMALL_BOLD, INK, "mm")
    text(draw, (x + 43, y + 101), subtitle, F_TINY, MUTED, "mm")


def draw_stat(draw, x, y, value, label):
    draw.rounded_rectangle((x - 22, y - 24, x + 22, y + 37), 14, fill=(44, 37, 31, 132))
    text(draw, (x, y - 2), value, font(22, True), (255, 253, 248), "mm")
    text(draw, (x, y + 24), label, F_TINY, (255, 237, 209), "mm")


def draw_demo():
    W, H = 430, 1650
    base = Image.new("RGBA", (W, H), PAPER + (255,))
    draw = ImageDraw.Draw(base)

    for y in range(0, H, 7):
        draw.line((0, y, W, y), fill=(229, 219, 203, 36))
    for x in range(0, W, 7):
        draw.line((x, 0, x, H), fill=(229, 219, 203, 24))

    hero = cover(TANG / "bg-tang-02.png", (398, 230), focus=(0.5, 0.42))
    hero = hero.filter(ImageFilter.GaussianBlur(0.25))
    add_dark_gradient(hero)
    paste_round(base, hero, (16, 18), 26)
    text(draw, (36, 58), "AI MEMORY", F_TINY, (255, 237, 209))
    text(draw, (36, 93), "旅行记忆", F_HERO, (255, 253, 248))
    text(draw, (36, 137), "把灵山路上的听见、看见、想到，都收进来", F_BODY, (255, 244, 224))
    pill(draw, (36, 178), "今日已入册 4 条", (255, 253, 248), (88, 65, 46), icon=RED)
    draw_stat(draw, 298, 75, "7", "景点")
    draw_stat(draw, 348, 75, "12", "记忆")
    draw_stat(draw, 298, 138, "3", "胶囊")
    draw_stat(draw, 348, 138, "2", "待回顾")

    y = 270
    text(draw, (20, y), "快捷记录", F_SECTION, INK)
    text(draw, (20, y + 25), "原来的 emoji 按钮改成真实素材缩略图", F_SMALL, MUTED)
    y += 48
    draw_action(base, 18, y, "对话生成", "小灵聊过", TANG / "exhibit-poets-gathering.png", "聊", RED, "cover")
    draw_action(base, 118, y, "写记忆", "手写卷轴", TANG / "exhibit-deed-scroll.png", "写", TEAL)
    draw_action(base, 218, y, "朋友圈", "诗笺分享", TANG / "exhibit-poem-baijuyi.png", "享", BLUE)
    draw_action(base, 318, y, "胶囊", "封存信件", TANG / "exhibit-letter-xuanzang.png", "封", VIOLET)

    y += 152
    shadowed_card(base, (18, y), (394, 154), radius=18)
    summary_img = contain(TANG / "bg-tang-overview.png", (132, 116), padding=0)
    summary_img = route_overlay(summary_img)
    paste_round(base, summary_img, (34, y + 19), 14)
    pill(draw, (180, y + 22), "旅程总结", BLUE)
    text(draw, (180, y + 64), "本次灵山行程手账", F_TITLE, INK)
    wrapped_text(draw, (180, y + 93), "小灵已把讲解、打卡和提问整理成一张可分享的路线记忆。", F_SMALL, 202, MUTED, max_lines=2)
    draw.rounded_rectangle((180, y + 120, 286, y + 142), 11, fill=(238, 220, 205))
    text(draw, (233, y + 131), "生成总结", F_SMALL_BOLD, RED, "mm")

    y += 178
    shadowed_card(base, (18, y), (394, 148), radius=18, fill=(47, 40, 33), outline=(79, 65, 50))
    review = cover(TANG / "bg-tang-overview.png", (144, 110), focus=(0.52, 0.48))
    review = route_overlay(review)
    paste_round(base, review, (252, y + 19), 14)
    pill(draw, (34, y + 21), "今日回顾", RED)
    text(draw, (34, y + 63), "大唐灵山线", F_TITLE, (255, 253, 248))
    text(draw, (34, y + 93), "3 个景点完成，路线节点用实景图加线显示。", F_SMALL, (222, 207, 183))
    draw.rounded_rectangle((34, y + 116, 88, y + 137), 10, fill=(255, 253, 248, 35))
    draw.rounded_rectangle((94, y + 116, 150, y + 137), 10, fill=(255, 253, 248, 35))
    text(draw, (61, y + 126), "慈恩寺", F_TINY, (255, 244, 224), "mm")
    text(draw, (122, y + 126), "玄奘院", F_TINY, (255, 244, 224), "mm")

    y += 174
    draw.rounded_rectangle((18, y, 412, y + 45), 22, fill=CARD, outline=LINE)
    draw.rounded_rectangle((23, y + 5, 212, y + 40), 17, fill=INK)
    icon1 = contain(TANG / "exhibit-deed-scroll.png", (25, 25), padding=0.2)
    paste_round(base, icon1, (42, y + 10), 8)
    text(draw, (130, y + 22.5), "时间线", F_BODY_BOLD, (255, 253, 248), "mm")
    icon2 = route_overlay(contain(TANG / "exhibit-map-xuanzang.png", (25, 25), padding=0.0))
    paste_round(base, icon2, (250, y + 10), 8)
    text(draw, (330, y + 22.5), "地图", F_BODY_BOLD, MUTED, "mm")

    y += 74
    text(draw, (20, y), "记忆时光", F_SECTION, INK)
    text(draw, (20, y + 24), "记忆卡内的地点、照片、心情、成就都不再用 emoji", F_SMALL, MUTED)
    y += 55
    draw.line((42, y + 15, 42, y + 354), fill=(191, 166, 132), width=2)
    stamp = contain(HISTORY / "img-seal-tang.png", (42, 42), fill=(255, 253, 248), padding=0.02)
    paste_round(base, stamp, (21, y), 21)
    shadowed_card(base, (74, y), (338, 284), radius=18)
    photo = cover(TANG / "exhibit-buddha-face.png", (306, 120), focus=(0.42, 0.35))
    paste_round(base, photo, (90, y + 16), 14)
    pill(draw, (102, y + 27), "照片记录", RED)
    text(draw, (90, y + 161), "佛面前的停留", F_TITLE, INK)
    wrapped_text(draw, (90, y + 188), "在石窟前停了很久，讲解说到唐代工匠的眉眼线条，忽然能理解那种安静。", F_BODY, 286, MUTED, max_lines=2)
    loc = route_overlay(contain(TANG / "exhibit-map-xuanzang.png", (26, 26), padding=0.0))
    paste_round(base, loc, (90, y + 238), 8)
    text(draw, (124, y + 251), "石佛遗迹", F_SMALL_BOLD, INK, "lm")
    small_stamp = contain(HISTORY / "img-seal-tang.png", (26, 26), fill=(255, 253, 248), padding=0.02)
    paste_round(base, small_stamp, (226, y + 238), 8)
    text(draw, (260, y + 251), "平静", F_SMALL_BOLD, GOLD, "lm")

    y += 310
    capsule_stamp = contain(TANG / "exhibit-letter-xuanzang.png", (42, 42), fill=(255, 253, 248), padding=0.08)
    paste_round(base, capsule_stamp, (21, y), 21)
    shadowed_card(base, (74, y), (338, 160), radius=18, fill=(255, 249, 239))
    letter = contain(TANG / "exhibit-letter-xuanzang.png", (90, 104), fill=(244, 230, 205), padding=0.04)
    paste_round(base, letter, (92, y + 28), 14)
    pill(draw, (198, y + 25), "记忆胶囊", VIOLET)
    text(draw, (198, y + 66), "给三天后的自己", F_TITLE, INK)
    text(draw, (198, y + 96), "封存一段话，时间到了再打开。", F_SMALL, MUTED)
    draw.rounded_rectangle((198, y + 120, 282, y + 143), 11, fill=(238, 222, 239))
    text(draw, (240, y + 131), "2 天后开启", F_TINY, VIOLET, "mm")

    y += 197
    shadowed_card(base, (18, y), (394, 112), radius=18, fill=(255, 253, 248), shadow=False)
    empty = contain(TANG / "exhibit-poets-gathering.png", (72, 72), fill=(244, 235, 219), padding=0.0)
    paste_round(base, empty, (34, y + 20), 16)
    text(draw, (124, y + 33), "空状态也可以更像“记忆入口”", F_BODY_BOLD, INK)
    wrapped_text(draw, (124, y + 57), "用诗会/对话图替换聊天 emoji，用卷轴图替换写笔。", F_SMALL, 252, MUTED, max_lines=2)
    draw.rounded_rectangle((124, y + 82, 238, y + 103), 10, fill=(232, 242, 237))
    text(draw, (181, y + 92), "和小灵聊聊", F_TINY, TEAL, "mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUT, quality=94)
    print(OUT)


if __name__ == "__main__":
    draw_demo()
