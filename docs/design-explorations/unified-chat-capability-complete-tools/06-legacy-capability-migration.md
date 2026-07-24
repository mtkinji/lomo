# Legacy Capability Migration

## Finding

Kwilt's legacy `AgentWorkspace` is not only an old conversation surface. In contextual modes it already exposes model-selectable profile, Focus, calendar, Activity-step, and Activity-field tools; returns tool results to the model; carries focused workspace context; and renders structured Arc and Goal workflows.

Unified Chat currently has the stronger trust contract but the narrower live interpretation path. The migration must combine those strengths rather than treating the new runtime as a greenfield replacement.

## Restated in user voice

When I ask Kwilt naturally from anywhere in the app, I want it to retain the useful things its earlier agent could already do, while making those actions durable, inspectable, correctable, and available from one conversation instead of only from a preselected workflow.

## Frame decision

Continue with the existing frame and shared-runtime decision. Treat legacy `ChatMode` as a contextual prior for progressive tool discovery, not as a user-visible mode or permanent execution boundary.

## Assets to migrate

| Legacy asset | Runtime destination | Migration rule |
| --- | --- | --- |
| `get_user_profile` | `profile.read` | Bounded fields only; never expose the full store object. |
| `set_user_profile` | `profile.update` | Typed patch, consequence policy, authoritative result. |
| `enter_focus_mode` | `activities.open_focus` | Device-provider command; opening UI is not proof a focus session started. |
| `schedule_activity_on_calendar` | `plan.schedule_activity` | Return a reviewed Plan operation or pending device action. |
| `schedule_activity_chunks_on_calendar` | `plan.schedule_chunks` | Grouped proposals, sequential apply, one tracked binding and receipt per calendar event. |
| `activity_steps_edit` | `activities.update_steps` | Versioned Activity operation; completion changes require proportionate confirmation. |
| `update_activity_fields` | `activities.update` | Reuse the durable Activity proposal/executor rather than the legacy direct store write. |
| Goal creation workflow | `goals.draft` + `goals.create` | Preserve the proposal card and domain prompt; move adoption behind a durable proposal. |
| Arc creation workflow | `arcs.draft` + `arcs.adopt` | Preserve identity-specific judgment and deliberate review. |
| Workspace snapshots | capability evidence providers | Replace hidden broad strings with bounded typed evidence and visible scope. |

## What not to migrate

- Direct store mutation from the AI transport service.
- Prompt-only authorization.
- Concurrent execution of potentially conflicting writes.
- One-round-only tool orchestration as the permanent runtime.
- Hidden mode selection that makes ordinary paraphrases fall into an unrelated path.

## Learning-release adjustment

The next release first makes semantic request interpretation part of the live Unified Chat route while deterministic rules retain safety authority. It also creates a tested migration ledger from legacy behavior to new tool ids. Legacy action execution remains unchanged until each operation has a durable provider, policy, proposal/receipt behavior, and parity test.

## Success signal

Representative paraphrases route to the same capability without requiring app vocabulary; exact safety boundaries remain deterministic; invalid or unavailable model routing falls back safely; and every legacy agent operation has an explicit new-runtime destination or exclusion before migration begins.
