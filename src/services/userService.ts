import { supabase } from './supabaseClient.ts';
import { isUserStatus, type UserStatus, withTimeout } from './betaAccess.ts';

export type { UserStatus } from './betaAccess.ts';

export interface BetaUser {
  id: string;
  authUserId?: string;
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

export interface AdminAuditEvent {
  id: string;
  actorUserId: string;
  action: string;
  targetUserId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function getAuditEventSummary(event: AdminAuditEvent): string | undefined {
  const record = event.metadata.new ?? event.metadata.old;
  if (!record || typeof record !== 'object' || Array.isArray(record)) return undefined;
  const userRecord = record as Record<string, unknown>;
  const username = typeof userRecord.username === 'string' ? userRecord.username : undefined;
  const reason = typeof userRecord.ban_reason === 'string' ? userRecord.ban_reason : undefined;
  return [username, reason ? `Reason: ${reason}` : undefined].filter(Boolean).join(' · ') || undefined;
}

interface BetaUserRow {
  id: string;
  auth_user_id: string | null;
  username: string;
  email: string | null;
  status: UserStatus;
  directory_role: 'Researcher' | 'Administrator';
  notes: string | null;
  created_at: string;
  last_active_at: string;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
}

interface AdminAuditEventRow {
  id: string;
  actor_id: string | null;
  event_type: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

function getSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapBetaUser(row: BetaUserRow): BetaUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id || undefined,
    username: row.username,
    email: row.email || undefined,
    status: row.status,
    registeredAt: row.created_at,
    lastActive: row.last_active_at,
    role: row.directory_role,
    banReason: row.ban_reason || undefined,
    bannedAt: row.banned_at || undefined,
    bannedBy: row.banned_by || undefined,
    notes: row.notes || undefined,
  };
}

export async function getRegisteredUsers(): Promise<BetaUser[]> {
  const { data, error } = await getSupabase()
    .from('beta_users')
    .select('id, auth_user_id, username, email, status, directory_role, notes, created_at, last_active_at, ban_reason, banned_at, banned_by')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as BetaUserRow[]).map(mapBetaUser);
}

export async function getAdminAuditEvents(): Promise<AdminAuditEvent[]> {
  const { data, error } = await getSupabase()
    .from('admin_audit_events')
    .select('id, actor_id, event_type, target_user_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as AdminAuditEventRow[]).map((row) => ({
    id: row.id,
    actorUserId: row.actor_id || 'Unknown actor',
    action: row.event_type,
    targetUserId: row.target_user_id || undefined,
    metadata: row.details || {},
    createdAt: row.created_at,
  }));
}

export async function recordOrUpdateUser(expectedUserId: string): Promise<{ status: UserStatus; user: BetaUser }> {
  if (!expectedUserId.trim()) throw new Error('Authenticated user identity is missing.');

  const { data, error } = await withTimeout(
    getSupabase().rpc('ensure_current_beta_user'),
    10_000,
  );
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as BetaUserRow | null;
  if (!row || row.auth_user_id !== expectedUserId || !isUserStatus(row.status)) {
    throw new Error('Supabase did not return a valid beta status for the authenticated user.');
  }
  const user = mapBetaUser(row);
  return { status: user.status, user };
}

export async function banUser(userId: string, reason?: string): Promise<void> {
  const { error } = await getSupabase()
    .from('beta_users')
    .update({ status: 'Banned', ban_reason: reason?.trim() || 'Access revoked by an administrator.' })
    .eq('id', userId)
    .select('id')
    .single();
  if (error) throw error;
}

export async function unbanUser(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('beta_users')
    .update({ status: 'Active' })
    .eq('id', userId)
    .select('id')
    .single();
  if (error) throw error;
}

export async function setUserStatus(
  userId: string,
  status: UserStatus,
  reason?: string,
): Promise<void> {
  const update = status === 'Banned'
    ? { status, ban_reason: reason?.trim() || 'Access revoked by an administrator.' }
    : { status };
  const { error } = await getSupabase()
    .from('beta_users')
    .update(update)
    .eq('id', userId)
    .select('id')
    .single();
  if (error) throw error;
}

export async function addBetaUser(user: {
  username: string;
  email?: string;
  role?: 'Researcher' | 'Administrator';
  status?: UserStatus;
  notes?: string;
}): Promise<BetaUser> {
  const { data, error } = await getSupabase()
    .from('beta_users')
    .insert({
      username: user.username.trim(),
      email: user.email?.trim() || null,
      directory_role: user.role || 'Researcher',
      status: user.status || 'Pending',
      notes: user.notes?.trim() || null,
    })
    .select('id, auth_user_id, username, email, status, directory_role, notes, created_at, last_active_at, ban_reason, banned_at, banned_by')
    .single();
  if (error) throw error;
  return mapBetaUser(data as BetaUserRow);
}

export async function deleteBetaUser(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('beta_users')
    .delete()
    .eq('id', userId)
    .select('id')
    .single();
  if (error) throw error;
}
