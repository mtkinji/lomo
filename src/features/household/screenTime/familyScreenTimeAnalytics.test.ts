import { AnalyticsEvent } from '../../../services/analytics/events';
import { trackFamilyScreenTime } from './familyScreenTimeAnalytics';

describe('trackFamilyScreenTime', () => {
  it('emits only bounded workflow metadata', () => {
    const capture = jest.fn();

    trackFamilyScreenTime(capture, 'setup_opened', {
      childMembershipId: 'child-1',
      entrySurface: 'household',
      step: 'connect_device',
      lifecycle: 'needs_setup',
      outcome: 'started',
      appToken: 'secret-token',
      content: 'private content',
      location: 'home',
      usageHistory: 'three hours',
    } as never);

    expect(capture).toHaveBeenCalledWith(AnalyticsEvent.FamilyScreenTimeSetupOpened, {
      child_membership_id: 'child-1',
      entry_surface: 'household',
      step: 'connect_device',
      lifecycle: 'needs_setup',
      outcome: 'started',
    });
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(/secret-token|private content|three hours|home/);
  });
});
