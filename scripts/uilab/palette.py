"""UI Lab: dominant colours of a folder of images, plus one contact sheet agents can read in a single look.

Usage: python -I scripts/uilab/palette.py <image folder> <sheet.png> [max icons]
Prints JSON {"palette": [{"hex", "n"}], "sheet": <path or null>, "count": n}. Transparent pixels are ignored.
"""
import json
import os
import sys

from PIL import Image

EXT = ('.png', '.jpg', '.jpeg', '.webp', '.gif')


def images(folder):
    out = []
    for base, _, files in os.walk(folder):
        for f in sorted(files):
            if f.lower().endswith(EXT):
                out.append(os.path.join(base, f))
    return out


def palette(paths, k=12):
    counts = {}
    for p in paths[:400]:
        try:
            im = Image.open(p).convert('RGBA')
        except Exception:
            continue
        im.thumbnail((48, 48))
        px = im.tobytes()
        for i in range(0, len(px), 4):
            r, g, b, a = px[i], px[i + 1], px[i + 2], px[i + 3]
            if a < 128:
                continue
            key = (r // 24 * 24 + 12, g // 24 * 24 + 12, b // 24 * 24 + 12)  # bucket near colours together
            counts[key] = counts.get(key, 0) + 1
    top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:k]
    return [{'hex': '#%02x%02x%02x' % tuple(min(255, c) for c in rgb), 'n': n} for rgb, n in top]


def sheet(paths, out, cell=96, cols=12):
    if not paths:
        return None
    rows = (len(paths) + cols - 1) // cols
    canvas = Image.new('RGBA', (cols * cell, rows * cell), (24, 24, 28, 255))
    for i, p in enumerate(paths):
        try:
            im = Image.open(p).convert('RGBA')
        except Exception:
            continue
        im.thumbnail((cell - 8, cell - 8))
        x = (i % cols) * cell + (cell - im.width) // 2
        y = (i // cols) * cell + (cell - im.height) // 2
        canvas.alpha_composite(im, (x, y))
    canvas.convert('RGB').save(out, optimize=True)
    return out


def main():
    folder, out = sys.argv[1], sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 120
    paths = images(folder)
    print(json.dumps({'palette': palette(paths), 'sheet': sheet(paths[:limit], out), 'count': len(paths)}))


if __name__ == '__main__':
    main()
