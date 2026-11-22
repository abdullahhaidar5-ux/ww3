#!/usr/bin/env python3
"""Make the Battle sim use the bit-exact trigonometry of res://net/det_math.gd (run from the repo root).
   sin( cos( atan2(  ->  DM.dsin( DM.dcos( DM.datan2(   in godot/sim/*.gd (tests excluded); adds the DM preload.
   Safe to run again after the sim lanes change those files (already-converted calls are left alone).
   --check: exit 1 if any engine sin/cos/tan/atan/atan2/asin/acos/pow/exp/log call is left in the sim."""
import re, sys, glob
CALL = re.compile(r'(?<![\w.])(sin|cos|atan2)\(')
BAD = re.compile(r'(?<![\w.])(sin|cos|tan|atan2|atan|asin|acos|pow|exp|log)\(|\*\*|\.angle\(|\.angle_to|\.rotated\(|\.from_angle\(')
left = 0
for p in sorted(glob.glob('godot/sim/*.gd')):
    src = open(p).read()
    out = []
    for line in src.split('\n'):
        code, sep, com = line.partition('#')
        if '--check' not in sys.argv:
            code = CALL.sub(lambda m: 'DM.d' + m.group(1) + '(', code)
        elif BAD.search(code):
            left += 1; print('%s: %s' % (p, line.strip()[:110]))
        out.append(code + sep + com)
    new = '\n'.join(out)
    if 'DM.d' in new and 'const DM = preload' not in new:
        new = re.sub(r'^(extends [^\n]*\n)', r'\1const DM = preload("res://net/det_math.gd")\n', new, count=1, flags=re.M)
    if new != src and '--check' not in sys.argv:
        open(p, 'w').write(new); print('converted ' + p)
if '--check' in sys.argv:
    print('DET-TRIG PASS' if left == 0 else 'DET-TRIG FAIL: %d engine trig/pow calls left in the sim' % left)
    sys.exit(1 if left else 0)
