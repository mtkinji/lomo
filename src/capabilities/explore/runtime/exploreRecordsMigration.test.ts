import fs from 'node:fs';
import path from 'node:path';

describe('Explore durable records migration', () => {
  const migrationsDirectory = path.resolve(process.cwd(), 'supabase/migrations');
  const migration = fs.readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.includes('explore_records'))
    .map((fileName) => fs.readFileSync(path.join(migrationsDirectory, fileName), 'utf8'))
    .join('\n')
    .toLowerCase();

  it('creates a constrained incremental record store', () => {
    expect(migration).toContain('create table public.explore_records');
    expect(migration).toContain('primary key (user_id, record_type, record_id)');
    expect(migration).toContain("record_type in ('session', 'place', 'relationship', 'reset')");
    expect(migration).toContain('payload jsonb not null');
    expect(migration).toContain('client_updated_at timestamptz not null');
    expect(migration).toContain('deleted_at timestamptz');
    expect(migration).toContain('create index explore_records_owner_updated_idx');
    expect(migration).toContain('if new.client_updated_at < old.client_updated_at then');
  });

  it('exposes records only to their authenticated owner', () => {
    expect(migration).toContain('alter table public.explore_records enable row level security');
    expect(migration).toContain('revoke all on table public.explore_records from anon');
    expect(migration).toContain(
      'grant select, insert, update, delete on table public.explore_records to authenticated',
    );
    expect(migration).toContain('to authenticated using ((select auth.uid()) = user_id)');
    expect(migration).toContain('to authenticated with check ((select auth.uid()) = user_id)');
    expect(migration).toContain(
      'to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
    );
    expect(migration).not.toContain('to anon');
    expect(migration).toContain('as restrictive for all');
    expect(migration).toContain("((select (auth.jwt()->>'is_anonymous')::boolean) is false)");
  });
});
