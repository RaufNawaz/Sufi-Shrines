#!/usr/bin/env python3
"""Coverage check for a composed group: no citation, verse or section limit lost."""
import re, sys, collections
g = sys.argv[1]
bundle = open(f"/home/claude/work/compose/bundle_{g}.md", encoding="utf-8").read()
comp = open(f"/home/claude/work/compose/composed_{g}.md", encoding="utf-8").read()
CITE = re.compile(r"\(([^()]*\*[^*()]+\*[^()]*(?:\([^()]*\)[^()]*)*)\)")  # title may not contain parens: [^*]+ let one match swallow the prose between two citations
def cites(t):
    out = collections.Counter()
    for m in CITE.finditer(t):
        for part in m.group(1).split(";"):
            tm = re.search(r"\*([^*]+)\*\s*,?\s*(.*)", part.strip())
            if tm and re.match(r"pp?\. ", tm.group(2).strip()):
                out[(tm.group(1).strip(), re.sub(r"\s+", " ", tm.group(2).strip()))] += 1
            elif not tm and re.match(r"(pp?\.|folio)", part.strip()):
                pass
    return out
errs = []
b, c = cites(bundle), cites(comp)
for k in b:
    if k not in c:
        errs.append("citation missing: (*%s*, %s)" % k)
ARABIC = re.compile(r"[؀-ۿ]")
paras = [p.strip() for p in re.split(r"\n\s*\n", bundle) if p.strip()]
for p in paras:
    lines = p.split("\n")
    if len(lines) > 1 and all(ARABIC.search(l) and not re.search(r"[A-Za-z]", l) for l in lines):
        if p not in comp:
            errs.append("verse paragraph lost or changed: %r" % p[:80])
for sec in re.split(r"(?m)^(?=## )", comp):
    if len(sec) > 40000:
        errs.append("section too long (%d): %s" % (len(sec), sec.split("\n")[0]))
    if sec.strip() and not sec.startswith("## "):
        errs.append("text before the first ## heading")
prose = CITE.sub("", comp)
for m in re.finditer(r"[–—]", prose):
    errs.append("dash in prose: %r" % prose[max(0, m.start()-40):m.end()+40])
if "###" in comp:
    errs.append("### heading used")
print("\n".join(errs[:60]) if errs else "OK  %d citations kept, %d chars" % (len(b), len(comp)))
sys.exit(1 if errs else 0)
