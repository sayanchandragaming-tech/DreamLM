import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient.ts';

export function hasAdminRole(user: User | null): boolean {
  const appMetadata = user?.app_metadata;
  return appMetadata?.role === 'admin' ||
    (Array.isArray(appMetadata?.roles) && appMetadata.roles.includes('admin'));
}

export async function signInAsAdmin(
  email: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Authentication is not configured.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    console.error('Supabase administrator sign-in failed:', error);
    return { success: false, error: error.message };
  }

  if (!hasAdminRole(data.user)) {
    return { success: false, error: 'This account is not authorized for administrator access.' };
  }

  return { success: true };
}
