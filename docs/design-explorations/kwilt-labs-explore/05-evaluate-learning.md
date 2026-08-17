# Evaluate Learning: Kwilt Labs Explore

## Learning questions

- Do people understand that Labs activation is separate from location permission and Explore tracking mode?
- Does disabling Explore reliably stop background location and sync across restart?
- Does preserved history make re-enabling feel safe and unsurprising?
- Does putting Explore behind Labs reduce crash exposure without falsely attributing the earlier crash?

## Evidence plan

Supporting evidence: default-off fresh launch, successful enable/disable/relaunch, zero disabled background observations, preserved history, and voluntary repeat use.

Disconfirming evidence: Explore appears through restore/deep link while disabled, services remain registered, users expect disable to erase data, or the Labs route becomes configuration clutter.

## Instrumentation

Use local state and operating logs for gate transitions. Do not collect location, route, Place, or history content to evaluate Labs.

## Decision rule

Keep Explore in Labs while signed-device crash-free, battery/thermal, and background-runtime proof remains incomplete. Promote only after repeated real use and explicit product review. Simplify or retire if activation is confusing or disabling cannot be made trustworthy.

## Expected next action

Ship a TestFlight learning build, exercise fresh install and upgrade paths, then inspect crash reports separately from Explore adoption.
