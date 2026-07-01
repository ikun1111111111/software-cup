from pathlib import Path
from math import sin, cos, pi
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = Path(r"E:\03_Projects\software-cup")
ASSETS = ROOT / "software" / "mobile" / "assets" / "images"
HISTORY = ASSETS / "history"
TANG = Path(r"E:\03_Projects\Kimi_Agent_大唐灵山素材清单\tang-lingshan-v2-compressed")
OUT_DIR = ROOT / "tmp" / "home-image-demo" / "theme-assets"
SHEET = ROOT / "tmp" / "home-image-demo" / "theme-assets-contact-sheet.png"

W, H = 768, 512


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


F_LABEL = font(30, True)
F_SMALL = font(18)


def cover(path: Path, size=(W, H)):
    img = Image.open(path).convert("RGB")
    ratio = max(size[0] / img.width, size[1] / img.height)
    img = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
    left = (img.width - size[0]) // 2
    top = (img.height - size[1]) // 2
    return img.crop((left, top, left + size[0], top + size[1])).convert("RGBA")


def contain(path: Path, size=(W, H), scale=0.88, fill=(247, 239, 224)):
    img = Image.open(path).convert("RGB")
    max_w = int(size[0] * scale)
    max_h = int(size[1] * scale)
    ratio = min(max_w / img.width, max_h / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS).convert("RGBA")
    base = Image.new("RGBA", size, fill + (255,))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2
    base.alpha_composite(resized, (x, y))
    return base


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def paste_round(base, img, xy, radius):
    img = img.convert("RGBA")
    base.paste(img, xy, rounded_mask(img.size, radius))


def grade(img, warmth=(246, 228, 194, 34), dark=95):
    img = ImageEnhance.Color(img).enhance(0.92)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    overlay = Image.new("RGBA", img.size, warmth)
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    vignette = Image.new("RGBA", img.size, (0, 0, 0, 0))
    vp = vignette.load()
    cx, cy = img.width / 2, img.height / 2
    maxd = (cx * cx + cy * cy) ** 0.5
    for y in range(img.height):
        for x in range(img.width):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / maxd
            a = int(max(0, d - 0.42) * dark)
            vp[x, y] = (0, 0, 0, a)
    return Image.alpha_composite(img, vignette)


def glow_layer(size, blur=24):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    return layer, ImageDraw.Draw(layer)


def draw_route(draw, pts, color=(255, 246, 219, 230), accent=(200, 75, 49, 255), width=8):
    for a, b in zip(pts, pts[1:]):
        draw.line((a, b), fill=color, width=width, joint="curve")
    for i, (x, y) in enumerate(pts):
        r = 15 if i in (0, len(pts) - 1) else 10
        draw.ellipse((x - r, y - r, x + r, y + r), fill=accent if i == len(pts) - 1 else color)
        draw.ellipse((x - r, y - r, x + r, y + r), outline=(255, 253, 247, 230), width=3)


def draw_compass(draw, cx, cy, r, color=(255, 246, 219, 230)):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=5)
    draw.line((cx, cy - r + 14, cx, cy + r - 14), fill=color, width=4)
    draw.line((cx - r + 14, cy, cx + r - 14, cy), fill=color, width=4)
    draw.polygon([(cx, cy - r + 22), (cx + 11, cy), (cx, cy + 8), (cx - 11, cy)], fill=(200, 75, 49, 240))


def draw_chat(draw):
    draw.rounded_rectangle((414, 90, 680, 188), 30, fill=(255, 253, 247, 224))
    draw.polygon([(476, 188), (510, 188), (468, 230)], fill=(255, 253, 247, 224))
    draw.rounded_rectangle((340, 236, 600, 328), 30, fill=(42, 37, 32, 210))
    draw.polygon([(514, 328), (552, 328), (598, 370)], fill=(42, 37, 32, 210))
    for x in (468, 518, 568):
        draw.ellipse((x - 10, 132, x + 10, 152), fill=(200, 75, 49, 235))
    for x in (402, 452, 502):
        draw.ellipse((x - 9, 276, x + 9, 294), fill=(255, 246, 219, 235))


def draw_viewfinder(draw, x0=70, y0=64, x1=698, y1=448, color=(255, 246, 219, 235)):
    l = 82
    for x, sx in [(x0, 1), (x1, -1)]:
        for y, sy in [(y0, 1), (y1, -1)]:
            draw.line((x, y, x + sx * l, y), fill=color, width=7)
            draw.line((x, y, x, y + sy * l), fill=color, width=7)
    draw.ellipse((W // 2 - 34, H // 2 - 34, W // 2 + 34, H // 2 + 34), outline=color, width=5)


def draw_portal(draw, cx, cy):
    for i, r in enumerate([74, 108, 142]):
        alpha = 230 - i * 48
        draw.arc((cx - r, cy - r, cx + r, cy + r), 210, 520, fill=(255, 246, 219, alpha), width=8)
    for a in range(0, 360, 45):
        x = cx + int(cos(a * pi / 180) * 122)
        y = cy + int(sin(a * pi / 180) * 122)
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=(200, 75, 49, 220))


def draw_journal(draw):
    draw.rounded_rectangle((86, 78, 402, 430), 18, fill=(255, 253, 247, 230), outline=(213, 191, 154), width=3)
    draw.rounded_rectangle((118, 108, 434, 448), 18, fill=(246, 232, 204, 238), outline=(213, 191, 154), width=3)
    for y in [178, 224, 270, 316, 362]:
        draw.line((158, y, 386, y), fill=(169, 139, 96, 115), width=2)
    draw.line((504, 114, 624, 404), fill=(42, 37, 32, 225), width=8)
    draw.polygon([(494, 106), (548, 128), (520, 160)], fill=(200, 75, 49, 235))
    draw.ellipse((602, 386, 650, 436), fill=(42, 37, 32, 225))


def save_asset(name, img):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    img.convert("RGB").save(path, quality=94)
    return path


def make_free_explore():
    img = grade(cover(ASSETS / "putidadao.jpg"))
    draw = ImageDraw.Draw(img)
    draw_route(draw, [(120, 360), (246, 292), (338, 334), (470, 238), (626, 178)], accent=(106, 156, 137, 255))
    draw_compass(draw, 634, 360, 64)
    return save_asset("home-free-explore.png", img)


def make_guided_tour():
    img = grade(cover(HISTORY / "event-modern-plan.jpg"))
    draw = ImageDraw.Draw(img)
    draw_route(draw, [(106, 386), (214, 306), (334, 332), (452, 226), (608, 178)], accent=(200, 75, 49, 255))
    draw.ellipse((92, 116, 166, 190), fill=(255, 246, 219, 230))
    draw.rounded_rectangle((72, 188, 188, 328), 48, fill=(42, 37, 32, 205))
    draw.line((188, 234, 260, 198), fill=(255, 246, 219, 230), width=9)
    return save_asset("home-guided-tour.png", img)


def make_chat():
    img = grade(contain(TANG / "exhibit-poets-gathering.png", scale=0.92), warmth=(232, 218, 187, 18), dark=45)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((486, 92, 690, 162), 24, fill=(255, 253, 247, 220))
    draw.polygon([(548, 162), (580, 162), (536, 204)], fill=(255, 253, 247, 220))
    draw.rounded_rectangle((98, 318, 304, 388), 24, fill=(42, 37, 32, 200))
    draw.polygon([(244, 388), (278, 388), (320, 424)], fill=(42, 37, 32, 200))
    for x in (552, 588, 624):
        draw.ellipse((x - 8, 120, x + 8, 136), fill=(200, 75, 49, 235))
    for x in (166, 202, 238):
        draw.ellipse((x - 7, 346, x + 7, 360), fill=(255, 246, 219, 235))
    return save_asset("feature-chat-guide.png", img)


def make_attractions():
    img = grade(contain(TANG / "bg-tang-02.png", scale=0.86), dark=48)
    draw = ImageDraw.Draw(img)
    draw_viewfinder(draw, x0=96, y0=88, x1=672, y1=424)
    return save_asset("feature-attractions.png", img)


def make_map():
    paper = grade(contain(TANG / "bg-tang-overview.png", scale=0.86), warmth=(246, 228, 194, 10), dark=42)
    draw = ImageDraw.Draw(paper)
    draw_route(draw, [(136, 392), (242, 334), (342, 358), (448, 286), (548, 242), (650, 178)], accent=(42, 77, 110, 255), width=9)
    draw_compass(draw, 638, 370, 50)
    return save_asset("feature-map-nav.png", paper)


def make_route():
    img = grade(cover(ASSETS / "putidadao.jpg"))
    draw = ImageDraw.Draw(img)
    pts = [(84, 394), (172, 330), (268, 356), (372, 284), (486, 248), (636, 156)]
    draw_route(draw, pts, accent=(74, 124, 110, 255), width=10)
    for i, p in enumerate(pts[1:-1], start=1):
        draw.text((p[0], p[1] - 34), str(i), font=F_SMALL, fill=(255, 253, 247), anchor="mm")
    return save_asset("feature-route-guide.png", img)


def make_history():
    img = grade(cover(HISTORY / "era-tang.jpg"), warmth=(248, 222, 174, 30))
    draw = ImageDraw.Draw(img)
    draw_portal(draw, 572, 266)
    draw.line((104, 404, 658, 404), fill=(255, 246, 219, 120), width=4)
    for x in [154, 274, 394, 514, 634]:
        draw.ellipse((x - 10, 394, x + 10, 414), fill=(255, 246, 219, 210))
    return save_asset("feature-history.png", img)


def make_memory():
    img = grade(cover(HISTORY / "texture-paper.jpg"), warmth=(255, 236, 196, 20), dark=30)
    draw = ImageDraw.Draw(img)
    draw_journal(draw)
    photo1 = cover(ASSETS / "fangong.png", (178, 118)).rotate(-5, expand=True)
    photo2 = cover(ASSETS / "nine-dragon.png", (168, 112)).rotate(6, expand=True)
    paste_round(img, photo1, (408, 92), 12)
    paste_round(img, photo2, (456, 218), 12)
    return save_asset("feature-memory.png", img)


def contact_sheet(items):
    cell_w, cell_h = 336, 260
    pad = 26
    label_h = 44
    sheet = Image.new("RGB", (pad * 2 + cell_w * 2 + 22, pad * 2 + (cell_h + label_h + 24) * 4), (246, 238, 224))
    draw = ImageDraw.Draw(sheet)
    for i, (label, path) in enumerate(items):
        col, row = i % 2, i // 2
        x = pad + col * (cell_w + 22)
        y = pad + row * (cell_h + label_h + 24)
        thumb = cover(path, (cell_w, cell_h)).convert("RGB")
        mask = rounded_mask((cell_w, cell_h), 18)
        sheet.paste(thumb, (x, y), mask)
        draw.rounded_rectangle((x, y, x + cell_w, y + cell_h), 18, outline=(220, 202, 176), width=2)
        draw.text((x + cell_w / 2, y + cell_h + 26), label, font=F_LABEL, fill=(42, 37, 32), anchor="mm")
    sheet.save(SHEET, quality=94)


def main():
    items = [
        ("自由逛逛", make_free_explore()),
        ("小灵带路", make_guided_tour()),
        ("对话导览", make_chat()),
        ("景点探索", make_attractions()),
        ("景区导航", make_map()),
        ("路线导览", make_route()),
        ("时空穿越", make_history()),
        ("旅行记忆", make_memory()),
    ]
    contact_sheet(items)
    for label, path in items:
        print(f"{label}: {path}")
    print(f"contact: {SHEET}")


if __name__ == "__main__":
    main()
