"""
Demo: recolor texture_01.png (uniform) to Mid-Autumn Festival costume.
Maps dark uniform colors → gold/cream palette.
"""
from PIL import Image, ImageEnhance
import numpy as np

# Load original texture
src = Image.open("../haru_greeter_t03.2048/texture_01.png").convert("RGBA")
arr = np.array(src)

# Color mapping: dark uniform → Mid-Autumn gold theme
# The uniform is mainly dark gray/navy (#2a2d3a range)
# We want to shift it to warm gold/cream (#c8a951 range)

# Simple approach: for each pixel, if it's part of the clothing
# (not transparent, not white background), recolor it

r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]

# Detect clothing pixels: not transparent, not pure white background
is_clothing = (a > 10) & ~((r > 240) & (g > 240) & (b > 240))

# For clothing pixels, compute a "darkness" value
# Dark uniform pixels → map to gold spectrum
brightness = (r.astype(float) + g.astype(float) + b.astype(float)) / 3.0

# Target palette:
# Darkest areas → deep gold/brown (#8B7330)
# Mid areas → warm gold (#C8A951)
# Lightest areas → cream/ivory (#F0E6C0)

# Create new RGB channels
new_r = np.where(
    is_clothing,
    np.clip(139 + (brightness / 255.0) * (240 - 139), 0, 255).astype(np.uint8),
    r
)
new_g = np.where(
    is_clothing,
    np.clip(115 + (brightness / 255.0) * (230 - 115), 0, 255).astype(np.uint8),
    g
)
new_b = np.where(
    is_clothing,
    np.clip(48 + (brightness / 255.0) * (192 - 48), 0, 255).astype(np.uint8),
    b
)

# Preserve original alpha
arr[:,:,0] = new_r
arr[:,:,1] = new_g
arr[:,:,2] = new_b

# Add slight warm tint to the whole clothing area
warm = Image.fromarray(arr, "RGBA")

# Boost saturation slightly for richer gold
enhancer = ImageEnhance.Color(warm)
warm = enhancer.enhance(1.3)

# Boost contrast slightly
enhancer = ImageEnhance.Contrast(warm)
warm = enhancer.enhance(1.15)

# Save
warm.save("festival_midautumn_01.png", "PNG")
print("Done! Saved festival_midautumn_01.png")
print(f"Size: {warm.size}")
