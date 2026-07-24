# Learning Release: budget-app-unlock-review

## Concept To Build
Selected spending apps open only after the user lands on the relevant budget, reviews the reason, and taps `Open for now`.

## Capability Delta
Today, the user cannot:
- use a 95% budget threshold as a clear app-blocking preset,
- unlock from the budget itself,
- see a single clear reason at the moment of blocked-app recovery,
- distinguish review-clearable blocks from hard stops.

After this release, the user can:
- configure Amazon to wait behind Shopping with a plain preset,
- hit the block and land on Shopping,
- see the compact unlock dock,
- tap `Open Amazon for now` or `Keep blocked`,
- get a quiet receipt and a Screen Time reconciliation attempt.

Still intentionally not supported:
- arbitrary rule builders,
- multiple native app selections per budget policy,
- household approvals,
- recovery-plan gates,
- broad production launch.

## User Experience
Setup:
- Budget Detail shows a small "App pause" row if no app pause exists.
- Tapping it opens a setup surface with one selected app and preset choices.
- Presets are user-facing: `Always review first`, `When Shopping is hot`, `At 95% used`, `When over`, `When transactions need review`.
- Exact threshold and unlock window can sit behind `More options` or internal debug controls.

Blocked-app path:
- Shield copy: `Review Shopping to open Amazon.`
- Deep link: `kwiltbudget://budgets/shopping?unlockTarget=amazon`.
- Budget Detail first viewport shows the normal meter plus an unlock dock.
- Dock copy: `Amazon is paused because Shopping is at 95%.`
- Primary action: `Open Amazon for now`.
- Secondary action: `Keep blocked`.
- Receipt: `Amazon is open for 20 min.` or `Amazon stays blocked.`

## Existing Product Relationship
Enhances:
- Budget Detail becomes the unlock surface.
- Review events remain the receipt model.
- Screen Time Controls remain the native authorization and app-selection setup surface.

Replaces:
- Rule-forward app-control cards as the normal user's task surface.
- Generic review route as the primary unblock experience.

Left unchanged:
- Native FamilyControls selection ownership.
- Foreground reconciliation.
- Budget meter and transaction review systems.

## Buildable Slice
Must be real:
- policy preset model including a percent threshold preset,
- active unlock-task route state on Budget Detail,
- reason selection that turns active restriction reasons into one plain sentence,
- `Open for now` and `Keep blocked` actions on Budget Detail,
- `BudgetReviewEvent` receipt recording,
- Screen Time reconciliation after either outcome,
- tests for threshold and freshness logic.

Can be thin or temporary:
- one configured Shopping/Amazon policy,
- static 95% threshold default,
- simple setup UI,
- fallback route from `/review` into Budget Detail.

Intentionally excluded:
- multiple app-specific native selections,
- custom thresholds beyond the first preset,
- complex notification scheduling,
- analytics beyond review receipts/manual observation.

## Release Channel
`TestFlight build` after local simulator UX verification.

Rationale: native Screen Time blocking and deep links need a real signed device path before the learning counts. Simulator can prove UI and routing, but not the actual shield-clearing contract.

## Brand-Goodwill Guardrails
- Use "paused" and "opens after review", not "denied", "failed", "permission", or "bad spending".
- Treat `Keep blocked` as a successful choice.
- Do not celebrate the app opening.
- Show one reason, not every condition.
- Keep advanced controls out of the first blocked-app task.

## Reversibility
The release can be hidden by disabling the app-pause setup affordance and falling back to the existing Screen Time Controls surface. The policy and receipt model remain compatible because the release extends existing review outcomes rather than replacing them.

## Permanent Product Threshold
Make this a permanent capability if:
- the blocked-app -> budget -> open/keep-blocked path works on a signed device,
- the user understands the task without explanation,
- threshold and pace triggers both resolve through the same unlock dock,
- `Keep blocked` reliably leaves the shield active,
- the setup can be completed without exposing rule jargon.
