#!/usr/bin/env python3
"""
Собирает public/brand/astra-mark.png из полного макета (шестерня + AM, без текста «ASTRA MOTORS»).
Источник по умолчанию: public/brand/logo-options/logo-option-01-classic-gear.png

Запуск: python3 scripts/build-astra-mark.py
Требуется: pip install Pillow
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DEFAULT = ROOT / "public/brand/logo-options/logo-option-01-classic-gear.png"
OUT = ROOT / "public/brand/astra-mark.png"


def tint(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 20:
        return (0, 0, 0, 0)
    if r + g + b < 45:
        return (0, 0, 0, 0)
    if r > 170 and g < 120 and b < 120 and r > g + 40:
        return (239, 68, 68, a)
    t = (r + g + b) / 765
    ar = int(253 * 0.65 + 251 * 0.35 * t)
    ag = int(224 * 0.65 + 191 * 0.35 * t)
    ab = int(71 * 0.65 + 36 * 0.35 * t)
    return (min(255, ar), min(255, ag), min(255, ab), a)


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
    side = max(maxx - minx, maxy - miny) + 36
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

    out_sz = 1024
    out_img = sq.resize((out_sz, out_sz), Image.Resampling.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out_img.save(OUT, "PNG", optimize=True)
    print(f"OK → {OUT} ({out_sz}×{out_sz})")


if __name__ == "__main__":
    main()
