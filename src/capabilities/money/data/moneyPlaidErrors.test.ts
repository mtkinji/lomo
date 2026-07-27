import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { normalizeMoneyPlaidError } from './moneyPlaidErrors';

describe('normalizeMoneyPlaidError', () => {
  it('turns institution outages into safe recovery copy while retaining bounded diagnostics', async () => {
    const response = new Response(JSON.stringify({
      error: 'Plaid link token creation failed',
      plaid: {
        error_code: 'INSTITUTION_DOWN',
        error_message: 'Provider detail that must not reach the screen',
        request_id: 'request-123',
      },
    }), { status: 503, headers: { 'content-type': 'application/json' } });

    await expect(normalizeMoneyPlaidError(new FunctionsHttpError(response), 'link_token')).resolves.toMatchObject({
      name: 'MoneyPlaidError',
      code: 'institution_unavailable',
      diagnosticCode: 'INSTITUTION_DOWN',
      requestId: 'request-123',
      message: 'Your bank is temporarily unavailable. Try again in a few minutes.',
    });
  });

  it('turns authentication failures into a sign-in recovery path', async () => {
    const response = new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

    await expect(normalizeMoneyPlaidError(new FunctionsHttpError(response), 'sync')).resolves.toMatchObject({
      code: 'auth',
      message: 'Your session expired. Sign in again, then reconnect the account.',
    });
  });

  it('turns provider configuration errors into safe Kwilt recovery copy', async () => {
    const response = new Response(JSON.stringify({
      plaid: {
        error_code: 'INVALID_API_KEYS',
        error_message: 'secret mismatch',
        request_id: 'request-config',
      },
    }), { status: 400, headers: { 'content-type': 'application/json' } });

    const result = await normalizeMoneyPlaidError(new FunctionsHttpError(response), 'link_token');

    expect(result).toMatchObject({
      code: 'configuration',
      diagnosticCode: 'INVALID_API_KEYS',
      requestId: 'request-config',
      message: 'Kwilt could not start a secure bank connection. Try again, and contact support if it continues.',
    });
    expect(result.message).not.toContain('secret mismatch');
  });

  it.each([
    new FunctionsFetchError(new Error('offline')),
    new FunctionsRelayError({ relay: 'unavailable' }),
  ])('normalizes transport errors without exposing their payload', async (error) => {
    await expect(normalizeMoneyPlaidError(error, 'exchange')).resolves.toMatchObject({
      code: 'network',
      message: 'Kwilt could not reach the bank connection service. Check your connection and try again.',
    });
  });

  it('uses operation-appropriate fallback copy for an unknown error', async () => {
    await expect(normalizeMoneyPlaidError(new Error('raw provider failure'), 'link_token')).resolves.toMatchObject({
      code: 'unknown',
      message: 'Kwilt could not start the bank connection. Try again.',
    });
  });
});
