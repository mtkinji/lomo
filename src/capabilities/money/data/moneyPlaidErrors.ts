import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

export type MoneyPlaidErrorCode =
  | 'auth'
  | 'institution_unavailable'
  | 'configuration'
  | 'network'
  | 'unknown';

export type MoneyPlaidError = Error & {
  code: MoneyPlaidErrorCode;
  diagnosticCode?: string;
  requestId?: string;
};

export function isMoneyPlaidError(error: unknown): error is MoneyPlaidError {
  return error instanceof Error
    && error.name === 'MoneyPlaidError'
    && typeof (error as Partial<MoneyPlaidError>).code === 'string';
}

type MoneyPlaidOperation = 'link_token' | 'exchange' | 'sync';

type FunctionErrorBody = {
  error?: string;
  plaid?: {
    error_code?: string;
    error_message?: string;
    request_id?: string;
  };
};

const INSTITUTION_UNAVAILABLE_CODES = new Set([
  'INSTITUTION_DOWN',
  'INSTITUTION_NOT_RESPONDING',
  'INSTITUTION_NOT_AVAILABLE',
  'INSTITUTION_TECHNICAL_ERROR',
]);

const CONFIGURATION_CODES = new Set([
  'INVALID_API_KEYS',
  'INVALID_FIELD',
  'INVALID_PRODUCT',
  'INVALID_REDIRECT_URI',
  'INVALID_WEBHOOK_VERIFICATION_KEY_ID',
  'PRODUCT_NOT_ENABLED',
]);

const MESSAGE_BY_CODE: Record<MoneyPlaidErrorCode, string> = {
  auth: 'Your session expired. Sign in again, then reconnect the account.',
  institution_unavailable: 'Your bank is temporarily unavailable. Try again in a few minutes.',
  configuration: 'Kwilt could not start a secure bank connection. Try again, and contact support if it continues.',
  network: 'Kwilt could not reach the bank connection service. Check your connection and try again.',
  unknown: 'Kwilt could not complete the bank connection. Try again.',
};

function createMoneyPlaidError(
  code: MoneyPlaidErrorCode,
  operation: MoneyPlaidOperation,
  diagnostics: Pick<MoneyPlaidError, 'diagnosticCode' | 'requestId'> = {},
): MoneyPlaidError {
  const unknownMessage = operation === 'link_token'
    ? 'Kwilt could not start the bank connection. Try again.'
    : MESSAGE_BY_CODE.unknown;
  return Object.assign(new Error(code === 'unknown' ? unknownMessage : MESSAGE_BY_CODE[code]), {
    name: 'MoneyPlaidError',
    code,
    ...diagnostics,
  });
}

async function readFunctionErrorBody(context: unknown): Promise<FunctionErrorBody | null> {
  if (!(context instanceof Response)) return null;
  try {
    const payload = await context.clone().json();
    return payload && typeof payload === 'object' ? payload as FunctionErrorBody : null;
  } catch {
    return null;
  }
}

export async function normalizeMoneyPlaidError(
  error: unknown,
  operation: MoneyPlaidOperation,
): Promise<MoneyPlaidError> {
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return createMoneyPlaidError('network', operation);
  }

  if (error instanceof FunctionsHttpError) {
    const body = await readFunctionErrorBody(error.context);
    const diagnosticCode = body?.plaid?.error_code?.trim() || undefined;
    const requestId = body?.plaid?.request_id?.trim() || undefined;
    const diagnostics = { diagnosticCode, requestId };
    const status = error.context instanceof Response ? error.context.status : null;

    if (status === 401 || body?.error === 'Authentication required.') {
      return createMoneyPlaidError('auth', operation, diagnostics);
    }
    if (diagnosticCode && INSTITUTION_UNAVAILABLE_CODES.has(diagnosticCode)) {
      return createMoneyPlaidError('institution_unavailable', operation, diagnostics);
    }
    if (diagnosticCode && CONFIGURATION_CODES.has(diagnosticCode)) {
      return createMoneyPlaidError('configuration', operation, diagnostics);
    }
    return createMoneyPlaidError('unknown', operation, diagnostics);
  }

  return createMoneyPlaidError('unknown', operation);
}
