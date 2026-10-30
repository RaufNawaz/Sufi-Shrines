#!/usr/bin/env python3
"""gen.py KIND ID [ROUND] [PREV] [BAK] -> writes p/<ID>.<KIND>.r<ROUND>.txt and prints its path"""
import json, os, sys
SP=os.path.dirname(os.path.abspath(__file__))
kind,i=sys.argv[1],sys.argv[2]; rnd=sys.argv[3] if len(sys.argv)>3 else "1"
prev=sys.argv[4] if len(sys.argv)>4 else str(int(rnd)-1); bak=sys.argv[5] if len(sys.argv)>5 else "ur"+prev
slug=json.load(open(SP+"/rows.json"))["slugs"].get(i,i)
t=open("%s/%s.md"%(SP,kind),encoding="utf-8").read()
t=t.replace("<ID>",i).replace("<SLUG>",slug).replace("<ROUND>",rnd).replace("<PREV>",prev).replace("<BAK>",bak)
if kind=="V1" and rnd!="1":
    t=t.replace("[from round 2: the previous round's report, entries/descriptions_public/verify/%s.V1.r%s.txt, whose issues were applied]"%(i,"<N-1>"),
      "the previous round's report, entries/descriptions_public/verify/%s.V1.r%s.txt, whose issues and precision notes were applied as exact replacements listed in entries/descriptions_public/verify/%s.V1.r%s.changes.txt (backup before them: /home/claude/bak/%s.md.bak_en%s)"%(i,prev,i,rnd,i,prev))
out="%s/p/%s.%s.r%s.txt"%(SP,i,kind,rnd); open(out,"w",encoding="utf-8").write(t); print(out)
