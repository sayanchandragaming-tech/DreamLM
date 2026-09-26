/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Conversation, UserSession } from '../services/chatStorage.ts';
import { DREAMLM_LOGO_URL, OrbitalSigil } from './BrandIcons.tsx';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  userSession: UserSession | null;
  onOpenAccountPanel: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  userSession,
  onOpenAccountPanel,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none border-r border-outline-variant/30 transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-space-md pb-space-sm flex items-center justify-between border-b border-outline-variant/20">
            <button
              onClick={onNewChat}
              className="flex items-center gap-space-sm text-left group transition-transform active:scale-[0.98]"
              type="button"
            >
              {!logoError ? (
                <img
                  alt="Dream Circuit DreamLM Brand Mark"
                  className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
                  src={DREAMLM_LOGO_URL}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                  <OrbitalSigil className="w-6 h-6" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-semibold">
                  DreamLM
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                  Dream Circuit
                </span>
              </div>
            </button>
            <span className="bg-surface-variant text-primary font-label-sm text-label-sm px-space-xs py-0.5 rounded font-medium text-[11px]">
              Private Beta
            </span>
          </div>

          {/* New Chat Primary Action */}
          <div className="px-space-md py-space-sm">
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between bg-primary-container text-on-primary font-label-md text-label-md px-space-md py-2.5 rounded-lg hover:bg-primary transition-colors shadow-xs active:scale-[0.99] font-semibold"
              type="button"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>New Chat</span>
              </div>
              <kbd className="bg-primary text-on-primary-container font-code-notation text-code-notation px-1.5 py-0.5 rounded text-[10px]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Previous Chats Section */}
          <div className="flex-1 overflow-y-auto px-space-md py-space-xs space-y-space-sm">
            <div className="font-label-sm text-label-sm uppercase text-outline tracking-wider px-space-xs font-semibold text-[11px]">
              Previous Chats
            </div>

            {conversations.length === 0 ? (
              <div className="px-space-sm py-8 text-center text-on-surface-variant/70 text-body-sm">
                <span className="material-symbols-outlined text-2xl text-outline/40 block mb-1">
                  chat_bubble_outline
                </span>
                <span>No chats yet</span>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((chat) => {
                  const isActive = activeConversationId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      className={`group flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors cursor-pointer text-body-sm ${
                        isActive
                          ? 'bg-surface-container-high text-primary font-medium'
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`}
                      onClick={() => {
                        onSelectConversation(chat.id);
                        onCloseMobile();
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                        <span className="material-symbols-outlined text-[16px] text-outline shrink-0">
                          chat
                        </span>
                        <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => onDeleteConversation(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-container hover:text-error text-outline transition-all"
                        title="Delete chat"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Account Area at Bottom */}
          <div className="p-space-md border-t border-outline-variant/30 bg-surface-container-low">
            <button
              onClick={onOpenAccountPanel}
              className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-left group"
              type="button"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-surface-container-low"></span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                    {userSession?.username || 'Researcher'}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate text-[11px]">
                    Private Beta Access
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors">
                more_vert
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
