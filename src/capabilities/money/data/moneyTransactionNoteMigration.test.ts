import { readFileSync } from 'fs';
import { resolve } from 'path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260901035727_add_budget_transaction_user_note.sql'),
  'utf8',
).toLowerCase();

describe('Money transaction note migration', () => {
  it('adds one bounded nullable note and grants only authenticated update access', () => {
    expect(migration).toContain('add column if not exists user_note text');
    expect(migration).toContain('char_length(user_note) between 1 and 500');
    expect(migration).toContain('user_note = btrim(user_note)');
    expect(migration).toContain('grant update (user_note)');
    expect(migration).toContain('to authenticated');
    expect(migration).not.toContain('to anon');
    expect(migration).not.toContain('security definer');
  });
});
