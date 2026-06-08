#!/usr/bin/env python3
"""
Batch-generate Live2D costume textures via Qwen-Image-Edit.
Input: original texture + clothing description → output: edited texture.
Uses Alibaba Cloud DashScope API (domestic, no proxy needed).
"""

import os
import sys
import base64
import io
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("pip install Pillow")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────
QWEN_API_KEY = os.environ.get("QWEN_API_KEY", "")
# OpenAI-compatible endpoint (supports base64 data URIs in input field)
QWEN_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/images/edits"
QWEN_MODEL = "qwen-image-edit"
QWEN_SIZE = "1024x1024"

MODEL_DIR = Path(__file__).resolve().parent.parent / "public" / "models" / "haru"
ORIGINAL_TEXTURE_00 = MODEL_DIR / "haru_greeter_t03.2048" / "texture_00.png"
ORIGINAL_TEXTURE_01 = MODEL_DIR / "haru_greeter_t03.2048" / "texture_01.png"
OUTPUT_DIR = MODEL_DIR / "textures"

# ── Costume definitions ───────────────────────────────────────────────────
COSTUMES = [
    {"id": "daily_classic", "prompt": "Replace the clothing with a simple white and light gray hanfu robe, zen minimalist style, clean lines", "desc_cn": "素雅禅衣"},
    {"id": "daily_modern", "prompt": "Replace the clothing with a modern Chinese qipao-inspired outfit, contemporary cut, soft pink and blue accents", "desc_cn": "新中式便装"},
    {"id": "daily_artistic", "prompt": "Replace the clothing with an ink-wash painting style flowing robe, black and gray tones, artistic brush-stroke patterns", "desc_cn": "水墨雅服"},
    {"id": "festival_spring", "prompt": "Replace the clothing with a luxurious red silk hanfu, gold thread embroidery, Chinese New Year celebration style with phoenix patterns", "desc_cn": "锦绣红袍"},
    {"id": "festival_lantern", "prompt": "Replace the clothing with a warm orange and gold outfit with colorful lantern motifs, Lantern Festival celebration style", "desc_cn": "灯彩华裳"},
    {"id": "festival_qingming", "prompt": "Replace the clothing with a fresh spring-green flowing outfit with subtle floral patterns, light airy fabric", "desc_cn": "踏青轻衣"},
    {"id": "festival_dragon", "prompt": "Replace the clothing with a blue and white outfit with dragon boat racing motifs and wave patterns", "desc_cn": "龙舟竞渡"},
    {"id": "festival_midautumn", "prompt": "Replace the clothing with an elegant golden and ivory outfit, osmanthus flower and moon motifs, Mid-Autumn Festival style", "desc_cn": "月华裳"},
    {"id": "festival_national", "prompt": "Replace the clothing with a grand ceremonial Chinese red and gold outfit, National Day celebration, ornate dragon and cloud patterns", "desc_cn": "锦绣华章"},
]


def load_image_b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


def generate_qwen(original_b64: str, prompt: str, max_retries: int = 3) -> bytes | None:
    """Generate texture via Qwen-Image-Edit (OpenAI-compatible endpoint)."""
    # OpenAI-compatible format - no proxy needed (domestic API)
    payload = {
        "model": QWEN_MODEL,
        "prompt": prompt,
        "image": f"data:image/png;base64,{original_b64}",
        "size": QWEN_SIZE,
        "n": 1,
        "response_format": "b64_json",
    }

    headers = {
        "Authorization": f"Bearer {QWEN_API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(max_retries):
        try:
            resp = requests.post(
                QWEN_URL, json=payload, headers=headers,
                timeout=120, proxies={},  # Force no proxy for domestic API
            )

            if resp.status_code != 200:
                print(f"    [ERROR] HTTP {resp.status_code}: {resp.text[:300]}")
                return None

            data = resp.json()
            images = data.get("data", [])
            if images:
                img_data = images[0]
                if "b64_json" in img_data:
                    return base64.b64decode(img_data["b64_json"])
                url = img_data.get("url", "")
                if url:
                    img_resp = requests.get(url, timeout=60)
                    return img_resp.content

            print(f"    [WARN] No image in response: {str(data)[:200]}")
            return None

        except Exception as e:
            print(f"    [ERROR] {e}")
            time.sleep(10)
            continue

    print(f"    [GAVE UP] after {max_retries} retries")
    return None


def resize_to_2048(img_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(img_bytes))
    if img.size != (2048, 2048):
        img = img.resize((2048, 2048), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def main():
    if not QWEN_API_KEY:
        print("Set QWEN_API_KEY environment variable.")
        sys.exit(1)

    if not ORIGINAL_TEXTURE_00.exists():
        print(f"Original texture not found: {ORIGINAL_TEXTURE_00}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Backend: Qwen-Image-Edit (DashScope)")
    print(f"Loading original textures...")
    tex00_b64 = load_image_b64(ORIGINAL_TEXTURE_00)
    tex01_b64 = load_image_b64(ORIGINAL_TEXTURE_01)

    todo = []
    for c in COSTUMES:
        out00 = OUTPUT_DIR / f"{c['id']}_00.png"
        out01 = OUTPUT_DIR / f"{c['id']}_01.png"
        if out00.exists() and out01.exists():
            print(f"  [SKIP] {c['id']} ({c['desc_cn']})")
        else:
            todo.append(c)

    if not todo:
        print("\nAll costumes already generated!")
        return

    print(f"\nGenerating {len(todo)} costumes...\n")

    for i, costume in enumerate(todo):
        cid = costume["id"]
        prompt_text = costume["prompt"]
        cn = costume["desc_cn"]
        print(f"[{i+1}/{len(todo)}] {cid} — {cn}")

        for idx, tex_b64 in enumerate([tex00_b64, tex01_b64]):
            out_path = OUTPUT_DIR / f"{cid}_{idx:02d}.png"
            print(f"  Generating texture_{idx:02d}...")
            result = generate_qwen(tex_b64, prompt_text)
            if result:
                result = resize_to_2048(result)
                out_path.write_bytes(result)
                print(f"  OK texture_{idx:02d} ({len(result)} bytes)")
            else:
                print(f"  FAIL texture_{idx:02d}")
                break
            time.sleep(2)

        time.sleep(3)

    print("\nDone!")


if __name__ == "__main__":
    main()
