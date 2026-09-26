/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Authorized credentials for Dream Circuit Private Beta Enclave:
// Default: admin / admin
// Alternative: admin / dreamcircuit2026
// Direct testing usernames: sayanchandra, arindam, dreamcircuit

const VALID_USERNAMES = [
  'admin',
  'administrator',
  'sayanchandra',
  'sayanchandra.gaming@gmail.com',
  'arindam',
  'dreamcircuit',
  'operator',
];

const VALID_PASSWORDS = [
  'admin',
  'admin123',
  'dreamcircuit2026',
  'dreamcircuit',
  'dreamlm',
  'dreamlm2026',
  'sayanchandra',
  'sayanchandra2026',
  'password',
];

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedUser = (username || '').trim().toLowerCase();
  const trimmedPass = (password || '').trim();

  if (!trimmedUser || !trimmedPass) {
    return {
      success: false,
      error: 'Please enter both administrator username and password.',
    };
  }

  // Check if username and password match any of the authorized administrator credentials
  const isAuthorizedUser = VALID_USERNAMES.includes(trimmedUser);
  const isAuthorizedPassword = VALID_PASSWORDS.includes(trimmedPass.toLowerCase()) || trimmedPass === 'admin' || trimmedPass === 'dreamcircuit2026';

  if (isAuthorizedUser && isAuthorizedPassword) {
    try {
      sessionStorage.setItem('dreamlm_admin_token', 'enclave_session_active');
      sessionStorage.setItem('dreamlm_admin_user', trimmedUser);
    } catch {
      // Ignore sessionStorage errors
    }
    return { success: true };
  }

  // Also support universal admin fallback: username 'admin' with 'admin' or 'dreamcircuit2026'
  if (trimmedUser === 'admin' && (trimmedPass === 'admin' || trimmedPass === 'dreamcircuit2026')) {
    try {
      sessionStorage.setItem('dreamlm_admin_token', 'enclave_session_active');
      sessionStorage.setItem('dreamlm_admin_user', 'admin');
    } catch {
      // Ignore
    }
    return { success: true };
  }

  return {
    success: false,
    error: 'Invalid administrator credentials. Hint: use admin / admin or admin / dreamcircuit2026',
  };
}

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem('dreamlm_admin_token') === 'enclave_session_active';
  } catch {
    return false;
  }
}

export function getActiveAdminUsername(): string {
  try {
    return sessionStorage.getItem('dreamlm_admin_user') || 'admin';
  } catch {
    return 'admin';
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem('dreamlm_admin_token');
    sessionStorage.removeItem('dreamlm_admin_user');
  } catch {
    // Graceful cleanup
  }
}
