import { extractInviteCode } from './invites';

describe('extractInviteCode', () => {
  it('returns empty string for empty/whitespace input', () => {
    expect(extractInviteCode('')).toBe('');
    expect(extractInviteCode('   ')).toBe('');
  });

  it('returns the raw code unchanged when no scheme/host present', () => {
    expect(extractInviteCode('ABCD1234')).toBe('ABCD1234');
  });

  it('trims whitespace around raw codes', () => {
    expect(extractInviteCode('  ABCD1234  ')).toBe('ABCD1234');
  });

  it('extracts the code from kwilt://invite?code=...', () => {
    expect(extractInviteCode('kwilt://invite?code=ABC123')).toBe('ABC123');
  });

  it('extracts the code from https://go.kwilt.app/i/<code>', () => {
    expect(extractInviteCode('https://go.kwilt.app/i/HELLO')).toBe('HELLO');
  });

  it('extracts the code from https://kwilt.app/i/<code>', () => {
    expect(extractInviteCode('https://kwilt.app/i/HELLO')).toBe('HELLO');
  });

  it('extracts the code from hosted share invite URLs', () => {
    expect(extractInviteCode('https://go.kwilt.app/share/HELLO')).toBe('HELLO');
    expect(extractInviteCode('https://kwilt.app/share/HELLO')).toBe('HELLO');
  });

  it('decodes percent-encoded codes from path segments', () => {
    expect(extractInviteCode('https://go.kwilt.app/share/some%20code')).toBe('some code');
  });

  it('returns empty string for unrelated URLs', () => {
    expect(extractInviteCode('https://example.com/x')).toBe('');
  });

  it('returns empty string for malformed URLs (other than raw codes)', () => {
    expect(extractInviteCode('https://')).toBe('');
  });

  it('prefers query-string code over path when both are present', () => {
    expect(
      extractInviteCode('https://go.kwilt.app/i/PATHCODE?code=QUERYCODE'),
    ).toBe('QUERYCODE');
  });
});
