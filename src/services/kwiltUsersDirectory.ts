import { buildAuthedHeaders, getProCodesBaseUrlForHeaders } from './proCodesClient';

export type DirectoryInstall = {
  installId: string;
  createdAt: string | null;
  lastSeenAt: string | null;
  userId: string | null;
  userEmail: string | null;
  revenuecatAppUserId: string | null;
  platform: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  posthogDistinctId: string | null;
  identities?: Array<{
    userId: string | null;
    userEmail: string | null;
    lastSeenAt: string | null;
  }>;
  creditsUsed?: number;
  pro: {
    isPro: boolean;
    source: string;
    expiresAt: string | null;
  };
};

export type DirectoryUser = {
  userId: string;
  email: string | null;
  name: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  installsCount: number;
  installIds?: string[];
  creditsUsed?: number;
  pro: {
    isPro: boolean;
    source: string;
    expiresAt: string | null;
  };
};

export type DirectoryUseSummary = {
  window_days: number;
  start_at: string;
  end_at: string;
  active_days: number;
  arcs_touched: number;
  goals_touched: number;
  activities_touched: number;
  activities_created: number;
  checkins_count: number;
  ai_actions_count: number;
  is_activated: boolean;
  activated_at: string | null;
  last_meaningful_action_at: string | null;
  last_meaningful_action_type: 'none' | 'ai' | 'checkin' | 'activity' | 'goal' | 'arc' | 'unknown' | string;
};

export async function adminListInstalls(params?: { limit?: number }): Promise<DirectoryInstall[]> {
  const headers = await buildAuthedHeaders({ promptReason: 'admin' });
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/list-installs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ limit: params?.limit ?? 150 }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to load installs';
    throw new Error(msg);
  }
  const installs = Array.isArray(data?.installs) ? (data.installs as DirectoryInstall[]) : [];
  return installs;
}

export async function adminListUsers(params?: { page?: number; perPage?: number }): Promise<{
  page: number;
  perPage: number;
  users: DirectoryUser[];
}> {
  const headers = await buildAuthedHeaders({ promptReason: 'admin' });
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/list-users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ page: params?.page ?? 1, perPage: params?.perPage ?? 100 }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to load users';
    throw new Error(msg);
  }
  return {
    page: typeof data?.page === 'number' ? data.page : 1,
    perPage: typeof data?.perPage === 'number' ? data.perPage : 100,
    users: Array.isArray(data?.users) ? (data.users as DirectoryUser[]) : [],
  };
}

export async function adminGetUseSummary(params: {
  userId: string;
  installIds: string[];
  windowDays?: number;
}): Promise<DirectoryUseSummary | null> {
  const headers = await buildAuthedHeaders({ promptReason: 'admin' });
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/use-summary`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: params.userId,
      installIds: params.installIds,
      windowDays: params.windowDays ?? 7,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 404) {
      // Usually means the Edge Function code hasn't been deployed to the environment
      // this build is pointing at.
      throw new Error('Use summary endpoint not deployed (update Supabase Edge Function `pro-codes`).');
    }
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to load use summary';
    throw new Error(msg);
  }
  return (data?.summary ?? null) as DirectoryUseSummary | null;
}


