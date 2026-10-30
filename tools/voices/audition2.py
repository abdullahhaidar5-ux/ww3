#!/usr/bin/env python3
"""Tougher pass speaker audition: every XTTS male studio speaker barks one combat line in a language; reports
median pitch (lower = deeper), toughness proxy after the tough2 chain, DNSMOS P.808 and Whisper read-back error.
usage: python3 tools/voices/audition2.py ar "هجوم! افتحوا النار!"   (output: one line per speaker, best first)"""
import sys, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'orch', 'vo'))
import render as RD
from xt import MALE
lang, text = sys.argv[1], sys.argv[2]
spk = sys.argv[3].split(',') if len(sys.argv) > 3 else MALE
rows = []
for s in spk:
    w = RD.trim(RD.synth('xtts', s, lang, text, 0, 'cry'))
    r = RD.score(w, RD.SR, {'zh-cn': 'zh'}.get(lang, lang), text)
    t = RD.tough(w, RD.SR)
    rows.append((r['p808'] + RD.T2.TOUGH_W * t['tough'] - 2 * r['cer'], s, round(t['f0']), round(t['tough'], 2), round(r['p808'], 2), round(r['cer'], 2)))
    print(*rows[-1][1:], flush=True)
print('--- ranked (score, speaker, f0, tough, p808, cer)')
for x in sorted(rows, reverse=True):
    print(round(x[0], 2), *x[1:])
