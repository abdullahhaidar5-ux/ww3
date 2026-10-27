#!/usr/bin/env python3
"""Build index.html from the game sources in src/.

index.html = shell + vendored libraries (PeerJS, Three.js, GLTFLoader, SkeletonUtils) + MODEL_PACK + the game script.
Only the game script is ours to edit; it lives in src/NN-*.js. This script swaps the game <script> in index.html for
the concatenation of src/*.js (in file-name order) and leaves every other byte alone, so no model assets are needed.

  python3 orch/build.py           # rebuild index.html from src/
  python3 orch/build.py --check   # exit 1 if index.html is out of date with src/, or its page shell lost server code /
                                  # credits or got install buttons back (check_shell; nothing written)
  python3 orch/build.py --split   # one-off: regenerate src/ from the game script inside index.html
  python3 orch/build.py --artifact  # write the claude.ai artifact edition to orch/out/artifact/ (see orch/ARTIFACT.md)
"""
import glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')
SRC = os.path.join(ROOT, 'src')
START = '/* ================= DATA ================= */'

# Module boundaries, in order: the first line each src file starts with.
MODULES = [
    ('01-data.js', '/* ================= DATA ================= */'),
    ('02-map.js', '/* ================= MAP: sea channel, bridges, grid, pathfi'),
    ('03-sim.js', '/* ================= SIMULATION (authoritative; runs in sing'),
    ('04-gfx.js', 'let BORDER_TEX=null;\n/* ================= 3D ENGINE: rendere'),
    ('05-fx3d.js', '/* ================= 3D EFFECTS: particles, tracers, project'),
    ('06-view.js', '/* ================= VIEW: scene sync, camera, HUD, fog, min'),
    ('07-net.js', '/* ================= MULTIPLAYER: lobby + host-authoritative'),
    ('07b-ckpt.js', '/* ---------- Battle checkpoints (for host migration) ------'),
    ('08-ui.js', '/* ================= UI: sidebar, input, menu, main loop ==='),
    ('09-audio.js', '/* ================= AUDIO ENGINE: layered weapons, reverb, '),
    ('10-post.js', '/* ================= CINEMATIC POST-PROCESSING: HDR, bloom, '),
    ('11-models.js', 'let WALKSIGN=1;\n/* ================= ART ASSETS: real 3D mod'),
]


def game_span(html):
    i = html.index(START)
    j = html.index('</script>', i)
    return i, j


def split():
    html = open(HTML, encoding='utf-8').read()
    i, j = game_span(html)
    game = html[i:j]
    pos = []
    for name, head in MODULES:
        k = game.find(head, pos[-1] if pos else 0)
        if k < 0:
            sys.exit(f'cannot find start of {name}: {head[:50]!r}')
        pos.append(k)
    pos.append(len(game))
    os.makedirs(SRC, exist_ok=True)
    for n, (name, _) in enumerate(MODULES):
        with open(os.path.join(SRC, name), 'w', encoding='utf-8', newline='') as f:
            f.write(game[pos[n]:pos[n + 1]])
    print(f'wrote {len(MODULES)} modules to src/ ({len(game)} chars)')


def concat():
    files = sorted(glob.glob(os.path.join(SRC, '[0-9]*.js')))
    if not files:
        sys.exit('src/ is empty — run with --split first')
    return ''.join(open(f, encoding='utf-8', newline='').read() for f in files)


def syntax_check(game, what):
    tmp = os.path.join(ROOT, 'orch', 'out', '_game_check.js')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    open(tmp, 'w', encoding='utf-8').write(game)
    r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'syntax error in src/ — {what} NOT written:\n' + r.stderr[-2000:])


# ---------------------------------------------------------------------------------------------------------------
# Page-shell guard (run by --check). The shell (everything in index.html outside the src/ game span) is hand-kept and
# merges have silently dropped parts of it before (cycle 6 lost the server code and the Middle Eastern music credits;
# restored in f8df059). check_shell() lists what is missing, so a bad merge fails --check by name.
# Self-contained on purpose: it does not care where MODEL_PACK lives.

# Server client code in the online-edition shim: each entry is (what it is, a string that must be in the shell).
SHELL_CODE = [
    ('server address helper srvUrl()', 'const srvUrl='),
    ('server WebSocket address wsBase()', 'const wsBase='),
    ('server relay socket wsOpen()', 'const wsOpen='),
    ('server relay reconnect wsRetry()', 'const wsRetry='),
    ('server relay join wsJoin()', 'const wsJoin='),
    ('join fallback chain chainJoin() (direct P2P -> TURN -> server relay)', 'async function chainJoin('),
    ('server game list WW3_SDIR', 'window.WW3_SDIR='),
    ('server relay room URL', "'/room/'"),
    ('server game list URL', "'/lobby'"),
    ('TURN relay logins relayServers()', 'function relayServers('),
    ('relay fallback when a direct connection fails', "return namedRoom(name,true)"),
    ('server-relay fallback on reconnect', "return namedRoom(name,false,'ws')"),
    ('room API window.claude for the game script', 'window.claude={use:'),
]
# Install buttons were removed on purpose (orch/no-install, 11aa2e7): nothing may show or wire them up again.
# The old btn()/welcome() function bodies may stay as dead code; calling them, or listening for the install prompt, may not.
SHELL_BANNED = [
    ('install prompt listener (beforeinstallprompt)', r'beforeinstallprompt'),
    ('install button call btn()', r'(?<!function )(?<![\w.])btn\('),
    ('first-visit install card call welcome()', r'(?<!function )(?<![\w.])welcome\('),
    ('install button label', r'Install app \(desktop icon\)'),
]
# Credits for assets that have no mus/*_pack.py script listing their sources: (asset glob, credit phrase).
CREDIT_FALLBACK = [
    ('mus/smp.mp3', 'Orchestral score played on the FluidR3 GM'),
    ('vo/*.mp3', 'Unit voices'),
]
CREDIT_ALWAYS = ['3D models:']  # the model credits (wherever MODEL_PACK lives)


def credit_paragraphs(html):
    """Menu credit texts: the shell's <p class="credits"> paragraphs and the ones the game script adds at runtime."""
    paras = []
    for m in re.finditer(r'<p class="credits"[^>]*>', html):
        rest = html[m.end():]
        end = min([k for k in (rest.find('</p>'), rest.find('<p'), rest.find('</div>')) if k >= 0] or [len(rest)])
        paras.append(re.sub(r'<[^>]+>', '', rest[:end]))
    for m in re.finditer(r"className='credits'", html):
        t = re.search(r"textContent='((?:[^'\\]|\\.)*)'", html[m.end():m.end() + 4000])
        if t:
            paras.append(t.group(1))
    return paras


def pack_sources(script):
    """(assets the pack writes, source names it must credit together, people it must credit anywhere), from the
    'Sources' section of a mus/*_pack.py docstring."""
    doc = re.match(r'(?:#[^\n]*\n)*\s*"""(.*?)"""', open(script, encoding='utf-8').read(), re.S)
    doc = doc.group(1) if doc else ''
    outs = set(re.findall(r'mus/([\w<>]+\.mp3)', doc))
    sec = re.search(r'\nSources[^\n]*\n(.*?)(?:\n\s*\n|\nusage:)', doc, re.S)
    sec = sec.group(1) if sec else ''
    together, people = [], []
    for line in sec.splitlines():
        b = re.match(r'\s*\*\s+(.*)', line)
        if b:   # a source collection: its first two words (e.g. "Versilian Community", "FluidR3 GM", "Freesound")
            head = re.split(r' \(| by |[:,]', b.group(1))[0]
            together.append(' '.join(head.split()[:2]))
            people += [n.strip() for n in re.findall(r' by ([A-Z][\w.]*(?: [A-Z][\w.]*)*)', b.group(1))]
            continue
        a = re.match(r'\s+([\w.]+)(?: \([^)]*\))? - ["\w]', line)
        if a:   # a recording's author handle (Freesound / Wikimedia style: 'name - "title" (licence)')
            together.append(a.group(1))
    return outs, together, people


def check_shell(html, i, j):
    """Return a list of human-readable problems with the page shell (empty = fine)."""
    shell = html[:i] + html[j:]
    probs = []
    for what, s in SHELL_CODE:
        if s not in shell:
            probs.append(f'server code missing from the page shell: {what} (looked for {s!r})')
    for what, rx in SHELL_BANNED:
        m = re.search(rx, shell)
        if m:
            line = shell.count('\n', 0, m.start()) + 1
            probs.append(f'install button is back in the page shell: {what} (shell line ~{line})')
    paras = credit_paragraphs(html)
    if '<p class="credits"' not in shell:
        probs.append('page shell has no <p class="credits"> paragraphs (the menu credits list is gone)')
    allc = '\n'.join(paras).lower()
    covered = set()
    for script in sorted(glob.glob(os.path.join(ROOT, 'mus', '*_pack.py'))):
        name = os.path.relpath(script, ROOT)
        outs, together, people = pack_sources(script)
        for o in outs:
            rx = '^' + re.escape(o).replace(re.escape('<CODE>'), r'\w+') + '$'
            covered |= {f for f in os.listdir(os.path.join(ROOT, 'mus')) if re.match(rx, f)}
        if not together:
            probs.append(f'{name}: no "Sources" list in its docstring — cannot tell which credits it needs')
            continue
        if not any(all(t.lower() in p.lower() for t in together) for p in paras):
            best = max(paras, key=lambda p: sum(t.lower() in p.lower() for t in together), default='')
            miss = [t for t in together if t.lower() not in best.lower()]
            probs.append(f'menu credits missing for {name} (outputs {", ".join(sorted(outs))}): no credits paragraph '
                         f'names all of its sources; closest one lacks {miss}')
        for p in people:
            if p.lower() not in allc:
                probs.append(f'menu credits missing for {name}: source author {p!r}')
    for pat, phrase in CREDIT_FALLBACK:
        files = [os.path.relpath(f, ROOT) for f in glob.glob(os.path.join(ROOT, pat))]
        covered |= {os.path.basename(f) for f in files if f.startswith('mus/')}
        if files and phrase.lower() not in allc:
            probs.append(f'menu credits missing for {pat}: no credits text containing {phrase!r}')
    for phrase in CREDIT_ALWAYS:
        if phrase.lower() not in allc:
            probs.append(f'menu credits missing: no credits text containing {phrase!r}')
    for f in sorted(os.listdir(os.path.join(ROOT, 'mus'))):
        if f.endswith('.mp3') and f not in covered:
            probs.append(f'mus/{f} has no credit rule: give it a mus/*_pack.py with a "Sources" list, '
                         f'or add it to CREDIT_FALLBACK in orch/build.py')
    return probs


def build(check=False):
    html = open(HTML, encoding='utf-8', newline='').read()
    i, j = game_span(html)
    game = concat()
    if '</script' in game.lower():
        sys.exit('src/ contains "</script" — escape it as "<\\/script" or the page breaks')
    out = html[:i] + game + html[j:]
    if check:
        bad = False
        if out != html:
            print('index.html is OUT OF DATE with src/ — run python3 orch/build.py')
            bad = True
        else:
            print('index.html is up to date with src/')
        probs = check_shell(html, i, j)
        if probs:
            print(f'index.html page shell is BROKEN ({len(probs)} problem{"s" * (len(probs) > 1)}) — restore it from git history:')
            for p in probs:
                print('  ✗ ' + p)
            bad = True
        else:
            print('index.html page shell OK (server code, credits for every music/voice/model pack, no install buttons)')
        if bad:
            sys.exit(1)
        return
    # syntax check before writing
    syntax_check(game, 'index.html')
    if out == html:
        print('index.html already up to date')
        return
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print(f'index.html rebuilt ({len(out)} bytes, game {len(game)} chars)')


# ---------------------------------------------------------------------------------------------------------------
# claude.ai artifact edition (https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi). Same game, same src/, three swaps:
#  1. No PeerJS / Trystero / "online edition" shim / service worker: those two vendored <script>s stand in for the
#     artifact runtime's `room` capability on GitHub Pages. On claude.ai the page gets the real claude.use('room'),
#     which 07-net.js was written against, so the game script itself is byte-for-byte the Pages one.
#  2. Three.js r128 from cdnjs (artifact pages may only load scripts from cdnjs/jsdelivr/unpkg) instead of inline.
#  3. No <!doctype>/<html>/<head>/<body> or manifest/icon links: the Artifact publisher wraps the page itself.
# Audio stays at vo/XX.mp3 and mus/smp.mp3, published as files next to the page. See orch/ARTIFACT.md.
ARTIFACT_URL = 'https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi'
ARTIFACT_OUT = os.path.join(ROOT, 'orch', 'out', 'artifact')
THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
# Every room topic 07-net/07b-ckpt send in room mode, opened to Contributors ("interact"). 'b' (bundles) is P2P-only.
ROOM_TOPICS = ['cmd', 'evt', 'hello', 'lobby', 'snap', 'start', 'team', 'ck', 'pong']
CAPABILITIES = {'room': {'topics': {t: 'interact' for t in ROOM_TOPICS}}, 'user': {'scopes': ['profile']}}


def scripts(html):
    """(start of <script>, end after </script>, body) for every <script> block, in order."""
    out, k = [], 0
    while True:
        a = html.find('<script', k)
        if a < 0:
            return out
        b = html.index('>', a) + 1
        e = html.index('</script>', b)
        out.append((a, e + len('</script>'), html[b:e]))
        k = e + len('</script>')


def artifact():
    html = open(HTML, encoding='utf-8', newline='').read()
    i, j = game_span(html)
    game = concat()
    if '</script' in game.lower():
        sys.exit('src/ contains "</script" — escape it as "<\\/script" or the page breaks')
    syntax_check(game, 'artifact')
    html = html[:i] + game + html[j:]
    t = html.find('<title>')
    if t < 0:
        sys.exit('artifact: no <title> in index.html shell')
    blocks = scripts(html)
    before = [s for s in blocks if s[0] < t]
    names = ['online-edition shim' if 'window.WW3_P2P=true' in b else
             'PeerJS' if 'peerjs' in b.lower() or 'chunkedMTU' in b else '?' for _, _, b in before]
    if names != ['PeerJS', 'online-edition shim']:
        sys.exit(f'artifact: expected PeerJS + online-edition shim before <title>, found {names} — update build.py')
    three = [s for s in blocks if s[0] > t and 'Three.js Authors' in s[2][:300]]
    if len(three) != 1 or 'const e="128"' not in three[0][2]:
        sys.exit('artifact: vendored Three.js r128 <script> not found — CDN URL would not match; update build.py')
    a, b, _ = three[0]
    end = html.rindex('</body>')
    page = html[t:a] + f'<script src="{THREE_CDN}"></script>' + html[b:end].rstrip() + '\n'
    # guards: nothing Pages-only may leak into the artifact
    # (the World War 3 servers backend - relay rooms, server game list - lives in the shim, so it is dropped with it)
    for bad in ('window.WW3_P2P=true', 'window.claude=', 'serviceWorker.register', '<!doctype', '<body',
                'manifest.webmanifest', 'WW3_SDIR', '__ww3WsStats', "'/room/'"):
        if bad.lower() in page.lower():
            sys.exit(f'artifact: Pages-only code {bad!r} still in the artifact page — update build.py')
    srcs = re.findall(r'<script[^>]+src="([^"]+)"', page)
    if srcs != [THREE_CDN]:
        sys.exit(f'artifact: unexpected external scripts {srcs}')
    os.makedirs(ARTIFACT_OUT, exist_ok=True)
    out = os.path.join(ARTIFACT_OUT, 'index.html')
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write(page)
    rels = sorted('vo/' + n for n in os.listdir(os.path.join(ROOT, 'vo')) if n.endswith('.mp3')) + sorted('mus/' + n for n in os.listdir(os.path.join(ROOT, 'mus')) if n.endswith('.mp3'))
    files = {rel: rel for rel in rels}  # published path -> source path, relative to the repo root (ORCH's cwd)
    for rel in rels:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            sys.exit(f'artifact: missing published file {rel}')
    publish = {'url': ARTIFACT_URL, 'file_path': out, 'files': files, 'capabilities': CAPABILITIES}
    with open(os.path.join(ARTIFACT_OUT, 'publish.json'), 'w', encoding='utf-8') as f:
        json.dump(publish, f, indent=2)
    print(f'artifact page written: {os.path.relpath(out, ROOT)} ({len(page)} bytes, game {len(game)} chars), '
          f'{len(files)} audio files; publish arguments in orch/out/artifact/publish.json')


if __name__ == '__main__':
    if '--split' in sys.argv:
        split()
    elif '--artifact' in sys.argv:
        artifact()
    else:
        build(check='--check' in sys.argv)
