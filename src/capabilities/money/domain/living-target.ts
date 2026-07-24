export type LivingTargetIntent = {
  livingPercent: number;
  provenance: 'onboarding' | 'settings' | 'legacy_migration';
  updatedAtIso: string;
};

export function normalizeLivingTargetIntent(value: unknown, nowIso: string): LivingTargetIntent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<LivingTargetIntent> & { givingPercent?: unknown; savingPercent?: unknown; templateId?: unknown };
  if (typeof candidate.livingPercent !== 'number' || !Number.isFinite(candidate.livingPercent)) return null;
  const livingPercent = Math.max(50, Math.min(100, Math.round(candidate.livingPercent / 5) * 5));
  const provenance = candidate.provenance === 'onboarding' || candidate.provenance === 'settings'
    ? candidate.provenance
    : 'legacy_migration';
  return {
    livingPercent,
    provenance,
    updatedAtIso: typeof candidate.updatedAtIso === 'string' ? candidate.updatedAtIso : nowIso,
  };
}
