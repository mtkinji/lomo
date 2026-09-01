import type { SupabaseClient } from '@supabase/supabase-js';
import { getMoneyFamilyStatus, normalizeMoneyFamilyInviteCode } from './moneyFamilySharing';

describe('normalizeMoneyFamilyInviteCode', () => {
  it('accepts grouped, lowercase invite codes without changing their identity', () => {
    expect(normalizeMoneyFamilyInviteCode('abcd-1234')).toBe('ABCD1234');
  });
});

describe('getMoneyFamilyStatus', () => {
  it('derives caregiver Money access from the canonical Kwilt household automatically', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        household: { id: 'household-1', name: 'My household' },
        currentMembershipId: 'caregiver-1',
        members: [
          { id: 'owner-1', role: 'owner' },
          { id: 'caregiver-1', role: 'caregiver' },
          { id: 'child-1', role: 'child' },
        ],
      },
      error: null,
    });
    const client = {
      rpc,
      from: jest.fn(() => { throw new Error('Money must not require a second household membership.'); }),
    } as unknown as SupabaseClient;

    await expect(getMoneyFamilyStatus(client)).resolves.toEqual({
      householdId: 'household-1',
      householdName: 'My household',
      role: 'caregiver',
      memberCount: 2,
    });
    expect(rpc).toHaveBeenCalledWith('get_kwilt_household_snapshot');
  });
});
