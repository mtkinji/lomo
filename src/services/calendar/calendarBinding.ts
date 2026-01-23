import type { ActivityCalendarBinding, ActivityCalendarBindingHealth } from '../../domain/types';

/**
 * In v1, binding health is inferred from local knowledge (permissions/auth + field completeness).
 * We intentionally avoid expensive network checks here; higher-level flows can promote a
 * binding to 'broken' when provider/device operations fail.
 */
export function inferCalendarBindingHealth(params: {
  binding: ActivityCalendarBinding | null | undefined;
  deviceCalendarPermission?: 'granted' | 'denied' | 'unknown';
  providerConnection?: 'connected' | 'missing' | 'unknown';
}): ActivityCalendarBindingHealth | null {
  const { binding } = params;
  if (!binding) return null;

  if (binding.kind === 'device') {
    if (!binding.calendarId || !binding.eventId) return 'broken';
    if (params.deviceCalendarPermission === 'denied') return 'degraded';
    return 'healthy';
  }

  // provider
  if (!binding.provider || !binding.accountId || !binding.calendarId || !binding.eventId) return 'broken';
  if (params.providerConnection === 'missing') return 'degraded';
  return 'healthy';
}


