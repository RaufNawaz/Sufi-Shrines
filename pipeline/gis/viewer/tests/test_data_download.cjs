// The table behind the map (added 31 October 2026): download the table, codebook, do-file and R
// script at three units, then run the do-file in Stata and the script in R on the downloaded table,
// and check that every row arrives, every column is labelled, the long names are renamed as the
// codebook says, and values survive the trip. Needs Stata and R (paths as in check_stata_r.py).
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/test_data_download.cjs pipeline/gis/viewer/index.html <outdir>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(
  path.resolve(process.argv[2] || 'pipeline/gis/viewer/index.html'),
).href;
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'viewer-data-test'));
const STATA = process.env.SHRINES_STATA || 'C:\\Program Files\\StataNow19\\StataMP-64.exe';
const RSCRIPT = process.env.SHRINES_RSCRIPT || 'C:\\Program Files\\R\\R-4.6.1\\bin\\Rscript.exe';
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (c, msg) => {
  console.log((c ? 'PASS ' : 'FAIL ') + msg);
  if (!c) fails.push(msg);
};
// A CSV reader for the checks (quoted fields, doubled quotes).
function parseCSV(t) {
  const rows = [];
  let row = [],
    f = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') ((f += '"'), i++);
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') (row.push(f), (f = ''));
    else if (c === '\n') (row.push(f.replace(/\r$/, '')), rows.push(row), (row = []), (f = ''));
    else f += c;
  }
  if (f || row.length) (row.push(f), rows.push(row));
  return rows;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  const units = ['district', 'tehsil', 'hex'];
  for (const u of units) {
    await page.selectOption('#dlUnit', u);
    for (const k of ['csv', 'codebook', 'do', 'r']) {
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.click(`[data-dl="${k}"]`),
      ]);
      await dl.saveAs(path.join(OUT, dl.suggestedFilename()));
    }
  }
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();

  for (const u of units) {
    const csv = parseCSV(fs.readFileSync(path.join(OUT, `shrines_${u}.csv`), 'utf8')),
      head = csv[0],
      n = csv.length - 1,
      cb = parseCSV(
        fs.readFileSync(path.join(OUT, `shrines_${u}_codebook.csv`), 'utf8').replace(/^\ufeff/, ''),
      ),
      cbRows = cb.slice(1).filter((r) => r.length > 1),
      stataNames = cbRows.map((r) => r[1]);
    check(
      cbRows.length === head.length && cbRows.every((r, i) => r[0] === head[i] && r[2]),
      `${u}: the codebook has every column of the table, in order, each with a label (${head.length})`,
    );
    check(
      stataNames.every((s) => s.length <= 32) && new Set(stataNames).size === stataNames.length,
      `${u}: Stata names are unique and at most 32 characters`,
    );

    // Stata: run the do-file, then write every variable's name and label, and N.
    const tail = `
file open fh using "stata_${u}_out.tsv", write replace
foreach v of varlist _all {
    local l : variable label \`v'
    file write fh "\`v'" _tab \`"\`l'"' _n
}
file write fh "_N" _tab "\`=_N'" _n
file close fh
quietly ds, has(type numeric)
format \`r(varlist)' %24.17g
export delimited using "stata_${u}_data.csv", replace
`;
    fs.writeFileSync(
      path.join(OUT, `run_${u}.do`),
      fs.readFileSync(path.join(OUT, `shrines_${u}.do`), 'utf8') + tail,
    );
    fs.rmSync(path.join(OUT, `stata_${u}_out.tsv`), { force: true });
    spawnSync(STATA, ['/e', 'do', `run_${u}.do`], { cwd: OUT, timeout: 600000 });
    const outF = path.join(OUT, `stata_${u}_out.tsv`);
    if (!fs.existsSync(outF)) {
      const log = path.join(OUT, `run_${u}.log`);
      check(
        false,
        `${u}: Stata ran the do-file\n${fs.existsSync(log) ? fs.readFileSync(log, 'utf8').slice(-800) : 'no log'}`,
      );
      continue;
    }
    const so = fs
      .readFileSync(outF, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => l.split('\t'));
    const sN = +so.find((r) => r[0] === '_N')[1],
      sv = so.filter((r) => r[0] !== '_N');
    check(sN === n, `${u}: Stata reads all ${n} rows (asserted in the do-file too)`);
    check(
      sv.length === head.length && sv.every((r, i) => r[0] === stataNames[i] && r[1].length > 0),
      `${u}: Stata has every column under its codebook name, each labelled (${sv.filter((r) => r[1]).length} of ${head.length})`,
    );
    const lab = Object.fromEntries(cbRows.map((r) => [r[1], r[2]]));
    const same = sv.filter((r) => r[1] === lab[r[0]].slice(0, 80)).length;
    check(
      same === sv.length,
      `${u}: Stata's labels are the codebook's (${same} of ${sv.length}; $ and quotes intact)`,
    );
    // Values: every numeric cell Stata exported equals the table's, to 1e-6 relative.
    const sd = parseCSV(fs.readFileSync(path.join(OUT, `stata_${u}_data.csv`), 'utf8'));
    let worst = 0,
      cells = 0,
      miss = 0;
    for (let i = 1; i < Math.min(sd.length, csv.length); i++)
      for (let j = 0; j < head.length; j++) {
        const a = csv[i][j],
          b = sd[i][j];
        if (a === '' || isNaN(+a)) {
          if (a === '' && b !== '') miss++;
          continue;
        }
        cells++;
        worst = Math.max(worst, Math.abs(+a - +b) / Math.max(1e-12, Math.abs(+a)));
      }
    check(
      worst < 1e-12 && miss === 0 && cells > 0,
      `${u}: ${cells} numeric cells equal in Stata, stored as double (worst ${worst.toExponential(1)}), missing stays missing`,
    );

    // R: source the script, then write N, the labelled columns and a checksum of every number.
    const rt = `
source("shrines_${u}.R")
lab <- sapply(names(d), function(k) if (is.null(attr(d[[k]], "label"))) "" else attr(d[[k]], "label"))
num <- sapply(d, is.numeric)
writeLines(c(nrow(d), sum(lab != ""), ncol(d), format(sum(abs(unlist(d[num])), na.rm = TRUE), digits = 15)), "r_${u}_out.txt")
`;
    fs.writeFileSync(path.join(OUT, `run_${u}.R`), rt);
    fs.rmSync(path.join(OUT, `r_${u}_out.txt`), { force: true });
    const r = spawnSync(RSCRIPT, [`run_${u}.R`], { cwd: OUT, timeout: 600000, encoding: 'utf8' });
    const rf = path.join(OUT, `r_${u}_out.txt`);
    if (!fs.existsSync(rf)) {
      check(false, `${u}: R ran the script\n${(r.stderr || '').slice(-600)}`);
      continue;
    }
    const [rn, rl, rc, rsum] = fs.readFileSync(rf, 'utf8').trim().split(/\r?\n/);
    let jsum = 0;
    const numCol = head.map(
      (_, j) =>
        csv.slice(1).every((row) => row[j] === '' || !isNaN(+row[j])) &&
        csv.slice(1).some((row) => row[j] !== ''),
    );
    for (let i = 1; i < csv.length; i++)
      for (let j = 0; j < head.length; j++)
        if (numCol[j] && csv[i][j] !== '') jsum += Math.abs(+csv[i][j]);
    check(
      +rn === n && +rl === head.length && +rc === head.length,
      `${u}: R reads ${rn} rows and ${rc} columns, ${rl} labelled`,
    );
    check(
      Math.abs(+rsum - jsum) / jsum < 1e-9,
      `${u}: the sum of every number agrees in R (${rsum} against ${jsum.toPrecision(15)})`,
    );
  }
  console.log(fails.length ? `\n${fails.length} FAILED` : `\nALL PASS (files in ${OUT})`);
  process.exit(fails.length ? 1 : 0);
})();
