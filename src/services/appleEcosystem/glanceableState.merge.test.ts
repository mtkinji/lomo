import { getAppGroupString, setAppGroupString } from './appGroup';
import { mergeGlanceableState, setGlanceableFocusSession } from './glanceableState';
import { scheduleWidgetReload } from './widgetCenter';

jest.mock('./appGroup', () => ({
  getAppGroupString: jest.fn(),
  setAppGroupString: jest.fn(),
}));

jest.mock('./widgetCenter', () => ({
  scheduleWidgetReload: jest.fn(),
}));

const getAppGroupStringMock = getAppGroupString as jest.Mock;
const setAppGroupStringMock = setAppGroupString as jest.Mock;
const scheduleWidgetReloadMock = scheduleWidgetReload as jest.Mock;

describe('glanceable Focus publication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serializes a rapid start then stop so an older running write cannot win', async () => {
    let stored: string | null = null;
    let releaseFirstWrite!: () => void;
    const firstWriteBlocked = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    let writeCount = 0;

    getAppGroupStringMock.mockImplementation(async () => stored);
    setAppGroupStringMock.mockImplementation(async (_key: string, value: string) => {
      writeCount += 1;
      if (writeCount === 1) await firstWriteBlocked;
      stored = value;
      return true;
    });

    const started = setGlanceableFocusSession({
      id: 'focus-1',
      mode: 'running',
      startedAtMs: 1_000,
      endAtMs: 61_000,
      activityId: 'kwilt-standalone-focus',
      title: 'Focus',
    });
    const stopped = setGlanceableFocusSession(null);
    releaseFirstWrite();
    await Promise.all([started, stopped]);

    expect(JSON.parse(stored ?? '{}').focusSession).toBeNull();
    expect(scheduleWidgetReloadMock).toHaveBeenLastCalledWith(
      ['KwiltWidgets.focus', 'KwiltWidgets.launcher'],
      { immediate: true },
    );
  });
});

it('does not rewrite App Group storage or reload widgets for timestamp-only inventory snapshots', async () => {
  let stored: string | null = null;
  getAppGroupStringMock.mockImplementation(async () => stored);
  setAppGroupStringMock.mockImplementation(async (_key: string, value: string) => { stored = value; return true; });
  const payload = { viewId: 'all', viewName: 'All', totalCount: 1, rows: [{ activityId: 'a', title: 'Walk' }], updatedAtMs: 100 };
  await mergeGlanceableState({ activitiesWidgetByViewId: { all: payload } });
  setAppGroupStringMock.mockClear();
  scheduleWidgetReloadMock.mockClear();
  await mergeGlanceableState({ activitiesWidgetByViewId: { all: { ...payload, updatedAtMs: 200 } } });
  expect(setAppGroupStringMock).not.toHaveBeenCalled();
  expect(scheduleWidgetReloadMock).not.toHaveBeenCalled();
  await mergeGlanceableState({ activitiesWidgetByViewId: { all: { ...payload, rows: [{ activityId: 'a', title: 'Run' }] } } });
  expect(setAppGroupStringMock).toHaveBeenCalledTimes(1);
  await mergeGlanceableState({ activitiesWidgetByViewId: {} });
  expect(JSON.parse(stored!).activitiesWidgetByViewId).toEqual({});
});
