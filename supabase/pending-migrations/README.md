# Pending Supabase migrations

These migrations are committed product work that was not present in the hosted
Kwilt project's migration history when the repository was reconciled on
2026-08-26. Supabase CLI does not load this directory. The authoritative hosted
migration history lives in `supabase/migrations`. Where the repository retained
an authored migration with the same name, its SQL was preserved under the
hosted timestamp. Older remote-only records that the Supabase CLI could
represent only as `;` remain explicit history placeholders; they prove
ordering, but not a fresh-database replay. Use a current schema dump as the
baseline if full disaster-recovery replay is required.

Do not move or apply these files as a group. Thirteen files were checked against
the hosted database inside a transaction that was rolled back. The
`kwilt_games_full_parity` migration did not validate because its monolithic
constraint change is obsolete and has been superseded by the hosted, decomposed
Games migrations.

To ship product work represented here:

1. Review its current schema, data, and feature assumptions independently.
2. Create a new migration with `supabase migration new <name>`.
3. Port only the still-required SQL into that new, current migration.
4. Run focused rollback-safe and feature verification.
5. Deploy that migration as its own reviewed change.

This quarantine keeps the SQL and its contract tests visible without falsely
claiming that the hosted project has applied it.
