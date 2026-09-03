export type ProviderTokenRecord = {
  userId: string;
  tokenKind: 'refresh_token';
  tokenPayload: unknown;
};

export async function registerProviderToken(
  input: { userId: string; token: string; tokenKind: 'refresh_token' },
  dependencies: {
    encrypt(token: string): Promise<unknown>;
    store(record: ProviderTokenRecord): Promise<void>;
  },
): Promise<{ ok: true }> {
  if (!input.userId.trim() || !input.token.trim() || input.tokenKind !== 'refresh_token') {
    throw new Error('invalid_provider_token');
  }
  const tokenPayload = await dependencies.encrypt(input.token);
  await dependencies.store({ userId: input.userId, tokenKind: input.tokenKind, tokenPayload });
  return { ok: true };
}
