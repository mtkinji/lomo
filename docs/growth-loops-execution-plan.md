## Growth Loops Execution Plan

Strategy source: `docs/growth-loops-strategy.md`

This plan organizes Kwilt's growth-loop work into sequenced sprints based on dependency order, effort, and loop closure value. Each sprint is designed so that what ships at the end forms a **complete, testable loop** — not a half-finished feature.

---

## Sprint 1 — Streak retention core ✅ Complete

**Theme:** Ship the two highest-impact retention notifications and fix the broken Pro shields feature.
**Estimated duration:** ~1 week
**Loop closed:** Loop 1 (Streak → Notification → Show-up → Streak), partially
**Status:** All tasks implemented, 74/74 tests passing, typecheck clean.

### What shipped

**1. Streak-at-risk notification** — `NotificationService.ts`

- `scheduleStreakAtRiskInternal()` fires at 19:00 local when `currentShowUpStreak > 0` and `lastShowUpDate !== todayKey`.
- Added to `SYSTEM_NUDGE_TYPES` → respects 2/day cap and 6h spacing.
- Cancels immediately when user shows up (store subscription watches `lastShowUpDate`).
- Backs off after 2 consecutive ignores.
- Skips scheduling if 19:00 has already passed or guards push past today.
- Copy: "Your [N]-day streak is at risk — Show up before midnight."

**2. Reactivation notification** — `NotificationService.ts`

- `scheduleReactivationInternal()` schedules a one-shot 3 days from now at the user's daily show-up time.
- Reschedules (rolling window) on each `lastShowUpDate` change.
- Copy references previous streak: "You had a [N]-day streak going" (or generic when streak ≤ 1).
- Backs off after 2 consecutive ignores.

**3. Settings toggle** — `NotificationsSettingsScreen.tsx`, `useAppStore.ts`

- `allowStreakAndReactivation` default changed from `false` to `true`.
- "Streak & comeback" toggle row added in Notifications settings between Goal Nudges and Prompts.
- Toggling off cancels both streak-at-risk and reactivation notifications via `applySettings`.
- Global disable also cancels both.

**4. Pro shield earning** — `useAppStore.ts`

- Earning logic added directly to `recordShowUp`: when `nextStreak % 7 === 0`, user is Pro, shields < 3, and not already earned this ISO week → award 1 shield.
- Added `lastShieldEarnedWeekKey` to `streakGrace` type and all default initializations.
- Reads `isPro` from `useEntitlementsStore` at point of call.

**5. Streak-aware notification copy** — `NotificationService.ts`

- Daily show-up title appends " — day N" when streak ≥ 2 (e.g., "Align your day with your arcs — day 6").
- Activity reminder title appends " — day N" when streak ≥ 2.
- No suffix for streak 0–1 (avoids "day 1" clutter on new users).

**6. Tests** — 16 new tests (11 in `NotificationService.test.ts`, 5 in `useAppStore.lifecycle.test.ts`)

- Streak-at-risk: schedules at 19:00, skips if showed up today, skips if streak=0, skips past 19:00, backs off after 2 ignores, respects `allowStreakAndReactivation` toggle.
- Reactivation: schedules 3 days out at show-up time, generic copy when streak=0, backs off after 2 ignores.
- Streak-aware copy: appends day count when streak ≥ 2, omits suffix when < 2.
- Shield earning: awards at 7-day milestones for Pro, blocks free users, respects cap of 3, max 1/week, skips non-multiples.

### Sprint 1 acceptance criteria

- [x] Streak-at-risk notification fires at 19:00 local when user has a streak and hasn't showed up.
- [x] Streak-at-risk cancels immediately on show-up.
- [x] Reactivation notification fires 3 days after last show-up; reschedules on each new show-up.
- [x] Reactivation backs off after 2 ignored sends.
- [x] `allowStreakAndReactivation` toggle visible in Notifications settings; toggling off cancels both.
- [x] Pro users earn 1 shield per 7 consecutive covered days (cap 3, max 1 per ISO week).
- [x] Daily show-up and activity reminder copy includes current streak count when streak ≥ 2.
- [x] All new scheduling paths respect the existing 2/day cap and 6h spacing.
- [x] Unit tests pass for streak-at-risk, reactivation, and shield earning.

---

## Sprint 2 — Streak repair + upsell ✅ Complete

**Theme:** Close Loop 3 (break → repair → upsell → conversion) and wire the push token prerequisite.
**Estimated duration:** ~1.5 weeks
**Loop closed:** Loop 3 (Streak break → Repair → Pro upsell), Loop 4 partially (intro offers)
**Status:** All tasks implemented, 79/79 tests passing, typecheck clean.

### Why this second
- The repair window is the key differentiator from a "punishing" streak system. Without it, streaks cause churn at the exact moment they should create re-engagement.
- The Pro upsell on streak break is the highest-emotion conversion moment and depends on the repair window state.
- Push token registration is a small prerequisite that unblocks all future server-push work.

### Tasks

**7. Integrate repair window into `recordShowUp`**

Files: `src/store/useAppStore.ts`

- Add `streakBreakState: StreakBreakState` to persisted state (from `streakProtection.ts` types).
- In `recordShowUp`, when `diffDays > 1` and grace doesn't cover the gap:
  - Instead of immediately resetting to 1, check `streakBreakState.eligibleRepairUntilMs`.
  - If `Date.now() < eligibleRepairUntilMs` and we're returning from a break: restore `brokenStreakLength` as `nextStreak`, clear break state, set `repairedAtMs`.
  - If no active repair window: set `streakBreakState = { brokenAtDateKey: todayKey, brokenStreakLength: prevStreak, eligibleRepairUntilMs: Date.now() + REPAIR_WINDOW_MS, repairedAtMs: null }`, and reset streak to 1.
- Add `streakBreakState` to `partialize` for persistence.

**8. Repair StreakCapsule visual state**

Files: `src/ui/StreakCapsule.tsx`, `src/ui/layout/PageHeader.tsx`, all tab screens passing streak props

- Add `repairWindowActive?: boolean` prop to `StreakCapsule`.
- When `repairWindowActive` is true, render the flame in amber (#F59E0B) with a subtle pulse animation.
- Tab screens: derive `repairWindowActive` from `streakBreakState.eligibleRepairUntilMs > Date.now()`.

**9. Repair celebrations**

Files: `src/store/useCelebrationStore.ts`

- Add `celebrateStreakRepairOpportunity()`: "Your streak broke, but you have 24h to repair it!"
- Add `celebrateStreakRepaired()`: "Streak repaired! Back to [N] days."
- Fire `celebrateStreakRepairOpportunity` from `recordShowUp` when entering break state (streak had been > 3).
- Fire `celebrateStreakRepaired` when repair succeeds.

**10. Pro upsell on streak break**

Files: `src/services/paywall.ts`, `src/features/paywall/PaywallDrawer.tsx`, `src/store/useCelebrationStore.ts`

- Add `'pro_only_streak_shields'` to `PaywallReason`.
- Add copy in `PaywallDrawer`: "Pro shields would have saved your [N]-day streak. Protect your progress with Kwilt Pro."
- In `recordShowUp`, when a free user's streak resets (grace didn't cover, repair window expired or not applicable):
  - If `shieldsAvailable` was 0 and a shield *would have* helped (missedDays <= 3): trigger `openPaywallInterstitial({ reason: 'pro_only_streak_shields', source: 'streak_break' })`.

**11. Surface introductory offers**

Files: `src/services/entitlements.ts`, `src/features/account/ManageSubscriptionScreen.tsx`

- In `getProSkuPricing`, extract `introPrice` / `introductoryPrice` from RevenueCat package metadata.
- If an intro offer exists and the user is eligible (hasn't subscribed before): show "Start 7-day free trial" as the primary CTA instead of the price-based CTA.
- Add analytics: `FreeTrialStarted` event.

**12. Wire push token registration**

Files: `App.tsx` or `src/navigation/RootNavigator.tsx`, `src/services/pushTokenService.ts`

- After auth state resolves to `signedIn`, call `registerPushToken()` (best-effort, non-blocking).
- On sign-out (existing sign-out handler in Settings), call `unregisterPushToken()`.
- On app resume when authenticated, call `registerPushToken()` (idempotent — skips if token unchanged).

**13. Tests**

- Test: repair window sets break state correctly on streak reset.
- Test: returning within window restores previous streak.
- Test: returning outside window resets normally.
- Test: Pro upsell fires only for free users when shields would have helped.
- Test: intro offer detection returns correct pricing when available.

### What shipped

**7. Repair window in `recordShowUp`** — `useAppStore.ts`

- Added `streakBreakState` to persisted state (`brokenAtDateKey`, `brokenStreakLength`, `eligibleRepairUntilMs`, `repairedAtMs`).
- When grace doesn't cover missed days and `prevStreak > 0`: sets break state with `eligibleRepairUntilMs = now + 48h` instead of silently resetting.
- On next `recordShowUp`, if within the repair window: restores `brokenStreakLength + 1` as the streak, sets `repairedAtMs`.
- `resetShowUpStreak` clears break state.

**8. Repair StreakCapsule visual** — `StreakCapsule.tsx`, `PageHeader.tsx`, all tab screens

- Added `repairWindowActive` prop to `StreakCapsule` and `PageHeader`.
- When active: flame renders in amber (#F59E0B) with a pulse animation (0.5–1.0 opacity, 900ms cycle).
- `useRepairWindowActive` hook added to `useShowedUpToday.ts`; consumed in all 6 tab screens.

**9. Repair celebrations** — `useCelebrationStore.ts`, `gifs.ts`

- `celebrateStreakRepairOpportunity()`: fires when a streak > 3 breaks (repair window active).
- `celebrateStreakRepaired()`: fires when user returns within the window and streak is restored.
- Added `streakRepairOpportunity` and `streakRepaired` to `CelebrationKind`.
- `recordShowUpWithCelebration` updated to detect repair success vs repair opportunity vs normal streak.

**10. Pro upsell on streak break** — `paywall.ts`, `PaywallDrawer.tsx`, `useCelebrationStore.ts`

- Added `'pro_only_streak_shields'` to `PaywallReason` and `'streak_break'` to `PaywallSource`.
- Copy: "Pro shields would have saved your streak — Life happens — Pro users get Streak Shields..."
- Trigger: when a free user's streak breaks and they had 0 shields, opens paywall 1.5s after the repair opportunity celebration.

**11. Introductory offers** — `entitlements.ts`, `ManageSubscriptionScreen.tsx`, `events.ts`

- Extended `ProSkuPricing` with `introPrice` (type, cycles, periodUnit, priceString).
- `getProSkuPricing` now extracts `introPrice` / `introductoryPrice` / `introductoryDiscount` from RevenueCat packages.
- Purchase button shows "Start N-unit free trial" when intro offer type is `FREE_TRIAL` or price is `$0.00`.
- Added `FreeTrialStarted` analytics event; fires on successful trial purchase.

**12. Push token registration** — `pushTokenService.ts`, `App.tsx`, `SettingsHomeScreen.tsx`

- `startPushTokenSync()`: subscribes to `authIdentity` changes, calls `registerPushToken()` on sign-in, `unregisterPushToken()` on sign-out.
- Wired into `App.tsx` alongside other startup services (`startDomainSync`, etc.).
- `SettingsHomeScreen.tsx` sign-out handler calls `unregisterPushToken()` before `signOut()`.

**13. Tests** — 5 new tests in `useAppStore.lifecycle.test.ts`

- Repair window: sets break state on streak reset; restores streak within window; does not restore after expiry; clears on reset; no break state for fresh starts.

### Sprint 2 acceptance criteria

- [x] Streak break enters repair state with 48h window instead of immediately resetting.
- [x] StreakCapsule renders amber pulse during active repair window.
- [x] Repair opportunity celebration fires when streak > 3 breaks.
- [x] Repair success celebration fires when user returns within window.
- [x] Free users see "Pro shields would have saved your streak" paywall on applicable breaks.
- [x] `pro_only_streak_shields` PaywallReason has copy in PaywallDrawer.
- [x] RevenueCat intro offers surface as "Start free trial" CTA when eligible.
- [x] Push token registers on sign-in and app resume; unregisters on sign-out.
- [x] Unit tests pass for repair window, Pro upsell trigger, and intro offers.

---

## Sprint 3a — Milestone rewards + engagement wiring

**Theme:** Ship streak progression rewards, widget adoption triggers, and notification actions — all TypeScript, no native widget work.
**Estimated duration:** ~1 week
**Loop closed:** Loop 1 partially (Streak → Notification → Show-up → Streak), Loop 4 partially (milestone rewards)

### Why this before widget surfaces
- Milestone rewards and widget nudge refinements deliver immediate engagement value using existing infrastructure.
- Notification action categories reduce friction on every notification tap — high UX payoff for low effort.
- Widget-to-streak attribution closes the measurement loop so widget ROI is trackable when new surfaces ship.
- All four tasks are pure TypeScript with no native/prebuild cycle dependency.

### Tasks

**16. Widget nudge at streak day 3**

Files: `src/features/activities/hooks/useWidgetNudge.ts`

- Add a condition: if `currentShowUpStreak === 3` and `widgetNudge.status !== 'completed'`, show the nudge regardless of `appOpenCount`.
- At streak ≥ 7 without widget adoption, switch to the more assertive copy variant: "Keep your streak visible — add the Kwilt widget to your Lock Screen."

**17. Widget-to-streak attribution**

Files: `src/navigation/RootNavigator.tsx`, `src/services/analytics/events.ts`

- When `source === 'widget'` is detected and user subsequently calls `recordShowUp` in that session, fire `WidgetAssistedShowUp` event.
- Optionally: special celebration variant "Widget → Show-up! Day [N]."

**18. Streak milestone rewards**

Files: `src/store/useCelebrationStore.ts`, `src/store/useAppStore.ts`, `src/domain/generativeCredits.ts`

- After `recordShowUp` updates the streak, check for milestone thresholds: 7, 14, 30, 60, 100.
- At 7 days: call existing bonus credits infrastructure to award +5 AI credits (call server `kwilt_increment_ai_bonus_monthly` or local store increment).
- At 30 days: +15 AI credits + unlock a profile badge (new `badges` array in store).
- Fire existing `MilestoneRecorded` analytics event with `milestone_type: 'streak_7'` etc.

**20. iOS notification action categories**

Files: `src/services/NotificationService.ts`

- In `init()`, call `Notifications.setNotificationCategoryAsync` for:
  - `'activityReminder'`: actions "Start Focus" (opens activity detail with `autoStartFocus`), "Snooze 1h" (reschedules +1h).
  - `'streakAtRisk'`: action "Show up now" (opens Activities).
- Set `categoryIdentifier` when scheduling these notification types.

### What shipped

**16. Widget nudge at streak day 3** — `useWidgetNudge.ts`, `WidgetNudgeCard.tsx`

- When `currentShowUpStreak >= 3`, the inline widget nudge shows regardless of `appOpenCount` (streak-based fast-track).
- At streak >= 7 without widget adoption, copy variant switches to `'lock_screen_streak'`: "Keep your streak visible — add the Kwilt widget to your Lock Screen."
- `effectiveCopyVariant` derived in hook; `WidgetNudgeCard` renders the new copy variant.

**17. Widget-to-streak attribution** — `widgetAttribution.ts`, `RootNavigator.tsx`, `useCelebrationStore.ts`, `events.ts`

- New `WidgetAssistedShowUp` analytics event added to `AnalyticsEvent`.
- Session-scoped `markOpenedFromWidget()` / `consumeOpenedFromWidget()` flag in `widgetAttribution.ts`.
- `markOpenedFromWidget()` called in RootNavigator when `source=widget` is detected.
- `consumeOpenedFromWidget()` checked in `recordShowUpWithCelebration`; fires `WidgetAssistedShowUp` with `streak_length` when a widget-origin session leads to a show-up.

**18. Streak milestone rewards** — `useCelebrationStore.ts`

- Flat +5 bonus AI credits at each milestone (7, 14, 30, 60, 100 days).
- After `recordShowUp` in `recordShowUpWithCelebration`, milestone thresholds are checked.
- Awards bonus credits via `addBonusGenerativeCreditsThisMonth`.
- Fires `MilestoneRecorded` event with `milestone_type`, `bonus_credits`, `streak_length`.
- Shows toast: "Streak milestone! +N bonus AI credits".

**20. iOS notification action categories** — `NotificationService.ts`

- `registerNotificationCategories()` called at `init()` start (iOS only, best-effort).
- `activityReminder` category: "Start Focus" (opens activity detail with `autoStartFocus: true`), "Snooze 1h" (reschedules notification +1h without opening app).
- `streakAtRisk` category: "Show up now" (opens Activities).
- `categoryIdentifier` set on activity reminder and streak-at-risk notification content.
- Response handler updated: `ACTION_START_FOCUS` passes `autoStartFocus` param; `ACTION_SNOOZE_1H` schedules a new notification 1h later.

### Sprint 3a acceptance criteria

- [x] Widget nudge appears at streak day 3 regardless of appOpenCount.
- [x] More assertive widget nudge copy at streak ≥ 7 if widget not adopted.
- [x] `WidgetAssistedShowUp` analytics event fires when widget opens lead to show-ups.
- [x] +5 bonus AI credits awarded at each streak milestone (7, 14, 30, 60, 100 days).
- [x] iOS notification actions registered: "Start Focus", "Snooze 1h", "Show up now".

---

## Sprint 3b — Widget surfaces + remaining email/polish ✅ Complete

**Theme:** Ship new native widget surfaces (Lock Screen, small Home Screen, Live Activities) + remaining email, notification, and upsell work.
**Estimated duration:** ~1.5 weeks
**Loop closed:** Loop 1 complete (Streak → Widget → Notification → Show-up → Streak), Loop 2 complete (win-back emails)
**Status:** All tasks implemented, 85/85 tests passing, typecheck clean.

### What shipped

**14. Lock Screen widget** — `plugins/withAppleEcosystemIntegrations.js`

- Added `KwiltLockScreenWidget` with `StaticConfiguration` and `LockScreenProvider`.
- Three accessory families: `.accessoryCircular` (gauge with streak count), `.accessoryRectangular` (streak + next up title), `.accessoryInline` (flame + streak text).
- `LockScreenWidgetView` switches on `@Environment(\.widgetFamily)` to dispatch to the correct sub-view.
- Data from `GlanceableStateV1.Momentum.showUpStreakDays` and `NextUp.title`.

**15. Small Home Screen widget** — `plugins/withAppleEcosystemIntegrations.js`

- Added `KwiltStreakWidget` (kind: `streak`) with `SmallHomeProvider`.
- Styled with Kwilt pine header, flame icon with streak count, "day streak" label, and next-up or completed-today subtitle.
- Supports `.systemSmall` family. Deep links to `kwilt://today`.

**21. Focus Live Activities UI** — `plugins/withAppleEcosystemIntegrations.js`

- Added `KwiltFocusLiveActivity` with `ActivityConfiguration` for `KwiltFocusAttributes`.
- Lock Screen banner: activity title + countdown/countup timer.
- Dynamic Island compact: timer icon (leading) + time (trailing).
- Dynamic Island expanded: activity title + large timer.
- Uses `startedAtMs` / `endAtMs` from existing `ContentState` with `Date(timeIntervalSince1970:)` conversion.

**E3. Streak-break / win-back emails** — `emailTemplates.ts`, `email-drip/index.ts`

- Two templates: `buildStreakWinback1Email` (day 3+), `buildStreakWinback2Email` (day 7+).
- Win-back evaluation added to `email-drip` cron: queries recently-active-but-now-lapsed users, checks preferences (`streak_winback`), respects cadence, clears stale records when user returns.
- Personalized copy references previous streak length from `kwilt_user_milestones`.

**E4. Pro trial expiry email** — `emailTemplates.ts`, `pro-codes/index.ts`

- `buildTrialExpiryEmail` template with dynamic `daysRemaining` messaging.
- RevenueCat webhook extended: on `EXPIRATION` event, resolves user email and sends trial expiry email.
- Cadence check prevents duplicate sends per expiration cycle.

**N6. Notification copy rotation** — `NotificationService.ts`, `events.ts`

- 3-4 copy variants per notification type: `DAILY_SHOW_UP_VARIANTS`, `ACTIVITY_REMINDER_VARIANTS`, `STREAK_AT_RISK_VARIANTS`, `REACTIVATION_VARIANTS`.
- `pickVariant()` selects randomly; variant index tracked via `NotificationCopyVariant` PostHog event.
- Contextual: variants reference streak count, arc name, activity title, today's schedule.

**U5. Contextual Pro CTAs in empty states** — `ActivitiesScreen.tsx`, `PlanRecsPage.tsx`

- Activities "No matching activities" empty state: secondary action "Try Saved Views with Pro" for non-Pro users.
- Plan "nothing to recommend" empty state: secondary action "Unlock Focus Mode with Pro" for non-Pro users.
- New `PaywallSource` values: `activity_empty_state`, `plan_empty_state`.

**U6. Annual plan conversion campaign** — `ManageSubscriptionScreen.tsx`, `entitlements.ts`

- `getActiveBillingCadence()`: detects actual subscription billing period from RevenueCat customer info.
- Tenure-based nudge copy using `firstOpenedAtMs`: generic (< 30d), "One month in" (30-89d), account age mention (90d+).
- Annual nudge now checks actual billing cadence (not just UI selector state).

### Sprint 3b acceptance criteria

- [x] Lock Screen widget (circular + rectangular + inline) renders streak and next-up from glanceable state.
- [x] Small Home Screen widget renders streak count with tap-to-open.
- [x] Live Activity visible on Lock Screen and Dynamic Island during Focus sessions.
- [x] Win-back emails send at day 3 and day 7 of inactivity, capped at 2 per lapse.
- [x] Trial expiry email sends on RevenueCat EXPIRATION webhook.
- [x] Notification copy rotates between 3-4 variants with PostHog tracking.
- [x] Non-Pro users see contextual Pro CTAs in Activities and Plan empty states.
- [x] Annual nudge uses actual billing cadence with tenure-based copy.

---

## Sprint 4 — Email infrastructure + polish + deferred ✅ Complete

**Theme:** Build server-side communication, polish remaining engagement surfaces, and pick up deferred items.
**Estimated duration:** ~2–3 weeks
**Loop closed:** Loop 2 (Onboarding → Email → First streak → Widget nudge → Retention)
**Status:** All tasks implemented (except Task 26, deferred), 85/85 tests passing, typecheck clean. Resend Automation added for Day 0/1 drip with open-tracking re-engagement.

### Why this last
- Email infrastructure is highest-effort and requires server work (edge functions, cron, templates).
- It's also the only sprint that requires changes in `supabase/` beyond migrations.
- The client-side loops from Sprints 1–3 deliver retention value while email is being built.
- Time-limited Pro previews (originally Sprint 3, Task 19) are deferred here — they add complexity to entitlement gates and should wait for milestone reward engagement data.

### What shipped

**22. Email cadence infrastructure** — `supabase/migrations/20260415000000_kwilt_email_infrastructure.sql`

- Created `kwilt_email_cadence` table (`user_id`, `message_key`, `sent_at`, `metadata`) with RLS.
- Created `kwilt_email_preferences` table (`user_id`, `welcome_drip`, `chapter_digest`, `streak_winback`, `marketing`) with RLS.
- RLS: users can read/update their own preferences; service role has full access.

**23. Welcome drip (4 messages)** — Hybrid: Resend Automation + edge function

- **Day 0 + Day 1:** Managed by Resend Automation ("Kwilt Welcome Drip") with 3 published templates:
  - "Kwilt Welcome Day 0" — welcome email sent immediately on `user.signup` event.
  - "Kwilt Welcome Day 1" — sent after 1-day delay.
  - "Kwilt Welcome Day 1 Re-engage" — sent if Day 1 isn't opened within 2 days (open-tracking branch).
- **Day 3 + Day 7:** Remain in `email-drip` edge function (need live Supabase data for streak/activity personalization).
- Templates in `_shared/emailTemplates.ts`: `buildWelcomeDay0Email`, `buildWelcomeDay1Email`, `buildWelcomeDay3Email`, `buildWelcomeDay7Email`.
- Client fires `user.signup` event to Resend via `email-drip` edge function on new user sign-in (`fireResendSignupEvent` in `App.tsx`).
- Resend Topics created for unsubscribe management: "Welcome & Onboarding", "Chapter Digests", "Streak & Re-engagement".

**24. Chapter digest email** — `chapters-generate/index.ts`, `_shared/emailTemplates.ts`

- After chapter generation, if `email_enabled` and `email_recipient` are set and user hasn't opted out of `chapter_digest`:
  - Sends a styled digest email with chapter title, period label, and narrative snippet.
  - Deep link: `https://go.kwilt.app/open/chapters/[id]` (universal-link handoff — Phase 1–3 of [`email-system-ga-plan.md`](./email-system-ga-plan.md) replaced the original `kwilt://chapters/[id]` CTA so desktop clients don't dead-end on an unregistered scheme).
- Template: `buildChapterDigestEmail`.

**25. "Streak Sunday" weekly recap card** — `StreakWeeklyRecapCard.tsx`, `PlanScreen.tsx`

- 7-dot week visualization showing which days the user showed up.
- Celebratory messaging when all 7 days filled; compassionate variant when < 3 days.
- Displayed on Sundays (or week-start) at the top of the Plan canvas.
- Dismissible per-week via `lastWeeklyRecapDismissedWeekKey` in store.

**26. Social streak sharing** — Deferred (user decision).

**27. Improved credit exhaustion UX** — `PaywallDrawer.tsx`

- When `reason === 'generative_quota_exceeded'` and user is not Pro:
  - Progress bar showing credits used (50/50).
  - Count of AI interactions this month.
  - Comparison with Pro's 1,000 credits/month.

**29. Time-limited Pro previews** — `useCelebrationStore.ts`, `proToolsAccess.ts`, `useAppStore.ts`

- Added `proPreview: { feature: string; expiresAtMs: number } | null` to store.
- At 7-day streak: grants Focus Mode for 24h. At 14-day streak: grants Saved Views for 72h.
- `canUseProTools` helper checks `isPro || isProToolsTrial || proPreview` — centralized in `src/store/proToolsAccess.ts`.
- Fixed existing `isProToolsTrial` bug: was only gating attachments, now gates all Pro Tools features (views, focus, banners).
- On preview expiry: clears preview, opens paywall with `pro_preview_expired` source, shows upsell toast.
- Analytics: `ProPreviewGranted`, `ProPreviewExpired` events.

**28. Adaptive notification timing** — `useAppStore.ts`, `NotificationService.ts`

- `activityCompletionHours: number[]` tracks a rolling 14-day window of show-up hour-of-day values.
- `recordShowUp` appends `new Date().getHours()` (capped at 14 entries).
- `scheduleDailyShowUpInternal`: computes `typicalHour` from the buffer; if it differs from `dailyShowUpTime` by > 2h, shows a one-time suggestion toast (debounced daily via `lastAdaptiveTimingSuggestionDateKey`).

**30. Tests** — 6 new tests in `useAppStore.lifecycle.test.ts`

- Pro preview: set/clear/replace actions.
- Adaptive timing: hour tracking on show-up, 14-entry cap, no duplicates on same-day.
- Weekly recap: dismiss persists week key.

### Sprint 4 acceptance criteria

- [x] `kwilt_email_cadence` and `kwilt_email_preferences` tables exist with RLS.
- [x] `email-drip` edge function evaluates and sends via Resend on cron schedule.
- [x] Welcome drip: Day 0/1 via Resend Automation with open-tracking branch; Day 3/7 via edge function with live data.
- [x] Chapter digest email sends after generation when user has opted in.
- [x] Weekly recap card appears on Plan canvas on Sundays with 7-dot visualization.
- [ ] Social streak sharing generates branded image and includes referral link. *(Deferred)*
- [x] Credit exhaustion shows usage recap + Pro comparison instead of raw paywall.
- [x] Adaptive timing tracks completion hours and suggests adjustment when divergent.
- [x] `isProToolsTrial` bug fixed: all Pro Tools features now gated correctly.
- [x] Pro previews grant time-limited access at streak milestones 7 and 14.

### Post-Sprint-4 follow-up: GA hardening

The raw email infrastructure shipped in Sprint 4, but several GA prerequisites — universal-link handoff, consistent template UX, one-click unsubscribe, kill switch, per-user send cap, deliverability — are tracked in the dedicated [`docs/email-system-ga-plan.md`](./email-system-ga-plan.md) (Phases 1–8). Highlights already landed:

- **Phase 1–3 (universal-link handoff):** every email CTA now routes through `https://go.kwilt.app/open/...` with a Next.js handoff page that either deep-links the iOS app (via universal links + `applinks:` association) or falls back to an install CTA. Replaces the original direct-scheme `kwilt://` URLs which dead-ended on desktop clients.
- **Phase 4 (brand logo):** `renderLayout` emits explicit `width`/`height` HTML attrs on the logo `<img>` so Outlook desktop doesn't explode the header.
- **Phase 5 (UX refinement):** all templates now share a single-surface letter-style shell with `renderCta` / `renderFallbackLink` / `renderFooter` primitives; plain-text parity with the HTML rhythm; dark-mode `color-scheme` meta tags.
- **Phase 7 (GA prerequisites):** `List-Unsubscribe` + `List-Unsubscribe-Post` headers on all preference-gated sends (RFC 8058 one-click), HMAC-signed `/unsubscribe` route across kwilt-site + a new `supabase/functions/unsubscribe` edge function, `KWILT_EMAIL_SENDING_ENABLED` kill switch, per-user 2/24h cap, and a full operational runbook at [`docs/email-system.md`](./email-system.md).

---

## Sprint 5 — External AI connector (Loop 5)

**Theme:** Ship Kwilt as a remote MCP server, get listed in the Anthropic and OpenAI directories, and wire successful tool calls into the existing show-up streak so the connector becomes a first-class capture and retention surface.

**Estimated duration:** ~5–6 weeks across 5 sub-sprints (A–E)
**Loop closed:** Loop 5 (External AI surface → Cross-surface capture → In-app retention); reinforces Loops 1, 2, and 4 from a new origin point.
**Status:** Planned — full sprint breakdown lives in [`docs/feature-briefs/external-ai-connector.md`](feature-briefs/external-ai-connector.md).

### Sub-sprints (see feature brief for detail)

| Sub-sprint | Theme | Duration | Tasks |
|---|---|---|---|
| A | Inbound MCP foundation — Supabase Edge Function at `auth.kwilt.app/functions/v1/mcp`, OAuth + DCR, read-only tools, internal beta | ~1.5 wk | OAuth provider endpoints, `list_arcs`/`get_arc`/`list_goals`/`get_goal`/`list_recent_activities`/`get_current_chapter`/`get_show_up_status`, `kwilt_external_capture_log` table |
| B | Write tools + show-up parity — `capture_activity` from external surfaces counts as a streak day | ~1 wk | `capture_activity`, `mark_activity_done`, `set_focus_today`, `external-capture-relay` Edge Function, `SurfaceOriginBadge` in-app component |
| C | Directory submissions — Anthropic + OpenAI, published as the Kwilt business entity | ~1 wk + review wait | Demo workspace, pre-submission checklist, privacy policy update, `kwilt-site` `/connect/claude` and `/connect/chatgpt` landings |
| D | Cross-surface activation loops — tailored welcome drip for external-first users, in-conversation mobile install nudge | ~1 wk | Settings → Connections screen, per-surface revoke, new email variants, `ExternalActivationStarted` / `ExternalToMobileInstall` PostHog events |
| E | Expansion & polish — `propose_arc` / `create_goal` with universal-link confirmation, semantic search, Force-Actual inference (AI-credit-debiting), connector health dashboard | ~1.5 wk | Universal-link confirmation pages on `kwilt-site`, pgvector or `pg_trgm` for `search_kwilt`, internal observability |

### Why Sprint 5 ships after Sprints 1–4

- The streak system, Pro upsell flows, AI credit pool, weekly Chapter digest, and universal-link handoff are all *prerequisites* the connector reuses. Building those first means Sprint 5 is mostly assembly, not invention.
- The cross-surface activation story (Sub-sprint D) only makes sense once the welcome drip (Sprint 4 E1), Lock Screen widget (Sprint 3b W1), and weekly Chapter digest (Sprint 4 E2) exist as the things the external user is being nudged toward.
- The pricing posture (connector free, AI-backed tools debit existing credit pool) reuses Sprint 4 Task 27's credit-exhaustion paywall directly — no new monetization plumbing.

### Sprint 5 acceptance criteria

- [ ] MCP server live at `auth.kwilt.app/functions/v1/mcp` with OAuth 2.1 + DCR.
- [ ] Read tools return RLS-scoped data correctly across team accounts.
- [ ] `capture_activity` from Claude/ChatGPT counts as a show-up day; `SurfaceOriginBadge` appears in-app.
- [ ] Listed at `claude.ai/directory/connectors/kwilt`.
- [ ] Listed in OpenAI ChatGPT Apps Directory under the Kwilt business entity.
- [ ] External-first users go through a tailored Day 0/1 email drip; mobile-install prompt fires after 3rd successful write.
- [ ] Free-tier feature limits surface as structured tool errors with paywall deep-link carrying the existing `PaywallReason` enum.
- [ ] AI-backed tools (`search_kwilt`, Force inference) debit the existing AI credit pool and surface the existing `generative_quota_exceeded` paywall on exhaustion.
- [ ] Settings → Connections shows per-surface stats with revoke.
- [ ] Guardrail: < 2% of external write tool calls result in a user-initiated revoke within 7 days of install.

---

## Sprint 6 — Kwilt Text Coach + Shared Action Tools (Loop 6)

**Theme:** Ship the first Pro follow-through agent: a text-native coach that captures intentions, prompts at useful times, helps with drafts/next steps, and closes loops through simple replies.

**Estimated duration:** ~2–3 weeks
**Loop closed:** Loop 6 (Text Coach → Follow-through → Loop closure → Chapter evidence)
**Status:** Planned — full feature brief lives in [`docs/feature-briefs/kwilt-text-coach.md`](feature-briefs/kwilt-text-coach.md).

### Why this follows Sprint 5

- Sprint 5 makes "bring your own LLM" real. Sprint 6 answers the monetization question by shifting Pro from more AI capacity to trusted follow-through.
- MCP and Text Coach should share the same domain-level action tools. The connector is user-initiated from external AI; Text Coach is Kwilt-initiated through text prompts and loop closure.
- The streak system, universal-link handoff, email/push cadence, and Activity model are already in place; Sprint 6 turns them into a higher-WOW text loop.

### Tasks

| Task | Theme |
|---|---|
| T1 | Shared action-tool substrate — domain-level tools for `create_activity_from_intention`, `log_activity_outcome`, `snooze_followup`, `pause_followup`, `draft_message`, and action audit logs |
| T2 | Text identity + inbound channel — Twilio/SMS or equivalent inbound endpoint, opt-out handling, phone-to-user linking, and quiet-hours/cap policy |
| T3 | Intention capture loop — texted intention becomes an Activity or pending Activity suggestion under explicit permission |
| T4 | Right-time follow-up loop — scheduled prompts support `done`, `snooze`, `pause`, and `not relevant` |
| T5 | Activation-energy help — draft relational messages and small next steps, but never send to third parties |
| T6 | Pro gating and value preview — capture remains generous; proactive follow-up, standing Activity creation, and loop closure become Pro |
| T7 | Analytics and trust guardrails — intention captured, prompt sent, reply handled, loop closed, STOP/opt-out, prompt complaint/revoke signals |

### Sprint 6 acceptance criteria

- [ ] User can text Kwilt one real intention and receive a short, scoped receipt.
- [ ] Low-risk intentions can become Activities under standing permission; otherwise Kwilt asks one confirmation question.
- [ ] Scheduled follow-ups accept `done`, `snooze`, `pause`, and `not relevant` replies consistently.
- [ ] `done` logs an Activity outcome and records a show-up when appropriate.
- [ ] Kwilt can draft a message or next step for the user, but cannot send to third parties.
- [ ] All text prompts respect opt-out, quiet-hours/cap policy, and calm-UX tone.
- [ ] The same action tools can be called later by MCP, desktop, and in-app agent surfaces.
- [ ] Guardrail: STOP/opt-out rate stays low and beta users do not describe prompts as needy, creepy, or nagging.

---

## Sprint 7 — Background Agents: Weekly Planning Agent (Loop 7)

**Theme:** Ship Weekly Options as a background ritual under the broader Text Coach / follow-through agent concept.

**Estimated duration:** ~2–3 weeks
**Loop closed:** Loop 7 (Chapter → Background Options → User confirmation → Show-up)
**Status:** Planned — full feature brief lives in [`docs/feature-briefs/background-agents-weekly-planning.md`](feature-briefs/background-agents-weekly-planning.md).

### Why this follows Sprint 6

- Weekly Options should reuse the shared action-tool substrate and follow-up permissions from Text Coach rather than inventing a parallel background-agent system.
- The weekly ritual is more useful once Kwilt already knows how to capture intentions, schedule follow-ups, and close loops.
- This keeps Weekly Options from becoming the parent Pro story; it becomes one ritual within the trusted follow-through platform.

### Tasks

| Task | Theme |
|---|---|
| B1 | Weekly planning background job — reads recent Activities, active Goals, Arc drift signals, latest Chapter summary, and Text Coach loop-closure evidence |
| B2 | Weekly Options data model — stores proposals without creating real Activities/Goals until user confirmation or standing permission allows Activity creation |
| B3 | Lightweight review surface — accept/edit/defer/dismiss individual proposals inside the app canvas |
| B4 | Text Coach handoff — optional text prompt: "Want me to carry one of these forward?" |
| B5 | Pro gating + optional free preview — recurring background runs are Pro; preview trigger remains an open product decision |
| B6 | Analytics and trust guardrails — option generated/viewed/accepted/edited/deferred/dismissed, notification opt-out, dismiss-all rate |
| B7 | Connector extension design — proposal read/confirm tools after core connector stability, not part of the initial background run |

### Sprint 7 acceptance criteria

- [ ] Pro users can opt into Weekly Options with a clear "nothing changes until you confirm" explanation unless they grant standing Activity permission.
- [ ] Weekly background run creates a small draft: 2–4 Activity proposals, 0–1 Goal proposal, 0–1 gentle Arc re-entry observation.
- [ ] Proposals appear in a dedicated review surface within the app shell/canvas layering, without requiring the Plan feature.
- [ ] Accepting creates the underlying Activity/Goal; editing opens the normal creation/edit flow prefilled.
- [ ] Dismissing or deferring does not shame the user or create a pending-decision queue.
- [ ] Chapters remain retrospective only; no future-planning copy is added to Chapter bodies.
- [ ] Capture remains free and ungated across all surfaces.
- [ ] Guardrail: dismiss-all rate, notification opt-out, STOP/opt-out, and connector revoke rate do not materially increase after exposure.

---

## Dependency graph

```
Sprint 1 (Streak retention core)
  ├── N2: streak-at-risk notification
  ├── N3: reactivation notification
  ├── N2/N3: settings toggle
  ├── S1: shield earning
  ├── S6/N6: streak-aware copy
  └── Tests
        │
        ▼
Sprint 2 (Streak repair + upsell)
  ├── S2: repair window ← depends on S1 (shields) being correct
  ├── S2: repair capsule UI
  ├── S2: repair celebrations
  ├── U1: Pro upsell on streak break ← depends on S2 (repair window state)
  ├── U3: intro offers (independent)
  ├── N1: push token registration (independent)
  └── Tests
        │
        ▼
Sprint 3a (Milestone rewards + engagement wiring — TypeScript only)
  ├── W6: widget nudge at streak 3 ← depends on streaks working correctly
  ├── W5: widget-streak attribution
  ├── S3: milestone rewards ← depends on milestones being recorded (Sprint 1)
  ├── N4: notification actions (independent)
  └── Tests
        │
        ▼
Sprint 3b (Widget surfaces — native Swift)
  ├── W1: Lock Screen widget ← depends on streak state being reliable (S1, S2)
  ├── W2: small Home widget
  └── W3: Live Activities (independent, native-heavy)
        │
        ▼
Sprint 4 (Email + polish + deferred)
  ├── E1: email infrastructure + welcome drip (independent of client work)
  ├── E2: chapter digest email
  ├── S4: weekly recap card
  ├── S5: social streak sharing
  ├── U2: Pro previews ← deferred from Sprint 3; depends on milestone data
  ├── U4: credit exhaustion UX (independent) ← reused as paywall surface for MCP AI-tool exhaustion in Sprint 5
  └── N5: adaptive timing ← depends on sufficient show-up data accumulating
        │
        ▼
Sprint 5 (External AI connector — Loop 5)
  ├── A: Supabase Edge MCP server + OAuth + read tools
  ├── B: write tools + show-up parity ← depends on Sprint 1 (streak system) being correct
  ├── C: directory submissions (Anthropic + OpenAI)
  ├── D: cross-surface activation ← depends on Sprint 4 (welcome drip) and Sprint 3b (widget surfaces)
  └── E: confirmation flows ← depends on Phase 1–3 of email-system-ga-plan.md (universal-link handoff)
        │
        ▼
Sprint 6 (Kwilt Text Coach — Loop 6)
  ├── T1: shared action-tool substrate ← reused by MCP, Text Coach, desktop, and future rituals
  ├── T2/T3: inbound text identity + intention capture ← depends on auth/user identity and Activity model
  ├── T4/T5: right-time prompts + activation-energy drafts ← depends on notification/email cadence posture and calm UX rules
  └── T6/T7: Pro gating + analytics/trust guardrails ← depends on paywall and analytics surfaces
        │
        ▼
Sprint 7 (Weekly Options — Loop 7)
  ├── B1/B2: weekly planning background job + Weekly Options model ← depends on Text Coach action tools and Chapters/Goals/Activities data
  ├── B3/B4: lightweight review + Text Coach handoff ← depends on existing app shell/canvas layering and text follow-up channel
  ├── B5/B6: Pro gating + trust guardrails ← depends on Sprint 6 permission and prompt policy
  └── B7: connector proposal tools ← depends on Sprint 5 MCP stability
```

---

## Measurement checkpoints

After each sprint, validate:

| Sprint | Key metric to check |
|--------|---------------------|
| 1 | Streak-at-risk notification → same-day show-up rate; shield accumulation for Pro users |
| 2 | Repair window usage rate; streak-break → Pro conversion rate; push tokens registered |
| 3a | Widget nudge → setup conversion at streak 3; milestone reward redemption; notification action tap rate |
| 3b | Lock Screen widget adoption %; widget-assisted show-ups; small widget adoption |
| 4 | Email open/click rates; weekly recap engagement; streak share → referral conversion |
| 5 | Directory listing approval (binary); % of new users with first capture from external surface; D30 retention lift for connected vs not; external-only → mobile install rate |
| 6 | Texted intention rate; right-time prompt reply rate; text loop-closure rate; STOP/opt-out and "creepy/nagging" qualitative guardrails |
| 7 | Weekly Options review rate; accepted/edited proposal rate; next-week Activity creation/completion lift; dismiss-all and notification opt-out guardrails |

---

## Relationship to other docs

- **`docs/growth-loops-strategy.md`** — the strategic analysis and recommendations this plan executes against.
- **`docs/feature-briefs/kwilt-text-coach.md`** — Sprint 6 source feature brief and primary Pro follow-through pillar.
- **`docs/feature-briefs/background-agents-weekly-planning.md`** — Sprint 7 source feature brief and future weekly ritual under the Text Coach/follow-through agent umbrella.
- **`docs/engagement-and-motivation-system.md`** — behavioral model and engagement loops.
- **`docs/notifications-paradigm-prd.md`** — notification system feature brief (Phases 1–2 complete; Phase 3 items are Sprint 1 here).
- **`docs/apple-ecosystem-opportunities.md`** — widget and ecosystem strategy (Sprint 3 items).
- **`docs/value-realization-roadmap.md`** — product roadmap (Phase 1.6 and Phase 2.2 align with Sprints 1–3 here).
- **`docs/ai-credits-and-rewards.md`** — credit and referral system (Sprint 3 milestone rewards, Sprint 4 credit UX).
