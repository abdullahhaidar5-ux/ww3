#!/usr/bin/env python3
"""Overview picture of every Battle map (top-down, starts and resources marked), from the map data itself.

  node orch/battlemapfair.mjs --static --dump orch/out/battlemaps-dump.json
  python3 orch/battlemapshots.py orch/out/battlemaps-dump.json orch/concepts/battlemaps

Writes overview-<id>.jpg (under 300 KB each). Legend: numbered circles = start spots, green squares = supply
sources, black triangles = oil derricks, blue = water, light blue = bridge, dark = cliffs / rock / town buildings."""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
GROUND = {'desert': (203, 178, 122), 'green': (118, 148, 88), 'snow': (224, 230, 234)}
ROCK = {'desert': (122, 96, 66), 'green': (88, 86, 78), 'snow': (128, 138, 150)}
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except Exception:
    FONT = SMALL = ImageFont.load_default()
for r in json.load(open(src)):
    gw, gh, g = r['GW'], r['GH'], r['grid']
    S = max(4, 1100 // gw)                       # pixels per ground cell
    k = S / 40.0                                 # world units -> pixels (a cell is 40)
    im = Image.new('RGB', (gw * S, gh * S + 44), (24, 26, 28)); d = ImageDraw.Draw(im)
    th = r.get('theme', 'desert'); gc, rc = GROUND.get(th, GROUND['desert']), ROCK.get(th, ROCK['desert'])
    in_town = lambda x, y: any((x - c[0]) ** 2 + (y - c[1]) ** 2 < (c[2] + 40) ** 2 for c in r['cities'])
    for j in range(gh):
        for i in range(gw):
            v = g[j * gw + i]
            col = gc if v == '0' else (58, 104, 150) if v in '14' else (170, 200, 220) if v == '2' else ((96, 84, 76) if in_town(i * 40 + 20, j * 40 + 20) else rc)
            d.rectangle([i * S, j * S, i * S + S - 1, j * S + S - 1], fill=col)
    for p in r.get('roads', []):
        d.line([(x * k, y * k) for x, y in p], fill=(150, 140, 120), width=max(2, S // 3))
    for x, y in r.get('hamlets', []):
        d.rectangle([x * k - 6, y * k - 6, x * k + 6, y * k + 6], outline=(70, 50, 40), width=2)
    for x, y, a in r['fields']:
        q = 8 + a / 3000
        d.rectangle([x * k - q, y * k - q, x * k + q, y * k + q], fill=(40, 170, 70), outline=(255, 255, 255), width=2)
    for x, y in r['oil']:
        d.polygon([(x * k, y * k - 13), (x * k - 11, y * k + 9), (x * k + 11, y * k + 9)], fill=(20, 20, 20), outline=(255, 210, 60))
    for n, b in enumerate(r['b']):
        x, y = b['x'] * k, b['y'] * k
        d.ellipse([x - 17, y - 17, x + 17, y + 17], fill=(200, 40, 40), outline=(255, 255, 255), width=3)
        d.text((x, y), str(n + 1), fill=(255, 255, 255), font=FONT, anchor='mm')
    d.text((8, gh * S + 22), f"{r['name']}  ·  {r['n']} players  ·  {r['F']} supply sources (green)  ·  {r['O']} oil derricks (black)  ·  red = starts",
           fill=(235, 235, 235), font=SMALL, anchor='lm')
    f = os.path.join(out, 'overview-' + r['k'].replace('bm_', '') + '.jpg'); q = 86
    while True:
        im.save(f, quality=q, optimize=True)
        if os.path.getsize(f) < 290000 or q < 40: break
        q -= 8
    print(f, os.path.getsize(f) // 1024, 'KB')
