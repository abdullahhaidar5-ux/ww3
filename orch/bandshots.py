import json, sys
from PIL import Image, ImageDraw, ImageFont
d = json.load(open(sys.argv[1])); out = sys.argv[2]
GW, GH, W, H = d['GW'], d['GH'], d['W'], d['H']
S = 1400 / W  # pixels per map unit
iw, ih = int(W * S), int(H * S)
img = Image.new('RGB', (iw, ih + 70), (24, 28, 34)); px = img.load()
g = d['grid']
col = {'0': (150, 140, 110), '1': (46, 92, 130), '2': (170, 150, 120), '3': (96, 90, 84)}
cw = W / GW
for y in range(ih):
    gy = min(GH - 1, int(y / S / cw))
    for x in range(iw):
        gx = min(GW - 1, int(x / S / cw)); px[x, y] = col.get(g[gy * GW + gx], (80, 80, 80))
dr = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except Exception:
    f = fs = ImageFont.load_default()
for r in d['roads']:
    dr.line([(x * S, y * S) for x, y in r], fill=(235, 215, 150), width=3)
BC = {'rear': (60, 200, 90), 'mid': (255, 150, 40), 'contested': (255, 90, 90), 'centre': (255, 225, 40)}
for t in d['T']:
    x, y = t['x'] * S, t['y'] * S; c = BC[t['band']]
    if t['band'] == 'centre':
        dr.regular_polygon((x, y, 20), 5, fill=c, outline=(0, 0, 0))
    elif t['ham']:
        dr.ellipse((x - 8, y - 8, x + 8, y + 8), fill=c, outline=(0, 0, 0), width=2)
    else:
        dr.rectangle((x - 11, y - 11, x + 11, y + 11), fill=c, outline=(0, 0, 0), width=2)
PC = [(80, 150, 255), (255, 80, 80), (80, 220, 120), (240, 200, 60), (200, 100, 240), (60, 220, 220), (255, 140, 200), (190, 190, 190)]
for i, (bx, by) in enumerate(d['bases']):
    x, y = bx * S, by * S; dr.rectangle((x - 17, y - 17, x + 17, y + 17), fill=PC[i % 8], outline=(0, 0, 0), width=3); dr.text((x - 5, y - 10), str(i + 1), fill=(0, 0, 0), font=f)
y0 = ih + 8
dr.text((10, y0), f"{d.get('name') or d['k']} - {d['n']} players   ({W}x{H} units)", fill=(255, 255, 255), font=f)
lx = 10
for lab, key, shape in [('REAR villages (safe, High tax)', 'rear', 'c'), ('MIDDLE hamlets (contested)', 'mid', 'c'), ('contested on a route', 'contested', 'c'), ('CENTRE prize town', 'centre', 'p')]:
    dr.ellipse((lx, y0 + 34, lx + 14, y0 + 48), fill=BC[key], outline=(0, 0, 0)); dr.text((lx + 20, y0 + 32), lab, fill=(230, 230, 230), font=fs); lx += 40 + int(dr.textlength(lab, font=fs))
dr.text((lx + 10, y0 + 32), 'square = town, circle = hamlet, tan line = road', fill=(200, 200, 200), font=fs)
img.save(out)
