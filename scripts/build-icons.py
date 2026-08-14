#!/usr/bin/env python3
"""
Regenerates the app icon set from assets/logo-no-txt.png.

Run after replacing the source mark:  python3 scripts/build-icons.py

Sizing rules, per platform guidance:
  - iOS home-screen icon must be fully opaque (Apple rejects alpha), so the
    mark is composited onto a solid background.
  - Android adaptive foregrounds are masked to a circle of 66% of the canvas
    (72dp of 108dp), so the mark stays well inside that to survive any mask.
  - The monochrome layer is a flat silhouette; Android 13+ applies its own tint.
"""
from PIL import Image
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'

# The mark is multicolour and includes a teal petal, so it needs a light ground —
# on --surface-anchor that petal would disappear. This is --surface-paper.
PAPER = (255, 255, 255, 255)

src = Image.open(ASSETS / 'logo-no-txt.png').convert('RGBA')
mark = src.crop(src.getbbox())  # trim the transparent margin so insets are exact
print(f'source mark trimmed to {mark.size[0]}x{mark.size[1]}')


def scaled(fraction: float, size: int) -> Image.Image:
    """The mark, resized so its longest edge is `fraction` of a `size` canvas."""
    target = size * fraction
    w, h = mark.size
    k = target / max(w, h)
    return mark.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)


def compose(size: int, fraction: float, bg=None, tint=None) -> Image.Image:
    layer = scaled(fraction, size)
    if tint:  # flatten to a single colour, keeping only the shape
        solid = Image.new('RGBA', layer.size, tint)
        solid.putalpha(layer.getchannel('A'))
        layer = solid
    canvas = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(layer, ((size - layer.width) // 2, (size - layer.height) // 2))
    return canvas


def save(img: Image.Image, name: str, opaque: bool = False) -> None:
    path = ASSETS / name
    (img.convert('RGB') if opaque else img).save(path, 'PNG')
    print(f'  {name:34} {img.size[0]}x{img.size[1]}{"  (opaque)" if opaque else ""}')


print('writing:')
# iOS + fallback icon: opaque, generous margin for the rounded-rect mask.
save(compose(1024, 0.66, bg=PAPER), 'icon.png', opaque=True)

# Android adaptive layers: transparent, inside the 66% safe circle.
save(compose(1024, 0.54), 'adaptive-icon.png')
save(compose(1024, 0.54, tint=(0, 0, 0, 255)), 'adaptive-icon-monochrome.png')

# Splash: sits on the --surface-page fill set in app.json, so keep the mark small.
save(compose(1024, 0.40), 'splash-icon.png')

# Web favicon.
save(compose(48, 0.92), 'favicon.png')
