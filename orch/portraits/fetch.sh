#!/bin/sh
# fetch the MakeHuman CC0 base mesh + macro targets into $1 (default /tmp/mh). CC0 (released Sept 2020), credit "MakeHuman community".
D=${1:-/tmp/mh}; mkdir -p "$D"; B=https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data
curl -sSf -o "$D/base.obj" "$B/3dobjs/base.obj"
for r in african asian caucasian; do for g in male female; do for a in young old; do curl -sSf -o "$D/$r-$g-$a.target" "$B/targets/macrodetails/$r-$g-$a.target"; done; done; done
