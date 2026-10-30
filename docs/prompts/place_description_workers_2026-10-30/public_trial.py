#!/usr/bin/env python3
"""Check one public group against its team sections with check_public_description (english-only)."""
import os, re, subprocess, sys, shutil, tempfile
g = sys.argv[1]
W = "/home/claude/work/public"
team = open(f"{W}/team_{g}.md").read().strip()
pub = open(f"{W}/pub_{g}.md").read().strip()
bib = "## Bibliography\n\n- placeholder"
root = tempfile.mkdtemp()
repo = "/home/claude/repo"
os.makedirs(f"{root}/entries/places_public", exist_ok=True)
os.makedirs(f"{root}/entries/places", exist_ok=True)
open(f"{root}/entries/places/trial.md", "w").write(team + "\n\n" + bib + "\n")
open(f"{root}/entries/places_public/trial.md", "w").write(pub + "\n\n" + bib + "\n")
code = f"""
import sys; sys.path.insert(0, '{repo}/pipeline/book_queue'); sys.path.insert(0, '{repo}/pipeline')
import check_public_description as c
c.TEAM_DIR='{root}/entries/places'; c.PUB_DIR='{root}/entries/places_public'
errs=c.check('trial', english_only=True, quiet=False)
errs=[e for e in errs if not e.startswith(('L1','B1'))]
print('\\n'.join('   '+e for e in errs) or '   no errors outside L1/B1')
t=len(re.sub(r'\\(.*?\\)','',open(c.TEAM_DIR+'/trial.md').read())) if False else None
"""
subprocess.run([sys.executable, "-c", "import re\n" + code])
tp = len(team); pp = len(pub)
print(f"   lengths: team {tp:,} chars, public {pp:,} chars, ratio {pp/tp:.2f} (raw, citations included in team)")
