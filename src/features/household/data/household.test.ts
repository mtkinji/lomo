import type { SupabaseClient } from '@supabase/supabase-js';
import {
  acceptCaregiverInvite,
  acceptHouseholdMemberInvite,
  addDependentChild,
  buildHouseholdInviteUrl,
  buildHouseholdPlanInviteMessage,
  createCaregiverInvite,
  createHouseholdMemberInvite,
  findPendingHouseholdInviteForMe,
  getHouseholdSnapshot,
  previewHouseholdInvite,
  removeHouseholdMember,
  setCaregiverCapabilityGrant,
  setChildCapabilityActivation,
} from './household';

const snapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: '2026-08-27T00:00:00Z', avatarUrl: null, avatarSource: 'initials' },
    { id: 'child-1', personId: 'person-2', displayName: 'Riley', kind: 'dependent', role: 'child', updatedAt: '2026-08-27T00:00:00Z', avatarUrl: null, avatarSource: 'initials' },
  ],
  activations: [
    { childMembershipId: 'child-1', capabilityId: 'todos', state: 'active' },
  ],
  grants: [],
};

function clientReturning(data: unknown = snapshot, error: unknown = null) {
  const rpc = jest.fn().mockResolvedValue({ data, error });
  const invoke = jest.fn();
  return { client: { rpc, functions: { invoke } } as unknown as SupabaseClient, rpc, invoke };
}

describe('Household data boundary', () => {
  it('builds a normalized installed-app invitation link', () => {
    expect(buildHouseholdInviteUrl(' child12 ')).toBe('https://go.kwilt.app/open/household/CHILD12');
  });

  it('builds a truthful Plan invitation message without implying automatic access', () => {
    expect(buildHouseholdPlanInviteMessage({
      inviterName: 'Andrew',
      householdName: 'Watanabe household',
      code: ' child12 ',
    })).toBe(
      'Andrew invited you to join Watanabe household in Kwilt and weigh in on the family Plan.\n\n'
      + 'You’ll review what joining shares before you accept.\n\n'
      + 'https://go.kwilt.app/open/household/CHILD12',
    );
  });

  it('loads and parses a Household snapshot', async () => {
    const { client, rpc } = clientReturning();
    await expect(getHouseholdSnapshot(client)).resolves.toEqual(snapshot);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_household_snapshot');
  });

  it('adds the first dependent without requiring a pre-created Household', async () => {
    const { client, rpc } = clientReturning();
    await addDependentChild(client, {
      householdId: null,
      displayName: ' Riley ',
      ownerDisplayName: ' Andrew ',
    });
    expect(rpc).toHaveBeenCalledWith('add_kwilt_dependent', {
      p_household_id: null,
      p_display_name: 'Riley',
      p_owner_display_name: 'Andrew',
    });
  });

  it('scopes activation to one child and one capability', async () => {
    const { client, rpc } = clientReturning();
    await setChildCapabilityActivation(client, {
      childMembershipId: 'child-1', capabilityId: 'screen-time', enabled: true,
    });
    expect(rpc).toHaveBeenCalledWith('set_kwilt_child_capability_activation', {
      p_child_membership_id: 'child-1', p_capability_id: 'screen-time', p_enabled: true,
    });
  });

  it('uses exact server parameters for grants, invites, acceptance, and removal', async () => {
    const { client, rpc } = clientReturning();
    rpc
      .mockResolvedValueOnce({ data: snapshot, error: null })
      .mockResolvedValueOnce({ data: { code: 'INVITE12', expiresAt: '2026-08-04T00:00:00Z' }, error: null })
      .mockResolvedValueOnce({ data: snapshot, error: null })
      .mockResolvedValueOnce({ data: snapshot, error: null });
    await setCaregiverCapabilityGrant(client, {
      caregiverMembershipId: 'caregiver-1', childMembershipId: 'child-1', capabilityId: 'todos', granted: true,
    });
    await createCaregiverInvite(client, { householdId: 'household-1', invitedEmail: 'b@example.com', ownerDisplayName: 'Andrew' });
    await acceptCaregiverInvite(client, { code: 'ABC123', displayName: 'Blaire' });
    await removeHouseholdMember(client, 'caregiver-1');

    expect(rpc).toHaveBeenNthCalledWith(1, 'set_kwilt_household_capability_grant', {
      p_caregiver_membership_id: 'caregiver-1', p_child_membership_id: 'child-1', p_capability_id: 'todos', p_granted: true,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'create_kwilt_household_invite', {
      p_household_id: 'household-1', p_invited_email: 'b@example.com', p_owner_display_name: 'Andrew',
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'accept_kwilt_household_invite', { p_code: 'ABC123', p_display_name: 'Blaire' });
    expect(rpc).toHaveBeenNthCalledWith(4, 'remove_kwilt_household_member', { p_membership_id: 'caregiver-1' });
  });

  it('creates, previews, and accepts a child account invitation', async () => {
    const { client, rpc, invoke } = clientReturning();
    rpc
      .mockResolvedValueOnce({
        data: {
          householdName: 'My household',
          inviterDisplayName: 'Andrew',
          role: 'child',
          expiresAt: '2026-08-05T00:00:00Z',
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: snapshot, error: null });
    invoke.mockResolvedValueOnce({
      data: {
        code: 'AB12CD', expiresAt: '2026-08-05T00:00:00Z', role: 'child',
        recovered: false, emailDelivery: 'sent',
      },
      error: null,
    });

    await expect(createHouseholdMemberInvite(client, {
      householdId: null,
      role: 'child',
      invitedEmail: ' Charlie@Example.com ',
      ownerDisplayName: ' Andrew ',
    })).resolves.toEqual({
      code: 'AB12CD', expiresAt: '2026-08-05T00:00:00Z', role: 'child',
      recovered: false, emailDelivery: 'sent',
    });
    await expect(previewHouseholdInvite(client, ' ab12cd ')).resolves.toEqual({
      householdName: 'My household',
      inviterDisplayName: 'Andrew',
      role: 'child',
      expiresAt: '2026-08-05T00:00:00Z',
    });
    await acceptHouseholdMemberInvite(client, { code: ' ab12cd ', displayName: ' Charlie ' });

    expect(invoke).toHaveBeenCalledWith('household-invite-send', { body: {
      householdId: null,
      role: 'child',
      invitedEmail: 'charlie@example.com',
      ownerDisplayName: 'Andrew',
    } });
    expect(rpc).toHaveBeenNthCalledWith(1, 'preview_kwilt_household_invite', {
      p_code: 'AB12CD',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'accept_kwilt_household_member_invite', {
      p_code: 'AB12CD',
      p_display_name: 'Charlie',
    });
  });

  it('sends an email-bound invitation and returns a truthful reusable receipt', async () => {
    const { client, invoke } = clientReturning();
    invoke.mockResolvedValue({
      data: {
        code: 'ABCD2345',
        expiresAt: '2026-09-06T00:00:00Z',
        role: 'caregiver',
        recovered: true,
        emailDelivery: 'sent',
      },
      error: null,
    });

    await expect(createHouseholdMemberInvite(client, {
      householdId: 'household-1',
      role: 'caregiver',
      invitedEmail: ' Blaire@Example.com ',
      ownerDisplayName: ' Andrew ',
    })).resolves.toMatchObject({ recovered: true, emailDelivery: 'sent' });
    expect(invoke).toHaveBeenCalledWith('household-invite-send', { body: {
      householdId: 'household-1',
      role: 'caregiver',
      invitedEmail: 'blaire@example.com',
      ownerDisplayName: 'Andrew',
    } });
  });

  it('discovers the pending invitation for the signed-in email without a code', async () => {
    const pending = {
      invitationId: 'invite-1',
      householdName: 'My household',
      inviterDisplayName: 'Andrew',
      role: 'caregiver',
      expiresAt: '2026-09-06T00:00:00Z',
    };
    const { client, rpc } = clientReturning(pending);
    await expect(findPendingHouseholdInviteForMe(client)).resolves.toEqual(pending);
    expect(rpc).toHaveBeenCalledWith('get_kwilt_pending_household_invitation_for_me');
  });

  it('rejects malformed role-aware invitation responses', async () => {
    const malformedInvite = clientReturning({
      code: 'AB12CD', expiresAt: '2026-08-05T00:00:00Z', role: 'owner',
    });
    await expect(createHouseholdMemberInvite(malformedInvite.client, {
      householdId: null,
      role: 'child',
      ownerDisplayName: 'Andrew',
    })).rejects.toThrow('Invalid Household invitation');

    const malformedPreview = clientReturning({
      householdName: 'My household', inviterDisplayName: 'Andrew', role: 'child',
    });
    await expect(previewHouseholdInvite(malformedPreview.client, 'AB12CD'))
      .rejects.toThrow('Invalid Household invitation preview');
  });

  it('throws the server message and rejects malformed snapshots', async () => {
    const failed = clientReturning(null, { message: 'household_owner_required' });
    await expect(getHouseholdSnapshot(failed.client)).rejects.toThrow('household_owner_required');

    const malformed = clientReturning({ household: { id: 1 } });
    await expect(getHouseholdSnapshot(malformed.client)).rejects.toThrow('Invalid Household snapshot');
  });
});
