import { getSupabasePublishableKey } from '../utils/getEnv';
import { ensureSignedInWithPrompt } from './backend/auth';
import { getEdgeFunctionUrlCandidates } from './edgeFunctions';
import { getInstallId } from './installId';

export type PhoneAgentPermissionKey =
  | 'create_activities'
  | 'send_followups'
  | 'log_done_replies'
  | 'offer_drafts'
  | 'suggest_arc_alignment';

export type PhoneAgentLink = {
  phone: string;
  status: string;
  permissions: Record<string, boolean>;
  promptCapPerDay: number;
  optedOutAt: string | null;
};

export type PhoneAgentMemorySummary = {
  peopleCount: number;
  activeEventsCount: number;
  activeCadencesCount: number;
};

export type PhoneAgentRecentAction = {
  id: string;
  actionType: string;
  createdAt: string;
  activityId: string | null;
  promptId: string | null;
};

export type PhoneAgentStatus = {
  links: PhoneAgentLink[];
  memorySummary: PhoneAgentMemorySummary;
  recentActions: PhoneAgentRecentAction[];
};

export type PhoneAgentLinkRequest =
  | { action: 'request_code'; phone: string }
  | { action: 'verify_code'; phone: string; code: string }
  | { action: 'update_settings'; phone: string; permissions: Record<string, boolean>; promptCapPerDay: number }
  | { action: 'revoke'; phone: string }
  | { action: 'status' };

type JsonRecord = Record<string, unknown>;

export function buildPhoneAgentLinkRequest(request: PhoneAgentLinkRequest): PhoneAgentLinkRequest {
  return { ...request };
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
}

export function normalizePhoneAgentLink(raw: unknown): PhoneAgentLink {
  const row = asRecord(raw);
  return {
    phone: asString(row.phone),
    status: asString(row.status),
    permissions: asRecord(row.permissions) as Record<string, boolean>,
    promptCapPerDay: asInteger(row.promptCapPerDay, 3),
    optedOutAt: asNullableString(row.optedOutAt),
  };
}

export function normalizePhoneAgentStatus(raw: unknown): PhoneAgentStatus {
  const row = asRecord(raw);
  const memory = asRecord(row.memorySummary);
  const recentActions = Array.isArray(row.recentActions) ? row.recentActions : [];
  return {
    links: Array.isArray(row.links) ? row.links.map(normalizePhoneAgentLink) : [],
    memorySummary: {
      peopleCount: asInteger(memory.peopleCount, 0),
      activeEventsCount: asInteger(memory.activeEventsCount, 0),
      activeCadencesCount: asInteger(memory.activeCadencesCount, 0),
    },
    recentActions: recentActions.map((action) => {
      const a = asRecord(action);
      return {
        id: asString(a.id),
        actionType: asString(a.actionType),
        createdAt: asString(a.createdAt),
        activityId: asNullableString(a.activityId),
        promptId: asNullableString(a.promptId),
      };
    }),
  };
}

async function buildAuthedHeaders(): Promise<Headers> {
  const session = await ensureSignedInWithPrompt('settings');
  const token = session?.access_token;
  if (!token) throw new Error('Missing Phone Agent session token');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');
  headers.set('Authorization', `Bearer ${token}`);

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  const installId = await getInstallId();
  headers.set('x-kwilt-install-id', installId);
  return headers;
}

async function callPhoneAgentLink(request: PhoneAgentLinkRequest): Promise<unknown> {
  const urls = getEdgeFunctionUrlCandidates('phone-agent-link');
  if (urls.length === 0) throw new Error('Phone Agent service is not configured');

  const headers = await buildAuthedHeaders();
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildPhoneAgentLinkRequest(request)),
      });
      const text = await res.text().catch(() => '');
      const parsed = text ? JSON.parse(text) : null;
      if (!res.ok || parsed?.ok === false) {
        const code = typeof parsed?.error === 'string' ? parsed.error : `status_${res.status}`;
        throw new Error(`Phone Agent request failed: ${code}`);
      }
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error('Phone Agent request failed');
}

export async function requestPhoneAgentCode(phone: string): Promise<{ status: 'code_sent'; phone: string }> {
  const result = asRecord(await callPhoneAgentLink({ action: 'request_code', phone }));
  return { status: 'code_sent', phone: asString(result.phone) };
}

export async function verifyPhoneAgentCode(phone: string, code: string): Promise<{ status: 'verified'; phone: string }> {
  const result = asRecord(await callPhoneAgentLink({ action: 'verify_code', phone, code }));
  return { status: 'verified', phone: asString(result.phone) };
}

export async function updatePhoneAgentSettings(params: {
  phone: string;
  permissions: Record<string, boolean>;
  promptCapPerDay: number;
}): Promise<PhoneAgentStatus> {
  return normalizePhoneAgentStatus(await callPhoneAgentLink({
    action: 'update_settings',
    phone: params.phone,
    permissions: params.permissions,
    promptCapPerDay: params.promptCapPerDay,
  }));
}

export async function revokePhoneAgentLink(phone: string): Promise<{ status: 'revoked'; phone: string }> {
  const result = asRecord(await callPhoneAgentLink({ action: 'revoke', phone }));
  return { status: 'revoked', phone: asString(result.phone) };
}

export async function getPhoneAgentStatus(): Promise<PhoneAgentStatus> {
  return normalizePhoneAgentStatus(await callPhoneAgentLink({ action: 'status' }));
}
