/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserSession, Conversation } from '../services/chatStorage.ts';
import {
  ThemeId,
  THEME_OPTIONS,
  useTheme,
} from '../services/themeService.ts';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession | null;
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onNavigateToAdmin: () => void;
  onSignOut: () => void;
  onToast: (msg: string) => void;
}

export const AccountPanel: React.FC<AccountPanelProps> = ({
  isOpen,
  onClose,
  userSession,
  conversations,
  onSelectConversation,
  onNavigateToAdmin,
  onSignOut,
  onToast,
}) => {
  const [activeView, setActiveView] = useState<'menu' | 'history' | 'theme'>('menu');
  const [currentTheme, setCurrentTheme] = useTheme();

  if (!isOpen) return null;

  const handleThemeChange = (id: ThemeId) => {
    setCurrentTheme(id);
    const themeName = THEME_OPTIONS.find((t) => t.id === id)?.name || id;
    onToast(`Theme set to ${themeName}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest max-w-md w-full rounded-xl shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="account-panel-title">
        {/* Top Header with Back Navigation */}
        <div className="bg-surface-container-low px-space-lg py-space-sm flex items-center justify-between border-b border-outline-variant/20">
          <button
            onClick={() => {
              if (activeView !== 'menu') {
                setActiveView('menu');
              } else {
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>{activeView !== 'menu' ? 'Back' : 'Back to Workspace'}</span>
          </button>
          <span className="font-code-notation text-[11px] text-outline font-semibold">
            <span id="account-panel-title">
            {activeView === 'menu'
              ? 'ACCOUNT MENU'
              : activeView === 'history'
              ? 'CHAT HISTORY'
              : 'CUSTOM THEME'}
            </span>
          </span>
        </div>

        {/* Content Body */}
        <div className="p-space-lg space-y-space-md">
          {activeView === 'menu' && (
            <>
              {/* Account Information Card */}
              <div className="p-space-md bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary text-xl font-semibold">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="font-headline-sm text-headline-sm text-primary font-semibold truncate">
                    {userSession?.username || 'Researcher'}
                  </div>
                  <div className="text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
                    <span>Private Beta Access</span>
                  </div>
                </div>
              </div>

              {/* Useful Menu Navigation Items */}
              <div className="space-y-1 font-body-sm text-body-sm pt-1">
                {/* 1. Account Details */}
                <div className="p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 text-on-surface">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      badge
                    </span>
                    <span className="font-medium">Account Status</span>
                  </div>
                  <span className="font-code-notation text-secondary font-semibold">Active</span>
                </div>

                {/* 2. Chat History */}
                <button
                  onClick={() => setActiveView('history')}
                  className="w-full min-h-11 p-2.5 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between text-left text-on-surface group"
                  type="button"
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      history
                    </span>
                    <span className="font-medium">Chat History</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-outline">
                    <span className="font-code-notation text-xs">
                      {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
                    </span>
                    <span className="material-symbols-outlined text-sm group-hover:text-primary transition-colors">
                      chevron_right
                    </span>
                  </div>
                </button>

                {/* 3. Custom Theme */}
                <button
                  onClick={() => setActiveView('theme')}
                  className="w-full min-h-11 p-2.5 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between text-left text-on-surface group"
                  type="button"
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      palette
                    </span>
                    <div>
                      <div className="font-medium">Custom Theme</div>
                      <div className="text-[11px] text-on-surface-variant font-code-notation">
                        {THEME_OPTIONS.find((t) => t.id === currentTheme)?.name || 'Scientific Elegance'}
                        {currentTheme === 'scientific-elegance' ? ' (Default)' : ''}
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </button>

                {/* 4. Admin Panel */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAdmin();
                  }}
                  className="w-full min-h-11 p-2.5 rounded-lg hover:bg-surface-container-high transition-colors flex items-center justify-between text-left text-on-surface group"
                  type="button"
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      admin_panel_settings
                    </span>
                    <div>
                      <div className="font-medium text-primary">Admin Panel</div>
                      <div className="text-[11px] text-on-surface-variant">
                        Requires administrator credentials
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors">
                    lock
                  </span>
                </button>
              </div>

              {/* Private Beta Note */}
              <div className="p-3 rounded-lg bg-surface-container-low text-[11px] text-on-surface-variant leading-relaxed border border-outline-variant/20 flex gap-2">
                <span className="material-symbols-outlined text-secondary text-base shrink-0">
                  shield
                </span>
                <span>
                  DreamLM Private Beta by Dream Circuit. Access is restricted to authorized personnel.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center">
                <button
                  onClick={onClose}
                  className="min-h-11 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-xs font-semibold transition-colors"
                  type="button"
                >
                  Back
                </button>
                <button
                  onClick={onSignOut}
                  className="min-h-11 px-4 py-2 bg-error/10 hover:bg-error-container/30 text-error rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}

          {/* Chat History Sub-View */}
          {activeView === 'history' && (
            <div className="space-y-3">
              <div>
                <h4 className="font-headline-sm text-sm text-primary font-semibold mb-1">
                  Previous Conversations
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Access or review your past real chat sessions.
                </p>
              </div>

              {conversations.length === 0 ? (
                <div className="p-6 text-center text-outline text-xs bg-surface-container-low rounded-lg border border-outline-variant/20">
                  No chats yet
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectConversation(c.id);
                        onClose();
                      }}
                      className="w-full p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-left transition-colors flex items-center justify-between text-xs group"
                      type="button"
                    >
                      <div className="truncate flex-1 pr-2">
                        <div className="font-medium text-primary truncate">{c.title}</div>
                        <div className="text-[11px] text-outline">{c.createdAt}</div>
                      </div>
                      <span className="font-code-notation text-[11px] text-secondary shrink-0">
                        {c.messages.length} msgs
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-outline-variant/20 flex justify-end">
                <button
                  onClick={() => setActiveView('menu')}
                  className="px-4 py-1.5 bg-primary text-on-primary rounded text-xs font-semibold hover:bg-primary-container"
                  type="button"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Custom Theme Sub-View */}
          {activeView === 'theme' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-headline-sm text-sm text-primary font-semibold mb-1">
                  Custom Theme Setting
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Select your visual theme. The default theme is <strong className="text-primary font-semibold">Scientific Elegance</strong>.
                </p>
              </div>

              <div className="space-y-2">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = currentTheme === theme.id;
                  return (
                    <button
                      type="button"
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      aria-pressed={isSelected}
                      className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between text-left ${
                        isSelected
                          ? 'bg-surface-container-high border-secondary text-primary'
                          : 'bg-surface-container-low border-outline-variant/30 hover:border-outline'
                      }`}
                    >
                      <span className="flex min-w-0 flex-col space-y-0.5">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">
                            {theme.name}
                          </span>
                          {theme.isDefault && (
                            <span className="px-1.5 py-0.2 rounded bg-surface-container text-secondary text-[10px] font-bold font-code-notation border border-secondary/20">
                              DEFAULT
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-on-surface-variant leading-snug">
                          {theme.description}
                        </span>
                      </span>

                      <span className="shrink-0 pl-2">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-secondary bg-secondary text-on-secondary'
                              : 'border-outline-variant'
                          }`}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-center">
                <button
                  onClick={() => setActiveView('menu')}
                  className="px-4 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-xs font-semibold"
                  type="button"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    handleThemeChange('scientific-elegance');
                  }}
                  className="px-3 py-1.5 text-xs text-secondary hover:text-primary font-medium"
                  type="button"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
