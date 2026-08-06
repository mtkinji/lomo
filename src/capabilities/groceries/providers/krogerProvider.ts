import * as Crypto from 'expo-crypto';

function base64Url(hex: string): string {
  const bytes = hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
  const binary = String.fromCharCode(...bytes);
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createKrogerPkceChallenge(verifier: string): Promise<{ verifier: string; challenge: string; method: 'S256' }> {
  if (verifier.length < 43 || verifier.length > 128 || !/^[A-Za-z0-9._~-]+$/.test(verifier)) throw new Error('provider.pkce_invalid');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  return { verifier, challenge: base64Url(digest), method: 'S256' };
}

export function krogerCartRecovery(input: { acknowledged: boolean; networkOutcomeKnown: boolean }): 'complete' | 'retry' | 'check_retailer_cart' {
  if (input.acknowledged) return 'complete';
  return input.networkOutcomeKnown ? 'retry' : 'check_retailer_cart';
}
