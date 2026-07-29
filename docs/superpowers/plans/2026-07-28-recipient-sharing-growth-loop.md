# Recipient Sharing Growth Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one privacy-safe Goal recipient loop in which a guest can understand and answer a share on the web, the sender receives the result, and app continuation preserves the invitation without an automatic install gate.

**Architecture:** Keep the operational invite code inside the Goal preview/response and deep-link requests, but pass only allowlisted coarse properties to behavioral analytics. Extend the existing `kwilt-site` Goal landing instead of building a new web product, make app opening an explicit post-value action, and use the existing Kwilt invite parser and native route. This plan deliberately stops before Games, general Friend web acceptance, Household, Screen Time, or a full browser account.

**Tech Stack:** Next.js 14, React 18, TypeScript, Node test runner via `tsx`, React Native/Expo SDK 54, React Navigation linking, Vercel, Supabase Edge Functions.

---

## Scope and repository ownership

This is one independently shippable Goal-first slice of [`docs/feature-briefs/recipient-sharing-growth-loop.md`](../../feature-briefs/recipient-sharing-growth-loop.md).

| Repository | Responsibility |
| --- | --- |
| `/Users/andrewwatanabe/kwilt-site` | Recipient page, guest response UI, privacy-safe analytics, web/app continuation, association files, production deployment |
| `/Users/andrewwatanabe/Kwilt` | Canonical invite parsing, native deep-link route, app entitlements/intent filters, product docs, two-account Simulator proof |

The website checkout is currently dirty on `codex/tools-for-life-homepage`. Do not mix this implementation into that lane and do not create a worktree without Andrew's explicit approval. Finish or checkpoint the homepage lane, integrate it, then create an ordinary website branch from the updated `main` checkout.

General Friend web preview/acceptance is a separate implementation plan after the Goal learning release passes. The post-value Friend offer may be tested manually in this slice, but it must not be wired until recipient action → sender receipt is proven.

### Task 1: Prepare the website implementation lane

**Files:**
- Inspect only: `/Users/andrewwatanabe/kwilt-site/components/tools-for-life/ToolsForLifeHome.tsx`
- Inspect only: `/Users/andrewwatanabe/kwilt-site/components/tools-for-life/ToolsForLifeHome.module.css`
- Inspect only: `/Users/andrewwatanabe/kwilt-site/docs/marketing-strategy/02-tools-for-life-homepage-ui-contract.md`
- Inspect only: `/Users/andrewwatanabe/kwilt-site/public/marketing/tools-for-life/`

- [ ] **Step 1: Confirm the homepage lane has reached an explicit checkpoint**

Run:

```bash
git -C /Users/andrewwatanabe/kwilt-site status --short --branch
git -C /Users/andrewwatanabe/kwilt-site log -1 --oneline
```

Expected: either the homepage work is committed and ready to integrate, or Andrew has explicitly chosen how to preserve it. Do not stage, stash, discard, or overwrite those files as part of this plan.

- [ ] **Step 2: Start the ordinary recipient-loop branch after the homepage lane is integrated**

Run from `/Users/andrewwatanabe/kwilt-site`:

```bash
git switch main
git pull --ff-only
git switch -c codex/recipient-sharing-growth-loop
git status --short --branch
```

Expected: `## codex/recipient-sharing-growth-loop` with no unrelated working-tree changes.

- [ ] **Step 3: Record both runtime owners before visual verification**

Run:

```bash
git -C /Users/andrewwatanabe/kwilt-site rev-parse --short HEAD
git -C /Users/andrewwatanabe/Kwilt rev-parse --short HEAD
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

Expected: the website and mobile commits are known, and any existing local server owner is identified before starting another process.

### Task 2: Enforce the privacy-safe recipient analytics boundary

**Files:**
- Create: `/Users/andrewwatanabe/kwilt-site/lib/analytics.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/analytics.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/components/share/InviteLandingTelemetry.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/components/share/ShareResponseForm.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(invite)/i/[inviteCode]/page.tsx`

- [ ] **Step 1: Write the failing analytics allowlist test**

Create `/Users/andrewwatanabe/kwilt-site/lib/analytics.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeAnalyticsProps } from "./analytics";

describe("recipient sharing analytics", () => {
  it("keeps only coarse allowlisted properties", () => {
    assert.deepEqual(
      sanitizeAnalyticsProps("invite_landing_viewed", {
        flowVersion: "goal-web-v1",
        objectKind: "goal",
        sourceClass: "direct",
        state: "active",
        hasCheckin: true,
        inviteCode: "PRIVATE-CODE",
        goalTitle: "Private goal",
        inviterFirstName: "David",
        goalId: "goal-1",
        replyText: "Private reply"
      }),
      {
        flowVersion: "goal-web-v1",
        objectKind: "goal",
        sourceClass: "direct",
        state: "active",
        hasCheckin: true
      }
    );
  });

  it("does not alter non-recipient website analytics", () => {
    assert.deepEqual(
      sanitizeAnalyticsProps("pricing_view", { source: "navigation", plan: "annual" }),
      { source: "navigation", plan: "annual" }
    );
  });
});
```

- [ ] **Step 2: Run the test and verify that it fails**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/analytics.test.ts
```

Expected: FAIL because `sanitizeAnalyticsProps` is not exported.

- [ ] **Step 3: Add the analytics allowlist and apply it centrally**

Add to `/Users/andrewwatanabe/kwilt-site/lib/analytics.ts`:

```ts
const RECIPIENT_SHARE_EVENTS = new Set<AnalyticsEvent>([
  "invite_landing_viewed",
  "invite_landing_action_selected",
  "invite_landing_install_cta_selected",
  "share_web_cheer_sent",
  "share_web_reply_sent"
]);

const RECIPIENT_SHARE_PROP_ALLOWLIST = new Set([
  "flowVersion",
  "objectKind",
  "sourceClass",
  "actionClass",
  "state",
  "result",
  "hasCheckin",
  "hasName"
]);

export function sanitizeAnalyticsProps(event: AnalyticsEvent, props: AnalyticsProps): AnalyticsProps {
  if (!RECIPIENT_SHARE_EVENTS.has(event)) return props;

  return Object.fromEntries(
    Object.entries(props).filter(([key]) => RECIPIENT_SHARE_PROP_ALLOWLIST.has(key))
  );
}
```

Then change `track` so the payload spreads `sanitizeAnalyticsProps(event, props)` rather than `props` directly:

```ts
export function track(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    ...sanitizeAnalyticsProps(event, props)
  };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", payload);
  }
}
```

- [ ] **Step 4: Remove private properties from every recipient event call site**

Change `InviteLandingTelemetry` to accept only:

```ts
type Props = {
  sourceClass: "direct" | "referral";
  hasCheckin: boolean;
  inviteState?: string | null;
};
```

Emit:

```ts
track("invite_landing_viewed", {
  flowVersion: "goal-web-v1",
  objectKind: "goal",
  sourceClass,
  state: inviteState ?? "unavailable",
  hasCheckin
});
```

In `ShareResponseForm`, keep `inviteCode`, `senderName`, and reply text only in the operational `fetch` body. Replace analytics payloads with coarse properties such as:

```ts
track("invite_landing_action_selected", {
  flowVersion: "goal-web-v1",
  objectKind: "goal",
  actionClass: "cheer"
});

track("share_web_cheer_sent", {
  flowVersion: "goal-web-v1",
  objectKind: "goal",
  actionClass: "cheer",
  result: "sent",
  hasName: senderName.trim().length > 0
});
```

Use `actionClass: "reply"` for reply events and `actionClass: "open_app" | "install"` for continuation events. Do not send reply length.

On the page, derive `sourceClass={ref ? "referral" : "direct"}` on the server and stop passing the raw ref code, invite code, Goal title, or inviter name into the telemetry component.

- [ ] **Step 5: Run the focused and full website tests**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/analytics.test.ts
npm test
```

Expected: all tests pass, and the analytics test proves that a future accidental private property is dropped centrally.

- [ ] **Step 6: Commit the analytics boundary**

Run:

```bash
git add lib/analytics.ts lib/analytics.test.ts components/share/InviteLandingTelemetry.tsx components/share/ShareResponseForm.tsx 'app/(invite)/i/[inviteCode]/page.tsx'
git commit -m "fix: protect recipient sharing analytics"
```

Expected: one focused commit containing no homepage files.

### Task 3: Make the Goal web experience value-first and preserve explicit continuation

**Files:**
- Create: `/Users/andrewwatanabe/kwilt-site/lib/recipientContinuation.ts`
- Create: `/Users/andrewwatanabe/kwilt-site/lib/recipientContinuation.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(invite)/i/[inviteCode]/page.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/components/share/ShareResponseForm.tsx`
- Stop using on Goal page: `/Users/andrewwatanabe/kwilt-site/components/LinkRouterClient.tsx`

- [ ] **Step 1: Write the failing continuation URL test**

Create `/Users/andrewwatanabe/kwilt-site/lib/recipientContinuation.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRecipientContinuation } from "./recipientContinuation";

describe("buildRecipientContinuation", () => {
  it("preserves the invite in explicit app-open and install-return links", () => {
    assert.deepEqual(buildRecipientContinuation("A B", "friend-share"), {
      openHref: "kwilt://invite?code=A+B&ref=friend-share",
      installHref: "/download?invite=A+B&ref=friend-share"
    });
  });

  it("omits an empty referral without dropping the invite", () => {
    assert.deepEqual(buildRecipientContinuation("CODE", ""), {
      openHref: "kwilt://invite?code=CODE",
      installHref: "/download?invite=CODE"
    });
  });
});
```

- [ ] **Step 2: Run the test and verify that it fails**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/recipientContinuation.test.ts
```

Expected: FAIL because `recipientContinuation.ts` does not exist.

- [ ] **Step 3: Implement the pure continuation builder**

Create `/Users/andrewwatanabe/kwilt-site/lib/recipientContinuation.ts`:

```ts
export function buildRecipientContinuation(inviteCode: string, refCode = "") {
  const open = new URL("kwilt://invite");
  open.searchParams.set("code", inviteCode);

  const install = new URLSearchParams();
  install.set("invite", inviteCode);

  if (refCode.trim()) {
    open.searchParams.set("ref", refCode.trim());
    install.set("ref", refCode.trim());
  }

  return {
    openHref: open.toString(),
    installHref: `/download?${install.toString()}`
  };
}
```

- [ ] **Step 4: Remove automatic app/store redirection from the Goal landing**

In `/Users/andrewwatanabe/kwilt-site/app/(invite)/i/[inviteCode]/page.tsx`:

- remove the `LinkRouterClient` import and rendered `silent` instance;
- remove the page-local `buildInviteDeepLink` helper;
- call `buildRecipientContinuation(inviteCode, ref)`;
- pass `openHref` and `installHref` to `ShareResponseForm`.

The page must remain visible and usable until the recipient explicitly chooses **Open Kwilt** or **Install Kwilt**. Merely loading `/i/:inviteCode` must not schedule a redirect.

- [ ] **Step 5: Render explicit post-value continuation actions**

Extend the `ShareResponseForm` props:

```ts
type Props = {
  inviteCode: string;
  inviterFirstName?: string;
  openHref: string;
  installHref: string;
  latestCheckinText?: string | null;
  hasCheckin?: boolean;
};
```

After a successful cheer/reply, render two actions:

```tsx
<a
  href={openHref}
  onClick={() => track("invite_landing_install_cta_selected", {
    flowVersion: "goal-web-v1",
    objectKind: "goal",
    actionClass: "open_app"
  })}
  className="inline-flex h-10 items-center justify-center rounded-control bg-kw-ink px-4 text-sm font-semibold text-white hover:opacity-90"
>
  Open Kwilt
</a>
<Link
  href={installHref}
  onClick={() => track("invite_landing_install_cta_selected", {
    flowVersion: "goal-web-v1",
    objectKind: "goal",
    actionClass: "install"
  })}
  className="inline-flex h-10 items-center justify-center rounded-control border border-kw-card-border px-4 text-sm font-semibold text-kw-ink"
>
  Install Kwilt
</Link>
```

Explain that, after installing, the recipient should return to the still-open invitation and tap **Open Kwilt**. Do not claim automatic deferred deep linking until a signed-device test proves it.

- [ ] **Step 6: Run focused tests and build the website**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/recipientContinuation.test.ts
npm test
npm run build
```

Expected: tests and production build pass; the Goal page no longer imports `LinkRouterClient`.

- [ ] **Step 7: Commit the value-first continuation**

Run:

```bash
git add lib/recipientContinuation.ts lib/recipientContinuation.test.ts components/share/ShareResponseForm.tsx 'app/(invite)/i/[inviteCode]/page.tsx'
git commit -m "feat: make goal recipient handoff value first"
```

### Task 4: Make invitation lifecycle and no-check-in states truthful

**Files:**
- Create: `/Users/andrewwatanabe/kwilt-site/lib/recipientInviteState.ts`
- Create: `/Users/andrewwatanabe/kwilt-site/lib/recipientInviteState.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/invitePreview.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(invite)/i/[inviteCode]/page.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/components/share/ShareResponseForm.tsx`

- [ ] **Step 1: Write failing lifecycle-state tests**

Create `/Users/andrewwatanabe/kwilt-site/lib/recipientInviteState.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveRecipientInviteState } from "./recipientInviteState";

describe("resolveRecipientInviteState", () => {
  it("returns active only for an active preview", () => {
    assert.equal(resolveRecipientInviteState({ inviteState: "active" }), "active");
  });

  it("preserves terminal states", () => {
    assert.equal(resolveRecipientInviteState({ inviteState: "expired" }), "expired");
    assert.equal(resolveRecipientInviteState({ inviteState: "consumed" }), "accepted");
    assert.equal(resolveRecipientInviteState({ inviteState: "revoked" }), "revoked");
  });

  it("treats a missing or unknown preview as unavailable", () => {
    assert.equal(resolveRecipientInviteState(null), "unavailable");
    assert.equal(resolveRecipientInviteState({ inviteState: "mystery" }), "unavailable");
  });
});
```

- [ ] **Step 2: Run the test and verify that it fails**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/recipientInviteState.test.ts
```

Expected: FAIL because `recipientInviteState.ts` does not exist.

- [ ] **Step 3: Implement the lifecycle normalizer**

Create `/Users/andrewwatanabe/kwilt-site/lib/recipientInviteState.ts`:

```ts
export type RecipientInviteState = "active" | "expired" | "accepted" | "revoked" | "unavailable";

export function resolveRecipientInviteState(
  preview: { inviteState?: string | null } | null
): RecipientInviteState {
  if (preview?.inviteState === "active") return "active";
  if (preview?.inviteState === "expired") return "expired";
  if (preview?.inviteState === "consumed") return "accepted";
  if (preview?.inviteState === "revoked") return "revoked";
  return "unavailable";
}
```

Extend `InvitePreview.inviteState` to include `revoked` when the backend returns it. Do not infer revocation from a generic network error.

- [ ] **Step 4: Render distinct safe states on the page**

On the Goal invite page, compute `recipientState`. Render the response form only when `recipientState === "active"`.

Use these messages:

```ts
const stateCopy = {
  expired: {
    title: "This invitation has expired",
    body: "Ask the sender for a new link if they still want to share this goal."
  },
  accepted: {
    title: "This invitation has already been used",
    body: "Open Kwilt to continue if you joined this goal."
  },
  revoked: {
    title: "This invitation is no longer available",
    body: "The sender ended access to this invitation."
  },
  unavailable: {
    title: "We can’t open this invitation",
    body: "The link may be incomplete, or Kwilt may be temporarily unavailable."
  }
} as const;
```

Terminal pages must not show a cheer/reply form or claim the recipient has access. Only the accepted state may show the explicit **Open Kwilt** continuation.

- [ ] **Step 5: Fix the active invitation with no check-in**

When `hasCheckin === false`, render:

```tsx
<div className="rounded-card border border-kw-card-border bg-kw-canvas p-5">
  <div className="text-base font-semibold text-kw-ink">Nothing to respond to yet</div>
  <p className="mt-1 text-sm leading-5 text-kw-text-secondary">
    This goal has not shared a check-in yet. You can come back through this link later.
  </p>
</div>
```

Do not render a button labelled **Open this goal in Kwilt** that still invokes `sendCheer`. A web response button exists only when the corresponding action is valid.

- [ ] **Step 6: Run tests and build**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/recipientInviteState.test.ts
npm test
npm run build
```

Expected: all tests and build pass.

- [ ] **Step 7: Commit lifecycle truthfulness**

Run:

```bash
git add lib/recipientInviteState.ts lib/recipientInviteState.test.ts lib/invitePreview.ts components/share/ShareResponseForm.tsx 'app/(invite)/i/[inviteCode]/page.tsx'
git commit -m "feat: show truthful goal invite states"
```

### Task 5: Verify association ownership and the native invite route

**Files:**
- Modify only if a contract gap is found: `/Users/andrewwatanabe/kwilt-site/lib/appAssociations.ts`
- Test: `/Users/andrewwatanabe/kwilt-site/lib/appAssociations.test.ts`
- Inspect: `/Users/andrewwatanabe/kwilt-site/app/.well-known/apple-app-site-association/route.ts`
- Inspect: `/Users/andrewwatanabe/kwilt-site/app/.well-known/assetlinks.json/route.ts`
- Inspect: `/Users/andrewwatanabe/Kwilt/app.config.ts`
- Inspect: `/Users/andrewwatanabe/Kwilt/ios/Kwilt/Kwilt.entitlements`
- Test: `/Users/andrewwatanabe/Kwilt/src/services/invites.parsing.test.ts`
- Test: `/Users/andrewwatanabe/Kwilt/src/navigation/linkingConfig.test.ts`

- [ ] **Step 1: Re-run the association builder tests before changing source**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx tsx --test lib/appAssociations.test.ts
```

Expected: AASA contains `BK3N7YXHN7.com.andrewwatanabe.kwilt` in production configuration and claims `/i/*`; the source-level builder test passes. If it passes, do not rewrite the builder merely because production is stale.

- [ ] **Step 2: Verify mobile ownership is internally consistent**

Run:

```bash
cd /Users/andrewwatanabe/Kwilt
rg -n "appleTeamId|bundleIdentifier|associatedDomains|go.kwilt.app|pathPrefix: '/i/'" app.config.ts ios/Kwilt/Kwilt.entitlements
npx jest src/services/invites.parsing.test.ts src/navigation/linkingConfig.test.ts --runInBand
```

Expected:

```text
Apple team: BK3N7YXHN7
iOS bundle: com.andrewwatanabe.kwilt
AASA appID: BK3N7YXHN7.com.andrewwatanabe.kwilt
Goal path: /i/*
```

The targeted tests pass and `https://go.kwilt.app/i/<code>` resolves to the existing Goal invitation flow.

- [ ] **Step 3: Verify deployment environment before production deployment**

The production website must provide:

```text
KWILT_IOS_TEAM_ID=BK3N7YXHN7
KWILT_IOS_APP_ID=BK3N7YXHN7.com.andrewwatanabe.kwilt
KWILT_ANDROID_PACKAGE_NAME=com.andrewwatanabe.kwilt
```

Retrieve `KWILT_ANDROID_SHA256_CERT_FINGERPRINT` from the signed Play Console application before enabling Android App Links. Do not invent a fingerprint. If no signed Android distribution exists, document Android App Links as unproven and do not claim them in release notes.

- [ ] **Step 4: Build the site and inspect the local association payload**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
npm run build
npm run start
```

In another shell:

```bash
curl -fsS http://localhost:3000/.well-known/apple-app-site-association | jq .
curl -fsS http://localhost:3000/.well-known/assetlinks.json | jq .
```

Expected: iOS `details` is non-empty and the main app claims `/i/*`. Android fingerprints are non-empty only if real signing values are configured.

- [ ] **Step 5: Commit only if source or tests changed**

If the existing source already satisfies the contract, make no association-code commit. If a real gap required a change:

```bash
git add lib/appAssociations.ts lib/appAssociations.test.ts app/.well-known/apple-app-site-association/route.ts app/.well-known/assetlinks.json/route.ts
git commit -m "fix: publish recipient link associations"
```

### Task 6: Prove the complete two-sided loop before deployment

**Files:**
- Modify if a regression is found: `/Users/andrewwatanabe/kwilt-site/app/(invite)/i/[inviteCode]/page.tsx`
- Modify if a regression is found: `/Users/andrewwatanabe/kwilt-site/components/share/ShareResponseForm.tsx`
- Modify if a regression is found: `/Users/andrewwatanabe/Kwilt/src/services/invites.ts`
- Evidence target: `/Users/andrewwatanabe/Kwilt/docs/design-explorations/recipient-sharing-growth-loop/05-evaluate-learning.md`

- [ ] **Step 1: Run website gates**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
git diff --check
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run mobile invite gates without claiming the unrelated Explore lane**

Run:

```bash
cd /Users/andrewwatanabe/Kwilt
git diff --check
npx jest src/services/invites.parsing.test.ts src/navigation/linkingConfig.test.ts --runInBand
npm run product:lint
```

Expected: targeted invite and product gates pass. Run `npm run verify:changed -- --run` before final integration; if it fails in unrelated Explore fixtures, report that separately and do not misattribute it to recipient sharing.

- [ ] **Step 3: Start the website and mobile runtimes with explicit ownership**

Run the website from `/Users/andrewwatanabe/kwilt-site`:

```bash
npm run dev
```

Run Metro from `/Users/andrewwatanabe/Kwilt` only after confirming port 8081 is free or belongs to this checkout:

```bash
npx expo start --port 8081
```

Expected: the recorded website branch/commit owns port 3000 and the recorded Kwilt branch/commit owns port 8081.

- [ ] **Step 4: Execute the two-account procedure**

Use Account A in the installed app and Account B/guest in Safari:

1. Account A creates a real Goal invite with a check-in.
2. Safari opens the `go.kwilt.app/i/:code` link without automatically leaving the page.
3. The recipient states what is shared and what remains private.
4. The recipient sends a cheer without a name; Account A receives it once.
5. A fresh invitation receives a written reply with a name; Account A receives the correct content once.
6. After success, **Open Kwilt** opens the installed app on the same invitation decision.
7. On a device without the app, **Install Kwilt** preserves the invitation on the web; after installation, returning to the page and tapping **Open Kwilt** opens the same invitation.
8. Expired, consumed, revoked, malformed, and active-with-no-check-in links show the correct non-mutating state.
9. Browser `window.dataLayer` events contain none of: invite code, ref code, Goal ID/title, inviter name, reply text, raw identity, friendship ID, or durable pair identifier.

Expected: recipient action → sender receipt succeeds without manual database intervention and no privacy property appears in the browser analytics queue.

- [ ] **Step 5: Record the learning result**

Append a result section to `/Users/andrewwatanabe/Kwilt/docs/design-explorations/recipient-sharing-growth-loop/05-evaluate-learning.md` with the actual run date, aggregate cohort size, comprehension result, guest-action counts, sender-receipt count, context-preserving app-open count, privacy/authorization failure count, and the continue/revise/stop decision.

```markdown
## Learning run

- Run date
- Aggregate cohort size
- Recipient boundary comprehension result
- Guest cheer, reply, and duplicate counts
- Sender receipts confirmed
- Explicit app opens preserving context
- Privacy or authorization failures and disposition
- Continue, revise, or stop decision
```

Use aggregate counts only. Do not record participant names, account IDs, invite codes, Goal text, or reply text.

### Task 7: Deploy the proven website slice and verify production

**Files:**
- Deployment source: `/Users/andrewwatanabe/kwilt-site`
- Production verification: `https://go.kwilt.app`

- [ ] **Step 1: Confirm clean intended diff and push the website branch**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site
git status --short --branch
git log --oneline main..HEAD
git diff --stat main...HEAD
git push -u origin codex/recipient-sharing-growth-loop
```

Expected: only recipient-loop commits and no homepage working files appear in the branch diff.

- [ ] **Step 2: Deploy through the existing Vercel project**

After the branch is reviewed and merged according to the repository's normal release path, deploy the production site from the integrated commit:

```bash
cd /Users/andrewwatanabe/kwilt-site
npx vercel deploy --prod
```

Expected: Vercel reports the production deployment and the custom domains resolve to that deployment. Do not deploy from a dirty checkout.

- [ ] **Step 3: Verify production association and route responses**

Run:

```bash
curl -fsS https://go.kwilt.app/.well-known/apple-app-site-association | jq '.applinks.details'
curl -fsS https://kwilt.app/.well-known/apple-app-site-association | jq '.applinks.details'
curl -fsS https://go.kwilt.app/.well-known/assetlinks.json | jq .
curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://go.kwilt.app/i/deployment-probe
```

Expected: iOS details are non-empty on both hosts; the main appID is `BK3N7YXHN7.com.andrewwatanabe.kwilt`; `/i/deployment-probe` reaches the Goal recipient page rather than `/download` or a 404. The probe may show an unavailable invitation, which is the correct safe state.

- [ ] **Step 4: Verify the installed-app handoff on the signed learning build**

Open a real active URL from Messages or Notes on the signed iPhone/TestFlight build. Expected: the OS opens Kwilt and the app shows the same invitation decision. A Simulator/custom-scheme result is useful development evidence but does not prove production Universal Links.

- [ ] **Step 5: Apply the release decision**

- If the production two-sided loop and privacy checks pass, keep the Goal web companion available to the small cohort.
- If guest mutation or attribution fails, disable guest mutation and leave a safe read-only invitation state.
- If AASA is stale, do not repeatedly redeploy app code; inspect the production response, Vercel domain owner, and Apple association CDN before changing the native route.
- Do not add the post-value Friend offer until the Goal loop meets the learning thresholds in `05-evaluate-learning.md`.

## Self-review result

- **Spec coverage:** This plan covers the first Goal envelope, privacy-safe analytics, value-first web action, truthful lifecycle states, explicit app/install continuation, association ownership, two-account sender receipt, and production verification. It intentionally defers Games, full Friend web acceptance, Household, Screen Time, paid packaging, and a full web app.
- **Placeholder scan:** No implementation step relies on a generic “handle errors” or “write tests” instruction; code-changing steps name the exact file, behavior, test, command, and expected result.
- **Type consistency:** Recipient analytics use one shared property vocabulary; continuation links use `openHref` and `installHref` throughout; lifecycle state maps backend `consumed` to user-facing `accepted` without changing the operational backend value.
