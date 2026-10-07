import fs from 'node:fs';
import path from 'node:path';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
export function assertPlayerScriptSyntax(html) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(script => script.trim());
  if (!scripts.length) throw Error('Player requires an inline behavior script');
  scripts.forEach((script, index) => new Script(script, { filename: `player-inline-${index}.js` }));
  return scripts.length;
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--script') {
    new Script(fs.readFileSync(process.argv[3], 'utf8'), { filename: path.basename(process.argv[3]) });
    console.log('PASS: script syntax.');
  } else {
    const file = process.argv[2] || path.resolve(HERE, '../../../artifacts/grifon-motion-action-pilot.html');
    console.log(`PASS: ${assertPlayerScriptSyntax(fs.readFileSync(file, 'utf8'))} emitted player script(s) parse.`);
  }
}
