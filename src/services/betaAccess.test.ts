import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  betaAccessReducer,
  hasActiveBetaAccess,
  initialBetaAccessState,
  withTimeout,
} from './betaAccess.ts';

function resolveStatus(status: unknown) {
  const loading = betaAccessReducer(initialBetaAccessState, {
    type: 'begin',
    userId: 'supabase-user-a',
    revision: 1,
  });
  return betaAccessReducer(loading, {
    type: 'resolved',
    userId: 'supabase-user-a',
    revision: 1,
    status,
  });
}

test('only an explicitly Active beta user is admitted', () => {
  assert.equal(hasActiveBetaAccess(resolveStatus('Active'), 'supabase-user-a'), true);
  assert.equal(hasActiveBetaAccess(resolveStatus('Pending'), 'supabase-user-a'), false);
  assert.equal(hasActiveBetaAccess(resolveStatus('Banned'), 'supabase-user-a'), false);
  assert.equal(hasActiveBetaAccess(resolveStatus(undefined), 'supabase-user-a'), false);
});

test('status lookup errors and missing identities deny access', () => {
  const loading = betaAccessReducer(initialBetaAccessState, {
    type: 'begin',
    userId: 'supabase-user-a',
    revision: 1,
  });
  const failed = betaAccessReducer(loading, {
    type: 'failed',
    userId: 'supabase-user-a',
    revision: 1,
  });
  const missingIdentity = betaAccessReducer(initialBetaAccessState, {
    type: 'begin',
    userId: ' ',
    revision: 1,
  });

  assert.equal(failed.status, 'error');
  assert.equal(hasActiveBetaAccess(failed, 'supabase-user-a'), false);
  assert.equal(missingIdentity.status, 'unknown');
  assert.equal(hasActiveBetaAccess(missingIdentity, ' '), false);
});

test('a timed-out status request cannot grant access', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 5), /timed out/);
  const failed = betaAccessReducer(
    betaAccessReducer(initialBetaAccessState, {
      type: 'begin', userId: 'supabase-user-a', revision: 1,
    }),
    { type: 'failed', userId: 'supabase-user-a', revision: 1 },
  );
  assert.equal(hasActiveBetaAccess(failed, 'supabase-user-a'), false);
});

test('logout clears admission and stale account lookups cannot restore access', () => {
  const userA = betaAccessReducer(initialBetaAccessState, {
    type: 'begin', userId: 'supabase-user-a', revision: 1,
  });
  const userB = betaAccessReducer(userA, {
    type: 'begin', userId: 'supabase-user-b', revision: 2,
  });
  const staleUserAResult = betaAccessReducer(userB, {
    type: 'resolved', userId: 'supabase-user-a', revision: 1, status: 'Active',
  });
  const signedOut = betaAccessReducer(staleUserAResult, {
    type: 'signed-out', revision: 3,
  });
  const staleSignedOut = betaAccessReducer(signedOut, {
    type: 'signed-out', revision: 2,
  });

  assert.equal(staleUserAResult.status, 'loading');
  assert.equal(staleUserAResult.userId, 'supabase-user-b');
  assert.equal(hasActiveBetaAccess(staleUserAResult, 'supabase-user-b'), false);
  assert.deepEqual(signedOut, { status: 'signed-out', userId: null, revision: 3 });
  assert.equal(staleSignedOut, signedOut);
});