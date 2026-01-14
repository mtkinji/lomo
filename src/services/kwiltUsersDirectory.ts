import { buildAuthedHeaders, getProCodesBaseUrlForHeaders } from './proCodesClient';

/**
 * Geolocation data with varying precision levels.
 * 
 * When users have location enabled, we can show city-level precision (~5mi radius).
 * Otherwise, we fall back to country/region from IP geolocation.
 */
export type RoughGeolocation = {
  /** City name (e.g., "San Francisco") - ~5mi radius precision */
  city?: string;
  /** State/province/region (e.g., "California", "Ontario") */
  region?: string;
  /** Country name (e.g., "United States") */
  country?: string;
  /** ISO country code (e.g., "US", "CA") */
  countryCode?: string;
  /** Postal/ZIP code area (optional, for higher precision) */
  postalCode?: string;
  /** Latitude for map display (city center or actual coords depending on source) */
  latitude?: number;
  /** Longitude for map display */
  longitude?: number;
  /** Approximate radius in meters representing location precision */
  accuracyM?: number;
  /** Source of the location data */
  source?: 'gps' | 'ip' | 'activity_place';
  /** When the location was last updated */
  updatedAtIso?: string;
};

/**
 * Time period options for metrics queries.
 */
export type MetricsTimePeriod = 'all_time' | 'this_year' | 'this_quarter' | 'this_month' | 'this_week';

/**
 * A user location point for the map hotspots view.
 */
export type UserLocationPoint = {
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Number of users at this location (for clustering) */
  count: number;
  /** City name if available */
  city?: string;
  /** Region/state if available */
  region?: string;
  /** Country if available */
  country?: string;
};

/**
 * Top-level platform metrics for admin dashboard.
 */
export type AdoptionMetrics = {
  /** Time period these metrics cover */
  timePeriod: MetricsTimePeriod;
  /** Start date for the time period (ISO string) */
  periodStartIso: string;
  /** End date for the time period (ISO string) */
  periodEndIso: string;
  
  // Key Metrics (hero section)
  /** Total AI credits spent in the period */
  aiSpend: number;
  /** New users acquired in the period (or total if all-time) */
  userAcquisition: number;
  /** Users active in the last 7 days of the period */
  weeklyActiveUsers: number;
  
  // User Metrics
  /** Total registered users at end of period */
  totalUsers: number;
  /** Users who have completed at least one meaningful action */
  activatedUsers: number;
  /** Pro subscribers at end of period */
  proUsers: number;
  
  // Engagement Metrics
  /** Total arcs created in period */
  arcsCreated: number;
  /** Total goals created in period */
  goalsCreated: number;
  /** Total activities created in period */
  activitiesCreated: number;
  /** Total check-ins completed in period */
  checkinsCompleted: number;
  /** Total focus sessions completed in period */
  focusSessionsCompleted: number;
  
  // AI Usage Metrics
  /** Total AI actions in period */
  aiActionsTotal: number;
  /** Average AI actions per active user */
  aiActionsPerActiveUser: number;
  
  // Location data for map view
  /** User location hotspots for map visualization */
  userLocations?: UserLocationPoint[];
  
  /** When the metrics were computed */
  computedAtIso: string;
};

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
  /** Privacy-appropriate rough geolocation (country/region level only). */
  roughLocation?: RoughGeolocation;
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
  /** Privacy-appropriate rough geolocation (country/region level only). */
  roughLocation?: RoughGeolocation;
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
  credits_per_active_day_7d: number | null;
  credits_per_calendar_day_7d: number | null;
  credits_this_month: number;
  days_since_first_credit_this_month: number | null;
  days_since_last_credit: number | null;
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

/**
 * Fetch aggregate adoption metrics across all users.
 * These are platform-wide metrics useful for understanding overall adoption.
 * 
 * @param timePeriod - The time period to query (default: 'all_time')
 */
export async function adminGetAdoptionMetrics(params?: {
  timePeriod?: MetricsTimePeriod;
}): Promise<AdoptionMetrics | null> {
  const headers = await buildAuthedHeaders({ promptReason: 'admin' });
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/adoption-metrics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      timePeriod: params?.timePeriod ?? 'all_time',
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 404) {
      // Endpoint not deployed yet - throw so user knows to deploy
      throw new Error('Metrics endpoint not deployed. Run: supabase functions deploy pro-codes');
    }
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to load adoption metrics';
    throw new Error(msg);
  }
  return (data?.metrics ?? null) as AdoptionMetrics | null;
}
