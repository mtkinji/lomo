# Diverge: Meaningful First App Access

Axis of variation: daily gate vs. access windows vs. scheduled-work gate vs. reflection/intervention gate.

## Option A: Daily Meaningful First

The user chooses distracting apps/categories and enables a daily gate. Each day, those apps stay shielded until the user completes one qualifying Kwilt action. V1 qualifying actions are intentionally concrete: complete a Focus Session above a minimum duration, complete an Activity, or record real progress on an Activity. After qualification, the selected apps unlock until the next local day.

- Audience/persona fit: Strong for Marcus because it creates one simple daily boundary without making him manage timers all day.
- Design-challenge answer: Puts one meaningful move before drift while preserving a clear opt-in setup.
- Best when: The user mainly needs to stop starting the day or work block with distraction.
- Fails when: One small action unlocks too much low-value app time.
- Object model: Activity and Focus Session are qualifying action sources; Settings owns app selection and rules.
- Capture-first stance: Does not block capture; creating an Activity alone should not qualify unless the user records or completes real progress.
- Anti-pattern check: pass; no streaks, scores, public pressure, or shame copy.

## Option B: Action Unlocks A Time Window

The user completes a qualifying action and receives a temporary access window, such as 30 or 60 minutes. When the window ends, selected apps shield again until another qualifying action happens.

- Audience/persona fit: Medium. It is more powerful for distraction control, but more likely to feel like a system to manage.
- Design-challenge answer: Keeps the user returning to meaningful action before each round of low-value app access.
- Best when: The user wants active containment throughout the day.
- Fails when: The user feels micromanaged or starts gaming tiny actions for access.
- Object model: Activity/Focus qualify; app-access windows become a new transient protection state.
- Capture-first stance: Capture remains open, but unlock logic must avoid rewarding low-quality admin actions.
- Anti-pattern check: risky; avoid currency, points, or "earned screen time" language.

## Option C: Scheduled Work Gate

The gate only activates around scheduled Activities or Focus blocks. If a to-do is scheduled for now, selected apps remain shielded until the user starts or completes the scheduled work. Outside scheduled windows, apps behave normally.

- Audience/persona fit: Good later, especially for users with calendar discipline, but too narrow for general daily drift.
- Design-challenge answer: Connects the restriction directly to the user's stated plan.
- Best when: Scheduled Activities are common and reliable.
- Fails when: Users do not schedule enough work or their day changes.
- Object model: Activity schedule plus Focus Session lifecycle.
- Capture-first stance: Does not block capture; schedule changes must remain easy.
- Anti-pattern check: pass if opt-in and calm; risky if schedule changes become failure states.

## Option D: Shield As Reflection Prompt

When the user opens a shielded app, the shield asks them to name what they came for or choose a Kwilt action. Access can be granted after a brief intention check even without completing an Activity.

- Audience/persona fit: Mixed. It could be humane, but it may become too easy to click through and too close to generic self-control apps.
- Design-challenge answer: Adds a moment of awareness at the point of drift.
- Best when: The user needs awareness more than enforcement.
- Fails when: The prompt becomes a speed bump they ignore.
- Object model: No core Kwilt object required unless the user chooses an Activity.
- Capture-first stance: Does not block capture, but may not create real Kwilt movement.
- Anti-pattern check: risky; avoid moralizing language and avoid treating intention text as progress.

## Option E: User-Chosen Anchor Action

During setup, the user chooses one daily anchor action: finish a Focus Session, complete one Activity, record a check-in, or open Today and choose the next action. The selected anchor becomes the unlock condition for their distracting apps.

- Audience/persona fit: Good because it respects different ways people use Kwilt.
- Design-challenge answer: Makes the gate feel self-authored rather than imposed.
- Best when: Users have different thresholds for what counts as meaningful.
- Fails when: Too many setup choices create maintenance and weak defaults.
- Object model: Depends on the selected action; Activity and Focus are safest.
- Capture-first stance: Does not block capture.
- Anti-pattern check: pass if V1 provides a strong default and keeps weaker actions out of the recommended path.
