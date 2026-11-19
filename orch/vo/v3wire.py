#!/usr/bin/env python3
"""voices3 wiring: after orch/vo/v3.py wrote the sheets + maps, (1) the device-speech fallback lines in src/09-audio.js
(PHR_FAC kinds 0-4, PHR_X kinds 5-7, FCRY war cries) for FR DE GB JP are rewritten from tools/voices/phrases.py so the
fallback says the same words as the recordings, (2) tools/voices/patch_map.py rewrites VO_MAP/VOR/VOH/RADT/VOS, (3) the sheet
cache versions (?v=) are bumped so players fetch the new mp3s. usage: python3 orch/vo/v3wire.py"""
import os, re, sys, json, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'voices'))
import phrases as ph
NAT = ['FR', 'DE', 'GB', 'JP']
p = os.path.join(ROOT, 'src', '09-audio.js'); s = open(p, encoding='utf-8').read()
J = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))

def put(s, table, code, val):
    """replace (or add) `code:[...]` inside `const TABLE={...};`"""
    m = re.search(r'const ' + table + r'=\{', s); a = m.end()
    depth, i = 1, a
    while depth:   # find the table's closing brace (strings hold no braces here)
        ch = s[i]; depth += ch == '{'; depth -= ch == '}'; i += 1
    body = s[a:i - 1]
    k = re.search(r'(?:(?<=[{,\s])|^)' + code + r':\[', body)
    if k:
        j = k.end(); d = 1
        while d:
            ch = body[j]; d += ch == '['; d -= ch == ']'; j += 1
        body = body[:k.start()] + code + ':' + val + body[j:]
    else:
        body = body.rstrip() + ',' + code + ':' + val
    return s[:a] + body + s[i - 1:]

for c in NAT:
    P, C = ph.P[c], ph.C[c]
    s = put(s, 'PHR_FAC', c, J([P[k][:3] for k in range(5)]))
    s = put(s, 'PHR_X', c, J([P[k] for k in (5, 6, 7)]))
    s = put(s, 'FCRY', c, J([C[0], C[1], C[2], C[3], None]))
open(p, 'w', encoding='utf-8').write(s)
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'voices', 'patch_map.py')], check=True)

def bump(path, pat):
    t = open(path, encoding='utf-8').read()
    t2, n = re.subn(pat, lambda m: m.group(1) + str(int(m.group(2)) + 1), t)
    assert n >= 1, (path, pat)
    open(path, 'w', encoding='utf-8').write(t2); return n
print('?v= bumped:',
      bump(p, r"(\+'\.mp3\?v=)(\d+)"), bump(p, r"(_r\.mp3\?v=)(\d+)"),
      bump(os.path.join(ROOT, 'src', '09b-radio.js'), r"(_h\.mp3\?v=)(\d+)"),
      bump(os.path.join(ROOT, 'src', '09c-shouts.js'), r"(_s\.mp3\?v=)(\d+)"),
      bump(os.path.join(ROOT, 'src', '09d-announcer.js'), r"(ann_'\+L\+'\.mp3\?v=)(\d+)"))
