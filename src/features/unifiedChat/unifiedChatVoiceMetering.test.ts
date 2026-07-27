import {
  appendUnifiedChatVoiceLevel,
  normalizeUnifiedChatVoiceMetering,
} from './unifiedChatVoiceMetering';

describe('Unified Chat voice metering', () => {
  test('normalizes recorder dBFS into a bounded visible level', () => {
    expect(normalizeUnifiedChatVoiceMetering(-160)).toBe(0);
    expect(normalizeUnifiedChatVoiceMetering(-60)).toBe(0);
    expect(normalizeUnifiedChatVoiceMetering(-30)).toBeCloseTo(0.5);
    expect(normalizeUnifiedChatVoiceMetering(0)).toBe(1);
    expect(normalizeUnifiedChatVoiceMetering(12)).toBe(1);
    expect(normalizeUnifiedChatVoiceMetering(Number.NaN)).toBe(0);
  });

  test('keeps only the latest 24 safe samples', () => {
    const levels = Array.from({ length: 24 }, (_, index) => index / 24);
    const next = appendUnifiedChatVoiceLevel(levels, 1.4);

    expect(next).toHaveLength(24);
    expect(next[0]).toBe(levels[1]);
    expect(next.at(-1)).toBe(1);
    expect(appendUnifiedChatVoiceLevel([], Number.NaN)).toEqual([0]);
  });
});
