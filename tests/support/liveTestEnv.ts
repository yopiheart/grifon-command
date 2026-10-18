import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadLiveTestEnv<T extends string>(
  flagNames: readonly T[],
  env: NodeJS.ProcessEnv = process.env
): Record<T, boolean> {
  const flags = Object.fromEntries(flagNames.map((flag) => [flag, env[flag] === '1'])) as Record<T, boolean>;
  if (!flagNames.some((flag) => flags[flag])) return flags;

  try {
    const envText = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const rawLine of envText.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      if (key.startsWith('RUN_')) continue;
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!env[key]) env[key] = val;
    }
  } catch {
    // Enabled suites report missing credentials through their existing guards.
  }

  return flags;
}
