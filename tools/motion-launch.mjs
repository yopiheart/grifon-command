import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initProject, planProject } from './motion-launch/project.mjs';
import { serveProject, renderVisual } from './motion-launch/visual.mjs';

export function parseArguments(args) {
  const command = args[0];
  const options = { init: ['template', 'project'], plan: ['project'], validate: ['project'], serve: ['project', 'format', 'port'], render: ['project', 'format', 'from', 'frames', 'profile'] };
  if (!Object.hasOwn(options, command)) throw Error('Usage: motion-launch.mjs init|plan|validate|serve|render|audio --project PATH (audio forwards to the local audio adapter)');
  const values = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.slice(2), value = args[i + 1];
    if (!args[i]?.startsWith('--') || !options[command].includes(key) || Object.hasOwn(values, key) || !value || value.startsWith('--')) throw Error(`Unknown, duplicated or missing option ${args[i]}`);
    values[key] = value;
  }
  if (!values.project) throw Error('--project is required');
  if (command === 'init' && !values.template) throw Error('--template is required');
  for (const key of ['port', 'from', 'frames']) if (Object.hasOwn(values, key)) {
    if (!/^\d+$/.test(values[key]) || !Number.isSafeInteger(Number(values[key]))) throw Error(`--${key} requires a nonnegative integer`);
    values[key] = Number(values[key]);
  }
  return { command, values };
}

export async function main(args = process.argv.slice(2)) {
  if (args[0] === 'audio') { const { runAudioCli } = await import('./motion-launch/audio.mjs'); return runAudioCli(args.slice(1)); }
  const { command, values } = parseArguments(args);
  let result;
  if (command === 'init') { const state = await initProject({ project: values.project, templateId: values.template }); result = { project: state.root, templateId: state.job.templateId, visualSourceKey: state.visualSourceKey, providerCalls: 0, paidSpendUsd: 0 }; }
  else if (command === 'plan' || command === 'validate') result = await planProject(values.project);
  else if (command === 'render') result = await renderVisual(values);
  else {
    const preview = await serveProject(values);
    console.log(JSON.stringify({ url: preview.url, project: path.resolve(values.project), scope: 'Loopback draft preview; authored treatments only', providerCalls: 0, paidSpendUsd: 0 }, null, 2));
    const close = async () => { await preview.close(); process.exitCode = 0; };
    process.once('SIGINT', close); process.once('SIGTERM', close); return preview;
  }
  console.log(JSON.stringify(result, null, 2)); return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
