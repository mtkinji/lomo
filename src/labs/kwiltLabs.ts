export const KWILT_LABS_STORAGE_KEY = 'kwilt-labs-v1';

export const KWILT_LAB_CAPABILITIES = [
  {
    id: 'explore',
    title: 'Explore',
    description: 'Build a private map of the places and paths you discover.',
  },
  {
    id: 'chores',
    title: 'Chores',
    description: 'Try a shared household-work inventory with sample family data.',
  },
] as const;

export type KwiltLabCapabilityId = (typeof KWILT_LAB_CAPABILITIES)[number]['id'];

export type KwiltLabsPersistedState = {
  enabledCapabilities: KwiltLabCapabilityId[];
};

const knownCapabilityIds = new Set<KwiltLabCapabilityId>(
  KWILT_LAB_CAPABILITIES.map((capability) => capability.id),
);

export function normalizeEnabledKwiltLabs(value: unknown): KwiltLabCapabilityId[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(
    (candidate): candidate is KwiltLabCapabilityId =>
      typeof candidate === 'string' && knownCapabilityIds.has(candidate as KwiltLabCapabilityId),
  )));
}

export function parsePersistedKwiltLabs(raw: string | null): KwiltLabsPersistedState {
  if (!raw) return { enabledCapabilities: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { enabledCapabilities: [] };
    const envelope = parsed as { state?: unknown };
    const state = (envelope.state ?? envelope) as { enabledCapabilities?: unknown };
    return { enabledCapabilities: normalizeEnabledKwiltLabs(state.enabledCapabilities) };
  } catch {
    return { enabledCapabilities: [] };
  }
}

export function isKwiltLabEnabled(
  enabledCapabilities: readonly KwiltLabCapabilityId[],
  capabilityId: KwiltLabCapabilityId,
): boolean {
  return enabledCapabilities.includes(capabilityId);
}

export function setKwiltLabEnabled(
  enabledCapabilities: readonly KwiltLabCapabilityId[],
  capabilityId: KwiltLabCapabilityId,
  enabled: boolean,
): KwiltLabCapabilityId[] {
  const normalized = normalizeEnabledKwiltLabs(enabledCapabilities);
  if (enabled) return normalizeEnabledKwiltLabs([...normalized, capabilityId]);
  return normalized.filter((candidate) => candidate !== capabilityId);
}
