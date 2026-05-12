export type SmsCommand =
  | { kind: 'capture' }
  | { kind: 'done' }
  | { kind: 'snooze'; durationDays: number }
  | { kind: 'pause' }
  | { kind: 'not_relevant' }
  | { kind: 'stop' }
  | { kind: 'start' }
  | { kind: 'help' }
  | { kind: 'change_time' };

export type ExtractedPhoneAgentFacts = {
  people: Array<{ displayName: string; aliases: string[] }>;
  memoryItems: Array<{ personName: string; kind: 'preference' | 'note'; text: string }>;
  events: Array<{ personName: string; kind: 'birthday' | 'event'; title: string; dateText: string }>;
  cadences: Array<{ personName: string; kind: 'drift'; intervalDays: number }>;
};

export function normalizeE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  const normalized = hasPlus ? `+${digits}` : digits.length === 10 ? `+1${digits}` : `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function normalizeSmsBody(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
}

export function parseSmsCommand(raw: unknown): SmsCommand {
  const body = normalizeSmsBody(raw).toLowerCase();
  if (body === 'done') return { kind: 'done' };
  if (body === 'pause') return { kind: 'pause' };
  if (body === 'not relevant' || body === 'not_relevant') return { kind: 'not_relevant' };
  if (body === 'stop' || body === 'unsubscribe' || body === 'cancel') return { kind: 'stop' };
  if (body === 'start' || body === 'unstop') return { kind: 'start' };
  if (body === 'help' || body === 'info') return { kind: 'help' };
  if (body === 'change time' || body === 'change_time') return { kind: 'change_time' };

  const snooze = /^snooze\s+(\d{1,2})d$/.exec(body);
  if (snooze) {
    return { kind: 'snooze', durationDays: Math.max(1, Math.min(30, Number(snooze[1]))) };
  }

  return { kind: 'capture' };
}

export async function verifyTwilioSignature(params: {
  url: string;
  params: Record<string, string>;
  signature: string | null;
  authToken: string | null;
}): Promise<boolean> {
  if (!params.signature || !params.authToken) return false;

  const signed = params.url + Object.keys(params.params).sort().map((key) => `${key}${params.params[key]}`).join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(params.authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return expected === params.signature;
}

export function buildTwimlMessage(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export function buildPhoneActivityData(params: {
  id: string;
  title: string;
  nowIso: string;
  source: {
    channel: 'sms';
    twilioMessageSid: string;
    fromPhone: string;
  };
}) {
  const title = params.title.trim().replace(/\s+/g, ' ').slice(0, 120);

  return {
    id: params.id,
    goalId: null,
    title,
    type: 'task',
    tags: [],
    notes: undefined,
    steps: [],
    reminderAt: null,
    priority: undefined,
    estimateMinutes: null,
    difficulty: undefined,
    creationSource: 'phone_agent',
    planGroupId: null,
    scheduledDate: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    orderIndex: Date.now(),
    phase: null,
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: {},
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
    phoneAgent: params.source,
  };
}

export function buildBirthdayPromptSchedule(params: {
  dateText: string;
  nowIso: string;
}): Array<{ kind: 'birthday'; dueDateText: string; offsetDays: 10 | 1 }> {
  const match = /^([A-Z][a-z]{2,8})\s+(\d{1,2})$/i.exec(params.dateText.trim());
  if (!match) return [];

  const months: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };
  const now = new Date(params.nowIso);
  const month = months[match[1].toLowerCase()];
  const day = Number(match[2]);
  if (month == null || !Number.isInteger(day) || day < 1 || day > 31) return [];

  let eventDate = new Date(Date.UTC(now.getUTCFullYear(), month, day, 9, 0, 0, 0));
  if (eventDate.getTime() <= now.getTime()) {
    eventDate = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day, 9, 0, 0, 0));
  }

  return ([10, 1] as const).map((offsetDays) => {
    const due = new Date(eventDate);
    due.setUTCDate(eventDate.getUTCDate() - offsetDays);
    return {
      kind: 'birthday',
      dueDateText: due.toISOString().slice(0, 10),
      offsetDays,
    };
  });
}

export function extractPhoneAgentFacts(raw: unknown): ExtractedPhoneAgentFacts {
  const body = normalizeSmsBody(raw);
  const empty: ExtractedPhoneAgentFacts = { people: [], memoryItems: [], events: [], cadences: [] };

  const birthday = /^([A-Z][A-Za-z' -]{1,40})'s birthday is ([A-Z][a-z]{2,8}\s+\d{1,2})\.?\s*(.*)$/i.exec(body);
  if (birthday) {
    const displayName = birthday[1].trim();
    const remainder = birthday[3].trim().replace(/\.$/, '');
    const memoryText = remainder.replace(/^(he|she|they)\s+/i, '').trim();
    return {
      people: [{ displayName, aliases: [displayName] }],
      memoryItems: memoryText ? [{ personName: displayName, kind: 'preference', text: memoryText }] : [],
      events: [{ personName: displayName, kind: 'birthday', title: `${displayName}'s birthday`, dateText: birthday[2].trim() }],
      cadences: [],
    };
  }

  const drift = /haven't\s+called\s+([A-Z][A-Za-z' -]{1,40})\s+in\s+(\d{1,2})\s+weeks?/i.exec(body);
  if (drift) {
    const displayName = drift[1].trim();
    return {
      ...empty,
      people: [{ displayName, aliases: [displayName] }],
      cadences: [{ personName: displayName, kind: 'drift', intervalDays: Number(drift[2]) * 7 }],
    };
  }

  return empty;
}
