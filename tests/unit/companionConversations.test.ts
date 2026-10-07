import { describe, expect, it } from 'vitest';
import { createConversation, adoptConversations, updateConversation } from '../../services/companionConversations.js';
import { acceptCompanionAnswer, createCompanionDraft } from '../../services/companionIntake.js';

describe('device-local project conversations', () => {
  it('assigns identity before a run exists and preserves earlier drafts when adding a chat', () => {
    const first = createConversation(acceptCompanionAnswer(createCompanionDraft(), 'Coffee for parents'));
    const second = createConversation();
    const book = { version: 1 as const, userId: 'alice', selectedId: second.id, chats: [first, second] };
    const updated = updateConversation(book, second.id, { composer: 'Unsent idea' });
    expect(first.id).not.toBe(second.id);
    expect(first.runId).toBeNull();
    expect(updated.chats[0].draft.brief).toBe('Coffee for parents');
    expect(updated.chats[1].composer).toBe('Unsent idea');
    expect(book.chats[1].composer).toBe('');
  });
  it('adopts the account draft and selected run together without depending on run identity', () => {
    const draft = acceptCompanionAnswer(createCompanionDraft(), 'Existing project');
    const book = adoptConversations('alice', draft, 'run-before-upgrade');
    expect(book.chats).toHaveLength(1);
    expect(book.chats[0]).toMatchObject({ draft, runId: 'run-before-upgrade' });
    expect(book.selectedId).toBe(book.chats[0].id);
    expect(book.selectedId).not.toBe('run-before-upgrade');
    expect(adoptConversations('bob', null, null).chats[0].draft.brief).toBe('');
  });
});
