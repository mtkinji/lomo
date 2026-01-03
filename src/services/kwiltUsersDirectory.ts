import { buildAuthedHeaders, getProCodesBaseUrl } from './proCodesClient';

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
  pro: {
    isPro: boolean;
    source: string;
    expiresAt: string | null;
  };
};

export async function adminListInstalls(params?: { limit?: number }): Promise<DirectoryInstall[]> {
  const base = getProCodesBaseUrl();
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/list-installs`, {
    method: 'POST',
    headers: await buildAuthedHeaders({ promptReason: 'admin' }),
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
  const base = getProCodesBaseUrl();
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/list-users`, {
    method: 'POST',
    headers: await buildAuthedHeaders({ promptReason: 'admin' }),
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


