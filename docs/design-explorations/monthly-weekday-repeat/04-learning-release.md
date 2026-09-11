# Learning release
Build a real monthly weekday rule in the existing Repeat editor. Choose Months, Day of week, Third, Sunday, then Set; reopen to see the same rule. Completing/skipping creates the next future matching date, retaining reminder time and avoiding backfill. Fifth weekdays skip months that lack them; Last always resolves within the month.

Local build first. Include payload, labels, editor, scheduler and regressions. Exclude AI rule creation and release submission. Optional JSON field keeps legacy rules unchanged. Rollback requires retaining schedule interpretation for any saved new rules.
