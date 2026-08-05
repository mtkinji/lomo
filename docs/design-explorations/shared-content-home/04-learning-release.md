# Learning Release: Shared Content Home

## Concept To Build

Home is a feed-first receiving surface where intentionally shared Kwilt objects appear as sender-led cards and return to their owning capability.

## Capability Delta

Today, the user cannot:

- receive rich shared content in Home;
- understand Home as more than invitations and game turns.

After this release, the user can:

- receive a shared Goal check-in alongside existing invitations and turns;
- recognize sender, source capability, content, time, and next action;
- open the authoritative Goal from the card.

Still intentionally not supported:

- Exploration and recipe sharing;
- a Home composer;
- inline Home replies or reactions;
- ambient family activity.

## User Experience

Pending invitations and game turns appear in a compact **Needs you** section. A chronological **Shared with you** stream contains available or completed shares. Cards lead with a sender identity mark and human authorship, then show the source capability, content preview, time, and one source-owned action. With no items, the state is centered in the available page.

## Existing Product Relationship

This revises the current `SharedHome` surface and extends `kwilt_shared_deliveries`. Shared Goal check-ins remain authored and discussed inside Goals. Push continues to point to one stable Home item.

## Buildable Slice

Must be real:

- additive database constraints for an available Goal check-in item;
- server verification of the check-in author and active Goal recipients;
- allowlist-gated, idempotent fan-out to exact permanent accounts;
- client parsing, caching, grouping, destination routing, and rich-card presentation;
- focused Jest, Deno, migration-contract, and RLS tests.

Can be thin:

- name-derived avatar circles;
- one content adapter;
- best-effort publishing after a successful check-in.

Intentionally excluded:

- new Explore ACLs, per-capability archives, Home reactions, and algorithmic ranking.

## Release Channel

Production-hidden. The schema and function may deploy, but both server emission and client visibility retain the existing recipient allowlist and `shared-home-v1` flag.

## Brand-Goodwill Guardrails

- Only established Goal members receive check-ins.
- Check-in text is never copied beyond its existing Goal audience.
- A failed Home projection never fails the authoritative check-in.
- Push copy remains generic on the lock screen.

## Reversibility

Remove the check-in publishing call or recipient allowlist to stop new items. Existing rows expire under the current retention policy. No Goal content or membership needs migration.

## Permanent Product Threshold

Two separate permanent accounts prove check-in creation, Home delivery, exact Goal routing, and wrong-account denial; then a second rich capability can adopt the envelope without changing its semantics.
