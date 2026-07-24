# Incident Response Runbook

Owner: Andrew Watanabe  
Applies to: Kwilt Money and Kwilt Labs systems that process user financial data  
Status: active baseline  
Last updated: 2026-06-24

## Incident Definition

A security incident is any confirmed or suspected event that could affect the
confidentiality, integrity, or availability of Kwilt Money systems or user
data.

Examples:

- Exposed Plaid, Supabase, Apple, or deployment credentials.
- Unauthorized production access.
- User financial data visible to the wrong account.
- Suspicious provider webhook or sync behavior.
- Logs containing secrets or sensitive financial data.
- Lost device or compromised account with production access.

## Severity Levels

### Severity 1

Confirmed exposure of production secrets, user financial data, or unauthorized
production access.

### Severity 2

Likely exposure or exploitable weakness that could affect sensitive data, but
scope is not yet confirmed.

### Severity 3

Low-risk issue, configuration weakness, or false-positive investigation with no
known sensitive data exposure.

## Response Process

1. Triage

   - Record the time discovered.
   - Identify affected systems, users, data types, and suspected source.
   - Assign a severity.

2. Contain

   - Revoke or rotate exposed secrets.
   - Disable affected access paths or integrations if needed.
   - Preserve relevant logs and evidence.

3. Investigate

   - Determine what happened.
   - Determine what data or systems were affected.
   - Determine whether the issue is ongoing.

4. Remediate

   - Fix the root cause.
   - Add tests, monitoring, or access controls where appropriate.
   - Verify the fix before restoring access or resuming affected workflows.

5. Communicate

   - Notify affected users, providers, app stores, or regulators when required.
   - Keep communication factual and limited to confirmed information.
   - Document what was affected, what was done, and what users should do.

6. Review

   - Write a short post-incident note.
   - Capture follow-up actions.
   - Update security policy or runbooks if needed.

## Credential Exposure Checklist

If a secret is exposed:

- Revoke or rotate the secret immediately.
- Search git history, logs, build output, and deployment settings for copies.
- Replace the secret in local and production environments.
- Verify the old secret no longer works.
- Check provider logs for suspicious use where available.

## Financial Data Exposure Checklist

If user financial data may be exposed:

- Identify affected users and accounts.
- Determine whether raw transactions, account metadata, provider tokens, or
  meter assignments were involved.
- Stop sync or access paths if needed.
- Preserve evidence.
- Prepare user/provider notification if required.

## Post-Incident Note Template

```text
Incident:
Severity:
Discovered:
Resolved:
Affected systems:
Affected data:
Root cause:
Containment:
Remediation:
Follow-up:
```
