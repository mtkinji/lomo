import {
  buildHouseholdDeviceSetupUrl,
  formatHouseholdDeviceManualCode,
  parseHouseholdDeviceSetupToken,
  parseHouseholdDevices,
  parseHouseholdDeviceSetupSession,
} from './householdDeviceParticipation';

describe('Household device participation contract', () => {
  it('formats the six-digit manual fallback for quick transcription', () => {
    expect(formatHouseholdDeviceManualCode('482731')).toBe('482-731');
    expect(formatHouseholdDeviceManualCode('482 731')).toBe('482-731');
  });

  it('builds and parses an opaque personal-device setup link', () => {
    const url = buildHouseholdDeviceSetupUrl('  abc123  ');
    expect(url).toBe('https://go.kwilt.app/open/household-device/abc123');
    expect(parseHouseholdDeviceSetupToken(url)).toBe('abc123');
    expect(parseHouseholdDeviceSetupToken('kwilt://household-device/setup?token=abc123')).toBe('abc123');
    expect(parseHouseholdDeviceSetupToken('https://example.com/abc123')).toBeNull();
  });

  it('accepts closed setup-session and device snapshots', () => {
    expect(parseHouseholdDeviceSetupSession({
      id: 'session-1', token: 'secret', manualCode: 'ABC123', expiresAt: '2026-08-26T22:00:00Z',
      childMembershipId: 'child-1',
    })).toEqual({
      id: 'session-1', token: 'secret', manualCode: 'ABC123', expiresAt: '2026-08-26T22:00:00Z',
      childMembershipId: 'child-1',
    });
    expect(parseHouseholdDevices([{
      id: 'device-1', householdId: 'house-1', kind: 'personal_child', childMembershipId: 'child-1',
      assignedCaregiverMembershipId: null, installId: 'install-1', label: "Charlie's iPhone",
      platform: 'ios', status: 'ready', memberIds: [],
    }])).toHaveLength(1);
  });

  it('rejects invented device kinds and malformed setup receipts', () => {
    expect(() => parseHouseholdDevices([{ id: 'x', kind: 'family_login' }])).toThrow('Invalid Household devices');
    expect(() => parseHouseholdDeviceSetupSession({ token: 'secret' })).toThrow('Invalid device setup session');
  });
});
