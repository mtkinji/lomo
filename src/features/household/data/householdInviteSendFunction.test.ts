import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(
  process.cwd(),
  'supabase/functions/household-invite-send/index.ts',
), 'utf8');

describe('Household invitation email function', () => {
  it('creates the invitation as the authenticated caller', () => {
    expect(source).toContain("headers: { Authorization: authorization }");
    expect(source).toContain("caller.rpc('create_kwilt_household_member_invite'");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it('returns the usable receipt even when email delivery fails', () => {
    expect(source).toContain("emailDelivery: outcome.ok ? 'sent' : 'failed'");
    expect(source).toContain('return json(200');
  });
});
