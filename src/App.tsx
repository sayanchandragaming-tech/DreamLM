/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppScreen } from './types.ts';
import {
  Conversation,
  UserSession,
  getStoredConversations,
  saveConversation,
  deleteStoredConversation,
  getUserSession,
  setUserSession,
} from './services/chatStorage.ts';
import { isAdminAuthenticated } from './services/adminAuth.ts';
import { isUserBanned, getUserDetails, recordOrUpdateUser } from './services/userService.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatWorkspace } from './components/ChatWorkspace.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { AdminLoginScreen } from './components/AdminLoginScreen.tsx';
import { AdminView } from './components/AdminView.tsx';
import { AccountPanel } from './components/AccountPanel.tsx';
import { BannedScreen } from './components/BannedScreen.tsx';
import { useTheme, applyThemeToDOM } from './services/themeService.ts';
async function requestDreamLMResponse(message: string, sessionId: string): Promise<string> {
  try {
    const apiBaseUrl = import.meta.env.VITE_DREAMLM_API_URL?.trim();
    if (!apiBaseUrl) {
      throw new Error('VITE_DREAMLM_API_URL is missing. Configure it in .env.local and restart Vite.');
    }

    const response = await fetch(`${apiBaseUrl.replace(/\/+$/, '')}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok) {
      throw new Error(`DreamLM API returned HTTP ${response.status}.`);
    }

    const data: unknown = await response.json();
    if (
      typeof data !== 'object' ||
      data === null ||
      !('response' in data) ||
      typeof data.response !== 'string'
    ) {
      throw new Error('DreamLM API returned an invalid response.');
    }

    return data.response;
  } catch (error) {
    console.error(`DreamLM API request failed for session ${sessionId}:`, error);
    throw error;
  }
}


export default function App() {
  const [currentTheme] = useTheme();

  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  const [userSession, setCurrentUserSession] = useState<UserSession | null>(() =>
    getUserSession()
  );
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(() => {
    const session = getUserSession();
    return session ? 'chat' : 'login';
  });

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    getStoredConversations()
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const appendAssistantMessage = (
    conversationId: string,
    content: string,
    isError = false,
    replaceMessageId?: string,
  ) => {
    const assistantMsg = {
      id: `msg_${Date.now()}_a`,
      role: 'assistant' as const,
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      ...(isError ? { isError: true } : {}),
    };

    setConversations((prev) => prev.map((conversation) => {
      if (conversation.id !== conversationId) return conversation;
      const messages = conversation.messages.filter((message) => message.id !== replaceMessageId);
      const updated = { ...conversation, messages: [...messages, assistantMsg] };
      saveConversation(updated);
      return updated;
    }));
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || null;

  const handleLogin = (username: string) => {
    // Check if user is banned
    if (isUserBanned(username)) {
      showToast('Access denied: account is banned');
      return;
    }

    const reg = recordOrUpdateUser(username, 'Researcher');
    if (!reg.allowed) {
      showToast(reg.error || 'Account suspended');
      return;
    }

    const session: UserSession = {
      username,
      isAuthenticated: true,
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setUserSession(session);
    setCurrentUserSession(session);
    setCurrentScreen('chat');
    showToast(`Welcome, ${username}`);
  };

  const handleSignOut = () => {
    setUserSession(null);
    setCurrentUserSession(null);
    setIsAccountPanelOpen(false);
    setCurrentScreen('login');
    showToast('Signed out of workspace');
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setIsMobileSidebarOpen(false);
    showToast('New chat ready');
  };

  const handleDeleteConversation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = deleteStoredConversation(id);
    setConversations(updated);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    showToast('Conversation deleted');
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c));
      const target = updated.find((c) => c.id === id);
      if (target) saveConversation(target);
      return updated;
    });
    showToast('Conversation renamed');
  };

  const handleSendMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg = {
      id: `msg_${Date.now()}_u`,
      role: 'user' as const,
      content: text,
      timestamp,
    };

    let targetConvo: Conversation;

    if (!activeConversationId || !activeConversation) {
      // Create new real conversation
      const newTitle = text.length > 34 ? `${text.slice(0, 32)}...` : text;
      targetConvo = {
        id: `chat_${Date.now()}`,
        title: newTitle,
        createdAt: new Date().toLocaleDateString(),
        messages: [userMsg],
      };
      const updated = [targetConvo, ...conversations];
      setConversations(updated);
      saveConversation(targetConvo);
      setActiveConversationId(targetConvo.id);
    } else {
      // Append to active conversation
      targetConvo = {
        ...activeConversation,
        messages: [...activeConversation.messages, userMsg],
      };
      const updated = conversations.map((c) =>
        c.id === targetConvo.id ? targetConvo : c
      );
      setConversations(updated);
      saveConversation(targetConvo);
    }

    setIsThinking(true);
    void requestDreamLMResponse(text, targetConvo.id)
      .then((assistantResponse) => {
        appendAssistantMessage(targetConvo.id, assistantResponse);
      })
      .catch((error: unknown) => {
        appendAssistantMessage(
          targetConvo.id,
          'DreamLM is temporarily unavailable. Please try again in a moment.',
          true,
        );
      })
      .finally(() => setIsThinking(false));
  };

  const handleRetryLastMessage = () => {
    if (!activeConversation) return;
    const retryTarget = [...activeConversation.messages]
      .reverse()
      .find((message) => message.role === 'assistant');
    if (!retryTarget) return;
    const assistantIndex = activeConversation.messages.findIndex(
      (message) => message.id === retryTarget.id,
    );
    const userMessage = activeConversation.messages
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === 'user');
    if (!userMessage) return;

    setIsThinking(true);
    void requestDreamLMResponse(userMessage.content, activeConversation.id)
      .then((assistantResponse) => {
        appendAssistantMessage(
          activeConversation.id,
          assistantResponse,
          false,
          retryTarget.isError ? retryTarget.id : undefined,
        );
      })
      .catch((error: unknown) => {
        appendAssistantMessage(
          activeConversation.id,
          'DreamLM is temporarily unavailable. Please try again in a moment.',
          true,
          retryTarget.isError ? retryTarget.id : undefined,
        );
      })
      .finally(() => setIsThinking(false));
  };

  // Check if current user is banned
  const isCurrentActiveUserBanned =
    userSession?.username && isUserBanned(userSession.username);
  const userBanDetails = userSession?.username
    ? getUserDetails(userSession.username)
    : undefined;

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-secondary-fixed selection:text-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-4 py-2 rounded-lg shadow-xl border border-secondary/40 font-code-notation text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="material-symbols-outlined text-secondary text-base">verified</span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-on-primary-container hover:text-on-primary ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 0. Banned State: If current user session was banned by administrator */}
      {isCurrentActiveUserBanned && currentScreen === 'chat' ? (
        <BannedScreen
          username={userSession?.username || 'User'}
          reason={userBanDetails?.banReason}
          onSignOut={handleSignOut}
        />
      ) : (
        <>
          {/* 1. Login Screen */}
          {currentScreen === 'login' && (
            <LoginScreen
              onLogin={handleLogin}
              onAdminLoginClick={() => setCurrentScreen('admin-login')}
            />
          )}

          {/* 2. Admin Login Screen */}
          {currentScreen === 'admin-login' && (
            <AdminLoginScreen
              onSuccess={() => {
                showToast('Administrator credentials verified');
                setCurrentScreen('admin-panel');
              }}
              onBack={() => {
                if (userSession) {
                  setCurrentScreen('chat');
                } else {
                  setCurrentScreen('login');
                }
              }}
            />
          )}

          {/* 3. Admin Panel Screen */}
          {currentScreen === 'admin-panel' && (
            <AdminView
              onBackToWorkspace={() => setCurrentScreen('chat')}
              conversations={conversations}
              currentUser={userSession}
              onToast={showToast}
            />
          )}

          {/* 4. Chat Workspace Screen */}
          {currentScreen === 'chat' && (
            <div className="flex h-screen w-full overflow-hidden">
              {/* Sidebar */}
              <Sidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => setActiveConversationId(id)}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                userSession={userSession}
                onOpenAccountPanel={() => setIsAccountPanelOpen(true)}
                isOpenMobile={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
              />

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col h-full lg:pl-72">
                <ChatWorkspace
                  conversation={activeConversation}
                  onSendMessage={handleSendMessage}
                  onRetryLastMessage={handleRetryLastMessage}
                  isThinking={isThinking}
                  userSession={userSession}
                  onOpenSidebarMobile={() => setIsMobileSidebarOpen(true)}
                  onOpenAccountPanel={() => setIsAccountPanelOpen(true)}
                  onNewChat={handleNewChat}
                  onRenameConversation={handleRenameConversation}
                  onDeleteConversation={(id) => handleDeleteConversation(id)}
                  onToast={showToast}
                />
              </div>

              {/* Account Panel / Side Menu */}
              <AccountPanel
                isOpen={isAccountPanelOpen}
                onClose={() => setIsAccountPanelOpen(false)}
                userSession={userSession}
                conversations={conversations}
                onSelectConversation={(id) => {
                  setActiveConversationId(id);
                  setIsAccountPanelOpen(false);
                }}
                onNavigateToAdmin={() => {
                  setIsAccountPanelOpen(false);
                  if (isAdminAuthenticated()) {
                    setCurrentScreen('admin-panel');
                  } else {
                    setCurrentScreen('admin-login');
                  }
                }}
                onSignOut={handleSignOut}
                onToast={showToast}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
