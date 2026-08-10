import { playCompletionFeedbackSound } from '../services/uiSounds';
import { useAppStore } from './useAppStore';
import {
  celebrateAllActivitiesDone,
  recordShowUpWithCelebration,
  useCelebrationStore,
} from './useCelebrationStore';

jest.mock('../services/uiSounds', () => ({
  playCompletionFeedbackSound: jest.fn(async () => undefined),
}));

jest.mock('../services/milestones', () => {
  const actual = jest.requireActual('../services/milestones');
  return {
    ...actual,
    recordShowUpStreakMilestone: jest.fn(async () => undefined),
  };
});

const playCompletionFeedbackSoundMock = playCompletionFeedbackSound as jest.Mock;

function setStreakState(input: { currentStreak: number; lastDate: string }) {
  useAppStore.setState({
    currentShowUpStreak: input.currentStreak,
    currentCoveredShowUpStreak: input.currentStreak,
    lastShowUpDate: input.lastDate,
    lastStreakDateKey: input.lastDate,
    streakUpdatedAtIso: `${input.lastDate}T18:00:00.000Z`,
    streakGrace: {
      freeDaysRemaining: 1,
      lastFreeResetWeek: null,
      shieldsAvailable: 0,
      lastShieldEarnedWeekKey: null,
      graceDaysUsed: 0,
    },
    streakBreakState: {
      brokenAtDateKey: null,
      brokenStreakLength: null,
      eligibleRepairUntilMs: null,
      repairedAtMs: null,
    },
  });
}

describe('completion celebration sound orchestration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-10T18:00:00.000Z'));
    jest.clearAllMocks();
    useCelebrationStore.setState({
      activeCelebration: null,
      queue: [],
      deferred: [],
      shownIds: new Set(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces an activity sound with one prominent cue on a special streak day', () => {
    setStreakState({ currentStreak: 2, lastDate: '2026-08-09' });

    recordShowUpWithCelebration({ baseSound: 'activity' });

    expect(playCompletionFeedbackSoundMock).toHaveBeenCalledTimes(1);
    expect(playCompletionFeedbackSoundMock).toHaveBeenCalledWith('tinyCrowdProminent');
  });

  it('uses the prominent cue once when all scheduled work finishes later the same day', () => {
    setStreakState({ currentStreak: 4, lastDate: '2026-08-10' });

    recordShowUpWithCelebration({
      baseSound: 'activity',
      allScheduledActivitiesDone: true,
    });

    expect(playCompletionFeedbackSoundMock).toHaveBeenCalledTimes(1);
    expect(playCompletionFeedbackSoundMock).toHaveBeenCalledWith('tinyCrowdProminent');
  });

  it('records the all-done celebration with the same stable daily id callers check', () => {
    celebrateAllActivitiesDone('2026-08-10');

    expect(useCelebrationStore.getState().activeCelebration?.id).toBe('all-done-2026-08-10');
    expect(useCelebrationStore.getState().hasBeenShown('all-done-2026-08-10')).toBe(true);
  });
});
