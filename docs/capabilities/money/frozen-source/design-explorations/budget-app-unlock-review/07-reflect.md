# Reflect: budget-app-unlock-review

## The bet

We're betting that a budget-native unlock task will make app blocking feel like intentional access rather than punishment.

## Did the bet hold?

Partially. Signed-device self-use proved that Screen Time and both explicit outcomes work. The budget-native decision is understandable, but the offer is too frequent because the UI currently activates from persistent restriction state rather than a fresh user attempt to open a shielded app.

## Updates applied

- Kept `jtbd-put-intention-before-impulse` as the primary job.
- Added negative timing evidence to the learning plan and feature brief.
- Narrowed the next release to one-shot shield activation; no new notification settings or rule-builder concepts.
- Did not raise the job-delivery score yet because calm, well-timed activation remains unproven.

## Taxonomy gaps surfaced

No new JTBD is needed. Prompt cadence is a quality condition of `choose-intentional-access` and `jtbd-trust-this-app-with-my-life`, not a separate job.

## What I'd do differently

The first release should have modeled a review request separately from an active restriction. A restriction is durable system state; a review offer is a short-lived interaction request.

## Next questions

- Does one-shot activation remove the sense of repeated notification?
- After cadence is calm, does the 30-minute access window itself need tuning?
- Is exact background re-shielding important enough to justify a DeviceActivity monitor?
