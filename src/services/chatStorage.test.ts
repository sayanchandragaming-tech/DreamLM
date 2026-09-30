import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  Conversation,
  deleteStoredConversation,
  getStoredConversations,
  saveConversation,
} from './chatStorage.ts';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
});

function createConversation(id: string): Conversation {
  return {
    id,
    title: id,
    createdAt: '2026-09-30',
    messages: [{ id: `${id}-message`, role: 'user', content: id, timestamp: '12:00' }],
  };
}

test('conversation histories remain isolated across A/B/A account switching', () => {
  const conversationA = createConversation('conversation-a');
  const conversationB = createConversation('conversation-b');

  saveConversation(conversationA, 'supabase-user-a');
  assert.deepEqual(getStoredConversations('supabase-user-a'), [conversationA]);

  saveConversation(conversationB, 'supabase-user-b');
  assert.deepEqual(getStoredConversations('supabase-user-b'), [conversationB]);
  assert.deepEqual(getStoredConversations('supabase-user-a'), [conversationA]);
});

test('deleting a conversation changes only the owning account storage', () => {
  const conversationA = createConversation('shared-id');
  const conversationB = createConversation('shared-id');
  conversationB.title = 'User B conversation';

  saveConversation(conversationA, 'supabase-user-a');
  saveConversation(conversationB, 'supabase-user-b');
  assert.deepEqual(deleteStoredConversation('shared-id', 'supabase-user-a'), []);

  assert.deepEqual(getStoredConversations('supabase-user-a'), []);
  assert.deepEqual(getStoredConversations('supabase-user-b'), [conversationB]);
});

test('legacy unowned conversations are archived without being assigned to an account', () => {
  const legacyConversations = [createConversation('legacy-conversation')];
  const legacyRaw = JSON.stringify(legacyConversations);
  storage.setItem('dreamlm_user_chats', legacyRaw);

  assert.deepEqual(getStoredConversations('supabase-user-a'), []);
  assert.equal(storage.getItem('dreamlm_user_chats'), null);
  assert.equal(storage.getItem('dreamlm_user_chats:legacy-unassigned'), legacyRaw);
  assert.deepEqual(getStoredConversations('supabase-user-b'), []);

  getStoredConversations('supabase-user-a');
  assert.equal(storage.getItem('dreamlm_user_chats:legacy-unassigned'), legacyRaw);
  assert.deepEqual(JSON.parse(legacyRaw), legacyConversations);
});

test('legacy archive collisions are preserved in a separate idempotent slot', () => {
  const existingArchive = JSON.stringify([createConversation('older-legacy')]);
  const unownedConversations = JSON.stringify([createConversation('new-legacy')]);
  storage.setItem('dreamlm_user_chats:legacy-unassigned', existingArchive);
  storage.setItem('dreamlm_user_chats', unownedConversations);

  getStoredConversations('supabase-user-a');
  assert.equal(storage.getItem('dreamlm_user_chats:legacy-unassigned'), existingArchive);
  assert.equal(storage.getItem('dreamlm_user_chats:legacy-unassigned:1'), unownedConversations);
  assert.equal(storage.getItem('dreamlm_user_chats'), null);
  getStoredConversations('supabase-user-b');
  assert.equal(storage.getItem('dreamlm_user_chats:legacy-unassigned:1'), unownedConversations);
});

test('missing account identity cannot read or mutate unowned conversation storage', () => {
  const legacyConversations = JSON.stringify([createConversation('legacy-conversation')]);
  storage.setItem('dreamlm_user_chats', legacyConversations);

  assert.deepEqual(getStoredConversations(' '), []);
  saveConversation(createConversation('new-conversation'), '');
  assert.deepEqual(deleteStoredConversation('legacy-conversation', ''), []);

  assert.equal(storage.getItem('dreamlm_user_chats'), legacyConversations);
  assert.equal(storage.getItem('dreamlm_user_chats:legacy-unassigned'), null);
});