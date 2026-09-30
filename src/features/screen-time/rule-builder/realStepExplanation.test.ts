import { realStepExplanation } from './realStepExplanation';
import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../../services/screenTimeProtection';

describe('real-step explanation', () => {
  it('names the actual enabled actions and configured Focus duration', () => {
    expect(realStepExplanation({ ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS.meaningfulFirst,
      qualifyingActions: ['focus_session_completed'], minFocusMinutes: 25,
    })).toBe('What counts: completing a Focus session of at least 25 minutes.');
  });
  it('does not promise Focus credit when only to-do actions qualify', () => {
    expect(realStepExplanation({ ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS.meaningfulFirst,
      qualifyingActions: ['activity_completed', 'activity_progress_recorded'],
    })).toBe('What counts: completing a to-do or recording progress on a to-do.');
  });
});
