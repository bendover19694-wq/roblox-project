"""The one way Agent HQ agents start Blender or a creative skill's script (roles.json allows `python scripts/*` only).

  python scripts/creative_run.py blender <script.py> [args...]      headless Blender runs the script; args go after --
  python scripts/creative_run.py skill <skill> <script.py> [args...]   plain Python runs a script that ships with the skill
  python scripts/creative_run.py where                                 prints the Blender and skill folders it would use

Scripts must live inside an installed creative skill (roblox-map-builder, lihfolk-stud-voxel, watch-video, folk-stud-ui)
or under assets/world/ or games/<slug>/assets/world/ (the world role's own folders, where it writes build scripts). Every run is logged with a hash. Blender is refused
when Agent HQ set HQ_BLENDER=0 (the owner turned "Allow Blender" off, or the task came from a partner). No shell is used.
"""
import glob
import os
import subprocess
import sys

HOME = os.path.expanduser('~')
SKILLS = os.path.join(HOME, '.claude', 'skills')
SKILL_NAMES = ('roblox-map-builder', 'lihfolk-stud-voxel', 'watch-video', 'folk-stud-ui')
REPO = os.path.realpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TIMEOUT = 45 * 60


def blender_exe():
    exe = os.environ.get('BLENDER_EXE')
    if exe and os.path.isfile(exe):
        return exe
    base = os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), 'Blender Foundation')
    found = sorted(glob.glob(os.path.join(base, 'Blender*', 'blender.exe')), reverse=True)
    return found[0] if found else None


def roots():
    out = [os.path.realpath(os.path.join(SKILLS, s)) for s in SKILL_NAMES]
    # agent-written build scripts: only the world folders (the world role's own files), never the whole repo
    out.append(os.path.realpath(os.path.join(REPO, 'assets', 'world')))
    out += [os.path.realpath(p) for p in glob.glob(os.path.join(REPO, 'games', '*', 'assets', 'world'))]
    return out


def audit(kind, script):
    """One line per run in .agent-hq/logs/creative_run.log (time, task, kind, sha256, path), so the owner can see what ran."""
    import datetime
    import hashlib
    try:
        digest = hashlib.sha256(open(script, 'rb').read()).hexdigest()[:16]
        log = os.path.join(REPO, '.agent-hq', 'logs')
        os.makedirs(log, exist_ok=True)
        with open(os.path.join(log, 'creative_run.log'), 'a', encoding='utf-8') as f:
            f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')} {os.environ.get('HQ_TASK', '-')} {kind} {digest} {script}" + chr(10))
    except OSError:
        pass


def inside(path, base):
    return path == base or path.startswith(base + os.sep)


def checked_script(path, allowed):
    real = os.path.realpath(path)
    if not real.endswith('.py') or not os.path.isfile(real):
        sys.exit(f'creative_run: {path} is not a .py file')
    if not any(inside(real, r) for r in allowed):
        sys.exit(f'creative_run: {path} is outside the creative skills and assets folders')
    return real


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    cmd, rest = argv[0], argv[1:]
    if cmd == 'where':
        print('blender:', blender_exe() or 'not installed')
        for r in roots():
            print('allowed:', r)
        return 0
    if cmd == 'blender':
        if os.environ.get('HQ_BLENDER') == '0':
            sys.exit('creative_run: Blender is off for this task (Settings, Art, "Allow Blender", or a partner task)')
        if not rest:
            sys.exit('creative_run: blender needs a script')
        exe = blender_exe()
        if not exe:
            sys.exit('creative_run: Blender is not installed (winget install BlenderFoundation.Blender)')
        script = checked_script(rest[0], roots())
        args = [exe, '-b', '--factory-startup', '--python', script, '--', *rest[1:]]
    elif cmd == 'skill':
        if len(rest) < 2 or rest[0] not in SKILL_NAMES:
            sys.exit(f'creative_run: skill needs one of {", ".join(SKILL_NAMES)} and a script')
        base = os.path.realpath(os.path.join(SKILLS, rest[0]))
        script = checked_script(os.path.join(base, rest[1]), [base])
        args = [sys.executable, '-E', '-s', script, *rest[2:]]  # not -I: skill scripts import their siblings
    else:
        sys.exit(f'creative_run: unknown command {cmd}')
    audit(cmd, script)
    try:
        return subprocess.run(args, cwd=os.path.dirname(script), timeout=TIMEOUT).returncode
    except subprocess.TimeoutExpired:
        sys.exit(f'creative_run: stopped after {TIMEOUT // 60} minutes')


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
