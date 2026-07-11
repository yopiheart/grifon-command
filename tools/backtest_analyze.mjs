// Rubric backtest analysis: Gemini-flash identity scores vs blind Fable judges.
// Usage: node .tmp/backtest_analyze.mjs .tmp/refstack/backtest-blind.json
import { readFileSync, writeFileSync } from 'node:fs';

const sample = JSON.parse(readFileSync('.tmp/refstack/backtest-sample.json', 'utf8'));
const blind = JSON.parse(readFileSync(process.argv[2] ?? '.tmp/refstack/backtest-blind.json', 'utf8'));
const bmap = new Map(blind.map((b) => [b.id, b]));

const rows = sample
  .filter((s) => bmap.has(s.id))
  .map((s) => ({ id: s.id, gemini: s.score, blind: bmap.get(s.id).identity, verdict: bmap.get(s.id).verdict, note: bmap.get(s.id).note }));

const n = rows.length;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const g = rows.map((r) => r.gemini), b = rows.map((r) => r.blind);
const mg = mean(g), mb = mean(b);
const cov = mean(rows.map((r) => (r.gemini - mg) * (r.blind - mb)));
const sd = (a, m) => Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
const corr = cov / (sd(g, mg) * sd(b, mb));
const mae = mean(rows.map((r) => Math.abs(r.gemini - r.blind)));
const bias = mean(rows.map((r) => r.gemini - r.blind));

console.log(`n=${n} corr=${corr.toFixed(2)} MAE=${mae.toFixed(1)} bias(gemini-blind)=${bias.toFixed(1)}`);
console.log(`gemini range ${Math.min(...g)}-${Math.max(...g)} | blind range ${Math.min(...b)}-${Math.max(...b)}`);

// Human truth = the blind PASS/FAIL verdict. Sweep Gemini floors: which floor
// best reproduces the human verdict?
console.log('\nfloor sweep (auto-QA passes if gemini>=floor):');
for (let floor = 60; floor <= 90; floor += 5) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of rows) {
    const autoPass = r.gemini >= floor;
    const humanPass = r.verdict === 'PASS';
    if (autoPass && humanPass) tp++;
    else if (autoPass && !humanPass) fp++;
    else if (!autoPass && !humanPass) tn++;
    else fn++;
  }
  const acc = ((tp + tn) / n * 100).toFixed(0);
  console.log(`  floor ${floor}: acc ${acc}%  falsePass(FP)=${fp}  falseBlock(FN)=${fn}`);
}

console.log('\nworst disagreements:');
rows
  .slice()
  .sort((a, x) => Math.abs(x.gemini - x.blind) - Math.abs(a.gemini - a.blind))
  .slice(0, 8)
  .forEach((r) => console.log(`  ${r.id} gemini=${r.gemini} blind=${r.blind} ${r.verdict} — ${r.note}`));

writeFileSync('.tmp/refstack/backtest-merged.json', JSON.stringify(rows, null, 1));
console.log('\nmerged -> .tmp/refstack/backtest-merged.json');
