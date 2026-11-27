"""Render a concept (HTML or SVG) to a PNG with the headless Chrome or Edge already on this PC.

Lets the designer make concept sheets, style sheets and UI mockups on the instant claude-cli lane, where no image tool exists:
write the concept as HTML or SVG under a concepts folder, then
  python scripts/render_concept.py <in.html|in.svg> <out.png> [width height]
Defaults to 1600 x 900. The output must be a .png inside assets/concepts/ or games/<slug>/assets/concepts/, so this script
can never write anywhere else. The page is opened from disk with no network fetches beyond what the file itself loads.
"""
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ALLOWED = re.compile(r'^(?:games/[a-z0-9-]+/)?assets/concepts/[\w./ -]+\.png$', re.I)


def browser():
    for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
              shutil.which('chrome') or '', shutil.which('msedge') or '', shutil.which('chromium') or ''):
        if p and os.path.exists(p):
            return p
    sys.exit('no Chrome or Edge found')


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    src, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
    w, h = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (1600, 900)
    rel = os.path.relpath(out, ROOT).replace('\\', '/')
    if '..' in rel.split('/') or not ALLOWED.match(rel):
        sys.exit(f'output must be a .png under assets/concepts/ or games/<slug>/assets/concepts/, not {rel}')
    if not os.path.isfile(src) or not src.lower().endswith(('.html', '.htm', '.svg')):
        sys.exit('input must be an existing .html or .svg file')
    if not (100 <= w <= 4096 and 100 <= h <= 4096):
        sys.exit('width and height must be 100 to 4096')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    page = src
    if src.lower().endswith('.svg'):  # wrap an SVG so it fills the frame
        page = src[:-4] + '.render.html'
        with open(page, 'w', encoding='utf-8') as f:
            f.write(f'<html><body style="margin:0"><img src="{os.path.basename(src)}" width="{w}" height="{h}"></body></html>')
    try:
        subprocess.run([browser(), '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                        f'--window-size={w},{h}', f'--screenshot={out}', 'file:///' + page.replace('\\', '/')],
                       check=True, capture_output=True, timeout=90)
    finally:
        if page != src and os.path.exists(page):
            os.remove(page)
    if not os.path.exists(out) or os.path.getsize(out) < 100:
        sys.exit('render failed: no image written')
    print(f'wrote {rel} ({w}x{h}, {os.path.getsize(out)} bytes)')


if __name__ == '__main__':
    main()
