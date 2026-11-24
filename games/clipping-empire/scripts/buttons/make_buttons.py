"""Generate the HUD button plates as exact vector art (SVG), then render them to transparent PNGs.

Style: simulator-shop slabs (thick ink outline, darker lip, top-lit gradient, diagonal stripes,
gloss band, white icon with an ink stroke) in a Vice-sunset palette (hot pink, teal, sunset orange,
violet, night indigo). Geometry comes from numbers only, so both sides of every plate are identical.
Text is NOT baked in: Roblox draws it (LuckiestGuy + ink UIStroke), so labels stay sharp and editable.

Usage: python -I scripts/buttons/make_buttons.py <out_dir>
Needs Chrome or Edge (headless) for rendering. Writes <name>.svg and <name>.png (2x scale).
"""
import math
import os
import shutil
import subprocess
import sys

INK = "#14071F"
TILT_DEG = 8
PALETTE = {
    # name: (top, bottom, lip, stripe opacity)
    "pink": ("#FF6BB5", "#E5137F", "#8C0A4D", 0.24),
    "teal": ("#5BF4E4", "#0DA5B8", "#075F6E", 0.24),
    "orange": ("#FFC65C", "#FF6E2A", "#9A3307", 0.24),
    "violet": ("#C989FF", "#7A2CF0", "#3B128C", 0.22),
    "night": ("#5B48A8", "#2B1D66", "#140B38", 0.18),
    "red": ("#FF7A7A", "#E5203A", "#86101F", 0.12),
}

# Icons drawn in a 100x100 box, white fill + ink stroke. Symmetric where the shape is symmetric.
ICONS = {
    "clapper": """
      <rect x="14" y="40" width="72" height="46" rx="8"/>
      <path d="M14 26 L82 14 L86 30 L18 42 Z"/>
      <path d="M44 52 L44 76 L64 64 Z" fill="{ink}" stroke="none"/>""",
    "upload": """
      <path d="M50 12 L80 44 L62 44 L62 66 L38 66 L38 44 L20 44 Z"/>
      <path d="M16 72 L16 86 L84 86 L84 72" fill="none" stroke-width="12"/>
      <path d="M16 72 L16 86 L84 86 L84 72" fill="none" stroke="#FFFFFF" stroke-width="5"/>""",
    "up": """
      <path d="M50 10 L86 48 L64 48 L64 88 L36 88 L36 48 L14 48 Z"/>""",
    "flame": """
      <path d="M50 8 C62 28 82 38 80 62 C78 80 66 92 50 92 C34 92 22 80 20 62 C18 46 30 38 34 24
               C40 34 42 40 46 42 C48 30 46 20 50 8 Z"/>
      <path d="M50 54 C58 62 64 68 62 76 C60 84 56 88 50 88 C44 88 40 84 38 76 C37 68 44 62 50 54 Z"
            fill="#FFC65C" stroke-width="5"/>""",
    "gear": """
      {teeth}
      <circle cx="50" cy="50" r="27"/>
      <circle cx="50" cy="50" r="11" fill="{ink}" stroke="none"/>""",
}


def mix(a, b, t):
    """Blend two #RRGGBB colours: t=0 gives a, t=1 gives b."""
    ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(ca, cb))


def gear_teeth():
    teeth = []
    for i in range(8):
        teeth.append(f'<rect x="42" y="8" width="16" height="22" rx="4" transform="rotate({i * 45} 50 50)"/>')
    return "\n".join(teeth)


def plate_svg(w, h, color, icon, icon_box, radius):
    """A slab: lip (offset down), body with gradient, stripes, shade, hard gloss, rim, icon with shadow."""
    top, bottom, lip, stripe = PALETTE[color]
    pad = 12  # outline room on every side
    depth = round(h * 0.12)  # lip height
    lean = math.tan(math.radians(TILT_DEG))  # reference cards lean forward ~8 degrees
    padx = pad + math.ceil(lean * h / 2)  # room for the lean on both sides
    bw, bh = w - 2 * padx, h - 2 * pad - depth
    stroke = max(8, round(h * 0.06))
    rim = max(3, round(stroke * 0.4))
    inner = max(2, radius - stroke)
    ix, iy, isz = icon_box
    icon_body = ICONS[icon].replace("{teeth}", gear_teeth()).replace("{ink}", INK)
    stripes_gap = round(bh / 3)  # one band = 1/6 of the face height, as in the reference
    icon_stroke = max(7, 8 * 100 / isz)
    shadow_dy = round(isz * 0.06)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{top}"/>
      <stop offset="1" stop-color="{bottom}"/>
    </linearGradient>
    <linearGradient id="lip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{lip}"/>
      <stop offset="1" stop-color="{mix(lip, INK, 0.35)}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{INK}" stop-opacity="0"/>
      <stop offset="1" stop-color="{INK}" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="iconfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E6DDFF"/>
    </linearGradient>
    <pattern id="stripes" width="{stripes_gap}" height="{stripes_gap}" patternUnits="userSpaceOnUse"
             patternTransform="rotate(-35)">
      <rect width="{stripes_gap / 2}" height="{stripes_gap}" fill="#FFFFFF" fill-opacity="{stripe}"/>
      <rect x="{stripes_gap / 2}" width="{stripes_gap / 2}" height="{stripes_gap}" fill="{INK}" fill-opacity="0.08"/>
    </pattern>
    <clipPath id="bodyclip"><rect x="{padx}" y="{pad}" width="{bw}" height="{bh}" rx="{radius}"/></clipPath>
  </defs>
  <g transform="translate({lean * h / 2:.3f} 0) skewX(-{TILT_DEG})">
  <rect x="{padx}" y="{pad + depth}" width="{bw}" height="{bh}" rx="{radius}"
        fill="url(#lip)" stroke="{INK}" stroke-width="{stroke}"/>
  <rect x="{padx}" y="{pad}" width="{bw}" height="{bh}" rx="{radius}" fill="url(#face)"/>
  <g clip-path="url(#bodyclip)">
    <rect x="{padx}" y="{pad}" width="{bw}" height="{bh}" fill="url(#stripes)"/>
    <rect x="{padx}" y="{pad + bh * 0.55}" width="{bw}" height="{bh * 0.45}" fill="url(#shade)"/>
    <rect x="{padx + stroke + rim}" y="{pad + stroke + rim}" width="{bw - 2 * (stroke + rim)}" height="{bh * 0.3}"
          rx="{max(2, inner - rim)}" fill="#FFFFFF" fill-opacity="0.32"/>
  </g>
  <rect x="{padx + stroke / 2 + rim / 2}" y="{pad + stroke / 2 + rim / 2}" width="{bw - stroke - rim}" height="{bh - stroke - rim}"
        rx="{max(2, radius - stroke / 2 - rim / 2)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="{rim}"/>
  <rect x="{padx}" y="{pad}" width="{bw}" height="{bh}" rx="{radius}"
        fill="none" stroke="{INK}" stroke-width="{stroke}"/>
  </g>
  <g transform="translate({ix} {iy + shadow_dy}) scale({isz / 100})" fill="{INK}" stroke="{INK}"
     stroke-width="{icon_stroke}" stroke-linejoin="round" stroke-linecap="round" opacity="0.35">
    {icon_body}
  </g>
  <g transform="translate({ix} {iy}) scale({isz / 100})" fill="url(#iconfill)" stroke="{INK}"
     stroke-width="{icon_stroke}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">
    {icon_body}
  </g>
</svg>"""


def mask_svg(w, h, radius):
    """White silhouette of the plate face only (no lip, no outline): the shine sweep is drawn through it."""
    pad = 12
    depth = round(h * 0.12)
    lean = math.tan(math.radians(TILT_DEG))
    padx = pad + math.ceil(lean * h / 2)
    bw, bh = w - 2 * padx, h - 2 * pad - depth
    stroke = max(8, round(h * 0.06))
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
  <g transform="translate({lean * h / 2:.3f} 0) skewX(-{TILT_DEG})">
    <rect x="{padx + stroke / 2}" y="{pad + stroke / 2}" width="{bw - stroke}" height="{bh - stroke}"
          rx="{max(2, radius - stroke / 2)}" fill="#FFFFFF"/>
  </g>
</svg>"""


# Masks share geometry with their plates: one per plate size.
MASKS = {"wideMask": (520, 200, 36), "launcherMask": (460, 200, 36)}


# name: (width, height, color, icon, icon box (x, y, size), corner radius)
# Wide buttons keep the icon on the left and leave the right ~65% for the Roblox label.
BUTTONS = {
    "clip": (520, 200, "pink", "clapper", (38, 30, 110), 36),
    "post": (520, 200, "teal", "upload", (38, 30, 110), 36),
    # Menu launchers: wide pills too, so three stack above a phone thumbstick with full-size labels.
    "upgrades": (460, 200, "orange", "up", (34, 30, 104), 36),
    "goViral": (460, 200, "violet", "flame", (34, 30, 104), 36),
    "settings": (460, 200, "night", "gear", (34, 30, 104), 36),
}


def find_browser():
    for p in (
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        shutil.which("chrome") or "",
    ):
        if p and os.path.exists(p):
            return p
    raise SystemExit("no Chrome or Edge found")


def render(browser, svg_path, png_path, w, h):
    html = svg_path[:-4] + ".html"
    with open(html, "w", encoding="utf-8") as f:
        f.write(f'<html><body style="margin:0;background:transparent">'
                f'<img src="{os.path.basename(svg_path)}" width="{w}" height="{h}"></body></html>')
    subprocess.run([
        browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--default-background-color=00000000", "--force-device-scale-factor=2",
        f"--window-size={w},{h}", f"--screenshot={png_path}", "file:///" + html.replace("\\", "/"),
    ], check=True, capture_output=True, timeout=60)
    os.remove(html)


if __name__ == "__main__":
    out = os.path.abspath(sys.argv[1])
    os.makedirs(out, exist_ok=True)
    browser = find_browser()
    for name, (w, h, color, icon, box, radius) in BUTTONS.items():
        svg = os.path.join(out, name + ".svg")
        with open(svg, "w", encoding="utf-8") as f:
            f.write(plate_svg(w, h, color, icon, box, radius))
        render(browser, svg, os.path.join(out, name + ".png"), w, h)
        print(name, w, h, round(w / h, 3))
    for name, (w, h, radius) in MASKS.items():
        svg = os.path.join(out, name + ".svg")
        with open(svg, "w", encoding="utf-8") as f:
            f.write(mask_svg(w, h, radius))
        render(browser, svg, os.path.join(out, name + ".png"), w, h)
        print(name, w, h, round(w / h, 3))
