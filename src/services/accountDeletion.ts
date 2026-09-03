import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getAccessToken } from './backend/auth';
import { getSupabaseClient } from './backend/supabaseClient';
import { purgeDeletedAccountFromDevice } from './accountDeletionLocalCleanup';
import { getEdgeFunctionUrlCandidatesForHeaders } from './edgeFunctions';
import { getInstallId } from './installId';

export type DeleteAccountResult = {
  ok: true;
  manualAppleAccessRemovalRequired?: boolean;
};

export type AccountDeletionClientErrorCode =
  | 'account_still_exists'
  | 'deletion_indeterminate'
  | 'local_cleanup_incomplete'
  | 'server_rejected';

export class AccountDeletionClientError extends Error {
  constructor(
    message: string,
    readonly code: AccountDeletionClientErrorCode,
    readonly deletionConfirmed: boolean,
  ) {
    super(message);
    this.name = 'AccountDeletionClientError';
  }
}

type AccountDeletionResponse = {
  ok?: boolean;
  manualAppleAccessRemovalRequired?: boolean;
  error?: { message?: string; code?: string };
};

const OPERATION_KEY_PREFIX = 'kwilt:account-deletion:operation:v1:';

function operationStorageKey(userId: string): string {
  return `${OPERATION_KEY_PREFIX}${userId}`;
}

async function getOrCreateOperationId(userId: string): Promise<string> {
  const key = operationStorageKey(userId);
  const existing = (await AsyncStorage.getItem(key))?.trim();
  if (existing) return existing;
  const operationId = Crypto.randomUUID();
  await AsyncStorage.setItem(key, operationId);
  return operationId;
}

async function readJsonOrText(res: Response): Promise<{ json: AccountDeletionResponse | null; text: string }> {
  const text = await res.text().catch(() => '');
  if (!text) return { json: null, text: '' };
  try {
    const parsed: unknown = JSON.parse(text);
    return { json: parsed && typeof parsed === 'object' ? parsed as AccountDeletionResponse : null, text };
  } catch {
    return { json: null, text };
  }
}

function getDeleteAccountErrorMessage(status: number, json: AccountDeletionResponse | null, text: string): string {
  const message = typeof json?.error?.message === 'string' ? json.error.message.trim() : '';
  if (message) return message;
  if (text.trim()) return `Unable to delete account (status ${status}): ${text.trim().slice(0, 280)}`;
  return `Unable to delete account (status ${status})`;
}

async function purgeConfirmedDeletion(
  userId: string,
  manualAppleAccessRemovalRequired = false,
): Promise<DeleteAccountResult> {
  try {
    await purgeDeletedAccountFromDevice({ userId });
  } catch {
    throw new AccountDeletionClientError(
      'Your account was deleted, but Kwilt could not finish clearing this device. Restart the app before using another account.',
      'local_cleanup_incomplete',
      true,
    );
  }
  return manualAppleAccessRemovalRequired
    ? { ok: true, manualAppleAccessRemovalRequired: true }
    : { ok: true };
}

async function reconcileUncertainDeletion(token: string, userId: string): Promise<DeleteAccountResult> {
  try {
    const { data, error } = await getSupabaseClient().auth.getUser(token);
    if (data?.user?.id) {
      throw new AccountDeletionClientError(
        'Your account was not deleted. Reconnect and try again; Kwilt will safely resume.',
        'account_still_exists',
        false,
      );
    }
    const message = String(error?.message ?? '').toLowerCase();
    const code = String((error as { code?: unknown } | null)?.code ?? '').toLowerCase();
    if (code === 'user_not_found' || message.includes('user not found')) {
      return purgeConfirmedDeletion(userId);
    }
  } catch (error) {
    if (error instanceof AccountDeletionClientError) throw error;
  }
  throw new AccountDeletionClientError(
    "We couldn't confirm deletion. Reconnect and try again; Kwilt will safely resume.",
    'deletion_indeterminate',
    false,
  );
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

export async function deleteAccount(input: { userId: string }): Promise<DeleteAccountResult> {
  const userId = input.userId.trim();
  if (!userId) throw new Error('Please sign in again before deleting your account.');
  const headers = await buildAccountDeletionHeaders();
  const token = headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim() ?? '';
  const operationId = await getOrCreateOperationId(userId);
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
        body: JSON.stringify({ confirm: true, operationId }),
      });
      const { json, text } = await readJsonOrText(res);
      if (res.ok && json?.ok === true) {
        return purgeConfirmedDeletion(userId, json?.manualAppleAccessRemovalRequired === true);
      }
      lastError = new AccountDeletionClientError(
        getDeleteAccountErrorMessage(res.status, json, text),
        'server_rejected',
        false,
      );
      if (res.status !== 404) break;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error('Unable to delete account.');
    }
  }

  if (lastError && !(lastError instanceof AccountDeletionClientError)) {
    return reconcileUncertainDeletion(token, userId);
  }
  throw lastError ?? new AccountDeletionClientError('Unable to delete account.', 'server_rejected', false);
}
