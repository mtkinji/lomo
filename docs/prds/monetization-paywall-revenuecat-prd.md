## PRD — Monetization + Paywall (RevenueCat) for MVP Launch

### Purpose

Ship **Kwilt Pro** subscriptions on iOS with reliable entitlement gating, **no authentication requirement**, and a paywall strategy aligned to MVP limits:

- Free: **1 Arc total**, **3 active Goals per Arc**, unlimited Activities and explicit reminders.
- Pro: **unlimited Arcs**, higher/unlimited Goals per Arc, AI scheduling + calendar export.

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Current store: `src/store/useAppStore.ts`
- Domain types: `src/domain/types.ts`

---

## MVP requirements

### Subscription product

- **Product**: “Kwilt Pro”
- **Billing**: iOS auto-renewing subscription
- **Entitlement**: `pro`

### Must-have user flows

- **Purchase**
- **Restore purchases**
- **Entitlement-aware UI** (no stale state; cached for offline)
- **Billing failure resilience**
  - If entitlement cannot be determined (offline), use last known value for a bounded window and provide a retry UI.

---

## Tier visibility model (Free vs Pro)

### Goals

- Make the current tier **discoverable** at any time (users shouldn’t have to hunt).
- Avoid feeling “shouted at” while still maintaining consistent **upgrade affordances**.
- Tie upsells to **value realization moments** (limits + Pro-only actions), not random interruptions.

### Surfaces (MVP)

- **Settings/Profile (always available)**
  - Add a “Kwilt Pro” row/section that shows:
    - Current tier: **Free** or **Pro**
    - Primary CTA:
      - Free: “Upgrade to Pro”
      - Pro: “Manage subscription”
    - Secondary action:
      - “Restore purchases”
  - This is the canonical place for subscription controls.

- **Global, subtle tier indicator (non-intrusive)**
  - Show a small **tier chip** in one stable location:
    - Recommended: in the Settings/Profile header area, near the profile row in the drawer, or in SettingsHome.
  - Copy:
    - Free: “Free”
    - Pro: “Pro”
  - Behavior:
    - Tapping the chip opens Paywall (Free) or Manage Subscription (Pro).

- **Contextual “Pro” badges (only where relevant)**
  - For Pro-only features, show a small “Pro” badge next to the action label (e.g., “Add to calendar · Pro”).
  - Tapping the Pro-only action opens the Paywall directly.

- **Limit-triggered upsell (highest intent)**
  - When the user hits a hard limit:
    - “Create Arc” (Free already has an Arc)
    - “Create Goal” (Free already has 3 active goals for that arc)
  - Replace the affordance with an upgrade message and a single clear CTA (“Upgrade to Pro”).

### Non-goals (MVP)

- No persistent banners on every screen.
- No modal interruptions outside user-initiated actions (limits or Pro-only features).

---

## Pricing and packaging (recommendation)

### What Pro unlocks (MVP)

- **Unlimited Arcs**
- **Goal scale**
  - Free: 3 active goals per Arc
  - Pro: configurable; recommend “unlimited active goals per Arc”
- **AI scheduling features**
  - “Auto-schedule this activity” (writes `scheduledAt` / scheduling hints)
- **Calendar export**
  - “Add to calendar” exports `.ics` (see Calendar PRD)

---

## Trials, referral bonuses, and family sharing

### 30-day trial without “unlimited Arcs” (recommended)

We should **not** give “full Pro” for 30 days if that unlocks unlimited Arc creation, because it creates messy downgrade behavior (what happens to extra Arcs on trial end?).

Instead, ship a trial as **“Pro Tools”**: a 30-day trial that unlocks high-value, *non-structural* Pro features without changing core object limits.

Implementation approach (iOS + RevenueCat friendly):

- Configure an **introductory offer** (free trial) for the Pro subscription in App Store Connect.
- During the free trial window, the user has a trial entitlement (conceptually `pro_trial`):
  - **Unlocked in trial (recommended)**:
    - AI scheduling features
    - Calendar export (ICS)
  - **Not unlocked in trial**:
    - Unlimited Arcs (Free remains **1 Arc total**)
    - Any other “structural” expansions that create downgrade complexity

Key implication:

- A 30-day trial increases AI usage exposure. This reinforces the need for the **AI proxy + quotas** workstream so paid/trial access still has sensible guardrails rather than true unlimited spend.

### Downgrade policy (only needed if we ever trial full Pro later)

If you ever decide to trial “unlimited Arcs”:

- On downgrade to Free, keep extra Arcs **visible but locked**:
  - Only 1 Arc can be “active/editable”
  - All other Arcs become read-only (and optionally auto-marked `paused` or `archived`)
  - Show a clear upgrade CTA on locked Arcs

### Referral / signup bonus

There are two different things people mean by “referral bonus”:

- **Signup bonus (no referrer):** the 30-day trial above.
- **True referral reward (invite someone; both get extra time):**
  - Typically requires backend tracking + anti-abuse.
  - On iOS, is commonly implemented via **subscription offer codes** / promotional offers, with the app deep-linking recipients into redemption.

Recommendation:

- Ship the **30-day trial** for Jan 1.
- Add “true referral reward” after launch when you have basic referral tracking and AI proxy guardrails in place.

### Family subscription (up to ~6 people)

This is feasible on iOS via **Apple subscription Family Sharing**:

- Eligible auto-renewable subscriptions can be shared with a family group (typically **up to 6** including organizer).
- This is primarily an App Store Connect configuration + testing effort; in-app entitlement should “just work” because receipts reflect the shared subscription.

Important implication:

- Family Sharing solves **pricing/entitlement sharing**, not identity. Shared goals still require an identity model (recommended: optional Sign in with Apple only when creating/joining shared goals).

MVP recommendation:

- If configuration/testing is straightforward, **enable Family Sharing at launch**.
- Do not build “seat management” in-app for MVP; Apple controls the roster.

### What stays free (MVP)

- Unlimited Activities
- Explicit Activity reminders (`Activity.reminderAt`) and Daily show-up reminders (user-controlled)

---

## Gating rules (canonical)

### Definitions

- **Active Arc**: `Arc.status === 'active'`
- **Active Goal**: `Goal.status !== 'completed' && Goal.status !== 'archived'`

### Free tier constraints

- **Arc creation cap**
  - Free users may have **exactly 1 Arc total**.
  - Attempting to create a second Arc (manual or AI) must show an upgrade message with an extremely easy upgrade path.
- **Active Goals per Arc cap**
  - At most **3** active goals where `goal.arcId === arc.id`.

### Pro tier

- No caps for Arcs.
- Goal cap removed entirely.

---

## Implementation plan (client)

### New modules

- `src/services/entitlements.ts`
  - Initializes RevenueCat.
  - Exposes `getEntitlements()`, `purchasePro()`, `restorePurchases()`.
  - Caches last-known entitlement state.

- `src/store/useEntitlementsStore.ts` (or extend `useAppStore`)
  - `isPro: boolean`
  - `lastCheckedAt: string`
  - `refreshEntitlements(): Promise<void>`

### Paywall UI

- `src/features/paywall/PaywallScreen.tsx` (or a reusable bottom sheet)
  - Product info, price, “Subscribe”, “Restore Purchases”
  - Clear value bullets tied to outcomes and explicit features
  - Include “Already subscribed? Restore purchases”

### Settings/Profile entry point (required)

- Add a “Kwilt Pro” entry point in `src/features/account/SettingsHomeScreen.tsx`:
  - Shows current tier (Free/Pro)
  - Free: “Upgrade to Pro” → opens Paywall
  - Pro: “Manage subscription” → opens iOS subscription management
  - “Restore purchases” → triggers restore flow
  - Optional: show key benefits list in a compact form

### Gating hook/helpers

- `src/domain/limits.ts` (recommended)
  - `canCreateArc({ isPro, arcs }): { ok: boolean; reason?: 'limit_active_arcs' }`
  - `canCreateGoal({ isPro, goals, arcId }): { ok: boolean; reason?: 'limit_goals_per_arc' }`

### Enforce at creation choke points (must)

- **Goal creation**
  - `src/features/goals/GoalsScreen.tsx` → `GoalCoachDrawer` (single place for addGoal)
  - Block goal creation if free cap reached; route to paywall.

- **Arc creation**
  - `src/features/arcs/ArcsScreen.tsx` and any Arc creation workflow entry points.
  - If free and any Arc already exists, block Arc creation and route to paywall.
  - Manual Arc creation affordances should be replaced with an upgrade message.
  - AI Arc creation should show the upgrade message inside the Agent Workspace.

---

## Analytics events (MVP)

- `paywall_viewed` (context: fromArcCreate/fromGoalCreate/fromSettings)
- `purchase_started`
- `purchase_succeeded`
- `purchase_failed` (error code)
- `restore_started`
- `restore_succeeded`
- `restore_failed`

(Exact analytics provider is a separate decision; events should be structured now.)

---

## Edge cases / acceptance tests

- **Restore works** after reinstall on same Apple ID.
- **Free gating** blocks:
  - 2nd active Arc creation
  - 4th active Goal in the same Arc
- **No data loss**: paywall never forces deletion; provide archive/pause flows.
- **Offline**:
  - App doesn’t crash.
  - Entitlement uses cached state and can refresh later.


