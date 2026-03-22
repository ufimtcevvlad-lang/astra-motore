#!/usr/bin/env python3
"""
Собирает public/brand/astra-mark.png из полного макета (шестерня + AM, без текста «ASTRA MOTORS»).
Цвета как у Tailwind amber-400 (#fbbf24) и кнопок «Найти».

Запуск: python3 scripts/build-astra-mark.py [путь-к-исходнику.png]
Требуется: pip install Pillow
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC_DEFAULT = ROOT / "public/brand/logo-options/logo-option-01-classic-gear.png"
OUT = ROOT / "public/brand/astra-mark.png"

# Tailwind-стиль (как bg-amber-400 / кнопки)
AMBER_300 = (253, 224, 71)  # #fcd34d
AMBER_400 = (251, 191, 36)  # #fbbf24
AMBER_500 = (245, 158, 11)  # #f59e0b
AMBER_600 = (217, 119, 6)  # #d97706
RED_500 = (239, 68, 68)  # #ef4444


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _lerp_rgb(
    c1: tuple[int, int, int], c2: tuple[int, int, int], t: float
) -> tuple[int, int, int]:
    return (
        int(_lerp(c1[0], c2[0], t)),
        int(_lerp(c1[1], c2[1], t)),
        int(_lerp(c1[2], c2[2], t)),
    )


def tint(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 20:
        return (0, 0, 0, 0)
    if r + g + b < 42:
        return (0, 0, 0, 0)
    # красный ромб на «M»
    if r > 180 and g < 115 and b < 115 and r > g + 35:
        return (*RED_500, a)

    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    # светлые участки → ближе к amber-300/400, тени → amber-500/600
    if lum > 0.78:
        t = (lum - 0.78) / 0.22
        rgb = _lerp_rgb(AMBER_400, AMBER_300, min(1.0, max(0.0, t)))
    elif lum > 0.42:
        t = (lum - 0.42) / 0.36
        rgb = _lerp_rgb(AMBER_500, AMBER_400, min(1.0, max(0.0, t)))
    else:
        t = lum / 0.42 if lum > 0 else 0
        rgb = _lerp_rgb(AMBER_600, AMBER_500, min(1.0, max(0.0, t)))

    return (*rgb, a)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC_DEFAULT
    if not src.is_file():
        print(f"Нет файла: {src}", file=sys.stderr)
        sys.exit(1)

    im = Image.open(src).convert("RGBA")
    w, h = im.size
    upper = im.crop((0, 0, w, int(h * 0.52)))
    px = upper.load()
    minx, miny = upper.width, upper.height
    maxx, maxy = 0, 0
    for y in range(upper.height):
        for x in range(upper.width):
            r, g, b, a = px[x, y]
            if r + g + b > 100:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)

    cx, cy = (minx + maxx) // 2, (miny + maxy) // 2
    side = max(maxx - minx, maxy - miny) + 56  # запас, чтобы не резало круг
    left = max(0, cx - side // 2)
    top = max(0, cy - side // 2)
    if left + side > upper.width:
        left = upper.width - side
    if top + side > upper.height:
        top = upper.height - side

    square = upper.crop((left, top, left + side, top + side))
    sq = square.copy()
    sp = sq.load()
    for y in range(sq.height):
        for x in range(sq.width):
            r, g, b, a = sp[x, y]
            sp[x, y] = tint(r, g, b, a)

    out_sz = 2048
    out_img = sq.resize((out_sz, out_sz), Image.Resampling.LANCZOS)
    # Лёгкая резкость после масштаба (мягко, без ореолов)
    out_img = out_img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out_img.save(OUT, "PNG", optimize=True)
    print(f"OK → {OUT} ({out_sz}×{out_sz})")


if __name__ == "__main__":
    main()
