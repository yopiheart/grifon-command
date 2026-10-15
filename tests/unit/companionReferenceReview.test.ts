import { describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { adoptConversations, updateConversation } from '../../services/companionConversations.js';
import { fingerprintReferenceDraft, createSampleReview, editSampleReview, confirmSampleReview, isReferenceReview, reviewErrors, sampleQuoteTotals } from '../../services/companionReferenceReview.js';

describe('fixture reference review contract', () => {
  it('hashes actual media contents, roles, language and voice', async () => {
    const photo = { id: 'p', name: 'same.png', blob: new Blob(['one'], { type: 'image/png' }), width: 1, height: 1, role: 'product' as const };
    const draft = { ...createReferenceDraft(), photos: [photo] };
    const original = await fingerprintReferenceDraft(draft);
    expect(await fingerprintReferenceDraft({ ...draft, photos: [{ ...photo, blob: new Blob(['one'], { type: 'image/png' }) }] })).toBe(original);
    expect(await fingerprintReferenceDraft({ ...draft, photos: [{ ...photo, blob: new Blob(['two'], { type: 'image/png' }) }] })).not.toBe(original);
    expect(await fingerprintReferenceDraft({ ...draft, photos: [{ ...photo, role: 'character' }] })).not.toBe(original);
    expect(await fingerprintReferenceDraft({ ...draft, outputLanguage: 'English' })).not.toBe(original);
    expect(await fingerprintReferenceDraft({ ...draft, voice: { id: 'voice', name: 'Voice', source: 'private' } })).not.toBe(original);
  });
  it('creates an explicitly illustrative plan without inventing facts or localizing English sample copy', async () => {
    const draft = { ...createReferenceDraft(), offer: 'Unverified cure for PHP999', referenceLanguage: 'Japanese' };
    const review = createSampleReview(draft, await fingerprintReferenceDraft(draft), 0);
    expect(review.fixture).toBe(true);
    expect(review.outputLanguage).toBe('Taglish');
    expect(review.scenes.map(scene => scene.script).join(' ')).not.toContain('999');
    expect(review.missing).toContain('Product or service');
    expect(sampleQuoteTotals(review.quote)).toEqual({ lowCents: 22000, highCents: 34000, capCents: 35000 });
    expect(isReferenceReview(review)).toBe(true);
  });
  it('invalidates confirmation on any plan/quote/input edit, including edit then revert', async () => {
    const draft = createReferenceDraft();
    const hash = await fingerprintReferenceDraft(draft);
    const review = createSampleReview(draft, hash, 0);
    const confirmed = confirmSampleReview(review, hash, 0);
    expect(confirmed.confirmation?.revision).toBe(review.revision);
    expect(editSampleReview(confirmed, { direction: 'Different direction' }).confirmation).toBeNull();
    const book = adoptConversations('alice', null, null);
    book.chats[0].referenceDraft = draft; book.chats[0].referenceReview = confirmed;
    const changed = updateConversation(book, book.selectedId, { referenceDraft: { ...draft, brief: 'Changed' } });
    const reverted = updateConversation(changed, book.selectedId, { referenceDraft: draft });
    expect(reverted.chats[0].referenceReview?.stale).toBe(true);
    expect(reverted.chats[0].referenceReview?.confirmation).toBeNull();
    expect(() => confirmSampleReview(reverted.chats[0].referenceReview!, hash, reverted.chats[0].referenceInputRevision!)).toThrow();
    expect(() => confirmSampleReview(review, '0'.repeat(64), 0)).toThrow();
  });
  it('validates partial edit errors without discarding persisted work', async () => {
    const draft = createReferenceDraft();
    const review = createSampleReview(draft, await fingerprintReferenceDraft(draft), 0);
    const invalid = editSampleReview(review, { scenes: [{ ...review.scenes[0], start: '', script: '' }, ...review.scenes.slice(1)], quote: { ...review.quote, maxDemoCapPesos: '1.00' } });
    expect(isReferenceReview(invalid)).toBe(true);
    expect(reviewErrors(invalid).length).toBeGreaterThan(0);
    expect(() => confirmSampleReview(invalid, invalid.inputHash, 0)).toThrow();
    expect(isReferenceReview({ ...review, version: 7 })).toBe(false);
    expect(isReferenceReview({ ...review, confirmation: { revision: 99 } })).toBe(false);
  });
  it('keeps silent plans silent and drops spoken-audio cost without selecting a voice', async () => {
    const draft = { ...createReferenceDraft(), speechMode: 'silent' as const };
    const review = createSampleReview(draft, await fingerprintReferenceDraft(draft), 0);
    expect(review.scenes.every(scene => scene.script === '')).toBe(true);
    expect(review.audio.speech).toContain('No spoken audio');
    expect(review.voice).toBeNull();
    expect(review.quote.items.find(item => item.id === 'voice')?.highPesos).toBe('0.00');
    expect(reviewErrors(review)).toEqual([]);
  });
  it('binds the confirmation to exact plan content and quote while preserving decimal-cent arithmetic', async () => {
    const draft = createReferenceDraft();
    const review = createSampleReview(draft, await fingerprintReferenceDraft(draft), 0);
    const confirmed = confirmSampleReview(review, review.inputHash, 0);
    expect(isReferenceReview({ ...confirmed, direction: 'Edited without a new revision' })).toBe(false);
    expect(isReferenceReview({ ...confirmed, quote: { ...confirmed.quote, maxDemoCapPesos: '400' } })).toBe(false);
    const revised = editSampleReview(editSampleReview(confirmed, { direction: 'New' }), { direction: confirmed.direction });
    expect(revised.revision).toBe(confirmed.revision + 2);
    expect(revised.confirmation).toBeNull();
    const quote = { ...review.quote, items: review.quote.items.map((item, index) => ({ ...item, lowPesos: index ? '0.00' : '1.23', highPesos: index ? '0.00' : '2.34' })), contingencyPesos: '0.01', maxDemoCapPesos: '3.00' };
    expect(sampleQuoteTotals(quote)).toEqual({ lowCents: 124, highCents: 235, capCents: 300 });
    expect(isReferenceReview({ ...review, scenes: null })).toBe(false);
    expect(isReferenceReview({ ...review, quote: { items: null } })).toBe(false);
  });
});
