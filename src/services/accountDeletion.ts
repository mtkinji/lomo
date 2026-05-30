import { getSupabasePublishableKey } from '../utils/getEnv';
import { getAccessToken } from './backend/auth';
import { resetSupabaseAuthStorage } from './backend/supabaseClient';
import { getEdgeFunctionUrlCandidatesForHeaders } from './edgeFunctions';
import { getInstallId } from './installId';

export type DeleteAccountResult = {
  ok: true;
};

async function readJsonOrText(res: Response): Promise<{ json: any | null; text: string }> {
  const text = await res.text().catch(() => '');
  if (!text) return { json: null, text: '' };
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

function getDeleteAccountErrorMessage(status: number, json: any | null, text: string): string {
  const message = typeof json?.error?.message === 'string' ? json.error.message.trim() : '';
  if (message) return message;
  if (text.trim()) return `Unable to delete account (status ${status}): ${text.trim().slice(0, 280)}`;
  return `Unable to delete account (status ${status})`;
}

export async function buildAccountDeletionHeaders(): Promise<Headers> {
  const token = (await getAccessToken())?.trim();
  if (!token) {
    throw new Error('Please sign in again before deleting your account.');
  }

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (!supabaseKey) {
    throw new Error('Missing Supabase publishable key.');
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', supabaseKey);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('x-kwilt-client', 'kwilt-mobile');

  try {
    headers.set('x-kwilt-install-id', await getInstallId());
  } catch {
    // best-effort
  }

  return headers;
}

export async function deleteAccount(): Promise<DeleteAccountResult> {
  const headers = await buildAccountDeletionHeaders();
  const candidates = getEdgeFunctionUrlCandidatesForHeaders('account-delete', headers);
  if (candidates.length === 0) {
    throw new Error('Account deletion service is not configured.');
  }

  let lastError: Error | null = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ confirm: true }),
      });
      const { json, text } = await readJsonOrText(res);
      if (res.ok && json?.ok === true) {
        await resetSupabaseAuthStorage().catch(() => undefined);
        return { ok: true };
      }
      lastError = new Error(getDeleteAccountErrorMessage(res.status, json, text));
      if (res.status !== 404) break;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error('Unable to delete account.');
    }
  }

  throw lastError ?? new Error('Unable to delete account.');
}
