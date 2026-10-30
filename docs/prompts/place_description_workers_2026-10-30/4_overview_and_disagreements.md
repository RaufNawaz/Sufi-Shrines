You write two sections of the Lahore place article (team version) for the Sufi-Shrines heritage website: the ## Overview at the top and the ## Where the Sources Disagree near the end. The body sections are already composed.

Read first:
1. /home/claude/repo/docs/prompts/PLACE_DESCRIPTION_BRIEF.md and /home/claude/repo/docs/prompts/DESCRIPTION_REWRITE_BRIEF.md ("Citations", "Shape", "What stays out"); /home/claude/repo/docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md (prose is English only).
2. The composed body: /home/claude/work/compose/composed_A.md, composed_B.md, composed_C.md, composed_D.md (history; saints and communities; endowments and the state; festivals, verse and the books). A and D are being edited in parallel to remove Urdu from prose; read them for content only, do not edit them.
3. The five parts' ## Where the Sources Disagree sections, in /home/claude/repo/entries/places/drafts/lahore.part1.md to lahore.part5.md, and the parts' notes files beside them.

WRITE /home/claude/work/compose/composed_O.md with exactly two sections:

## Overview
Four to seven paragraphs that introduce Lahore as the books present it: what kind of place it is in their pages, its long history in a few strokes, its landscape of saints, temples and gurdwaras, its many communities, the economy and politics of its holy places, its festivals and its poetry. Every factual sentence carries a citation copied EXACTLY (title and page reference, character for character) from a sentence of the composed body that makes the same claim; add no claim that is not in the body. English only, no Arabic script, no em or en dashes in prose, British spelling, one paragraph per line with a blank line between.

## Where the Sources Disagree
Every disagreement from the five parts' sections, de-duplicated (one "- " item per disagreement, every side with its citation copied exactly, no verdict), plus the disagreements the composers found while merging, which are these (find each side's sentence and citation in the composed body and cite exactly):
- Lahore's founding: Bhandari's founder Lo, Chishti's two versions (three sons Lo, an unreadable name and Rao; two sons Kushu and Lohu), Khalid's Luv and Kush.
- How long the Ghaznavid line ruled at Lahore: Bhandari's 38 years and 28 years for Khusraw Malik, against Chishti's seven years for Khusrau Shah (a numeral he marks uncertain).
- Humayun's return: Bhandari says Lahore was taken without a fight; Chishti says Bairam Khan overcame the governor Tatar Khan.
- Lahore under Akbar: "the capital" (Chishti), "temporarily shifted" capital (the Madho Lal Hussain translator), "regional" and "seasonal" capital (Kugle).
- Who damaged the monuments at the Sikh conquest: Chishti blames Lehna Singh and says the elders invited Ranjit Singh; Khalid says Ranjit Singh was greeted enthusiastically; Lal lists tombs stripped on Ranjit Singh's order.
Within an item, English only: give the gist of any Urdu in English.

CHECK: assemble a trial article and run the checker:
  cd /home/claude/work/compose && python3 - <<'PY'
import re
o=open('composed_O.md').read()
ov=o.split('## Where the Sources Disagree')[0].strip(); dis='## Where the Sources Disagree'+o.split('## Where the Sources Disagree')[1]
body=[open(f'composed_{g}.md').read().strip() for g in 'ABCD']
bib=set()
for n in range(1,6):
    t=open(f'/home/claude/repo/entries/places/drafts/lahore.part{n}.md').read()
    for l in t.split('## Bibliography')[1].split('\n'):
        if l.startswith('- '): bib.add(l.strip())
art='\n\n'.join([ov]+body+[dis.strip(),'## Bibliography\n\n'+'\n'.join(sorted(bib))])+'\n'
import os; os.makedirs('/tmp/trial',exist_ok=True); open('/tmp/trial/lahore.md','w').write(art)
PY
  cd /home/claude/repo && python3 pipeline/book_queue/check_place_description.py team lahore --draft-dir /tmp/trial
Any error that points into YOUR two sections must be fixed (errors elsewhere belong to the parallel editors; list them in your reply). Reply with your sections' lengths, the number of disagreement items, and any error outside your sections.
