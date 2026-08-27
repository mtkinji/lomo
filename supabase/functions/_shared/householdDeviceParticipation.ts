export type HouseholdDeviceClaimRequest =
  | {
      action: 'preview';
      transport: 'link' | 'manual_code';
      secret: string;
      installId?: string;
    }
  | {
      action: 'claim';
      transport: 'link' | 'manual_code';
      secret: string;
      previewSessionId?: string;
      installId: string;
      label: string;
      platform: 'ios' | 'ipados';
    }
  | {
      action: 'status';
      deviceId: string;
      installId: string;
      credential: string;
    };

const HEX_TOKEN = /^[a-f0-9]{64}$/i;
const MANUAL_CODE = /^\d{6}$/;

export function parseHouseholdDeviceClaimRequest(value: unknown): HouseholdDeviceClaimRequest {
  if (!value || typeof value !== 'object') throw new Error('invalid_request');
  const row = value as Record<string, unknown>;
  const action = row.action;
  if (action === 'status') {
    const deviceId = typeof row.deviceId === 'string' ? row.deviceId.trim() : '';
    const installId = typeof row.installId === 'string' ? row.installId.trim() : '';
    const credential = typeof row.credential === 'string' ? row.credential.trim() : '';
    if (deviceId.length < 1 || deviceId.length > 200 || installId.length < 8 || installId.length > 200
      || !HEX_TOKEN.test(credential)) throw new Error('invalid_request');
    return { action, deviceId, installId, credential };
  }
  const transport = row.transport;
  const secret = typeof row.secret === 'string' ? row.secret.trim() : '';
  if ((action !== 'preview' && action !== 'claim')
    || (transport !== 'link' && transport !== 'manual_code')) throw new Error('invalid_request');
  const normalized = transport === 'manual_code' ? secret.replace(/\s/g, '') : secret;
  if (transport === 'link' ? !HEX_TOKEN.test(normalized) : !MANUAL_CODE.test(normalized)) {
    throw new Error('invalid_request');
  }
  const installId = typeof row.installId === 'string' ? row.installId.trim() : '';
  if (action === 'preview') {
    if (transport === 'manual_code' && (installId.length < 8 || installId.length > 200)) {
      throw new Error('invalid_request');
    }
    return { action, transport, secret: normalized, ...(installId ? { installId } : {}) };
  }
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  const platform = row.platform;
  const previewSessionId = typeof row.previewSessionId === 'string' ? row.previewSessionId.trim() : '';
  if (installId.length < 8 || installId.length > 200 || label.length < 1 || label.length > 80
    || (platform !== 'ios' && platform !== 'ipados')
    || (transport === 'manual_code' && (previewSessionId.length < 1 || previewSessionId.length > 200))) {
    throw new Error('invalid_request');
  }
  return {
    action, transport, secret: normalized, installId, label, platform,
    ...(previewSessionId ? { previewSessionId } : {}),
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomCredential(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function resolveManagedChildAccessRpcStatus(
  error: { message?: string } | null,
  data: unknown,
): 200 | 401 | 503 {
  if (!error && data) return 200;
  if (error?.message?.includes('managed_child_access_revoked')) return 401;
  return 503;
}
