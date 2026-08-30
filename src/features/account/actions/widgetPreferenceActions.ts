import { KWILT_WIDGET_KINDS } from '../../../services/appleEcosystem/widgetCenter';

export type WidgetPreferenceBoundary = {
  readLastSyncMs(): Promise<number | null>;
};

export function createWidgetPreferenceActions(boundary: WidgetPreferenceBoundary) {
  return {
    async read() {
      const lastSyncMs = await boundary.readLastSyncMs();
      return {
        lastSyncedAt: typeof lastSyncMs === 'number' && Number.isFinite(lastSyncMs)
          ? new Date(lastSyncMs).toISOString()
          : null,
        placementStatus: 'not_exposed_by_ios' as const,
        supportedKinds: [...KWILT_WIDGET_KINDS],
        owner: 'this_device' as const,
      };
    },
  };
}

export function buildWidgetSetupRequest(input: unknown): { openSetup: true } | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || record.openSetup !== true) return null;
  return { openSetup: true };
}
