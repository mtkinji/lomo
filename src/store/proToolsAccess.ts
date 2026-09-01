/**
 * Compatibility shim for features that were previously sold as "Pro Tools".
 *
 * Views, focus, attachments, banners, calendar export, and streak recovery are
 * now part of the complete Free product. Keep this shim temporarily so older
 * call sites cannot accidentally reintroduce a subscription gate while they
 * are migrated to capability-specific policy.
 */
export function canUseProTools(_feature?: string): boolean {
  return true;
}

export function useCanUseProTools(_feature?: string): boolean {
  return true;
}
