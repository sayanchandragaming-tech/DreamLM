/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Conversation } from '../services/chatStorage.ts';
import { DREAMLM_ADMIN_LOGO_URL } from './BrandIcons.tsx';
import {
  BetaUser,
  UserStatus,
  getRegisteredUsers,
  getAdminAuditEvents,
  getAuditEventSummary,
  banUser,
  unbanUser,
  setUserStatus,
  addBetaUser,
  deleteBetaUser,
  AdminAuditEvent,
} from '../services/userService.ts';

interface AdminViewProps {
  onBackToWorkspace: () => void;
  conversations: Conversation[];
  onToast: (msg: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  onBackToWorkspace,
  conversations,
  onToast,
}) => {
  const [currentTab, setCurrentTab] = useState<'overview' | 'users' | 'conversations' | 'system-control' | 'audit'>('overview');
  const [liveClock, setLiveClock] = useState('00:00:00 UTC');
  const [auditLog, setAuditLog] = useState<AdminAuditEvent[]>([]);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState(true);
  const [adminDataError, setAdminDataError] = useState<string | null>(null);

  // Users Management State
  const [users, setUsers] = useState<BetaUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | UserStatus>('all');
  const [selectedUserDetail, setSelectedUserDetail] = useState<BetaUser | null>(null);

  // Ban confirmation modal
  const [userToBan, setUserToBan] = useState<BetaUser | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('Violation of beta research policy');

  // Add User modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Researcher' | 'Administrator'>('Researcher');
  const [newUserStatus, setNewUserStatus] = useState<UserStatus>('Active');

  const refreshAdminData = async () => {
    setIsLoadingAdminData(true);
    try {
      const [userList, auditEvents] = await Promise.all([
        getRegisteredUsers(),
        getAdminAuditEvents(),
      ]);
      setUsers(userList);
      setAuditLog(auditEvents);
      setAdminDataError(null);
    } catch (error) {
      console.error('Failed to load protected admin data:', error);
      setAdminDataError(error instanceof Error ? error.message : 'Protected admin data could not be loaded.');
    } finally {
      setIsLoadingAdminData(false);
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setLiveClock(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    void refreshAdminData();
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    onToast('Returned to workspace');
    onBackToWorkspace();
  };

  const handleExecuteBan = async () => {
    if (!userToBan) return;
    try {
      await banUser(userToBan.id, banReasonInput);
      await refreshAdminData();
      onToast(`User "${userToBan.username}" has been marked as banned`);
      setUserToBan(null);
      setBanReasonInput('Violation of beta research policy');
      if (selectedUserDetail?.id === userToBan.id) {
        setSelectedUserDetail({ ...userToBan, status: 'Banned', banReason: banReasonInput });
      }
    } catch (error) {
      console.error('Failed to ban beta user:', error);
      onToast('User ban could not be saved. Check administrator access and try again.');
    }
  };

  const handleExecuteUnban = async (user: BetaUser) => {
    try {
      await unbanUser(user.id);
      await refreshAdminData();
      onToast(`User "${user.username}" restored to Active`);
      if (selectedUserDetail?.id === user.id) {
        setSelectedUserDetail({ ...user, status: 'Active', banReason: undefined, bannedAt: undefined, bannedBy: undefined });
      }
    } catch (error) {
      console.error('Failed to unban beta user:', error);
      onToast('User status could not be saved. Check administrator access and try again.');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
    if (newStatus === 'Banned') {
      const u = users.find((x) => x.id === userId);
      if (u) {
        setUserToBan(u);
        return;
      }
    }
    try {
      await setUserStatus(userId, newStatus);
      await refreshAdminData();
      onToast(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update beta user status:', error);
      onToast('User status could not be saved. Check administrator access and try again.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    try {
      await addBetaUser({
        username: newUsername.trim(),
        email: newUserEmail.trim() || undefined,
        role: newUserRole,
        status: newUserStatus,
      });
      await refreshAdminData();
      onToast(`User "${newUsername.trim()}" added to Beta registry`);
      setNewUsername('');
      setNewUserEmail('');
      setIsAddUserModalOpen(false);
    } catch (error) {
      console.error('Failed to add beta user:', error);
      onToast('Beta user could not be added. Check administrator access and try again.');
    }
  };

  const handleDeleteUserRecord = async (userId: string, username: string) => {
    if (confirm(`Remove "${username}" from the beta user directory?`)) {
      try {
        await deleteBetaUser(userId);
        await refreshAdminData();
        if (selectedUserDetail?.id === userId) {
          setSelectedUserDetail(null);
        }
        onToast(`User "${username}" removed`);
      } catch (error) {
        console.error('Failed to delete beta user:', error);
        onToast('Beta user could not be deleted. Check administrator access and try again.');
      }
    }
  };

  const totalMessagesCount = conversations.reduce(
    (acc, curr) => acc + curr.messages.length,
    0
  );

  const activeUsersCount = users.filter((u) => u.status === 'Active').length;
  const pendingUsersCount = users.filter((u) => u.status === 'Pending').length;
  const bannedUsersCount = users.filter((u) => u.status === 'Banned').length;

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    const matchStatus = userFilterStatus === 'all' || u.status === userFilterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-surface select-none">
      {/* Fixed Admin Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-outline-variant/30">
        <div className="w-full h-16 px-space-md sm:px-space-lg flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            {/* Back Button */}
            <button
              onClick={onBackToWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-xs font-semibold transition-colors border border-outline-variant/30"
              type="button"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Workspace</span>
            </button>

            <div className="h-4 w-px bg-surface-container-high hidden sm:block"></div>

            <div className="flex items-center gap-space-sm">
              <img
                alt="DreamLM Admin logo"
                className="h-7 w-auto object-contain"
                src={DREAMLM_ADMIN_LOGO_URL}
              />
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-semibold hidden md:inline">
                DreamLM Admin
              </span>
            </div>

            <span className="font-label-sm text-label-sm uppercase px-space-xs py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant rounded-lg font-semibold border border-secondary/20 text-[10px]">
              Private Beta Control
            </span>
          </div>

          <div className="flex items-center gap-space-md">
            {/* Real Status Indicator */}
            <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low rounded-lg border border-outline-variant/20">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-code-notation text-code-notation text-on-surface-variant uppercase font-medium text-[11px]">
                Enclave Node: Active
              </span>
            </div>

            <div className="h-4 w-px bg-surface-container-high"></div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 font-label-md text-xs font-semibold text-outline hover:text-error transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest z-30 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-outline-variant/30">
        <div className="flex flex-col flex-1 overflow-y-auto py-space-md">
          <div className="px-space-md mb-space-sm">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-outline font-semibold">
              OPERATIONAL DIRECTORY
            </span>
          </div>
          <nav className="flex flex-col gap-1 px-space-sm">
            {[
              { id: 'overview', label: 'Overview', icon: 'dashboard' },
              { id: 'users', label: 'Users & Beta Access', icon: 'group', badge: bannedUsersCount > 0 ? `${bannedUsersCount} banned` : undefined },
              { id: 'conversations', label: 'Conversations', icon: 'forum' },
              { id: 'system-control', label: 'System Control', icon: 'precision_manufacturing' },
              { id: 'audit', label: 'Audit Trail', icon: 'history' },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex items-center justify-between px-3 py-2 transition-colors rounded-lg font-label-md text-xs text-left ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className="text-[10px] bg-error-container text-error px-1.5 py-0.5 rounded font-code-notation font-semibold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-space-md bg-surface-container-low/50 border-t border-outline-variant/30">
          <div className="flex items-center justify-between pb-1">
            <span className="font-label-sm text-xs uppercase font-bold text-primary">
              Dream Circuit
            </span>
            <span className="font-code-notation text-code-notation text-outline text-[11px]">
              v2.0.0
            </span>
          </div>
          <div className="text-[11px] text-on-surface-variant">
            Founders: Arindam Roy • Sayan Chandra
          </div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="pl-64 pt-16">
        <main className="w-full min-h-screen bg-surface p-space-md sm:p-space-xl">
          <div className="max-w-5xl mx-auto space-y-space-lg">
            {adminDataError && (
              <div className="p-3 rounded-lg bg-error-container/30 border border-error/30 text-sm text-error" role="alert">
                {adminDataError}
              </div>
            )}
            {isLoadingAdminData && (
              <div className="text-xs text-on-surface-variant" role="status">
                Loading protected admin data...
              </div>
            )}

            {/* Header Telemetry */}
            <section className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-xs border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-code-notation text-xs text-outline mb-1">
                  <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    NODE: ENCLAVE-PROD-01
                  </span>
                  <span>//</span>
                  <span className="font-bold text-primary">{liveClock}</span>
                </div>
                <h1 className="font-headline-md text-headline-md text-primary font-semibold tracking-tight">
                  DreamLM Admin Control Center
                </h1>
                <p className="font-body-md text-xs text-on-surface-variant mt-0.5">
                  Private beta administration, user access authorization, and security control.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('users')}
                  className="px-3 py-2 bg-surface-container-low text-primary text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors border border-outline-variant/30 flex items-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm text-secondary">group</span>
                  <span>Manage Users</span>
                </button>
                <button
                  onClick={onBackToWorkspace}
                  className="px-3 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  <span>Open User Chat</span>
                </button>
              </div>
            </section>

            {/* REAL DATA KPI CARDS (NO FAKE DATA) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {/* Registered Users */}
              <div
                onClick={() => setCurrentTab('users')}
                className="p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-2xs space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="flex justify-between items-center text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <span>Beta Users</span>
                  <span className="material-symbols-outlined text-sm text-secondary">group</span>
                </div>
                <div className="text-2xl font-bold font-headline-sm text-primary flex items-baseline gap-2">
                  <span>{users.length}</span>
                  <span className="text-xs font-normal text-secondary">({activeUsersCount} Active)</span>
                </div>
                <div className="text-[11px] text-on-surface-variant flex items-center gap-2">
                  {bannedUsersCount > 0 ? (
                    <span className="text-error font-medium">{bannedUsersCount} Banned</span>
                  ) : (
                    <span>0 Banned</span>
                  )}
                  <span>•</span>
                  <span>{pendingUsersCount} Pending</span>
                </div>
              </div>

              {/* Active Conversations */}
              <div
                onClick={() => setCurrentTab('conversations')}
                className="p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-2xs space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div className="flex justify-between items-center text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <span>User Chats</span>
                  <span className="material-symbols-outlined text-sm text-secondary">forum</span>
                </div>
                <div className="text-2xl font-bold font-headline-sm text-primary">
                  {conversations.length}
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  {conversations.length === 0 ? 'No user chats yet' : 'Real stored conversations'}
                </div>
              </div>

              {/* Messages Processed */}
              <div className="p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <span>Total Messages</span>
                  <span className="material-symbols-outlined text-sm text-secondary">message</span>
                </div>
                <div className="text-2xl font-bold font-headline-sm text-primary">
                  {totalMessagesCount}
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  {totalMessagesCount === 0 ? 'No messages exchanged' : 'Sent in current workspace'}
                </div>
              </div>

              {/* AI Status */}
              <div className="p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <span>AI Backend Status</span>
                  <span className="material-symbols-outlined text-sm text-outline">dns</span>
                </div>
                <div className="text-sm font-bold font-code-notation text-on-surface flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-outline"></span>
                  <span>Pending Link</span>
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  Awaiting endpoint integration
                </div>
              </div>
            </section>

            {/* TAB: OVERVIEW */}
            {currentTab === 'overview' && (
              <div className="space-y-space-md">
                {/* Users Quick Snapshot */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
                  <div className="p-space-md bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <h3 className="font-headline-sm text-sm text-primary font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-secondary">group</span>
                        <span>Private Beta Users Directory</span>
                      </h3>
                      <span className="text-xs text-on-surface-variant">
                        Review active researchers, pending invitations, and banned accounts
                      </span>
                    </div>
                    <button
                      onClick={() => setCurrentTab('users')}
                      className="text-xs font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>View All ({users.length})</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>

                  <div className="divide-y divide-outline-variant/20">
                    {users.slice(0, 4).map((u) => (
                      <div
                        key={u.id}
                        className="p-3 flex items-center justify-between hover:bg-surface-container-low/40 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-semibold text-primary">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-primary flex items-center gap-2">
                              <span>{u.username}</span>
                              <span className="font-code-notation text-[10px] text-outline font-normal">
                                ({u.role})
                              </span>
                            </div>
                            {u.email && <div className="text-[11px] text-outline">{u.email}</div>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold font-code-notation ${
                              u.status === 'Active'
                                ? 'bg-secondary-fixed/50 text-secondary border border-secondary/30'
                                : u.status === 'Banned'
                                ? 'bg-error-container/40 text-error border border-error/30'
                                : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                            }`}
                          >
                            {u.status}
                          </span>

                          {u.status === 'Banned' ? (
                            <button
                              onClick={() => handleExecuteUnban(u)}
                              className="px-2 py-1 rounded bg-surface-container text-xs text-secondary hover:text-primary font-medium"
                              type="button"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => setUserToBan(u)}
                              className="px-2 py-1 rounded bg-error-container/20 text-xs text-error hover:bg-error-container/40 font-medium"
                              type="button"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real Conversations Table or Clean Empty State */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
                  <div className="p-space-md bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <h3 className="font-headline-sm text-sm text-primary font-semibold">
                        Real Workspace Conversations
                      </h3>
                      <span className="text-xs text-on-surface-variant">
                        Actual user chat sessions saved in current testing environment
                      </span>
                    </div>
                    <span className="font-code-notation text-xs text-secondary font-semibold">
                      Count: {conversations.length}
                    </span>
                  </div>

                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant text-sm">
                      <span className="material-symbols-outlined text-3xl text-outline/40 block mb-2">
                        inbox
                      </span>
                      <span>No conversations recorded yet.</span>
                      <p className="text-xs text-outline mt-1">
                        Start a conversation in the workspace to see it listed here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-outline-variant/20">
                      {conversations.map((chat) => (
                        <div
                          key={chat.id}
                          className="p-3 flex items-center justify-between hover:bg-surface-container-low/40 transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-base text-secondary">
                              chat
                            </span>
                            <span className="font-medium text-primary">{chat.title}</span>
                          </div>
                          <div className="flex items-center gap-4 text-outline font-code-notation">
                            <span>{chat.messages.length} messages</span>
                            <span>{chat.createdAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Diagnostics / Real Audit Log */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
                  <div className="p-space-md bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
                    <div>
                      <h3 className="font-headline-sm text-sm text-primary font-semibold">
                        Administrative Audit Trail
                      </h3>
                      <span className="text-xs text-on-surface-variant">
                        Real ledger of operator authentication and session activities
                      </span>
                    </div>
                    <span className="font-code-notation text-[11px] text-outline">
                      Latest persisted events
                    </span>
                  </div>

                  <div className="p-space-md space-y-2 font-code-notation text-xs">
                    {auditLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-outline">{new Date(log.createdAt).toLocaleString()}</span>
                            <strong className="text-primary font-semibold">[{log.action}]</strong>
                          </div>
                          <span className="text-secondary font-medium">{log.actorUserId}</span>
                        </div>
                      {(log.targetUserId || getAuditEventSummary(log)) && (
                        <div className="mt-1 text-outline">
                          {log.targetUserId && <span>Target: {log.targetUserId}</span>}
                          {getAuditEventSummary(log) && <span>{log.targetUserId ? ' · ' : ''}{getAuditEventSummary(log)}</span>}
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USERS & BETA ACCESS (FULL BAN / UNBAN / DETAILS CAPABILITY) */}
            {currentTab === 'users' && (
              <div className="space-y-space-md">
                <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
                  {/* Top Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-headline-sm text-base text-primary font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary">manage_accounts</span>
                        <span>Private Beta User Access Control</span>
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Authorize, inspect details, ban, or unban researchers for the private beta.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="px-3.5 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">person_add</span>
                      <span>Add Beta User</span>
                    </button>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-outline-variant/20">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-base">
                        search
                      </span>
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by username or email..."
                        className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 text-xs font-medium">
                      {(['all', 'Active', 'Pending', 'Banned'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setUserFilterStatus(st)}
                          className={`px-2.5 py-1 rounded transition-colors ${
                            userFilterStatus === st
                              ? 'bg-surface-container-lowest text-primary font-semibold shadow-2xs'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {st === 'all' ? 'All' : st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-lg border border-outline-variant/30">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low text-outline uppercase font-code-notation font-semibold text-[10px] tracking-wider border-b border-outline-variant/20">
                        <tr>
                          <th className="py-2.5 px-3">User &amp; Identity</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Registered / Active</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-outline">
                              No matching users found.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary shrink-0">
                                    {u.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-primary flex items-center gap-1.5">
                                      <span>{u.username}</span>
                                    </div>
                                    <div className="text-[11px] text-outline">
                                      {u.email || 'No email provided'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-code-notation text-[11px] text-on-surface-variant">
                                  {u.role}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold font-code-notation w-max ${
                                      u.status === 'Active'
                                        ? 'bg-secondary-fixed/50 text-secondary border border-secondary/30'
                                        : u.status === 'Banned'
                                        ? 'bg-error-container/40 text-error border border-error/30'
                                        : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                                    }`}
                                  >
                                    {u.status}
                                  </span>
                                  {u.status === 'Banned' && u.banReason && (
                                    <span className="text-[10px] text-error font-medium italic truncate max-w-[150px]" title={u.banReason}>
                                      {u.banReason}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-3 font-code-notation text-[11px] text-outline">
                                <div>Reg: {u.registeredAt}</div>
                                <div className="text-on-surface-variant">Act: {u.lastActive}</div>
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* View User Details */}
                                  <button
                                    onClick={() => setSelectedUserDetail(u)}
                                    className="px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container text-primary font-medium text-xs transition-colors border border-outline-variant/30"
                                    type="button"
                                    title="View User Details"
                                  >
                                    View
                                  </button>

                                  {/* Status Selector */}
                                  <select
                                    value={u.status}
                                    onChange={(e) => void handleStatusChange(u.id, e.target.value as UserStatus)}
                                    className="px-2 py-1 rounded bg-surface-container-low text-xs border border-outline-variant/30 text-on-surface focus:outline-none"
                                  >
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Banned">Banned</option>
                                  </select>

                                  {/* Quick Ban / Unban Button */}
                                  {u.status === 'Banned' ? (
                                    <button
                                      onClick={() => handleExecuteUnban(u)}
                                      className="px-2.5 py-1 rounded bg-secondary-fixed/50 text-secondary hover:bg-secondary-fixed font-semibold text-xs transition-colors border border-secondary/30 flex items-center gap-1"
                                      type="button"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                      <span>Unban</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => setUserToBan(u)}
                                      className="px-2.5 py-1 rounded bg-error-container/30 text-error hover:bg-error-container/60 font-semibold text-xs transition-colors border border-error/30 flex items-center gap-1"
                                      type="button"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">block</span>
                                      <span>Ban User</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONVERSATIONS */}
            {currentTab === 'conversations' && (
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
                <h3 className="font-headline-sm text-sm text-primary font-semibold">
                  Conversation Log Inspector
                </h3>
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-outline text-xs">
                    No conversations available to inspect.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 text-xs space-y-1"
                      >
                        <div className="flex justify-between font-semibold text-primary">
                          <span>{c.title}</span>
                          <span className="text-outline font-code-notation">{c.createdAt}</span>
                        </div>
                        <div className="text-on-surface-variant">
                          Messages count: {c.messages.length}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SYSTEM CONTROL */}
            {currentTab === 'system-control' && (
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
                <h3 className="font-headline-sm text-sm text-primary font-semibold">
                  AI Model Connection Architecture
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  DreamLM server proxy endpoints will be connected to the scientific reasoning model. When connected, real inference telemetry will stream here automatically.
                </p>
                <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 font-code-notation text-xs space-y-1 text-on-surface">
                  <div>Model Target: DreamLM-1.0-Resonance</div>
                  <div>Inference Engine: Boson-IV Runtime (Pending server connection)</div>
                  <div>Local Enclave Mode: Active</div>
                </div>
              </div>
            )}

            {/* TAB: AUDIT */}
            {currentTab === 'audit' && (
              <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/30 shadow-xs space-y-space-md">
                <h3 className="font-headline-sm text-sm text-primary font-semibold">
                  Complete Session Ledger
                </h3>
                <div className="space-y-2 font-code-notation text-xs">
                  {auditLog.map((log) => (
                    <div
                      key={log.id}
                        className="p-2.5 rounded bg-surface-container-low border border-outline-variant/20"
                    >
                        <div className="flex items-center justify-between gap-2">
                        <span className="text-outline">{new Date(log.createdAt).toLocaleString()}</span>
                        <strong className="text-primary font-semibold">[{log.action}]</strong>
                          <span className="text-secondary font-medium">{log.actorUserId}</span>
                      </div>
                        {(log.targetUserId || getAuditEventSummary(log)) && (
                          <div className="mt-1 text-outline">
                            {log.targetUserId && <span>Target: {log.targetUserId}</span>}
                            {getAuditEventSummary(log) && <span>{log.targetUserId ? ' · ' : ''}{getAuditEventSummary(log)}</span>}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: VIEW USER DETAILS */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-xl shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col animate-in fade-in duration-150">
            <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">badge</span>
                <span className="font-headline-sm text-xs font-semibold text-primary uppercase">
                  User Details
                </span>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="text-outline hover:text-on-surface text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-space-lg space-y-3 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-outline-variant/20">
                <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-lg text-primary">
                  {selectedUserDetail.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm font-semibold text-primary">
                    {selectedUserDetail.username}
                  </h3>
                  <div className="text-outline font-code-notation text-[11px]">
                    {selectedUserDetail.email || 'No email registered'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="text-outline">Role:</span>
                  <span className="font-medium text-primary">{selectedUserDetail.role}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="text-outline">Access Status:</span>
                  <span
                    className={`font-semibold font-code-notation px-2 py-0.5 rounded text-[11px] ${
                      selectedUserDetail.status === 'Active'
                        ? 'bg-secondary-fixed/50 text-secondary'
                        : selectedUserDetail.status === 'Banned'
                        ? 'bg-error-container/40 text-error'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {selectedUserDetail.status}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-outline-variant/20 font-code-notation">
                  <span className="text-outline">Registered:</span>
                  <span className="text-primary">{selectedUserDetail.registeredAt}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-outline-variant/20 font-code-notation">
                  <span className="text-outline">Last Activity:</span>
                  <span className="text-primary">{selectedUserDetail.lastActive}</span>
                </div>

                {selectedUserDetail.status === 'Banned' && (
                  <div className="p-3 rounded-lg bg-error-container/20 border border-error/20 space-y-1">
                    <div className="font-semibold text-error text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">block</span>
                      <span>Suspension Details</span>
                    </div>
                    <div className="text-on-surface font-body-sm italic">
                      "{selectedUserDetail.banReason || 'Administrative suspension'}"
                    </div>
                    {selectedUserDetail.bannedAt && (
                      <div className="text-[10px] text-outline font-code-notation">
                        Banned at: {selectedUserDetail.bannedAt} by {selectedUserDetail.bannedBy || 'admin'}
                      </div>
                    )}
                  </div>
                )}

                {selectedUserDetail.notes && (
                  <div className="p-2.5 rounded bg-surface-container-low text-on-surface-variant text-[11px]">
                    <span className="font-semibold text-primary block mb-0.5">Notes:</span>
                    {selectedUserDetail.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-container px-4 py-2.5 flex items-center justify-between border-t border-outline-variant/20">
              {selectedUserDetail.status === 'Banned' ? (
                <button
                  onClick={() => handleExecuteUnban(selectedUserDetail)}
                  className="px-3 py-1.5 rounded bg-secondary-fixed/50 text-secondary hover:bg-secondary-fixed text-xs font-semibold"
                >
                  Unban User
                </button>
              ) : (
                <button
                  onClick={() => {
                    setUserToBan(selectedUserDetail);
                  }}
                  className="px-3 py-1.5 rounded bg-error-container/30 text-error hover:bg-error-container/50 text-xs font-semibold"
                >
                  Ban User
                </button>
              )}

              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded hover:bg-primary-container"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BAN CONFIRMATION & REASON */}
      {userToBan && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-xl shadow-2xl border border-error/40 overflow-hidden flex flex-col animate-in fade-in duration-150">
            <div className="bg-error/10 px-4 py-3 flex items-center justify-between border-b border-error/20 text-error">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">block</span>
                <span className="font-headline-sm text-xs font-semibold uppercase">
                  Ban User Confirmation
                </span>
              </div>
              <button
                onClick={() => setUserToBan(null)}
                className="text-outline hover:text-error text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-space-lg space-y-3 text-xs">
              <p className="text-on-surface leading-relaxed">
                Are you sure you want to ban <strong className="text-primary font-bold">{userToBan.username}</strong> from the DreamLM Private Beta?
              </p>
              <p className="text-outline text-[11px]">
                When banned, this user will immediately be blocked from sending messages or logging into the private beta workbench.
              </p>

              <div className="space-y-1 pt-1">
                <label className="font-semibold text-primary block text-[11px]">
                  Ban Reason / Enforcement Notice:
                </label>
                <input
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="Enter reason for suspension..."
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-error"
                />
              </div>
            </div>

            <div className="bg-surface-container px-4 py-3 flex items-center justify-end gap-2 border-t border-outline-variant/20">
              <button
                onClick={() => setUserToBan(null)}
                className="px-3 py-1.5 rounded bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBan}
                className="px-4 py-1.5 rounded bg-error text-white font-semibold text-xs hover:bg-error/90 flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">gavel</span>
                <span>Confirm &amp; Ban User</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD BETA USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="bg-surface-container-lowest max-w-md w-full rounded-xl shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col animate-in fade-in duration-150"
          >
            <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-base">person_add</span>
                <span className="font-headline-sm text-xs font-semibold text-primary uppercase">
                  Add Beta Researcher
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-outline hover:text-on-surface text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-space-lg space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-primary block text-[11px]">
                  Username or Identifier *
                </label>
                <input
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. Dr. Julian Ward"
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-primary block text-[11px]">
                  Institutional Email (Optional)
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. j.ward@oxford.ac.uk"
                  className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-primary block text-[11px]">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:outline-none"
                  >
                    <option value="Researcher">Researcher</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-primary block text-[11px]">Initial Status</label>
                  <select
                    value={newUserStatus}
                    onChange={(e) => setNewUserStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Banned">Banned</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-surface-container px-4 py-3 flex items-center justify-end gap-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="px-3 py-1.5 rounded bg-surface-container-low text-on-surface-variant hover:text-on-surface text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container shadow-xs"
              >
                Save Beta User
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
