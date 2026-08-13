import type { FamilyScreenTimeSnapshot } from '../household/screenTime/data/familyScreenTime';
import {
  collectCapabilityEvidence,
  resolveScreenTimeTargets,
  screenTimeChatAdapter,
  type ScreenTimeChatSnapshot,
} from './capabilityAdapters';

function policy(childMembershipId: string, label = 'Brawl Stars'): FamilyScreenTimeSnapshot {
  return {
    childMembershipId,
    subjectId: `subject-${childMembershipId}`,
    desiredPolicyVersion: 7,
    selections: [{ id: `selection-${childMembershipId}`, label, selectionRef: `opaque-${childMembershipId}`, status: 'active' }],
    agreements: [], activeOverrides: [], pendingRequests: [],
    devices: [{ id: `device-${childMembershipId}`, readiness: 'ready', authorizationStatus: 'authorized', lastSeenAt: null, releasedAt: null }],
    latestDeviceReceipt: null,
  };
}

const snapshot: ScreenTimeChatSnapshot = {
  self: { kind: 'self', deviceScope: 'current_device', authorizationStatus: 'approved' },
  children: [
    { membershipId: 'charlie', displayName: 'Charlie', canManage: true, policy: policy('charlie') },
    { membershipId: 'grant', displayName: 'Grant', canManage: true, policy: policy('grant') },
    { membershipId: 'private-child', displayName: 'Private', canManage: false, policy: policy('private-child') },
  ],
};

describe('family Screen Time Chat evidence', () => {
  it('exposes only authorized children and semantic saved-selection labels', () => {
    const evidence = screenTimeChatAdapter.evidence.list(snapshot);
    expect(evidence).toHaveLength(3);
    expect(evidence[0]).toMatchObject({
      capabilityId: 'screenTime',
      object: { type: 'personal_screen_time_device', id: 'self', label: 'My Screen Time' },
      authority: 'authoritative',
    });
    expect(evidence[1]).toMatchObject({
      capabilityId: 'screenTime',
      object: { type: 'family_screen_time_child', id: 'charlie', label: "Charlie's Screen Time" },
      authority: 'authoritative',
    });
    expect(evidence[1].summary).toContain('Brawl Stars');
    expect(JSON.stringify(evidence)).not.toContain('opaque-charlie');
    expect(JSON.stringify(evidence)).not.toContain('Private');
  });

  it('participates in bounded run evidence only when Screen Time is selected', () => {
    const evidence = collectCapabilityEvidence({
      participatingCapabilities: ['screenTime'],
      snapshots: {
        goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] }, screenTime: snapshot,
      },
    });
    expect(evidence.map((item) => item.object.id)).toEqual(['self', 'charlie', 'grant']);
  });

  it('resolves child and app labels to stable child-scoped targets', () => {
    expect(resolveScreenTimeTargets(snapshot, {
      childNames: ['Charlie', 'Grant'], selectionLabel: 'brawl stars',
    })).toEqual({
      status: 'resolved',
      targets: [
        { childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 },
        { childMembershipId: 'grant', selectionId: 'selection-grant', expectedVersion: 7 },
      ],
    });
  });

  it('requires a native picker when the caregiver has not saved that selection for a child', () => {
    expect(resolveScreenTimeTargets(snapshot, {
      childNames: ['Charlie'], selectionLabel: 'YouTube',
    })).toEqual({
      status: 'needs_native_selection',
      children: [{ childMembershipId: 'charlie', displayName: 'Charlie', suggestedLabel: 'YouTube' }],
    });
  });

  it('asks rather than guessing when a child name is duplicated', () => {
    const duplicate: ScreenTimeChatSnapshot = {
      children: [
        { membershipId: 'charlie-1', displayName: 'Charlie', canManage: true, policy: policy('charlie-1') },
        { membershipId: 'charlie-2', displayName: 'Charlie', canManage: true, policy: policy('charlie-2') },
      ],
    };
    expect(resolveScreenTimeTargets(duplicate, {
      childNames: ['Charlie'], selectionLabel: 'Brawl Stars',
    })).toMatchObject({ status: 'needs_input', reason: 'ambiguous_child' });
  });
});
