# Converge: One Agreement, Two Control Surfaces

## Chosen direction

Build a default-first progressive setup and a quiet agreement card. Household and Chat control the same capability-owned agreement through the same typed commands, authority checks, policy versions, and receipts.

## Before and after

Today, a caregiver must read a long setup page that repeats the rule and exposes technical caveats. Chat can recognize a narrow allow/block command but can only report that family control is unavailable.

After this change, a caregiver can:

- open Charlie and see one Screen Time card;
- connect the device, choose apps, accept or customize one starter agreement, preview, and turn it on;
- ask Chat for Charlie's current agreement or current access reason;
- propose a schedule, limit, activation, deactivation, or bounded exception in ordinary language;
- approve a compact diff and distinguish “saved” from “applied on Charlie's iPhone”;
- enter any Apple-native step from Chat and return to the same thread afterward.

Still intentionally impossible:

- Chat cannot choose opaque Apple app tokens, grant Family Controls authorization, or release a child device without native caregiver review.
- Chat cannot auto-approve a family policy change, create open-ended exceptions, or report enforcement from prose.
- A child cannot use Chat to change a caregiver-managed agreement.

## Native information architecture

```text
People > Household > Charlie
└── Screen Time
    ├── Needs setup: one sentence + Continue setup
    ├── On: one agreement card + today's explanation + Edit
    └── Needs attention: one reason + one recovery action
```

First setup:

```text
1. Connect Charlie's iPhone
2. Choose apps
3. Review School-day Games
4. Preview Charlie's message
5. Turn on
```

The ordinary management screen does not show an introduction, a Delivery row, repeated agreement footer, permanent Apple caveat, or expanded child preview. Developer simulation moves to Developer Tools.

## Shared agreement grammar

The native card, Chat proposal, and receipt share:

- child;
- target label;
- schedule summary;
- daily limit;
- optional responsibilities summary;
- active state;
- current child explanation;
- delivery state: `needs_setup`, `applying`, `applied`, or `needs_attention`.

## Chat operation contract

Replace the overloaded `screen_time.configure` boundary with capability-owned operations:

- `screen_time.read` — current agreement, current child reason, device readiness, and delivery state.
- `screen_time.agreement.create` — one reviewed starter or custom agreement.
- `screen_time.agreement.update` — reviewed field-level diff.
- `screen_time.agreement.deactivate` — reviewed durable deactivation; completion waits for cleanup acknowledgement.
- `screen_time.exception.create` — fixed bounded exception, initially 10 minutes or until the current window ends.
- `screen_time.device.setup.open` — durable native handoff to the exact child setup step.
- `screen_time.device.release.open` — durable native handoff to caregiver-authenticated release.

Chat resolves a typed child membership from authorized Household evidence. A display name alone is never mutation authority. App/category selection remains a native selection reference; Chat can refer to the caregiver-visible label but cannot inspect Apple tokens.

## Confirmation and receipt semantics

- Reads require no confirmation.
- Agreement create/update/deactivate and exception creation always show an explicit compact proposal.
- Server acceptance produces `Agreement saved` or `Exception approved`, plus `Applying to Charlie's iPhone` when device work remains.
- Only the child-device receipt for the exact desired version produces `Applied on Charlie's iPhone`.
- Deactivation is not complete until cleanup is acknowledged.
- Stale proposals fail closed and refresh the current agreement before another confirmation.
- Chat has no Screen Time auto-apply path and no Phone Agent write path in this release.

## Reductive decisions

- One card, one setup path, one agreement object, one current explanation.
- No generic rule builder, dashboard, delivery console, or duplicate Chat policy store.
- Show device detail only when it changes the next action.
- Show a diff, not a paragraph, before a consequential Chat change.
- Ask at most one missing question per Chat turn.
- Temporary exceptions never edit the durable agreement.

## Activation

The primary invitation appears after Screen Time is activated for a child or when Chat receives a Screen Time request for that child. The starter plan demonstrates value before customization. Settings > Screen Time continues to summarize and route; Screen Time does not enter global navigation.

## Stated bet

We're betting that one default-first agreement, one compact management card, and conversational control over the same typed capability will make Screen Time feel like a family rhythm rather than administration. If it remains difficult, reduce the editable fields and offer stronger schedule presets before adding new rule types.

## Success signal

- A caregiver understands Charlie's current rule and next action without reading helper copy.
- First setup can be completed without backtracking or learning system terminology.
- Native and Chat changes produce the same resulting agreement and receipt states.
- Ordinary rule transitions reduce caregiver unlock requests.
- No Chat response overstates authority, policy application, or cleanup.
