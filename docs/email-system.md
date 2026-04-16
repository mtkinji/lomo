# Kwilt email system — runbook

> Operational guide for the Kwilt email system. Part of the Phase 7.6
> deliverable in [`email-system-ga-plan.md`](./email-system-ga-plan.md).
> Read that plan first for the _why_; this doc is the _how_.

- **Last updated:** Phase 7 (April 2026)
- **Stack:** Supabase Edge Functions (Deno) + Resend + Next.js site (kwilt-site)
- **In-repo templates:** `supabase/functions/_shared/emailTemplates.ts`
- **Hosted templates (Resend):** Welcome Day 0 + Welcome Day 1 (automation: "Kwilt Welcome Drip")

## 1. Template inventory

| # | Template | Lives in | Sender function | Preference category | Transactional? |
|---|---|---|---|---|---|
| 1 | Welcome Day 0 | Resend Automation | `email-drip` fires `user.signup` event | `welcome_drip` | No (drip) |
| 2 | Welcome Day 1 | Resend Automation | Resend Automation (time-based, branching on open) | `welcome_drip` | No (drip) |
| 3 | Welcome Day 3 | In-repo (`buildWelcomeDay3Email`) | `email-drip` (scheduled) | `welcome_drip` | No (drip) |
| 4 | Welcome Day 7 | In-repo (`buildWelcomeDay7Email`) | `email-drip` (scheduled) | `welcome_drip` | No (drip) |
| 5 | Streak win-back 1 | In-repo (`buildStreakWinback1Email`) | `email-drip` (scheduled) | `streak_winback` | No (drip) |
| 6 | Streak win-back 2 | In-repo (`buildStreakWinback2Email`) | `email-drip` (scheduled) | `streak_winback` | No (drip) |
| 7 | Chapter digest | In-repo (`buildChapterDigestEmail`) | `chapters-generate` (scheduled) | `chapter_digest` | No (recurring) |
| 8 | Trial expiry | In-repo (`buildTrialExpiryEmail`) | `pro-codes` (RevenueCat webhook) | `marketing` | No (conversion) |
| 9 | Pro grant | In-repo (`buildProGrantEmail`) | `pro-codes` (admin grant) | _(none)_ | **Yes** |
| 10 | Pro code | In-repo (`buildProCodeEmail`) | `pro-codes` (admin send) | _(none)_ | **Yes** |
| 11 | Goal invite | In-repo (`buildGoalInviteEmail`) | `invite-email-send` (user action) | _(none)_ | **Yes** |
| 12 | Secret expiry alert | In-repo (`buildSecretExpiryAlertEmail`) | `secrets-expiry-monitor` (scheduled) | _(none)_ | **Yes** (admin) |

Transactional templates do **not** carry `List-Unsubscribe` headers and skip
the per-user daily cap (Phase 7.3) and preference guard (Phase 7.1). They
do still respect the global kill switch (Phase 7.2).

## 2. Preference taxonomy

`public.kwilt_email_preferences` has one boolean column per category:

| Column | Covers |
|---|---|
| `welcome_drip` | Welcome Day 0, 1, 3, 7 |
| `chapter_digest` | Weekly/monthly chapter delivery |
| `streak_winback` | Win-back emails 1 + 2 |
| `marketing` | Trial expiry + future broad campaigns |

Defaults to `true`. A row is only materialized once a user unsubscribes
(the unsubscribe endpoint `upsert`s). Users who never click unsubscribe
have no row and are treated as opted-in.

The campaign → category map lives in
`supabase/functions/_shared/emailUnsubscribe.ts::categoryForCampaign`.
Any new campaign MUST be added there; the category test fence asserts
that.

## 3. Environment variables

### Required for email to send

| Var | Default | Purpose |
|---|---|---|
| `RESEND_API_KEY` | _(unset)_ | Resend API token. Unset → sends return 503. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | _(unset)_ | Admin DB client for cadence + preference writes. |
| `KWILT_EMAIL_UNSUBSCRIBE_SECRET` | _(unset)_ | HMAC-SHA256 signing secret for unsubscribe tokens. Min length 32. Non-transactional sends **fail closed** when this is unset. |

### Optional

| Var | Default | Purpose |
|---|---|---|
| `KWILT_EMAIL_SENDING_ENABLED` | `1` | Global kill switch (Phase 7.2). Set to `0` to halt all sends without a deploy. |
| `KWILT_EMAIL_OPEN_BASE_URL` | `https://go.kwilt.app/open` | CTA base URL. Override for staging. |
| `KWILT_EMAIL_LOGO_URL` | _(unset)_ | Logo asset URL. Unset → no `<img>` (wordmark-only). |
| `KWILT_EMAIL_UNSUBSCRIBE_BASE_URL` | `https://kwilt.app/unsubscribe` | Visible footer unsubscribe link base. |
| `KWILT_EMAIL_UNSUBSCRIBE_POST_URL` | `${SUPABASE_URL}/functions/v1/unsubscribe` | RFC 8058 one-click target (the URL inside `<List-Unsubscribe>`). |
| `KWILT_DRIP_EMAIL_FROM` | `hello@mail.kwilt.app` | `From` for drip + chapter + trial emails. |
| `KWILT_EMAIL_APP_NAME` | `Kwilt` | Brand name in subject / body. |
| `KWILT_EMAIL_PRIMARY_COLOR` | `#1F5226` | CTA button / blockquote accent. |
| `KWILT_COMPANY_POSTAL_ADDRESS` | _(unset → omitted)_ | CAN-SPAM physical address line rendered in the footer of every template that already renders a footer (i.e. non-transactional sends). Use `|` to split multi-line addresses. |

### kwilt-site (Next.js) env

| Var | Default | Purpose |
|---|---|---|
| `KWILT_UNSUBSCRIBE_FUNCTION_URL` | `https://sqxwjtorodqjdfnuvprf.supabase.co/functions/v1/unsubscribe` (Prod/Preview/Dev) | Explicit URL to the Supabase unsubscribe function. Falls back to `${KWILT_SUPABASE_URL}/functions/v1/unsubscribe`. |
| `KWILT_SUPABASE_URL` | _(unset)_ | Supabase project URL — only needed if `KWILT_UNSUBSCRIBE_FUNCTION_URL` is not set (used by the `/api/unsubscribe` proxy). |

## 4. Architecture

```
┌─────────────────────┐        ┌──────────────────┐       ┌─────────────┐
│ Supabase scheduler  │ cron   │ email-drip       │ POST  │             │
│ (or cron-job.org)   ├───────►│ chapters-generate├──────►│ Resend API  │
│                     │        │ pro-codes        │       │ (/emails)   │
└─────────────────────┘        │ invite-email-send│       └─────────────┘
                               └────────┬─────────┘
                                        │ uses
                                        ▼
                          ┌─────────────────────────────┐
                          │ _shared/emailSend.ts        │
                          │  • kill switch              │
                          │  • preference guard         │
                          │  • daily cap (2/24h)        │
                          │  • forwards custom headers  │
                          └────────────┬────────────────┘
                                       │ builds
                                       ▼
                          ┌─────────────────────────────┐
                          │ _shared/emailUnsubscribe.ts │
                          │  • HMAC token codec         │
                          │  • List-Unsubscribe URLs    │
                          └─────────────────────────────┘
```

On receipt of the unsubscribe click:

```
Email footer link → https://kwilt.app/unsubscribe?t=<hmac>
  → Next.js page (client decodes payload for display)
  → user clicks "Confirm" → POST /api/unsubscribe
  → Next.js proxy forwards to Supabase Edge Function
  → edge function verifies HMAC, upserts kwilt_email_preferences row
```

Gmail / Yahoo / Apple Mail one-click:

```
Inbox "Unsubscribe" button → POST to <List-Unsubscribe> URL
  → directly hits Supabase Edge Function
  → verifies HMAC + upserts preferences row
  → returns 200
```

## 5. Local dev loop

### Render a template locally

1. Set `.env.local`:
   ```
   RESEND_API_KEY=re_...
   KWILT_EMAIL_LOGO_URL=https://www.kwilt.app/assets/brand/logo.png
   KWILT_EMAIL_OPEN_BASE_URL=https://go.kwilt.app/open
   KWILT_EMAIL_APP_NAME=Kwilt
   KWILT_EMAIL_PRIMARY_COLOR=#1F5226
   KWILT_EMAIL_UNSUBSCRIBE_SECRET=$(openssl rand -hex 32)
   ```
2. Create a throwaway Node script that shims `Deno.env.get` and requires
   the template module (Jest tests already do this — see
   `supabase/functions/_shared/__tests__/emailTemplates.test.ts`).
3. Call the builder, write `out.html` / `out.text` to disk, open in a
   browser.

### Run the template test suite

```
npx jest supabase/functions/_shared/
```

67 tests across emailTemplates, emailUnsubscribe, periodLabels.

### Invoke an edge function locally

```
supabase functions serve email-drip --env-file .env.local
curl -X POST http://127.0.0.1:54321/functions/v1/email-drip \
  -H "content-type: application/json" \
  -d '{"userId":"<uuid>"}'
```

## 6. How to update a template end-to-end

**In-repo templates (Welcome Day 3/7, Win-back, Chapter digest, Trial, Pro, Invite, Admin):**

1. Edit `supabase/functions/_shared/emailTemplates.ts`.
2. Run the test suite — CI guard enforces no `kwilt://` literals, no
   `www.kwilt.app` marketing URLs, and single-surface layout shape.
3. Send a QA email from a throwaway script to `andy@kwilt.app` (see
   `email-system-ga-plan.md` Phase 4 + 5 notes for exact invocation
   pattern).
4. Verify on iOS Mail, Gmail Web, Gmail iOS, Outlook 365 Web.
5. Deploy: `supabase functions deploy <function>` for each function that
   imports the shared template (email-drip, chapters-generate, pro-codes,
   invite-email-send, secrets-expiry-monitor).

**Hosted templates (Welcome Day 0, Day 1):**

1. Log into the Resend dashboard.
2. Open the "Kwilt Welcome Drip" automation.
3. Edit the HTML directly. Preview renderings in Resend first.
4. Publish.
5. Fire a test signup (`POST /email-drip { action: "signup", email:
   "andy+test@kwilt.app" }`) to end-to-end verify.

> **Important:** The hosted templates currently do NOT carry
> `List-Unsubscribe` headers — they're managed outside our helper. Before
> declaring GA, either (a) migrate them in-repo, or (b) configure their
> headers in Resend's template editor.

## 7. Troubleshooting tree

### Logo not showing

1. Check the env var `KWILT_EMAIL_LOGO_URL` is set in Supabase secrets.
2. `curl` the asset URL — must return 200 with `content-type: image/png`.
3. Check `kwilt-site/middleware.ts` — `/assets/*` must be excluded from
   the matcher (it is, but this is the gotcha that bit Phase 4).
4. Outlook desktop ignores CSS-only sizing. The fix is the explicit
   `width="24" height="24"` HTML attrs in `renderLayout.logoBlock`. If
   you see the logo at full resolution in Outlook, someone removed them.

### CTA doesn't deep-link on iOS

1. Verify the `https://kwilt.app/.well-known/apple-app-site-association`
   JSON lists `/open/*` under `applinks.details.components`.
2. Verify `associatedDomains` in `Info.plist` includes
   `applinks:kwilt.app` and `applinks:go.kwilt.app`.
3. Toggle airplane mode + test again (iOS sometimes caches a failed
   universal-link lookup for a while).
4. Fall back to the paste-link paragraph in the email — if THAT opens
   the app, the universal link association is broken. If even that
   doesn't open the app, the `kwilt://` scheme registration is broken.

### High bounce rate

1. Check Resend dashboard → Bounces tab for per-reason breakdown.
2. Hard bounces > 2% → sender reputation problem. Pause non-essential
   sends with `KWILT_EMAIL_SENDING_ENABLED=0` until rectified.
3. Soft bounces (temporary) are usually transient — Resend handles
   retries.

### Gmail marks as spam

1. Verify SPF, DKIM, DMARC alignment (see §8).
2. Check `List-Unsubscribe` + `List-Unsubscribe-Post` headers are
   present (Gmail's "Show original" → scan headers).
3. Content triggers: excessive capitalization, link-heavy body,
   multiple CTAs per email. Our templates follow single-CTA convention.

### Unsubscribe endpoint errors

1. Verify `KWILT_EMAIL_UNSUBSCRIBE_SECRET` is set and ≥ 32 chars in
   Supabase secrets.
2. Check logs on the `unsubscribe` function for `decodeUnsubscribeToken`
   returning null — usually a token signed under an old secret after a
   rotation.
3. If rotating the secret, plan for a grace window: ALL signed tokens
   already in users' inboxes become invalid on rotation.

### Per-user daily cap tripped

1. If a user reports "I didn't get my chapter digest" but the cadence
   row isn't present, check logs for `daily_cap_reached` — we cap at
   **2 sends / 24h / user**. Transactional mail bypasses this, but
   drip + win-back + chapter + trial all count.
2. To lift for a specific user, manually delete rows from
   `kwilt_email_cadence` for that user in the last 24h — the next cron
   will re-evaluate.

## 8. Deliverability (Phase 7.4)

> This section is operational, not code. Track progress in the GA plan
> Phase 7.4 acceptance criteria.

### Current state (April 2026)

Verified via `dig @1.1.1.1` on 2026-04-16:

| Record | Host | Status | Value / notes |
|---|---|---|---|
| SPF (Resend bounce) | `send.mail.kwilt.app` TXT | ✅ | `v=spf1 include:amazonses.com ~all` |
| Return-path MX | `send.mail.kwilt.app` MX | ✅ | `10 feedback-smtp.us-east-1.amazonses.com` |
| Return-path MX dupe | `send.kwilt.app` MX | ✅ | identical; harmless dupe from apex verification |
| SPF (apex-adjacent dupe) | `send.kwilt.app` TXT | ✅ | `v=spf1 include:amazonses.com ~all`; harmless dupe |
| DKIM (Resend) | `resend._domainkey.mail.kwilt.app` TXT | ✅ | 1024-bit public key present |
| DKIM (apex, harmless dupe) | `resend._domainkey.kwilt.app` TXT | ✅ | identical key; left in place |
| **DMARC (Week 0, `p=none`)** | `_dmarc.kwilt.app` TXT | ✅ | `v=DMARC1; p=none; pct=100; rua=mailto:re+llcu2innlqe@dmarc.postmarkapp.com; sp=none; aspf=r; adkim=r;` (TTL 14400). Added 2026-04-16; ramp per plan below. |
| DNS provider | — | — | **Squarespace Domains** (registrar & DNS editor). Nameservers delegated to `ns-cloud-a{1-4}.googledomains.com` (shared Google legacy infra). Edit records at https://account.squarespace.com/domains/managed/kwilt.app/dns-settings → **Custom Records**. Do NOT try to manage DNS in GCP Cloud DNS — the zone is not in any GCP project. |

Alignment under the `kwilt.app` org domain should pass under relaxed mode
(the default): From-domain `mail.kwilt.app`, bounce domain
`send.mail.kwilt.app`, DKIM `d=` on `mail.kwilt.app` — all share the
`kwilt.app` eTLD+1. Straight to `p=none` should not break anything.

### Reporting endpoint

We use **Postmark DMARC Digests** (https://dmarc.postmarkapp.com/) — free
weekly human-readable email of DMARC aggregate reports. The account was
created under `andy@kwilt.app` and exposes a unique aggregate-report
mailbox:

```
rua mailto:    re+llcu2innlqe@dmarc.postmarkapp.com
digest inbox:  andy@kwilt.app
API token:     636b4375-ae08-4004-8c4e-ef860a9e4fa5   (Postmark Developer API, read-only)
```

None of these are secret (the `rua=` address is already in public DNS)
but keep the API token out of repos / commits. If rotation is ever
needed, log in at https://dmarc.postmarkapp.com/ with
`andy@kwilt.app`.

Postmark Digests processes only aggregate reports (`rua=`); forensic
reports (`ruf=`) are not supported, so we intentionally omit that tag.

### Rollout plan (4-week ramp)

All changes are a single TXT record at `_dmarc.kwilt.app` edited in
**Squarespace Domains → kwilt.app → DNS Settings → Custom Records**
(NOT Google Cloud DNS — zone isn't there; see provider note in the state
table above). Squarespace's default TTL is 4h, which is fine for the
ramp — each step will be fully propagated within 4 hours.

**Week 0 — monitor (added 2026-04-16):**

```
v=DMARC1; p=none; pct=100; rua=mailto:re+llcu2innlqe@dmarc.postmarkapp.com; sp=none; aspf=r; adkim=r;
```

Gmail / Yahoo / Outlook / Microsoft will start sending XML aggregates
within 24–72h. Postmark turns those into a weekly digest to
`andy@kwilt.app`.

**Week 2 checkpoint — ramp to 25% quarantine:**

Prerequisites before flipping:

- ≥ 2 weekly digests received.
- ≥ 95% of Kwilt-originated messages are DMARC-aligned (SPF pass AND/OR
  DKIM pass, under relaxed alignment).
- No third-party service (GitHub notifications, Zendesk, etc.) is sending
  `From: @kwilt.app` without being added to SPF or DKIM-signed.

Update to:

```
v=DMARC1; p=quarantine; pct=25; rua=mailto:re+llcu2innlqe@dmarc.postmarkapp.com; sp=quarantine; aspf=r; adkim=r;
```

**Week 3 — full quarantine:**

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:re+llcu2innlqe@dmarc.postmarkapp.com; sp=quarantine; aspf=r; adkim=r;
```

**Week 4+ (optional) — reject:**

```
v=DMARC1; p=reject; pct=100; rua=mailto:re+llcu2innlqe@dmarc.postmarkapp.com; sp=reject; aspf=r; adkim=r;
```

`p=reject` is the strongest stance (spoofed mail is dropped outright at the
receiver). Only flip after a minimum of two clean digests at `p=quarantine;
pct=100`.

### Tag reference (for when you re-read this in 6 months)

- `p=` — policy for the org domain. `none` (monitor), `quarantine` (spam
  folder), `reject` (drop at SMTP).
- `sp=` — policy for subdomains (`mail.kwilt.app`, etc.). Should match `p=`.
- `pct=` — fraction of failing mail to which the policy is applied. Used
  during ramp.
- `rua=` — aggregate report endpoint (weekly XML from ISPs).
- `ruf=` — forensic / failure report endpoint. Intentionally omitted:
  Postmark Digests doesn't process forensic reports and most ISPs don't
  send them. Revisit if we ever stand up our own forensic parser.
- `aspf=r`, `adkim=r` — relaxed alignment (default, but explicit). Strict
  (`s`) would require exact From-domain match.

### Rollback

If quarantining causes a legitimate deliverability issue, revert the TXT
record to the prior week's value in Google Cloud DNS. TTL is 300s so
changes propagate within ~5 minutes.

### Why a subdomain sender

Sending from `mail.kwilt.app` rather than `kwilt.app` means a bad
sending reputation doesn't bleed into the marketing domain's reputation.
Resend documents this pattern; DON'T change the sending domain without
reconfiguring DKIM.

## 9. Warm-up (Phase 7.5)

> First 7 days post-GA. Operational, not code.

- **Days 0–3:** hold to **< 500 sends/day**. Send only Welcome Day 0 + 1
  (automation in Resend) and Chapter Digest to your first-week engaged
  cohort. Pause win-backs in code by `KWILT_EMAIL_SENDING_ENABLED=0`
  OR by flipping `streak_winback` preference to false for all users.
- **Days 4–7:** gradually enable win-back + Welcome Day 3/7 if open
  rates > 25% and bounce < 2%.
- **Day 7+:** full send volume OK. Monitor Resend dashboard daily for
  reputation drift.

## 10. Analytics & attribution (Phase 6)

The email system is instrumented end-to-end. Four events feed a single
PostHog funnel:

| Event | Fires from | Captures |
|---|---|---|
| `email_event` | `resend-webhook` edge function | Resend delivery/open/click/bounce/complaint mirrored from Svix-signed webhook. Properties: `event_type`, `campaign`, `resend_email_id`, `subject`, `clicked_link`, `bounce_type`. |
| `email_cta_clicked` | kwilt-site `/open` handoff page | Click from an email that reached the handoff page (desktop users or iOS users without the app). Properties: `campaign`, `target_path`. |
| `email_deep_link_converted` | App `RootNavigator` | URL opened in-app carrying `utm_source=email` (iOS universal link, Android App Link, or scheme launch from handoff). Properties: `utm_campaign`, `utm_medium`, `target_route`. |
| `recordShowUp` (existing) | App | Activity completion — the terminal event in the funnel. |

### Identity model

Server-side events use the Supabase `user_id` as `distinct_id`. The app
calls `identify(posthog, userId)` on sign-in (`App.tsx::applySignedInState`)
so client events merge onto the same PostHog person profile as the
server events. Without this call the funnel still works but can't
correlate "person X opened email → person X completed activity".

### Correlating Resend events → user_id

Every send site writes `metadata.resend_id` onto the `kwilt_email_cadence`
row. The `resend-webhook` handler does an indexed lookup via the partial
btree on `(metadata->>'resend_id')` (migration
`20260416000000_kwilt_email_cadence_resend_id_index.sql`). If no row is
found — e.g. the send went out via Resend Automation and never landed in
our ledger — we fall back to `distinct_id: resend:<email_id>`. Events
still contribute to aggregate funnel counts; they just don't attach to
a person.

### Deploying the bridge

```
supabase functions deploy resend-webhook --no-verify-jwt

supabase secrets set \
  KWILT_RESEND_WEBHOOK_SECRET=whsec_... \
  KWILT_POSTHOG_PROJECT_API_KEY=phc_... \
  KWILT_POSTHOG_HOST=us.i.posthog.com
```

Then in the Resend dashboard → **Webhooks**: point at
`https://<project>.supabase.co/functions/v1/resend-webhook`, enable all
8 event types (`email.sent`, `.delivered`, `.delivery_delayed`,
`.complained`, `.bounced`, `.opened`, `.clicked`, `.failed`), copy the
signing secret into `KWILT_RESEND_WEBHOOK_SECRET`.

### Dashboard spec

In PostHog, build two funnels:

1. **Delivery funnel (per campaign):**
   `email_event[event_type=email.sent] → [email.delivered] → [email.opened] → [email.clicked] → email_deep_link_converted`
   Slice by `campaign` property. Goal: show Sprint 4 §8 target rates by
   template (welcome Day 0 > 40% open, chapter digest > 30% open).

2. **Full conversion funnel:**
   `email_event[event_type=email.sent] → [email.opened] → email_cta_clicked → email_deep_link_converted → recordShowUp`
   Measures the all-the-way funnel from an email hitting a user's inbox
   to them actually completing an activity in-app.

### Alerts

Configure in PostHog Insights → Alerts (or via Slack integration):

| Metric | Yellow | Red | Why |
|---|---|---|---|
| Open rate (any campaign, rolling 24h) | < 25% | < 15% | Deliverability degrading; check bounce/complaint rates first |
| Click rate (rolling 24h) | < 3% | < 1% | Template regression (UX refinement phase target is > 5%) |
| Bounce rate | > 2% | > 5% | List hygiene problem; Gmail suspicion threshold is ~5% |
| Complaint rate | > 0.1% | > 0.3% | Gmail's hard line is 0.3%; reputation damage starts here |

### Debugging

| Symptom | Check |
|---|---|
| `email_event` count is 0 in PostHog | (1) `KWILT_POSTHOG_PROJECT_API_KEY` set in Supabase secrets, (2) Resend webhook endpoint configured + events subscribed, (3) `supabase functions logs resend-webhook` shows incoming POSTs. |
| 401 responses in Supabase logs | Signature mismatch: `KWILT_RESEND_WEBHOOK_SECRET` doesn't match what Resend signs with. Copy again from Resend dashboard. |
| Events show up but `distinct_id` is `resend:re_...` | No matching cadence row. Either (a) send went out via Resend Automation (Day 0/1 welcomes — expected), or (b) send site isn't recording `metadata.resend_id` — check that it uses `sendEmailViaResend` and writes the returned `resendId` into the cadence metadata. |
| App events not on same person as email events | `identify(posthog, userId)` not firing on client. Check `App.tsx::applySignedInState` imports `identifyPosthog` from `./src/services/analytics/analytics`. |

## 11. Kill switch + rollback

### Global halt

```
# Supabase CLI:
supabase secrets set KWILT_EMAIL_SENDING_ENABLED=0

# Or in the dashboard: Project Settings → Edge Functions → Secrets.
```

The next `email-drip` cron run returns `{ ok: true, skipped: true,
reason: 'kill_switch' }` and does not touch Resend. `chapters-generate`,
`pro-codes`, and `invite-email-send` all return 503 for email paths.

### Per-category halt

Flip the preference for every user via SQL (emergency only — users
won't get their manual resubscribe requests back):

```sql
UPDATE public.kwilt_email_preferences
SET marketing = false, updated_at = now()
WHERE marketing = true;
```

This is a nuclear option — prefer the global kill switch for reversible
operations.

### Rollback a template change

All templates live in `emailTemplates.ts`. `git revert` the offending
commit, re-deploy the functions that import it:

```
supabase functions deploy email-drip chapters-generate pro-codes \
  invite-email-send secrets-expiry-monitor
```

## 12. Compliance quick-reference

- **CAN-SPAM (US):** require (1) clear identification, (2) physical
  postal address, (3) clear unsubscribe. Postal address is emitted in
  every non-transactional template's footer when
  `KWILT_COMPANY_POSTAL_ADDRESS` is set (`|`-separated for multi-line).
  The current value is a placeholder (`Kwilt Inc.|San Francisco, CA`);
  replace with a registered street / PO Box / CMRA address before GA.
- **GDPR (EU):** consent-based opt-in for marketing. Kwilt's welcome
  drip is arguably transactional (account-created confirmation); trial
  expiry is a billing notification. Chapter digest requires explicit
  opt-in via `email_enabled` on the chapter template.
- **CASL (Canada):** similar to CAN-SPAM + GDPR — require express or
  implied consent. Same model as GDPR for us.
- **Gmail + Yahoo Feb 2024 rules:** `List-Unsubscribe` + `List-
  Unsubscribe-Post: List-Unsubscribe=One-Click` headers required for
  bulk senders. Our helper emits both (Phase 7.1).

## 13. Known gaps / follow-ups

- **Replace the `KWILT_COMPANY_POSTAL_ADDRESS` placeholder** with a real
  registered street / PO Box / CMRA address before sending commercial
  email at scale. The code path is live; only the value is temporary.
- **In-app email preferences UI.** The `SettingsNotifications` screen
  in the app handles push notifications only. Users currently must
  unsubscribe via the footer link or Gmail's native button — both are
  fine for GA but a dedicated in-app section is a polish item.
- **Hosted Welcome Day 0 + Day 1** don't currently carry our
  `List-Unsubscribe` headers. Migrate them in-repo OR set the headers
  in Resend's template editor before large-scale GA marketing. Their
  events still flow to PostHog (via Resend's built-in webhook
  integration), but the `distinct_id` will be `resend:<email_id>` for
  those sends until we route them through `sendEmailViaResend`.
- **DMARC rollout is in progress.** Week 0 (`p=none` monitoring) TXT
  value is drafted in §8; pending DNS write at `_dmarc.kwilt.app` and the
  4-week ramp to `p=quarantine; pct=100`. Reports via Postmark DMARC
  Digests.
- **PostHog dashboard + alerts** (Phase 6.4) are still manual console
  work — the events flow but the funnel / alerts are not yet wired.
  Spec in §10.
