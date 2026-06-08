export const FOUNDER_ALERT_EVENT_NAMES = [
  'activation_first_opened',
  'activation_account_linked',
  'subscription_initial_purchase',
  'subscription_trial_started',
  'subscription_cancelled',
  'subscription_expired',
  'subscription_billing_issue',
] as const;

export type FounderAlertEventName = (typeof FOUNDER_ALERT_EVENT_NAMES)[number];

export type FounderAlertSource = 'install_ping' | 'revenuecat';

export type FounderAlertProperties = Record<string, string | number | boolean | null | undefined>;

export type FounderAlertEvent = {
  eventKey: string;
  eventName: FounderAlertEventName;
  source: FounderAlertSource;
  subjectId: string;
  occurredAt: string;
  environment: string;
  properties: FounderAlertProperties;
};

type EnvMap = Record<string, string | undefined>;
type EnvGetter = (key: string) => string | undefined;

type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const DEFAULT_POSTHOG_HOST = 'us.i.posthog.com';

const EVENT_LABELS: Record<FounderAlertEventName, string> = {
  activation_first_opened: 'First app open',
  activation_account_linked: 'Account linked',
  subscription_initial_purchase: 'Subscription purchase',
  subscription_trial_started: 'Trial started',
  subscription_cancelled: 'Subscription cancelled',
  subscription_expired: 'Subscription expired',
  subscription_billing_issue: 'Billing issue',
};

const DIGEST_LABELS: Record<FounderAlertEventName, string> = {
  activation_first_opened: 'First opens',
  activation_account_linked: 'Account links',
  subscription_initial_purchase: 'Purchases',
  subscription_trial_started: 'Trials',
  subscription_cancelled: 'Cancellations',
  subscription_expired: 'Expirations',
  subscription_billing_issue: 'Billing issues',
};

const SAFE_PROPERTY_KEYS = new Set([
  'app_version',
  'build_number',
  'cadence',
  'cancel_reason',
  'currency',
  'environment',
  'event_type',
  'expiration_reason',
  'expires_at',
  'grace_period_expires_at',
  'install_id',
  'is_trial_conversion',
  'platform',
  'plan',
  'period_type',
  'price',
  'product_id',
  'revenuecat_app_user_id',
  'store',
  'user_email',
  'user_id',
]);

function getEnvValue(env: EnvMap | EnvGetter | undefined, key: string): string | undefined {
  if (!env) return undefined;
  if (typeof env === 'function') return env(key);
  return env[key];
}

function normalizeToggle(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function isFounderAlertsEnabled(env: EnvMap | EnvGetter | undefined): boolean {
  return normalizeToggle(getEnvValue(env, 'KWILT_FOUNDER_ALERTS_ENABLED'));
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toIsoFromMs(value: unknown): string | null {
  const ms = asNumber(value);
  if (ms === null || ms <= 0) return null;
  return new Date(ms).toISOString();
}

function sanitizeProperties(properties: FounderAlertProperties): Record<string, string | number | boolean | null> {
  const next: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (!SAFE_PROPERTY_KEYS.has(key)) continue;
    if (value === undefined) continue;
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      next[key] = value;
    }
  }
  return next;
}

function derivePlan(productId: string | null): string | null {
  if (!productId) return null;
  const p = productId.toLowerCase();
  if (p.includes('family')) return 'family';
  if (p.includes('pro')) return 'individual';
  return null;
}

function deriveCadence(productId: string | null): string | null {
  if (!productId) return null;
  const p = productId.toLowerCase();
  if (p.includes('annual') || p.includes('year')) return 'annual';
  if (p.includes('monthly') || p.includes('month')) return 'monthly';
  return null;
}

function isProductionRevenueCatEvent(environment: string | null, includeSandbox: boolean): boolean {
  if (includeSandbox) return true;
  const env = (environment ?? '').trim().toUpperCase();
  return env === '' || env === 'PRODUCTION';
}

export function deriveFounderAlertFromRevenueCatEvent(
  event: unknown,
  opts?: { includeSandbox?: boolean; nowIso?: () => string },
): FounderAlertEvent | null {
  if (!event || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  const type = asTrimmedString(e.type)?.toUpperCase() ?? '';
  const appUserId =
    asTrimmedString(e.app_user_id) ?? asTrimmedString(e.original_app_user_id) ?? asTrimmedString((e.subscriber as any)?.app_user_id);
  if (!type || !appUserId) return null;

  const environment = asTrimmedString(e.environment) ?? 'PRODUCTION';
  if (!isProductionRevenueCatEvent(environment, opts?.includeSandbox === true)) return null;

  const periodType = asTrimmedString(e.period_type)?.toUpperCase() ?? null;
  const isTrialConversion = e.is_trial_conversion === true;
  let eventName: FounderAlertEventName | null = null;

  if (type === 'INITIAL_PURCHASE') {
    eventName = periodType === 'TRIAL' ? 'subscription_trial_started' : 'subscription_initial_purchase';
  } else if (type === 'RENEWAL' && isTrialConversion) {
    eventName = 'subscription_initial_purchase';
  } else if (type === 'CANCELLATION') {
    eventName = 'subscription_cancelled';
  } else if (type === 'EXPIRATION') {
    eventName = 'subscription_expired';
  } else if (type === 'BILLING_ISSUE') {
    eventName = 'subscription_billing_issue';
  }

  if (!eventName) return null;

  const productId = asTrimmedString(e.product_id);
  const eventId = asTrimmedString(e.id);
  const timestampMs = asNumber(e.event_timestamp_ms);
  const occurredAt = toIsoFromMs(e.event_timestamp_ms) ?? opts?.nowIso?.() ?? new Date().toISOString();
  const eventKey = eventId
    ? `revenuecat:${eventId}`
    : `revenuecat:${type}:${appUserId}:${productId ?? 'unknown_product'}:${timestampMs ?? Date.parse(occurredAt)}`;

  const properties = sanitizeProperties({
    revenuecat_app_user_id: appUserId,
    product_id: productId,
    plan: derivePlan(productId),
    cadence: deriveCadence(productId),
    event_type: type,
    environment,
    period_type: periodType,
    is_trial_conversion: isTrialConversion || undefined,
    price: asNumber(e.price),
    currency: asTrimmedString(e.currency),
    store: asTrimmedString(e.store),
    cancel_reason: asTrimmedString(e.cancel_reason),
    expiration_reason: asTrimmedString(e.expiration_reason),
    expires_at: toIsoFromMs(e.expiration_at_ms),
    grace_period_expires_at: toIsoFromMs(e.grace_period_expiration_at_ms),
  } as FounderAlertProperties);

  return {
    eventKey,
    eventName,
    source: 'revenuecat',
    subjectId: appUserId,
    occurredAt,
    environment,
    properties,
  };
}

export function buildInstallFirstOpenAlert(params: {
  installId: string;
  occurredAt: string;
  platform?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
  revenuecatAppUserId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  environment?: string | null;
}): FounderAlertEvent {
  const environment = params.environment?.trim() || 'production';
  return {
    eventKey: `install:${params.installId}:first_open`,
    eventName: 'activation_first_opened',
    source: 'install_ping',
    subjectId: params.installId,
    occurredAt: params.occurredAt,
    environment,
    properties: sanitizeProperties({
      install_id: params.installId,
      platform: params.platform ?? null,
      app_version: params.appVersion ?? null,
      build_number: params.buildNumber ?? null,
      revenuecat_app_user_id: params.revenuecatAppUserId ?? null,
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
    }),
  };
}

export function buildAccountLinkedAlert(params: {
  installId: string;
  userId: string;
  userEmail?: string | null;
  occurredAt: string;
  platform?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
  revenuecatAppUserId?: string | null;
  environment?: string | null;
}): FounderAlertEvent {
  const environment = params.environment?.trim() || 'production';
  return {
    eventKey: `install:${params.installId}:account:${params.userId}`,
    eventName: 'activation_account_linked',
    source: 'install_ping',
    subjectId: params.userId,
    occurredAt: params.occurredAt,
    environment,
    properties: sanitizeProperties({
      install_id: params.installId,
      user_id: params.userId,
      user_email: params.userEmail ?? null,
      platform: params.platform ?? null,
      app_version: params.appVersion ?? null,
      build_number: params.buildNumber ?? null,
      revenuecat_app_user_id: params.revenuecatAppUserId ?? null,
    }),
  };
}

function formatPropertyValue(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  return String(value);
}

export function buildFounderAlertSlackMessage(event: FounderAlertEvent): { text: string } {
  const props = sanitizeProperties(event.properties);
  const label = EVENT_LABELS[event.eventName] ?? event.eventName;
  const lines = [
    `*${label}*`,
    `event: ${event.eventName}`,
    `subject: ${event.subjectId}`,
    `source: ${event.source}`,
    `environment: ${event.environment}`,
    `time: ${event.occurredAt}`,
  ];

  const detailKeys = [
    'product_id',
    'plan',
    'cadence',
    'price',
    'currency',
    'store',
    'platform',
    'app_version',
    'build_number',
    'install_id',
    'user_id',
    'user_email',
    'revenuecat_app_user_id',
    'cancel_reason',
    'expiration_reason',
    'grace_period_expires_at',
  ];
  const details = detailKeys
    .filter((key) => props[key] !== undefined && props[key] !== null && props[key] !== '')
    .map((key) => `${key}: ${formatPropertyValue(props[key])}`);
  if (details.length > 0) {
    lines.push('', details.join('\n'));
  }

  return { text: lines.join('\n') };
}

export type FounderPosthogCapturePayload = {
  api_key: string;
  distinct_id: string;
  event: FounderAlertEventName;
  timestamp: string;
  properties: Record<string, string | number | boolean | null>;
};

export function buildFounderPosthogPayload(params: {
  apiKey: string;
  distinctId: string;
  event: FounderAlertEvent;
}): FounderPosthogCapturePayload {
  const props = sanitizeProperties(params.event.properties);
  return {
    api_key: params.apiKey,
    distinct_id: params.distinctId,
    event: params.event.eventName,
    timestamp: params.event.occurredAt,
    properties: {
      app_env: params.event.environment,
      founder_alert_key: params.event.eventKey,
      founder_alert_source: params.event.source,
      ...props,
    },
  };
}

export function buildPosthogCaptureUrl(host: string | null | undefined): string {
  const h = (host ?? '').trim().replace(/\/+$/, '');
  const resolved = h === '' ? DEFAULT_POSTHOG_HOST : h;
  const withScheme = /^https?:\/\//i.test(resolved) ? resolved : `https://${resolved}`;
  return `${withScheme}/capture/`;
}

function rowFromEvent(event: FounderAlertEvent) {
  return {
    event_key: event.eventKey,
    event_name: event.eventName,
    source: event.source,
    subject_id: event.subjectId,
    occurred_at: event.occurredAt,
    environment: event.environment,
    properties: sanitizeProperties(event.properties),
    slack_sent_at: null,
    slack_error: null,
  };
}

function truncateError(raw: string): string {
  return raw.trim().slice(0, 240);
}

async function updateSlackStatus(admin: any, eventKey: string, payload: { slack_sent_at: string | null; slack_error: string | null }) {
  try {
    await admin.from('kwilt_founder_alert_events').update(payload).eq('event_key', eventKey);
  } catch {
    // Alert status is diagnostics only.
  }
}

export async function recordFounderAlertEvent(params: {
  admin: any;
  event: FounderAlertEvent;
  env?: EnvMap | EnvGetter;
  fetchFn?: FetchLike;
  nowIso?: () => string;
}): Promise<
  | { ok: true; inserted: false; skipped: 'disabled' | 'duplicate' }
  | { ok: true; inserted: true; slackSent: boolean; posthogSent: boolean }
  | { ok: false; inserted: false; error: string }
> {
  const { admin, event } = params;
  if (!admin) return { ok: false, inserted: false, error: 'missing_admin' };
  if (!isFounderAlertsEnabled(params.env)) return { ok: true, inserted: false, skipped: 'disabled' };

  const existing = await admin
    .from('kwilt_founder_alert_events')
    .select('event_key')
    .eq('event_key', event.eventKey)
    .maybeSingle();
  if (existing?.data) {
    return { ok: true, inserted: false, skipped: 'duplicate' };
  }

  const { error } = await admin.from('kwilt_founder_alert_events').insert(rowFromEvent(event));
  if (error) {
    const message = typeof error?.message === 'string' ? error.message : 'insert_failed';
    return { ok: false, inserted: false, error: message };
  }

  const fetchFn = params.fetchFn ?? fetch;
  const nowIso = params.nowIso ?? (() => new Date().toISOString());
  const slackUrl = (getEnvValue(params.env, 'KWILT_FOUNDER_ALERTS_SLACK_WEBHOOK_URL') ?? '').trim();
  let slackSent = false;

  if (!slackUrl) {
    await updateSlackStatus(admin, event.eventKey, {
      slack_sent_at: null,
      slack_error: 'missing_slack_webhook_url',
    });
  } else {
    try {
      const res = await fetchFn(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFounderAlertSlackMessage(event)),
      });
      if (res.ok) {
        slackSent = true;
        await updateSlackStatus(admin, event.eventKey, {
          slack_sent_at: nowIso(),
          slack_error: null,
        });
      } else {
        const body = await res.text().catch(() => '');
        await updateSlackStatus(admin, event.eventKey, {
          slack_sent_at: null,
          slack_error: `slack_${res.status}: ${truncateError(body)}`,
        });
      }
    } catch (e) {
      await updateSlackStatus(admin, event.eventKey, {
        slack_sent_at: null,
        slack_error: `slack_error: ${truncateError(String(e))}`,
      });
    }
  }

  let posthogSent = false;
  const posthogApiKey = (getEnvValue(params.env, 'KWILT_POSTHOG_PROJECT_API_KEY') ?? '').trim();
  if (posthogApiKey) {
    try {
      const res = await fetchFn(buildPosthogCaptureUrl(getEnvValue(params.env, 'KWILT_POSTHOG_HOST')), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          buildFounderPosthogPayload({
            apiKey: posthogApiKey,
            distinctId: event.subjectId,
            event,
          }),
        ),
      });
      posthogSent = Boolean(res.ok);
    } catch {
      posthogSent = false;
    }
  }

  return { ok: true, inserted: true, slackSent, posthogSent };
}

export type FounderAlertDigestRow = {
  event_name: string;
  subject_id: string;
  occurred_at: string;
  properties: Record<string, unknown> | null;
};

export function buildFounderDigestSlackMessage(params: {
  dateLabel: string;
  counts: Record<FounderAlertEventName, number>;
  watchList: FounderAlertDigestRow[];
}): { text: string } {
  const lines = [`*Kwilt launch pulse*`, `date: ${params.dateLabel}`, ''];
  for (const eventName of FOUNDER_ALERT_EVENT_NAMES) {
    lines.push(`${DIGEST_LABELS[eventName]}: ${params.counts[eventName] ?? 0} (${eventName})`);
  }

  if (params.watchList.length > 0) {
    lines.push('', '*Watch list*');
    for (const row of params.watchList.slice(0, 10)) {
      const props = sanitizeProperties((row.properties ?? {}) as FounderAlertProperties);
      const reason =
        (typeof props.cancel_reason === 'string' && props.cancel_reason) ||
        (typeof props.expiration_reason === 'string' && props.expiration_reason) ||
        (row.event_name === 'subscription_billing_issue' ? 'BILLING' : null);
      const product = typeof props.product_id === 'string' ? props.product_id : 'unknown_product';
      lines.push(`- ${row.event_name}: ${row.subject_id} · ${product}${reason ? ` · ${reason}` : ''}`);
    }
  }

  return { text: lines.join('\n') };
}
