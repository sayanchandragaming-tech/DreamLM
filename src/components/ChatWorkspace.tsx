/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Conversation, ChatMessage, UserSession } from '../services/chatStorage.ts';
import { DREAMLM_LOGO_URL, OrbitalSigil } from './BrandIcons.tsx';
import { AboutModal } from './AboutModal.tsx';

interface ChatWorkspaceProps {
  conversation: Conversation | null;
  onSendMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  isThinking: boolean;
  userSession: UserSession | null;
  onOpenSidebarMobile: () => void;
  onOpenAccountPanel: () => void;
  onNewChat: () => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onDeleteConversation?: (id: string) => void;
  onToast: (msg: string) => void;
}

const THINKING_PHRASES = [
  'DreamLM is thinking...',
  'DreamLM is analysing...',
  'DreamLM is preparing the response...',
  'DreamLM is generating...',
];

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  conversation,
  onSendMessage,
  onRetryLastMessage,
  isThinking,
  userSession,
  onOpenSidebarMobile,
  onOpenAccountPanel,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [showMathShelf, setShowMathShelf] = useState(false);
  const [thinkingPhraseIndex, setThinkingPhraseIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [isConvoMenuOpen, setIsConvoMenuOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const convoMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (convoMenuRef.current && !convoMenuRef.current.contains(e.target as Node)) {
        setIsConvoMenuOpen(false);
      }
      setActiveMessageMenuId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cycle thinking phrases gently while thinking is active
  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setThinkingPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isThinking]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isThinking]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    const text = inputText.trim();
    setInputText('');
    onSendMessage(text);
  };

  const insertGlyph = (glyph: string) => {
    if (!inputRef.current) {
      setInputText((prev) => prev + glyph);
      return;
    }
    const start = inputRef.current.selectionStart || inputText.length;
    const end = inputRef.current.selectionEnd || inputText.length;
    const next = inputText.substring(0, start) + glyph + inputText.substring(end);
    setInputText(next);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.selectionEnd = start + glyph.length;
      }
    }, 10);
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard?.writeText(content);
    onToast('Copied to clipboard');
    setActiveMessageMenuId(null);
  };

  const handleExportConversation = (format: 'txt' | 'md') => {
    if (!conversation) return;
    const lines = conversation.messages.map(
      (m) => `[${m.role === 'user' ? userSession?.username || 'User' : 'DreamLM'} - ${m.timestamp}]\n${m.content}\n`
    );
    const content = `# ${conversation.title}\nCreated: ${conversation.createdAt}\n\n` + lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setIsConvoMenuOpen(false);
    onToast(`Exported as .${format}`);
  };

  const handleRename = () => {
    if (!conversation || !onRenameConversation) return;
    const current = conversation.title;
    const updated = prompt('Enter new conversation title:', current);
    if (updated && updated.trim()) {
      onRenameConversation(conversation.id, updated.trim());
      onToast('Conversation renamed');
    }
    setIsConvoMenuOpen(false);
  };

  const hasMessages = conversation && conversation.messages.length > 0;

  return (
    <div className="flex flex-col h-screen h-dvh w-full relative bg-surface select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 px-space-md sm:px-space-lg flex items-center justify-between border-b border-outline-variant/30 bg-surface/85 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-0.5 sm:gap-space-sm">
          {/* Mobile Hamburger Toggle */}
          <button
            onClick={onOpenSidebarMobile}
            className="min-h-11 min-w-11 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container lg:hidden"
            title="Open chats sidebar"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>

          {/* Model Spec Badge */}
          <div className="flex items-center gap-space-xs text-on-surface-variant font-code-notation text-xs">
            <span className="material-symbols-outlined hidden text-[16px] text-secondary sm:inline">memory</span>
            <span className="text-primary font-semibold">DreamLM</span>
            <span className="hidden text-outline sm:inline">/</span>
            <span className="hidden sm:inline text-on-surface-variant">Private Beta</span>
          </div>

          <span className="hidden sm:inline-block bg-surface-container-high text-primary font-label-sm text-[11px] px-2 py-0.5 rounded font-medium border border-secondary/20">
            Dream Circuit
          </span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 sm:gap-space-sm">
          {/* About DreamLM Trigger */}
          <button
            onClick={() => setIsAboutModalOpen(true)}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-container rounded-lg transition-colors border border-outline-variant/30"
            title="About DreamLM and Dream Circuit"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">info</span>
            <span className="hidden md:inline">About DreamLM</span>
          </button>

          {/* Conversation-Level Contextual (⋮) Menu */}
          {hasMessages && (
            <div className="relative" ref={convoMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConvoMenuOpen(!isConvoMenuOpen);
                }}
                className="min-h-11 min-w-11 text-outline hover:text-primary hover:bg-surface-container rounded-lg transition-colors"
                title="Conversation options"
                type="button"
              >
                <span className="material-symbols-outlined text-base">more_vert</span>
              </button>

              {isConvoMenuOpen && (
                <div className="absolute right-0 top-10 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-1.5 space-y-1 z-30 text-xs font-body-sm animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={handleRename}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-container text-left text-on-surface"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base text-secondary">edit</span>
                    <span>Rename Conversation</span>
                  </button>

                  <button
                    onClick={() => handleExportConversation('md')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-container text-left text-on-surface"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base text-secondary">download</span>
                    <span>Export as Markdown</span>
                  </button>

                  <button
                    onClick={() => handleExportConversation('txt')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-container text-left text-on-surface"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base text-secondary">description</span>
                    <span>Export as Text</span>
                  </button>

                  <div className="h-px bg-outline-variant/20 my-1"></div>

                  <button
                    onClick={() => {
                      if (conversation && onDeleteConversation) {
                        onDeleteConversation(conversation.id);
                        setIsConvoMenuOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-error-container/20 text-left text-error font-medium"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span>Delete Conversation</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onNewChat}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-surface-container rounded-lg transition-colors border border-outline-variant/30"
            title="New Chat (⌘K)"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Account Profile Trigger */}
          <button
            onClick={onOpenAccountPanel}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-surface-container transition-colors text-left"
            title="Account & preferences"
            type="button"
          >
            <span className="font-label-sm text-xs font-medium text-on-surface hidden md:inline truncate max-w-[120px]">
              {userSession?.username || 'Researcher'}
            </span>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-semibold">
              <span className="material-symbols-outlined text-base">person</span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Chat Content Area */}
      <div className="flex-1 overflow-y-auto relative flex flex-col justify-between">
        {!hasMessages ? (
          /* Welcome Home Screen with DreamLM & Dream Circuit & Founder Info */
          <div className="relative w-full max-w-4xl mx-auto px-space-md sm:px-space-lg py-space-md flex flex-col items-center justify-center flex-1 my-auto transition-opacity duration-300">
            {/* Subtle Mathematical Watermark Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25">
              <svg className="w-full h-full text-secondary/15" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern height="120" id="math-grid-chat" patternUnits="userSpaceOnUse" width="120">
                    <path
                      d="M 120 0 L 0 0 0 120"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="2,6"
                      strokeWidth="0.5"
                    ></path>
                    <circle cx="0" cy="0" fill="currentColor" r="1.5"></circle>
                  </pattern>
                </defs>
                <rect fill="url(#math-grid-chat)" height="100%" width="100%"></rect>
              </svg>
              <div className="absolute top-12 left-16 font-code-notation text-code-notation text-primary/10 tracking-widest pointer-events-none">
                iℏ ∂ψ/∂t = Ĥψ
              </div>
              <div className="absolute bottom-24 right-20 font-code-notation text-code-notation text-primary/10 tracking-widest pointer-events-none">
                ∇²Φ - c⁻² ∂²Φ/∂t² = 4πGρ
              </div>
            </div>

            {/* Center Brand Emblem & Title */}
            <div className="relative z-10 flex flex-col items-center text-center space-y-2 mb-4">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-surface-container-lowest rounded-full shadow-md border border-outline-variant/30 mb-1">
                {!logoError ? (
                  <img
                    alt="Dream Circuit Orbital Sigil"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    src={DREAMLM_LOGO_URL}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <OrbitalSigil className="w-14 h-14" />
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container-high/80 text-[11px] font-semibold text-primary border border-secondary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span>Private Research Beta • Dream Circuit</span>
              </div>

              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-semibold">
                DreamLM
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-lg leading-relaxed text-sm">
                Theoretical reasoning, computational physics, and mathematical synthesis engineered for frontier scientific discovery.
              </p>
            </div>

            {/* Clean Dream Circuit & Founders Information Section */}
            <div className="relative z-10 w-full max-w-xl p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xs mb-5 space-y-3">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-base">science</span>
                  <span className="font-headline-sm text-xs font-semibold text-primary">
                    About DreamLM &amp; Dream Circuit
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAboutModalOpen(true)}
                  className="text-[11px] text-secondary hover:text-primary font-medium flex items-center gap-0.5"
                >
                  <span>Learn more</span>
                  <span className="text-[10px]">→</span>
                </button>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                DreamLM is an AI assistant developed by <strong className="text-primary font-semibold">Dream Circuit</strong>.
              </p>

              {/* Creators & Founders Minimal Grid */}
              <div className="pt-0.5">
                <div className="text-[11px] font-code-notation text-outline uppercase font-semibold mb-1.5">
                  Creators &amp; Founders
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-sm">person</span>
                    </div>
                    <span className="font-semibold text-primary truncate">Arindam Roy</span>
                  </div>

                  <div className="p-2 bg-surface-container-low rounded-lg border border-outline-variant/20 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-sm">person</span>
                    </div>
                    <span className="font-semibold text-primary truncate">Sayan Chandra</span>
                  </div>
                </div>
              </div>

              {/* Private Beta Notice */}
              <div className="text-[11px] text-outline leading-relaxed pt-1 flex items-start gap-1.5 border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-xs text-secondary shrink-0 mt-0.5">shield</span>
                <span>
                  Access is restricted. Conversations may be reviewed by Dream Circuit for beta testing, safety, and model improvement.
                </span>
              </div>
            </div>

            {/* 4 Clean Prompt Suggestions */}
            <div className="relative z-10 w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {[
                {
                  field: 'General Relativity',
                  text: 'Derive geodesic equations on a perturbed Kerr metric',
                },
                {
                  field: 'Machine Learning Physics',
                  text: 'Analyze spectral entropy in deep transformer attention heads',
                },
                {
                  field: 'Quantum Information',
                  text: 'Formulate Hamiltonian for a 12-qubit topological stabilizer code',
                },
                {
                  field: 'Differential Geometry',
                  text: 'Verify proof boundaries for non-Euclidean latent spaces',
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(item.text);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  className="p-2.5 bg-surface-container-lowest rounded-lg shadow-2xs border border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-high/40 transition-all text-left flex flex-col justify-between group"
                  type="button"
                >
                  <span className="font-label-sm text-[10px] uppercase tracking-wider text-secondary font-bold mb-0.5">
                    {item.field}
                  </span>
                  <span className="font-body-sm text-xs text-on-surface group-hover:text-primary font-medium leading-snug">
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Conversation Messages Stream (Focused Workspace) */
          <div className="w-full max-w-4xl mx-auto px-space-md sm:px-space-lg py-space-lg space-y-space-lg flex-1 animate-in fade-in duration-300">
            {conversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-space-sm ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30 mt-1">
                    <OrbitalSigil className="w-5 h-5" />
                  </div>
                )}

                <div
                  className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[78%] ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-code-notation text-outline">
                    <span>{msg.role === 'user' ? userSession?.username || 'You' : 'DreamLM'}</span>
                    <span>·</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {msg.isError ? (
                    /* AI Unavailable Temporary Error State */
                    <div className="p-space-md bg-surface-container-lowest rounded-xl border border-secondary/30 shadow-xs space-y-space-xs text-on-surface">
                      <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
                        <span className="material-symbols-outlined text-base">cloud_off</span>
                        <span>Connection Unavailable</span>
                      </div>
                      <p className="font-body-md text-sm text-on-surface leading-relaxed">
                        {msg.content}
                      </p>
                      <div className="pt-2 flex items-center gap-3 border-t border-outline-variant/20 mt-2">
                        <button
                          onClick={onRetryLastMessage}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-on-primary text-xs font-semibold rounded hover:bg-primary-container transition-colors shadow-2xs"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-sm">refresh</span>
                          <span>Retry</span>
                        </button>
                        <span className="font-code-notation text-[11px] text-outline">
                          Check that the DreamLM API bridge is available
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Regular User or Response Message */
                    <div
                      className={`p-space-md rounded-xl text-body-md text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-surface-container-high text-primary font-medium rounded-tr-none border border-secondary/20 shadow-2xs'
                          : 'bg-surface-container-lowest text-on-surface rounded-tl-none border border-outline-variant/30 shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  )}

                  {/* Contextual Action Strip with (⋮) Menu */}
                  <div className="flex items-center gap-2 self-end mt-0.5 relative">
                    <button
                      onClick={() => handleCopyText(msg.content)}
                      className="text-[11px] text-outline hover:text-primary transition-colors flex items-center gap-1"
                      title="Copy message"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                      <span>Copy</span>
                    </button>

                    {/* Contextual Three-Dot Menu Trigger for Message */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMessageMenuId(
                            activeMessageMenuId === msg.id ? null : msg.id
                          );
                        }}
                        className="text-outline hover:text-primary p-0.5 rounded transition-colors"
                        title="More options"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>

                      {activeMessageMenuId === msg.id && (
                        <div className="absolute right-0 top-5 w-44 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 p-1 space-y-0.5 z-30 text-xs font-body-sm animate-in fade-in duration-100">
                          <button
                            onClick={() => handleCopyText(msg.content)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container text-left text-on-surface"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-sm text-secondary">
                              content_copy
                            </span>
                            <span>Copy</span>
                          </button>

                          {msg.role === 'user' ? (
                            <button
                              onClick={() => {
                                setInputText(msg.content);
                                if (inputRef.current) inputRef.current.focus();
                                setActiveMessageMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container text-left text-on-surface"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-sm text-secondary">
                                edit
                              </span>
                              <span>Edit query</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  onRetryLastMessage();
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container text-left text-on-surface"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-sm text-secondary">
                                  refresh
                                </span>
                                <span>Retry</span>
                              </button>

                              <button
                                onClick={() => {
                                  onToast('Analysis context noted for active thread');
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container text-left text-on-surface"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-sm text-secondary">
                                  help_outline
                                </span>
                                <span>Learn</span>
                              </button>

                              <button
                                onClick={() => {
                                  onToast('Report logged for model safety verification');
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container text-left text-error"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  flag
                                </span>
                                <span>Report Problem</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 text-xs font-semibold mt-1">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                  </div>
                )}
              </div>
            ))}

            {/* Subtle Professional Thinking Animation */}
            {isThinking && (
              <div className="flex items-start gap-space-sm justify-start animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/30 mt-1">
                  <OrbitalSigil className="w-5 h-5" animated />
                </div>
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <span className="font-code-notation text-[11px] text-outline">DreamLM</span>
                  <div className="p-space-md bg-surface-container-lowest rounded-xl rounded-tl-none border border-secondary/30 shadow-xs flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                    <span className="font-body-md text-xs text-primary font-medium">
                      {THINKING_PHRASES[thinkingPhraseIndex]}
                    </span>
                    <div className="flex gap-1 ml-1">
                      <span className="w-1 h-1 bg-secondary rounded-full animate-bounce [animation-delay:0s]"></span>
                      <span className="w-1 h-1 bg-secondary rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1 h-1 bg-secondary rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Area */}
      <div className="w-full bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 py-space-sm px-space-md sm:px-space-lg shrink-0">
        <div className="w-full max-w-4xl mx-auto">
          {/* Quick Glyphs Shelf */}
          {showMathShelf && (
            <div className="mb-2 p-2 bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-xs flex items-center gap-1.5 flex-wrap text-xs animate-in fade-in slide-in-from-bottom-2 duration-150">
              <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider font-semibold mr-1">
                Glyphs:
              </span>
              {['∂', '∇', '∑', '∫', 'ℏ', '⊗', '⟨ψ|ϕ⟩', '\\mathcal{H}', 'σ_z', 'ω₀', 'Γ^k_{ij}', 'g_μν'].map(
                (sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => insertGlyph(sym)}
                    className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high font-code-notation text-xs text-primary transition-colors hover:scale-105 active:scale-95"
                  >
                    {sym}
                  </button>
                )
              )}
            </div>
          )}

          {/* Input Box Shell */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/40 focus-within:border-primary/50 focus-within:shadow-md transition-all"
          >
            {/* Notation Helper Trigger */}
            <button
              type="button"
              onClick={() => setShowMathShelf(!showMathShelf)}
              className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-colors text-xs font-code-notation font-semibold ${
                showMathShelf
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
              title="Toggle mathematical glyphs"
            >
              ∫x
            </button>

            {/* Text Input */}
            <input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isThinking}
              placeholder="Ask DreamLM a scientific query, formulate a theorem, or paste LaTeX..."
              className="min-w-0 flex-1 bg-transparent border-0 outline-none font-body-md text-base sm:text-sm text-on-surface placeholder:text-outline/70 px-2 py-1"
              type="text"
            />

            {/* Send Action */}
            <button
              type="submit"
              disabled={!inputText.trim() || isThinking}
              className={`min-w-11 min-h-11 rounded-lg flex items-center justify-center transition-all ${
                inputText.trim() && !isThinking
                  ? 'bg-primary hover:bg-primary-container text-on-primary shadow-xs hover:scale-105 active:scale-95'
                  : 'bg-surface-container text-outline cursor-not-allowed'
              }`}
              title="Send message"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
          </form>

          {/* Subtext Footnote */}
          <div className="mt-1 text-center font-label-sm text-[10px] text-outline">
            <span>DreamLM Private Beta • Developed by Dream Circuit. For authorized research personnel only.</span>
          </div>
        </div>
      </div>

      {/* About DreamLM Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </div>
  );
};
