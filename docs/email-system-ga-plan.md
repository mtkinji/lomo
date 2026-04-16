## Email System & Deep-Link GA Plan

**Goal:** Take the triggered email system (welcome drip, chapter digest, streak win-back, trial expiry, etc.) from "shipped but fragile" to "general availability ready." Every CTA works on every surface; brand rendering is reliable; attribution is measurable.

**Strategy source:** This plan executes against gaps identified while reviewing `docs/growth-loops-execution-plan.md` Sprint 4 — specifically:

1. Email CTAs mix `kwilt://` custom-scheme links (dead ends on desktop, broken for chapters even on mobile) and `https://www.kwilt.app` (not in `associatedDomains`, so never deep-links into the installed app).
2. Brand logo is not rendering reliably in email clients.
3. The site's AASA file already claims `/open*` paths but no `/open/*` route is implemented.
4. No measurement loop exists for email → install → show-up conversion, blocking the Sprint 4 §8 success-metric targets.

**Estimated duration:** ~4 days focused work (was 3–4 before the UX refinement phase was added).

**Scope invariant:** No changes to in-app shell/canvas UX. All changes are routing-layer additions (new deep-link paths), email template content swaps, new `/open` handoff route on `kwilt-site`, and asset/env-var hygiene.

---

## Phase 1 — Universal-link handoff on `kwilt-site`

**Theme:** Ship the `/open/[...slug]` route so every email CTA can point at `https://go.kwilt.app/open/<route>` — which universal-link-handoffs into the app on iOS/Android when installed, and falls back to a helpful install page on desktop or when the app isn't installed.
**Estimated duration:** ~1 day
**Status:** Implemented (pending deploy + real-device QA)

Implementation landed in the `kwilt-site` repo:

- `lib/openRoutes.ts` — allow-list, resolver, scheme URL + `/download` fallback builders, UTM forwarder.
- `components/OpenHandoffClient.tsx` — client-side platform detection, scheme launch, analytics events.
- `app/(auth)/open/[[...slug]]/page.tsx` — server page with `<noscript>` + (mobile-only) meta-refresh fallbacks.
- `middleware.ts` — `/open` + `/open/*` added to `isAllowedGoPath` so `go.kwilt.app` no longer hijacks CTAs to `/download`.
- `lib/siteLock.ts` — `/open` + `/open/*` added to unlocked paths so email CTAs keep working under marketing site-lock.
- `lib/analytics.ts` — new events: `email_cta_clicked`, `email_cta_open_attempted`, `email_cta_install_clicked` (6.1 already partially covered).
- `lib/openRoutes.test.ts` — `node --test` suite (17 cases) covering allow-list accepts/rejects, UTM filtering, scheme/download URL shape. Run via `npm test`.
- `package.json` — added `tsx` dev-dep + `test` script.

AASA (`/open*` claim) and `assetlinks.json` already shape-correct — no code change needed for 1.3/1.4. Env vars remain a deploy-time concern (`KWILT_IOS_TEAM_ID`, `KWILT_ANDROID_PACKAGE_NAME`, `KWILT_ANDROID_SHA256_CERT_FINGERPRINT`).

### Before users benefit from Phase 1

Code is merged and green; these three steps are all that stand between "shipped" and "users see it":

1. **Deploy `kwilt-site` to Vercel production** (normal push to the default branch; no special release process).
2. **Confirm Vercel production env vars are set** (from `kwilt-site/LAUNCH_CHECKLIST.md` §1):
   - `KWILT_IOS_TEAM_ID` (or `KWILT_IOS_APP_ID`) — makes AASA valid so iOS recognizes `/open*` as a universal link.
   - `KWILT_ANDROID_PACKAGE_NAME` + `KWILT_ANDROID_SHA256_CERT_FINGERPRINT` — makes `assetlinks.json` valid so Android App Links verify.
   - `NEXT_PUBLIC_APPSTORE_URL` and/or `NEXT_PUBLIC_PLAYSTORE_URL` — powers the desktop/no-install fallback buttons.
3. **5-minute real-device smoke test:**
   - iPhone (app installed): tap `https://go.kwilt.app/open/today` from Apple Mail → should land on the Today screen without seeing the web page.
   - iPhone (app not installed): same URL → handoff page renders with App Store button.
   - Laptop: same URL → "best opened on your phone" panel with store links and Continue-on-web.

Until Phase 3 swaps the template CTAs, the only users exercising this path will be anyone manually pasting a `go.kwilt.app/open/...` URL — so it's safe to deploy in isolation without waiting for the rest of the plan.

### Why this first
- Every subsequent phase (template migration, analytics, unsubscribe) depends on a working handoff URL.
- The site's AASA file already claims `/open*` as a universal-link path in `app/.well-known/apple-app-site-association/route.ts`. The machinery is half-built; this phase finishes it.
- Desktop fallback is critical for email GA — many users triage email on a laptop and action it on their phone, or don't have the app installed yet.

### Tasks

**1.1 Build `/open/[[...slug]]/page.tsx` on `kwilt-site`**

Files: `kwilt-site/app/(auth)/open/[[...slug]]/page.tsx` (new)

- Server-side: parse the route spec from the path and query string; validate against an allow-list (never embed untrusted input into the scheme URL).
- Render an HTML page that:
  - Attempts a scheme launch on mount via JS + `<meta http-equiv="refresh">` fallback.
  - Shows a primary "Open in Kwilt" button (the universal link itself, in case JS is blocked).
  - Shows a secondary "Don't have the app? Install now" button → `/download?...` with context forwarded.
  - Includes a `<noscript>` fallback with the scheme URL.
  - On known-desktop user agents, shows "This link is best opened on your phone" with App Store + Play Store + "Continue on web" buttons.
- For iOS with the app installed, the Universal Link handoff fires **before** the page renders — user never sees the HTML.

Allow-list of `/open/<path>` → `kwilt://<path>` mappings:

```typescript
const OPEN_ROUTES = {
  plan: 'plan',
  today: 'today',
  activities: 'activities',
  more: 'more',
  arcs: 'arcs',
  chapters: 'chapters',
  'chapters/:id': 'chapters/:id',
  'activity/:id': 'activity/:id',
  'goal/:id': 'goal/:id',
  'arc/:id': 'arc/:id',
  'settings/subscription': 'settings/subscription',
};
```

**1.2 Update `middleware.ts` to pass `/open/*` through on `go.kwilt.app`**

Files: `kwilt-site/middleware.ts`

Currently `isAllowedGoPath` (lines 22–35) doesn't include `/open/`, so `go.kwilt.app/open/plan` would be redirected to `/download`. Add:

```typescript
pathname.startsWith("/open/") ||
pathname === "/open" ||
```

Without this, middleware will hijack every email CTA.

**1.3 Confirm AASA is correctly configured**

Files: `kwilt-site/app/.well-known/apple-app-site-association/route.ts`

- `/open*` is already in the `paths` array — no code change needed.
- Verify `KWILT_IOS_TEAM_ID` is set in Vercel production env (per `LAUNCH_CHECKLIST.md` §1).
- Verify `https://go.kwilt.app/.well-known/apple-app-site-association` and `https://kwilt.app/.well-known/apple-app-site-association` return valid JSON (per `LAUNCH_CHECKLIST.md` §3).

**1.4 Mirror for Android**

Files: `kwilt-site/app/.well-known/assetlinks.json/route.ts`

- Ensure `KWILT_ANDROID_PACKAGE_NAME` and `KWILT_ANDROID_SHA256_CERT_FINGERPRINT` are set.
- Verify assetlinks response includes the app ID.

**1.5 UTM and attribution forwarding**

Files: `kwilt-site/app/(auth)/open/[[...slug]]/page.tsx`

- Accept `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` query params.
- Forward them into the scheme URL so the app can attribute the open.
- Fire a PostHog `EmailCtaClicked` event from the handoff page (even on iOS universal-link users, the AASA handoff happens *before* JS — so this event only captures non-app-installed opens; app-installed opens are captured in-app via Phase 5).

### Phase 1 acceptance criteria

- [ ] `https://go.kwilt.app/open/plan` on iOS with app installed → opens app at Plan screen via universal link. *(deploy + on-device)*
- [ ] Same URL on iOS without app installed → shows handoff page with scheme launch + App Store CTA. *(deploy + on-device)*
- [ ] Same URL on desktop → shows "open on phone" handoff with App Store + Play Store + marketing link. *(deploy)*
- [ ] `/open/chapters/<id>` works identically (requires Phase 2 chapter deep link). *(deploy + new app build)*
- [x] Middleware no longer redirects `/open/*` to `/download` on `go.kwilt.app`. *(code landed in `kwilt-site/middleware.ts`; verified by `next build`.)*
- [ ] AASA and assetlinks.json both return 200 with correct app IDs. *(routes already shape-correct; deploy-gated on `KWILT_IOS_TEAM_ID` + Android package/fingerprint env vars.)*
- [x] Unit test in `kwilt-site` covers `OPEN_ROUTES` allow-list rejection of unknown paths. *(17-case `node:test` suite in `lib/openRoutes.test.ts`, runnable via `npm test`.)*

---

## Phase 2 — Register missing chapter deep link in the app

**Theme:** Fix the latent bug where `buildChapterDigestEmail` sends `kwilt://chapters/${id}` CTAs that the app never resolves.
**Estimated duration:** ~30 min
**Status:** Implemented (pending next app build / TestFlight)

Implementation landed in the `Kwilt` (app) repo:

- `src/navigation/linkingConfig.ts` (new) — extracted the full `LinkingOptions['config']` from `RootNavigator.tsx` so it's testable in isolation and becomes the single source of truth for every accepted deep link. Added:
  - `MoreChapters` under `MainTabs > MoreTab` with path `chapters`.
  - `MoreChapterDetail` under `MainTabs > MoreTab` with path `chapters/:chapterId`.
  - `Settings > SettingsManageSubscription` with path `settings/subscription` (plus `openPricingDrawer` / `openPricingDrawerNonce` query parsers).
- `src/navigation/RootNavigator.tsx` — imports `LINKING_PREFIXES` and `linkingConfig` instead of inlining them.
- `src/navigation/linkingConfig.test.ts` (new) — 13-case Jest suite using `getStateFromPath`:
  - Phase 2 additions: `chapters`, `chapters/:id` (with id preserved), `settings/subscription` (and `?openPricingDrawer=1` boolean parse).
  - Regression coverage on every pre-existing path (`today`, `plan`, `activities`, `arcs`, `arc/:id`, `goal/:id`, `activity/:id` with `openFocus`/`autoStartFocus`, `more`) to prove the refactor didn't change routing.

Verified `npm run lint` (tsc --noEmit) and the full Jest suite (15 suites, 98 tests) green after the change.

### Before users benefit from Phase 2

1. Ship a new app build (EAS → TestFlight / App Store) containing the updated linking config. The old `kwilt://chapters/:id` links only start working once users are on this build or newer.
2. Once Phase 3 swaps the template CTAs, this deep link is what keeps `/open/chapters/:id` from dead-ending inside the app.

### Why this second
- Without this, Phase 1's handoff for `/open/chapters/<id>` forwards to `kwilt://chapters/<id>`, which the app silently fails to route.
- Chapter digest has been live since Sprint 4 — this has been broken in production since that ship.

### Tasks

**2.1 Add chapter paths to `linking.config`**

Files: `src/navigation/RootNavigator.tsx`

In the `MoreTab.screens` block (around lines 486–492), add:

```typescript
MoreTab: {
  screens: {
    MoreHome: { path: 'more' },
    MoreChapters: { path: 'chapters' },
    MoreChapterDetail: { path: 'chapters/:chapterId' },
  },
},
```

**2.2 Also register `settings/subscription`**

Files: `src/navigation/RootNavigator.tsx`

The trial expiry and Pro grant emails should deep-link to the Manage Subscription screen. Confirm whether `kwilt://settings/subscription` already resolves — if not, add the path under the Settings stack.

**2.3 Regression test**

Files: `src/navigation/RootNavigator.test.ts` or similar (new or existing)

- Test that `Linking.parse('kwilt://chapters/abc123')` resolves to `MoreChapterDetail` with `chapterId: 'abc123'`.

### Phase 2 acceptance criteria

- [x] `kwilt://chapters/<id>` opens `MoreChapterDetail` with correct params. *(proven by `getStateFromPath` test in `src/navigation/linkingConfig.test.ts` — the same resolver React Navigation uses at runtime.)*
- [x] `kwilt://chapters` opens `MoreChapters`. *(same test file.)*
- [x] `kwilt://settings/subscription` opens `ManageSubscription`. *(resolves to `SettingsManageSubscription` route inside the Settings stack; same test file.)*
- [x] Unit test verifies linking config resolution for new paths. *(13-case Jest suite; runs under `npm test`, all green alongside the rest of the app suite — 98/98.)*

Remaining before users benefit (not acceptance criteria, but honesty): new app build / TestFlight release so real devices carry the updated linking config.

---

## Phase 3 — Email template migration

**Theme:** Swap every email CTA from broken `kwilt://` or mis-hosted `www.kwilt.app` URLs to the universal-link `https://go.kwilt.app/open/...` pattern. Add fallback "paste this link" paragraphs.
**Estimated duration:** ~2 hours
**Status:** Implemented (pending Resend Automation update + Supabase Edge Function deploy)

Implementation landed in the `Kwilt` (app) repo:

- `supabase/functions/_shared/emailTemplates.ts` —
  - `getOpenBaseUrl()` reads `KWILT_EMAIL_OPEN_BASE_URL` (defaults to `https://go.kwilt.app/open`).
  - `makeOpenUrl(path, params, campaign)` builds a UTM-tagged universal link (`utm_source=email`, `utm_medium=email`, `utm_campaign=<campaign>`).
  - `renderFallbackLink(href)` produces the standard "if the button doesn't work, copy this link" paragraph for every CTA.
  - `getBrandConfig()` no longer exposes `ctaUrl`; the deprecated `KWILT_EMAIL_CTA_URL` env var is unused.
  - All 7 user-facing in-repo templates (Pro grant, Welcome 0/1/3/7, Streak win-back 1/2, Trial expiry, Chapter digest) now route their CTA through `makeOpenUrl` per the table below — no template hand-writes a `kwilt://` or `www.kwilt.app` URL.
  - **Side fix while we were here:** the original templates contained ASCII apostrophes inside single-quoted JS strings (e.g. `'You're receiving this'`), which is invalid JS — these were converted to double-quoted strings so the file actually parses (this is also why importing it under Jest finally works).
- `supabase/functions/chapters-generate/index.ts` — caller updated to pass `outputJson` + `cadence` + `periodStartIso` + `periodEndIso` + `timezone` into `buildChapterDigestEmail` so the template can extract narrative + humanize the period itself.
- `supabase/functions/_shared/__tests__/emailTemplates.test.ts` — new Jest suite (18 cases) shimmed against `Deno.env`, asserting:
  - Each template emits `https://go.kwilt.app/open/<path>?utm_source=email&utm_medium=email&utm_campaign=<expected>`.
  - Each CTA is followed by the paste-link fallback paragraph.
  - `KWILT_EMAIL_OPEN_BASE_URL` env override works.
  - **CI guard** — the source file contains no `kwilt://` literal, no `www.kwilt.app` literal, and no hard-coded `https?://` URL outside `getOpenBaseUrl`'s default. This is the long-lived regression fence for Phase 3.

Test status: full Jest suite is **128/128 green** (was 98/98; +30 new tests across Phase 3 + 3.5).

### Before users benefit from Phase 3

1. Deploy the `chapters-generate` and `email-drip` Supabase edge functions (and any other function that imports `_shared/emailTemplates.ts`) so the new universal-link CTAs ship to recipients.
2. Set `KWILT_EMAIL_OPEN_BASE_URL=https://go.kwilt.app/open` in Supabase Edge Function secrets (defaults to that, but explicit is better than implicit).
3. **Manual:** mirror the same `go.kwilt.app/open/today?utm_campaign=welcome_day_{N}` pattern in the Resend Automation Day 0 / Day 1 / Day 1 Re-engage templates (not in this repo). Listed as task 3.4 below.
4. Phase 1 (kwilt-site `/open` route) must be deployed first — otherwise the new CTAs land on a 404.

### Why this third
- Depends on Phase 1 (`/open` route exists) and Phase 2 (chapter deep link registered).
- This is the user-facing fix — until templates are updated, the infrastructure sits unused.

### Tasks

**3.1 Add `makeOpenUrl` helper**

Files: `supabase/functions/_shared/emailTemplates.ts`

```typescript
function getOpenBaseUrl() {
  return (Deno.env.get('KWILT_EMAIL_OPEN_BASE_URL') ?? 'https://go.kwilt.app/open').trim();
}

function makeOpenUrl(
  path: string,
  params: Record<string, string> = {},
  campaign?: string,
): string {
  const base = getOpenBaseUrl().replace(/\/+$/, '');
  const url = new URL(`${base}/${path.replace(/^\/+/, '')}`);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'email');
  if (campaign) url.searchParams.set('utm_campaign', campaign);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}
```

**3.2 Swap all CTAs**

Files: `supabase/functions/_shared/emailTemplates.ts`

| Template | Old CTA | New CTA |
|---|---|---|
| `buildWelcomeDay0Email` | `https://www.kwilt.app` | `makeOpenUrl('today', {}, 'welcome_day_0')` |
| `buildWelcomeDay1Email` | `https://www.kwilt.app` | `makeOpenUrl('today', {}, 'welcome_day_1')` |
| `buildWelcomeDay3Email` | `kwilt://plan` | `makeOpenUrl('plan', {}, 'welcome_day_3')` |
| `buildWelcomeDay7Email` | `https://www.kwilt.app` | `makeOpenUrl('today', {}, 'welcome_day_7')` |
| `buildChapterDigestEmail` | `kwilt://chapters/${id}` | `makeOpenUrl('chapters/' + id, {}, 'chapter_digest')` |
| `buildStreakWinback1Email` | `https://www.kwilt.app` | `makeOpenUrl('today', {}, 'winback_1')` |
| `buildStreakWinback2Email` | `https://www.kwilt.app` | `makeOpenUrl('today', {}, 'winback_2')` |
| `buildTrialExpiryEmail` | `https://www.kwilt.app` | `makeOpenUrl('settings/subscription', {}, 'trial_expiry')` |
| `buildProGrantEmail` | `https://www.kwilt.app` | `makeOpenUrl('settings/subscription', {}, 'pro_granted')` |
| `buildGoalInviteEmail` | caller-supplied invite link | Keep as-is (already universal-link via `go.kwilt.app/i/<code>`) |
| `buildProCodeEmail` | no link (span styled as button) | Keep as-is (code requires in-app entry) |

**3.3 Add universal "paste this link" fallback block**

Files: `supabase/functions/_shared/emailTemplates.ts`

Every template should include the fallback pattern already present in `buildGoalInviteEmail` (lines 184–187):

```html
<p style="margin:16px 0 0;font-size:13px;line-height:18px;color:#6b7280;">
  If the button doesn't work, copy this link into your browser:<br/>
  <a href="${escapedCta}" style="color:${primaryColor};">${escapedCta}</a>
</p>
```

Consider extracting into a `renderFallbackLink(cta)` helper in `renderLayout` to avoid drift.

**3.4 Update Resend Automation templates (Day 0 + Day 1 + Day 1 Re-engage)**

Files: Resend dashboard (manual).

The Day 0 and Day 1 welcome emails live in Resend's Automation UI, not in this repo (per Sprint 4 hybrid decision). Update them to use the same `go.kwilt.app/open/today?utm_campaign=welcome_day_{N}` pattern.

**3.5 Add CI guard against regression**

Files: `package.json` or a new `scripts/check-email-templates.ts`

Add a test or CI check that fails if `supabase/functions/_shared/emailTemplates.ts` contains any of:
- `kwilt://` (unless explicitly allowlisted, e.g., a `fromScheme` helper)
- `www.kwilt.app`
- A literal URL that isn't routed through `makeOpenUrl`

This prevents the problem from reappearing.

### Phase 3 acceptance criteria

- [x] All 9 repo templates use `makeOpenUrl` (or are explicitly justified exceptions). *(Pro grant, Welcome 0/1/3/7, Win-back 1/2, Trial expiry, Chapter digest go through `makeOpenUrl`. Goal invite keeps caller-supplied `go.kwilt.app/i/<code>` link; Pro code keeps no link by design; Secret-expiry alert is admin-only and uses caller-supplied rotation URLs. Verified in `__tests__/emailTemplates.test.ts`.)*
- [x] Every template HTML includes a "paste this link" fallback paragraph under the button. *(Via `renderFallbackLink(href)` helper; asserted per template in tests.)*
- [ ] Resend Automation Day 0 / Day 1 / Day 1 Re-engage templates updated. *(Manual — see "Before users benefit from Phase 3" above.)*
- [x] CI check rejects `kwilt://` and `www.kwilt.app` strings in emailTemplates.ts. *(`__tests__/emailTemplates.test.ts` "CI guard" describe block — also forbids any non-`go.kwilt.app/open` literal `https://` URL.)*
- [ ] Preview render of each template manually confirmed (either via Resend preview or a `scripts/render-email-preview.ts`). *(Deferred to Phase 5/8 visual QA pass.)*

---

## Phase 3.5 — Chapter digest content fidelity

**Theme:** The Chapter Digest is the marquee re-engagement email, but the template has two content bugs today that make it embarrassing to send at scale. Fix the bugs inline with the Phase 3 CTA migration so we only touch `emailTemplates.ts` once.
**Estimated duration:** ~1 hour
**Status:** Implemented (pending Supabase Edge Function deploy)

Implementation landed alongside Phase 3:

- `supabase/functions/_shared/emailTemplates.ts` — `buildChapterDigestEmail` signature changed:
  - **Old:** `{ chapterTitle, periodLabel, narrative, chapterId }`.
  - **New:** `{ chapterTitle, outputJson, chapterId, cadence, periodStartIso, periodEndIso, timezone }`.
  - Narrative snippet is now extracted from `outputJson.sections[?(key === 'story')].body` via the new `extractChapterSnippet(outputJson, maxChars = 280)` helper, which truncates at the first paragraph break when one fits and otherwise at a word boundary with an ellipsis. Falls back to `outputJson.narrative` if present (legacy-tolerant).
  - Period label is now produced by `formatHumanPeriodLabel(...)` (see below); subject becomes `"Your chapter for the week of Apr 13 is ready"` rather than `"Your 2026-W15 chapter is ready"`. Preheader becomes `"A short read about the week of Apr 13."` so it no longer duplicates the subject.
- `supabase/functions/_shared/periodLabels.ts` (new) — `formatHumanPeriodLabel({ cadence, startIso, endIso, timezone })` produces:
  - `weekly` → `"the week of Apr 13"`.
  - `monthly` → `"April 2026"`.
  - `yearly` → `"2026"`.
  - `custom` / `manual` → `"Apr 13–20, 2026"` (or `"Mar 30 – Apr 5, 2026"` across months).
  - Defensive fallbacks for invalid timezones / unparseable timestamps so a machine key like `2026-W15` can never leak.
- `supabase/functions/chapters-generate/index.ts` — caller stops constructing `narrative` itself and stops passing `period.key` as the label; instead forwards `outputJson` + `t.cadence` + `period.start.toISO()` + `period.end.toISO()` + `t.timezone` into the template.
- Tests:
  - `supabase/functions/_shared/__tests__/periodLabels.test.ts` — 9 cases covering every cadence + tz fallback + invalid-ISO fallback + a regression guard that the label never matches `\d{4}-W\d{2}`.
  - `supabase/functions/_shared/__tests__/emailTemplates.test.ts` — fixture-backed digest tests asserting the snippet comes from `sections.story.body`, never from `outputJson.narrative` when both are present, that the second paragraph never appears, and that no machine key (`\d{4}-W\d{2}` or `YYYY-MM-DDT...`) leaks into subject/HTML/text.

### Tasks

**3.5.1 Fix the snippet field mismatch**

Files: `supabase/functions/_shared/emailTemplates.ts` (`buildChapterDigestEmail`).

- `buildChapterDigestEmail` reads `outputJson.narrative`; the generator writes `outputJson.sections.story.body`. Snippets are near-certainly empty in production today.
- Read from the canonical field, truncate at the first paragraph boundary (~280 chars), and add a fixture-backed test so this cannot silently regress.

**3.5.2 Humanize the period label**

Files: `supabase/functions/_shared/emailTemplates.ts`, optionally `supabase/functions/_shared/periodLabels.ts` (new).

- Stop passing `period.key` (e.g. `2026-W15`) as the display label. Produce human copy by cadence: weekly → `"the week of Apr 13"`, monthly → `"April 2026"`, yearly → `"2026"`, custom → `"Apr 13 – Apr 20"`.
- Update subject + preheader to the pattern documented in Phase 5 (preheader adds, never duplicates, the subject).

### Phase 3.5 acceptance criteria

- [x] Rendered digest preview from a real `output_json` fixture shows a non-empty narrative snippet. *(Fixture test in `__tests__/emailTemplates.test.ts` `buildChapterDigestEmail` describe block; asserts the lede paragraph appears in HTML + text and that the second paragraph doesn't.)*
- [x] No rendered digest subject/preheader contains a raw period key (`\d{4}-W\d{2}` etc.) — enforced by a fixture test or CI check. *(Test "humanizes the period label" + the standalone regression test in `periodLabels.test.ts` both assert `not.toMatch(/\d{4}-W\d{2}/)`.)*
- [ ] Does not introduce visual regressions to Phase 5 typography/layout changes. *(Phase 5 has not started yet — the new digest matches existing visual patterns.)*

### Related

Chapters work beyond these two fixes (analytics, unread state, default template flip, settings surface) lives in a sibling plan: **`docs/chapters-ga-hardening-plan.md`**. Phase 3.5 is scoped deliberately narrowly to the digest content so the email GA plan doesn't balloon into a feature-polish plan.

---

## Phase 4 — Brand logo rendering

**Theme:** Make the Kwilt logo render reliably across the top 6 email clients.
**Estimated duration:** ~1 hour
**Status:** Not started

### Tasks

**4.1 Produce email-safe logo assets**

Files: `kwilt-site/public/assets/email/logo@2x.png` (new)

- Dimensions: 480 × 96 px (displays at 240 × 48 logical via `height="24"` / `height="48"`).
- Format: PNG with transparent background.
- File size: < 30 KB (Gmail clips emails > 102 KB total).
- **Not SVG** — many email clients strip `<svg>` in body.
- If a design-ready 2x export isn't available, copy `public/assets/brand/logo.png` as a first pass and improve later.

**4.2 Update `renderLayout` to use explicit width/height attrs**

Files: `supabase/functions/_shared/emailTemplates.ts`

At lines 47–48, change:

```html
<img src="..." alt="..." height="24" style="...">
```

to include explicit `width` and hard pixel dimensions (Outlook desktop ignores CSS):

```html
<img src="${logoUrl}" alt="${appName}" width="120" height="24"
     style="display:inline-block;height:24px;width:120px;vertical-align:middle;border:0;outline:none;text-decoration:none;margin-right:10px;" />
```

**4.3 Set Supabase Edge Function env vars**

```
KWILT_EMAIL_LOGO_URL=https://kwilt.app/assets/email/logo@2x.png
KWILT_EMAIL_OPEN_BASE_URL=https://go.kwilt.app/open
KWILT_EMAIL_CTA_URL=https://go.kwilt.app/open/today    # back-compat; no longer used after Phase 3
```

**4.4 Cross-client QA**

Send a test Welcome Day 0 email to test inboxes and confirm logo + CTA button + fallback link + fonts work in:
- Gmail Web (Chrome, macOS)
- Gmail iOS app
- Apple Mail iOS
- Apple Mail macOS
- Outlook 365 Web
- Outlook Desktop (Windows)

Document any client-specific issues in `docs/email-system.md` (new, in Phase 6).

### Phase 4 acceptance criteria

- [ ] `https://kwilt.app/assets/email/logo@2x.png` returns a 200 with `Content-Type: image/png`.
- [ ] `KWILT_EMAIL_LOGO_URL` env var set in Supabase Edge Function secrets.
- [ ] Logo renders at correct size in all 6 target email clients.
- [ ] `renderLayout` uses explicit `width` and `height` HTML attrs (not just CSS).
- [ ] File size under 30 KB.

---

## Phase 5 — Email UX refinement

**Theme:** Strip visual chrome. Make every email feel like a personal letter from a coach, not a marketing blast. Eliminate nested boxes and default to typography-first layout.
**Estimated duration:** ~0.5–1 day
**Status:** Not started

### Why this after template migration
- Phase 3 changes *content* (CTAs, fallback links). This phase changes *form* (visual design). Sequencing it here avoids re-testing the same templates twice.
- The existing layout in `supabase/functions/_shared/emailTemplates.ts` nests content inside a `bg:#f3f4f6` canvas → `bg:#ffffff` card → frequently another `bg:#f9fafb` inner box. Three surfaces where one would do.
- Kwilt's voice is compassionate, identity-anchored, letter-like. The visual design should match — closer to a Notion / Substack / personal note than a webpage with a card.

### Design direction

Keep the brand palette (primary `#1F5226` pine) but reduce total visual weight to two things: **type** and **one CTA**. Everything else earns its place or gets removed.

**Reference principles:**

1. **One surface.** Pure white (or `#FAFAF9`) canvas — no outer gray + inner white card. Whitespace replaces the border.
2. **Narrower content column.** 480–520px (vs current 560px) — more letter-like, less webpage-like.
3. **Type hierarchy over containers.** Data like expiration dates, streak counts, period labels should be inline type (e.g., `<strong>` or a small uppercase label) rather than framed boxes.
4. **Consistent rhythm.** Every template follows the same pattern: preheader → logo → H1 → 1–3 short paragraphs → one CTA → fallback link → footer. No decorative dividers, no visual flourishes between sections.
5. **Boxes only when they earn it.** A `border`+`background` is reserved for content that's genuinely "different" from prose and benefits from a boundary:
   - **Keep:** Pro code (copy affordance via monospace block), secret-expiry data table (admin email with tabular info).
   - **Remove:** expiration date "card" in Pro grant, stats "card" in Welcome Day 7, narrative snippet box in chapter digest, period-label pill — all become inline type.
6. **Dark-mode neutral.** Use `color-scheme: light dark` + semantic color choices (e.g., `#1f2937` body text) that survive Apple Mail auto-invert cleanly.

### Tasks

**5.1 Refactor `renderLayout` for single-surface**

Files: `supabase/functions/_shared/emailTemplates.ts`

- Remove the outer `#f3f4f6` canvas + inner white card nesting (current lines 62–85).
- New structure: `<body bg:#ffffff>` → centered 480–520px column → logo / H1 / body / CTA / fallback / footer, all on the same surface, separated only by margin.
- Use `padding:32px 24px` on the column, uniform.
- Drop the `border-top:1px solid #f3f4f6` footer divider (lines 74–79); replace with extra whitespace above the footer.
- Add `<meta name="color-scheme" content="light dark">` and `<meta name="supported-color-schemes" content="light dark">` to the `<head>` for dark-mode hinting.

**5.2 Extract shared primitives**

Files: `supabase/functions/_shared/emailTemplates.ts`

Three helpers to stop every template from re-inventing the wheel and drifting from each other:

```typescript
function renderCta(href: string, label: string): string { /* pine button */ }
function renderFallbackLink(href: string): string { /* "if button doesn't work" */ }
function renderFooter(body: string): string { /* 12px muted text */ }
```

After extraction, every template should only define: subject, preheader, title, body prose, and call these helpers. No template should be hand-writing `<a style="display:inline-block;background:...">` anymore.

**5.3 De-box each template's inner content**

Files: `supabase/functions/_shared/emailTemplates.ts`

| Template | Current boxes | After |
|---|---|---|
| `buildProGrantEmail` | "Expires" date card | `<p>Your Pro access expires <strong>{date}</strong>.</p>` inline |
| `buildProCodeEmail` | Code monospace box + "Redeem in-app" card | Keep code box (copy affordance). Remove "Redeem in-app" card → inline prose. |
| `buildWelcomeDay7Email` | Stats card with Streak + Activities | Inline: "You showed up for **{N} days** and completed **{M} activities**." |
| `buildChapterDigestEmail` | Period-label pill + narrative snippet box | Period label as small uppercase muted text; snippet as `<blockquote>` with left border only |
| `buildTrialExpiryEmail` | Feature-list card with bullets | Plain `<ul>` or inline paragraph ("You had Focus Mode, Saved Views, …") |
| `buildSecretExpiryAlertEmail` | Data table | **Keep** — genuinely tabular admin data |
| `buildStreakWinback1Email` / `buildStreakWinback2Email` | None currently | Keep as-is (already simple prose) |
| `buildGoalInviteEmail` | None currently | Keep as-is |
| `buildWelcomeDay0Email` / `buildWelcomeDay1Email` / `buildWelcomeDay3Email` | None currently | Keep as-is but normalize spacing |

**5.4 Normalize content rhythm**

Files: `supabase/functions/_shared/emailTemplates.ts`

Every template body should read:

1. Warm opening sentence (the "letter" greeting — doesn't need "Hi {name}" but should feel personal).
2. 1–2 short paragraphs (≤ 2 sentences each) with the core message.
3. One CTA (via `renderCta`).
4. Fallback link (via `renderFallbackLink`).
5. Short footer with unsubscribe context (via `renderFooter`).

Cut anything that doesn't serve one of those five steps. Particularly: decorative second paragraphs that restate the value prop ("Streaks aren't about perfection…" in Welcome Day 1 — keep *one*, not both).

**5.5 Tighten preheaders**

Files: `supabase/functions/_shared/emailTemplates.ts`

Preheaders (the invisible line shown after the subject in Gmail/Apple Mail previews) are a high-impact open-rate lever. Audit each:

- Currently some preheaders just restate the subject (e.g., "Your Kwilt Pro access has been granted" → preheader "Your Kwilt Pro access has been granted"). Waste.
- Each preheader should add a second, complementary hook — subject = headline, preheader = subhead.

Example shifts:

| Template | Current preheader | Better |
|---|---|---|
| Welcome Day 0 | "Your Arc is waiting — open Kwilt to get started." | "The smallest version of showing up is enough." |
| Welcome Day 3 | "{streakLine}" | "Your first Arc, your first rhythm." |
| Chapter digest | "Your {period} chapter is ready — read it in Kwilt." | "A short read about the last {period}." |
| Trial expiry | "Subscribe to keep your Pro features." | Keep (actionable + direct). |

**5.6 Tighten plain-text versions**

Files: `supabase/functions/_shared/emailTemplates.ts`

The `text` version of each email is what shows in text-only clients and what spam filters read. Audit each:
- Match the HTML rhythm (1 greeting, 1–2 short paragraphs, 1 link).
- Drop redundant bullets and re-stated URLs.
- Include the fallback URL on its own line so text clients render it clickable.

**5.7 Dark-mode QA**

Files: none (manual)

Test each template in Apple Mail with system set to dark mode. Three common pitfalls to watch:
- Logo with transparent background inverts cleanly — good.
- Hard-coded `#111827` text on white — auto-inverts to white-on-black — good.
- Any `background:#f9fafb` box becomes a dark gray that clashes — this is another reason to remove them.

### Phase 5 acceptance criteria

- [ ] `renderLayout` uses a single surface (no gray canvas + white card nesting).
- [ ] Every non-admin template uses `renderCta`, `renderFallbackLink`, `renderFooter` helpers — no template hand-rolls button HTML.
- [ ] Inner content boxes removed per table above; only Pro code monospace block and the secret-expiry data table remain.
- [ ] Content width is 480–520px.
- [ ] Every template has a unique, value-adding preheader (no preheader duplicates the subject).
- [ ] Plain-text version follows the same rhythm as HTML (greeting → prose → CTA URL on its own line → footer).
- [ ] `color-scheme` meta tags added; Apple Mail dark-mode render does not show white-box clashes.
- [ ] Side-by-side before/after screenshots of at least 3 templates attached to this PR (for design review).

---

## Phase 6 — Analytics & attribution loop

**Theme:** Turn the email system from a black box into a measurable loop. Directly addresses the Sprint 4 §8 success-metric targets (email open/click rate, welcome drip open rate, pro-preview → conversion).
**Estimated duration:** ~2 hours
**Status:** Not started

### Tasks

**6.1 Add `EmailCtaClicked` on the handoff page**

Files: `kwilt-site/app/(auth)/open/[[...slug]]/page.tsx`

Fire a PostHog (or other analytics) event on page load with `{ campaign, target_path, referrer }`. This captures email clicks from users without the app installed (iOS-installed users get intercepted by AASA before the page loads — that path is captured in 5.2).

**6.2 Add `EmailDeepLinkConverted` in the app**

Files: `src/navigation/RootNavigator.tsx`, `src/services/analytics/events.ts`

In the existing `handleUrl` / linking setup (around lines 399–407), detect `utm_source=email` in the initial URL and fire an `EmailDeepLinkConverted` event with `{ utm_campaign, target_route }`. This gives us the "email → in-app conversion" half of the funnel.

**6.3 Wire a Resend webhook → PostHog bridge**

Files: `supabase/functions/resend-webhook/index.ts` (new)

Resend fires `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Mirror these to PostHog as `EmailEvent` with `{ template_id, user_id, event_type }`. This closes the measurement loop for:
- **Open rate** (Sprint 4 §8 target: > 40% for Day 0 welcome).
- **Click rate** (new baseline).
- **Bounce / complaint rates** (for deliverability health).

**6.4 Build the PostHog funnel dashboard**

Manual in PostHog — no code. Funnel: `EmailSent → email.opened → email.clicked → EmailCtaClicked → EmailDeepLinkConverted → recordShowUp`. Alert on open-rate < 25% or click-rate < 3%.

### Phase 6 acceptance criteria

- [x] `EmailCtaClicked` event registered in `AnalyticsEvent` enum and fired from `/open` handoff page. *(Landed as part of Phase 1 task 1.5 — registered as `email_cta_clicked` in `kwilt-site/lib/analytics.ts` with snake_case to match the existing site convention, plus `email_cta_open_attempted` and `email_cta_install_clicked` siblings. Fires from `components/OpenHandoffClient.tsx` on mount.)*
- [ ] `EmailDeepLinkConverted` event fires in-app when URL contains `utm_source=email`.
- [ ] `resend-webhook` edge function deployed and receiving events.
- [ ] PostHog funnel dashboard exists and shows non-zero events within 24h of first email send post-deploy.
- [ ] PostHog alerts configured for open-rate and click-rate drift.

---

## Phase 7 — GA prerequisites: unsubscribe, deliverability, docs

**Theme:** Ship the compliance and observability pieces that GA requires but are easy to forget.
**Estimated duration:** ~0.5 day
**Status:** Not started

### Tasks

**7.1 One-click unsubscribe**

Files: `supabase/functions/email-drip/index.ts` (and wherever else emails are sent), `kwilt-site/app/(site)/unsubscribe/page.tsx` (new), `supabase/functions/unsubscribe/index.ts` (new)

- Add `List-Unsubscribe: <mailto:...>, <https://kwilt.app/unsubscribe?token=<hmac>>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers to every send. **Required by Gmail and Yahoo since Feb 2024.**
- The `/unsubscribe?token=<hmac>` route toggles the appropriate `kwilt_email_preferences` row without requiring login (HMAC signed so it's not forgeable).
- Confirmation page: "You've been unsubscribed from <category>. Undo?"

**7.2 Global kill switch**

Files: `supabase/functions/email-drip/index.ts`, `supabase/functions/chapters-generate/index.ts`, `supabase/functions/pro-codes/index.ts`

- Read `KWILT_EMAIL_SENDING_ENABLED` env var; if `0`, skip all sends and log an info message. Enables halting email globally without a deploy.

**7.3 Per-user send cap**

Files: `supabase/functions/email-drip/index.ts`

- Formalize the 2-per-user-per-day cap (currently implicit via cadence). Add an explicit check against `kwilt_email_cadence` before every send.

**7.4 Deliverability hardening**

Manual / DNS:
- Confirm SPF, DKIM, DMARC aligned for sending domain. Resend provides setup docs.
- Move `DMARC` policy from `p=none` to `p=quarantine` after 2 weeks of clean sends.
- Consider a subdomain (`mail.kwilt.app` or `send.kwilt.app`) for sending so reputation doesn't affect the root domain.

**7.5 Warm-up plan**

- First 7 days post-deploy: cap total daily sends at 500 to engaged recipients only (Day 0 welcome + Day 1 welcome only; defer win-backs).
- Expand gradually as open rates stabilize > 25%.

**7.6 Email system runbook**

Files: `docs/email-system.md` (new)

Cover:
- Template inventory: which live in-repo vs in Resend Automation.
- Local dev loop (how to render a template, how to invoke `email-drip` with `--dry-run`).
- How to update a template end-to-end (repo + Resend + staging test + deploy).
- Troubleshooting tree (logo not showing, CTA not deep-linking, bounce rates, client-specific rendering issues).
- Kill-switch and rollback procedure.

**7.7 Update Sprint 4 section of `growth-loops-execution-plan.md`**

Files: `docs/growth-loops-execution-plan.md`

The current Sprint 4 section documents the `kwilt://` CTAs. Update it to reference the new universal-link architecture and link to this plan doc.

### Phase 7 acceptance criteria

- [ ] `List-Unsubscribe` and `List-Unsubscribe-Post` headers set on all sends.
- [ ] `/unsubscribe?token=<hmac>` route live on `kwilt.app` and updates preferences correctly.
- [ ] `KWILT_EMAIL_SENDING_ENABLED=0` halts all email sends without a deploy.
- [ ] SPF / DKIM / DMARC aligned; DMARC policy at least `p=quarantine`.
- [ ] `docs/email-system.md` runbook exists.
- [ ] `docs/growth-loops-execution-plan.md` Sprint 4 updated to reflect new architecture.

---

## Phase 8 — Real-device E2E and GA signoff

**Theme:** Prove every template + every CTA + every surface works end-to-end on real devices before marking GA.
**Estimated duration:** ~0.5 day
**Status:** Not started

### Test matrix

For each of the 11 email templates:

| Surface | Expected behavior |
|---|---|
| Gmail Web (desktop) → click | Opens `/open/<path>` handoff page with install CTAs |
| Gmail iOS app → tap | Universal link intercepts → app opens to target screen |
| Apple Mail iOS → tap | Universal link intercepts → app opens to target screen |
| Apple Mail iOS (app not installed) → tap | Handoff page → App Store CTA |
| Apple Mail macOS → click | Handoff page → install CTAs |
| Outlook 365 Web → click | Handoff page (no universal link on desktop) |
| Outlook Desktop Windows → click | Handoff page; no rendering glitches |

For each path through the handoff page, verify:
- PostHog events fire as expected.
- Logo renders.
- Fallback paste-link works.
- UTM params forwarded into the scheme URL.

### Phase 8 acceptance criteria

- [ ] Full test matrix completed and recorded in `docs/email-system.md`.
- [ ] Any failures from the matrix resolved or explicitly accepted with justification.
- [ ] Sign-off noted in this doc's top-level status.

---

## Dependency graph

```
Phase 1 (Universal-link handoff on kwilt-site)
  ├── 1.1 /open/[[...slug]] route
  ├── 1.2 middleware /open/* allow
  ├── 1.3 verify AASA
  ├── 1.4 verify assetlinks.json
  └── 1.5 UTM forwarding
        │
        ▼
Phase 2 (Register chapter deep link)
  ├── 2.1 linking.config
  ├── 2.2 settings/subscription
  └── 2.3 regression test
        │
        ▼
Phase 3 (Template migration — depends on 1 + 2)
  ├── 3.1 makeOpenUrl helper
  ├── 3.2 swap all CTAs
  ├── 3.3 paste-link fallback
  ├── 3.4 update Resend Automation
  └── 3.5 CI guard
        │
        ▼
Phase 4 (Brand logo — independent)
  ├── 4.1 produce assets
  ├── 4.2 update renderLayout
  ├── 4.3 set env vars
  └── 4.4 cross-client QA
        │
        ▼
Phase 5 (Email UX refinement — depends on 3 + 4)
  ├── 5.1 refactor renderLayout (single surface)
  ├── 5.2 extract shared primitives
  ├── 5.3 de-box inner content per template
  ├── 5.4 normalize content rhythm
  ├── 5.5 tighten preheaders
  ├── 5.6 tighten plain-text versions
  └── 5.7 dark-mode QA
        │
        ▼
Phase 6 (Analytics — depends on 1 + 3)
  ├── 6.1 EmailCtaClicked
  ├── 6.2 EmailDeepLinkConverted
  ├── 6.3 Resend webhook
  └── 6.4 PostHog dashboard
        │
        ▼
Phase 7 (GA prerequisites — mostly independent of 1–6)
  ├── 7.1 unsubscribe
  ├── 7.2 kill switch
  ├── 7.3 send cap
  ├── 7.4 deliverability
  ├── 7.5 warm-up
  ├── 7.6 runbook
  └── 7.7 update strategy doc
        │
        ▼
Phase 8 (Real-device E2E)
```

Phase 4 (logo) and Phase 7 (GA prerequisites) can run in parallel with Phase 3 (template migration) if multiple people are involved. Phase 5 (UX refinement) should not start until Phase 3 + 4 are done, so it touches the final template shape only once.

---

## Suggested sequencing (solo developer)

| Day | Work |
|---|---|
| **Day 1 AM** | Phase 1 (universal-link handoff) |
| **Day 1 PM** | Phase 2 (chapter deep link) + start Phase 3 (template migration) |
| **Day 2 AM** | Finish Phase 3 + Phase 4 (brand logo) |
| **Day 2 PM** | Phase 5 (email UX refinement) |
| **Day 3 AM** | Phase 6 (analytics: client events + Resend webhook) |
| **Day 3 PM** | Phase 7 (unsubscribe, kill switch, deliverability, docs) |
| **Day 4 AM** | Phase 8 (real-device E2E), fixes, GA signoff |

---

## Measurement checkpoints

After each phase:

| Phase | Key metric / check |
|---|---|
| 1 | `/open/plan` URL deep-links on iOS + handoff page renders on desktop |
| 2 | `kwilt://chapters/<id>` resolves to `MoreChapterDetail` in app |
| 3 | Send a test Welcome Day 0; click CTA on iOS — app opens at Today |
| 4 | Logo visible in Gmail Web + Apple Mail iOS + Outlook 365 Web |
| 5 | Side-by-side before/after screenshots show single-surface layout with no nested boxes; preheaders unique per template |
| 6 | PostHog funnel shows non-zero events for `EmailSent → EmailDeepLinkConverted` |
| 7 | Gmail "one-click unsubscribe" button appears in email header |
| 8 | Test matrix passes across all 7 surfaces × 11 templates (relevant combinations) |

---

## Post-GA: first 30 days

1. **Track the Sprint 4 §8 success metrics** in `growth-loops-strategy.md` — this plan finally unblocks them. Publish a `docs/growth-loops-results.md` 30 days after GA.
2. **Iterate on low-performing templates** based on open/click rates.
3. **Revisit deferred items**: S5 (social streak sharing) once retention data is in; W4 (Android widget) if MAU warrants.
4. **Monitor deliverability** (bounce < 2%, complaint < 0.1%) — Resend dashboard + webhook events.

---

## Relationship to other docs

- `docs/growth-loops-strategy.md` — source strategy; this plan closes GA-readiness gaps in §1 (triggered email) and §3 (widgets/deep links).
- `docs/growth-loops-execution-plan.md` — Sprint 4 shipped the email system; this plan hardens it for GA.
- `docs/chapters-ga-hardening-plan.md` — sibling plan owning the Chapter *destination* feature (analytics, unread state, settings, default template flip). Runs in parallel; the Chapter Digest cannot go out at scale until that plan's Phase A ships.
- `docs/chapters-build-plan.md` — original Chapters feature build plan (schema, generation, UI); largely executed through its Phase 3. The GA-hardening plan picks up from there.
- `docs/notifications-paradigm-prd.md` — local/push notification PRD; unrelated but shares the deep-link infrastructure being completed here.
- `kwilt-site/LAUNCH_CHECKLIST.md` — Vercel / DNS / Universal Link setup checklist; Phase 1 depends on items there being completed.
