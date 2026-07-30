import {
  acknowledgeFamilyScreenTimePolicy,
  activateFamilyScreenTimeAgreement,
  createDefaultFamilyScreenTimeRecord,
  familyScreenTimeChildExplanation,
  familyScreenTimeDeliveryState,
  formatFamilyScreenTimeAgreement,
  normalizeFamilyScreenTimeRecord,
  prepareSimulatedFamilyScreenTimeDevice,
  updateFamilyScreenTimeAgreement,
} from './familyScreenTimeLearning';
import {
  familyScreenTimeLearningKey,
  familyScreenTimeLearningRecord,
  resetFamilyScreenTimeLearningStoreForTests,
  useFamilyScreenTimeLearningStore,
} from './useFamilyScreenTimeLearningStore';

describe('familyScreenTimeLearning', () => {
  beforeEach(() => {
    resetFamilyScreenTimeLearningStoreForTests();
  });

  it('starts with one restrained school-day Games agreement', () => {
    const record = createDefaultFamilyScreenTimeRecord();

    expect(record.rule).toEqual({
      targetLabel: 'Games',
      weekdays: [1, 2, 3, 4, 5],
      startMinute: 16 * 60,
      endMinute: 19 * 60,
      dailyLimitMinutes: 30,
    });
    expect(formatFamilyScreenTimeAgreement(record.rule)).toBe(
      'Games are available on school days from 4:00–7:00 PM, for up to 30 minutes.',
    );
    expect(familyScreenTimeDeliveryState(record)).toBe('device_required');
  });

  it('keeps desired and applied policy versions separate', () => {
    const ready = prepareSimulatedFamilyScreenTimeDevice(createDefaultFamilyScreenTimeRecord());
    const desired = activateFamilyScreenTimeAgreement(ready, '2026-07-29T22:00:00.000Z');

    expect(desired.desiredPolicyVersion).toBe(1);
    expect(desired.appliedPolicyVersion).toBeNull();
    expect(familyScreenTimeDeliveryState(desired)).toBe('applying');

    const applied = acknowledgeFamilyScreenTimePolicy(desired, {
      policyVersion: 1,
      acknowledgedAtIso: '2026-07-29T22:00:01.000Z',
    });
    expect(applied.appliedPolicyVersion).toBe(1);
    expect(familyScreenTimeDeliveryState(applied)).toBe('applied');
  });

  it('updates an agreement without claiming the changed rule reached the device', () => {
    const applied = acknowledgeFamilyScreenTimePolicy(
      activateFamilyScreenTimeAgreement(
        prepareSimulatedFamilyScreenTimeDevice(createDefaultFamilyScreenTimeRecord()),
        '2026-07-29T22:00:00.000Z',
      ),
      { policyVersion: 1, acknowledgedAtIso: '2026-07-29T22:00:01.000Z' },
    );

    const changed = updateFamilyScreenTimeAgreement(applied, {
      ...applied.rule,
      startMinute: 17 * 60,
      dailyLimitMinutes: 45,
    });
    expect(changed.rule).toEqual(expect.objectContaining({
      startMinute: 17 * 60,
      dailyLimitMinutes: 45,
    }));
    expect(changed.desiredPolicyVersion).toBe(1);
    expect(changed.appliedPolicyVersion).toBe(1);

    const desired = activateFamilyScreenTimeAgreement(changed, '2026-07-30T22:00:00.000Z');
    expect(desired.desiredPolicyVersion).toBe(2);
    expect(desired.appliedPolicyVersion).toBe(1);
    expect(familyScreenTimeDeliveryState(desired)).toBe('applying');
  });

  it('ignores stale or impossible acknowledgements', () => {
    const desired = activateFamilyScreenTimeAgreement(
      prepareSimulatedFamilyScreenTimeDevice(createDefaultFamilyScreenTimeRecord()),
      '2026-07-29T22:00:00.000Z',
    );

    expect(acknowledgeFamilyScreenTimePolicy(desired, {
      policyVersion: 0,
      acknowledgedAtIso: '2026-07-29T22:00:01.000Z',
    })).toEqual(desired);
    expect(acknowledgeFamilyScreenTimePolicy(desired, {
      policyVersion: 2,
      acknowledgedAtIso: '2026-07-29T22:00:01.000Z',
    })).toEqual(desired);
  });

  it('normalizes malformed persisted state without inventing device delivery', () => {
    expect(normalizeFamilyScreenTimeRecord({
      schemaVersion: 99,
      deviceMode: 'apple',
      desiredPolicyVersion: 8,
      appliedPolicyVersion: 8,
      rule: {
        targetLabel: '',
        weekdays: [0, 1, 9],
        startMinute: -20,
        endMinute: 5000,
        dailyLimitMinutes: 0,
      },
    })).toEqual(createDefaultFamilyScreenTimeRecord());
  });

  it('explains the current school-day window in child language', () => {
    const active = acknowledgeFamilyScreenTimePolicy(
      activateFamilyScreenTimeAgreement(
        prepareSimulatedFamilyScreenTimeDevice(createDefaultFamilyScreenTimeRecord()),
        '2026-07-29T22:00:00.000Z',
      ),
      { policyVersion: 1, acknowledgedAtIso: '2026-07-29T22:00:01.000Z' },
    );

    expect(familyScreenTimeChildExplanation(active, new Date(2026, 6, 29, 15, 30), 0)).toBe(
      'Games open at 4:00 PM.',
    );
    expect(familyScreenTimeChildExplanation(active, new Date(2026, 6, 29, 16, 30), 0)).toBe(
      'Games are available for 30 minutes.',
    );
    expect(familyScreenTimeChildExplanation(active, new Date(2026, 6, 29, 16, 45), 12)).toBe(
      '18 minutes left today.',
    );
    expect(familyScreenTimeChildExplanation(active, new Date(2026, 6, 29, 19, 5), 12)).toBe(
      'Games are finished for today.',
    );
    expect(familyScreenTimeChildExplanation(active, new Date(2026, 7, 1, 16, 30), 0)).toBe(
      'Games follow the school-day agreement Monday.',
    );
  });

  it('keeps local learning state scoped to the signed-in caregiver and child', () => {
    const rileyKey = familyScreenTimeLearningKey('caregiver-1', 'child-riley');
    const caseyKey = familyScreenTimeLearningKey('caregiver-1', 'child-casey');
    const otherCaregiverKey = familyScreenTimeLearningKey('caregiver-2', 'child-riley');

    useFamilyScreenTimeLearningStore.getState().prepareSimulatedDevice(rileyKey);

    const records = useFamilyScreenTimeLearningStore.getState().records;
    expect(familyScreenTimeLearningRecord(records, rileyKey).deviceMode).toBe('simulated');
    expect(familyScreenTimeLearningRecord(records, caseyKey).deviceMode).toBe('none');
    expect(familyScreenTimeLearningRecord(records, otherCaregiverKey).deviceMode).toBe('none');
  });
});
