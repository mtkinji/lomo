# Kwilt Copy Audit

Date: 2026-05-09

Scope: Kwilt app repo only. This audit reviews user-facing emails, local notifications, onboarding, AI prompt controls, celebrations, empty states, CTAs, paywall copy, share/invite copy, toasts, alerts, and major app canvas surfaces against the Kwilt copywriting skill.

This is an audit and edit plan only. No product copy was changed.

## Executive Summary

Kwilt's strongest copy already shows up where it is concrete about time, progress, and choices: lines like "Make room for the goals that matter right now", "Protect your attention and finish what you begin", and "This invite link may expire or reach a usage limit" are clear, practical, and grounded.

The main risk is that several high-emotion surfaces still speak in an older productivity-app voice. Streaks and celebrations sometimes use pressure or generic hype ("Don't break the chain", "Unstoppable", "Legendary", "You're royalty"). First-impression onboarding and sign-in copy sometimes drifts into self-help abstraction ("future self", "potential", "journey", "transformations", "live with intention"). Those are the most important fixes because they set the emotional contract for the product.

Emails are mostly in better shape than notifications and celebrations. The welcome and win-back series are warm and non-shaming overall, but some lines can be made more specific and less abstract. The separate `share-digest` email path is the biggest email outlier because it does not use the shared email layout or voice system.

## Copy Inventory

Primary email surfaces:
- `supabase/functions/_shared/emailTemplates.ts`: Pro emails, goal invite, welcome drip, chapter digest, streak win-back, trial expiry, admin alert.
- `supabase/functions/share-digest/index.ts`: weekly shared-goal accountability digest, separate from shared email templates.
- `supabase/functions/_shared/emailUnsubscribe.ts`: unsubscribe preference labels.
- `supabase/functions/_shared/periodLabels.ts`: chapter digest period language.

Outbound share and invite surfaces:
- `src/features/goals/ShareGoalDrawer.tsx`: share drawer UX, partner explanation, SMS/share-sheet message, email invite entry.
- `src/features/goals/JoinSharedGoalDrawerHost.tsx`: invite join/error states and "fresh invite" share message.
- `src/features/friends/FriendsScreen.tsx`: friend invite and friend request feedback.
- `src/features/account/SettingsHomeScreen.tsx`: referral share and settings IA copy.

High-emotion product surfaces:
- `src/store/useCelebrationStore.ts`: goal/activity/streak/all-done/streak-repair celebrations.
- `src/services/NotificationService.ts`: daily nudges, activity reminders, streak-at-risk, reactivation, notification permission rationale.
- `src/services/notifications/goalNudge.ts`: goal-specific local nudge copy.
- `src/services/gifs.ts`: GIF query strings that influence celebration feel.

Onboarding and AI-generated copy controls:
- `src/domain/workflowSpecs/firstTimeOnboardingV2Spec.ts`: spec copy and prompt source.
- `src/features/ai/workflows/firstTimeOnboardingWorkflow.ts`: runtime workflow copy and prompt source.
- `src/features/onboarding/IdentityAspirationFlow.tsx`: FTUE presenter, static messages, generated Arc prompt helpers.
- `src/features/onboarding/SignInInterstitial.tsx`: rotating sign-in catch messages.
- `src/features/ai/systemPrompts.ts`: Arc, Goal, Activity, and onboarding prompt controls.
- `src/services/ai.ts`: prompt builders and AI fallback behavior.
- `packages/arc-survey/src/arcCreationSurvey.ts`: survey labels, options, placeholders, and generation meanings.

Core app product copy:
- `src/features/home/TodayScreen.tsx`
- `src/features/activities/ActivitiesScreen.tsx`
- `src/features/goals/GoalsScreen.tsx`
- `src/features/arcs/ArcsScreen.tsx`
- `src/features/arcs/ArcDetailScreen.tsx`
- `src/features/arcs/GoalDetailScreen.tsx`
- `src/features/activities/ActivityDetailScreen.tsx`
- `src/features/chapters/ChaptersScreen.tsx`
- `src/features/chapters/ChapterDetailScreen.tsx`
- `src/features/plan/*`
- `src/features/paywall/PaywallDrawer.tsx`
- `src/ui/EmptyState.tsx`
- `src/ui/CheckinNudgePrompt.tsx`
- `src/services/checkins.ts`

## Must Change

### 1. Streak celebrations use generic hype and pressure

Files:
- `src/store/useCelebrationStore.ts`
- `src/services/gifs.ts`

Issue:
The copywriting skill explicitly calls out generic hype and pressure as baseline failures. Streak celebrations currently include lines such as:
- "Unstoppable!"
- "You're on fire!"
- "Legendary!"
- "You're royalty!"
- "Keep it going!"
- "You've got this!"
- "Staying on target!"
- "ONE FULL YEAR of showing up every single day. Incredible!"

There is also a GIF query for weekly streaks: "crushing it unstoppable momentum winning".

Why it matters:
These lines could appear in any habit app. They are energetic, but not specific or observant. The copywriting skill asks celebration to feel earned, specific, and alive, not generic motivational hype.

Rewrite direction:
- Replace generic praise with observable progress.
- Keep the energy, but anchor it in what happened.
- Use smaller celebration for ordinary streak days; reserve bigger language for meaningful milestones.

Suggested replacements:
- "Unstoppable!" -> "You kept coming back. That counts."
- "You're on fire!" -> "A full week of showing up. Strong work."
- "Legendary!" -> "One hundred days. You kept making room for this."
- "You're royalty!" -> "Two hundred days of returning to what matters."
- "Keep it going!" -> "There it is."
- "You're on a roll!" -> "A little momentum. We'll take it."
- "Staying on target!" -> "You showed up again."
- GIF query "crushing it unstoppable momentum winning" -> "real win strong work tiny parade celebration"

### 2. Missed-streak and repair copy risks shame

Files:
- `src/store/useCelebrationStore.ts`
- `src/services/NotificationService.ts`
- `supabase/functions/_shared/emailTemplates.ts`

Issue:
Several streak-loss or streak-risk surfaces frame the moment as a threat:
- "Don't break the chain"
- "Your 7-day streak is at risk"
- "Day 7 is on the line"
- "Your 7-day streak needs you"
- "A streak this long deserves protection. Show up now."
- "You're out of grace days until next week - don't miss tomorrow!"
- "Streak Broken - But Not Gone!"
- "Repair It"
- "Your 7-day streak is fading - but it's not gone"

Why it matters:
The copywriting skill says missed work is information, not a moral failure. Pressure-based streak language can make returning feel like avoiding punishment instead of making the next honest choice.

Rewrite direction:
- Treat a missed day as normal life information.
- Use "move it, shrink it, or let it go" energy.
- Preserve product mechanics without making the user feel scolded.

Suggested replacements:
- "Don't break the chain" -> "Still worth a small step?"
- "Your 7-day streak is at risk" -> "There's still time for one small step"
- "Day 7 is on the line" -> "One small step can keep this moving"
- "Your 7-day streak needs you" -> "Want to keep this one moving?"
- "Show up now" -> "Open Kwilt when you're ready"
- "You're out of grace days until next week - don't miss tomorrow!" -> "No grace days left this week. Tomorrow is a clean next choice."
- "Streak Broken - But Not Gone!" -> "This one slipped. You can still return."
- "Repair It" -> "Make it count today"
- "Your 7-day streak is fading - but it's not gone" -> "You can still pick this back up"

### 3. First-impression sign-in copy leans self-help and generic

File:
- `src/features/onboarding/SignInInterstitial.tsx`

Issue:
The rotating catch messages include:
- "Your potential, mapped out."
- "Small steps lead to big transformations."
- "Every great journey starts with a plan."
- "Craft your path. Live with intention."
- "Design the life you keep imagining."

Why it matters:
This is one of the earliest brand moments. The skill says to avoid "unlock your potential", "journey", "transformation", and vague intentionality. These lines sound more like generic self-help marketing than a smart, warm coworker helping the user make room for what matters.

Rewrite direction:
- Make the first impression concrete: what Kwilt helps the user do.
- Keep aspiration, but make it livable.
- Avoid "potential", "journey", "transformation", and "intention" as filler.

Suggested replacements:
- "Your potential, mapped out." -> "Make room for what matters."
- "Small steps lead to big transformations." -> "Small steps. Real progress."
- "Every great journey starts with a plan." -> "Start with one thing worth protecting."
- "Craft your path. Live with intention." -> "Choose what matters. Give it time."
- "Design the life you keep imagining." -> "Turn the thing you keep imagining into a plan."

### 4. Onboarding overuses "future self" and identity abstraction

Files:
- `src/domain/workflowSpecs/firstTimeOnboardingV2Spec.ts`
- `src/features/ai/workflows/firstTimeOnboardingWorkflow.ts`
- `src/features/onboarding/IdentityAspirationFlow.tsx`

Issue:
The FTUE relies heavily on "future self", "future-you", "version of you", "identity Arc", "storyline", and "grow into". Examples:
- "What area of life does your future self most want to grow into right now?"
- "Picture future-you on a normal day..."
- "If future-you had a nickname..."
- "Does this feel like the future you?"
- "Let's uncover the version of you that feels the most you."
- "This isn't meant to be a perfect definition of you; it's a simple storyline you can grow into..."

Why it matters:
The skill allows aspirational language, especially for Arcs, but warns against self-help fog and abstract identity language. The current language is coherent with the Arc model, but it is concentrated enough that onboarding can feel like a reflective identity exercise before users see the practical planning value.

Rewrite direction:
- Keep the Arc concept, but phrase questions around ordinary-life choices and practice.
- Use "what kind of person are you trying to become here?" as the anchor.
- Reduce "future self" repetition.

Suggested replacements:
- "What area of life does your future self most want to grow into right now?" -> "Where do you want to practice becoming steadier right now?"
- "Picture future-you on a normal day..." -> "Picture an ordinary day where this is going well. What are you doing?"
- "If future-you had a nickname..." -> "If this Arc had a short name, what would fit?"
- "Does this feel like the future you?" -> "Does this feel like the direction you want to practice?"
- "Let's uncover the version of you that feels the most you." -> "Let's name one direction you want to make easier to practice."
- "simple storyline you can grow into" -> "working draft you can use and refine."

## Should Improve

### 5. Welcome emails are warm, but some lines are abstract

File:
- `supabase/functions/_shared/emailTemplates.ts`

Issue:
The welcome drip is generally aligned, but a few lines are still broad:
- "your Arc is waiting"
- "showing up for the life you want"
- "Kwilt turns intentions into daily action"
- "Your first Arc, your first rhythm"
- "Every day you show up is a vote for the person you're becoming. Keep going."

Why it matters:
These are not severe failures, but they are less concrete than the copywriting skill's best examples. The strongest welcome email should help users know what to do next, not just affirm the idea of becoming.

Rewrite direction:
- Use "make room", "protect time", and "first useful step".
- Tie each email to the exact next action.

Suggested replacements:
- Subject "Welcome to Kwilt - your Arc is waiting" -> "Welcome to Kwilt - start with one Arc"
- "showing up for the life you want" -> "making room for what matters"
- "Kwilt turns intentions into daily action" -> "Kwilt helps you name what matters and give it real time"
- "Your first Arc, your first rhythm" -> "A quick check on your first Arc"
- "Every day you show up is a vote for the person you're becoming. Keep going." -> "You made progress this week. Pick one thing worth protecting next."

### 6. Win-back emails are mostly non-shaming but still streak-centered

File:
- `supabase/functions/_shared/emailTemplates.ts`

Issue:
The win-back emails have good "life happens" language, but the frame still centers the streak:
- "Your 7-day streak is still yours to rebuild"
- "You had a 7-day streak going - that's real momentum."
- "Your 7-day streak is fading - but it's not gone"
- "your goals are still waiting"

Why it matters:
For a lapsed user, the skill's missed-activity guidance is stronger than streak protection. The goal is to make returning feel easy and honest.

Rewrite direction:
- Lead with next choice, not streak preservation.
- Use the user's prior progress as evidence, not leverage.

Suggested replacements:
- "Your 7-day streak is still yours to rebuild" -> "You can start small again today"
- "You had a 7-day streak going - that's real momentum." -> "You had a rhythm going. It can restart smaller."
- "Your 7-day streak is fading - but it's not gone" -> "This can still come back into the week"
- "your goals are still waiting" -> "the goal can still get a small next step"

### 7. `share-digest` email is an outlier

File:
- `supabase/functions/share-digest/index.ts`

Issue:
This function sends a plain weekly digest with:
- Subject: "Your Kwilt accountability week"
- Body: "Your shared goal had X check-ins, Y cheers, and Z replies this week. Open Kwilt to share your week."
- Link: `kwilt://goal/...`
- Campaign: `goal_invite`

Why it matters:
It does not use the shared email template system, visual rhythm, universal-link CTA, footer, or unsubscribe conventions. The body is concrete, which is good, but "accountability week" and "share your week" are less Kwilt-specific than the newer copy guide.

Rewrite direction:
- Move this path onto the shared email layout.
- Use a subject that reports what happened.
- Use a universal link CTA and correct campaign naming.

Suggested replacements:
- Subject "Your Kwilt accountability week" -> "Your shared goal got attention this week"
- Body -> "Your shared goal had X check-ins, Y cheers, and Z replies this week. Open Kwilt to see what moved and add your own note."
- CTA -> "Open shared goal"
- Campaign -> `share_digest`

### 8. Paywall copy has a few abstract or hard-sell lines

File:
- `src/features/paywall/PaywallDrawer.tsx`

Issue:
Much of the paywall copy is practical and contextual, but a few lines drift:
- "Grow into more than one version of yourself"
- "your intentions become commitments - and your days feel aligned instead of reactive"
- "Upgrade now and we'll restore your streak instantly"
- Section label "What you unlock"

Why it matters:
The skill says Kwilt is not about self-optimization or hard-sell urgency. Paywall copy should stay value-oriented, calm, and specific.

Rewrite direction:
- Replace identity abstraction with concrete capacity.
- Keep streak-shield paywall especially careful because it appears after a missed-streak moment.
- Consider "What Pro adds" instead of "What you unlock".

Suggested replacements:
- "Grow into more than one version of yourself" -> "Make room for more than one Arc"
- "your intentions become commitments - and your days feel aligned instead of reactive" -> "the work you said matters has time on your calendar"
- "Upgrade now and we'll restore your streak instantly" -> "Pro can restore this streak and protect future misses with Streak Shields."
- "What you unlock" -> "What Pro adds"

### 9. Goal nudge copy is useful but slightly mechanical

File:
- `src/services/notifications/goalNudge.ts`

Issue:
Current copy:
- Title: "Tiny step for: Goal title"
- Body: "Open Kwilt to pick one activity for Goal title (Arc name)."
- Fallback: "Open Kwilt to choose one to-do and keep momentum."

Why it matters:
It is practical, but the title punctuation feels mechanical and the body repeats the same "tiny step" language already used throughout notifications.

Rewrite direction:
- Make it sound like a human nudge.
- Use "worth protecting" or "smallest useful version" when appropriate.

Suggested replacements:
- Title -> "A small step for Goal title"
- Body with Arc -> "Pick one activity that moves Goal title today."
- Fallback -> "Choose the smallest useful to-do for today."

### 10. Empty states can be more helpful and less task-manager-like

Files:
- `src/features/home/TodayScreen.tsx`
- `src/features/activities/ActivitiesScreen.tsx`
- `src/features/goals/GoalsScreen.tsx`
- `src/features/arcs/ArcsScreen.tsx`
- `src/features/chapters/ChaptersScreen.tsx`
- `src/features/plan/PlanScheduleApplyPage.tsx`

Issue:
Several empty states are clear but plain:
- "No to-dos yet"
- "Create an Arc, then a Goal, then your first to-do."
- "Add your first to-do to start building momentum."
- "Create an Arc to define a meaningful direction."
- "Add some to-dos to see a proposed schedule."

Why it matters:
The skill asks Kwilt to be practical without sounding like a corporate task manager. Empty states are a good place to reduce fog and point to one useful next action.

Rewrite direction:
- Keep the hierarchy intact: app shell stays stable, app canvas gives the next action.
- Prefer one concrete next step over explaining the full model.

Suggested replacements:
- Today "No to-dos yet" instructions -> "Start with one to-do worth making room for today."
- Activities empty -> "Add one to-do you would be glad to protect this week."
- Arcs empty -> "Start with one direction you want to practice in real life."
- Plan empty -> "Add a few to-dos, then Kwilt can help them find time."
- Chapters empty should mostly stay because it sets a clear expectation; consider "It'll recap..." -> "It will recap..." for style consistency.

### 11. Share and friend copy is functional but inconsistent

Files:
- `src/features/goals/ShareGoalDrawer.tsx`
- `src/features/goals/JoinSharedGoalDrawerHost.tsx`
- `src/features/friends/FriendsScreen.tsx`
- `src/ui/CheckinNudgePrompt.tsx`

Issue:
Share-goal copy is mostly on-voice, especially the privacy line. Friend copy is thinner:
- "Add me as a friend on Kwilt!"
- "Share an invite link to add friends who can cheer your milestones!"
- "Let your team know"

Why it matters:
The product is moving toward specific support around goals, not generic social graph language.

Rewrite direction:
- Talk about support, check-ins, and noticing progress.
- Avoid "team" unless the context is truly a team.
- Keep the privacy promise prominent.

Suggested replacements:
- "Add me as a friend on Kwilt!" -> "Join me on Kwilt so we can notice progress together."
- "cheer your milestones" -> "celebrate real wins and help you come back when a goal gets quiet"
- "Let your team know" -> "Share a quick signal"

### 12. Today screen has one copy bug and several easy wins

File:
- `src/features/home/TodayScreen.tsx`

Issue:
- "You've showed up X days in a row" should be "You've shown up..."
- "Track your arcs, review goal drafts, and keep the day grounded in meaningful work" is clear but list-like.
- "Here is a tiny step you can complete today" is fine, but repeats the app-wide "tiny step" motif.

Rewrite direction:
- Fix the grammar.
- Make the Today hero feel like the app canvas, not an index of features.

Suggested replacements:
- "You've showed up..." -> "You've shown up..."
- "Track your arcs..." -> "Choose what gets real attention today."
- "Here's a tiny step you can complete today." -> "Here's one small thing that can move today."

## Keep / Watch

These surfaces are mostly aligned and should be preserved while editing:
- Goal invite privacy copy in `supabase/functions/_shared/emailTemplates.ts`: "Activity titles stay private unless you choose to share them" is concrete and trust-building.
- Share goal drawer privacy line in `src/features/goals/ShareGoalDrawer.tsx`: "Your to-dos stay private - partners can't edit them" is clear.
- Notification permission rationale in `src/services/NotificationService.ts`: "Allow gentle reminders?" is aligned; the body can be tightened but is not off-brand.
- Chapter digest structure in `supabase/functions/_shared/emailTemplates.ts`: the period label, snippet, primary CTA, and "What did we miss? Add a line." affordance fit the chapter voice. The generated snippet needs prompt/validator discipline more than static-copy rewriting.
- Arc generation system prompt in `src/features/ai/systemPrompts.ts`: it already bans many old anti-patterns ("journey", "unlock", "best self", "level up"). The main risk is older onboarding surfaces that still route users toward "future self" framing.

## Concrete Edit Plan

### Pass 1: High-risk streak and celebration cleanup

Files:
- `src/store/useCelebrationStore.ts`
- `src/services/NotificationService.ts`
- `src/services/notifications/goalNudge.ts`
- `src/services/gifs.ts`

Actions:
- Replace generic celebration words with specific observations.
- Rewrite streak-risk notifications to remove "chain", "at risk", "needs you", and "on the line".
- Rewrite streak repair copy so it feels like returning, not punishment.
- Update GIF query strings to avoid "crushing", "unstoppable", and generic winning language.

Tests/verification:
- Run `npm run lint`.
- Run notification-related tests if touched: `npm test -- NotificationService`.
- Manual copy QA in-app for daily streak, weekly streak, streak repair, activity complete, all-done, goal nudge, and reactivation variants.

### Pass 2: First-impression and onboarding language

Files:
- `src/features/onboarding/SignInInterstitial.tsx`
- `src/domain/workflowSpecs/firstTimeOnboardingV2Spec.ts`
- `src/features/ai/workflows/firstTimeOnboardingWorkflow.ts`
- `src/features/onboarding/IdentityAspirationFlow.tsx`

Actions:
- Replace rotating sign-in catch messages that use "potential", "journey", "transformations", or filler "intention".
- Reduce "future self" repetition in static UI and prompt instructions.
- Keep the Arc model intact, but reframe onboarding around "direction", "practice", "ordinary day", and "what matters".
- Keep spec and runtime workflow copy aligned.

Tests/verification:
- Run `npm run lint`.
- If copy changes in workflow specs affect tests, run onboarding/arc survey tests.
- Manually walk FTUE to confirm the app shell and app canvas layers remain unchanged: nav/shell structure stays stable, and the canvas still owns the primary onboarding action.

### Pass 3: Email polish and shared-goal digest alignment

Files:
- `supabase/functions/_shared/emailTemplates.ts`
- `supabase/functions/share-digest/index.ts`
- `supabase/functions/_shared/__tests__/emailTemplates.test.ts`

Actions:
- Tighten welcome email abstractions into concrete next actions.
- Reframe win-back emails around return choices rather than streak status.
- Move or mirror `share-digest` into the shared email layout primitives.
- Use universal-link CTA patterns and correct campaign naming for share digest.

Tests/verification:
- Update expected strings in `supabase/functions/_shared/__tests__/emailTemplates.test.ts`.
- Run the Supabase function tests that cover email templates.
- Check rendered HTML output for CTA, fallback link, footer, and unsubscribe behavior.

### Pass 4: Paywall, empty states, share copy, and broad product sweep

Files:
- `src/features/paywall/PaywallDrawer.tsx`
- `src/features/home/TodayScreen.tsx`
- `src/features/activities/ActivitiesScreen.tsx`
- `src/features/goals/GoalsScreen.tsx`
- `src/features/arcs/ArcsScreen.tsx`
- `src/features/chapters/ChaptersScreen.tsx`
- `src/features/plan/PlanScheduleApplyPage.tsx`
- `src/features/goals/ShareGoalDrawer.tsx`
- `src/features/friends/FriendsScreen.tsx`
- `src/ui/CheckinNudgePrompt.tsx`

Actions:
- Replace abstract or hard-sell paywall phrases.
- Fix the Today grammar issue.
- Make empty states point to one useful next action.
- Bring friend/check-in copy closer to specific support and real progress.
- Preserve the user's app UX layer rule: keep app shell/nav/margins separate from the app canvas where the main action copy changes.

Tests/verification:
- Run `npm run lint`.
- Manual screen scan for Today, Arcs, Goals, Activities, Plan, Chapters, Paywall, Share Goal, and Friends.

## Suggested Keyword Guardrail

After edits, run a source-only search for the highest-risk copy tokens and review any intentional exceptions:

```bash
rg -n "(unstoppable|legendary|crush|crushing|best self|future self|journey|transformation|unlock your potential|Don't break|at risk|needs you|no excuses|hustle|grind)" src packages supabase/functions
```

Expected outcome:
- No user-visible uses of "unstoppable", "legendary", "crush", "Don't break", or "no excuses".
- Any remaining "future self", "journey", "alignment", or "unlock" references are either internal comments/tests or deliberately constrained AI prompt guardrails.

## Test Impact Notes

Known string-sensitive tests:
- `supabase/functions/_shared/__tests__/emailTemplates.test.ts` will likely need updates if email subject/body/CTA/fallback copy changes.
- `supabase/functions/_shared/__tests__/resendWebhook.test.ts` contains subject fixtures and should be checked if email subject conventions change.
- `src/features/paywall/PaywallContent.test.tsx` asserts "What you unlock"; update if the section label becomes "What Pro adds".

Notification and celebration copy appears lightly tested today, so most confidence will come from typecheck plus manual QA of visible variants.
