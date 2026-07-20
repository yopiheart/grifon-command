import ExcelJS from 'exceljs';

const NAVY='FF0B1F33', NAVY2='FF123049', BLUE='FF38B6FF', GOLD='FFF5B301',
      WHITE='FFFFFFFF', INK='FF13293D', MUT='FF6B8299', PALE='FFEAF4FC', PALE2='FFF6FAFE';
const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}});
const thin={style:'thin',color:{argb:'FFD5E4F0'}};
const box={top:thin,left:thin,bottom:thin,right:thin};

const wb=new ExcelJS.Workbook();

/* ---------- TAB 1: PAYSLIP ---------- */
const ps=wb.addWorksheet('Payslip',{views:[{showGridLines:false}]});
ps.columns=[{width:3},{width:30},{width:20},{width:3}];

ps.mergeCells('A1:D1'); ps.getRow(1).height=40;
Object.assign(ps.getCell('A1'),{value:'KUYA MARVIN NG OCEANIDES',
  fill:fill(NAVY),font:{name:'Calibri',size:18,bold:true,color:{argb:WHITE}},
  alignment:{vertical:'middle',horizontal:'center'}});
ps.mergeCells('A2:D2'); ps.getRow(2).height=22;
Object.assign(ps.getCell('A2'),{value:'WEEKLY PAYSLIP — Attendance & Earnings Tracker',
  fill:fill(NAVY),font:{name:'Calibri',size:11,bold:true,color:{argb:GOLD}},
  alignment:{vertical:'middle',horizontal:'center'}});

ps.getRow(4).height=26;
Object.assign(ps.getCell('B4'),{value:'Week start (Lunes)',
  font:{size:11,bold:true,color:{argb:INK}},alignment:{vertical:'middle'}});
Object.assign(ps.getCell('C4'),{value:new Date(2026,6,21),numFmt:'yyyy-mm-dd',
  fill:fill('FFFFF3D1'),font:{size:12,bold:true,color:{argb:INK}},
  alignment:{vertical:'middle',horizontal:'center'},
  border:{top:{style:'thin',color:{argb:GOLD}},left:{style:'thin',color:{argb:GOLD}},
          bottom:{style:'thin',color:{argb:GOLD}},right:{style:'thin',color:{argb:GOLD}}}});

const rows=[
  ['Days worked','COUNTIFS(DailyLog!$A$2:$A$1000,">="&$C$4,DailyLog!$A$2:$A$1000,"<"&$C$4+7)','0'],
  ['Day pay  (₱500 / working day)','C6*500','"₱"#,##0'],
  ['Transport reimbursement','SUMIFS(DailyLog!$F$2:$F$1000,DailyLog!$A$2:$A$1000,">="&$C$4,DailyLog!$A$2:$A$1000,"<"&$C$4+7)','"₱"#,##0'],
  ['Confirmed commissions  (Bayad na = OO)','SUMIFS(Earnings!$E$2:$E$1000,Earnings!$A$2:$A$1000,">="&$C$4,Earnings!$A$2:$A$1000,"<"&$C$4+7,Earnings!$F$2:$F$1000,"OO")','"₱"#,##0'],
];
rows.forEach((r,i)=>{
  const row=ps.getRow(6+i); row.height=24;
  Object.assign(ps.getCell(6+i,2),{value:r[0],font:{size:11,color:{argb:INK}},
    alignment:{vertical:'middle'},fill:fill(i%2?PALE2:PALE),border:box});
  Object.assign(ps.getCell(6+i,3),{value:{formula:r[1]},numFmt:r[2],
    font:{size:12,bold:true,color:{argb:INK}},alignment:{vertical:'middle',horizontal:'right'},
    fill:fill(i%2?PALE2:PALE),border:box});
});

ps.getRow(11).height=34;
Object.assign(ps.getCell('B11'),{value:'TOTAL PAYOUT (kada Sabado, GCash)',
  fill:fill(NAVY2),font:{size:12,bold:true,color:{argb:WHITE}},alignment:{vertical:'middle'}});
Object.assign(ps.getCell('C11'),{value:{formula:'C7+C8+C9'},numFmt:'"₱"#,##0',
  fill:fill(GOLD),font:{size:16,bold:true,color:{argb:NAVY}},
  alignment:{vertical:'middle',horizontal:'right'}});

const notes=[
  'PAANO GAMITIN:',
  '1.  Si Marvin ang nag-fi-fill ng DailyLog at Earnings tabs — maliban sa column na "Bayad na?".',
  '2.  Ang "Bayad na?" (Earnings, column F) ay si Neil LANG: markahan ng OO kapag nakolekta na ang bayad ng client.',
  '3.  Ang commission ay pumapasok sa payslip kapag OO na — hindi sa booking pa lang.',
  '4.  Kada Lunes, palitan ang "Week start" sa taas para sa bagong linggo.',
  '5.  Commission guide: Certified load = ₱250   |   Lusong = 5% ng deal   |   Maintenance signup = ₱500 (auto-compute na sa Earnings tab).',
];
notes.forEach((t,i)=>{
  ps.mergeCells(13+i,2,13+i,3);
  Object.assign(ps.getCell(13+i,2),{value:t,
    font:{size:9.5,italic:i>0,bold:i===0,color:{argb:MUT}},alignment:{vertical:'middle',wrapText:true}});
  ps.getRow(13+i).height=16;
});

/* ---------- TAB 2: DAILY LOG ---------- */
const dl=wb.addWorksheet('DailyLog',{views:[{state:'frozen',ySplit:1}]});
dl.columns=[
  {header:'Petsa',width:13},{header:'Uri ng araw',width:16},{header:'Site o Client',width:26},
  {header:'Time In',width:10},{header:'Time Out',width:10},{header:'Transport (₱)',width:13},
  {header:'Notes',width:40}];
const hdr=(ws,n)=>{const r=ws.getRow(1);r.height=26;
  for(let c=1;c<=n;c++)Object.assign(ws.getCell(1,c),{fill:fill(NAVY),
    font:{size:11,bold:true,color:{argb:WHITE}},alignment:{vertical:'middle',horizontal:'center'},
    border:{bottom:{style:'medium',color:{argb:GOLD}}}});};
hdr(dl,7);
for(let r=2;r<=300;r++){
  dl.getCell(r,1).numFmt='yyyy-mm-dd';
  dl.getCell(r,6).numFmt='"₱"#,##0';
  dl.getCell(r,2).dataValidation={type:'list',allowBlank:true,
    formulae:['"Inspection,Canvass,Content,Bantay-Serbisyo"']};
  if(r%2===0)for(let c=1;c<=7;c++)dl.getCell(r,c).fill=fill(PALE2);
}

/* ---------- TAB 3: EARNINGS ---------- */
const ea=wb.addWorksheet('Earnings',{views:[{state:'frozen',ySplit:1}]});
ea.columns=[
  {header:'Petsa',width:13},{header:'Client',width:26},{header:'Uri',width:15},
  {header:'Halaga ng deal (₱)',width:17},{header:'Commission (₱)',width:15},
  {header:'Bayad na? (si Neil lang)',width:20}];
hdr(ea,6);
for(let r=2;r<=300;r++){
  ea.getCell(r,1).numFmt='yyyy-mm-dd';
  ea.getCell(r,4).numFmt='"₱"#,##0';
  Object.assign(ea.getCell(r,5),{value:{formula:
    `IF($C${r}="Certified",250,IF($C${r}="Lusong",$D${r}*0.05,IF($C${r}="Maintenance",500,"")))`},
    numFmt:'"₱"#,##0'});
  ea.getCell(r,3).dataValidation={type:'list',allowBlank:true,formulae:['"Certified,Lusong,Maintenance"']};
  ea.getCell(r,6).dataValidation={type:'list',allowBlank:true,formulae:['"OO,HINDI"']};
  if(r%2===0)for(let c=1;c<=6;c++)ea.getCell(r,c).fill=fill(PALE2);
}
ea.addConditionalFormatting({ref:'F2:F300',rules:[
  {type:'cellIs',operator:'equal',formulae:['"OO"'],priority:1,
   style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFD9F2D9'}}}}]});

await wb.xlsx.writeFile('tracker.xlsx');
console.log('written tracker.xlsx');
