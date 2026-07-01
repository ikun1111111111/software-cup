from pathlib import Path
from PIL import Image


ROOT = Path(r"E:\03_Projects\software-cup")
ASSET_DIR = ROOT / "software" / "mobile" / "assets" / "images" / "memory"

TARGETS = {
    "memory-capsule-letter.png": (360, 480),
    "memory-chat-guide.png": (640, 430),
    "memory-map-xuanzang.png": (640, 427),
    "memory-photo-buddha.png": (512, 512),
    "memory-route-overview.png": (640, 357),
    "memory-seal-tang.png": (256, 256),
    "memory-share-poem.png": (360, 480),
    "memory-write-scroll.png": (360, 480),
}


def resize_contain(image: Image.Image, target: tuple[int, int]) -> Image.Image:
    image = image.convert("RGBA")
    image.thumbnail(target, Image.Resampling.LANCZOS)
    return image


def main():
    for filename, target in TARGETS.items():
        path = ASSET_DIR / filename
        image = Image.open(path)
        resized = resize_contain(image, target)
        resized.save(path, optimize=True)
        print(f"{filename}: {image.width}x{image.height} -> {resized.width}x{resized.height}, {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
