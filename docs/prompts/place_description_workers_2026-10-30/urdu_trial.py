#!/usr/bin/env python3
"""Run check_public_description's Urdu checks (U1 to U9) on one group."""
import sys
sys.path.insert(0, "/home/claude/repo/pipeline/book_queue"); sys.path.insert(0, "/home/claude/repo/pipeline")
import check_public_description as c
g = sys.argv[1]
en = open(f"/home/claude/work/public/en_{g}.md").read().strip() + "\n\n## Bibliography\n\n- x\n"
ur = open(f"/home/claude/work/public/ur_{g}.md").read()
errs = c.check_urdu("lahore", en, ur)
print("\n".join("   " + e for e in errs) or "   ok: no Urdu errors")
