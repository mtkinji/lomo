export type AccountDeletionStage =
  | 'providers'
  | 'storage'
  | 'database'
  | 'sessions'
  | 'auth_user';

export type AccountDeletionDependencies = {
  beginOrResume(input: {
    userId: string;
    operationId: string;
  }): Promise<{ completed: AccountDeletionStage[] }>;
  removeProviders(userId: string): Promise<void>;
  removeStorage(userId: string): Promise<void>;
  prepareDatabase(userId: string, operationId: string): Promise<void>;
  revokeSessions(jwt: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  recordStage(operationId: string, stage: AccountDeletionStage): Promise<void>;
  recordFailure(operationId: string, code: AccountDeletionErrorCode): Promise<void>;
  complete(operationId: string): Promise<void>;
};

export type AccountDeletionErrorCode =
  | 'invalid_request'
  | 'deletion_in_progress'
  | 'provider_cleanup_failed'
  | 'storage_cleanup_failed'
  | 'database_cleanup_failed'
  | 'session_revoke_failed'
  | 'auth_delete_failed';

export class AccountDeletionError extends Error {
  constructor(
    readonly code: AccountDeletionErrorCode,
    readonly status: number,
    readonly retryable: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'AccountDeletionError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const stageErrors: Record<AccountDeletionStage, {
  code: AccountDeletionErrorCode;
  message: string;
}> = {
  providers: {
    code: 'provider_cleanup_failed',
    message: 'Kwilt could not disconnect all connected services. Your account was not deleted. Try again.',
  },
  storage: {
    code: 'storage_cleanup_failed',
    message: 'Kwilt could not remove all stored files. Your account was not deleted. Try again.',
  },
  database: {
    code: 'database_cleanup_failed',
    message: 'Kwilt could not remove all account data. Your account was not deleted. Try again.',
  },
  sessions: {
    code: 'session_revoke_failed',
    message: 'Kwilt could not sign out every session. Your account was not deleted. Try again.',
  },
  auth_user: {
    code: 'auth_delete_failed',
    message: 'Kwilt could not finish deleting your account. Try again.',
  },
};

export async function deleteKwiltAccount(
  input: { userId: string; operationId: string; jwt: string },
  dependencies: AccountDeletionDependencies,
): Promise<{ ok: true; operationId: string; status: 'complete' }> {
  if (!UUID_PATTERN.test(input.userId) || !UUID_PATTERN.test(input.operationId) || !input.jwt.trim()) {
    throw new AccountDeletionError('invalid_request', 400, false, 'Invalid account deletion request.');
  }

  const operation = await dependencies.beginOrResume({
    userId: input.userId,
    operationId: input.operationId,
  });
  const completed = new Set(operation.completed);
  const stages: Array<[AccountDeletionStage, () => Promise<void>]> = [
    ['providers', () => dependencies.removeProviders(input.userId)],
    ['storage', () => dependencies.removeStorage(input.userId)],
    ['database', () => dependencies.prepareDatabase(input.userId, input.operationId)],
    ['sessions', () => dependencies.revokeSessions(input.jwt)],
    ['auth_user', () => dependencies.deleteAuthUser(input.userId)],
  ];

  for (const [stage, run] of stages) {
    if (completed.has(stage)) continue;
    try {
      await run();
      await dependencies.recordStage(input.operationId, stage);
    } catch (error) {
      if (error instanceof AccountDeletionError) throw error;
      const mapped = stageErrors[stage];
      await dependencies.recordFailure(input.operationId, mapped.code).catch(() => undefined);
      throw new AccountDeletionError(mapped.code, 503, true, mapped.message);
    }
  }

  await dependencies.complete(input.operationId);
  return { ok: true, operationId: input.operationId, status: 'complete' };
}
