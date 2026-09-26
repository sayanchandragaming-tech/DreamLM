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
  username: string;
  isAuthenticated: boolean;
  loginTime: string;
}

const STORAGE_CHATS_KEY = 'dreamlm_user_chats';
const STORAGE_USER_KEY = 'dreamlm_user_session';

export function getStoredConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversation(convo: Conversation): void {
  try {
    const existing = getStoredConversations();
    const index = existing.findIndex((c) => c.id === convo.id);
    if (index >= 0) {
      existing[index] = convo;
    } else {
      existing.unshift(convo);
    }
    localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(existing));
  } catch {
    // Gracefully handle storage errors
  }
}

export function deleteStoredConversation(id: string): Conversation[] {
  try {
    const existing = getStoredConversations();
    const updated = existing.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function getUserSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserSession(session: UserSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  } catch {
    // Gracefully handle storage errors
  }
}
