# Diverge: Focus Protection

Axis of variation: user-configured system protection vs. lightweight session nudges vs. platform-scheduled enforcement vs. AI-assisted setup.

## Option A: Configure Once, Apply During Focus

The Settings > Focus section adds Focus Protection as an optional setup. The user enables it, grants Screen Time permission, selects app/category restrictions through the native picker, and saves the selection. Starting a normal Focus Session applies the saved restrictions; ending, canceling, or expiring the session clears them. The Focus start UI does not add a protected variant or extra decision.

- Audience/persona fit: Strong for Marcus because it removes repeat setup and preserves the existing Focus flow.
- Design-challenge answer: Protects the work environment while keeping "Start Focus Session" as the only action.
- Best when: The user has a stable set of distracting categories or apps.
- Fails when: The OS permission flow is confusing, restrictions fail to clear, or the user expects task-specific profiles.
- Object model: Activity owns the Focus Session context; Settings owns protection preferences.
- Capture-first stance: Does not block capture, Activity creation, or normal Focus Sessions.
- Anti-pattern check: pass; no dashboard, no streak pressure, no productivity shame.

## Option B: Gentle Preflight Only

Instead of Screen Time restrictions, Kwilt adds a small optional preflight before Focus starts: turn on Do Not Disturb manually, put the phone face down, or choose a soundscape. The app records nothing beyond whether the nudge was shown or skipped.

- Audience/persona fit: Medium. It is calm and safe, but may be too weak for Marcus's actual distraction vulnerability.
- Design-challenge answer: Helps the user prepare without permissions or native complexity.
- Best when: The first milestone needs to prove demand before Apple Screen Time work.
- Fails when: Users need actual app blocking and not just advice.
- Object model: Activity and Focus Session only.
- Capture-first stance: Does not block capture; should be skippable.
- Anti-pattern check: pass if the copy stays practical and non-judgmental.

## Option C: Scheduled Protection Blocks

When the user schedules focus work, Kwilt schedules a protection window too. At the scheduled time, a Focus Session begins or is prompted, restrictions activate, and protections clear when the block ends.

- Audience/persona fit: Strong later, but too much for V1 because it blends scheduling, reminders, and enforcement.
- Design-challenge answer: Carries intention across time and prepares the environment automatically.
- Best when: Scheduled Focus is already a reliable product surface.
- Fails when: The app starts feeling like a calendar/enforcement system.
- Object model: Activity schedule plus Focus Session lifecycle.
- Capture-first stance: Does not block capture, but scheduled automation must remain user-controlled.
- Anti-pattern check: risky; avoid forced commitment and urgency styling.

## Option D: AI-Assisted Distraction Setup

Kwilt asks the user what usually pulls them away and proposes categories or apps to restrict. The user confirms through the native picker, then Kwilt applies the saved selection during Focus Sessions.

- Audience/persona fit: Mixed. It could reduce setup effort, but Marcus may distrust AI interpreting device behavior or habits.
- Design-challenge answer: Lowers setup friction, but only if the AI stays conversational and confirmation-based.
- Best when: Users do not know which categories to choose.
- Fails when: It sounds like psychoanalysis or implies Kwilt knows which apps are bad for them.
- Object model: Settings setup only; no Arc or Goal changes.
- Capture-first stance: Does not block capture.
- Anti-pattern check: risky; avoid anthropomorphic AI and judgmental habit language.

## Option E: Provider Foundation First

Build the first release around a small native protection provider interface: `screenTime`, later `notifications`, later `appleFocus`, later `websites`. The V1 user experience is still Option A, but the architecture explicitly models apply, remove, reconcile, and failure states per provider.

- Audience/persona fit: Strong indirectly because reliability is part of trust for device-level controls.
- Design-challenge answer: Lets Kwilt keep a single Focus Session lifecycle while layering protections over time.
- Best when: The team wants the MVP to avoid a rewrite before notification or Focus-mode integration.
- Fails when: Architecture work delays the user-visible Screen Time value.
- Object model: Focus Session lifecycle plus Settings preferences; no new user-facing object.
- Capture-first stance: Does not block capture.
- Anti-pattern check: pass; this is implementation scaffolding, not a new system users manage.
