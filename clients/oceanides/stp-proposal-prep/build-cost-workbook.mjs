import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile, FileBlob } from '@oai/artifact-tool';

// Local concept-stage cost worksheet. No supplier prices or performance claims.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const qaDir = path.join(root, '.tmp/oceanides-stp-proposal-prep/workbook');
const outputFile = path.join(here, 'output/xlsx/Oceanides-STP-Three-Year-Cost-Worksheet-2026.xlsx');
const moneyFormat = '#,##0;(#,##0);"-"';
const phpFormat = '"PHP "#,##0;("PHP "#,##0);"PHP -"';
const colors = { navy: '#0A1F45', blue: '#1C63AD', input: '#0000FF', ink: '#111111', pale: '#F2F6FC', amber: '#FFF2CC', muted: '#526175', red: '#9C0006', redFill: '#FCE4D6' };
const sites = [
  { name: 'Maynilad building', note: 'Current building. Discharge route and required limits need written confirmation.' },
  { name: 'Carmona building', note: 'Reported capacity: approximately 30 m3/day. Unconfirmed. Not a design basis.' },
  { name: 'Carmona subdivision', note: 'Reported capacity: approximately 150 m3/day. Unconfirmed. Not a design basis.' },
];
const capexItems = ['Treatment equipment', 'Civil and structural works', 'Electrical and piping works', 'Engineering and design', 'Commissioning and initial testing', 'Approvals and other site works', 'Transport and mobilization', 'Other installed costs'];
const annualItems = ['Liquid wastewater hauling', 'Sludge and screenings disposal', 'Sewer / wastewater service fees', 'Power', 'Labor or operator', 'Maintenance and service', 'Consumables', 'Laboratory testing', 'Other ongoing costs'];
const nonannualItems = ['Major equipment replacements', 'Overhaul', 'Other nonannual costs'];
const inputAddresses = ['C25:C32', 'C38:E46', 'C51:E59', 'C64:D66'];
const bases = ['Actual', 'Quote', 'Estimate', 'N/A confirmed', 'Mixed (see source)'];
const wb = Workbook.create();
await fs.mkdir(qaDir, { recursive: true });
await fs.mkdir(path.dirname(outputFile), { recursive: true });

function text(sheet, address, value) { sheet.getRange(address).values = [[value]]; }
function formula(sheet, address, value) { sheet.getRange(address).formulas = [[value]]; }
function section(sheet, row, heading) {
  text(sheet, `B${row}`, heading);
  sheet.getRange(`B${row}:H${row}`).format = { fill: colors.navy, font: { name: 'Corbel', size: 11, bold: true, color: '#FFFFFF' } };
  sheet.getRange(`B${row}:H${row}`).format.rowHeight = 24;
}
function header(sheet, row, middle) {
  const labels = ['Cost item', ...middle, '', 'Source or reference', 'Data basis'];
  sheet.getRange(`B${row}:H${row}`).values = [labels];
  sheet.getRange(`B${row}:E${row}`).format = { fill: colors.blue, font: { name: 'Corbel', size: 11, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center' };
  sheet.getRange(`G${row}:H${row}`).format = { fill: colors.blue, font: { name: 'Corbel', size: 11, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' };
  sheet.getRange(`B${row}:H${row}`).format.rowHeight = 25;
}
function inputBlock(sheet, start, items, numericColumns) {
  sheet.getRange(`B${start}:B${start + items.length - 1}`).values = items.map(x => [x]);
  const last = start + items.length - 1;
  const numbers = sheet.getRange(`${numericColumns[0]}${start}:${numericColumns.at(-1)}${last}`);
  numbers.format = { fill: colors.amber, font: { name: 'Corbel', size: 11, color: colors.input }, horizontalAlignment: 'right' };
  numbers.setNumberFormat(moneyFormat);
  // Decimal costs remain editable. Formula guards and native conditional rules
  // expose negatives/text instead of silently converting bad input to zero.
  numbers.conditionalFormats.addCustom(`AND(${numericColumns[0]}${start}<>"",OR(NOT(ISNUMBER(${numericColumns[0]}${start})),${numericColumns[0]}${start}<0))`, { fill: colors.redFill, font: { color: colors.red, bold: true } });
  const sources = sheet.getRange(`G${start}:H${last}`);
  sources.format.font = { name: 'Corbel', size: 11, color: colors.input };
  sources.format.fill = colors.pale;
  sheet.getRange(`H${start}:H${last}`).dataValidation = { rule: { type: 'list', values: bases }, errorAlert: { style: 'stop', title: 'Select a data basis', message: 'Select the actual, quoted, estimated, confirmed N/A or mixed basis. Map mixed periods in the source field.' } };
}
function subtotal(sheet, row, first, last, columns) {
  text(sheet, `B${row}`, 'Subtotal');
  sheet.getRange(`B${row}:E${row}`).format = { fill: colors.pale, font: { name: 'Corbel', size: 11, bold: true, color: colors.ink }, borders: { top: { style: 'thin', color: colors.blue } } };
  for (const col of columns) formula(sheet, `${col}${row}`, `=IF(AND(COUNT(${col}${first}:${col}${last})=${last-first+1},COUNTIFS(${col}${first}:${col}${last},"<0")=0),SUM(${col}${first}:${col}${last}),"")`);
  sheet.getRange(`C${row}:E${row}`).setNumberFormat(phpFormat);
}

for (const site of sites) {
  const s = wb.worksheets.add(site.name);
  s.showGridLines = false;
  s.tabColor = colors.navy;
  s.getRange('B1:H79').format = { font: { name: 'Corbel', size: 11, color: colors.ink }, verticalAlignment: 'center', rowHeight: 21 };
  const widths = { A: 3, B: 38, C: 18, D: 18, E: 25, F: 3, G: 43, H: 20 };
  for (const [col, width] of Object.entries(widths)) s.getRange(`${col}1:${col}79`).format.columnWidth = width;
  text(s, 'B2', `Oceanides STP cost comparison: ${site.name}`);
  s.getRange('B2').format.font = { name: 'Century Gothic', size: 17, color: colors.navy, bold: true };
  s.getRange('B2:H2').format.rowHeight = 28;
  s.getRange('B3:H3').format.borders = { bottom: { style: 'thin', color: colors.blue } };
  text(s, 'B4', site.note);
  s.getRange('B4').format.font = { name: 'Corbel', size: 11, italic: true, color: colors.muted };
  text(s, 'B5', 'Concept worksheet. No lab data, confirmed flow, site plans, supplier quotation or engineering design supplied.');
  s.getRange('B5').format.font = { name: 'Corbel', size: 11, color: colors.muted };
  text(s, 'B7', 'Three-year comparison (PHP)');
  s.getRange('B7').format.font = { name: 'Corbel', size: 11, bold: true, color: colors.blue };
  const summary = [['Current setup, three-year cost'], ['Proposed setup, three-year cost'], ['Current less proposed cost'], ['Difference as % of current cost'], ['Proposed installed CAPEX'], ['Comparison'], ['Input status']];
  s.getRange('B8:B14').values = summary;
  formula(s, 'E8', '=IF(AND(OR(C18="VAT inclusive",C18="VAT exclusive"),COUNT(C47:E47)=3,ISNUMBER(C67)),SUM(C47:E47,C67),"")');
  formula(s, 'E9', '=IF(AND(OR(C18="VAT inclusive",C18="VAT exclusive"),ISNUMBER(C33),COUNT(C60:E60)=3,ISNUMBER(D67)),SUM(C33,C60:E60,D67),"")');
  formula(s, 'E10', '=IF(COUNT(E8:E9)=2,E8-E9,"")');
  formula(s, 'E11', '=IF(COUNT(E8:E9)=2,IF(E8=0,"n.a.",E10/E8),"")');
  formula(s, 'E12', '=IF(ISNUMBER(C33),C33,"")');
  formula(s, 'E13', '=IF(ISNUMBER(E10),IF(E10>0,"Proposed cost lower",IF(E10<0,"Proposed cost higher","Equal cost")),"Awaiting cost data")');
  const refs = inputAddresses.join(',');
  const negs = inputAddresses.map(a => `COUNTIFS(${a},"<0")`).join('+');
  formula(s, 'E14', `=IF(COUNTA(${refs})=0,"Missing cost inputs",IF(OR(COUNT(${refs})<>COUNTA(${refs}),${negs}>0),"Invalid cost input",IF(COUNT(${refs})<68,"Missing cost inputs",IF(C18="","Missing VAT basis",IF(OR(C18="VAT inclusive",C18="VAT exclusive"),"Numeric inputs complete","Invalid VAT basis")))))`);
  s.getRange('E8:E12').setNumberFormat(phpFormat);
  s.getRange('E11').setNumberFormat('0.0%;(0.0%);"-"');
  s.getRange('B11:E11').format.font.italic = true;
  s.getRange('E8:E14').format.horizontalAlignment = 'right';
  s.getRange('B10:E10').format.fill = colors.pale;
  s.getRange('B10:E10').format.font.bold = true;
  s.getRange('E14').conditionalFormats.add('containsText', { text: 'Invalid', format: { fill: colors.redFill, font: { color: colors.red, bold: true } } });
  s.getRange('E14').conditionalFormats.add('containsText', { text: 'Missing', format: { fill: colors.amber, font: { color: colors.muted } } });
  text(s, 'G10', 'Positive difference = proposed cost is lower.');
  text(s, 'G11', 'Negative difference = proposed cost is higher.');
  text(s, 'G12', 'Zero current cost makes the percentage n.a.');
  text(s, 'B16', 'Enter every cost in PHP. Enter 0 only when confirmed not applicable. Blank means unknown.');
  text(s, 'B17', 'Blue text is editable. Black text is calculated. Estimates need a source and an explicit data basis.');
  text(s, 'B18', 'VAT basis for all cost inputs');
  s.getRange('C18').format = { fill: colors.amber, font: { name: 'Corbel', size: 11, color: colors.input } };
  s.getRange('C18').dataValidation = { rule: { type: 'list', values: ['VAT inclusive', 'VAT exclusive'] }, errorAlert: { style: 'stop', title: 'Choose one VAT basis', message: 'Use VAT inclusive or VAT exclusive consistently across all costs.' } };
  text(s, 'G18', 'Use one consistent VAT basis.');
  text(s, 'B19', 'Comparison period / start date');
  s.getRange('C19:E19').format = { fill: colors.pale, font: { name: 'Corbel', size: 11, color: colors.input } };
  text(s, 'G19', 'Specify the periods before client submission.');
  text(s, 'B21', 'Sources: cite the document, quote number and date. Map each year to its source and actual, quote or estimate basis.');
  s.getRange('B21').format.font = { name: 'Corbel', size: 11, italic: true, color: colors.muted };
  text(s, 'B22', 'If periods use different bases, select Mixed (see source) and identify the basis for each period in the source field.');
  s.getRange('B22').format.font = { name: 'Corbel', size: 11, italic: true, color: colors.muted };
  section(s, 23, 'Proposed installed CAPEX');
  header(s, 24, ['Amount (PHP)', '', '']);
  inputBlock(s, 25, capexItems, ['C']);
  subtotal(s, 33, 25, 32, ['C']);
  text(s, 'G33', 'Exclude costs already included in another quote line.');
  section(s, 36, 'Current setup: annual operating costs (PHP per year)');
  header(s, 37, ['Year 1', 'Year 2', 'Year 3']);
  inputBlock(s, 38, annualItems, ['C', 'D', 'E']);
  subtotal(s, 47, 38, 46, ['C', 'D', 'E']);
  text(s, 'G47', 'Use recent bills to support the current setup.');
  section(s, 49, 'Proposed setup: annual operating costs (PHP per year)');
  header(s, 50, ['Year 1', 'Year 2', 'Year 3']);
  inputBlock(s, 51, annualItems, ['C', 'D', 'E']);
  subtotal(s, 60, 51, 59, ['C', 'D', 'E']);
  text(s, 'G60', 'STP installation does not establish exemption from fees.');
  section(s, 62, 'Additional nonannual costs over the whole three-year period (PHP)');
  header(s, 63, ['Current', 'Proposed', '']);
  inputBlock(s, 64, nonannualItems, ['C', 'D']);
  subtotal(s, 67, 64, 66, ['C', 'D']);
  text(s, 'G67', 'Do not repeat annual costs or installed CAPEX.');
  text(s, 'B70', 'Model limits');
  s.getRange('B70').format.font = { name: 'Corbel', size: 11, bold: true, color: colors.blue };
  const notes = [
    'Simple undiscounted cost comparison. This is not a final quotation or a treatment-performance guarantee.',
    'Year 1, Year 2 and Year 3 are consecutive 12-month periods. Enter annual totals, not quarterly or monthly bills.',
    'Enter quoted or evidenced increases directly in the later-year columns. No inflation or finance rate is assumed.',
    'Financing, taxes beyond the selected VAT basis and discounting require a separate agreed cash-flow analysis.',
    'No payback period is calculated. Savings and payback need confirmed scope, cash-flow timing and operating data.',
    'Keep actual bills, supplier quotes and estimates distinct. An estimate is not proof of savings.',
    'Check power, staffing, maintenance, testing and waste-removal assumptions with the proposed technical partner.',
    'Numeric input status does not verify engineering suitability, price accuracy, source completeness or compliance.',
  ];
  s.getRange('B71:B78').values = notes.map(x => [x]);
  s.getRange('B71:B78').format.font = { name: 'Corbel', size: 11, color: colors.muted };
  s.freezePanes.freezeRows(7);
}

function read(sheetName, address) { return wb.worksheets.getItem(sheetName).getRange(address).values[0][0]; }
function assertEqual(actual, expected, label) {
  if (actual !== expected && !(expected === '' && (actual === null || actual === undefined))) throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function fillCosts(sheet, value) {
  for (const addr of inputAddresses) sheet.getRange(addr).values = [[value]];
  text(sheet, 'C18', 'VAT inclusive');
}

// Meaningful fixture values are restored to blank before the only final export.
const testResults = [];
const first = wb.worksheets.getItem(sites[0].name);
assertEqual(read(sites[0].name, 'E8'), '', 'Blank baseline');
assertEqual(read(sites[0].name, 'E9'), '', 'Blank proposal');
assertEqual(read(sites[0].name, 'E10'), '', 'Blank difference');
testResults.push('All blank inputs keep monetary outputs blank.');
fillCosts(first, 0);
assertEqual(read(sites[0].name, 'E8'), 0, 'Explicit zero baseline');
assertEqual(read(sites[0].name, 'E11'), 'n.a.', 'Zero denominator');
testResults.push('Explicit zero remains a valid number. Zero baseline gives n.a. percentage.');
text(first, 'C38', 100000);
text(first, 'D38', 100000);
text(first, 'E38', 100000);
text(first, 'C25', 100000);
assertEqual(read(sites[0].name, 'E8'), 300000, 'Baseline fixture');
assertEqual(read(sites[0].name, 'E9'), 100000, 'Proposal fixture');
assertEqual(read(sites[0].name, 'E10'), 200000, 'Positive difference');
assertEqual(read(sites[0].name, 'E13'), 'Proposed cost lower', 'Lower cost label');
text(first, 'D51', 250000);
assertEqual(read(sites[0].name, 'E9'), 350000, 'Year 2 change');
assertEqual(read(sites[0].name, 'E10'), -50000, 'Negative difference');
assertEqual(read(sites[0].name, 'E13'), 'Proposed cost higher', 'Higher cost label');
testResults.push('Positive and negative cost differences reconcile. Year 2 changes update the comparison.');
first.getRange('C25').clear({ applyTo: 'contents' });
assertEqual(read(sites[0].name, 'E9'), '', 'One missing CAPEX');
assertEqual(read(sites[0].name, 'E10'), '', 'One missing dependent difference');
text(first, 'C25', 100000);
text(first, 'D51', -1);
assertEqual(read(sites[0].name, 'E9'), '', 'Negative input guard');
assertEqual(read(sites[0].name, 'E14'), 'Invalid cost input', 'Negative input status');
text(first, 'D51', 'unquoted');
assertEqual(read(sites[0].name, 'E9'), '', 'Text input guard');
assertEqual(read(sites[0].name, 'E14'), 'Invalid cost input', 'Text input status');
testResults.push('A missing input keeps dependent totals blank. Negative or text costs flag Invalid cost input.');
for (const site of sites.slice(1)) {
  assertEqual(read(site.name, 'E8'), '', `${site.name} independent baseline`);
  assertEqual(read(site.name, 'E9'), '', `${site.name} independent proposal`);
}
testResults.push('Changes to the first site do not populate or alter either Carmona site.');
fillCosts(first, 0);
text(first, 'C38', 10.25);
text(first, 'C25', 1.5);
assertEqual(read(sites[0].name, 'E10'), 8.75, 'Decimal precision');
testResults.push('Decimal input precision is preserved even though display rounds PHP to whole units.');
text(first, 'C18', 'unconfirmed');
assertEqual(read(sites[0].name, 'E8'), '', 'Invalid VAT basis guard');
assertEqual(read(sites[0].name, 'E14'), 'Invalid VAT basis', 'Invalid VAT basis status');
testResults.push('Missing or invalid VAT basis prevents final three-year cost totals.');
for (const site of sites) {
  const s = wb.worksheets.getItem(site.name);
  for (const addr of inputAddresses) s.getRange(addr).clear({ applyTo: 'contents' });
  s.getRange('C18:E19').clear({ applyTo: 'contents' });
}
wb.recalculate();

const inspect = [];
for (const site of sites) {
  const s = wb.worksheets.getItem(site.name);
  for (const cell of ['E8', 'E9', 'E10', 'E11', 'E12']) assertEqual(read(site.name, cell), '', `${site.name} final ${cell}`);
  inspect.push((await wb.inspect({ kind: 'table', sheetId: site.name, range: 'B7:H19', include: 'values,formulas', maxChars: 9000, tableMaxRows: 13, tableMaxCols: 7 })).ndjson);
  const formulas = s.getRange('B1:H79').formulas.flat().filter(Boolean);
  if (formulas.some(x => x.includes('!') || x.includes('['))) throw new Error(`Unexpected external or cross-project formula in ${site.name}`);
  for (const [label, range] of [['summary', 'B1:H22'], ['capex-current', 'B23:H47'], ['proposed-nonannual', 'B49:H78']]) {
    const png = await wb.render({ sheetName: site.name, range, scale: 1.4, format: 'png' });
    await fs.writeFile(path.join(qaDir, `${site.name.toLowerCase().replaceAll(' ', '-')}-${label}.png`), new Uint8Array(await png.arrayBuffer()));
  }
}
const errorScan = (await wb.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 100 }, summary: 'Final formula error scan', maxChars: 6000 })).ndjson;
await fs.writeFile(path.join(qaDir, 'inspection.ndjson'), inspect.join('\n') + '\n' + errorScan);
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputFile);
await fs.rename(`${outputFile}.inspect.ndjson`, path.join(qaDir, 'export-inspection.ndjson')).catch(error => { if (error.code !== 'ENOENT') throw error; });
// Reimport the final file to establish stored formulas and blank inputs survived.
const imported = await SpreadsheetFile.importXlsx(await FileBlob.load(outputFile));
for (const site of sites) {
  const s = imported.worksheets.getItem(site.name);
  for (const addr of inputAddresses) {
    if (s.getRange(addr).values.flat().some(x => x !== null && x !== undefined && x !== '')) throw new Error(`Fixture or unexpected final input in ${site.name} ${addr}`);
  }
  if (!s.getRange('E10').formulas[0][0]) throw new Error(`Missing formula after export in ${site.name}`);
}
const bytes = await fs.readFile(outputFile);
const receipt = { outputFile, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), sheets: sites.map(x => x.name), inputsPerSite: 68, testResults, finalMoneyInputs: 'All blank', errorScan, formulaBoundary: 'No cross-sheet, cross-project or external-workbook formulas', nativeValidation: 'Data-basis and VAT dropdowns. Negative and text costs flagged by conditional formatting and formula guards.', nativeExcelVerification: 'Pending independent native-engine check', previewDirectory: qaDir };
await fs.writeFile(path.join(qaDir, 'verification.json'), JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
