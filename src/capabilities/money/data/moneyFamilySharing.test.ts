import { normalizeMoneyFamilyInviteCode } from './moneyFamilySharing';

describe('normalizeMoneyFamilyInviteCode', () => {
  it('accepts grouped, lowercase invite codes without changing their identity', () => {
    expect(normalizeMoneyFamilyInviteCode('abcd-1234')).toBe('ABCD1234');
  });
});
