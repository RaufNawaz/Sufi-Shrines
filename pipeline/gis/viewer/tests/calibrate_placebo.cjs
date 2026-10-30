// Calibration of the viewer's p-values against spatially smooth noise (docs/research/VIEWER_REVIEW_2026-10-30.md,
// "Calibration of the headline p"). Regresses an outcome on pure noise many times and reports the share of runs with
// p < 0.05 under HC1, each Conley cutoff, the spatial-noise placebo and the headline p; a calibrated test gives ~5%.
// Noise generators: "passes" (neighbour averaging 0, 3 and 8 times) or "kernel" (Gaussian over distance, 100 and
// 250 km; a different process from the placebo's neighbour family). Seeded, so a re-run gives the same table.
// From the repo root:
//   NODE_PATH=node_modules node pipeline/gis/viewer/tests/calibrate_placebo.cjs pipeline/gis/viewer/index.html district literacy 100 passes
// Slow: about 10 minutes for 100 draws per cell at tehsil.
const path = require('path');
const { chromium } = require('playwright');
const url = require('url').pathToFileURL(path.resolve(process.argv[2])).href;
const unitArg = process.argv[3] || 'district',
  yArg = process.argv[4] || 'literacy',
  draws = +(process.argv[5] || 200);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(url);
  await p.waitForFunction(() => typeof V !== 'undefined' && V && V.kind);
  const r = await p.evaluate(
    ({ u, y, draws, process_mode }) => {
      const fs = feats(u),
        nbAll = contiguity(u),
        rnd = mulberry32(7);
      const gauss = () => {
        const a = rnd() || 1e-12,
          c = rnd();
        return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * c);
      };
      const out = {};
      const C = coordsOf(u);
      const kern = (z, bw) =>
        z.map((_, i) => {
          let s = 0,
            w = 0;
          for (let j = 0; j < z.length; j++) {
            const dy = (C[i][1] - C[j][1]) * KM,
              dx = (C[i][0] - C[j][0]) * KM * Math.cos(((C[i][1] + C[j][1]) * Math.PI) / 360),
              k = Math.exp(-(dx * dx + dy * dy) / (2 * bw * bw));
            s += k * z[j];
            w += k;
          }
          return s / w;
        });
      for (const passes of process_mode === 'kernel' ? [100, 250] : [0, 3, 8]) {
        let rej = { hc1: 0, head: 0, placebo: 0, k50: 0, k100: 0, k200: 0, k500: 0 },
          ok = 0;
        for (let t = 0; t < draws; t++) {
          let z = fs.map(() => gauss());
          if (process_mode === 'kernel') z = kern(z, passes);
          else
            for (let s = 0; s < passes; s++)
              z = z.map((v, i) => {
                const a = nbAll[i];
                if (!a.length) return v;
                let m = v;
                for (const j of a) m += z[j];
                return m / (a.length + 1);
              });
          // put the noise into the data under a temporary key
          fs.forEach((f, i) => (f.p.__noise = z[i]));
          CJV.__noise = { key: '__noise', label: 'noise', group: 'x', units: [u] };
          const spec = {
            statement: 'placebo',
            unit: u,
            y: { key: y, tf: 'none' },
            x: [{ key: '__noise', tf: 'none', sign: '0' }],
            c: [],
            model: 'ols',
            se: 'hc1',
            exposure: null,
            weights: 'contig',
            k: 6,
            perms: 99,
            mperms: 99,
            seed: 1,
          };
          const res = runSpec(spec, u, false);
          if (res.error) continue;
          ok++;
          const x = res.terms[1];
          if (x.pR < 0.05) rej.hc1++;
          if (x.pH < 0.05) rej.head++;
          if (x.placebo && x.placebo.p < 0.05) rej.placebo++;
          res.cuts.forEach((c, ci) => x.pK[ci] != null && x.pK[ci] < 0.05 && rej['k' + c]++);
        }
        out['passes_' + passes] = Object.fromEntries(
          Object.entries(rej)
            .map(([k, v]) => [k, +(v / ok).toFixed(3)])
            .concat([['draws', ok]]),
        );
      }
      return out;
    },
    { u: unitArg, y: yArg, draws, process_mode: process.argv[6] || 'passes' },
  );
  console.log(unitArg, yArg, JSON.stringify(r, null, 1));
  await b.close();
})();
