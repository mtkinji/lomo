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

  it('requests clearing Ease only from the opened receipt', () => {
    expect(source).toContain("if (next.status === 'opened' && feedbackSourceKey)");
    expect(source).toContain("promptId: 'screen_time_block_clear_ease_v1'");
    expect(source).not.toContain("next.status === 'applying' && feedbackSourceKey");
  });

  it('cancels pending requests when the guide leaves its context', () => {
    expect(source).toContain('cancelFeedbackRequests();');
    expect(source).toContain('feedbackSourceKey={feedbackSourceKey ?? undefined}');
  });
});
