import { appendGoalInviteReferralCode } from './goalInviteReferralUrl';

describe('appendGoalInviteReferralCode', () => {
  it('returns the input unchanged when the URL or referral code is blank', () => {
    expect(appendGoalInviteReferralCode('', 'abc')).toBe('');
    expect(appendGoalInviteReferralCode('not normalized', '   ')).toBe('not normalized');
  });

  it('adds and encodes a referral code on a valid URL', () => {
    expect(
      appendGoalInviteReferralCode('https://kwilt.app/invite?source=share', '  friend code  '),
    ).toBe('https://kwilt.app/invite?source=share&ref=friend+code');
  });

  it('preserves an existing nonblank referral code', () => {
    expect(
      appendGoalInviteReferralCode('https://kwilt.app/invite?ref=existing', 'replacement'),
    ).toBe('https://kwilt.app/invite?ref=existing');
  });

  it('replaces an existing blank referral code', () => {
    expect(
      appendGoalInviteReferralCode('https://kwilt.app/invite?ref=%20', 'replacement'),
    ).toBe('https://kwilt.app/invite?ref=replacement');
  });

  it('uses query-string fallback for malformed or relative URLs', () => {
    expect(appendGoalInviteReferralCode('invite/path', 'friend code')).toBe(
      'invite/path?ref=friend%20code',
    );
    expect(appendGoalInviteReferralCode('invite/path?source=share', 'friend code')).toBe(
      'invite/path?source=share&ref=friend%20code',
    );
  });
});
