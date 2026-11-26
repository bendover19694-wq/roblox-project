"""UI Lab: cut every button, panel and icon out of a screenshot of a game UI (any game, any engine).

Usage: python -I scripts/uilab/shot_icons.py <screenshot> <out folder> <prefix> [png copy of the screenshot]
Prints JSON {"items": [{"file", "kind", "box": [x, y, w, h]}], "width", "height"}.
kind is "element" (a button, panel or badge found on the background) or "icon" (a shape inside an element).
Needs Pillow, numpy and scipy (pip install pillow numpy scipy). The screenshot is only read, never run.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

MAX_SIDE = 2400
MAX_ITEMS = 1500
THRESH = int(os.environ.get('UILAB_EDGE', '200'))  # soft cloud and glow edges stay under it; UI strokes are crisp


def edges(rgb, thresh):
    """Strong colour edges. Smooth skies and gradients stay below the threshold; outlines and shapes do not."""
    a = ndimage.gaussian_filter(rgb.astype(np.float32), sigma=(1, 1, 0))
    mag = np.zeros(a.shape[:2], np.float32)
    for c in range(3):
        mag = np.maximum(mag, np.hypot(ndimage.sobel(a[..., c], 0), ndimage.sobel(a[..., c], 1)))
    return mag > thresh


def regions(mask, grow, min_side, max_w, max_h, max_aspect):
    m = ndimage.binary_dilation(mask, iterations=grow) if grow else mask
    m = ndimage.binary_fill_holes(m)
    lab, _ = ndimage.label(m)
    out = []
    for sl in ndimage.find_objects(lab):
        if sl is None:
            continue
        y, x = sl[0].start, sl[1].start
        h, w = sl[0].stop - y, sl[1].stop - x
        if min(w, h) < min_side or w > max_w or h > max_h or max(w, h) / max(1, min(w, h)) > max_aspect:
            continue
        g = min(grow, (w - 1) // 2, (h - 1) // 2)  # dilation grew the region by grow px on each side
        out.append([x + g, y + g, w - 2 * g, h - 2 * g])
    return out


def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[0] + a[2], b[0] + b[2]), min(a[1] + a[3], b[1] + b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    return inter / float(a[2] * a[3] + b[2] * b[3] - inter or 1)


def find(rgb):
    H, W = rgb.shape[:2]
    found = []
    # pass 1: elements on the background, at two merge sizes so a button and its badge are found both together and apart
    for grow in (2, 6):
        for b in regions(edges(rgb, THRESH), grow, 14, W * 0.7, H * 0.7, 8):
            found.append(('element', b))
    # pass 2: shapes inside each element (the icon on a button, a coin in a counter). Words are wide and short: dropped.
    for _, (x, y, w, h) in list(found):
        if min(w, h) < 40:
            continue
        sub = rgb[y:y + h, x:x + w]
        dark = sub.astype(np.int16).sum(axis=2) < 200  # cartoon icons are drawn with dark outlines
        m = max(3, int(min(w, h) * 0.07))  # drop the element's own outline, or filling holes swallows the whole element
        for e, grow in ((dark, 2), (edges(sub, 140), 1)):
            e[:m], e[-m:], e[:, :m], e[:, -m:] = False, False, False, False
            for bx, by, bw, bh in regions(e, grow, max(12, int(min(w, h) * 0.3)), w * 0.92, h * 0.92, 2.2):
                found.append(('icon', [x + bx, y + by, bw, bh]))
    kept = []
    for kind, b in sorted(found, key=lambda kb: -kb[1][2] * kb[1][3]):
        if not any(iou(b, k[1]) > (0.6 if k[0] == kind else 0.9) for k in kept):  # an icon may fill most of its button
            kept.append((kind, b))
    kept.sort(key=lambda kb: (kb[1][1] // 40, kb[1][0]))  # reading order: rows, then left to right
    return kept[:MAX_ITEMS]


def main():
    src, out, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
    im = Image.open(src)
    im.seek(0)  # first frame of a gif
    im = im.convert('RGBA')
    if len(sys.argv) > 4:
        im.save(sys.argv[4])
    scale = min(1.0, MAX_SIDE / max(im.size))
    work = im.resize((int(im.width * scale), int(im.height * scale))) if scale < 1 else im
    rgb = np.asarray(work.convert('RGB'))
    os.makedirs(out, exist_ok=True)
    items = []
    for i, (kind, (x, y, w, h)) in enumerate(find(rgb)):
        pad = 3
        box = [int(v / scale) for v in (max(0, x - pad), max(0, y - pad), w + 2 * pad, h + 2 * pad)]
        name = '%s-%s-%04d.png' % (prefix, 'el' if kind == 'element' else 'ic', i)
        im.crop((box[0], box[1], box[0] + box[2], box[1] + box[3])).save(os.path.join(out, name))
        items.append({'file': name, 'kind': kind, 'box': box})
    print(json.dumps({'items': items, 'width': im.width, 'height': im.height}))


if __name__ == '__main__':
    main()
