const METERING_FLOOR_DB = -60;
export const UNIFIED_CHAT_VOICE_LEVEL_LIMIT = 24;

function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeUnifiedChatVoiceMetering(meteringDb: number): number {
  if (!Number.isFinite(meteringDb)) return 0;
  return clampLevel((meteringDb - METERING_FLOOR_DB) / Math.abs(METERING_FLOOR_DB));
}

export function appendUnifiedChatVoiceLevel(
  levels: readonly number[],
  nextLevel: number,
): number[] {
  return [...levels, clampLevel(nextLevel)].slice(-UNIFIED_CHAT_VOICE_LEVEL_LIMIT);
}
