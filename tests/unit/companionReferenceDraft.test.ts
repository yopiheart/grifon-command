import { describe, expect, it } from 'vitest';
import { createReferenceDraft, isReferenceDraft, validateReferenceLink, validateMediaFile } from '../../services/companionReferenceDraft.js';
import { adoptConversations, updateConversation } from '../../services/companionConversations.js';

describe('reference brief local contract', () => {
  it('allows incomplete drafts and keeps reference language independent from output language', () => {
    const draft = createReferenceDraft();
    expect(draft.outputLanguage).toBe('Taglish');
    expect(isReferenceDraft({ ...draft, referenceLanguage: 'Japanese' })).toBe(true);
    expect(isReferenceDraft({ ...draft, version: 2 })).toBe(false);
  });
  it('preserves a chosen unavailable voice and media without changing the old draft', () => {
    const book = adoptConversations('alice', null, null);
    const draft = { ...createReferenceDraft(), brief: 'Coffee for parents', voice: { id: 'saved-voice', name: 'My voice', source: 'private' as const } };
    const updated = updateConversation(book, book.selectedId, { referenceDraft: draft });
    expect(updated.chats[0].referenceDraft).toEqual(draft);
    expect(book.chats[0].referenceDraft).toBeUndefined();
    expect(updated.chats[0].draft).toEqual(book.chats[0].draft);
    expect(adoptConversations('bob', null, null).chats[0].referenceDraft).toBeUndefined();
  });
  it('only accepts an empty or public HTTPS reference link without embedded credentials', () => {
    expect(validateReferenceLink('')).toBe('');
    expect(validateReferenceLink('https://example.com/reference?v=1')).toBe('https://example.com/reference?v=1');
    for (const link of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com', 'https://localhost/video']) {
      expect(() => validateReferenceLink(link)).toThrow();
    }
  });
  it('rejects unsupported, empty, oversize files before decoding', () => {
    expect(() => validateMediaFile({ size: 10, type: 'image/svg+xml' }, 'photo')).toThrow();
    expect(() => validateMediaFile({ size: 0, type: 'image/png' }, 'photo')).toThrow();
    expect(() => validateMediaFile({ size: 10 * 1024 * 1024 + 1, type: 'image/png' }, 'photo')).toThrow();
    expect(() => validateMediaFile({ size: 100 * 1024 * 1024 + 1, type: 'video/mp4' }, 'video')).toThrow();
  });
  it('rejects six photos, malformed voices and persisted ephemeral URLs', () => {
    const photo = { id: 'asset', name: 'product.png', blob: new Blob(['test'], { type: 'image/png' }), width: 1, height: 1, role: 'product' };
    expect(isReferenceDraft({ ...createReferenceDraft(), photos: [photo] })).toBe(true);
    expect(isReferenceDraft({ ...createReferenceDraft(), photos: Array.from({ length: 6 }, (_, i) => ({ ...photo, id: String(i) })) })).toBe(false);
    expect(isReferenceDraft({ ...createReferenceDraft(), photos: [{ ...photo, blob: 'blob:temporary' }] })).toBe(false);
    expect(isReferenceDraft({ ...createReferenceDraft(), voice: { id: '', name: 'Missing', source: 'private' } })).toBe(false);
  });
});
