import {
  buildCapabilityOnboardingDoorStartedProperties,
  buildCapabilityOnboardingExploredProperties,
  buildCapabilityOnboardingPageViewedProperties,
} from './capabilityOnboardingAnalytics';

const page = {
  surface: 'development' as const,
  pageId: 'budget-app-controls' as const,
  pageIndex: 1,
  pageCount: 5,
  entry: 'resume' as const,
};

describe('capability onboarding analytics', () => {
  it('keeps page impressions bounded to reel metadata', () => {
    expect(buildCapabilityOnboardingPageViewedProperties(page)).toEqual({
      surface: 'development',
      page_id: 'budget-app-controls',
      page_index: 1,
      page_count: 5,
      entry: 'resume',
    });
  });

  it('adds only finite door-start properties', () => {
    expect(buildCapabilityOnboardingDoorStartedProperties({
      ...page,
      pathId: 'budget-app-controls',
      rank: 1,
      input: 'button',
    })).toEqual({
      surface: 'development',
      page_id: 'budget-app-controls',
      page_index: 1,
      page_count: 5,
      entry: 'resume',
      path_id: 'budget-app-controls',
      rank: 1,
      input: 'button',
    });
  });

  it('records the finite Explore exit and page boundary', () => {
    expect(buildCapabilityOnboardingExploredProperties({
      ...page,
      input: 'swipe-past-last',
    })).toEqual({
      surface: 'development',
      page_id: 'budget-app-controls',
      page_index: 1,
      page_count: 5,
      entry: 'resume',
      input: 'swipe-past-last',
    });
  });
});
