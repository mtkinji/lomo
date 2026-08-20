import type { CapabilityOnboardingPathId } from './capabilityOnboardingContracts';
import type { CapabilityOnboardingPageId } from './capabilityOnboardingState';

export type CapabilityOnboardingSurface = 'development' | 'production';
export type CapabilityOnboardingSessionEntry = 'fresh' | 'resume';

type PageContext = {
  surface: CapabilityOnboardingSurface;
  pageId: CapabilityOnboardingPageId;
  pageIndex: number;
  pageCount: number;
  entry: CapabilityOnboardingSessionEntry;
};

export function buildCapabilityOnboardingPageViewedProperties(input: PageContext) {
  return {
    surface: input.surface,
    page_id: input.pageId,
    page_index: input.pageIndex,
    page_count: input.pageCount,
    entry: input.entry,
  } as const;
}

export function buildCapabilityOnboardingDoorStartedProperties(
  input: PageContext & {
    pathId: CapabilityOnboardingPathId;
    rank: number;
    input: 'button' | 'accessibility';
  },
) {
  return {
    ...buildCapabilityOnboardingPageViewedProperties(input),
    path_id: input.pathId,
    rank: input.rank,
    input: input.input,
  } as const;
}

export function buildCapabilityOnboardingExploredProperties(
  input: PageContext & { input: 'button' | 'swipe-past-last' },
) {
  return {
    ...buildCapabilityOnboardingPageViewedProperties(input),
    input: input.input,
  } as const;
}
