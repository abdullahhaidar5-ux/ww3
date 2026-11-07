#!/usr/bin/env python3
"""contact sheet: python3 sheet.py people.json BAKEDIR ids.txt out.png"""
import sys, json, re
from PIL import Image, ImageDraw, ImageFont
src, d, idf, out = sys.argv[1:5]
P = {p['id']: p for p in json.load(open(src))}; ids = [l.strip() for l in open(idf) if l.strip()]
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 15); F2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
cols = 8; tw, th = 252, 315; lab = 52; W = cols * tw + 20; rows = (len(ids) + cols - 1) // cols
S = Image.new('RGB', (W, rows * (th + lab) + 70), (18, 16, 14)); dr = ImageDraw.Draw(S)
dr.text((14, 12), 'WORLD WAR 3 - leaders, generals and cabinet (round 2: MakeHuman CC0 heads, Blender-rendered, painted)', font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 20), fill=(236, 210, 140))
dr.text((14, 40), 'All people fictional. Iran: ONE Supreme Ayatollah; RS, DW and RV each have their own Imam (sub-leaders).', font=F2, fill=(200, 190, 170))
for i, k in enumerate(ids):
    p = P[k]; fn = re.sub(r'[^A-Za-z0-9_-]', '_', k)
    im = Image.open(f'{d}/{fn}.png.paint.png').resize((tw - 8, th - 8), Image.LANCZOS)
    x = 10 + (i % cols) * tw + 4; y = 66 + (i // cols) * (th + lab)
    S.paste(im, (x, y))
    nm = (p.get('ttl') or '') + (' ' if p.get('ttl') else '') + p['nm']; 
    for li, line in enumerate(_ for _ in [nm] if True):
        w = dr.textlength(line, font=F)
        if w > tw - 10:  # wrap in two lines
            parts = line.split(' '); half = len(parts) // 2; ls = [' '.join(parts[:half]), ' '.join(parts[half:])]
        else: ls = [line]
        for q, t in enumerate(ls): dr.text((x + (tw - 8) / 2 - dr.textlength(t, font=F) / 2, y + th - 4 + q * 17), t, font=F, fill=(240, 228, 200))
    dr.text((x + 4, y + th - 4 + 36), f"{p['c']} - {p['post'] or p['role']}"[:34], font=F2, fill=(160, 150, 130))
S.save(out); print(S.size)
