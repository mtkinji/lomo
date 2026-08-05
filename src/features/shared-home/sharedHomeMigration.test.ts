import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260805135914_shared_home_deliveries.sql',
);
const migration = readFileSync(migrationPath, 'utf8').toLowerCase();

describe('Shared Home delivery migration', () => {
  it('creates a recipient projection instead of widening the Goal feed', () => {
    expect(migration).toContain('create table public.kwilt_shared_deliveries');
    expect(migration).toContain('recipient_user_id uuid not null');
    expect(migration).toContain('unique (idempotency_key)');
    expect(migration).not.toContain('alter table public.kwilt_feed_events');
  });

  it('permits exact permanent-recipient reads without authenticated writes', () => {
    expect(migration).toContain('recipient_user_id = (select auth.uid())');
    expect(migration).toContain("(select auth.jwt()) ->> 'is_anonymous'");
    expect(migration).toContain(
      'revoke insert, update, delete on public.kwilt_shared_deliveries from authenticated',
    );
  });

  it('settles targeted invitations from source lifecycle truth', () => {
    expect(migration).toContain(
      'create or replace function public.sync_goal_invite_shared_delivery()',
    );
    expect(migration).toContain("new.recipient_state in ('accepted', 'declined', 'revoked')");
  });

  it('registers recipient changes with the existing Realtime publication', () => {
    expect(migration).toContain('alter publication supabase_realtime add table public.kwilt_shared_deliveries');
  });

  it('does not wire live Bank rolls into Shared Home', () => {
    const remoteBankCommand = readFileSync(
      resolve(process.cwd(), 'supabase/functions/remote-bank-command/index.ts'),
      'utf8',
    );
    expect(remoteBankCommand).not.toContain('buildGameTurnDelivery');
  });
});
