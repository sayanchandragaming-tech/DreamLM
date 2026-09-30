/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppScreen } from './types.ts';
import {
  Conversation,
  UserSession,
  getStoredConversations,
  saveConversation,
  deleteStoredConversation,
} from './services/chatStorage.ts';
import { hasAdminRole } from './services/adminAuth.ts';
import { recordOrUpdateUser } from './services/userService.ts';
import { supabase } from './services/supabaseClient.ts';
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

  const [userSession, setCurrentUserSession] = useState<UserSession | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isCurrentActiveUserBanned, setIsCurrentActiveUserBanned] = useState(false);
  const [currentUserBanReason, setCurrentUserBanReason] = useState<string | undefined>();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');

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

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;
    let authRevision = 0;
    const applyAuthSession = async (session: Session | null) => {
      const revision = ++authRevision;
      if (!isMounted) return;

      if (session?.user) {
        setIsAdminUser(hasAdminRole(session.user));
        const email = session.user.email?.trim();
        const metadata = session.user.user_metadata;
        const metadataName = typeof metadata.full_name === 'string'
          ? metadata.full_name
          : typeof metadata.name === 'string'
            ? metadata.name
            : undefined;
        const identity = email || metadataName || session.user.id;
        const username = metadataName || email || 'Researcher';

        setCurrentUserSession({
          username,
          isAuthenticated: true,
          loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setCurrentScreen((screen) => screen === 'admin-login' ? screen : 'chat');
        setIsAuthLoading(false);

        try {
          const trackedUser = await recordOrUpdateUser(identity);
          if (!isMounted || revision !== authRevision) return;
          setCurrentUserSession((current) => current
            ? { ...current, username: trackedUser.user?.username || current.username }
            : current);
          setIsCurrentActiveUserBanned(trackedUser.status === 'Banned');
          setCurrentUserBanReason(trackedUser.user?.banReason);
        } catch (error) {
          console.error('Beta user status lookup failed:', error);
          if (!isMounted || revision !== authRevision) return;
          setIsCurrentActiveUserBanned(false);
          setCurrentUserBanReason(undefined);
        }
      } else {
        setIsAdminUser(false);
        setCurrentUserSession(null);
        setIsCurrentActiveUserBanned(false);
        setCurrentUserBanReason(undefined);
        setCurrentScreen('login');
        setIsAuthLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyAuthSession(session);
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return applyAuthSession(data.session);
      })
      .catch((error: unknown) => {
        console.error('Supabase session lookup failed:', error);
        void applyAuthSession(null);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !userSession && currentScreen === 'chat') {
      setCurrentScreen('login');
    }
  }, [currentScreen, isAuthLoading, userSession]);

  useEffect(() => {
    if (currentScreen === 'admin-panel' && (!userSession || !isAdminUser)) {
      setCurrentScreen(userSession ? 'admin-login' : 'login');
    }
  }, [currentScreen, isAdminUser, userSession]);

  useEffect(() => {
    if (currentScreen === 'admin-login' && userSession && isAdminUser) {
      setCurrentScreen('admin-panel');
    }
  }, [currentScreen, isAdminUser, userSession]);

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

  const handleSignOut = () => {
    if (!supabase) return;
    void supabase.auth.signOut().then(({ error }) => {
      if (error) {
        console.error('Supabase sign-out failed:', error);
        showToast('Sign out failed. Please try again.');
        return;
      }
      setIsAccountPanelOpen(false);
      showToast('Signed out of workspace');
    });
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
          reason={currentUserBanReason}
          onSignOut={handleSignOut}
        />
      ) : (
        <>
          {/* 1. Login Screen */}
          {currentScreen === 'login' && (
            <LoginScreen
              onAdminLoginClick={() => setCurrentScreen('admin-login')}
            />
          )}

          {/* 2. Admin Login Screen */}
          {currentScreen === 'admin-login' && (
            <AdminLoginScreen
              onSuccess={() => {
                showToast('Administrator access verified');
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
            userSession && isAdminUser ? (
            <AdminView
              onBackToWorkspace={() => setCurrentScreen('chat')}
              conversations={conversations}
              onToast={showToast}
            />
            ) : null
          )}

          {/* 4. Chat Workspace Screen */}
          {currentScreen === 'chat' && userSession && (
            <div className="flex h-screen h-dvh w-full overflow-hidden">
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
                  if (isAdminUser) {
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
