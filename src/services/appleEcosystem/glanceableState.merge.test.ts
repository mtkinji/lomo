import { getAppGroupString, setAppGroupString } from './appGroup';
import { setGlanceableFocusSession } from './glanceableState';
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
