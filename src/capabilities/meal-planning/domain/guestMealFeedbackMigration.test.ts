import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260812175939_guest_meal_plan_feedback.sql'),
  'utf8',
).toLowerCase();

describe('guest Meal Plan feedback migration contract', () => {
  it('keeps bearer tokens hashed and guest tables closed behind bounded RPCs', () => {
    expect(sql).toContain('token_hash bytea');
    expect(sql).toContain("digest(convert_to(p_token, 'utf8'), 'sha256')");
    expect(sql).not.toMatch(/\btoken\s+text/);
    expect(sql).toContain('alter table public.kwilt_guest_meal_feedback_invites enable row level security');
    expect(sql).toContain('alter table public.kwilt_guest_meal_feedback_responses enable row level security');
    expect(sql).toContain('revoke all on table public.kwilt_guest_meal_feedback_invites from anon, authenticated');
    expect(sql).toContain('revoke all on table public.kwilt_guest_meal_feedback_responses from anon, authenticated');
  });

  it('grants guests only preview and submit while organizers own creation and revocation', () => {
    for (const rpc of [
      'create_kwilt_guest_meal_feedback_invite',
      'preview_kwilt_guest_meal_feedback_invite',
      'submit_kwilt_guest_meal_feedback',
      'revoke_kwilt_guest_meal_feedback_invite',
    ]) {
      expect(sql).toMatch(new RegExp(`create or replace function public\\.${rpc}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`));
    }
    expect(sql).toContain('grant execute on function public.preview_kwilt_guest_meal_feedback_invite(text) to anon, authenticated');
    expect(sql).toContain('grant execute on function public.submit_kwilt_guest_meal_feedback(text,uuid,text,uuid[],boolean,text) to anon, authenticated');
    expect(sql).toContain('grant execute on function public.create_kwilt_guest_meal_feedback_invite(uuid,integer,timestamptz) to authenticated');
    expect(sql).toContain('grant execute on function public.revoke_kwilt_guest_meal_feedback_invite(uuid) to authenticated');
  });

  it('bounds expiry, selection, suggestion, display name, and exposed candidate fields', () => {
    expect(sql).toContain("least(coalesce(p_expires_at, now() + interval '7 days'), now() + interval '30 days')");
    expect(sql).toContain('cardinality(p_selected_candidate_ids) > v_round.selection_limit');
    expect(sql).toContain('char_length(btrim(coalesce(p_suggestion');
    expect(sql).toContain('char_length(btrim(coalesce(p_display_name');
    expect(sql).toContain("jsonb_build_object('id',c.candidate_id,'title',c.title,'imageurl'");
    expect(sql).not.toContain("'householdid'");
  });
});
