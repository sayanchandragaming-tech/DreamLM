/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface UserSession {
  userId: string;
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
}

const STORAGE_CHATS_KEY = 'dreamlm_user_chats';
const LEGACY_CHATS_KEY = `${STORAGE_CHATS_KEY}:legacy-unassigned`;

function getUserStorageKey(userId: string): string | null {
  const normalizedUserId = userId.trim();
  return normalizedUserId
    ? `${STORAGE_CHATS_KEY}:${encodeURIComponent(normalizedUserId)}`
    : null;
}

function archiveUnownedConversations(): void {
  try {
    const raw = localStorage.getItem(STORAGE_CHATS_KEY);
    if (raw === null) return;

    let archiveKey = LEGACY_CHATS_KEY;
    let archiveIndex = 1;
    while (true) {
      const archived = localStorage.getItem(archiveKey);
      if (archived === null) {
        localStorage.setItem(archiveKey, raw);
        localStorage.removeItem(STORAGE_CHATS_KEY);
        return;
      }
      if (archived === raw) {
        localStorage.removeItem(STORAGE_CHATS_KEY);
        return;
      }
      archiveKey = `${LEGACY_CHATS_KEY}:${archiveIndex}`;
      archiveIndex += 1;
    }
  } catch {
    // Legacy data stays unreadable by account-scoped readers if archiving fails.
  }
}

export function getStoredConversations(userId: string): Conversation[] {
  const storageKey = getUserStorageKey(userId);
  if (!storageKey) return [];

  try {
    archiveUnownedConversations();
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversation(convo: Conversation, userId: string): void {
  const storageKey = getUserStorageKey(userId);
  if (!storageKey) return;

  try {
    const existing = getStoredConversations(userId);
    const index = existing.findIndex((c) => c.id === convo.id);
    if (index >= 0) {
      existing[index] = convo;
    } else {
      existing.unshift(convo);
    }
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch {
    // Gracefully handle storage errors
  }
}

export function deleteStoredConversation(id: string, userId: string): Conversation[] {
  const storageKey = getUserStorageKey(userId);
  if (!storageKey) return [];

  try {
    const existing = getStoredConversations(userId);
    const updated = existing.filter((c) => c.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
