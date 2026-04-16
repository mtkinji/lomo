import {
  RESEND_EVENT_TYPES,
  buildPosthogCaptureUrl,
  buildPosthogPayload,
  normalizeResendEvent,
  signForTest,
  verifySvixSignature,
} from '../resendWebhook';

const TEST_SECRET = 'whsec_' + Buffer.from('super-secret-kwilt-resend-secret').toString('base64');

function makeSvixPayload(eventType: string, overrides: Record<string, unknown> = {}) {
  return {
    type: eventType,
    created_at: '2026-04-16T10:00:00.000Z',
    data: {
      email_id: 're_abc123',
      from: 'hello@mail.kwilt.app',
      to: 'test@example.com',
      subject: 'Your weekly chapter is ready',
      tags: [
        { name: 'campaign', value: 'chapter_digest' },
        { name: 'other', value: 'noise' },
      ],
      ...overrides,
    },
  };
}

describe('verifySvixSignature', () => {
  const svixId = 'msg_2XYZ';
  const svixTimestamp = '1776300000'; // Apr 2026 area — we pass nowMs in every test.
  const nowMs = Number(svixTimestamp) * 1000;
  const body = JSON.stringify(makeSvixPayload('email.opened'));

  test('accepts a valid signature within the 5-minute skew window', async () => {
    const sig = await signForTest(TEST_SECRET, svixId, svixTimestamp, body);
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body,
      svixId,
      svixTimestamp,
      svixSignature: sig,
      nowMs,
    });
    expect(ok).toBe(true);
  });

  test('accepts when multiple versions (secret rotation) are present and one matches', async () => {
    const validSig = await signForTest(TEST_SECRET, svixId, svixTimestamp, body);
    const header = `v1,invalid-signature-bytes ${validSig}`;
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body,
      svixId,
      svixTimestamp,
      svixSignature: header,
      nowMs,
    });
    expect(ok).toBe(true);
  });

  test('rejects a tampered body (forged payload)', async () => {
    const sig = await signForTest(TEST_SECRET, svixId, svixTimestamp, body);
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body: body.replace('chapter_digest', 'tampered'),
      svixId,
      svixTimestamp,
      svixSignature: sig,
      nowMs,
    });
    expect(ok).toBe(false);
  });

  test('rejects a signature computed with a different secret', async () => {
    const otherSecret = 'whsec_' + Buffer.from('different-secret').toString('base64');
    const sig = await signForTest(otherSecret, svixId, svixTimestamp, body);
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body,
      svixId,
      svixTimestamp,
      svixSignature: sig,
      nowMs,
    });
    expect(ok).toBe(false);
  });

  test('rejects a signature outside the 5-minute skew window (replay protection)', async () => {
    const sig = await signForTest(TEST_SECRET, svixId, svixTimestamp, body);
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body,
      svixId,
      svixTimestamp,
      svixSignature: sig,
      nowMs: nowMs + 10 * 60 * 1000,
    });
    expect(ok).toBe(false);
  });

  test('rejects when any Svix header is missing', async () => {
    const sig = await signForTest(TEST_SECRET, svixId, svixTimestamp, body);
    for (const missing of [
      { svixId: '' },
      { svixTimestamp: '' },
      { svixSignature: '' },
      { secret: '' },
      { body: '' },
    ]) {
      const ok = await verifySvixSignature({
        secret: TEST_SECRET,
        body,
        svixId,
        svixTimestamp,
        svixSignature: sig,
        nowMs,
        ...missing,
      });
      expect(ok).toBe(false);
    }
  });

  test('rejects non-v1 signature versions (forward-compat stance)', async () => {
    const sig = await signForTest(TEST_SECRET, svixId, svixTimestamp, body);
    const v2 = sig.replace('v1,', 'v2,');
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body,
      svixId,
      svixTimestamp,
      svixSignature: v2,
      nowMs,
    });
    expect(ok).toBe(false);
  });

  test('rejects an obviously malformed timestamp', async () => {
    const ok = await verifySvixSignature({
      secret: TEST_SECRET,
      body,
      svixId,
      svixTimestamp: 'not-a-number',
      svixSignature: 'v1,AAA',
      nowMs,
    });
    expect(ok).toBe(false);
  });
});

describe('normalizeResendEvent', () => {
  test('extracts all fields for an email.opened event', () => {
    const out = normalizeResendEvent(makeSvixPayload('email.opened'));
    expect(out).toEqual({
      type: 'email.opened',
      createdAtIso: '2026-04-16T10:00:00.000Z',
      resendEmailId: 're_abc123',
      campaign: 'chapter_digest',
      subject: 'Your weekly chapter is ready',
      toEmail: 'test@example.com',
      clickedLink: null,
      bounceType: null,
    });
  });

  test('extracts clicked_link on email.clicked', () => {
    const out = normalizeResendEvent(
      makeSvixPayload('email.clicked', { click: { link: 'https://go.kwilt.app/open/chapters/abc' } }),
    );
    expect(out?.clickedLink).toBe('https://go.kwilt.app/open/chapters/abc');
  });

  test('extracts bounce_type on email.bounced', () => {
    const out = normalizeResendEvent(makeSvixPayload('email.bounced', { bounce: { type: 'hard' } }));
    expect(out?.bounceType).toBe('hard');
  });

  test('tolerates string-form `to` (not an array)', () => {
    const out = normalizeResendEvent(makeSvixPayload('email.delivered', { to: 'only@example.com' }));
    expect(out?.toEmail).toBe('only@example.com');
  });

  test('tolerates missing campaign tag', () => {
    const out = normalizeResendEvent(makeSvixPayload('email.delivered', { tags: [] }));
    expect(out?.campaign).toBeNull();
  });

  test('tolerates tags missing entirely', () => {
    const out = normalizeResendEvent(makeSvixPayload('email.delivered', { tags: undefined }));
    expect(out?.campaign).toBeNull();
  });

  test('returns null for unknown event types', () => {
    expect(normalizeResendEvent(makeSvixPayload('email.mystery_event'))).toBeNull();
  });

  test('returns null when email_id is missing (cannot correlate)', () => {
    expect(normalizeResendEvent(makeSvixPayload('email.opened', { email_id: '' }))).toBeNull();
  });

  test('returns null for obviously non-object input', () => {
    expect(normalizeResendEvent(null)).toBeNull();
    expect(normalizeResendEvent('str')).toBeNull();
    expect(normalizeResendEvent(42)).toBeNull();
    expect(normalizeResendEvent([])).toBeNull();
  });

  test('round-trips every declared ResendEventType (no silent drops)', () => {
    for (const type of RESEND_EVENT_TYPES) {
      const out = normalizeResendEvent(makeSvixPayload(type));
      expect(out?.type).toBe(type);
    }
  });
});

describe('buildPosthogPayload', () => {
  test('produces a capture payload with all required PostHog fields', () => {
    const normalized = normalizeResendEvent(makeSvixPayload('email.clicked', { click: { link: 'https://x/y' } }))!;
    const payload = buildPosthogPayload({
      apiKey: 'phc_test',
      distinctId: 'user_abc',
      normalized,
    });
    expect(payload.api_key).toBe('phc_test');
    expect(payload.distinct_id).toBe('user_abc');
    expect(payload.event).toBe('email_event');
    expect(payload.timestamp).toBe('2026-04-16T10:00:00.000Z');
    expect(payload.properties).toEqual({
      event_type: 'email.clicked',
      campaign: 'chapter_digest',
      resend_email_id: 're_abc123',
      subject: 'Your weekly chapter is ready',
      clicked_link: 'https://x/y',
      bounce_type: null,
    });
  });
});

describe('buildPosthogCaptureUrl', () => {
  test.each([
    ['empty', '', 'https://us.i.posthog.com/capture/'],
    ['null', null, 'https://us.i.posthog.com/capture/'],
    ['bare host', 'eu.i.posthog.com', 'https://eu.i.posthog.com/capture/'],
    ['host with scheme', 'https://us.i.posthog.com', 'https://us.i.posthog.com/capture/'],
    ['host with trailing slash', 'us.i.posthog.com/', 'https://us.i.posthog.com/capture/'],
    ['http scheme (self-hosted dev)', 'http://localhost:8000', 'http://localhost:8000/capture/'],
  ])('%s → %s', (_label, input, expected) => {
    expect(buildPosthogCaptureUrl(input as string | null)).toBe(expected);
  });
});
