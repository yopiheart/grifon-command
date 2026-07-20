import ExcelJS from 'exceljs';

const NAVY='FF0B1F33', NAVY2='FF123049', GOLD='FFF5B301',
      WHITE='FFFFFFFF', INK='FF13293D', MUT='FF6B8299', PALE='FFEAF4FC', PALE2='FFF6FAFE',
      SAMPLE='FFFFF7DF';
const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}});
const thin={style:'thin',color:{argb:'FFD5E4F0'}};
const box={top:thin,left:thin,bottom:thin,right:thin};
const wb=new ExcelJS.Workbook();

/* ---------- TAB 1: PAYSLIP ---------- */
const ps=wb.addWorksheet('Payslip',{views:[{showGridLines:false}]});
ps.columns=[{width:3},{width:44},{width:22},{width:3}];
ps.mergeCells('A1:D1'); ps.getRow(1).height=40;
Object.assign(ps.getCell('A1'),{value:'KUYA MARVIN NG OCEANIDES',fill:fill(NAVY),
  font:{size:18,bold:true,color:{argb:WHITE}},alignment:{vertical:'middle',horizontal:'center'}});
ps.mergeCells('A2:D2'); ps.getRow(2).height=22;
Object.assign(ps.getCell('A2'),{value:'WEEKLY PAYSLIP — Attendance & Earnings Tracker',fill:fill(NAVY),
  font:{size:11,bold:true,color:{argb:GOLD}},alignment:{vertical:'middle',horizontal:'center'}});
ps.getRow(4).height=26;
Object.assign(ps.getCell('B4'),{value:'Week start (Lunes) — si Neil ang nagpapalit kada Lunes',
  font:{size:11,bold:true,color:{argb:INK}},alignment:{vertical:'middle'}});
Object.assign(ps.getCell('C4'),{value:new Date(2026,6,21),numFmt:'yyyy-mm-dd',fill:fill('FFFFF3D1'),
  font:{size:12,bold:true,color:{argb:INK}},alignment:{vertical:'middle',horizontal:'center'},
  border:{top:{style:'thin',color:{argb:GOLD}},left:{style:'thin',color:{argb:GOLD}},bottom:{style:'thin',color:{argb:GOLD}},right:{style:'thin',color:{argb:GOLD}}}});
const rows=[
 ['Days worked','COUNTIFS(DailyLog!$A$2:$A$500,">="&$C$4,DailyLog!$A$2:$A$500,"<"&$C$4+7)','0'],
 ['Day pay  (P500 / working day)','C6*500','"₱"#,##0'],
 ['Transport reimbursement','SUMIFS(DailyLog!$F$2:$F$500,DailyLog!$A$2:$A$500,">="&$C$4,DailyLog!$A$2:$A$500,"<"&$C$4+7)','"₱"#,##0'],
 ['Confirmed commissions  (Bayad na = OO)','SUMIFS(Earnings!$E$2:$E$500,Earnings!$A$2:$A$500,">="&$C$4,Earnings!$A$2:$A$500,"<"&$C$4+7,Earnings!$F$2:$F$500,"OO")','"₱"#,##0'],
];
rows.forEach((r,i)=>{ const rn=6+i; ps.getRow(rn).height=24;
 Object.assign(ps.getCell(rn,2),{value:r[0],font:{size:11,color:{argb:INK}},alignment:{vertical:'middle'},fill:fill(i%2?PALE2:PALE),border:box});
 Object.assign(ps.getCell(rn,3),{value:{formula:r[1]},numFmt:r[2],font:{size:12,bold:true,color:{argb:INK}},alignment:{vertical:'middle',horizontal:'right'},fill:fill(i%2?PALE2:PALE),border:box});
});
ps.getRow(11).height=34;
Object.assign(ps.getCell('B11'),{value:'TOTAL PAYOUT (kada Sabado, GCash)',fill:fill(NAVY2),font:{size:12,bold:true,color:{argb:WHITE}},alignment:{vertical:'middle'}});
Object.assign(ps.getCell('C11'),{value:{formula:'C7+C8+C9'},numFmt:'"₱"#,##0',fill:fill(GOLD),font:{size:16,bold:true,color:{argb:NAVY}},alignment:{vertical:'middle',horizontal:'right'}});

const notes=[
 ['PAANO GAMITIN — SINO ANG NAGSUSULAT:',18,true,false],
 ['1.  Si MARVIN ang nagsusulat sa DailyLog (lahat ng columns) at sa Earnings columns A hanggang D — araw-araw.',30,false,true],
 ['2.  Si NEIL LANG ang nagsusulat sa "Bayad na?" (Earnings column F): OO kapag nakolekta na ang bayad ng client. Si Neil din ang nagpapalit ng Week start sa taas kada Lunes.',42,false,true],
 ['3.  DailyLog: ISANG row kada working day. Pagsamahin sa Notes kung maraming ginawa sa isang araw.',30,false,true],
 ['4.  Ang commission ay pumapasok sa payslip kapag OO na ang "Bayad na?" — hindi sa booking pa lang.',30,false,true],
 ['5.  Commission: Certified = P250  |  Lusong = 5% ng deal  |  Maintenance = P500. Auto-compute na ito sa Earnings — piliin lang ang Uri at ilagay ang halaga ng deal.',42,false,true],
 ['6.  May HALIMBAWA rows (dilaw na background) sa DailyLog at Earnings — tingnan para makita ang tamang pag-fill, tapos BURAHIN kapag magsisimula na ang totoong logging.',42,false,true],
];
notes.forEach((n,i)=>{
 ps.mergeCells(13+i,2,13+i,3); ps.getRow(13+i).height=n[1];
 Object.assign(ps.getCell(13+i,2),{value:n[0],
  font:{size:9.5,italic:n[3],bold:n[2],color:{argb:MUT}},
  alignment:{vertical:'top',wrapText:true}});
});

const hdr=(ws,n)=>{const r=ws.getRow(1);r.height=26;
 for(let c=1;c<=n;c++)Object.assign(ws.getCell(1,c),{fill:fill(NAVY),font:{size:11,bold:true,color:{argb:WHITE}},
  alignment:{vertical:'middle',horizontal:'center'},border:{bottom:{style:'medium',color:{argb:GOLD}}}});};
const sampleStyle=(ws,r,cols)=>{for(const c of cols){const cell=ws.getCell(r,c);
 cell.fill=fill(SAMPLE); cell.font={size:10.5,italic:true,color:{argb:INK}};}};

/* ---------- TAB 2: DAILY LOG ---------- */
const dl=wb.addWorksheet('DailyLog',{views:[{state:'frozen',ySplit:1}]});
dl.columns=[
 {header:'Petsa',width:13},{header:'Uri ng araw',width:18},{header:'Site o Client',width:30},
 {header:'Time In',width:10},{header:'Time Out',width:10},{header:'Transport (P)',width:13},
 {header:'Notes  (si Marvin ang nagsusulat sa tab na ito)',width:52}];
hdr(dl,7);
dl.getColumn(1).numFmt='yyyy-mm-dd'; dl.getColumn(6).numFmt='"₱"#,##0';
const dlSamples=[
 [new Date(2026,6,21),'Inspection','Aling Rosa — Project 8, QC','8:30 AM','10:00 AM',250,'HALIMBAWA: septic check, kuha photos, report sa group chat'],
 [new Date(2026,6,22),'Canvass','5 restaurants sa Maginhawa','1:00 PM','4:30 PM',200,'HALIMBAWA: nag-iwan ng contact, 2 ang interesado sa Health Check'],
 [new Date(2026,6,23),'Content','Shoot — reference photos','9:00 AM','12:00 PM',null,'HALIMBAWA: burahin ang mga dilaw na row kapag magsisimula na'],
];
dlSamples.forEach((s,i)=>{ const r=2+i; s.forEach((v,c)=>{ if(v!==null)dl.getCell(r,c+1).value=v; }); sampleStyle(dl,r,[1,2,3,4,5,6,7]); });
dl.dataValidations.add('B2:B100',{type:'list',allowBlank:true,formulae:['"Inspection,Canvass,Content,Bantay-Serbisyo"']});

/* ---------- TAB 3: EARNINGS ---------- */
const ea=wb.addWorksheet('Earnings',{views:[{state:'frozen',ySplit:1}]});
ea.columns=[
 {header:'Petsa',width:13},{header:'Client  (si Marvin: A–D)',width:30},{header:'Uri',width:15},
 {header:'Halaga ng deal (P)',width:17},{header:'Commission (P) — AUTO',width:20},
 {header:'Bayad na? (si NEIL lang)',width:22}];
hdr(ea,6);
ea.getColumn(1).numFmt='yyyy-mm-dd'; ea.getColumn(4).numFmt='"₱"#,##0'; ea.getColumn(5).numFmt='"₱"#,##0';
for(let r=2;r<=100;r++) ea.getCell(r,5).value={formula:`IF($C${r}="Certified",250,IF($C${r}="Lusong",$D${r}*0.05,IF($C${r}="Maintenance",500,"")))`};
const eaSamples=[
 [new Date(2026,6,21),'ABC Restaurant Corp. (5 loads, may DENR cert)','Certified',12000,'OO'],
 [new Date(2026,6,23),'Aling Rosa — lusong mula sa Health Check','Lusong',20000,'HINDI'],
];
eaSamples.forEach((s,i)=>{ const r=2+i;
 ea.getCell(r,1).value=s[0]; ea.getCell(r,2).value=s[1]; ea.getCell(r,3).value=s[2];
 ea.getCell(r,4).value=s[3]; ea.getCell(r,6).value=s[4];
 sampleStyle(ea,r,[1,2,3,4,6]); });
ea.dataValidations.add('C2:C100',{type:'list',allowBlank:true,formulae:['"Certified,Lusong,Maintenance"']});
ea.dataValidations.add('F2:F100',{type:'list',allowBlank:true,formulae:['"OO,HINDI"']});
ea.addConditionalFormatting({ref:'F2:F100',rules:[{type:'cellIs',operator:'equal',formulae:['"OO"'],priority:1,
 style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFD9F2D9'}}}}]});

await wb.xlsx.writeFile('tracker.xlsx');
console.log('written tracker.xlsx');
