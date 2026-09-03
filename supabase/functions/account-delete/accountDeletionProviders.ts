export type ProviderDeletionKind =
  | 'plaid'
  | 'calendar_google'
  | 'calendar_microsoft'
  | 'kroger'
  | 'external_oauth'
  | 'phone_agent'
  | 'push_registration'
  | 'install_identity'
  | 'revenuecat'
  | 'apple_identity';

export type ProviderDeletionTarget = {
  kind: ProviderDeletionKind;
  id: string;
};

export type ProviderDeletionOutcome = 'removed' | 'already_absent' | 'local_credential_removed';

export type ProviderCleanupDependencies = {
  listTargets(userId: string): Promise<ProviderDeletionTarget[]>;
  revokeRemote(target: ProviderDeletionTarget): Promise<ProviderDeletionOutcome | void>;
  removeLocalCredential(target: ProviderDeletionTarget): Promise<void>;
  recordOutcome(target: ProviderDeletionTarget, outcome: ProviderDeletionOutcome): Promise<void>;
};

export async function removeAccountProviders(
  userId: string,
  dependencies: ProviderCleanupDependencies,
): Promise<number> {
  const targets = await dependencies.listTargets(userId);
  for (const target of targets) {
    const outcome = await dependencies.revokeRemote(target) ?? 'removed';
    await dependencies.removeLocalCredential(target);
    await dependencies.recordOutcome(target, outcome);
  }
  return targets.length;
}
