const mockGetUser = jest.fn();
const mockGetMaybeRefreshedAccessToken = jest.fn();
const mockFrom = jest.fn();

jest.mock('./backend/auth', () => ({
  getAccessToken: jest.fn(),
  getMaybeRefreshedAccessToken: () => mockGetMaybeRefreshedAccessToken(),
}));

jest.mock('./backend/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

import { fetchMyChapters, getWeeklyDigestSettings, updateWeeklyDigestSettings } from './chapters';

function makeTemplate(overrides: Record<string, unknown>) {
  return {
    id: 'template-1',
    user_id: 'user-1',
    name: 'Weekly Reflection',
    kind: 'reflection',
    cadence: 'weekly',
    timezone: 'America/Denver',
    filter_json: { groups: [], weeklyChapter: { deliveryWeekday: 1 } },
    enabled: true,
    email_enabled: false,
    email_recipient: null,
    detail_level: null,
    tone: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('Weekly Chapter settings', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetMaybeRefreshedAccessToken.mockReset();
    mockGetMaybeRefreshedAccessToken.mockResolvedValue('token-1');
    mockFrom.mockReset();
  });

  it('resolves to one canonical weekly reflection config and disables older duplicates', async () => {
    const newest = makeTemplate({ id: 'newest', updated_at: '2026-05-21T00:00:00.000Z' });
    const olderEnabled = makeTemplate({ id: 'older-enabled', updated_at: '2026-05-14T00:00:00.000Z' });
    const olderDisabled = makeTemplate({
      id: 'older-disabled',
      enabled: false,
      updated_at: '2026-05-07T00:00:00.000Z',
    });
    const updateIn = jest.fn(async () => ({ data: null, error: null }));
    const update = jest.fn(() => ({ in: updateIn }));

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'kwilt_chapter_templates') throw new Error(`Unexpected table ${table}`);

      const query: any = {
        select: jest.fn(() => query),
        eq: jest.fn(() => query),
        order: jest.fn(() => query),
        limit: jest.fn(() => query),
        update,
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: [newest, olderEnabled, olderDisabled], error: null }).then(resolve, reject),
      };
      return query;
    });

    const settings = await getWeeklyDigestSettings();

    expect(settings?.template.id).toBe('newest');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(updateIn).toHaveBeenCalledWith('id', ['older-enabled']);
  });

  it('stores the selected delivery weekday in the weekly config metadata', async () => {
    const current = makeTemplate({
      id: 'template-1',
      filter_json: { groups: [{ field: 'arc' }], weeklyChapter: { deliveryWeekday: 1 } },
    });
    const updated = makeTemplate({
      id: 'template-1',
      filter_json: { groups: [{ field: 'arc' }], weeklyChapter: { deliveryWeekday: 4 } },
    });
    const updatePayloads: Array<Record<string, unknown>> = [];

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockImplementation(() => {
      const query: any = {
        select: jest.fn(() => query),
        eq: jest.fn(() => query),
        order: jest.fn(() => query),
        limit: jest.fn(() => query),
        maybeSingle: jest.fn(async () => ({ data: updated, error: null })),
        update: jest.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return query;
        }),
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: [current], error: null }).then(resolve, reject),
      };
      return query;
    });

    const settings = await updateWeeklyDigestSettings({ deliveryWeekday: 4 });

    expect(settings?.deliveryWeekday).toBe(4);
    expect(updatePayloads[0]).toMatchObject({
      filter_json: {
        groups: [{ field: 'arc' }],
        weeklyChapter: { deliveryWeekday: 4 },
      },
    });
  });
});

describe('Chapter list fetching', () => {
  beforeEach(() => {
    mockGetMaybeRefreshedAccessToken.mockReset();
    mockGetMaybeRefreshedAccessToken.mockResolvedValue('token-1');
    mockFrom.mockReset();
  });

  it('refreshes auth before reading chapters so stale sessions do not render as empty', async () => {
    const row = {
      id: 'chapter-1',
      user_id: 'user-1',
      template_id: 'template-1',
      period_start: '2026-05-11T06:00:00.000Z',
      period_end: '2026-05-18T06:00:00.000Z',
      period_key: '2026-W20',
      input_summary: {},
      metrics: {},
      output_json: { title: 'A chapter' },
      status: 'ready',
      error: null,
      emailed_at: null,
      user_note: null,
      user_note_updated_at: null,
      created_at: '2026-05-21T00:00:00.000Z',
      updated_at: '2026-05-21T00:00:00.000Z',
    };
    const query: any = {
      select: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn(async () => ({ data: [row], error: null })),
    };
    mockFrom.mockReturnValue(query);

    const rows = await fetchMyChapters();

    expect(mockGetMaybeRefreshedAccessToken).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('kwilt_chapters');
    expect(rows).toEqual([row]);
  });
});
