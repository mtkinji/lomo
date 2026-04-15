## Growth Loops Strategy: Activation, Engagement, Retention & Upsell

**Purpose:** Audit the current state of Kwilt's growth loops and recommend concrete improvements across five pillars — triggered communications, notifications, widgets, streaks, and upsell surfaces.

This document evaluates what is shipped, what is planned-but-not-wired, and what is missing entirely. Each section closes with a prioritized set of recommendations.

---

## Executive summary

Kwilt has strong foundations — a thoughtful onboarding flow, a well-designed local notification service, an iOS WidgetKit integration, a Duolingo-inspired streak model, and RevenueCat-backed monetization. However, these systems are largely **islands** today. The highest-leverage work is connecting them into **closed loops** where each system reinforces the others:

| Gap | Impact | Effort |
|-----|--------|--------|
| No server-side push or triggered email | Users who uninstall or don't open the app are unreachable | High |
| Streak-at-risk and reactivation notifications not wired | Biggest daily-retention lever is planned but idle | Medium |
| Widget adoption is nudge-only; no Lock Screen widget | Reduces ambient visibility on the surface users see most | Medium |
| Pro upsell moments are reactive, not behavioral | Conversion relies on limit-hit frustration rather than value demonstration | Medium |
| Push token registration is implemented but not called | Server push infrastructure exists in DB but is dead code | Low |

---

## 1. Triggered email cadence for new users

### Current state

- **No transactional email to end users.** The only email paths are admin-facing: goal invite delivery (`invite-email-send`), Pro code grants (`pro-codes`), and secrets expiry alerts.
- **No drip / lifecycle email.** There is no email service provider integration (Resend is used for admin sends only), no welcome email, no onboarding follow-up, no re-engagement email, and no digest/recap email.
- **Supabase Auth sends confirmation/reset emails** via the built-in auth email templates, but these are transactional identity flows, not product engagement.
- **Chapters have `email_enabled` / `email_recipient` / `emailed_at` columns** in the DB migration, but the edge function comments that email delivery is "wired in later phases."

### Recommendations

**E1. Welcome + activation drip (days 0–7)** ✅ Done

Design a 4-message email sequence triggered by account creation:

| Day | Subject line (example) | Purpose |
|-----|------------------------|---------|
| 0 | "Welcome to Kwilt — your Arc is waiting" | Confirm signup, deep-link back to the app, set expectations |
| 1 | "Your first tiny step" | Nudge toward first Activity completion (the activation metric) |
| 3 | "How's your first Arc going?" | Surface the show-up streak value prop; link to Plan |
| 7 | "Your first week in review" | Mini-recap (streak length, activities completed); seed the Chapters concept |

Implemented as a hybrid: Day 0 + Day 1 via Resend Automation ("Kwilt Welcome Drip") with open-tracking re-engagement branch (if Day 1 isn't opened in 2 days, sends a "One tiny step" variant). Day 3 + Day 7 via `email-drip` edge function (need live Supabase data for streak/activity personalization). Resend Topics created for unsubscribe management. `kwilt_email_cadence` and `kwilt_email_preferences` tables with RLS. Client fires `user.signup` event on new sign-in via `fireResendSignupEvent()`.

**E2. Weekly Chapter digest email** ✅ Done

Leverage the existing `email_enabled` / `email_recipient` columns on chapter templates:
- After chapter generation, if the user has opted in, send a styled email with the chapter summary and a deep link to the full chapter in-app.
- This creates a recurring "reason to return" that doesn't rely on push notifications.

Implemented in `chapters-generate/index.ts`. Template: `buildChapterDigestEmail`. Sends after successful chapter generation when user has opted in and not opted out of `chapter_digest` preference.

**E3. Streak-break and win-back emails (day 3+ of inactivity)**

- When server-side push fails to re-engage (or push tokens aren't registered), fall back to email.
- Copy tone: self-compassionate, identity-anchored ("Your [Arc name] is still here. Ready for one tiny step?").
- Cap at 2 win-back emails per lapse, then go silent until the user returns.

**E4. Pro trial expiry / conversion email**

- When `pro_tools_trial` entitlement is approaching expiry (RevenueCat webhook), send a "Your trial is ending" email with a recap of Pro features used and a CTA to subscribe.

---

## 2. Refinements to notifications

### Current state

- **Local notifications are mature:** Activity reminders, daily show-up, daily focus, goal nudges, and setup-next-step all have production schedulers with caps (2/day), spacing (6h), and suppression logic.
- **Server push is not wired.** `pushTokenService.ts` has `registerPushToken` / `unregisterPushToken` but **nothing calls them** — they are dead code. The `kwilt_push_tokens`, `kwilt_mcp_notification_queue`, and `kwilt_mcp_notification_log` tables exist in migrations but have no sender.
- **Streak and reactivation types are defined** in the `NotificationData` union and tap-handler. ~~Only fire in dev via `debugFireNotification`.~~ Now fully wired with production schedulers (Sprint 1).
- **`allowStreakAndReactivation`** defaults to `true` in the store with a UI toggle in `NotificationsSettingsScreen` (Sprint 1).
- **No iOS notification categories** (`setNotificationCategoryAsync` is not called), so there are no inline actions (e.g., "Mark done" from the notification).
- **No adaptive timing.** Notification times are user-configured but don't shift based on observed behavior patterns.
- **Background reconcile** exists and is solid (ledger + estimation), but only for local notifications.

### Recommendations

**N1. Wire push token registration into auth lifecycle (prerequisite for server push)** ✅ Done

- Call `registerPushToken()` after successful sign-in and on app resume when authenticated.
- Call `unregisterPushToken()` on sign-out.
- This unblocks all server-initiated push (streak-at-risk, reactivation, digest, social).

Implemented: `startPushTokenSync()` in `pushTokenService.ts` subscribes to `authIdentity` changes. Wired into `App.tsx` at startup. Sign-out handler in `SettingsHomeScreen.tsx` also calls `unregisterPushToken()`.

**N2. Implement streak-at-risk local notification (high priority)** ✅ Done

This is the single highest-impact retention notification and is already designed in `streak-retention-loops.plan.md`:
- Schedule for ~7 PM local when `currentShowUpStreak > 0` and `lastShowUpDate !== todayKey`.
- Cancel immediately when `recordShowUp` fires.
- Respect the 2/day cap and 6h spacing.
- Surface `allowStreakAndReactivation` toggle in `NotificationsSettingsScreen`.

Implemented in `NotificationService.ts` (`scheduleStreakAtRiskInternal`). Settings toggle added to `NotificationsSettingsScreen.tsx`. Default changed to `allowStreakAndReactivation: true`. 11 tests covering all edge cases.

**N3. Implement reactivation notification (high priority)** ✅ Done

- Schedule 3 days after last show-up; reschedule on each new show-up.
- Reference the user's broken streak length in copy.
- Navigate to Plan with `openRecommendations: true` on tap.
- Back off after 2 ignored reactivation notifications (track via delivery ledger).

Implemented in `NotificationService.ts` (`scheduleReactivationInternal`). Fires at user's daily show-up time, references previous streak length in copy, backs off after 2 ignores.

**N4. Add iOS notification action categories** ✅ Done

Register categories with inline actions to reduce friction:
- `activityReminder` → "Start Focus" / "Snooze 1h"
- `dailyShowUp` → "Open Today" / "Skip today"
- `streakAtRisk` → "Show up now"

This lets users take meaningful action without fully context-switching into the app.

Implemented in `NotificationService.ts`. `registerNotificationCategories()` called at init. Categories registered for `activityReminder` ("Start Focus", "Snooze 1h") and `streakAtRisk` ("Show up now"). Response handler routes actions appropriately.

**N5. Adaptive notification timing** ✅ Done

- Track the hour-of-day when the user typically completes their first Activity (rolling 14-day window).
- If the user consistently acts at 10 AM but their daily show-up is set to 8 AM, either: (a) suggest they adjust the time, or (b) auto-adjust within a ±2h window with a one-time "we moved your reminder" toast.
- This improves open rates by aligning with actual behavior.

Implemented: `activityCompletionHours` (rolling 14-day buffer) tracked in `useAppStore`. `scheduleDailyShowUpInternal` computes typical hour and shows a suggestion toast when divergent (debounced daily).

**N6. Richer notification copy rotation**

Current copy is static. Introduce 3–5 variants per notification type and rotate randomly, tracking which variants have the highest tap-through rate via PostHog:
- Daily show-up: rotate between Arc-anchored ("Your [Arc] is waiting"), streak-anchored ("Day [N] — keep it going"), and activity-anchored ("Pick up where you left off on [Activity]").
- Streak-at-risk: vary urgency level based on streak length (gentle at 3 days, more insistent at 30+).

---

## 3. Widget creation & use

### Current state

- **iOS Home Screen widget exists** (medium + large, Activities view, AppIntentConfiguration, iOS 17+).
- **Glanceable state sync** is solid — App Group JSON with focus session, next-up, today, momentum, and per-view activity data.
- **Widget adoption nudges** are feature-flagged with analytics (`WidgetPromptExposed`, `WidgetSetupViewed`, `AppOpenedFromWidget`).
- **Deep links** work: `source=widget` is detected, fires `AppOpenedFromWidget`, and completes the widget nudge.
- **No Lock Screen widget** (the doc and code confirm this).
- **No Android widget** (JS code is iOS-gated; no Android XML/Kotlin widget code).
- **Live Activities / Dynamic Island** have a native bridge but no visible UI in the widget extension.
- **Widget settings screen** exists but is discovery-oriented (steps to add), not configuration-oriented.

### Recommendations

**W1. Lock Screen widget (highest-impact widget work)**

The Lock Screen is the most-viewed surface on any iPhone. Ship a compact Lock Screen widget:
- **Circular/inline variant:** Show streak flame + count (acts as ambient streak reminder without a notification).
- **Rectangular variant:** "Next up: [Activity title]" with tap-to-open.

This creates a passive retention loop — every time the user glances at their phone, they see their streak or next activity.

**W2. Small Home Screen widget**

The current widgets only support medium + large. A small (2x2) widget significantly increases adoption because it fits in more layouts:
- Show: streak count + flame icon + "Tap to show up."
- Or: next scheduled activity title + time.

**W3. Live Activities for Focus sessions (complete the bridge)**

The native bridge exists but there's no visible Dynamic Island / Lock Screen Live Activity UI. Completing this:
- Shows a countdown timer on the Lock Screen and Dynamic Island during Focus.
- Provides pause/resume/end controls without unlocking.
- Reinforces that "Kwilt is actively helping me right now" — critical for perceived value.

**W4. Android widget (parity)**

If Android is a meaningful user segment, parity matters. Start with a single small widget (streak + next up) using React Native's Expo widget community packages or native Kotlin.

**W5. Widget-to-streak reinforcement loop** ✅ Done

When a user opens the app from a widget and it results in a show-up, celebrate it specifically:
- "Widget → Show-up! Your [N]-day streak continues."
- Track `AppOpenedFromWidget → recordShowUp` conversion in PostHog to measure widget ROI.

Implemented: `WidgetAssistedShowUp` analytics event. Session-scoped `markOpenedFromWidget()` / `consumeOpenedFromWidget()` in `widgetAttribution.ts`. Fires when a widget-origin session leads to a show-up.

**W6. Proactive widget nudge timing** ✅ Done

Currently widget nudges are gated by `appOpenCount` and FTUE completion. Refine:
- Show the widget nudge **immediately after the first streak milestone (day 3)** — the user now has something worth glancing at.
- If the user has a streak ≥ 7 and hasn't added a widget, show a more assertive nudge: "Keep your streak visible — add the Kwilt widget to your Lock Screen."

Implemented in `useWidgetNudge.ts`. Streak-based fast-track at streak >= 3. Assertive copy variant `lock_screen_streak` at streak >= 7.

---

## 4. Potential improvements to the Streaks system

### Current state

- **Show-up streak** is local-first, keyed on `lastShowUpDate` (local calendar day). Only Activity completion counts.
- **Grace system** is partially implemented:
  - 1 free grace day per ISO week (resets weekly).
  - Shields (Pro-only) are capped at 3. ~~`addStreakShields` had no call sites.~~ Shield earning is now wired into `recordShowUp` (1 shield per 7-day milestone, max 1/week, cap 3) — Sprint 1.
  - Grace consumption on missed days works correctly.
- **`streakProtection.ts`** has a more sophisticated model (weekly shield earning, 48h repair window, repair cost of 2 shields) but is **not wired** into `recordShowUp`.
- **Celebrations** exist for daily streak milestones and streak-saved events.
- **Server milestones** are recorded to `user_milestones` for `streak_7`, `streak_30`, etc.
- **No streak leaderboard, no social streak sharing, no streak-based rewards.**

### Recommendations

**S1. Wire shield earning for Pro users (critical — Pro feature is advertised but broken)** ✅ Done

`addStreakShields` exists but is never called. Implement the earning logic from `streakProtection.ts`:
- Award 1 shield per 7 consecutive "covered" days (days where the user showed up or used grace).
- Cap at 3 shields, max 1 per ISO week.
- This makes Pro shields a real, meaningful retention feature instead of vaporware.

Implemented directly in `recordShowUp` in `useAppStore.ts`. Added `lastShieldEarnedWeekKey` to `streakGrace` type. 5 tests covering Pro/free, cap, weekly limit, and non-milestone streaks.

**S2. Integrate the repair window** ✅ Done

The 24–48h repair window in `streakProtection.ts` is well-designed and tested. Wire it into `recordShowUp`:
- When a streak would reset, instead of immediately going to 1, enter a "broken but repairable" state.
- Show an amber/pulsing StreakCapsule during the repair window.
- If the user shows up within the window, celebrate the recovery.
- This reduces the "I missed one day, my 30-day streak is gone, I quit" cliff — the #1 reason streaks cause churn instead of preventing it.

**S3. Streak milestones with tangible rewards** ✅ Done

Currently milestones are recorded server-side but have no user-facing reward beyond a celebration animation. Add:
- **7-day streak:** unlock a bonus AI credit pack (+5 credits).
- **14-day streak:** unlock a Pro feature preview (e.g., 24h of saved views).
- **30-day streak:** unlock a profile badge + bonus credits (+15 credits).

This creates a **progression system** where streaks feel like they're building toward something, not just a number.

Implemented: +5 bonus AI credits at each milestone (7, 14, 30, 60, 100 days) via `addBonusGenerativeCreditsThisMonth`. Toast and `MilestoneRecorded` analytics event. Pro previews at streak 7 (Focus Mode 24h) and streak 14 (Saved Views 72h) — see U2.

**S4. "Streak Sunday" weekly recap** ✅ Done

Every Sunday (or the user's configured week-start day), show an in-app card:
- "This week: [X] days showed up, [Y] activities completed, streak at [N] days."
- Include a mini-graph of the week (7 dots, filled/empty).
- If streak grew, celebrate. If it shrank, frame compassionately with a CTA to plan the coming week.

This is a retention surface that also seeds the habit of weekly planning.

Implemented: `StreakWeeklyRecapCard` component with 7-dot visualization, displayed on Sundays at top of Plan canvas. Dismissible per-week via `lastWeeklyRecapDismissedWeekKey`.

**S5. Social streak sharing**

Add a "Share your streak" action from the StreakCapsule tap (Settings streak card):
- Generate a branded image: "I've showed up for my life [N] days in a row on Kwilt."
- Use the native share sheet.
- Include a referral deep link in the share text.

This turns streaks into a growth channel.

**S6. Streak-aware notification copy** ✅ Done

All notification types should be streak-aware:
- Daily show-up: "Day [N+1] starts now. Open Kwilt to keep your streak alive."
- Activity reminder: "Time for [Activity]. Completing this continues your [N]-day streak."
- Goal nudge: "Your [Goal] needs attention — and your [N]-day streak is counting on you."

Implemented: daily show-up and activity reminder titles now append " — day N" when streak ≥ 2. 2 tests covering the suffix logic.

---

## 5. Upsell patterns & conversion optimization

### Current state

- **RevenueCat integration** is complete (purchase, restore, entitlements, webhook mirror).
- **Paywall surfaces:** global drawer (`PaywallDrawer`), settings card, More screen row, credits interstitial, inline in AI surfaces.
- **Free limits:** 1 Arc, 3 Goals/Arc, 50 AI credits/month, no saved views, no focus mode, no attachments, no Unsplash banners.
- **Paywall reasons** are well-categorized but some are reserved/unused (`pro_only_calendar_export`, `pro_only_ai_scheduling`).
- **Annual nudge** appears when streak ≥ 3 and user is on monthly billing.
- **Pro Tools trial** entitlement exists in RevenueCat and DB but the app code doesn't clearly surface it.
- **No free trial** is offered from the paywall (no introductory offer pricing shown).
- **No "value preview" moments** where free users experience Pro features before hitting a gate.

### Recommendations

**U1. Behavioral upsell on streak break (already designed, needs implementation)** ✅ Done

Implement the plan from `streak-retention-loops.plan.md`:
- When a free user's streak breaks and shields would have saved it, show: "Pro shields would have saved your [N]-day streak."
- CTA to paywall with `pro_only_streak_shields` reason.
- This is the highest-emotion, highest-intent conversion moment in the app.

Implemented: `pro_only_streak_shields` PaywallReason with contextual copy in `PaywallDrawer.tsx`. Trigger fires in `recordShowUpWithCelebration` for free users with 0 shields when streak breaks.

**U2. Time-limited Pro previews at streak milestones** ✅ Done

Instead of hard gates, let free users **taste** Pro:
- At 7-day streak: "Unlock Focus Mode for 24 hours."
- At 14-day streak: "Try Saved Views for 3 days."
- After preview expires, show a gentle "Liked [feature]? Keep it with Pro" prompt.

This is more effective than limit-triggered frustration because the user has already experienced value.

Implemented: `proPreview` state in store. `canUseProTools` helper in `proToolsAccess.ts` checks `isPro || isProToolsTrial || proPreview`. On expiry, opens paywall with `pro_preview_expired` source + upsell toast. Also fixed `isProToolsTrial` bug — was only gating attachments, now gates all Pro Tools features (views, focus, banners). Analytics: `ProPreviewGranted`, `ProPreviewExpired`.

**U3. Surface introductory offers / free trial** ✅ Done

RevenueCat supports introductory offers (free trial, pay-up-front, pay-as-you-go) via App Store Connect. Currently the paywall shows `priceString` but doesn't detect or surface `introPrice`:
- Add intro offer detection to `getProSkuPricing()`.
- Show "Start 7-day free trial" as the primary CTA for new users who haven't subscribed.
- This is table-stakes for subscription app conversion.

Implemented: `ProSkuPricing.introPrice` extracted in `getProSkuPricing()`. `ManageSubscriptionScreen` shows "Start N-unit free trial" CTA when intro offer detected. `FreeTrialStarted` analytics event added.

**U4. Upgrade prompt after AI credit exhaustion** ✅ Done

When `tryConsumeGenerativeCredit` fails (limit reached), the current UX shows `PaywallContent` inline. Improve:
- Show a "You've used all 50 credits this month" interstitial with a progress visualization of what those credits accomplished.
- Include a "See what Pro unlocks" CTA that shows Pro credits (1000/month) alongside the user's usage pattern.
- Frame it as "You're using Kwilt's AI enough to benefit from Pro" — a positive signal, not a punishment.

Implemented in `PaywallDrawer.tsx`. Progress bar, monthly AI interaction count, and Pro 1,000 credits/month comparison shown for `generative_quota_exceeded` reason.

**U5. Contextual upgrade CTAs in empty states**

Several empty states guide users toward creating content. Add Pro-aware variants:
- Activities list empty state (Pro user): include "Try a saved view to organize your Activities."
- Plan empty state: "Pro users can auto-schedule activities to their calendar."
- These are soft, discovery-oriented — not gates.

**U6. Annual plan conversion campaign for monthly subscribers**

The streak-based annual nudge (streak ≥ 3) is a good start. Extend:
- After 30 days on monthly billing, show a "You've been a member for a month — save 25% by switching to annual" card in settings.
- After 90 days, escalate: "You've invested $[X] in 3 months. Annual would have saved you $[Y]."
- Tie this to the Chapter system: "Your journey over the last month" → "Lock in a full year of growth."

---

## 6. Cross-cutting: closing the loops

The recommendations above are strongest when they reinforce each other. Here are the key **loop closures** to prioritize:

### Loop 1: Streak → Notification → Widget → Show-up → Streak

1. User builds a streak (Activity completion).
2. Lock Screen widget shows the streak count passively (ambient reminder).
3. If no show-up by evening, streak-at-risk notification fires.
4. User taps notification or widget → completes an Activity → streak continues.
5. Celebration reinforces the loop.

### Loop 2: Onboarding → Activation email → First streak → Widget nudge → Retention

1. User signs up → welcome email (day 0).
2. Day 1 email nudges first Activity completion → first show-up recorded.
3. Day 3 email recaps progress → user has a 3-day streak.
4. In-app widget nudge appears at streak day 3.
5. User adds widget → now has passive visibility → returns daily.

### Loop 3: Streak break → Repair window → Pro upsell → Conversion

1. User misses a day → streak enters repair state (amber StreakCapsule).
2. Streak-at-risk notification fires.
3. If user returns within 24h → streak repaired → celebration.
4. If streak breaks → "Pro shields would have saved this" → paywall.
5. Even if user doesn't convert, the repair window gives them a reason to come back.

### Loop 4: AI usage → Credit exhaustion → Upgrade → Deeper engagement

1. Free user uses AI coaching actively → hits 50 credit limit.
2. Credit exhaustion interstitial shows value of their usage.
3. User upgrades to Pro → gets 1000 credits/month.
4. Deeper AI engagement → better Arcs/Goals → more Activities → more show-ups → longer streaks.

---

## 7. Prioritized implementation order

| Priority | Item | Loop | Est. effort | Status |
|----------|------|------|-------------|--------|
| P0 | N2: Streak-at-risk notification | 1, 3 | S | **Done** |
| P0 | N3: Reactivation notification | 1 | S | **Done** |
| P0 | S1: Wire shield earning for Pro | 3 | S | **Done** |
| P0 | S6: Streak-aware notification copy | 1 | S | **Done** |
| P1 | S2: Integrate repair window | 3 | M | **Done** |
| P1 | N1: Wire push token registration | All | S | **Done** |
| P1 | W1: Lock Screen widget | 1, 2 | M | |
| P1 | U1: Pro upsell on streak break | 3 | S | **Done** |
| P1 | U3: Surface intro offers / free trial | 4 | S | **Done** |
| P2 | E1: Welcome + activation email drip | 2 | L | **Done** |
| P2 | W2: Small Home Screen widget | 1 | M | |
| P2 | W3: Complete Live Activities | 1 | M | |
| P2 | S3: Streak milestones with rewards | 1 | M | **Done** |
| P2 | U2: Time-limited Pro previews | 4 | M | **Done** |
| P2 | N4: iOS notification action categories | 1 | S | **Done** |
| P3 | E2: Weekly Chapter digest email | 2 | M | **Done** |
| P3 | E3: Streak-break / win-back emails | 3 | M | |
| P3 | S4: "Streak Sunday" weekly recap | 1 | S | **Done** |
| P3 | S5: Social streak sharing | Growth | S | Deferred |
| P3 | N5: Adaptive notification timing | 1 | M | **Done** |
| P3 | U4: Improved credit exhaustion UX | 4 | S | **Done** |
| P3 | W4: Android widget | 1 | L | |

**S** = small (< 1 week), **M** = medium (1–2 weeks), **L** = large (2+ weeks)

---

## 8. Success metrics

| Metric | Current baseline | 90-day target |
|--------|-----------------|---------------|
| D7 retention (% of new users active on day 7) | Unmeasured | Instrument + establish baseline |
| D30 retention | Unmeasured | Instrument + establish baseline |
| Median streak length (active users) | Unknown | 7+ days |
| % of active users with notifications enabled | Unknown | > 60% |
| Widget adoption rate (iOS) | Tracked (`AppOpenedFromWidget`) | > 15% of iOS users |
| Free → Pro conversion rate | Unknown | > 3% of active free users |
| Streak-at-risk notification → show-up rate | Shipped (Sprint 1) | > 25% tap-through |
| Reactivation notification → return rate | Shipped (Sprint 1) | > 10% return within 48h |
| Welcome drip open rate | Shipped (Sprint 4, Resend Automation) | > 40% Day 0 open rate |
| Pro preview → conversion rate | Shipped (Sprint 4) | Instrument + establish baseline |

---

## Relationship to existing docs

This strategy doc sits **above** the following and should be referenced as the coordination layer:

- `docs/engagement-and-motivation-system.md` — behavioral model (this doc adds implementation gaps + priorities)
- `docs/notifications-paradigm-prd.md` — notification system PRD (this doc adds streak/reactivation scheduling + email)
- `docs/apple-ecosystem-opportunities.md` — widget/ecosystem strategy (this doc adds Lock Screen + adoption loop)
- `docs/value-realization-roadmap.md` — product roadmap (this doc adds growth-specific sequencing)
- `.cursor/plans/streak-retention-loops.plan.md` — streak execution plan (this doc provides the broader context for those tasks)
- `docs/ai-credits-and-rewards.md` — credit system (this doc adds upsell refinements around credits)
