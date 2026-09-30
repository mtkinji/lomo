# Diverge: Contextual Plan Kickoff

> Historical alternatives. Andrew's 2026-09-24 feedback establishes proactive activation and cross-capability discovery as central requirements. See the [app-wide engagement strategy](03-app-wide-engagement-strategy.md) for the revised recommendation; Plan-only presentation is not the selected direction.

## Fixed frame

Help Marcus notice a useful moment to plan and enter Plan intentionally, while preserving the capability context and purpose that brought him into Kwilt.

Two requirements apply to every direction:

1. One foreground bottom surface at a time; capability-local context outranks opportunistic Plan guidance.
2. One planning opportunity is delivered at most once across in-app and notification channels.

## Axis of variation

The alternatives vary by **where the invitation lives** and **what activates it**:

- in-context and pull-driven;
- scheduled and notification-led;
- ambient and user-discovered;
- stateful hybrid across foreground and background.

Planning acts on Activities—the day-level plan already present in Kwilt. None of these alternatives adds a separate plan object or blocks capture.

## Direction A: Plan Owns the Moment

Remove the root-level kickoff presentation. The invitation can appear only while Plan is the active capability, using the existing guide or opening recommendations directly when the user arrives and today is eligible. Entering Explore, Goals, Activities, or another capability never triggers Plan UI. The current cadence continues to decide whether an invitation is eligible, but eligibility is consumed only when it is actually presented inside Plan.

- Audience/persona fit: high trust fit for Marcus because Kwilt never interrupts an unrelated job.
- Design-challenge answer: planning becomes contextual to the place where planning happens.
- System fit: high. Reuses Plan, `BottomGuide`, existing cadence fields, and `openRecommendations`; removes the global host behavior rather than adding infrastructure.
- Capability delta: today, Plan can cover another capability; afterward, a planning invitation exists only in Plan.
- Best when: users already visit Plan often enough for the invitation to help.
- Fails when: people who would benefit from planning rarely enter Plan and therefore never encounter the invitation.
- Four-object check: Activities remain the plan in motion; no new object.
- Capture-first check: pass; no capture path is blocked.
- Anti-pattern check: pass; no productivity pressure, duplicate prompt, or forced commitment.

## Direction B: Scheduled Doorway

Replace the cross-capability in-app guide with an optional local notification delivered on the user’s chosen cadence and time. The notification is a calm doorway—such as “Make a little room for today”—and tapping it opens Plan with recommendations visible. When Kwilt is already foregrounded, the app does not raise a modal or bottom guide; it records availability through a quiet Plan indicator or inserts the opportunity only if Plan is already visible.

- Audience/persona fit: medium-high. It respects the current in-app task and can establish a dependable ritual, but notification consent and timing must be explicit.
- Design-challenge answer: planning arrives outside the app at an intentionally chosen moment and opens the correct destination.
- System fit: medium-high. Kwilt already schedules local notifications, handles taps, and deep-links to `PlanTab` with `openRecommendations`; settings need a time field and the current “in-app prompts” contract must change.
- Capability delta: today, cadence has no chosen delivery time and app foreground triggers the prompt; afterward, the user can choose when a single planning invitation arrives.
- Best when: users value a regular planning ritual and opt into notifications.
- Fails when: notification permission is denied, scheduled delivery is delayed, or the prompt does not contain enough timely value.
- Four-object check: pass; notification opens the existing Activity planning surface.
- Capture-first check: pass; notification is optional and external to capture.
- Anti-pattern check: pass only with passive/default interruption, no urgency language, no repeated notification, and no private recommendation details on the lock screen.
- Platform grounding: Apple describes notifications as timely, high-value information, advises against multiple notifications for the same thing, and recommends quiet foreground handling rather than invasive presentation: <https://developer.apple.com/design/human-interface-guidelines/notifications>

## Direction C: Quiet Plan Beacon

Retire the automatic kickoff entirely. Use the existing Plan navigation/action affordance to indicate that recommendations are ready, and place a small inline invitation at the top of Plan when the user visits. There is no OS notification and no automatic bottom guide. The user discovers the planning opportunity through stable navigation rather than interruption.

- Audience/persona fit: very high for trust and low maintenance; lower for activation.
- Design-challenge answer: Kwilt keeps useful planning close without demanding immediate attention.
- System fit: high. The Plan action already exposes a recommendation count, so this direction may mostly simplify and clarify existing behavior.
- Capability delta: today, Kwilt interrupts to advertise Plan; afterward, Plan truthfully signals useful material and waits for the user to choose it.
- Best when: recommendation availability itself is enough to draw users into Plan.
- Fails when: users overlook the indicator or have not yet built a habit of visiting Plan.
- Four-object check: pass; the beacon reflects Activities/recommendations, not a new planning entity.
- Capture-first check: pass.
- Anti-pattern check: pass if the indicator stays informational rather than becoming a red urgency badge or streak cue.

## Direction D: One Opportunity, Adaptive Delivery

Create one bounded daily planning-opportunity lifecycle: `eligible`, `delivered`, `opened`, `dismissed`, or `expired`. If the user enters Plan while eligible, Plan presents the invitation and cancels any pending notification. If the app is backgrounded at the chosen time, one notification becomes the delivery. If the app is foregrounded in Explore or another capability, that capability keeps attention and Plan becomes only quietly available. Once delivered, opened, or dismissed, the opportunity cannot appear through another channel that day.

- Audience/persona fit: highest potential fit because delivery adapts without duplication, but invisible state must remain predictable.
- Design-challenge answer: planning can meet Marcus inside or outside Kwilt while always yielding to his active purpose.
- System fit: medium. Reuses existing notification scheduling, Plan deep links, cadence, and the existing moment orchestrator’s conservative `overlay_active` signal, but replaces the date-only “shown” receipt with an explicit lifecycle.
- Capability delta: today, presentation and suppression are local booleans/date keys; afterward, Kwilt can truthfully defer, deliver, cancel, and deduplicate one opportunity.
- Best when: both in-Plan discovery and scheduled reminders matter enough to justify coordination logic.
- Fails when: the lifecycle becomes a hidden prompt engine, adds settings complexity, or creates hard-to-explain timing.
- Four-object check: pass; the lifecycle describes delivery, not a user-maintained product object.
- Capture-first check: pass; active capture and capability work always retain priority.
- Anti-pattern check: pass if opportunities expire quietly, never queue visibly, and never infer urgency.
- Platform grounding: Apple recommends canceling a scheduled local notification when conditions change and the notification is no longer needed: <https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app>

## Comparative view

| Direction | Interruption | Activation reach | System complexity | Duplication risk | Main trade-off |
| --- | --- | --- | --- | --- | --- |
| A. Plan owns the moment | Low | Medium-low | Low | Low | Depends on entering Plan |
| B. Scheduled doorway | Medium, user-chosen | High | Medium | Medium without a receipt | Notification permission and timing |
| C. Quiet Plan beacon | Very low | Low | Low | Very low | May be too easy to miss |
| D. Adaptive delivery | Low-to-medium | High | Medium-high | Lowest when correct | More state and testing |

## Design tensions to carry forward

- A notification is justified only if the user has chosen a planning rhythm and tapping it immediately produces value.
- Foreground delivery should be quieter than background delivery. Apple explicitly recommends discoverable, noninvasive foreground handling instead of reproducing a notification as an interruption.
- “Shown” is not a truthful receipt when another capability prevented visibility.
- The existing Plan recommendation badge may already provide much of Direction C; do not add a second ambient indicator without evidence.
- Direction D must remain a tiny lifecycle for one Plan opportunity, not become a generalized visible inbox of prompts.
