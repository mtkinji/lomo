# UGC Moderation Operations

This runbook operates the private `kwilt_ugc_reports` queue created for ASR-005. The queue is authoritative; email is a best-effort alert only.

## Response windows

- Urgent (`sexual_content`, `violence_or_threat`, or `privacy`): begin review within 4 hours.
- Standard: begin review within 24 hours.
- If anyone may be in immediate danger, preserve evidence, follow applicable emergency and legal escalation procedures, and do not imply Kwilt is an emergency-response service.

## Intake configuration

Deploy `ugc-report` with `UGC_MODERATION_EMAIL`, `RESEND_API_KEY`, and the normal transactional sender configuration. Test with a non-sensitive fixture report. If email fails, the persisted `open` row remains actionable and must be found during queue checks.

## Queue review

Use an administrative connection or Supabase Studio. Never share queue screenshots or exports outside the authorized operator boundary; rows contain reporter identity and preserved content.

```sql
select id, target_kind, reason, priority, status, submitted_at, response_due_at
from public.kwilt_ugc_reports
where status in ('open', 'reviewing', 'needs_information')
order by (response_due_at < now()) desc, response_due_at, submitted_at;
```

On first review, set `status = 'reviewing'`, `first_reviewed_at = coalesce(first_reviewed_at, now())`, and `updated_at = now()`. Compare the immutable snapshot to authoritative source state when it still exists. Do not overwrite `snapshot` or `reporter_note`.

Resolve as `actioned` or `dismissed`, record a concise factual `resolution`, and set `resolved_at` and `updated_at`. Possible actions are content suppression, relationship blocking, or a separately authorized account action. Report count alone is not proof of abuse.

The report snapshot records whether the reporter and reported person shared an
active Household at intake. Never treat a social block as Household removal or
caregiver revocation. A managed child's report is not disclosed to the accused
Household member. Any external safeguarding or emergency escalation requires
operator judgment under applicable policy and law; Kwilt does not automatically
notify another caregiver.

## Reporter follow-up and appeals

Use the account's verified contact only when more information is necessary. Do not disclose the reporter to the reported user. Appeals arrive through the published support address and should reference the report receipt. Link the appeal in operator notes; preserve the original decision and record any later change.

## Release proof

Before ASR-005 is verified, retain dated evidence of a production intake, alert receipt, first-review timestamp within the window, resolution audit fields, reporter privacy, database authorization tests, and two-account blocking behavior on the exact candidate.
