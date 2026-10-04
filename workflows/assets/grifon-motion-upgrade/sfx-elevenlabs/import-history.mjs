// Import only the nine task-specific History batches already downloaded through CUA.
// This script has no network access or generation operation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const downloads = 'C:/Users/ADMIN/Downloads';
const probe = 'C:/Users/ADMIN/Desktop/grifon-command/.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe';
const groups = [
  ['pencil', 'A_single_continuous_', 'A single continuous pencil stroke on smooth paper. Fine dry friction, even light pressure and delicate grain, ending cleanly. Close-miked.'],
  ['card-pop', 'One_restrained_tacti', 'One restrained tactile interface pop, with a crisp tiny click and a rounded soft body. Immediate onset, quick natural decay, clean and dry.'],
  ['orb-inward', 'One_soft_rounded_inw', 'One soft rounded inward whoom, like a large airy form rapidly gathering into a small focused point. Smooth pressure movement, a tactile centre and a subtle short shimmering tail.'],
  ['reverse-air', 'One_brief_reverse_ai', 'One brief reverse air intake, gently gathering inward and finishing with a clean soft stop. Smooth suction texture, a little rounded weight and minimal tail.'],
  ['laptop-contact', 'One_compact_hard-pla', 'One compact hard-plastic casing click with a subtle internal metallic rattle. Firm and tactile, with a short controlled decay. Close-miked and dry.'],
  ['phone-contact', 'One_delicate_glass-a', 'One delicate glass-and-plastic contact, with a crisp initial tick and a soft cushioned body. Clean, close and dry, with a fast decay.'],
  ['camera-contact', 'One_compact_metal-an', 'One compact metal-and-plastic mechanism clicking into place. A sharp detailed attack, restrained solid body and tiny natural decay. Close-miked and dry.'],
  ['rotation-air', 'One_smooth_airy_whoo', 'One smooth airy whoosh for a small object rotating quickly. It builds gently in intensity, has a rounded body and subtle mechanical texture, then stops cleanly.'],
  ['paper-swipe', 'One_short_paper-text', 'One short paper-textured swish, smoothly accelerating and stopping cleanly.'],
];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const entries = fs.readdirSync(downloads).filter(n => n.endsWith('.wav')).map(name => ({ name, modified: fs.statSync(path.join(downloads, name)).mtimeMs }));
const staged = [];
for (const [id, prefix, prompt] of groups) {
  if (/\b(no|without|avoid|exclude|not)\b/i.test(prompt)) throw new Error('Expected positive-only tested prompt');
  for (let candidate = 1; candidate <= 4; candidate++) {
    const match = entries.filter(e => e.name.startsWith(prefix) && new RegExp(`_#${candidate}-[0-9]+\\.wav$`).test(e.name) && e.modified >= Date.parse('2026-10-03T18:00:00Z')).sort((a,b) => b.modified - a.modified)[0];
    if (!match) throw new Error(`Missing observed download: ${id} candidate${candidate}`);
    const input = path.join(downloads, match.name), bytes = fs.readFileSync(input);
    if (bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WAVE') throw new Error('Native download is not a WAV');
    const p = spawnSync(probe, ['-v','error','-protocol_whitelist','file,pipe','-f','wav','-show_streams','-show_format','-of','json',input], {encoding:'utf8',windowsHide:true});
    if (p.error || p.status !== 0) throw new Error(`WAV probe failed: ${id} candidate${candidate}`);
    const media = JSON.parse(p.stdout), stream = media.streams.find(s => s.codec_type === 'audio');
    if (!stream || Number(stream.sample_rate)!==48000 || Number(stream.channels)!==2 || !(Number(media.format.duration)>0 && Number(media.format.duration)<=30)) throw new Error('Unexpected native format/duration');
    const relative = `inputs/${id}-candidate-${candidate}.wav`, target = path.join(here, relative), sha256 = hash(bytes);
    if (fs.existsSync(target) && hash(fs.readFileSync(target)) !== sha256) throw new Error('Refusing to replace different imported audio');
    staged.push({ bytes, target, entry: {id:`${id}-${candidate}`,family:id,candidate,prompt,path:`workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/${relative}`,sourceFilename:match.name,sha256,bytes:bytes.length,codec:stream.codec_name,sampleRate:48000,channels:2,durationSeconds:Number(media.format.duration),sourceLabel:`ElevenLabs Sound Effects History, exact prompt, candidate #${candidate}`,listeningStatus:'pending',selected:false} });
  }
}
const catalog = {status:'downloaded-unselected',provider:'ElevenLabs',route:'Existing four-candidate website History batches',paidGenerationCalls:0,newCreditSpend:0,originalGenerationSettings:'Not exposed by History; no assumptions made from current composer settings',auditoryQA:'Pending. Root cannot hear browser playback. Technical probes do not establish perceived quality.',families:groups.length,candidates:staged.map(x=>x.entry)};
fs.mkdirSync(path.join(here,'inputs'),{recursive:true});
for(const item of staged) if (!fs.existsSync(item.target)) fs.writeFileSync(item.target,item.bytes,{flag:'wx'});
for(const item of staged) if(hash(fs.readFileSync(item.target))!==item.entry.sha256)throw new Error('Imported bytes changed');
fs.writeFileSync(path.join(here,'history-candidates.json'),JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({families:groups.length,downloadedCandidates:staged.length,native:'48kHz stereo WAV',providerCalls:0,selected:0}));
