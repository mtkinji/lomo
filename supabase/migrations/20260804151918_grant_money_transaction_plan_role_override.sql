-- The additive column migration reached production before the authenticated
-- column-level UPDATE grant was included. Keep this follow-up so local and
-- remote migration histories both reproduce the final privilege contract.
grant update (plan_role_override, plan_role_override_reviewed_at)
on public.budget_transactions
to authenticated;
