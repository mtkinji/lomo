# Converge: Focus Protection

## Scoring

- Configure Once, Apply During Focus: best fit for the user's spec, Marcus's need, and Kwilt's one-Focus mental model. It delivers real distraction reduction without creating a separate workflow.
- Gentle Preflight Only: safest and fastest, but likely too weak to satisfy the core problem of social media, notifications, and habitual switching.
- Scheduled Protection Blocks: valuable future layer, but premature until scheduled Focus is already a strong product behavior.
- AI-Assisted Distraction Setup: interesting later, but too easy to make judgmental or opaque in V1.
- Provider Foundation First: should be part of the implementation of the chosen path, not a separate user-facing alternative.

## Chosen alternative

Ship Option A, backed by the provider foundation from Option E.

Focus Protection lives in Settings > Focus. The user enables it once, grants required permission, chooses restricted apps/categories with the native Screen Time picker, and saves. From then on, every normal Focus Session automatically asks the protection service to apply enabled providers at session start and remove them at session end, cancel, expiry, or recovery cleanup. No Focus start surface offers a "protected" branch.

Scheduled to-dos follow the same rule. If a scheduled to-do is current, Kwilt can surface an actionable "Start Focus" notification, and calendar events can deep link back to the Activity with the Focus sheet ready. Protections still activate only when the Focus Session actually starts. Calendar links open the door; Kwilt-owned Start Focus actions start the session.

## Accepted trade-offs

- The first version is iOS-first because Screen Time protection is an Apple platform integration.
- The MVP does not personalize restrictions per Activity, Goal, Arc, or time of day.
- The Settings setup has unavoidable native permission complexity, so the in-app copy must stay brief and honest.
- Analytics should distinguish setup, activation, cleanup, and failure states, but avoid complex funnels or gamified reporting.
- Calendar reminders and Kwilt reminders may coexist, so Kwilt-owned notifications should be the action surface while calendar events remain a passive time block with an "Open in Kwilt" link.

## Rejected trade-offs

- Do not add "Protected Focus Session" as a noun, toggle, card, or start-flow choice.
- Do not add multiple protection profiles in V1.
- Do not ask AI to infer the user's distracting apps.
- Do not make protected minutes visible as a streak, score, or self-control metric.
- Do not apply restrictions without a user-visible Settings off switch and reliable cleanup path.
- Do not let a generic calendar notification or calendar event tap silently start device restrictions.

## Stated bet

We're betting that Marcus will welcome environmental support if it is configured once and disappears into the normal Focus Session lifecycle. If users either do not complete setup or distrust automatic activation, we would revisit by simplifying setup and improving status/cleanup transparency before adding more protection types.

## Success signal

The first success signal is not maximum protected minutes. It is that users can enable Focus Protection, complete Screen Time setup, start ordinary Focus Sessions, and finish or cancel them with restrictions applied and removed cleanly. Product metrics should watch enabled rate, setup completion, protected Focus Session completion, cleanup failures, and repeat protected usage.
