export type UserStatus = 'Pending' | 'Active' | 'Banned';

export type BetaAccessStatus = UserStatus | 'loading' | 'unknown' | 'error' | 'signed-out';

export interface BetaAccessState {
  status: BetaAccessStatus;
  userId: string | null;
  revision: number;
}

export type BetaAccessAction =
  | { type: 'begin'; userId: string; revision: number }
  | { type: 'resolved'; userId: string; revision: number; status: unknown }
  | { type: 'failed'; userId: string; revision: number }
  | { type: 'signed-out'; revision: number };

export const initialBetaAccessState: BetaAccessState = {
  status: 'loading',
  userId: null,
  revision: 0,
};

export function isUserStatus(value: unknown): value is UserStatus {
  return value === 'Pending' || value === 'Active' || value === 'Banned';
}

export function withTimeout<T>(operation: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Beta access status lookup timed out.')), timeoutMs);
    Promise.resolve(operation).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function betaAccessReducer(
  state: BetaAccessState,
  action: BetaAccessAction,
): BetaAccessState {
  if (action.revision < state.revision) return state;

  if (action.type === 'signed-out') {
    return { status: 'signed-out', userId: null, revision: action.revision };
  }

  if (action.type === 'begin') {
    return action.userId.trim()
      ? { status: 'loading', userId: action.userId, revision: action.revision }
      : { status: 'unknown', userId: null, revision: action.revision };
  }

  if (state.userId !== action.userId || state.revision !== action.revision) return state;

  if (action.type === 'failed') {
    return { ...state, status: 'error' };
  }

  return {
    ...state,
    status: isUserStatus(action.status) ? action.status : 'unknown',
  };
}

export function hasActiveBetaAccess(state: BetaAccessState, userId: string | null): boolean {
  return Boolean(userId) && state.status === 'Active' && state.userId === userId;
}