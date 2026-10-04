import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkEvalPromptSync, sourceFiles } from '../../tools/check-eval-prompt-sync.mjs';

const production = 'services/geminiService.ts';
const sceneEval = 'tools/eval_scene_image_models.mjs';
const realismEval = 'tools/eval_realism_formula.mjs';
const sources: Record<string, string> = Object.fromEntries(sourceFiles.map((file: string) =>
  [file, readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')]));

function changed(file: string, before: string, after: string) {
  expect(sources[file].split(before)).toHaveLength(2);
  return { ...sources, [file]: sources[file].replace(before, after) };
}

describe('evaluation prompt copy parity', () => {
  it('checks six explicitly covered pairs in the actual source without executing harnesses', () => {
    const result = checkEvalPromptSync(sources);
    expect(result.errors).toEqual([]);
    expect(result.checkedPairs).toHaveLength(6);
  });

  it.each([
    [sceneEval, '**CORE RULE:**', '**CHANGED RULE:**', 'REALISM_INSTRUCTION'],
    [sceneEval, '- The image must be PURELY VISUAL.', '- The image may include text.', 'NO_TEXT_CONSTRAINT'],
    [sceneEval, '- **Primary Directive:** High-end commercial product showcase.', '- **Primary Directive:** Low-end product showcase.', 'REALISM_INSTRUCTION_CINEMATIC'],
    [realismEval, '**CORE RULE:**', '**CHANGED RULE:**', 'REALISM_INSTRUCTION'],
    [realismEval, '- The image must be PURELY VISUAL.', '- The image may include text.', 'NO_TEXT_CONSTRAINT'],
    [realismEval, '- NO STUDIO BACKGROUNDS.', '- STUDIO BACKGROUNDS.', 'avatar shared template tail'],
  ])('rejects changed copy %s / %s', (file, before, after, name) => {
    const result = checkEvalPromptSync(changed(file, before, after));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(`${file}: ${name} differs from ${production}`);
  });

  it.each([
    ['skin conditions (like Melasma', 'skin conditions (daylight Melasma'],
    ["look like a 'grandparent'", "look daylight a 'grandparent'"],
  ])('catches the historical avatar corruption: %s', (before, after) => {
    const result = checkEvalPromptSync(changed(realismEval, before, after));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('avatar shared template tail differs');
  });

  it('detects production changes while copies stay unchanged', () => {
    const result = checkEvalPromptSync(changed(production, '**CORE RULE:**', '**CHANGED RULE:**'));
    expect(result.errors).toHaveLength(2);
    expect(result.errors.every((error: string) => error.includes('REALISM_INSTRUCTION differs'))).toBe(true);
  });

  it('preserves interpolation expressions and internal whitespace', () => {
    for (const [before, after] of [
      ['${localizationInstruction}', '${differentInstruction}'],
      ['- NO STUDIO BACKGROUNDS.', '- NO  STUDIO BACKGROUNDS.'],
    ]) {
      expect(checkEvalPromptSync(changed(realismEval, before, after)).errors).toHaveLength(1);
    }
  });

  it('normalizes CRLF, indentation and trailing spaces without removing blank lines', () => {
    const formatted = sources[realismEval].replace(/\r\n/g, '\n').split('\n')
      .map((line, index) => index === 0 ? line : `  ${line} \t`).join('\r\n');
    expect(checkEvalPromptSync({ ...sources, [realismEval]: formatted }).errors).toEqual([]);
    expect(checkEvalPromptSync(changed(realismEval, '**Visuals:**', '\n**Visuals:**')).errors).toHaveLength(1);
  });

  it('fails closed when a source or a required constant is absent', () => {
    const missing = { ...sources }; delete missing[realismEval];
    expect(checkEvalPromptSync(missing).errors).toEqual([`${realismEval}: source missing`]);
    const result = checkEvalPromptSync(changed(sceneEval, 'const REALISM_INSTRUCTION =', 'const REMOVED_INSTRUCTION ='));
    expect(result.errors).toEqual([`${sceneEval}: expected one REALISM_INSTRUCTION, found 0`]);
  });

  it('rejects duplicate declarations even when the copy matches', () => {
    const result = checkEvalPromptSync({ ...sources, [sceneEval]: `${sources[sceneEval]}\nconst REALISM_INSTRUCTION = \`duplicate\`;` });
    expect(result.errors).toEqual([`${sceneEval}: expected one REALISM_INSTRUCTION, found 2`]);
  });

  it('rejects a constant changed to an alias or mutable declaration', () => {
    for (const [before, after] of [
      ['const REALISM_INSTRUCTION =', 'let REALISM_INSTRUCTION ='],
      ['const REALISM_INSTRUCTION =', 'const REALISM_INSTRUCTION = prefix +'],
    ]) {
      expect(checkEvalPromptSync(changed(sceneEval, before, after)).errors).toEqual([
        `${sceneEval}: REALISM_INSTRUCTION must be a const initialized by a plain template literal`,
      ]);
    }
  });

  it('rejects missing and duplicate avatar sections, including duplicates in one template', () => {
    const marker = '**SMART CASTING DIRECTOR LOGIC:**';
    expect(checkEvalPromptSync(changed(realismEval, marker, '**REMOVED CASTING LOGIC:**')).errors)
      .toEqual([`${realismEval}: expected one avatar shared template tail, found 0`]);
    expect(checkEvalPromptSync({ ...sources, [realismEval]: `${sources[realismEval]}\nconst duplicate = \`${marker}\`;` }).errors)
      .toEqual([`${realismEval}: expected one avatar shared template tail, found 2`]);
    expect(checkEvalPromptSync(changed(realismEval, marker, `${marker}\n${marker}`)).errors)
      .toEqual([`${realismEval}: duplicate ${marker} in template`]);
  });

  it('fails closed on malformed source', () => {
    const result = checkEvalPromptSync({ ...sources, [realismEval]: `${sources[realismEval]}\nconst broken = \`unterminated` });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('malformed source:');
    expect(result.checkedPairs.every((pair: string) => !pair.startsWith(realismEval))).toBe(true);
  });

  it('ignores comments, fixed eval subjects and models outside the declared coverage', () => {
    const changedInputs = changed(realismEval, "const ageRange = '30-38';", "const ageRange = '40-48';");
    changedInputs[realismEval] += '\n// **SMART CASTING DIRECTOR LOGIC:**';
    changedInputs[realismEval] = changedInputs[realismEval].replace("const MODEL_ID = 'gemini-3.1-flash-lite-image';", "const MODEL_ID = 'experiment-model';");
    expect(checkEvalPromptSync(changedInputs).errors).toEqual([]);
  });
});
