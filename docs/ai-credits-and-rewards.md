## AI credits + rewards (implementation)

This doc describes the **current shipped implementation** of:
- **AI credits** (monthly limits, client gating)
- **Onboarding shielding** (AI help during onboarding without spending the user’s monthly 25)
- **Bonus credits** (reward credits that add to the monthly limit)
- **Referral rewards** (invite link + code, server-validated)

### Concepts

- **Base monthly credits**
  - Free: `25/month`
  - Pro: `1000/month`
  - Defined in [`src/domain/generativeCredits.ts`](../src/domain/generativeCredits.ts).

- **Used credits (client ledger)**
  - Tracked locally in `useAppStore.generativeCredits` as `{ monthKey, usedThisMonth }`.
  - Consumed by `useAppStore.tryConsumeGenerativeCredit()`.

- **Bonus credits (reward layer)**
  - Tracked locally in `useAppStore.bonusGenerativeCredits` as `{ monthKey, bonusThisMonth }`.
  - Server-authoritative ledger in Supabase (`kwilt_ai_bonus_monthly`).
  - Effective client limit is `base + bonus` (for the current month).

### Where credits are enforced

#### Client enforcement (UX + safety layer)
- `sendCoachChat()` in [`src/services/ai.ts`](../src/services/ai.ts) is the shared entrypoint.
- It consumes credits via `useAppStore.tryConsumeGenerativeCredit()` **unless** the chat mode is `firstTimeOnboarding` (shielded).

#### Server enforcement (cost guardrails)
AI requests go through the Supabase Edge Function proxy:
- [`supabase/functions/ai-chat/index.ts`](../supabase/functions/ai-chat/index.ts)

The proxy enforces:
- **Per-minute** request limit (RPM)
- Optional **daily rail**
- **Monthly actions** quota
- **Bonus credits**: monthly limit is **base + bonus** (bonus from `kwilt_ai_bonus_monthly`)
- **Onboarding shield**: onboarding-mode requests do not increment daily/monthly counters, but do increment onboarding-only counter (cap)

### Onboarding shielding

Goal: users can complete onboarding and still **exit with 25/25** monthly credits available.

Mechanics:
- Client sends headers for onboarding chat:
  - `x-kwilt-chat-mode: firstTimeOnboarding`
  - `x-kwilt-workflow-step-id: <step>` (optional; used for diagnostics)
- Client does not decrement monthly credits when `CoachChatOptions.mode === 'firstTimeOnboarding'`.
- Proxy counts onboarding requests in `kwilt_ai_usage_onboarding` and enforces a small cap (default **12** actions per install).

Server migration:
- `supabase/migrations/20251226000000_kwilt_ai_proxy_onboarding.sql`

Env var:
- `KWILT_AI_ONBOARDING_ACTIONS_CAP` (default: `12`)

### Onboarding completion “top-up” trigger

Trigger:
- When the user adds the first Activity for the onboarding-created Goal (≥1 activity).

Implementation:
- In `useAppStore.addActivity()`:
  - If activity is attached to `lastOnboardingGoalId` and goal belongs to `lastOnboardingArcId`,
    and `hasReceivedOnboardingCompletionReward` is not set:
    - Reset local `generativeCredits.usedThisMonth` to `0` for current month.
    - Mark `hasReceivedOnboardingCompletionReward = true`.
    - Open the credits completion drawer (`CreditsInterstitialDrawerHost`).

### Credits interstitial (education + completion)

UI:
- Full-height drawer host: [`src/features/onboarding/CreditsInterstitialDrawer.tsx`](../src/features/onboarding/CreditsInterstitialDrawer.tsx)
- Store: [`src/store/useCreditsInterstitialStore.ts`](../src/store/useCreditsInterstitialStore.ts)
- Mounted in the app shell in [`src/navigation/RootNavigator.tsx`](../src/navigation/RootNavigator.tsx)

Behavior:
- **Education**: shown once during first-time onboarding (`IdentityAspirationFlow`) via `hasSeenCreditsEducationInterstitial`.
- **Completion**: shown after onboarding completion trigger.

### Bonus credits (reward layer)

Supabase migration:
- `supabase/migrations/20251226000010_kwilt_ai_bonus_monthly.sql`

Proxy behavior:
- Reads bonus credits for `(quota_key, month)` and adds to base monthly limit.

Client behavior:
- `tryConsumeGenerativeCredit()` computes `limit = base + bonusThisMonth`.
- Bonus credits are synced from the server on app launch (best-effort).

### Referral rewards (invite link + code)

High-level flow:
1. Inviter generates a code (`POST /referrals/create`).
2. Inviter shares a deep link: `kwilt://referral?code=<code>`.
3. Friend opens the link; app redeems (`POST /referrals/redeem`).
4. Server grants inviter **+10 bonus credits this month** (default) via `kwilt_increment_ai_bonus_monthly`.
5. Inviter’s app syncs bonus credits on next launch (`syncBonusCreditsThisMonth()`).

Server:
- Supabase migration: `supabase/migrations/20251226000020_kwilt_referrals.sql`
- Edge function: [`supabase/functions/referrals/index.ts`](../supabase/functions/referrals/index.ts)
- Env var:
  - `KWILT_REFERRAL_BONUS_ACTIONS` (default: `10`)

Client:
- Invite UI lives in Settings: [`src/features/account/SettingsHomeScreen.tsx`](../src/features/account/SettingsHomeScreen.tsx)
- Deep-link side effects handled in `RootNavigator` using `Linking.getInitialURL()` and event listener.
- Client networking/helpers in [`src/services/referrals.ts`](../src/services/referrals.ts)

Important safeguards:
- **Self-referrals are blocked** (inviter quota_key cannot redeem their own code).
- **Friend install can only redeem once** (unique index on `friend_quota_key`).
- Client has a local idempotence cache (`useAppStore.redeemedReferralCodes`) to reduce repeated calls.

### Notes / operational caveats

- Identity model is install-based (`quota_key = install:<installId>`) until accounts exist.
- Bonus credits are month-scoped (no rollover).
- The Settings/Paywall UI reflects `base + bonus` so users see the real effective limit.


