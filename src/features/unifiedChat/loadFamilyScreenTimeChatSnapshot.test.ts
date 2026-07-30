import type { SupabaseClient } from '@supabase/supabase-js';
import { loadFamilyScreenTimeChatSnapshot } from './loadFamilyScreenTimeChatSnapshot';

const policy = (childMembershipId: string) => ({
  childMembershipId, subjectId: `subject-${childMembershipId}`, desiredPolicyVersion: 1,
  selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
});

function clientFor(role: 'owner' | 'caregiver' | 'child') {
  const rpc = jest.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === 'get_kwilt_household_snapshot') return { data: {
      household: { id: 'household-1', name: 'Family' }, currentMembershipId: 'actor',
      members: [
        { id: 'actor', personId: 'person-actor', displayName: 'Actor', kind: role === 'child' ? 'dependent' : 'adult', role },
        { id: 'charlie', personId: 'person-charlie', displayName: 'Charlie', kind: 'dependent', role: 'child' },
        { id: 'grant', personId: 'person-grant', displayName: 'Grant', kind: 'dependent', role: 'child' },
      ],
      activations: [
        { childMembershipId: 'charlie', capabilityId: 'screen-time', state: 'active' },
        { childMembershipId: 'grant', capabilityId: 'screen-time', state: 'active' },
      ],
      grants: [{ caregiverMembershipId: 'actor', childMembershipId: 'charlie', capabilityId: 'screen-time' }],
    }, error: null };
    if (name === 'get_kwilt_family_screen_time_snapshot') {
      return { data: policy(String(args?.p_child_membership_id)), error: null };
    }
    return { data: null, error: { message: `Unexpected RPC: ${name}` } };
  });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('loadFamilyScreenTimeChatSnapshot', () => {
  it('loads every activated child for a Household owner', async () => {
    const { client, rpc } = clientFor('owner');
    await expect(loadFamilyScreenTimeChatSnapshot(client)).resolves.toMatchObject({
      children: [{ membershipId: 'charlie' }, { membershipId: 'grant' }],
    });
    expect(rpc).toHaveBeenCalledWith('get_kwilt_family_screen_time_snapshot', { p_child_membership_id: 'charlie' });
    expect(rpc).toHaveBeenCalledWith('get_kwilt_family_screen_time_snapshot', { p_child_membership_id: 'grant' });
  });

  it('never queries a child without the caregiver-specific Screen Time grant', async () => {
    const { client, rpc } = clientFor('caregiver');
    await expect(loadFamilyScreenTimeChatSnapshot(client)).resolves.toMatchObject({
      children: [{ membershipId: 'charlie' }],
    });
    expect(rpc).not.toHaveBeenCalledWith('get_kwilt_family_screen_time_snapshot', { p_child_membership_id: 'grant' });
  });

  it('does not expose family controls to a child account', async () => {
    const { client, rpc } = clientFor('child');
    await expect(loadFamilyScreenTimeChatSnapshot(client)).resolves.toEqual({ children: [] });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
