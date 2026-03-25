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

    # красный ромб на «M»
    if r > 150 and g < 130 and b < 150 and r > g + 35 and r > b + 15:
        return (*RED_500, a)

    # luminance для разделения "светлые" (заливка) и "тёмные" (обводка)
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    # тёмные участки оставляем тёмными, как в стилистике сайта
    if lum < 0.28:
        # слегка осветляем тени, чтобы обводка не "проваливалась"
        return (2, 6, 23, a)

    # заливка под amber-400/300/600
    if lum > 0.72:
        # ближе к amber-300 (свет)
        t = (lum - 0.72) / 0.28
        rgb = _lerp_rgb(AMBER_400, AMBER_300, min(1.0, max(0.0, t)))
    elif lum > 0.42:
        # amber-500 -> amber-400 (середина)
        t = (lum - 0.42) / 0.30
        rgb = _lerp_rgb(AMBER_500, AMBER_400, min(1.0, max(0.0, t)))
    else:
        # более тёмные части -> amber-600 (тени заливки)
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

    # Берём верхнюю часть, но bbox будем искать по разнице с "фоном".
    # Это надёжнее, чем пороги по яркости.
    upper = im.crop((0, 0, w, int(h * 0.70)))
    px = upper.load()
    bg_r, bg_g, bg_b, _ = px[10, 10]

    def color_dist(xr: int, xg: int, xb: int) -> int:
        dr = xr - bg_r
        dg = xg - bg_g
        db = xb - bg_b
        return dr * dr + dg * dg + db * db

    # порог "отличается от фона": чем меньше порог — тем больше пикселей считается частью знака
    BG_DIST_THR = 650

    minx, miny = upper.width, upper.height
    maxx, maxy = 0, 0
    found = False

    for y in range(upper.height):
        for x in range(upper.width):
            r, g, b, a = px[x, y]
            if a < 20:
                continue
            if color_dist(r, g, b) < BG_DIST_THR:
                # почти фон => не считаем частью знака
                continue
            found = True
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)

    if not found:
        raise RuntimeError("Не удалось выделить логомарк: bbox пустой")

    # Квадрат с безопасными полями.
    # Важно: не "прижимать" кроп к краям (clamp), а делать кроп в прозрачный canvas,
    # чтобы знак оставался по центру и не уезжал вверх/вниз.
    cx, cy = (minx + maxx) // 2, (miny + maxy) // 2
    bbox_w, bbox_h = maxx - minx + 1, maxy - miny + 1
    base_side = max(bbox_w, bbox_h)
    safe = int(base_side * 0.22)  # запас ~22% по требованию "без обрезания"
    side = base_side + safe * 2

    desired_left = cx - side // 2
    desired_top = cy - side // 2

    src_left = max(0, desired_left)
    src_top = max(0, desired_top)
    src_right = min(upper.width, desired_left + side)
    src_bottom = min(upper.height, desired_top + side)

    dest_left = src_left - desired_left
    dest_top = src_top - desired_top

    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    crop_region = upper.crop((src_left, src_top, src_right, src_bottom))
    canvas.paste(crop_region, (dest_left, dest_top), crop_region)

    sq = canvas.copy()
    sp = sq.load()

    # Реколор + маска прозрачности через фон
    for y in range(sq.height):
        for x in range(sq.width):
            r, g, b, a = sp[x, y]
            if a < 20:
                sp[x, y] = (0, 0, 0, 0)
                continue
            if color_dist(r, g, b) < BG_DIST_THR:
                sp[x, y] = (0, 0, 0, 0)
                continue
            sp[x, y] = tint(r, g, b, a)

    out_sz = 2048
    # Дополнительный безопасный отступ: знак уменьшаем внутри большого прозрачного канваса.
    # Это гарантирует, что даже при антиалиас/ореоле альфа не дойдёт до краёв.
    inner_ratio = 0.82
    inner_side = int(out_sz * inner_ratio)
    resized = sq.resize((inner_side, inner_side), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (out_sz, out_sz), (0, 0, 0, 0))
    ox = (out_sz - inner_side) // 2
    oy = (out_sz - inner_side) // 2
    canvas.paste(resized, (ox, oy), resized)

    out_img = canvas.filter(ImageFilter.UnsharpMask(radius=1.0, percent=115, threshold=2))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out_img.save(OUT, "PNG", optimize=True)
    print(f"OK → {OUT} ({out_sz}×{out_sz})")


if __name__ == "__main__":
    main()
