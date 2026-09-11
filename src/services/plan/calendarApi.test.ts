import { listCalendarsWithErrors } from './calendarApi';
import { getAccessToken } from '../backend/auth';

jest.mock('../backend/auth', () => ({ getAccessToken: jest.fn(async () => 'token') }));
jest.mock('../installId', () => ({ getInstallId: jest.fn(async () => 'install') }));
jest.mock('../../utils/getEnv', () => ({
  getSupabaseUrl: () => 'https://example.supabase.co',
  getSupabasePublishableKey: () => 'public-key',
}));
jest.mock('../edgeFunctions', () => ({
  getEdgeFunctionUrlCandidatesForHeaders: () => ['https://example.supabase.co/functions/v1/calendar-api'],
  getEdgeFunctionUrlFromSupabaseUrl: () => 'https://example.supabase.co/functions/v1/calendar-api',
}));

describe('calendar access checks', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(getAccessToken).mockResolvedValue('token');
    global.fetch = jest.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it.each(['auth', 'network'] as const)('settles a stalled %s check instead of refreshing forever', async (stage) => {
    if (stage === 'auth') jest.mocked(getAccessToken).mockImplementation(() => new Promise(() => {}));
    jest.mocked(global.fetch).mockImplementation(() => new Promise(() => {}));
    let outcome = 'pending';
    const check = listCalendarsWithErrors().then(
      () => { outcome = 'success'; },
      (error: Error) => { outcome = error.message; },
    );
    await jest.advanceTimersByTimeAsync(15_000);
    expect(outcome).toBe('calendar_access_timeout');
    await check;
  });

  it('returns calendar results and clears the deadline after success', async () => {
    jest.mocked(global.fetch).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ calendars: [], errors: ['google:refresh_failed'] }) } as Response);
    await expect(listCalendarsWithErrors()).resolves.toEqual({ calendars: [], errors: ['google:refresh_failed'] });
    expect(jest.getTimerCount()).toBe(0);
  });
});
