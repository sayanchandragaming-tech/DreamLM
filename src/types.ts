/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppScreen =
  | 'login'
  | 'chat'
  | 'admin-login'
  | 'admin-panel';

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
