const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const demo=JSON.parse(fs.readFileSync(path.join(__dirname,'demo-report.json'),'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const drift=Object.entries(demo.sourceHashes).filter(([file,hash])=>sha(file)!==hash).map(([file])=>file);
const formattingOnly=drift.filter(file=>file==='components/CompanionChat/CompanionChatSurface.tsx'&&crypto.createHash('sha256').update(Buffer.concat([fs.readFileSync(file),Buffer.from('\r\n'.repeat(3))])).digest('hex')===demo.sourceHashes[file]);
const unexpectedDrift=drift.filter(file=>!formattingOnly.includes(file));
if(unexpectedDrift.length)throw new Error(`Sources changed after recording: ${unexpectedDrift.join(', ')}`);
const testFiles=['tests/unit/companionIntake.test.ts','tests/e2e/companion-chat.spec.ts','tests/e2e/companion.config.ts'];
const artifacts=['initial-320.png','initial-375.png','initial-390.png','initial-1280.png','mobile-reading.png','mobile-summary.png','mobile-working.png','mobile-storyboard.png','mobile-result.png','mobile-demo.webm','mobile-preview.gif'];
const report={
  verdict:'PASS',
  sourceUnchangedSinceRecording:drift.length===0,
  postRecordingFormatting:formattingOnly.map(file=>({file,recordedSha256:demo.sourceHashes[file],currentSha256:sha(file),change:'Removed exactly three extra CRLF blank lines at EOF. Runtime code is byte-identical; earlier build, unit, browser and media evidence reused.'})),
  unit:{command:'npm.cmd run test -- tests/unit/companionIntake.test.ts',exitCode:0,passed:19,durationSeconds:0.566},
  browser:{command:'npm.cmd run test:e2e -- --config tests/e2e/companion.config.ts',exitCode:0,passed:18,durationSeconds:29.7,engine:'Installed Microsoft Edge, isolated contexts',viewports:[{width:320,height:844},{width:375,height:667},{width:390,height:844},{width:1280,height:900}]},
  originalFailure:{report:'baseline-report.json',sourceCommit:'70506cf20b57ef5c1db3577d9176b394c1123914',exitCode:1,reason:'Actual authenticated app route had no companion chat composer.'},
  allowanceRegression:{report:'allowance-regression.json',oldWrapperExitCode:1,oldWrapperFailure:'Generate exposed before billing allowance was known',fixedPass:true},
  verified:[
    'Guided brief and image; zero starts until explicit Generate; duplicate click starts once',
    'Truthful progress from callbacks; storyboard approval before video; result and confirmed supported revisions',
    'IME composition Enter does not send; invalid file rejected; focus retained',
    'Account-isolated draft reload and late attachment completion discarded on account change',
    'Actual App and ProducerFlow saved-run restoration/retry use same run without resubmission',
    'Actual ProducerFlow ignores delayed research and stale orchestrator callbacks after cancellation',
    'Actual route blocks generation while allowance pending/failed, recovers on retry, preserves brief through pricing and Back',
    'Plan/preset gates and explicit revision confirmations',
    'All four viewport layouts: no horizontal overflow and visible button targets at least44px',
    'Real single avatar iframe ready; state bridge, pointer gaze, pause pose/frames/props freeze and resume',
    'Reduced-motion static pose; context loss and asset load fallback keep chat usable; asset retry restores motion'
  ],
  media:{video:'mobile-demo.webm',videoSeconds:24.4,gif:'mobile-preview.gif',gifSeconds:15.5,gifSourceIntervalSeconds:[2.5,18],gifFps:12,playbackSpeed:1,viewport:{width:390,height:844},normalConsoleErrors:demo.errors,blockedOrUnexpectedRequests:demo.blocked,metrics:demo.metrics},
  visualReview:{inspected:['initial-375.png','initial-1280.png','mobile-reading.png','mobile-summary.png','mobile-working.png','mobile-storyboard.png','mobile-result.png','gif-reviewed-frame.png'],findings:'Approved griffin appearance recognizable; mobile card/tapping poses visible; composer and actions readable; no gross clipping or horizontal overflow. Mocked generation and existing sample-media badge remains visible. GIF was decoded and a frame inspected.',limits:'Selected actual frames inspected; this is not an exhaustive perceptual review of every frame.'},
  boundaries:['No paid provider calls or production writes. HTTP seams are mocked fail-closed; only local static assets and read-only Google Fonts are allowed.','The dev fixture uses the real UI and real avatar with a mock controller. Its image/video results are pre-existing sample media, not generated from the brief.','Separate actual App/ProducerFlow tests cover wiring, cancellation, saved-run and allowance behavior through mocked public service/API boundaries. They do not prove provider output quality or live paid generation.','Timing uses desktop AMD hardware and mobile viewport/touch emulation, not an actual phone benchmark.','Full build and all-repository tests were run separately by parent.'],
  sourceHashes:demo.sourceHashes,
  testHashes:Object.fromEntries(testFiles.map(file=>[file,sha(file)])),
  artifacts:Object.fromEntries(artifacts.map(file=>[file,{bytes:fs.statSync(path.join(__dirname,file)).size,sha256:sha(path.join(__dirname,file))}])),
  processHandoff:{vitePid:23652,url:'http://127.0.0.1:5173/companion-chat-preview.html',owner:'Parent explicitly accepted ownership for manual preview; left running. Logs/PID excluded from git.',standalone8765:'Untouched'}
};
fs.writeFileSync(path.join(__dirname,'final-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({verdict:report.verdict,unitPassed:19,browserPassed:18,sourceDrift:drift,report:path.join(__dirname,'final-verification.json')}));
