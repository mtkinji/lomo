import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Family Screen Time agreement prerequisite guard migration', () => {
  const migration = readFileSync(resolve(
    process.cwd(),
    'supabase/migrations/20260827145048_enforce_family_screen_time_agreement_prerequisite_selection.sql',
  ), 'utf8').toLowerCase();

  it('atomically restricts a prerequisite to an active selection for the same child subject', () => {
    expect(migration).toContain('before insert or update of subject_id, rule, active');
    expect(migration).toContain("if new.active and new.rule ? 'prerequisiteactivity'");
    expect(migration).toContain('prerequisite.subject_id = new.subject_id');
    expect(migration).toContain("prerequisite.status = 'active'");
    expect(migration).toContain('if v_prerequisite_id = new.selection_id');
    expect(migration).toContain("raise exception 'prerequisite_selection_matches_target'");
    expect(migration).toContain("raise exception 'prerequisite_selection_subject_mismatch'");
  });

  it('does not expose the trigger function as a callable authenticated API', () => {
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain(
      'revoke all on function public.validate_kwilt_family_screen_time_agreement_prerequisite() from public, anon, authenticated;',
    );
  });
});
