/**
 * Mock for the `useAnalytics` hook so tests can assert capture calls.
 */
const captureMock = jest.fn();
const identifyUserMock = jest.fn();

export function useAnalytics() {
  return {
    posthog: undefined,
    capture: captureMock,
    identifyUser: identifyUserMock,
  };
}

export function getAnalyticsMocks() {
  return { capture: captureMock, identifyUser: identifyUserMock };
}

export function resetAnalyticsMocks(): void {
  captureMock.mockReset();
  identifyUserMock.mockReset();
}
