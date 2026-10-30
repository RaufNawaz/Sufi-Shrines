#!/usr/bin/env python3
"""cs.py NAME LISTFILE : copy each repo-relative path to /mnt/user-data/outputs/NAME/NN.ext; print commit JSON chunks of <=50 (one per line)"""
import json, os, shutil, sys
REPO="/home/claude/repo"; OUT="/mnt/user-data/outputs"; DEV="C:/Users/g16/Desktop/Shrines Project/"
name,lst=sys.argv[1],sys.argv[2]; rels=[l.strip() for l in open(lst) if l.strip()]
os.makedirs(OUT+"/"+name,exist_ok=True); files=[]; idx=[]
for n,rel in enumerate(rels,1):
    ext=os.path.splitext(rel)[1] or ".txt"; dst="%s/%s/%02d%s"%(OUT,name,n,ext); shutil.copyfile(REPO+"/"+rel,dst)
    files.append({"devicePath":DEV+rel,"stagedPath":dst}); idx.append("%02d%s\t%s"%(n,ext,rel))
open("%s/%s.index.txt"%(os.path.dirname(os.path.abspath(__file__)),name),"w").write("\n".join(idx)+"\n")
for k in range(0,len(files),50): print(json.dumps(files[k:k+50],ensure_ascii=False,separators=(",",":")))
