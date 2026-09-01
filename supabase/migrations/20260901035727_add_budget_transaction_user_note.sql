alter table public.budget_transactions
  add column if not exists user_note text;

alter table public.budget_transactions
  drop constraint if exists budget_transactions_user_note_check;
alter table public.budget_transactions
  add constraint budget_transactions_user_note_check
  check (
    user_note is null
    or (
      user_note = btrim(user_note)
      and char_length(user_note) between 1 and 500
    )
  );

comment on column public.budget_transactions.user_note is
  'Optional user-authored context visible to members who can access the shared Money transaction. Does not alter provider description or financial classification.';

grant update (user_note)
on public.budget_transactions
to authenticated;
