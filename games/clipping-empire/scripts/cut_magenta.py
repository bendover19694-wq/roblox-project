"""Key out a pure magenta (#FF00FF) background from Antigravity art, crop and downsize for Roblox.

Usage: python -I scripts/cut_magenta.py <out_dir> <name>=<png> [<name>=<png> ...]
A flood fill from the border keys the background only. Alpha comes from the distance to magenta, so anti-aliased edges fade instead of leaving a pink fringe,
and the remaining pink tint on edge pixels is removed (despill). Max side 512 px.
"""
import os
import sys

from PIL import Image

MAX = 512


def cut(src, dst):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size

    def mag(x, y):
        r, g, b, _ = px[x, y]
        return min(r, b) - g  # magenta-ness: high red and blue, low green

    # Flood fill from the border through magenta-ish pixels only, so pinks inside the art survive.
    seen = bytearray(w * h)
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        m = mag(x, y)
        if m <= 40:
            continue  # an art pixel: the fill stops here
        r, g, b, _ = px[x, y]
        if m > 150:
            px[x, y] = (0, 0, 0, 0)
        else:
            k = (m - 40) / 110  # edge pixel: fade it and pull the magenta tint out (despill)
            px[x, y] = (int(r - (r - g) * k), g, int(b - (b - g) * k), int(255 * (1 - k)))
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                stack.append((nx, ny))
    box = im.getbbox()
    im = im.crop(box)
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    im.save(dst)
    return im.size


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for pair in sys.argv[2:]:
        name, src = pair.split("=", 1)
        size = cut(src, os.path.join(out, name + ".png"))
        print(name, size, round(size[0] / size[1], 3))
