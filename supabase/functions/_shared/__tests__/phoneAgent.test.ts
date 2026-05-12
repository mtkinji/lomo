import { createHmac, webcrypto } from 'node:crypto';

declare const globalThis: {
  crypto?: typeof webcrypto;
};

beforeAll(() => {
  if (!globalThis.crypto) {
    (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
  }
});

function loadModule() {
  jest.resetModules();
  return require('../phoneAgent') as typeof import('../phoneAgent');
}

function signTwilio(url: string, params: Record<string, string>, token: string) {
  const data = url + Object.keys(params).sort().map((key) => `${key}${params[key]}`).join('');
  return createHmac('sha1', token).update(data).digest('base64');
}

describe('phoneAgent shared helpers', () => {
  test('normalizes E.164 phone numbers and rejects unsafe input', () => {
    const mod = loadModule();
    expect(mod.normalizeE164('+1 (415) 555-1212')).toBe('+14155551212');
    expect(mod.normalizeE164('4155551212')).toBe('+14155551212');
    expect(mod.normalizeE164('+442071838750')).toBe('+442071838750');
    expect(mod.normalizeE164('abc')).toBeNull();
    expect(mod.normalizeE164('+123')).toBeNull();
  });

  test('parses loop closure commands without treating normal capture as commands', () => {
    const mod = loadModule();
    expect(mod.parseSmsCommand('done')).toEqual({ kind: 'done' });
    expect(mod.parseSmsCommand('snooze 2d')).toEqual({ kind: 'snooze', durationDays: 2 });
    expect(mod.parseSmsCommand('pause')).toEqual({ kind: 'pause' });
    expect(mod.parseSmsCommand('not relevant')).toEqual({ kind: 'not_relevant' });
    expect(mod.parseSmsCommand('STOP')).toEqual({ kind: 'stop' });
    expect(mod.parseSmsCommand('START')).toEqual({ kind: 'start' });
    expect(mod.parseSmsCommand('help')).toEqual({ kind: 'help' });
    expect(mod.parseSmsCommand('Call Dad this weekend')).toEqual({ kind: 'capture' });
  });

  test('validates Twilio signatures with sorted form params', async () => {
    const mod = loadModule();
    const url = 'https://auth.kwilt.app/functions/v1/phone-agent-sms';
    const params = {
      Body: 'Call Dad this weekend',
      From: '+14155551212',
      MessageSid: 'SM123',
      To: '+18885550100',
    };
    const token = 'twilio-token';
    const signature = signTwilio(url, params, token);
    await expect(mod.verifyTwilioSignature({ url, params, signature, authToken: token })).resolves.toBe(true);
    await expect(mod.verifyTwilioSignature({ url, params, signature: 'bad', authToken: token })).resolves.toBe(false);
  });

  test('builds mobile-compatible phone-origin Activity data', () => {
    const mod = loadModule();
    const data = mod.buildPhoneActivityData({
      id: 'activity-phone-SM123',
      title: 'Call Dad this weekend',
      nowIso: '2026-05-10T19:30:00.000Z',
      source: {
        channel: 'sms',
        twilioMessageSid: 'SM123',
        fromPhone: '+14155551212',
      },
    });
    expect(data.id).toBe('activity-phone-SM123');
    expect(data.title).toBe('Call Dad this weekend');
    expect(data.goalId).toBeNull();
    expect(data.status).toBe('planned');
    expect(data.creationSource).toBe('phone_agent');
    expect(data.phoneAgent?.channel).toBe('sms');
    expect(data.phoneAgent?.twilioMessageSid).toBe('SM123');
  });

  test('builds birthday prompt offsets for the next occurrence', () => {
    const mod = loadModule();
    expect(mod.buildBirthdayPromptSchedule({
      dateText: 'Oct 12',
      nowIso: '2026-05-10T12:00:00.000Z',
    })).toEqual([
      { kind: 'birthday', dueDateText: '2026-10-02', offsetDays: 10 },
      { kind: 'birthday', dueDateText: '2026-10-11', offsetDays: 1 },
    ]);
  });

  test('extracts simple relationship memory from birthday and cadence messages', () => {
    const mod = loadModule();
    expect(mod.extractPhoneAgentFacts("Lily's birthday is Oct 12. She likes dragons.")).toEqual({
      people: [{ displayName: 'Lily', aliases: ['Lily'] }],
      memoryItems: [{ personName: 'Lily', kind: 'preference', text: 'likes dragons' }],
      events: [{ personName: 'Lily', kind: 'birthday', title: "Lily's birthday", dateText: 'Oct 12' }],
      cadences: [],
    });
    expect(mod.extractPhoneAgentFacts("Remind me if I haven't called Dad in 3 weeks.")).toEqual({
      people: [{ displayName: 'Dad', aliases: ['Dad'] }],
      memoryItems: [],
      events: [],
      cadences: [{ personName: 'Dad', kind: 'drift', intervalDays: 21 }],
    });
  });
});
