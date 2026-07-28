import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  APPLE_AUTH_SECRET_KEY,
  classifySecretExpiry,
  isSecretMonitorAuthorized,
  parseAppleRotationRecord,
} from '../secretExpiryMonitor.ts';

Deno.test('secret monitor requires the configured bearer secret', () => {
  const authorized = new Request('https://example.test', {
    headers: { authorization: 'Bearer cron-secret' },
  });
  const unauthorized = new Request('https://example.test', {
    headers: { authorization: 'Bearer wrong-secret' },
  });

  assertEquals(isSecretMonitorAuthorized(authorized, 'cron-secret'), true);
  assertEquals(isSecretMonitorAuthorized(unauthorized, 'cron-secret'), false);
  assertEquals(isSecretMonitorAuthorized(authorized, ''), false);
});

Deno.test('rotation record accepts only the bounded Apple auth expiry contract', () => {
  const nowMs = Date.parse('2026-07-28T15:13:42.000Z');
  const expiresAt = '2026-12-25T15:13:42.000Z';

  assertEquals(
    parseAppleRotationRecord(
      { action: 'record_rotation', secretKey: APPLE_AUTH_SECRET_KEY, expiresAt },
      nowMs,
    ),
    { secretKey: APPLE_AUTH_SECRET_KEY, expiresAt },
  );
  assertEquals(
    parseAppleRotationRecord(
      { action: 'record_rotation', secretKey: 'SOME_OTHER_SECRET', expiresAt },
      nowMs,
    ),
    null,
  );
  assertEquals(
    parseAppleRotationRecord(
      {
        action: 'record_rotation',
        secretKey: APPLE_AUTH_SECRET_KEY,
        expiresAt: '2027-07-28T15:13:42.000Z',
      },
      nowMs,
    ),
    null,
  );
});

Deno.test('secret expiry classification treats missing or invalid dates as unknown metadata', () => {
  const nowMs = Date.parse('2026-07-28T15:13:42.000Z');

  assertEquals(classifySecretExpiry(null, 30, nowMs), {
    severity: 'unknown',
    expiresAtIso: null,
    daysUntilExpiry: null,
  });
  assertEquals(classifySecretExpiry('not-a-date', 30, nowMs), {
    severity: 'unknown',
    expiresAtIso: null,
    daysUntilExpiry: null,
  });
});

Deno.test('secret expiry classification distinguishes healthy, warning, and expired dates', () => {
  const nowMs = Date.parse('2026-07-28T00:00:00.000Z');

  assertEquals(classifySecretExpiry('2026-09-01T00:00:00.000Z', 30, nowMs).severity, null);
  assertEquals(classifySecretExpiry('2026-08-20T00:00:00.000Z', 30, nowMs).severity, 'warning');
  assertEquals(classifySecretExpiry('2026-07-27T00:00:00.000Z', 30, nowMs).severity, 'expired');
});
