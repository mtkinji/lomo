# Converge: Typed Personal Limit Handoff

## Chosen alternative

Use a typed native rule draft through the existing Screen Time builder.

## Capability delta

Today, Chat can open generic personal setup but cannot preserve a requested app allowance, and self language can expose child tools. After this slice, the same ordinary-language request can be repeated for any app label and daily minute limit; native review still owns token selection and save.

Still unsupported: per-session timers, silent creation, remote child control, and claims of enforcement without signed-device evidence.

## Reductive decisions

- Add no Chat-specific editor, rule name, dashboard, or Apple token field.
- Add one `daily_limit` personal rule kind to the existing inventory and builder.
- Carry only label-level app intent through Chat.
- Treat subject corrections as continuations of the prior Screen Time job.

## Bet

We're betting that preserving the typed intent through one native review step feels like Chat successfully operating Screen Time, even though Apple selection cannot occur inside the conversation. If it does not, revisit the handoff presentation—not the token boundary.

## Success signal

The screenshot request and its correction both reach a self-only typed handoff; the builder shows the requested duration, saves a reusable rule after picker review, and a signed device shields the chosen app after the daily threshold.
