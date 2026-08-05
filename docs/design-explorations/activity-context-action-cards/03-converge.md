# Converge: Context Reference + One Capability Action Card

## Decision

Treat Activity detail as a host for a small, typed projection owned by another
Kwilt capability or an approved connector.

An Activity answers **what and when**. A source reference answers **why this
exists**. A capability action card answers **where and how to act**.

## Presentation contract

- Zero or more compact, passive source references.
- At most one expanded primary action card.
- At most one primary and one secondary action on that card.
- Progressive disclosure for evidence, freshness, permissions, and receipts.
- The standard Activity title, schedule, steps, notes, completion, and deletion
  remain outside the card and user-owned.

Example, Gmail:

> **Return the field-trip permission form**\
> Gmail · Lincoln Elementary\
> “Permission form due Friday” · received Tuesday\
> **Open email** · Why this became a To-do

Example, Meal Planning:

> **Choose meals before the next shop**\
> Meal plan · closes Thursday\
> 3 of 5 people have responded\
> **Choose meals** · Pass this time

## Data boundary

The Activity should store references, not a provider's mutable domain model or
executable presentation:

```ts
type ActivitySourceReference = {
  id: string;
  providerId: string;
  resourceKind: string;
  resourceRef: string; // opaque outside the provider
  capturedAt: string;
};

type ActivityActionCardBinding = {
  providerId: string;
  projectionKind: string;
  resourceRef: string;
  sourceVersion?: string;
};
```

The exact schema should be designed with migrations, encryption, revocation,
and owner scoping before implementation. These types express the ownership
boundary, not a ready-to-code contract.

## Provider boundary

```ts
interface ActivityActionCardProvider {
  resolve(binding, viewer): Promise<CardProjection>;
  invoke(binding, actionId, expectedVersion, viewer): Promise<ActionReceipt>;
  getReturnTarget(binding, viewer): Promise<NativeOrExternalTarget>;
}
```

`resolve` rechecks authority and freshness every time. `invoke` accepts only a
registered typed action, applies provider policy and idempotency, and returns an
authoritative receipt. The Activity host renders a constrained Kwilt-owned
component vocabulary; providers do not supply JSX, URLs to execute silently,
or arbitrary commands.

## Lifecycle rules

- **Disconnected:** retain the Activity and user-authored content; replace the
  card with a truthful reconnect or unavailable state.
- **Deleted source:** retain the Activity unless the user explicitly chose
  source-coupled deletion.
- **Updated source:** refresh the projection and show material changes; do not
  overwrite user edits silently.
- **Duplicate detection:** key on provider resource plus normalized action
  identity. A changed Gmail thread updates its card rather than generating a
  second To-do.
- **Completed Activity:** freeze or summarize the latest receipt; do not keep
  background provider activity alive by default.
- **Sharing:** sharing an Activity does not automatically share its source.
  Every viewer is independently authorized by the owning provider.

## Authority ladder for AI-created Activities

1. **Candidate:** Kwilt identifies a possible action and asks the user to
   create, dismiss, or correct it.
2. **Observed rule:** after several examples, Kwilt offers a narrow rule with
   visible sender, label, action class, and expiry.
3. **Standing permission:** Kwilt may create Activities automatically only
   within that reviewed rule. New patterns return to candidate status.
4. **Revocation:** one place shows, pauses, edits, and removes every rule and
   connector permission.

Reading an email, opening a card, or replying is never sufficient evidence that
the underlying Activity is complete.

## Stated bet

If source-linked Activities explain their origin and provide one trustworthy
next action, users will accept more capture assistance without feeling that
Kwilt has turned their life into another inbox. The platform should be judged
by corrected or completed meaningful Activities, not cards rendered or emails
scanned.
