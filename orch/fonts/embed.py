#!/usr/bin/env python3
"""Write the bundled fonts into index.html's page shell as one <style id="fonts"> block (see orch/fonts/README.md)."""
import base64, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
FACES = [("Saira Condensed", "500 600", "saira-condensed-latin-600-normal.woff2"), ("Saira Condensed", "700", "saira-condensed-latin-700-normal.woff2"),
         ("IBM Plex Mono", "400 500", "ibm-plex-mono-latin-400-normal.woff2")]
css = "".join("@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}\n"
              % (fam, w, base64.b64encode(open(os.path.join(HERE, f), 'rb').read()).decode()) for fam, w, f in FACES)
block = '<style id="fonts">/* bundled fonts, SIL OFL 1.1 - orch/fonts/README.md */\n' + css + '</style>'
p = os.path.join(ROOT, 'index.html'); s = open(p, encoding='utf-8').read()
old = re.compile(r'<style id="fonts">.*?</style>', re.S)
if old.search(s): s = old.sub(lambda m: block, s, 1)
else:
    link = re.compile(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">')
    if not link.search(s): sys.exit('index.html: neither a <style id="fonts"> block nor the old Google Fonts links found')
    s = link.sub(lambda m: block, s, 1)
open(p, 'w', encoding='utf-8').write(s); print('fonts block written (%d bytes)' % len(block))
