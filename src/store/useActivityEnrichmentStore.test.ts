import { useActivityEnrichmentStore } from './useActivityEnrichmentStore';

describe('useActivityEnrichmentStore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useActivityEnrichmentStore.getState().reset();
  });

  afterEach(() => {
    useActivityEnrichmentStore.getState().reset();
    jest.useRealTimers();
  });

  it('auto-clears an enrichment state after the timeout', () => {
    useActivityEnrichmentStore.getState().markActivityEnrichment('activity-1', true, 1000);

    expect(useActivityEnrichmentStore.getState().enrichingById['activity-1']).toBe(true);

    jest.advanceTimersByTime(999);
    expect(useActivityEnrichmentStore.getState().enrichingById['activity-1']).toBe(true);

    jest.advanceTimersByTime(1);
    expect(useActivityEnrichmentStore.getState().enrichingById['activity-1']).toBeUndefined();
  });

  it('clears a pending timeout when enrichment finishes', () => {
    useActivityEnrichmentStore.getState().markActivityEnrichment('activity-1', true, 1000);
    useActivityEnrichmentStore.getState().markActivityEnrichment('activity-1', false);

    jest.advanceTimersByTime(1000);

    expect(useActivityEnrichmentStore.getState().enrichingById['activity-1']).toBeUndefined();
  });
});
