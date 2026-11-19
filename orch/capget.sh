#!/bin/bash
# usage: orch/capget.sh <run id> <outdir>   -> prints one line per scenario from the Cap test artifacts (needs gh)
R=$1; D=${2:-/tmp/capres/$1}; mkdir -p $D; cd $D
for id in $(gh api repos/abdullahhaidar5-ux/ww3/actions/runs/$R/artifacts --jq '.artifacts[].id'); do gh api repos/abdullahhaidar5-ux/ww3/actions/artifacts/$id/zip > a$id.zip && unzip -oq a$id.zip -d d$id; done
python3 - <<'P'
import json,glob
for f in sorted(glob.glob('d*/cap.json')):
    r=json.load(open(f));print(r['scenario'],'bench',r['bench'],'med',r['frameMed'],'p95',r['frameP95'],'p99',r['frameP99'],'sim',r['simMed'],'calls',r['drawCalls'],'units',r['unitsAtEnd'],'norm',round(r['frameMed']/r['bench'],2))
P
