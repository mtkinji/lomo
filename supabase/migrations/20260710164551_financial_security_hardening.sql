create or replace function public.accept_budget_household_invite(
  p_invite_code_hash text,
  p_user_id uuid
)
returns table (
  household_id uuid,
  household_name text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed_household_id uuid;
  claimed_household_name text;
  active_household_id uuid;
begin
  if p_user_id is null then
    raise exception 'Authenticated user is required.' using errcode = 'P0001';
  end if;

  select member.household_id
  into active_household_id
  from public.budget_household_members member
  where member.user_id = p_user_id
    and member.status = 'active'
  limit 1;

  update public.budget_household_invites invite
  set accepted_by_user_id = p_user_id,
      accepted_at = now()
  from public.budget_households household
  where invite.invite_code_hash = p_invite_code_hash
    and invite.household_id = household.id
    and invite.accepted_at is null
    and invite.revoked_at is null
    and invite.expires_at > now()
    and invite.created_by_user_id <> p_user_id
    and (active_household_id is null or active_household_id = invite.household_id)
  returning invite.household_id, household.name
  into claimed_household_id, claimed_household_name;

  if claimed_household_id is null then
    raise exception 'Invite is invalid, expired, or already accepted.' using errcode = 'P0001';
  end if;

  insert into public.budget_household_members (
    household_id,
    user_id,
    role,
    status
  ) values (
    claimed_household_id,
    p_user_id,
    'member',
    'active'
  )
  on conflict (household_id, user_id)
  do update set
    status = 'active',
    role = 'member';

  return query select claimed_household_id, claimed_household_name;
end;
$$;

revoke execute on function public.accept_budget_household_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.accept_budget_household_invite(text, uuid) to service_role;

revoke update on public.budget_transactions from authenticated;
grant update (
  budget_id,
  budget_match_source,
  budget_match_confidence,
  budget_match_reason,
  budget_match_reviewed_at,
  money_meaning,
  money_meaning_source,
  money_meaning_category_budget_id,
  money_meaning_reason,
  money_meaning_reviewed_at
) on public.budget_transactions to authenticated;

drop policy if exists "Household members can update shared budget transaction reviews" on public.budget_transactions;
drop policy if exists "Users can update their own budget transaction reviews" on public.budget_transactions;
create policy "Users can update their own budget transaction reviews"
on public.budget_transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter table public.budget_transactions
  add column if not exists budget_reviewed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists budget_review_last_changed_at timestamptz;

create or replace function public.set_budget_transaction_review_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.budget_reviewed_by_user_id = (select auth.uid());
    new.budget_review_last_changed_at = now();
  end if;
  return new;
end;
$$;

revoke execute on function public.set_budget_transaction_review_audit() from public, anon, authenticated;

drop trigger if exists set_budget_transaction_review_audit on public.budget_transactions;
create trigger set_budget_transaction_review_audit
before update of
  budget_id,
  budget_match_source,
  budget_match_confidence,
  budget_match_reason,
  budget_match_reviewed_at,
  money_meaning,
  money_meaning_source,
  money_meaning_category_budget_id,
  money_meaning_reason,
  money_meaning_reviewed_at
on public.budget_transactions
for each row execute function public.set_budget_transaction_review_audit();
;
