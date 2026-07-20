# Evaluate Learning: Places System

## Learning Questions

- Can users understand a place relationship as part of an Activity, with durable Places managed in Settings rather than the primary app canvas?
- Do users understand the difference between assigning a to-do to a Place and enabling a geofence notification?
- Can Kwilt infer obvious place mentions/targets from capture with little or no user input without feeling presumptuous?
- Can Kwilt avoid parsing or storing place-like artifacts unless a decision path needs them for search, recommendation, alerts, correction, audit, or Saved Place memory?
- Can Quick Add handle explicit location-reminder requests with a clear post-capture confirmation path?
- Can Quick Add avoid turning weak place mentions into setup prompts?
- Can a compact Quick Add receipt make generated Place results inspectable without interrupting rapid capture or becoming a review queue?
- Can the UI distinguish internal mentions, related context, Saved Places, and enabled triggers clearly enough that users do not expect a notification from a text-only mention?
- Can users correctly predict what will happen after a place is visible: better prioritization, contextual grouping, an explicit notification, or reusable memory?
- Can users understand the difference between a broad match such as "any Walgreens" and a specific geofence such as "Walgreens on Broadway"?
- Can Kwilt deliver useful place context without continuous background polling or constant place-search API calls?
- Can users understand that many place relationships can be remembered or related to tasks, while only a smaller set can be actively watched for arrive/leave alerts?
- Can the system avoid lifting place-related to-dos unless it has a reliable current signal: watched-place event, explicit context/view/search, or confirmed foreground location?
- Can Kwilt create dependable place reminders without maintaining a general history of where the user used the app?
- Does evidence-gated place relevance improve the next doable action, or does it still feel like a category boost?
- Do Quick Add, Activity Detail, Location Offers, Recommended, and Phone Agent share one mental model cleanly?
- Do users feel protected from hidden tracking and silent AI mutation?
- What evidence threshold is needed before Kwilt should suggest durable place memory?

## Evidence Plan

Evidence supporting the bet:

- Place-aware Recommended items are opened, completed, or inspected more than comparable place-bearing tasks that were not promoted.
- Location-trigger proposals are accepted when timely and rejected without users disabling location trust entirely.
- Users who type explicit arrive/leave requests in Quick Add can complete the confirmation flow without losing the captured Activity.
- Users who type weak place-bearing captures are not interrupted by setup prompts.
- Users can answer an ambiguous Place choice from the receipt or immediately continue capturing another Activity.
- Users can explain why Kwilt suggested a place behavior.
- Users can find and remove a place relationship from an Activity.
- Users can assign a to-do to a Place without expecting or receiving a notification.
- Users accept or leave in place soft assignments from clear captured language more often than they correct them.
- Users do not report "I arrived and nothing happened" after seeing related context without an enabled trigger.
- Users can describe the visible place contract in plain language: "this helps organize it", "this may make it show up here", "this will notify me", or "this is remembered".
- Users can choose or accept the right matching scope for the job: any brand location, near a context, or one specific place.
- The learning release produces value from related context and explicit single-place triggers before any broad venue-detection system exists.
- Users do not confuse Saved Places or related context with the active watched-place budget.
- Unused place mentions are discarded rather than accumulating as hidden user data.
- Library/Walgreens/etc. tasks rise only when a reliable scenario-specific signal exists, not merely because the task contains a place target.
- Durable place evidence comes from explicit user actions or watched-place events, not passive app-open/dwell history.
- Phone Agent and Quick Add proposals can use the same language and confirmation model.

Evidence disconfirming the bet:

- Users assume Kwilt is tracking them broadly.
- Place-bearing tasks rise when they are not actually doable.
- Users assume assigning a to-do to a Place automatically enables location tracking or notifications.
- Quick Add creates location-alert expectations but provides no confirmation affordance.
- Quick Add prompts for place setup after weak place mentions and starts feeling like a setup funnel.
- Quick Add automatically opens a sheet for ordinary generated results, or the receipt becomes a dense inspector users feel required to clear.
- Soft assignments frequently choose the wrong place or create surprise memory.
- The system accumulates hidden place-like data that does not affect any user-visible or auditable behavior.
- The UI makes text-only or linked-place evidence look like an active reminder.
- Users cannot tell whether a visible place will affect prioritization, notifications, saved memory, or nothing.
- Broad matches produce false confidence, such as expecting an "any Walgreens" reminder when only one store can be monitored.
- The concept only feels valuable if Kwilt continuously polls location or repeatedly calls a place-search API in the background.
- Users feel punished or confused by an active-watch limit, or believe Kwilt is failing because only some related place targets can trigger notifications.
- Place-related tasks rise while the user is merely nearby or traveling past a place without a watched event, explicit context, or foreground location confirmation.
- Kwilt requires passive place-usage history to make the system feel useful.
- The model cannot be understood without a primary saved-place database or setup flow.
- Quick Add, Activity Detail, Location Offers, and Phone Agent require separate place semantics.
- Users repeatedly need correction controls to suppress place-aware recommendations.

## Instrumentation

Track:

- place proposal shown;
- place proposal accepted, rejected, or edited;
- location trigger enabled from a proposal;
- place link created, edited, or removed;
- soft place link accepted by inaction, edited, removed, or converted to memory;
- place-aware recommendation shown;
- place-aware recommendation opened or completed;
- place relationship removed;
- location offer fired, suppressed, opened, completed, snoozed, or disabled.

Do not track:

- continuous location history;
- raw coordinate trails;
- sensitive inferred place categories;
- cross-user coordinate/task patterns;
- any place memory the user has not explicitly approved.

## Decision Rule

Proceed toward permanent implementation if:

- place-aware behavior feels useful through existing Activity surfaces;
- weak, medium, and strong place signals are distinguishable in code and in user-facing behavior;
- permission sequencing remains explicit;
- the user does not need Settings-managed Places for the first value moment, but understands them once durable memory exists;
- the model makes Phone Agent proposals safer rather than more complex.

Revise or retire the concept if:

- the system cannot deliver value without asking the user to configure places first;
- place evidence causes noisy recommendations;
- permission or AI proposal copy feels distrustful;
- saved-place setup becomes necessary before one-time place relationships can work.

## Expected Next Action

Turn the converged concept into a build-ready Places model spec: define the minimum TypeScript/domain shape, map current Activity location fields into it, identify how Recommended consumes place evidence, and write the trust-edge tests before implementation.
