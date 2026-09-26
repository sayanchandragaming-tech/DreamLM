/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserStatus = 'Pending' | 'Active' | 'Banned';

export interface BetaUser {
  id: string;
  username: string;
  email?: string;
  status: UserStatus;
  registeredAt: string;
  lastActive: string;
  role: 'Researcher' | 'Administrator';
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  notes?: string;
}

const STORAGE_USERS_KEY = 'dreamlm_registered_users';

// Seed initial users representing real administrators and beta researchers
const INITIAL_USERS: BetaUser[] = [
  {
    id: 'user_sayan_01',
    username: 'Sayan Chandra',
    email: 'sayanchandra.gaming@gmail.com',
    status: 'Active',
    registeredAt: '2026-09-20 09:30',
    lastActive: 'Just now',
    role: 'Administrator',
    notes: 'Co-Founder & Lead Engineer, Dream Circuit',
  },
  {
    id: 'user_arindam_02',
    username: 'Arindam Roy',
    email: 'arindam.roy@dreamcircuit.internal',
    status: 'Active',
    registeredAt: '2026-09-20 09:30',
    lastActive: '2026-09-26 11:15',
    role: 'Administrator',
    notes: 'Co-Founder & Research Lead, Dream Circuit',
  },
  {
    id: 'user_researcher_03',
    username: 'Dr. Evelyn Chen',
    email: 'e.chen@princeton.edu',
    status: 'Active',
    registeredAt: '2026-09-24 14:22',
    lastActive: '2026-09-26 10:45',
    role: 'Researcher',
    notes: 'Quantum decoherence & non-Markovian open systems',
  },
  {
    id: 'user_pending_04',
    username: 'Marcus Vance',
    email: 'mvance@cern.ch',
    status: 'Pending',
    registeredAt: '2026-09-26 08:10',
    lastActive: '2026-09-26 08:10',
    role: 'Researcher',
    notes: 'LHC phenomenological tensor simulation access request',
  },
];

export function getRegisteredUsers(): BetaUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return parsed;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: BetaUser[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {
    // Graceful error handling
  }
}

export function recordOrUpdateUser(
  username: string,
  role: 'Researcher' | 'Administrator' = 'Researcher'
): { allowed: boolean; status: UserStatus; error?: string; user?: BetaUser } {
  const users = getRegisteredUsers();
  const cleanName = (username || '').trim().toLowerCase();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString();

  const existing = users.find(
    (u) =>
      u.username.toLowerCase() === cleanName ||
      (u.email && u.email.toLowerCase() === cleanName)
  );

  if (existing) {
    if (existing.status === 'Banned') {
      return {
        allowed: false,
        status: 'Banned',
        error: `Account suspended. Reason: ${existing.banReason || 'Access revoked by administrator.'}`,
        user: existing,
      };
    }
    existing.lastActive = now;
    saveUsers(users);
    return { allowed: true, status: existing.status, user: existing };
  }

  // Create new active beta researcher
  const newUser: BetaUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: username.trim(),
    status: 'Active',
    registeredAt: now,
    lastActive: now,
    role,
  };
  users.push(newUser);
  saveUsers(users);
  return { allowed: true, status: 'Active', user: newUser };
}

export function banUser(username: string, reason?: string, adminName: string = 'admin'): boolean {
  const users = getRegisteredUsers();
  const cleanName = (username || '').trim().toLowerCase();
  const target = users.find(
    (u) =>
      u.username.toLowerCase() === cleanName ||
      (u.email && u.email.toLowerCase() === cleanName)
  );

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString();

  if (target) {
    target.status = 'Banned';
    target.banReason = reason?.trim() || 'Access revoked by administrator.';
    target.bannedAt = now;
    target.bannedBy = adminName;
    saveUsers(users);
    return true;
  }

  // If user wasn't registered yet, record them directly as Banned
  const newUser: BetaUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: username.trim(),
    status: 'Banned',
    registeredAt: now,
    lastActive: now,
    role: 'Researcher',
    banReason: reason?.trim() || 'Access revoked by administrator.',
    bannedAt: now,
    bannedBy: adminName,
  };
  users.push(newUser);
  saveUsers(users);
  return true;
}

export function unbanUser(username: string): boolean {
  const users = getRegisteredUsers();
  const cleanName = (username || '').trim().toLowerCase();
  const target = users.find(
    (u) =>
      u.username.toLowerCase() === cleanName ||
      (u.email && u.email.toLowerCase() === cleanName)
  );

  if (target) {
    target.status = 'Active';
    delete target.banReason;
    delete target.bannedAt;
    delete target.bannedBy;
    saveUsers(users);
    return true;
  }
  return false;
}

export function setUserStatus(username: string, status: UserStatus, reason?: string): boolean {
  if (status === 'Banned') {
    return banUser(username, reason);
  }
  if (status === 'Active') {
    return unbanUser(username);
  }
  // Pending
  const users = getRegisteredUsers();
  const cleanName = (username || '').trim().toLowerCase();
  const target = users.find(
    (u) =>
      u.username.toLowerCase() === cleanName ||
      (u.email && u.email.toLowerCase() === cleanName)
  );
  if (target) {
    target.status = 'Pending';
    delete target.banReason;
    saveUsers(users);
    return true;
  }
  return false;
}

export function isUserBanned(username: string): boolean {
  if (!username) return false;
  const users = getRegisteredUsers();
  const cleanName = username.trim().toLowerCase();
  const target = users.find(
    (u) =>
      u.username.toLowerCase() === cleanName ||
      (u.email && u.email.toLowerCase() === cleanName)
  );
  return target?.status === 'Banned';
}

export function getUserDetails(username: string): BetaUser | undefined {
  if (!username) return undefined;
  const users = getRegisteredUsers();
  const cleanName = username.trim().toLowerCase();
  return users.find(
    (u) =>
      u.username.toLowerCase() === cleanName ||
      (u.email && u.email.toLowerCase() === cleanName)
  );
}

export function addBetaUser(user: {
  username: string;
  email?: string;
  role?: 'Researcher' | 'Administrator';
  status?: UserStatus;
  notes?: string;
}): BetaUser {
  const users = getRegisteredUsers();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString();
  const newUser: BetaUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: user.username.trim(),
    email: user.email?.trim(),
    role: user.role || 'Researcher',
    status: user.status || 'Active',
    registeredAt: now,
    lastActive: now,
    notes: user.notes?.trim(),
  };
  users.unshift(newUser);
  saveUsers(users);
  return newUser;
}

export function deleteBetaUser(userId: string): boolean {
  const users = getRegisteredUsers();
  const filtered = users.filter((u) => u.id !== userId && u.username !== userId);
  saveUsers(filtered);
  return true;
}
