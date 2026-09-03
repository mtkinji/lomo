import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260903132918_contextual_ugc_safety.sql'),
  'utf8',
).toLowerCase();

describe('contextual UGC safety migration contract', () => {
  it('keeps moderation reports private from app clients', () => {
    expect(migration).toContain('alter table public.kwilt_ugc_reports enable row level security');
    expect(migration).toContain('revoke all on public.kwilt_ugc_reports from public, anon, authenticated');
    expect(migration).toContain('grant all on public.kwilt_ugc_reports to service_role');
    expect(migration).toContain('reported_person_id uuid references public.kwilt_people');
    expect(migration).toContain("'household_member'");
    expect(migration).toContain("'meal_reaction'");
    expect(migration).toContain("'guest_meal_feedback'");
  });

  it('makes blocking an authenticated server-owned operation', () => {
    expect(migration).toContain('create or replace function public.block_kwilt_user');
    expect(migration).toContain('revoke all on function public.block_kwilt_user(uuid) from public, anon');
    expect(migration).toContain('grant execute on function public.block_kwilt_user(uuid) to authenticated');
    expect(migration).toContain("raise exception 'household_relationship_requires_role_action'");
    expect(migration).toContain('delete from public.kwilt_follows');
    expect(migration).toContain("status = 'blocked'");
  });

  it('enforces filtering and blocked-contact rules in the database', () => {
    expect(migration).toContain('create trigger enforce_goal_checkin_text_safety');
    expect(migration).toContain('create trigger enforce_goal_reply_text_safety');
    expect(migration).toContain('create trigger enforce_meal_reaction_text_safety');
    expect(migration).toContain('create trigger enforce_guest_meal_feedback_text_safety');
    expect(migration).toContain('create trigger enforce_unblocked_feed_contact');
    expect(migration).toContain('create trigger suppress_blocked_targeted_invites');
    expect(migration).toContain('create trigger suppress_blocked_shared_deliveries');
  });

  it('keeps personal hiding authorized and separate from Household blocking', () => {
    expect(migration).toContain('create table public.kwilt_ugc_hidden_targets');
    expect(migration).toContain('create or replace function public.hide_kwilt_ugc_target');
    expect(migration).toContain("v_target_person_id = v_person_id");
    expect(migration).toContain("v_role not in ('owner', 'caregiver')");
    expect(migration).toContain("hidden.target_kind='meal_reaction'");
    expect(migration).toContain("hidden.target_kind='guest_meal_feedback'");
  });
});
