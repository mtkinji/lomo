import { resolveFamilyScreenTimeSetupStep } from './familyScreenTimeSetupFlow';

const completeFacts = {
  capabilityActive: true,
  deviceReady: true,
  selectionReady: true,
  agreementReviewed: true,
  childPreviewReviewed: true,
  desiredVersion: 1,
  appliedVersion: 1,
};

describe('resolveFamilyScreenTimeSetupStep', () => {
  it.each([
    [{ ...completeFacts, capabilityActive: false }, 'connect_device'],
    [{ ...completeFacts, deviceReady: false }, 'connect_device'],
    [{ ...completeFacts, selectionReady: false }, 'choose_apps'],
    [{ ...completeFacts, agreementReviewed: false }, 'review_agreement'],
    [{ ...completeFacts, childPreviewReviewed: false }, 'preview_child'],
    [{ ...completeFacts, desiredVersion: 0, appliedVersion: null }, 'activate'],
    [{ ...completeFacts, desiredVersion: 2, appliedVersion: 1 }, 'activate'],
    [completeFacts, 'complete'],
  ] as const)('resolves the earliest incomplete prerequisite to %s', (facts, expected) => {
    expect(resolveFamilyScreenTimeSetupStep(facts)).toBe(expected);
  });

  it('does not skip native prerequisites when later review facts are already true', () => {
    expect(resolveFamilyScreenTimeSetupStep({
      ...completeFacts,
      deviceReady: false,
      selectionReady: false,
    })).toBe('connect_device');
  });
});
