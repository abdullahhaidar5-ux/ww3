#!/usr/bin/env python3
"""Build orch/board.html — the WW3 Command Board Abdullah reads on his phone.

Everything on the board comes from ORCH's own files, so it is never edited by hand:
  orch/BACKLOG.md  -> needs-you, open work per squad, done list
  orch/HISTORY.md  -> agents table and "Everything shipped, by area"
  orch/LOG.md      -> recent cycles
ORCH runs this at the end of every cycle and republishes the page (see ORCH.md step 9).
"""
import html, re, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
read = lambda n: (ROOT / n).read_text(encoding='utf-8')

SQUADS = [  # key, label, files, mission
    ('Visuals', 'Visuals', '04-gfx · 05-fx3d · 10-post · 11-models', 'Company of Heroes / Broken Arrow realism in real battles'),
    ('Battlefield', 'Battlefield', '03-sim · 01-data', 'Massive, intense, tactical battles: AI, combat, balance'),
    ('Maps', 'Maps', '02-map', 'Theatres, terrain, pathfinding, map select'),
    ('Audio', 'Audio', '09-audio · vo/ · mus/', 'Pro military sound, native voices, latmiyas & national scores'),
    ('Netcode', 'Netcode', '07-net · 07b-ckpt · relay · sw.js', 'Smooth 8-player multiplayer that never desyncs'),
    ('Interface', 'Interface', '08-ui · 06-view', 'Controls, HUD, menus, phone-playability'),
    ('QA', 'QA & ORCH', 'orch/', 'The test gate, harnesses and ORCH itself'),
]
ALIAS = {'foundation': 'QA', 'battlefield': 'Battlefield', 'visuals': 'Visuals', 'audio': 'Audio', 'ui': 'Interface',
         'interface': 'Interface', 'multiplayer': 'Netcode', 'netcode': 'Netcode', 'maps': 'Maps', 'qa': 'QA'}


def squad_of(header):
    h = header.lower()
    for k, v in ALIAS.items():
        if h.startswith(k):
            return v
    return None


def inline(s):
    """Tiny markdown: escape, then `code`, **bold**, *em*, [text](url), bare URLs."""
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?!\w)', r'<i>\1</i>', s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r'(?<![">])(https?://[^\s<)]+)', r'<a href="\1" target="_blank" rel="noopener">\1</a>', s)
    return s


def sections(md, level='## '):
    out, cur, buf = [], None, []
    for line in md.splitlines():
        if line.startswith(level) and not line.startswith(level + '#'):
            if cur is not None:
                out.append((cur, buf))
            cur, buf = line[len(level):].strip(), []
        elif cur is not None:
            buf.append(line)
    if cur is not None:
        out.append((cur, buf))
    return out


def items(lines):
    """'- ' bullets with indented continuation lines -> list of strings; '**Header**' lines -> ('H', text)."""
    res = []
    for ln in lines:
        if re.match(r'^\s*- ', ln) and not ln.startswith('    '):
            res.append(re.sub(r'^\s*- ', '', ln).strip())
        elif ln.startswith('**') and not ln.startswith('- '):
            res.append(('H', ln.strip()))
        elif ln.startswith('  ') and res and isinstance(res[-1], str) and ln.strip():
            res[-1] += ' ' + ln.strip()
    return res


def tag_of(t):
    m = re.match(r'\[(open|check|ask)\]\s*', t)
    return (m.group(1), t[m.end():]) if m else ('', t)


# ---------- BACKLOG ----------
backlog = dict(sections(read('BACKLOG.md')))
requests, questions, done = [], [], []
open_by = {k: [] for k, *_ in SQUADS}
asks = []
for title, lines in sections(read('BACKLOG.md')):
    t = title.lower()
    its = items(lines)
    if 'requests' in t:
        requests = [x for x in its if isinstance(x, str)]
    elif t.startswith('questions'):
        questions = [x for x in its if isinstance(x, str) and not x.startswith('_(none')]
    elif t.startswith('done'):
        done = [x for x in its if isinstance(x, str)]
    elif re.match(r'p[123]', t):
        pr = t[:2].upper()
        sq = None
        for x in its:
            if isinstance(x, tuple):
                sq = squad_of(re.sub(r'\*', '', x[1]))
                continue
            tg, body = tag_of(x)
            entry = (pr, tg, body)
            if tg == 'ask':
                asks.append(body)
            if pr == 'P3' and sq is None:
                open_by['QA' if 'clip' in body.lower() else 'Battlefield'].append(entry)
            else:
                open_by.setdefault(sq or 'QA', []).append(entry)

# ---------- HISTORY ----------
hist = read('HISTORY.md')
shipped = {}
m = re.search(r'### Everything shipped, by area\s*(.*?)(?:\n---|\n## |\Z)', hist, re.S)
if m:
    for para in re.split(r'\n\s*\n', m.group(1).strip()):
        p = ' '.join(l.strip() for l in para.splitlines())
        mm = re.match(r'\*\*([^*]+)\*\*\s*[—-]\s*(.*)', p)
        if mm:
            key = squad_of(mm.group(1)) or mm.group(1)
            shipped[key] = mm.group(2)
agents = []
m = re.search(r'\*\*Agents, all of them:\*\*\s*\n\s*\n(.*?)\n\s*\n', hist, re.S)
if m:
    for row in m.group(1).splitlines()[2:]:
        cells = [c.strip() for c in row.strip().strip('|').split('|')]
        if len(cells) == 2:
            agents.append(cells)
old_runs = len(re.findall(r'^\| \d+b? \|', hist, re.M))

# ---------- LOG ----------
cycles = [(t, [x for x in items(l) if isinstance(x, str)]) for t, l in sections(read('LOG.md'))][:3]

# ---------- ROADMAP (progress) ----------
ST_ORDER = ['doing', 'you', 'next', 'todo', 'paused', 'done']
ST_TXT = {'done': 'done', 'doing': 'in progress', 'next': 'next up', 'you': 'needs you', 'paused': 'paused', 'todo': 'planned'}
roadmap = []
try:
    for title, lines in sections(read('ROADMAP.md')):
        its = []
        for x in items(lines):
            if isinstance(x, str):
                m = re.match(r'\[(done|doing|next|you|paused|todo)\]\s*(.*)', x)
                if m:
                    its.append((m.group(1), m.group(2)))
        if its:
            roadmap.append((title, its))
except FileNotFoundError:
    pass
rm_all = [st for _, its in roadmap for st, _ in its]
rm_done = rm_all.count('done')
rm_doing = rm_all.count('doing')
rm_you = [b for _, its in roadmap for st, b in its if st == 'you']

# ---------- render ----------
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-5)))
n_open = sum(len(v) for v in open_by.values())
n_done = len(done)
last_cycle = cycles[0][0] if cycles else '—'

E = []
w = E.append
TAGTXT = {'open': 'to do', 'check': 'verify', 'ask': 'needs you', '': ''}


def li_item(pr, tg, body):
    chips = f'<span class="chip p{pr[-1]}">{pr}</span>'
    if tg:
        chips += f'<span class="chip t-{tg}">{TAGTXT[tg]}</span>'
    return f'<li><div class="chips">{chips}</div><div class="txt">{inline(body)}</div></li>'


w('<header class="top"><div class="wrap">')
w('<p class="eyebrow">World War 3 · development</p><h1>Command Board</h1>')
w('<p class="lede">One orchestrator, <b>ORCH</b>, runs all development: every 4 hours it picks the top of the backlog, '
  'sends up to four squad agents, tests their work in a real AI battle and ships to the live game.</p>')
w('<div class="stats">')
for v, k in [('1', 'standing agent: ORCH'), ('7', 'squads it dispatches'), (str(n_open), 'open items'),
             (str(n_done), 'shipped by ORCH'), (str(len(questions) + len(asks) + len(rm_you)), 'need your answer')]:
    w(f'<div class="stat"><b>{v}</b><span>{k}</span></div>')
w('</div>')
w('<div class="links"><a class="btn" href="https://abdullahhaidar5-ux.github.io/ww3/" target="_blank" rel="noopener">Play (GitHub Pages)</a>'
  '<a class="btn ghost" href="https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi" target="_blank" rel="noopener">claude.ai version</a>'
  '<a class="btn ghost" href="https://claude.ai/artifact/NqbVv2hseRUctmafy3AFC2" target="_blank" rel="noopener">Clips</a>'
  '<a class="btn ghost" href="https://github.com/abdullahhaidar5-ux/ww3/blob/main/orch/BACKLOG.md" target="_blank" rel="noopener">Backlog on GitHub</a></div>')
w(f'<p class="meta">Last cycle: {inline(last_cycle)} · board built {now:%a %b %-d, %-I:%M %p} Chicago</p>')
w('</div></header>')

w('<nav class="jump"><div class="wrap">')
for lab, href in [('Progress', 'progress'), ('Needs you', 'needs'), ('Next up', 'next'), ('Agents', 'agents')] + [(l, k.lower()) for k, l, *_ in SQUADS] + [('Cycles', 'cycles')]:
    w(f'<a href="#{href}">{lab}</a>')
w('</div></nav><main class="wrap">')

# Progress (from ROADMAP.md)
if roadmap:
    pct = round(100 * rm_done / max(1, len(rm_all)))
    w(f'<section id="progress"><h2>Progress</h2><p class="sub">{rm_done} of {len(rm_all)} items done · {rm_doing} in progress right now · {len(rm_you)} waiting on you</p>')
    w(f'<div class="pbar big" role="img" aria-label="{pct}% done"><i style="width:{pct}%"></i><span>{pct}%</span></div>')
    w('<div class="streams">')
    for title, its in roadmap:
        n = len(its); d = sum(1 for st, _ in its if st == 'done'); g = sum(1 for st, _ in its if st == 'doing')
        w(f'<div class="stream"><div class="sthead"><h3>{html.escape(title)}</h3><span class="cnt">{d}/{n}</span></div>')
        segs = ''.join(f'<i class="seg s-{st}" style="width:{100*sum(1 for x,_ in its if x==st)/n:.1f}%"></i>' for st in ['done','doing','you','next','paused','todo'] if any(x==st for x,_ in its))
        w(f'<div class="pbar">{segs}</div><ul class="rm">')
        for st, body in sorted(its, key=lambda t: ST_ORDER.index(t[0])):
            w(f'<li class="r-{st}"><span class="chip st-{st}">{ST_TXT[st]}</span><span class="txt">{inline(body)}</span></li>')
        w('</ul></div>')
    w('</div><p class="hint">Built from <code>orch/ROADMAP.md</code>; ORCH updates it every cycle.</p></section>')

# Needs you
w('<section id="needs" class="band warn"><h2>Needs you</h2>')
if questions or asks or rm_you:
    w('<ul class="list">' + ''.join(f'<li><div class="txt">{inline(q)}</div></li>' for q in rm_you + questions + asks) + '</ul>')
else:
    w('<p class="empty">Nothing waiting on you.</p>')
w('<p class="hint">To ask for anything, tell Claude in any chat: “add to the WW3 backlog: …”. ORCH does your requests first.</p></section>')

# Next up
w('<section id="next"><h2>Next up</h2><p class="sub">What ORCH takes next cycle, top first: your requests, then P1.</p><ol class="list next">')
for r in requests:
    tg, body = tag_of(r)
    mm = re.match(r'(\*\*[^*]+\*\*[^.]*\.)\s*(.*)', body)
    txt = inline(mm.group(1)) + (f'<details class="more"><summary>Details</summary>{inline(mm.group(2))}</details>' if mm and mm.group(2) else '') if mm else inline(body)
    w(f'<li><div class="chips"><span class="chip req">your request</span></div><div class="txt">{txt}</div></li>')
# ORCH takes at most one item per squad per cycle, so show the P1 queue round-robin across squads
queues = [[e for e in open_by.get(k, []) if e[0] == 'P1' and e[1] != 'ask'] for k, *_ in SQUADS]
p1 = []
for i in range(max(map(len, queues), default=0)):
    for (k, *_), q in zip(SQUADS, queues):
        if i < len(q):
            p1.append((k, q[i]))
for k, (pr, tg, body) in p1[:6]:
    w(f'<li><div class="chips"><span class="chip sq">{k}</span><span class="chip t-{tg}">{TAGTXT[tg]}</span></div><div class="txt">{inline(body)}</div></li>')
w('</ol></section>')

# Agents
w('<section id="agents"><h2>Agents</h2><div class="org">')
w('<div class="node orch"><b>ORCH</b><span>scheduled task · every 4 h at :24 · plans, dispatches, tests, ships, reports</span></div>')
w('<div class="squads">')
for k, lab, files, mission in SQUADS:
    w(f'<a class="node sqd" href="#{k.lower()}"><b>{lab}</b><span>{html.escape(mission)}</span><code>{files}</code></a>')
w('</div></div>')
if agents:
    w('<div class="tablewrap"><table><thead><tr><th>Agent</th><th>Status</th></tr></thead><tbody>')
    for a, s in agents:
        st = 'live' if s.lower().startswith('**active') or s.lower().startswith('spawned') else 'off'
        w(f'<tr><td>{inline(a)}</td><td><span class="dot {st}"></span>{inline(s)}</td></tr>')
    w('</tbody></table></div>')
w('</section>')

# Squads
for k, lab, files, mission in SQUADS:
    its = sorted(open_by.get(k, []), key=lambda e: (e[0], {'ask': 2, 'check': 1, 'open': 0}.get(e[1], 3)))
    w(f'<section id="{k.lower()}" class="squad"><div class="sqhead"><h2>{lab}</h2><code>{files}</code></div>')
    w(f'<p class="sub">{html.escape(mission)}</p><div class="cols">')
    w(f'<div><h3>Open · {len(its)}</h3>')
    w('<ul class="list">' + ''.join(li_item(*e) for e in its) + '</ul>' if its else '<p class="empty">Nothing open.</p>')
    w('</div>')
    if shipped.get(k):
        w(f'<div><h3>In the game</h3><p class="shipped">{inline(shipped[k])}</p></div>')
    w('</div></section>')

# Cycles + done
w('<section id="cycles"><h2>Recent ORCH cycles</h2>')
for t, bs in cycles:
    w(f'<details><summary>{inline(t)}</summary><ul class="plain">' + ''.join(f'<li>{inline(b)}</li>' for b in bs) + '</ul></details>')
if done:
    w('<h3 class="mt">Shipped by ORCH</h3><ul class="plain">' + ''.join(f'<li>{inline(d)}</li>' for d in done) + '</ul>')
w(f'<p class="hint">Before ORCH: {old_runs} development runs, Oct 18–25 (v58–v84), recorded in <code>orch/HISTORY.md</code>.</p>')
w('</section></main>')

CSS = r"""
:root{
  /* Layout: ops board — status header, jump bar, stacked bands; one column on phones, two-column squad detail on wide screens */
  --bg:#eef1ec;--panel:#ffffff;--panel2:#e3e8e2;--line:#c9d2ca;--fg:#18201c;--dim:#56635c;
  --accent:#9a6f00;--accentbg:#f5e7c2;--warn:#b2402b;--warnbg:#f8e1db;--ok:#2f7a48;--info:#2d5f8a;
  --display:'Saira Condensed','Arial Narrow',sans-serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1311;--panel:#161d1a;--panel2:#1d2622;--line:#2c3833;--fg:#dde5df;--dim:#8a9a92;--accent:#e3b341;--accentbg:#2a2716;--warn:#ea5a40;--warnbg:#2b1712;--ok:#74d08f;--info:#7fb8e6;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0e1311;--panel:#161d1a;--panel2:#1d2622;--line:#2c3833;--fg:#dde5df;--dim:#8a9a92;--accent:#e3b341;--accentbg:#2a2716;--warn:#ea5a40;--warnbg:#2b1712;--ok:#74d08f;--info:#7fb8e6;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font:14px/1.55 var(--mono)}
.wrap{max-width:1100px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
a{color:var(--info)}
code{font:12px var(--mono);background:var(--panel2);padding:1px 4px;border-radius:2px;overflow-wrap:anywhere}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0}
h1{font-size:clamp(40px,9vw,72px);line-height:.9;text-transform:uppercase;letter-spacing:.02em}
h2{font-size:26px;text-transform:uppercase;letter-spacing:.04em}
h3{font-size:14px;text-transform:uppercase;letter-spacing:.14em;color:var(--dim);margin-bottom:8px}
.top{background:var(--panel);border-bottom:1px solid var(--line)}
.top .wrap{padding-block:28px 22px;display:flex;flex-direction:column;gap:14px}
.eyebrow{margin:0;font:600 12px var(--display);letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}
.lede{margin:0;max-width:66ch}
.meta{margin:0;font-size:12px;color:var(--dim)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}
.stat{background:var(--panel);padding:10px 12px;display:flex;flex-direction:column}
.stat b{font:700 32px/1 var(--display);color:var(--accent);font-variant-numeric:tabular-nums}
.stat span{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.links{display:flex;flex-wrap:wrap;gap:8px}
.btn{display:inline-block;background:var(--accent);color:var(--bg);font:700 15px var(--display);letter-spacing:.1em;text-transform:uppercase;padding:8px 14px;text-decoration:none}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
.btn:focus-visible,.jump a:focus-visible,.node:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.jump{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}
.jump .wrap{display:flex;gap:4px;overflow-x:auto;padding-block:8px;scrollbar-width:none}
.jump a{flex:none;font:600 13px var(--display);letter-spacing:.08em;text-transform:uppercase;color:var(--dim);text-decoration:none;padding:4px 10px;border:1px solid var(--line)}
.jump a:hover{color:var(--fg);border-color:var(--fg)}
main{display:flex;flex-direction:column;gap:34px;padding-block:26px 60px}
section{display:flex;flex-direction:column;gap:12px;scroll-margin-top:60px}
.sub{margin:-6px 0 0;color:var(--dim);font-size:13px}
.band.warn{background:var(--warnbg);border:1px solid var(--line);border-left:4px solid var(--warn);padding:14px 16px}
.hint{margin:0;font-size:12px;color:var(--dim)}
.empty{margin:0;color:var(--dim)}
.list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.list li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;background:var(--panel);border:1px solid var(--line);padding:9px 11px}
.band .list li{background:transparent;border-color:transparent;padding:4px 0;grid-template-columns:minmax(0,1fr)}
ol.next{counter-reset:n}
ol.next li{counter-increment:n;grid-template-columns:28px auto minmax(0,1fr)}
ol.next li::before{content:counter(n);font:700 20px/1 var(--display);color:var(--accent)}
.chips{display:flex;flex-direction:column;gap:3px;min-width:74px}
.chip{font:600 10px var(--mono);text-transform:uppercase;letter-spacing:.06em;padding:1px 6px;border:1px solid var(--line);color:var(--dim);text-align:center;white-space:nowrap}
.chip.p1,.chip.req{border-color:var(--accent);color:var(--accent);background:var(--accentbg)}
.chip.t-ask{border-color:var(--warn);color:var(--warn)}
.chip.t-check{border-color:var(--info);color:var(--info)}
.chip.t-open{border-color:var(--ok);color:var(--ok)}
.chip.sq{color:var(--fg)}
.txt{min-width:0;overflow-wrap:anywhere}
.org{display:flex;flex-direction:column;gap:8px}
.node{display:flex;flex-direction:column;gap:3px;background:var(--panel);border:1px solid var(--line);padding:10px 12px;color:var(--fg);text-decoration:none;min-width:0}
.node b{font:700 18px var(--display);letter-spacing:.04em;text-transform:uppercase}
.node span{font-size:12px;color:var(--dim)}
.node code{align-self:flex-start;font-size:11px}
.node.orch{border:1px solid var(--accent);background:var(--accentbg)}
.node.orch b{font-size:24px;color:var(--accent)}
.node.sqd:hover{border-color:var(--accent)}
.squads{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;position:relative;padding-left:14px;border-left:2px solid var(--accent);margin-left:12px}
.tablewrap{overflow-x:auto;border:1px solid var(--line)}
table{border-collapse:collapse;width:100%;min-width:520px;background:var(--panel);font-size:13px}
th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--line)}
th{font:600 12px var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:var(--dim);vertical-align:1px}
.dot.live{background:var(--ok)}
.squad{border-top:2px solid var(--line);padding-top:16px}
.sqhead{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px}
.cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:18px}
.cols>div{min-width:0}
.cols>div:only-child{grid-column:1/-1}
.shipped{margin:0;font-size:13px;color:var(--fg);background:var(--panel2);padding:10px 12px;border-left:3px solid var(--ok)}
.shipped i{color:var(--ok);font-style:normal;font-weight:600}
@media (max-width:760px){.cols{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.stats{grid-template-columns:1fr 1fr}.stat:last-child:nth-child(odd){grid-column:1/-1}
  .list li{grid-template-columns:minmax(0,1fr);gap:6px}ol.next li{grid-template-columns:22px minmax(0,1fr)}ol.next li>.txt{grid-column:2}
  .chips{flex-direction:row;flex-wrap:wrap;min-width:0}}
.more{margin-top:6px;background:transparent;border:0;padding:0}.more summary{font:600 12px var(--mono);color:var(--info)}
details{background:var(--panel);border:1px solid var(--line);padding:8px 12px}
summary{cursor:pointer;font:600 16px var(--display);letter-spacing:.04em}
.plain{margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px;font-size:13px}
.plain li{overflow-wrap:anywhere}
.mt{margin-top:10px}

.pbar{display:flex;height:10px;background:var(--panel2);border:1px solid var(--line);overflow:hidden;position:relative}
.pbar.big{height:22px}.pbar.big i{background:var(--ok)}
.pbar.big span{position:absolute;right:8px;top:0;font:600 13px/22px var(--mono);color:var(--fg)}
.pbar i{display:block;height:100%}
.seg.s-done{background:var(--ok)}.seg.s-doing{background:var(--accent)}.seg.s-you{background:var(--warn)}
.seg.s-next{background:var(--info)}.seg.s-paused{background:var(--dim)}.seg.s-todo{background:transparent}
.streams{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.stream{background:var(--panel);border:1px solid var(--line);padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.sthead{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.sthead h3{margin:0;color:var(--fg);font-size:16px;letter-spacing:.06em}
.cnt{font:600 13px var(--mono);color:var(--dim);font-variant-numeric:tabular-nums}
.rm{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.rm li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px;align-items:start;font-size:13px}
.rm li.r-done .txt{color:var(--dim)}
.chip.st-done{border-color:var(--ok);color:var(--ok)}.chip.st-doing{border-color:var(--accent);color:var(--accent);background:var(--accentbg)}
.chip.st-you{border-color:var(--warn);color:var(--warn)}.chip.st-next{border-color:var(--info);color:var(--info)}
.chip.st-paused{color:var(--dim)}.chip.st-todo{color:var(--dim);border-style:dashed}
@media (max-width:560px){.rm li{grid-template-columns:minmax(0,1fr);gap:2px}.rm .chip{justify-self:start}}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
"""

head = ('<title>WW3 Command Board</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@400;600&display=swap">\n'
        f'<style>{CSS}</style>\n')
(ROOT / 'board.html').write_text(head + '\n'.join(E) + '\n', encoding='utf-8')
print(f'board.html: {n_open} open, {n_done} done, {len(requests)} requests, {len(questions) + len(asks)} need you, '
      f'{len(agents)} agent rows, {len(shipped)} shipped areas, {len(cycles)} cycles')
