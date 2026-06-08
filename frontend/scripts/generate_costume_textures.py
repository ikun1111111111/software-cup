#!/usr/bin/env python3
"""
Generate costume texture variants from original haru textures.
Applies PIL color transforms while preserving pixel layout for Live2D bone mapping.
"""
import sys
from pathlib import Path

try:
    from PIL import Image, ImageEnhance, ImageOps
except ImportError:
    print("pip install Pillow")
    sys.exit(1)

MODEL_DIR = Path(__file__).resolve().parent.parent / "public" / "models" / "haru"
TEX_DIR = MODEL_DIR / "haru_greeter_t03.2048"
OUT_DIR = MODEL_DIR / "textures"

COSTUMES = [
    ("daily_classic", "素雅禅衣", {
        "hue": 0, "sat": 0.3, "bri": 1.25, "con": 0.9,
    }),
    ("daily_modern", "新中式便装", {
        "hue": -25, "sat": 1.3, "bri": 1.05, "con": 1.0,
    }),
    ("daily_artistic", "水墨雅服", {
        "hue": 0, "sat": 0.1, "bri": 1.05, "con": 1.25,
    }),
    ("festival_spring", "锦绣红袍", {
        "hue": -40, "sat": 1.8, "bri": 1.0, "con": 1.05,
    }),
    ("festival_lantern", "灯彩华裳", {
        "hue": -20, "sat": 1.6, "bri": 1.1, "con": 1.0,
    }),
    ("festival_qingming", "踏青轻衣", {
        "hue": 65, "sat": 1.1, "bri": 1.1, "con": 1.0,
    }),
    ("festival_dragon", "龙舟竞渡", {
        "hue": 160, "sat": 1.0, "bri": 1.1, "con": 1.1,
    }),
    ("festival_midautumn", "月华裳", {
        "hue": 25, "sat": 1.3, "bri": 1.12, "con": 0.95,
    }),
    ("festival_national", "锦绣华章", {
        "hue": -30, "sat": 1.8, "bri": 1.05, "con": 1.1,
    }),
]


def hue_shift(img: Image.Image, degrees: float) -> Image.Image:
    """Rotate hue by converting to HSV, shifting H, converting back."""
    if degrees == 0:
        return img
    hsv = img.convert("HSV")
    h, s, v = hsv.split()
    h_data = h.point(lambda p: (p + int(degrees * 255 / 360)) % 256)
    return Image.merge("HSV", (h_data, s, v)).convert("RGB")


def process_texture(src: Path, dst: Path, params: dict) -> None:
    img = Image.open(src).convert("RGB")

    img = hue_shift(img, params["hue"])

    if params["sat"] != 1.0:
        img = ImageEnhance.Color(img).enhance(params["sat"])
    if params["bri"] != 1.0:
        img = ImageEnhance.Brightness(img).enhance(params["bri"])
    if params["con"] != 1.0:
        img = ImageEnhance.Contrast(img).enhance(params["con"])

    dst.write_bytes(b"")
    img.save(str(dst), "PNG")


def main():
    if not TEX_DIR.exists():
        print(f"Original textures not found: {TEX_DIR}")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    tex00 = TEX_DIR / "texture_00.png"
    tex01 = TEX_DIR / "texture_01.png"

    for tex_path in (tex00, tex01):
        if not tex_path.exists():
            print(f"Missing: {tex_path}")
            sys.exit(1)

    for cid, cname, params in COSTUMES:
        out00 = OUT_DIR / f"{cid}_00.png"
        out01 = OUT_DIR / f"{cid}_01.png"

        if out00.exists() and out01.exists():
            print(f"  SKIP {cid} ({cname}) — already exists")
            continue

        print(f"  {cid} ({cname})...")
        process_texture(tex00, out00, params)
        process_texture(tex01, out01, params)
        sz00 = out00.stat().st_size
        sz01 = out01.stat().st_size
        print(f"    OK  _00: {sz00:,} bytes  _01: {sz01:,} bytes")

    print("\nDone! All costume textures generated.")


if __name__ == "__main__":
    main()
