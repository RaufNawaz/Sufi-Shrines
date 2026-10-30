#!/usr/bin/env python3
"""Coordinator helper of the overnight public description run, 28 to 29 October 2026 (RULE 0 copy).

Run in a cloud mirror of the repo (REPO below) when no device_bash is offered; results go back to the PC with
device_commit_files under a fresh stagedPath each time. Subcommands:
  rec ROUND V id...            record verdicts from the first line of verify/<id>.<V>.r<ROUND>.txt (queue `verdict`)
  extract REPORT TAG OUT.json  collect every OLD:/NEW: pair of a verifier report into a change list
  apply id en|ur ROUND JSON    apply a change list (each OLD must occur exactly once), back up the old file to BAK,
                               write verify/<id>.<V1|ur>.r<ROUND>.changes.txt
  commit NAME relpath...       copy files to /mnt/user-data/outputs/NAME/ and print the device_commit_files list
  check ARGS / state id...     run check_public_description.py / queue `resume`
Briefs: docs/prompts/public_description_workers_2026-10-28/.
"""
import json, os, re, shutil, subprocess, sys
REPO="/home/claude/repo"; SP=os.path.dirname(os.path.abspath(__file__)); BAK="/home/claude/bak"
PUB=REPO+"/entries/descriptions_public"; VER=PUB+"/verify"; OUT="/mnt/user-data/outputs"
DEV="C:/Users/g16/Desktop/Shrines Project/"
Q=["python3",REPO+"/pipeline/book_queue/public_description_queue.py"]
os.makedirs(BAK,exist_ok=True)
def first(path):
    t=open(path,encoding="utf-8").read().lstrip()
    m=re.match(r"VERDICT:\s*(PASS|FAIL)",t)
    return m.group(1) if m else None
def pairs(path):
    lines=open(path,encoding="utf-8").read().split("\n"); out=[]
    for k,l in enumerate(lines):
        s=l.strip()
        m=re.match(r'^(?:[-*]\s*)?OLD:\s*(.*)$',s)
        if m:
            old=m.group(1)
            inl=re.match(r'^"(.*)"\s*(?:->)?\s*NEW:\s*"(.*)"\s*$',old)
            if inl: out.append((inl.group(1),inl.group(2))); continue
            for j in range(k+1,min(k+4,len(lines))):
                n=re.match(r'^(?:[-*]\s*)?NEW:\s*(.*)$',lines[j].strip())
                if n:
                    o,nw=old,n.group(1)
                    if len(o)>1 and o[0]==o[-1]=='"' and nw[:1]=='"' and nw[-1:]=='"': o,nw=o[1:-1],nw[1:-1]
                    out.append((o,nw)); break
    return out
cmd=sys.argv[1]; a=sys.argv[2:]
if cmd=="rec":   # rec ROUND V id...
    rnd=a[0]; V=a[1]
    for i in a[2:]:
        f="%s/%s.%s.r%s.txt"%(VER,i,V,rnd); s=first(f)
        if not s: print("NOVERDICT",i,V,rnd); continue
        r=subprocess.run(Q+["verdict",i,V,s,rnd],capture_output=True,text=True)
        print(i,V,"r"+rnd,s,(r.stdout+r.stderr).strip().split(": ",1)[-1][:60])
elif cmd=="extract":  # extract REPORT TAG >> appends to json list file OUT
    rep,tag,outj=a
    lst=json.load(open(outj)) if os.path.exists(outj) else []
    ps=pairs(rep)
    for n,(o,nw) in enumerate(ps,1): lst.append({"old":o,"new":nw,"why":"%s %d"%(tag,n)})
    json.dump(lst,open(outj,"w",encoding="utf-8"),ensure_ascii=False,indent=1); print(os.path.basename(rep),len(ps),"pairs")
elif cmd=="apply":  # apply id en|ur ROUND JSON : changes file verify/<id>.<V1|ur>.r<ROUND>.changes.txt
    i,kind,rnd,js=a
    path=PUB+"/%s%s"%(i,".md" if kind=="en" else ".ur.md")
    ch=json.load(open(js,encoding="utf-8"))
    t=open(path,encoding="utf-8").read(); bad=[]
    for c in ch:
        k=t.count(c["old"])
        if k!=1: bad.append((c.get("why"),k,c["old"][:60]))
    if bad: print("REFUSED",i,bad); sys.exit(1)
    shutil.copyfile(path,"%s/%s%s.bak_%s%d"%(BAK,i,".md" if kind=="en" else ".ur.md",kind,int(rnd)-1))
    lines=[]
    for n,c in enumerate(ch,1):
        t=t.replace(c["old"],c["new"],1); lines.append("%d. %s\nOLD: %s\nNEW: %s\n"%(n,c.get("why",""),c["old"],c["new"]))
    open(path,"w",encoding="utf-8").write(t)
    cf="%s/%s.%s.r%s.changes.txt"%(VER,i,"V1" if kind=="en" else "ur",rnd)
    open(cf,"w",encoding="utf-8").write("Changes applied by the coordinator, exact replacements, each OLD occurring once.\n\n"+"\n".join(lines))
    print("applied",len(ch),i,kind,"r"+rnd)
elif cmd=="commit":  # commit NAME relpath...
    name=a[0]; files=[]
    for rel in a[1:]:
        dst="%s/%s/%s"%(OUT,name,rel); os.makedirs(os.path.dirname(dst),exist_ok=True); shutil.copyfile(REPO+"/"+rel,dst)
        files.append({"devicePath":DEV+rel,"stagedPath":dst})
    print(json.dumps(files,ensure_ascii=False))
elif cmd=="check":
    r=subprocess.run(["python3",REPO+"/pipeline/book_queue/check_public_description.py"]+a,capture_output=True,text=True,cwd=REPO)
    print((r.stdout+r.stderr).strip()); print("exit",r.returncode)
elif cmd=="state":
    for i in a:
        r=subprocess.run(Q+["resume",i],capture_output=True,text=True); print(r.stdout.strip()[:110])
