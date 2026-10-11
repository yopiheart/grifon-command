import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),fixture=path.join(here,'.tmp/full-guard-fixture'),qa=path.join(here,'qa');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),receiptBytes=fs.readFileSync(path.join(qa,'full-media.json')),media=JSON.parse(receiptBytes),spec=JSON.parse(fs.readFileSync(path.join(here,'full.json')));
fs.mkdirSync(path.join(fixture,'qa'),{recursive:true});
for(const file of [...Object.keys(media.sources),'render-full.mjs',spec.prefixFile,media.file]){const target=path.join(fixture,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(here,file),target);}
fs.writeFileSync(path.join(fixture,'qa/full-media.json'),receiptBytes);
const runtime=path.join(fixture,'full.js'),before=sha(fs.readFileSync(runtime));fs.appendFileSync(runtime,'\n// Private negative control: this is not the producer runtime.\n');
const result=spawnSync(process.execPath,[path.join(fixture,'render-full.mjs'),'verify'],{encoding:'utf8',maxBuffer:2*1024*1024});
if(result.status===0||!result.stderr.includes('Existing producer source binding differs'))throw Error(`Changed-input negative control was not rejected at its source binding: ${result.status}\n${result.stderr}`);
if(sha(fs.readFileSync(path.join(fixture,'qa/full-media.json')))!==sha(receiptBytes))throw Error('Failed verifier rewrote the producer receipt');
if(sha(fs.readFileSync(path.join(fixture,media.file)))!==media.sha256)throw Error('Negative control changed encoded media');
const report={result:'PASS',claim:'Verify refuses to retroactively bind existing media to edited runtime inputs',fixture:'.tmp/full-guard-fixture',originalRuntimeSha256:before,editedRuntimeSha256:sha(fs.readFileSync(runtime)),unchangedMediaSha256:media.sha256,producerReceiptSha256:sha(receiptBytes),producerReceiptUnchanged:true,expectedExit:result.status,expectedError:'Existing producer source binding differs',actualStderr:result.stderr,providerCalls:0,paidSpendUsd:0};
fs.writeFileSync(path.join(qa,'full-guard-negative.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS edited-input fixture rejected; original media and producer receipt unchanged');
