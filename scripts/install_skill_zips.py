"""Install the LihFolk and 4ghouls skill packs from their downloaded zips, with the safety checks Agent HQ relies on.

Usage: python -I scripts/install_skill_zips.py [--from <folder>] [--dry-run]
  Looks in --from (default: ~/Downloads) for the known pack zips, refuses any archive with an unsafe path,
  an executable, a .blend file (Blender can run scripts inside it) or a nested archive, skips compiled .pyc files,
  then copies each skill folder into ~/.claude/skills (an existing folder is renamed to <name>.bak first).
  The FOLK Icon Pack goes to ~/Documents/LihFolk-Packs/FOLK Icon Pack. Nothing is executed.
"""
import argparse
import fnmatch
import os
import shutil
import sys
import tempfile
import zipfile

HOME = os.path.expanduser('~')
SKILLS = os.path.join(HOME, '.claude', 'skills')
ICONS = os.path.join(HOME, 'Documents', 'LihFolk-Packs', 'FOLK Icon Pack')
# zip name pattern -> skill folders inside it (top-level folder names)
PACKS = [
    ('4ghouls-prompter*.zip', ['4ghouls-prompter', 'watch-video']),
    ('folk-stud-ui*.skill', ['folk-stud-ui']),
    ('LihFolk-Stud-Voxel-Pack-Full*.zip', ['lihfolk-stud-voxel']),
    ('Folk Stud-Voxel Model Skill*.zip', ['lihfolk-stud-voxel']),
    ('folk map generation*.zip', ['roblox-map-builder']),
]
ICON_PACK = 'FOLK Icon Pack*.zip'
BLOCKED = ('.exe', '.dll', '.bat', '.cmd', '.vbs', '.js', '.msi', '.scr', '.lnk', '.jar', '.hta', '.com', '.so', '.dylib',
           '.reg', '.psm1', '.blend', '.zip', '.7z', '.rar', '.skill')


def check(zpath):
    """Raise SystemExit when the archive is unsafe. Returns the member list."""
    with zipfile.ZipFile(zpath) as zf:
        members = zf.infolist()
    total = 0
    for m in members:
        name = m.filename.replace(chr(92), '/')
        parts = name.split('/')
        if name.startswith('/') or '..' in parts or ':' in name:
            raise SystemExit(f'REFUSED {os.path.basename(zpath)}: unsafe path {m.filename}')
        ext = os.path.splitext(name)[1].lower()
        if ext in BLOCKED:
            raise SystemExit(f'REFUSED {os.path.basename(zpath)}: {ext} file {m.filename}')
        total += m.file_size
    if total > 1_000_000_000:
        raise SystemExit(f'REFUSED {os.path.basename(zpath)}: unpacks to over 1 GB')
    return members


def extract(zpath, dest):
    with zipfile.ZipFile(zpath) as zf:
        for m in zf.infolist():
            if m.filename.endswith('.pyc') or '__pycache__' in m.filename:
                continue  # bytecode cannot be reviewed; Python rebuilds it from the source
            target = os.path.realpath(os.path.join(dest, m.filename))
            if not target.startswith(os.path.realpath(dest) + os.sep):
                raise SystemExit(f'REFUSED: {m.filename} escapes the folder')
            zf.extract(m, dest)


def newest(folder, pattern):
    hits = [f for f in os.listdir(folder) if fnmatch.fnmatch(f, pattern)]
    hits.sort(key=lambda f: os.path.getmtime(os.path.join(folder, f)), reverse=True)
    return os.path.join(folder, hits[0]) if hits else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='src', default=os.path.join(HOME, 'Downloads'))
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    done = set()
    os.makedirs(SKILLS, exist_ok=True)
    for pattern, skills in PACKS:
        if all(s in done for s in skills):
            continue
        z = newest(a.src, pattern)
        if not z:
            print(f'skip   {pattern}: not found in {a.src}')
            continue
        check(z)
        tmp = tempfile.mkdtemp(prefix='hq-skill-')
        try:
            extract(z, tmp)
            for s in skills:
                src = os.path.join(tmp, s)
                if not os.path.isfile(os.path.join(src, 'SKILL.md')):
                    raise SystemExit(f'REFUSED {os.path.basename(z)}: no {s}/SKILL.md')
                dst = os.path.join(SKILLS, s)
                if a.dry_run:
                    print(f'would install {s} from {os.path.basename(z)}')
                    done.add(s)
                    continue
                if os.path.exists(dst):
                    bak = dst + '.bak'
                    shutil.rmtree(bak, ignore_errors=True)
                    os.replace(dst, bak)
                shutil.copytree(src, dst)
                done.add(s)
                print(f'ok     {s} <- {os.path.basename(z)}')
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    z = newest(a.src, ICON_PACK)
    if z and not a.dry_run:
        check(z)
        if not os.path.isdir(ICONS):
            os.makedirs(ICONS)
            extract(z, ICONS)
        print(f'ok     FOLK Icon Pack -> {ICONS}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
