# Converge: Saved Selection Overrides

## Decision

Choose saved selection handles with one-time native picker handoff, backed by a native quick-control fallback.

## Why

It is the only concept that makes repeat requests as simple as the stated example without pretending Apple exposes app identities to Chat. It enhances Chat and the existing child Screen Time owner rather than adding a control dashboard.

## Product primitives

1. **Selection** — a caregiver-named, child-scoped reference such as **Brawl Stars** or **Games**. Opaque Apple values remain on the authorized native side.
2. **Standing agreement** — recurring schedule/responsibility/usage policy.
3. **Temporary override** — **block** or **allow** for a selection, with an exact start, bounded duration, provenance, and optional link to the policy criterion it overrides.
4. **Request workflow** — a child request and caregiver decision that may produce the same temporary override; it is not a second enforcement system.
5. **Device receipt** — received/applied/expired/failed/released truth for the desired child policy version.

## Before and after

Today Maya cannot reliably say:

> Turn off Brawl Stars for Charlie and Grant for the next three hours.

After the release, if both selections are known, Chat shows:

```text
Block Brawl Stars
Charlie and Grant · until 9:25 PM

[Apply] [Change]
```

After approval:

```text
Saved. Applying to Charlie’s and Grant’s iPhones…
```

Only matching device receipts change this to **Applied**. At expiry, each device restores the compiled state required by every remaining policy; it does not blindly clear all restrictions.

If Grant has no **Brawl Stars** selection, Chat says:

```text
Choose Brawl Stars for Grant once.
[Choose app]
```

The action does not partially apply to Charlie unless Maya explicitly chooses a partial result.

The inverse workflow is equally direct:

```text
Allow Brawl Stars
Charlie · for the next 30 minutes · until 7:55 PM

[Apply] [Change]
```

**For the next 30 minutes** is elapsed wall-clock access. **Give Charlie 30 minutes of Brawl Stars** means 30 minutes of foreground use and requires a usage budget plus an outer expiry; Chat must not silently treat those phrases as equivalent.

## Reductive decisions

- No installed-app directory, policy dashboard, arbitrary rule builder, or permanent remote toggle.
- Chat is the fastest control surface; Household child Screen Time is the canonical inspect/correct surface.
- One proposal card contains action, selection, children, and exact expiry.
- Repeated controls may later suggest a standing agreement, but never create one automatically.
- V1 implements wall-clock **block**, wall-clock **allow**, **inspect**, and **cancel**. Usage-budget access follows after Device Activity thresholds are proven on signed devices.
- An **allow** overrides named Kwilt family restrictions for that selection only. It cannot promise to clear another Kwilt domain or a stricter Apple restriction.

## Activation

The first request is the education. Chat explains the one-time picker only when a named selection is missing. No tour is needed.

## Stated bet

We are betting that a family repeatedly controls a small named set of apps, so one native selection ceremony produces a high-value, near-zero-administration Chat workflow. If requests are mostly novel apps, we should invest in a faster native picker flow rather than fake name resolution.

## Success signal

Maya can issue the example command, understand the exact consequence in one glance, and see every device move from saved to applied and then expired without opening settings or manually reversing the block.
