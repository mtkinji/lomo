import { useHouseholdModeStore } from './useHouseholdModeStore';

describe('Household Mode state', () => {
  beforeEach(() => useHouseholdModeStore.getState().reset());

  it('keeps the assigned caregiver identity separate from the active child actor', () => {
    useHouseholdModeStore.getState().enter({
      deviceId: 'device-1', householdId: 'house-1', assignedCaregiverUserId: 'caregiver-user',
      assignedCaregiverName: 'Andrew', members: [{ id: 'child-1', displayName: 'Charlie', capabilityIds: ['chores'] }],
    });
    useHouseholdModeStore.getState().selectMember('child-1');
    expect(useHouseholdModeStore.getState().session?.assignedCaregiverUserId).toBe('caregiver-user');
    expect(useHouseholdModeStore.getState().session?.activeMemberId).toBe('child-1');
  });

  it('does not release caregiver content until the exact caregiver signs in again', () => {
    useHouseholdModeStore.getState().enter({
      deviceId: 'device-1', householdId: 'house-1', assignedCaregiverUserId: 'caregiver-user',
      assignedCaregiverName: 'Andrew', members: [],
    });
    useHouseholdModeStore.getState().requestCaregiverReauthentication();
    expect(useHouseholdModeStore.getState().canFinishCaregiverReauthentication('child-user')).toBe(false);
    expect(useHouseholdModeStore.getState().canFinishCaregiverReauthentication('caregiver-user')).toBe(true);
  });

  it('fails persisted member grants closed until current server authority is restored', () => {
    useHouseholdModeStore.getState().enter({
      deviceId: 'device-1', householdId: 'house-1', assignedCaregiverUserId: 'caregiver-user',
      assignedCaregiverName: 'Andrew', members: [{ id: 'child-1', displayName: 'Charlie', capabilityIds: ['chores'] }],
    });
    useHouseholdModeStore.getState().selectMember('child-1');
    useHouseholdModeStore.getState().markUnavailable();
    expect(useHouseholdModeStore.getState().session).toMatchObject({
      verification: 'unavailable', activeMemberId: null, members: [],
    });
  });
});
