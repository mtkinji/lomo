jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    expoConfig: {
      scheme: ['kwilt', 'kwiltgames'],
      extra: { environment: 'development' },
    },
  },
}));

import { getAuthRuntimeDiagnostics } from './getEnv';

describe('getAuthRuntimeDiagnostics', () => {
  it('keeps Kwilt as the auth redirect scheme when the app registers legacy Games links', () => {
    const diagnostics = getAuthRuntimeDiagnostics();

    expect(diagnostics.redirectScheme).toBe('kwilt');
    expect(diagnostics.warnings).not.toContain(
      'Unexpected redirect scheme "kwilt,kwiltgames". Expected "kwilt".',
    );
  });
});
