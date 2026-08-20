import { resolveFirstTimeUxEntryPresentation } from './firstTimeUxEntryMode';

describe('resolveFirstTimeUxEntryPresentation', () => {
  it('preserves the legacy interstitial sequence for current production first launch', () => {
    expect(resolveFirstTimeUxEntryPresentation('legacy-first-run')).toEqual({
      initialStep: 'welcome',
      showWorkflowImmediately: false,
    });
  });

  it('starts the accepted questionnaire directly after chooser selection', () => {
    expect(resolveFirstTimeUxEntryPresentation('capability-path')).toEqual({
      initialStep: 'welcome',
      showWorkflowImmediately: true,
    });
  });
});
