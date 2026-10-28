#!/usr/bin/env python3
"""Build index.html from the game sources in src/.

index.html = shell + vendored libraries (PeerJS, Three.js, GLTFLoader, SkeletonUtils) + MODEL_FILES + the game script.
Only the game script is ours to edit; it lives in src/NN-*.js. This script swaps the game <script> in index.html for
the concatenation of src/*.js (in file-name order) and leaves every other byte alone.

The 3D models live in models/<key>.<hash>.glb.gz (one gzipped .glb per model; the files are the source of truth,
<hash> is the first 10 hex digits of the sha256 of the .gz bytes, so every version has its own URL and caches forever).
The build writes the list of them into index.html (`const MODEL_FILES={...}`, one short line) and into sw.js (the
offline precache list). The game fetches them at startup (src/11-models.js).

  python3 orch/build.py           # rebuild index.html (and the model lists in index.html + sw.js) from src/ + models/
  python3 orch/build.py --check   # exit 1 if index.html / sw.js are out of date with src/ + models/, or the page shell
                                  # lost server code / credits or got install buttons back (check_shell; nothing written)
  python3 orch/build.py --split   # one-off: regenerate src/ from the game script inside index.html
  python3 orch/build.py --artifact  # write the claude.ai artifact edition (page, models as .txt, publish.json) to orch/out/artifact/
  python3 orch/build.py --add-model KEY FILE.glb   # add or replace model KEY (gzips it into models/, drops the old one)
"""
import glob, gzip, hashlib, json, os, re, subprocess, sys

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
    ('07a-hostsnap.js', '/* ================= HOST NETCODE: snapshots, events, team pa'),
    ('07b-ckpt.js', '/* ---------- Battle checkpoints (for host migration) ------'),
    ('08-ui.js', '/* ================= UI: sidebar, input, menu, main loop ==='),
    ('09-audio.js', '/* ================= AUDIO ENGINE: layered weapons, reverb, '),
    ('10-post.js', '/* ================= CINEMATIC POST-PROCESSING: HDR, bloom, '),
    ('11-models.js', 'let WALKSIGN=1;\n/* ================= ART ASSETS: real 3D mod'),
]


MODELS_DIR = os.path.join(ROOT, 'models')
SW = os.path.join(ROOT, 'sw.js')
# keys whose model is byte-for-byte another key's: one file, both keys (the game parses it once per key)
MODEL_ALIAS = {'inf': 'soldier'}
MODEL_NAME = re.compile(r'^([A-Za-z0-9_]+)\.([0-9a-f]{10})\.glb\.gz$')
PACK_RE = re.compile(r'<script>const MODEL_PACK="([A-Za-z0-9+/=]*)";?</script>')  # the old inline pack (pre-2026-10-27)
FILES_RE = re.compile(r'<script>const MODEL_FILES=\{[^<]*?\};</script>')
SW_RE = re.compile(r'const MODELS=\[[^\]]*\];')


def gz(data):
    """Deterministic gzip: same bytes in, same bytes out (no timestamp, no file name)."""
    return gzip.compress(data, compresslevel=9, mtime=0)


def model_hash(b):
    return hashlib.sha256(b).hexdigest()[:10]


def model_files():
    """{key: 'models/<file>'} for every model in models/ (aliases included), checked: name hash matches the bytes,
    the bytes are gzip and unpack to a glTF binary, one file per key."""
    out = {}
    if not os.path.isdir(MODELS_DIR):
        return out
    for n in sorted(os.listdir(MODELS_DIR)):
        m = MODEL_NAME.match(n)
        if not m:
            sys.exit(f'models/{n}: not a model file (expected <key>.<10 hex>.glb.gz) — remove it or use --add-model')
        key, h = m.groups()
        b = open(os.path.join(MODELS_DIR, n), 'rb').read()
        if model_hash(b) != h:
            sys.exit(f'models/{n}: contents do not match the hash in its name — use --add-model to (re)add a model')
        if gzip.decompress(b)[:4] != b'glTF':
            sys.exit(f'models/{n}: not a gzipped .glb')
        if key in out:
            sys.exit(f'models/: two files for {key!r} ({out[key]}, {n})')
        out[key] = 'models/' + n
    for a, k in MODEL_ALIAS.items():
        if k in out and a not in out:
            out[a] = out[k]
    return dict(sorted(out.items()))


def write_model(key, glb):
    """Store one model as models/<key>.<hash>.glb.gz, removing any older file for that key."""
    if not re.fullmatch(r'[A-Za-z0-9_]+', key):
        sys.exit(f'bad model key {key!r}')
    if glb[:4] != b'glTF':
        sys.exit(f'{key}: not a glTF binary (.glb)')
    os.makedirs(MODELS_DIR, exist_ok=True)
    b = gz(glb)
    name = f'{key}.{model_hash(b)}.glb.gz'
    for n in os.listdir(MODELS_DIR):
        m = MODEL_NAME.match(n)
        if m and m.group(1) == key and n != name:
            os.remove(os.path.join(MODELS_DIR, n))
    p = os.path.join(MODELS_DIR, name)
    if not os.path.exists(p):
        open(p, 'wb').write(b)
    return name


def unpack_old_pack(html):
    """One-off migration: the inline MODEL_PACK (gzip(JSON{key: base64 .glb}) as base64) becomes models/*.glb.gz."""
    import base64
    m = PACK_RE.search(html)
    if not m:
        return html
    pack = json.loads(gzip.decompress(base64.b64decode(m.group(1))))
    for key in sorted(pack):
        glb = base64.b64decode(pack[key])
        if key in MODEL_ALIAS:
            if base64.b64decode(pack[MODEL_ALIAS[key]]) != glb:
                sys.exit(f'model alias {key} -> {MODEL_ALIAS[key]}: the two models differ; drop the alias')
            continue
        write_model(key, glb)
    print(f'moved {len(pack)} models out of index.html into models/')
    return html[:m.start()] + '<script>const MODEL_FILES={};</script>' + html[m.end():]


def with_models(html):
    """index.html with its MODEL_FILES line listing models/ as it is now."""
    files = model_files()
    line = '<script>const MODEL_FILES=' + json.dumps(files, separators=(',', ':')) + ';</script>'
    if len(FILES_RE.findall(html)) != 1:
        sys.exit('index.html: expected exactly one <script>const MODEL_FILES={...};</script> line in the shell')
    return FILES_RE.sub(lambda _: line, html), files


def sw_with_models(files):
    sw = open(SW, encoding='utf-8', newline='').read()
    if len(SW_RE.findall(sw)) != 1:
        sys.exit('sw.js: expected exactly one "const MODELS=[...];" line')
    urls = sorted(set('./' + f for f in files.values()))
    return sw, SW_RE.sub(lambda _: 'const MODELS=' + json.dumps(urls, separators=(',', ':')) + ';', sw)


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
    ('Cloudflare-hosted battle room URL', "'/battle/'"),
    ('Cloudflare-hosted battle join (via wsb)', "namedRoom(name,false,'wsb',o.own)"),
    ('password-protected games: password offered as a WebSocket subprotocol', "'pw.'+btoa("),
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
    outs = set(re.findall(r'mus/((?:st/)?[\w<>-]+\.mp3)', doc))
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


def mus_files():
    """Every .mp3 under mus/, relative to mus/ ('an_US.mp3', 'st/calm-01.mp3'; the soundtrack lives in mus/st/)."""
    base = os.path.join(ROOT, 'mus')
    return sorted(os.path.relpath(os.path.join(dp, f), base).replace(os.sep, '/')
                  for dp, _, fs in os.walk(base) for f in fs if f.endswith('.mp3'))


def check_soundtrack(html, i, j, paras):
    """The shared soundtrack, mus/st/: every file is in mus/st/manifest.json, every manifest track is in the game's
    track list (ST_TR in 09-audio.js) and named with its author and licence in one menu credits paragraph."""
    import html as H
    probs = []
    d = os.path.join(ROOT, 'mus', 'st')
    if not os.path.isdir(d):
        return probs
    try:
        man = json.load(open(os.path.join(d, 'manifest.json'), encoding='utf-8'))
    except Exception as e:
        return [f'mus/st/manifest.json unreadable: {e}']
    ids = {t['id'] for t in man}
    for f in sorted(os.listdir(d)):
        if f.endswith('.mp3') and f[:-4] not in ids:
            probs.append(f'mus/st/{f} is not in mus/st/manifest.json (no title/author/licence to credit)')
    m = re.search(r'const ST_TR=\{(.*?)\};', html[i:j], re.S)
    used = set(re.findall(r"'([\w-]+)':\[", m.group(1))) if m else set()
    if not m:
        probs.append('src/09-audio.js has no ST_TR track list (the soundtrack player is gone)')
    plain = [H.unescape(p) for p in paras]
    for t in man:
        if not os.path.isfile(os.path.join(ROOT, t['file'])):
            probs.append(f"soundtrack track {t['id']}: file {t['file']} missing")
        if m and t['id'] not in used:
            probs.append(f"soundtrack track {t['id']} is in the manifest but not in the game's track list (ST_TR)")
        who, lic = t['author'].split(' (')[0], t['licence'].replace('CC-BY', 'CC BY')
        if not any(t['title'] in p and who in p and (lic in p or lic.split()[0] + ' By Attribution ' + lic.split()[-1] in p
                                                     or 'By Attribution ' + lic.split()[-1] in p) for p in plain):
            probs.append(f"menu credits missing for soundtrack track {t['id']}: no credits paragraph with "
                         f"{t['title']!r}, {who!r} and {lic!r}")
    for u in sorted(used - ids):
        probs.append(f'ST_TR plays {u!r}, which is not in mus/st/manifest.json')
    return probs


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
            rx = '^' + re.escape(o).replace(re.escape('<CODE>'), r'\w+').replace(re.escape('<ID>'), r'[\w-]+') + '$'
            covered |= {f for f in mus_files() if re.match(rx, f)}
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
    probs += check_soundtrack(html, i, j, paras)
    for f in mus_files():
        if f not in covered:
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
        if PACK_RE.search(out):
            print('index.html still has the inline MODEL_PACK — run python3 orch/build.py')
            sys.exit(1)
        out, files = with_models(out)
        sw, sw2 = sw_with_models(files)
        if out != html or sw != sw2:
            print(('index.html' if out != html else 'sw.js') + ' is OUT OF DATE with src/ + models/ — run python3 orch/build.py')
            bad = True
        else:
            print(f'index.html and sw.js are up to date with src/ and models/ ({len(files)} models)')
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
    out = unpack_old_pack(out)
    out, files = with_models(out)
    if not files:
        sys.exit('models/ is empty — the game would have no 3D models; index.html NOT written')
    sw, sw2 = sw_with_models(files)
    if sw != sw2:
        with open(SW, 'w', encoding='utf-8', newline='') as f:
            f.write(sw2)
        print(f'sw.js model list updated ({len(set(files.values()))} files)')
    if out == html:
        print('index.html already up to date')
        return
    with open(HTML, 'w', encoding='utf-8', newline='') as f:
        f.write(out)
    print(f'index.html rebuilt ({len(out)} bytes, game {len(game)} chars, {len(files)} models in models/)')


# ---------------------------------------------------------------------------------------------------------------
# claude.ai artifact edition (https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi). Same game, same src/, three swaps:
#  1. No PeerJS / Trystero / "online edition" shim / service worker: those two vendored <script>s stand in for the
#     artifact runtime's `room` capability on GitHub Pages. On claude.ai the page gets the real claude.use('room'),
#     which 07-net.js was written against, so the game script itself is byte-for-byte the Pages one.
#  2. Three.js r128 from cdnjs (artifact pages may only load scripts from cdnjs/jsdelivr/unpkg) instead of inline.
#  3. No <!doctype>/<html>/<head>/<body> or manifest/icon links: the Artifact publisher wraps the page itself.
#  4. The 3D models as base64 text files: the artifact host refuses .glb.gz / application/gzip (it serves only html css
#     js mjs wasm json txt, images, fonts, audio/video, pdf), so each models/<key>.<hash>.glb.gz is published as
#     models/<key>.<hash>.txt (text/plain, base64 of the same gzip bytes; written to orch/out/artifact/models/), the
#     page's MODEL_FILES points at those, and a small fetch hook (MODEL_TXT_HOOK, before the game script) turns them
#     back into the gzip bytes 11-models.js expects. src/ is untouched; the Pages build never sees any of this.
# Audio stays at vo/XX.mp3 and mus/*.mp3, published as files next to the page. See orch/ARTIFACT.md.
ARTIFACT_URL = 'https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi'
ARTIFACT_OUT = os.path.join(ROOT, 'orch', 'out', 'artifact')
THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
# Every room topic 07-net/07b-ckpt send in room mode, opened to Contributors ("interact"). 'b' (bundles) is P2P-only.
ROOM_TOPICS = ['cmd', 'evt', 'hello', 'lobby', 'snap', 'start', 'team', 'ck', 'pong']
CAPABILITIES = {'room': {'topics': {t: 'interact' for t in ROOM_TOPICS}}, 'user': {'scopes': ['profile']}}
# File types the artifact host serves (by extension). publish.json may only list these; the test harness
# (orch/artifact-harness.mjs) serves only these too, so a refused type fails the artifact tests.
ARTIFACT_TYPES = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
                  '.wasm': 'application/wasm', '.json': 'application/json', '.txt': 'text/plain', '.mp3': 'audio/mpeg'}
# Artifact-only: fetch('models/<key>.<hash>.txt') answers with the decoded bytes (the gzip 11-models.js unzips).
MODEL_TXT_HOOK = ('<script>(()=>{const F=window.fetch.bind(window),RX=/^models\\/[\\w.]+\\.txt$/;'
                  'window.fetch=function(u,o){if(typeof u!==\'string\'||!RX.test(u))return F(u,o);'
                  'return F(u,o).then(r=>r.ok?r.text().then(t=>{const s=atob(t.replace(/\\s+/g,\'\')),b=new Uint8Array(s.length);'
                  'for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return new Response(b,{status:200,headers:{\'content-type\':\'application/gzip\'}});}):r);};})();</script>')


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
    if PACK_RE.search(html):
        sys.exit('artifact: index.html still has the inline MODEL_PACK — run python3 orch/build.py first')
    html, models = with_models(html)
    # models as base64 .txt files (see 4. above): rewrite the MODEL_FILES line to point at them, hook in front of it
    txt = {k: re.sub(r'\.glb\.gz$', '.txt', v) for k, v in models.items()}
    line = '<script>const MODEL_FILES=' + json.dumps(txt, separators=(',', ':')) + ';</script>'
    if len(FILES_RE.findall(html)) != 1:
        sys.exit('artifact: expected exactly one MODEL_FILES line')
    html = FILES_RE.sub(lambda _: MODEL_TXT_HOOK + line, html)
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
    rels = sorted('vo/' + n for n in os.listdir(os.path.join(ROOT, 'vo')) if n.endswith('.mp3')) + ['mus/' + n for n in mus_files()]
    files = {rel: rel for rel in rels}  # published path -> source path, relative to the repo root (ORCH's cwd)
    for rel in rels:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            sys.exit(f'artifact: missing published file {rel}')
    # the 3D models as base64 text, models/<key>.<hash>.txt (hash in the name: new model = new path), written to
    # orch/out/artifact/models/ (old ones removed) and published from there
    import base64
    mdir = os.path.join(ARTIFACT_OUT, 'models')
    os.makedirs(mdir, exist_ok=True)
    mrels = sorted(set(txt.values()))
    for n in os.listdir(mdir):
        if 'models/' + n not in mrels:
            os.remove(os.path.join(mdir, n))
    for src_rel in sorted(set(models.values())):
        rel = re.sub(r'\.glb\.gz$', '.txt', src_rel)
        b64 = base64.b64encode(open(os.path.join(ROOT, src_rel), 'rb').read()).decode('ascii')
        p = os.path.join(ARTIFACT_OUT, rel)
        if not os.path.exists(p) or open(p, encoding='ascii').read() != b64:
            with open(p, 'w', encoding='ascii', newline='') as f:
                f.write(b64)
        files[rel] = {'from': os.path.relpath(p, ROOT), 'contentType': 'text/plain'}
    for rel, v in files.items():
        src_rel = v if isinstance(v, str) else v['from']
        ext = os.path.splitext(rel)[1].lower()
        if ext not in ARTIFACT_TYPES or os.path.splitext(src_rel)[1].lower() != ext:
            sys.exit(f'artifact: {rel} is a file type the artifact host refuses ({ext}) — publish it in a served form')
    publish = {'url': ARTIFACT_URL, 'file_path': out, 'files': files, 'capabilities': CAPABILITIES}
    with open(os.path.join(ARTIFACT_OUT, 'publish.json'), 'w', encoding='utf-8') as f:
        json.dump(publish, f, indent=2)
    msize = sum(os.path.getsize(os.path.join(ARTIFACT_OUT, r)) for r in mrels)
    print(f'artifact page written: {os.path.relpath(out, ROOT)} ({len(page)} bytes, game {len(game)} chars), '
          f'{len(rels)} audio files + {len(mrels)} model files ({msize / 1e6:.1f} MB); publish arguments in orch/out/artifact/publish.json')


if __name__ == '__main__':
    if '--split' in sys.argv:
        split()
    elif '--add-model' in sys.argv:
        k = sys.argv.index('--add-model')
        if len(sys.argv) < k + 3:
            sys.exit('usage: python3 orch/build.py --add-model KEY FILE.glb')
        key, src = sys.argv[k + 1], sys.argv[k + 2]
        print('models/' + write_model(key, open(src, 'rb').read()) + ' written; now run python3 orch/build.py')
    elif '--artifact' in sys.argv:
        artifact()
    else:
        build(check='--check' in sys.argv)
