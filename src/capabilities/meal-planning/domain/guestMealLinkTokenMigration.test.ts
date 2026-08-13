import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260813112810_fix_guest_meal_link_tokens.sql'),
  'utf8',
).toLowerCase();

describe('guest Meal Plan link token repair migration', () => {
  it('issues unpadded base64url tokens without trailing punctuation', () => {
    expect(sql).toContain("rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=')");
    expect(sql).not.toContain("translate(encode(extensions.gen_random_bytes(32), 'base64'), '/+=', '_-.')");
  });

  it('resolves and accepts legacy tokens whose trailing period was stripped', () => {
    expect(sql).toContain("extensions.digest(convert_to(p_token || '.', 'utf8'), 'sha256')");
    expect(sql).toContain('create or replace function public.preview_kwilt_guest_meal_feedback_invite');
    expect(sql).toContain('create or replace function public.submit_kwilt_guest_meal_feedback');
  });

  it('preserves the bounded role grants', () => {
    expect(sql).toContain('grant execute on function public.create_kwilt_guest_meal_feedback_invite(uuid,integer,timestamptz) to authenticated');
    expect(sql).toContain('grant execute on function public.preview_kwilt_guest_meal_feedback_invite(text) to anon, authenticated');
    expect(sql).toContain('grant execute on function public.submit_kwilt_guest_meal_feedback(text,uuid,text,uuid[],boolean,text) to anon, authenticated');
  });
});
