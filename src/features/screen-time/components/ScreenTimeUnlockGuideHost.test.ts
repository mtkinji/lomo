import { readFileSync } from 'fs';
import path from 'path';

describe('ScreenTimeUnlockGuideHost workflow feedback attachment', () => {
  const source = readFileSync(path.join(__dirname, 'ScreenTimeUnlockGuideHost.tsx'), 'utf8');

  it('uses an opaque episode key and requests Clarity after the guide is shown', () => {
    expect(source).toContain('`screen-time-guide-${Crypto.randomUUID()}`');
    expect(source).toContain("promptId: 'screen_time_block_reason_clarity_v1'");
    expect(source).toContain("placement: 'inline'");
    expect(source.indexOf('AnalyticsEvent.ScreenTimeGuideShown')).toBeLessThan(
      source.indexOf("promptId: 'screen_time_block_reason_clarity_v1'"),
    );
  });

  it('does not attach temporary-opening behavior or feedback to the guide', () => {
    expect(source).not.toContain('openScreenTimeRulesTemporarily');
    expect(source).not.toContain('applyTemporaryFamilyScreenTimeAccess');
    expect(source).not.toContain("promptId: 'screen_time_block_clear_ease_v1'");
    expect(source).not.toContain('ScreenTimeTemporaryOpenRequested');
  });

  it('cancels pending requests when the guide leaves its context', () => {
    expect(source).toContain('cancelFeedbackRequests();');
    expect(source).toContain('feedbackSourceKey={feedbackSourceKey ?? undefined}');
  });

  it('opens only the projected prerequisite and authority-aware management route', () => {
    expect(source).toContain('actions.requirementAction?.destination');
    expect(source).toContain('routeForScreenTimeGuideManagement');
    expect(source).toContain('AnalyticsEvent.ScreenTimeGuideManageRulesOpened');
  });
});
