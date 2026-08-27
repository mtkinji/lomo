import type { AgentToolDefinition } from '@kwilt/agent-runtime';
import type { CompleteHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import { createHouseholdToolProvider } from './householdToolProvider';

const updatedAt = '2026-08-27T18:00:00.000Z';
const snapshot = {
  household: { id: 'household-1', name: 'Watanabe Household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult' as const, role: 'owner' as const, updatedAt },
    { id: 'child-1', personId: 'person-2', displayName: 'Charlie', kind: 'dependent' as const, role: 'child' as const, updatedAt },
  ],
  activations: [], grants: [],
};
const device = {
  id: 'device-1', householdId: 'household-1', kind: 'personal_child' as const,
  childMembershipId: 'child-1', assignedCaregiverMembershipId: null,
  installId: 'install-123', label: "Charlie's iPhone", platform: 'ios' as const,
  status: 'ready' as const, memberIds: [], updatedAt,
};

function boundary(): CompleteHouseholdActionBoundary & Record<string, jest.Mock> {
  return {
    read: jest.fn(async () => snapshot),
    addDependent: jest.fn(), createInvitation: jest.fn(), previewInvitation: jest.fn(async () => ({
      householdName: 'Watanabe Household', inviterDisplayName: 'Andrew', role: 'caregiver',
      expiresAt: '2026-09-03T18:00:00.000Z',
    })), acceptInvitation: jest.fn(), setChildCapability: jest.fn(), setCaregiverGrant: jest.fn(),
    updateMember: jest.fn(),
    previewMemberRemoval: jest.fn(async () => ({
      membershipId: 'child-1', expectedUpdatedAt: updatedAt, displayName: 'Charlie',
      capabilityGrants: 2, deviceAssignments: [{ id: 'device-1', label: "Charlie's iPhone" }],
      sharedObjects: [{ kind: 'child_capability', count: 1 }], recovery: 'Charlie can be invited back.',
    })),
    removeMember: jest.fn(), listDevices: jest.fn(async () => [device]),
    updateDevice: jest.fn(), revokeDevice: jest.fn(), reconcileDevice: jest.fn(),
  } as unknown as CompleteHouseholdActionBoundary & Record<string, jest.Mock>;
}

function tool(id: string, effect: 'read' | 'write' = 'write'): AgentToolDefinition {
  return { id, capabilityId: 'household', effect } as AgentToolDefinition;
}

describe('Household chat tool provider', () => {
  it('stages first-Household creation actions when the authenticated person has no Household yet', async () => {
    const store = boundary();
    (store.read as jest.Mock).mockResolvedValue({
      household: null, currentMembershipId: null, members: [], activations: [], grants: [],
    });
    const provider = createHouseholdToolProvider({ boundary: store });

    await expect(provider.execute({
      id: 'add', toolId: 'household.member.add_dependent', arguments: {
        householdId: null, displayName: 'Charlie', ownerDisplayName: 'Andrew',
      },
    }, tool('household.member.add_dependent'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({
      id: 'invite', toolId: 'household.invitation.create', arguments: {
        householdId: null, role: 'caregiver', invitedEmail: null, ownerDisplayName: 'Andrew',
      },
    }, tool('household.invitation.create'))).resolves.toMatchObject({ status: 'proposed' });

    expect(provider.proposals()).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: expect.objectContaining({
        type: 'household.member.add_dependent', payload: expect.objectContaining({ householdId: null }),
      }) }),
      expect.objectContaining({ operation: expect.objectContaining({
        type: 'household.invitation.create', payload: expect.objectContaining({ householdId: null }),
      }) }),
    ]));
  });

  it('directly reads Household and device inventory without exposing credentials', async () => {
    const store = boundary();
    const provider = createHouseholdToolProvider({ boundary: store });
    await expect(provider.execute(
      { id: 'list', toolId: 'household.device.list', arguments: { householdId: 'household-1' } },
      tool('household.device.list', 'read'),
    )).resolves.toMatchObject({ status: 'completed', output: { devices: [{ id: 'device-1', label: "Charlie's iPhone" }] } });
    const output = await provider.execute(
      { id: 'list', toolId: 'household.device.list', arguments: { householdId: 'household-1' } },
      tool('household.device.list', 'read'),
    );
    expect(JSON.stringify(output)).not.toContain('install-123');
  });

  it('stages an exact member update and does not mutate before approval', async () => {
    const store = boundary();
    const provider = createHouseholdToolProvider({ boundary: store });
    await expect(provider.execute({
      id: 'update', toolId: 'household.member.update', arguments: {
        householdId: 'household-1', membershipId: 'child-1', expectedUpdatedAt: updatedAt,
        fields: { displayName: 'Charles' },
      },
    }, tool('household.member.update'))).resolves.toMatchObject({ status: 'proposed' });
    expect(store.updateMember).not.toHaveBeenCalled();
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'household', operation: expect.objectContaining({
        type: 'household.member.update', targetId: 'child-1',
        payload: { householdId: 'household-1', expectedUpdatedAt: updatedAt, fields: { displayName: 'Charles' } },
      }),
    })]);
  });

  it('previews member removal impact into the reviewed proposal', async () => {
    const store = boundary();
    const provider = createHouseholdToolProvider({ boundary: store });
    await provider.execute({
      id: 'remove', toolId: 'household.member.remove', arguments: {
        householdId: 'household-1', membershipId: 'child-1', expectedUpdatedAt: updatedAt,
      },
    }, tool('household.member.remove'));
    expect(provider.proposals()[0]).toMatchObject({
      title: 'Remove Charlie from the Household',
      operation: { payload: { preview: { capabilityGrants: 2, deviceAssignments: [{ id: 'device-1' }] } } },
    });
    expect(store.removeMember).not.toHaveBeenCalled();
  });

  it('refuses wrong-household, child actor, and stale targets before staging', async () => {
    const store = boundary();
    const provider = createHouseholdToolProvider({ boundary: store });
    await expect(provider.execute({
      id: 'wrong', toolId: 'household.device.revoke', arguments: {
        householdId: 'other', deviceId: 'device-1', expectedUpdatedAt: updatedAt,
      },
    }, tool('household.device.revoke'))).resolves.toMatchObject({ status: 'failed', code: 'household_not_authorized' });
    await expect(provider.execute({
      id: 'stale', toolId: 'household.device.update', arguments: {
        householdId: 'household-1', deviceId: 'device-1', expectedUpdatedAt: '2026-08-26T18:00:00.000Z',
        displayName: 'School phone',
      },
    }, tool('household.device.update'))).resolves.toMatchObject({ status: 'failed', code: 'household_target_stale' });
    expect(provider.proposals()).toHaveLength(0);
  });
});
