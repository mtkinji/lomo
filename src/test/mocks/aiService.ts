/**
 * Lightweight controllable mock for `src/services/ai`.
 *
 * Tests can `jest.mock('../../services/ai', () => ({ ...jest.requireActual('...'), sendCoachChat: ... }))`
 * directly, but this helper centralizes the most common stubs.
 */

class KwiltAiQuotaExceededErrorMock extends Error {
  code: 'quota_exceeded' = 'quota_exceeded';
  retryAt?: string;
  constructor(params?: { message?: string; retryAt?: string }) {
    super(params?.message ?? 'AI quota exceeded');
    this.name = 'KwiltAiQuotaExceededError';
    this.retryAt = params?.retryAt;
  }
}

export const KwiltAiQuotaExceededError = KwiltAiQuotaExceededErrorMock;

export const sendCoachChat = jest.fn(async () => ({
  reply: 'mock-reply',
  history: [],
}));

export const getOpenAiQuotaExceededStatus = jest.fn(() => null);

export function resetAiServiceMocks(): void {
  sendCoachChat.mockReset();
  sendCoachChat.mockImplementation(async () => ({ reply: 'mock-reply', history: [] }));
  getOpenAiQuotaExceededStatus.mockReset();
  getOpenAiQuotaExceededStatus.mockImplementation(() => null);
}
