#!/usr/bin/env python3
"""Writes orch/status.html: the Saturday tracker as a plain static page (no JavaScript needed, so it opens in any
phone viewer). Run `python3 orch/status.py` after shipping; it reads orch/PLAN-SAT.md, orch/HISTORY.md and git log."""
import re, subprocess, html, datetime, os
R = os.path.dirname(os.path.abspath(__file__))
plan = open(os.path.join(R, 'PLAN-SAT.md'), encoding='utf-8').read()
hist = open(os.path.join(R, 'HISTORY.md'), encoding='utf-8').read()
hl = [l for l in hist.splitlines() if l.strip()]
I = re.I
# (lane, [(id, name, running-regex, done-regex)]) — done = PLAN-SAT box ticked OR a HISTORY line matches done-regex
ITEMS = [
 ('Real-world map', [('A-MAP', 'Real borders and sizes (Natural Earth)', r'realmap', r'realmap.*(ship|live|done|green)')]),
 ('Grand-map look', [('C-LOOK1', 'Painted real-Earth terrain', r'grandlook', r'grandlook.*terrain.*(ship|live|done)'),
                     ('C-LOOK3', 'Total War-style army figures', r'grandlook.*arm', r'grandlook.*arm.*(ship|live|done)'),
                     ('C-TOWNS', 'Towns: villages, cities, megacities', r'C-TOWNS', r'C-TOWNS.*(first cut|done|ship)')]),
 ('Battle look', [('DB1', 'De-block 1: real crates and barrels', r'Open: .*slice 1\b', r'DE-BLOCK slice 1\b'),
                  ('DB2', 'De-block 2: buildings with real materials', r'Open: .*slice 2\b', r'DE-BLOCK slice 2\b'),
                  ('DB3', 'De-block 3: textured ground, tracks, rocks', r'Open: .*slice 3\b', r'DE-BLOCK slice 3\b'),
                  ('DB4', 'De-block 4: bigger soldiers, worn vehicles', r'Open: .*slice 4', r'DE-BLOCK slice 4b'),
                  ('RF13', 'Dust and sandstorms', None, None), ('RF15', 'Night tracers and flares', None, None)]),
 ('Battle rules', [('RF1', 'Hidden units and spotting', None, None), ('RF2', 'Front/side/rear armour', None, None),
                   ('RF3', 'Artillery delay and counter-battery', None, None)]),
 ('Government', [('RG5', 'TV news broadcasts', None, None), ('RG10', 'Nuclear programme and strike', None, None)]),
 ('Grand engine', [('A-DATE', 'Start date 1 Nov 2026', None, None), ('A-REAL', 'Realistic AI wars', None, None)]),
 ('Portraits', [('PORT', 'Portraits round 3 (sheet for your approval)', r'portraits3', r'portraits3.*(sheet|ship|live)')]),
]
n = d = 0; body = ''
for lane, its in ITEMS:
    body += f'<div class="lane"><h2>{html.escape(lane)}</h2>'
    for iid, name, run_re, done_re in its:
        n += 1
        ticked = re.search(r'- \[x\] \*\*' + re.escape(iid) + r'[ *]', plan) is not None
        done = ticked or (done_re and any(re.search(done_re, l, I) for l in hl))
        run = not done and ((run_re and any(re.search(run_re, l, I) for l in hl)) or re.search(re.escape(iid) + r'.*(slice|first cut|WIP)', hist, I))
        d += bool(done)
        cls, word = ('ok', 'Done') if done else ('run', 'In progress') if run else ('', 'Queued')
        body += f'<div class="it {cls}"><span class="dot"></span><div>{html.escape(name)}<small>{word} · {iid}</small></div></div>'
    body += '</div>'
log = subprocess.run(['git', 'log', '-40', '--no-merges', '--format=%ct\t%s', 'origin/main'], cwd=R, capture_output=True, text=True).stdout.splitlines()
skip = re.compile(r'janitor|^merge|HISTORY|screenshot|shots|test screenshots', I)
rows = [l.split('\t', 1) for l in log if '\t' in l and not skip.search(l.split('\t', 1)[1])][:10]
CHI = datetime.timezone(datetime.timedelta(hours=-6))
fmt = lambda ts: datetime.datetime.fromtimestamp(int(ts), CHI).strftime('%-I:%M %p')
feed = ''.join(f'<div>{html.escape(s[:110])}<br><em>{fmt(t)}</em></div>' for t, s in rows) or '—'
now = datetime.datetime.now(CHI); end = datetime.datetime(2026, 11, 7, 20, 0, tzinfo=CHI)
left = end - now; left_s = 'Deadline passed' if left.total_seconds() <= 0 else f'{int(left.total_seconds()//3600)} h {int(left.total_seconds()%3600//60):02d} m'
last = fmt(rows[0][0]) if rows else '—'
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="60"><title>WW3 Saturday Tracker</title><style>
:root{{--bg:#0e110f;--card:#171c18;--line:#2a322c;--tx:#ece6cf;--mut:#9aa596;--ok:#6fcf7f;--run:#f0c25a;--todo:#5f6a62;--acc:#f0c25a}}
@media (prefers-color-scheme:light){{:root{{--bg:#f4f1e8;--card:#fff;--line:#e2dccb;--tx:#1d1f1a;--mut:#6b6f63;--ok:#2f9a45;--run:#b7861a;--todo:#b9bdb2;--acc:#9a6f0e}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--tx);font:15px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}}
.wrap{{max-width:760px;margin:0 auto;padding:16px}}h1{{font-size:20px;margin:4px 0 2px}}.sub{{color:var(--mut);font-size:13px}}
.top{{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}}.stat{{flex:1;min-width:140px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}}
.stat b{{display:block;font-size:24px}}.stat span{{color:var(--mut);font-size:12px}}
.bar{{height:10px;background:var(--line);border-radius:6px;overflow:hidden;margin:6px 0 16px}}.bar i{{display:block;height:100%;background:var(--ok)}}
.lane,.feed{{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:10px 0;padding:6px 12px}}
h2{{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:6px 0}}
.it{{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--line)}}.it:first-of-type{{border-top:0}}
.dot{{flex:none;width:11px;height:11px;border-radius:50%;margin-top:5px;background:var(--todo)}}.ok .dot{{background:var(--ok)}}.run .dot{{background:var(--run)}}
.it small{{display:block;color:var(--mut);font-size:12px}}.feed div{{padding:6px 0;border-top:1px solid var(--line);font-size:13px}}.feed div:first-of-type{{border-top:0}}
.feed em{{color:var(--mut);font-style:normal;font-size:12px}}a{{color:var(--acc)}}
</style></head><body><div class="wrap"><h1>World War 3 · Saturday tracker</h1>
<div class="sub">Updated {now.strftime('%-I:%M %p')} Chicago · deadline 8:00 pm · <a href="../">Play the game</a></div>
<div class="top"><div class="stat"><b>{d} / {n}</b><span>items done</span></div><div class="stat"><b>{left_s}</b><span>until 8:00 pm (at update time)</span></div><div class="stat"><b>{last}</b><span>last change to the game</span></div></div>
<div class="bar"><i style="width:{100*d//n}%"></i></div>{body}
<div class="feed"><h2>Latest changes</h2>{feed}</div></div></body></html>'''
open(os.path.join(R, 'status.html'), 'w', encoding='utf-8').write(page)
print(f'status.html: {d}/{n} done')
