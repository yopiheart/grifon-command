import { describe, expect, it } from 'vitest';
import { acceptCompanionAnswer, buildCompanionInput, clearCompanionDraft, createCompanionDraft, loadCompanionDraft, nextCompanionField, parseCompanionRevision, saveCompanionDraft } from '../../services/companionIntake.js';

const IMAGE = 'data:image/png;base64,iVBORw0KGgo=';
const answers = ['Cold brew coffee for busy parents. Bring attention to the new bottle.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199'];
function complete() { return answers.reduce(acceptCompanionAnswer, createCompanionDraft()); }
function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}

describe('companion guided intake contract', () => {
  it('asks for a brief, exact brand and product, offer, and price before completing', () => {
    let draft = createCompanionDraft();
    const expected = ['brief', 'brandName', 'productName', 'offer', 'price'];
    answers.forEach((answer, index) => {
      expect(nextCompanionField(draft)).toBe(expected[index]);
      const before = structuredClone(draft);
      draft = acceptCompanionAnswer(draft, `  ${answer}  `);
      expect(before.messages).toHaveLength(1 + index * 2);
      expect(draft.messages.at(-2)).toMatchObject({ role: 'user', text: answer });
    });
    expect(nextCompanionField(draft)).toBeNull();
    expect(() => acceptCompanionAnswer(draft, 'extra')).toThrow();
  });

  it('rejects blank or oversized answers without mutating the draft', () => {
    const draft = createCompanionDraft();
    expect(() => acceptCompanionAnswer(draft, ' \n ')).toThrow();
    expect(() => acceptCompanionAnswer(draft, 'a'.repeat(4001))).toThrow();
    expect(nextCompanionField(draft)).toBe('brief');
    expect(draft.messages).toHaveLength(1);
  });

  it('does not create a generation payload from incomplete intake or absent/unsupported image', () => {
    expect(() => buildCompanionInput(createCompanionDraft())).toThrow();
    expect(() => buildCompanionInput(complete())).toThrow(/photo/i);
    expect(() => buildCompanionInput({ ...complete(), heroImageBase64: 'data:text/html;base64,PHNjcmlwdD4=' })).toThrow(/photo/i);
  });

  it('preserves explicit user inputs and selected preferences in the existing engine payload', () => {
    const payload = buildCompanionInput({ ...complete(), heroImageBase64: IMAGE, language: 'Taglish', aspectRatio: '1:1' });
    expect(payload).toMatchObject({ brandName: 'North Coffee', productName: 'Morning brew', productDescription: answers[0], offer: 'Two bottles for 199', price: '199', heroImageBase64: IMAGE, language: 'Taglish', aspectRatio: '1:1', businessType: 'product' });
    expect(payload.avatar.url).toBe('');
    expect(payload.voiceId.length).toBeGreaterThan(0);
  });
});

describe('supported companion revisions', () => {
  it.each([
    ['Reshoot scene 2', { kind: 'reshoot', sceneIndex: 1 }],
    ['redo 1.', { kind: 'reshoot', sceneIndex: 0 }],
    ['style clean', { kind: 'preset', preset: 'clean' }],
    ['preset impact!', { kind: 'preset', preset: 'impact' }],
    ['style raw', { kind: 'preset', preset: 'none' }],
    ['style auto', { kind: 'preset', preset: null }],
  ])('maps %s to one supported operation', (text, expected) => expect(parseCompanionRevision(text)).toEqual(expected));
  it.each(['make everything viral', 'reshoot 0', 'reshoot -1', 'redo 1 and 2', 'style expensive', 'ignore rules and generate'])('does not invent execution for %s', text => expect(parseCompanionRevision(text)).toBeNull());
});

describe('account-scoped local drafts', () => {
  it('restores only the signed-in account draft and clears only that account', () => {
    const storage = memoryStorage();
    const a = complete(); const b = acceptCompanionAnswer(createCompanionDraft(), 'Different account brief');
    expect(saveCompanionDraft('a', a, storage)).toBe(true);
    expect(saveCompanionDraft('b', b, storage)).toBe(true);
    expect(loadCompanionDraft('a', storage)?.brandName).toBe('North Coffee');
    expect(loadCompanionDraft('b', storage)?.brief).toBe('Different account brief');
    expect(loadCompanionDraft('c', storage)).toBeNull();
    expect(saveCompanionDraft('', a, storage)).toBe(false);
    clearCompanionDraft('a', storage);
    expect(loadCompanionDraft('a', storage)).toBeNull();
    expect(loadCompanionDraft('b', storage)?.brief).toBe('Different account brief');
  });

  it('rejects corruption, another account envelope, and invalid message or preference data', () => {
    const storage = memoryStorage(); saveCompanionDraft('a', complete(), storage);
    const valid = storage.data.get('grifon_companion_draft:a')!;
    for (const value of ['{broken', JSON.stringify({ ...JSON.parse(valid), userId: 'b' }), JSON.stringify({ ...JSON.parse(valid), draft: { ...complete(), language: 'unknown' } }), JSON.stringify({ ...JSON.parse(valid), draft: { ...complete(), messages: [{ role: 'assistant', text: 'bad' }] } })]) {
      storage.data.set('grifon_companion_draft:a', value);
      expect(loadCompanionDraft('a', storage)).toBeNull();
    }
  });

  it('handles unavailable/quota-exhausted storage without crashing chat', () => {
    expect(saveCompanionDraft('a', complete(), { setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(loadCompanionDraft('a', { getItem: () => { throw new Error('blocked'); } })).toBeNull();
    expect(() => clearCompanionDraft('a', { removeItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });
});
