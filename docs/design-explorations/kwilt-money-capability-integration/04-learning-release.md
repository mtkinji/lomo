# Learning Release: Kwilt Money Capability Integration

## Concept To Build

Make existing Kwilt Money reality available as a read-only, privacy-aware capability inside
the one Kwilt app, with Money's established local navigation preserved.

## Capability Delta

Today, the user cannot:

- access Money inside Kwilt or see existing live Money data through the host session.

After this release, the user can:

- open Money from the capability menu;
- move among Summary, Transactions, and Accounts;
- inspect category and transaction detail;
- return from Chat or another capability to the same Money context;
- protect Money content with the expected native unlock behavior.

Still intentionally not supported:

- financial writes, Plaid connection mutation, widgets, Screen Time controls, or standalone-app retirement.

## User Experience

Maya selects Money from the Option G side sheet. The foreground moves aside and Money opens
at its last valid local place, defaulting to Summary. The host owns the hamburger/avatar and
global settings. Money owns the blue finance canvas, local Summary/Transactions/Accounts bar,
financial rows, detail screens, loading/empty/error states, and contextual actions. If privacy
lock is enabled and a legitimate relock event occurred, system authentication begins
automatically; the visible lock screen is a retry state, not a start screen.

## Existing Product Relationship

This enhances the unified capability shell. It ports the accepted Money workflow but does
not import the standalone launch, auth, entitlement, router, Ask, More, or settings shells.
It leaves Goals, To-dos, Plan, Arcs, Chapters, and unified Chat unchanged.

## Buildable Slice

Must be real:

- one React Navigation root and one host session;
- live `budget_*` reads under current RLS;
- Summary, Transactions, Accounts, category detail, and transaction detail;
- lifecycle-scoped queries/subscriptions;
- native privacy behavior and app-switcher cover while protected Money content is visible;
- deterministic deep links, persisted-state migration, and Chat exact return;
- release archive, App Thinning report, launch/memory evidence, and physical-device parity.

Can be thin or temporary:

- a compile-time preview availability while the slice is incomplete;
- manual side-by-side parity notes for the first internal cohort;
- read-only contextual Chat evidence before Money tools exist.

Intentionally excluded:

- writes, Plaid Link, Money widgets, Money Screen Time controls, household invites, mutation-capable Chat, and public rollout.

## Release Channel

**TestFlight build**, internal cohort only. Local and simulator work establishes iteration
confidence, but shared-session restoration, LocalAuthentication, app-switcher privacy,
archive size, and existing TestFlight data require a signed physical-device build.

## Brand-Goodwill Guardrails

- Label the capability `Money`, not a beta mini-app.
- Never show fixture totals after a live read failure.
- State actual, planned, forecast, outside-budget, and freshness values distinctly.
- Preserve Money blue and finance typography without adding dashboard chrome.
- Request no financial/native permission on global onboarding or before explicit intent.

## Reversibility

Keep the last accepted unified Kwilt TestFlight build and standalone Money build available.
Tag the read-only boundary. Changes remain additive and read-only against existing data.
If a gate fails, remove Money from the release build or cut a replacement from the prior
accepted tag; do not alter or delete Money data.

## Permanent Product Threshold

Promote beyond the read-only learning release only after live parity, privacy, lifecycle,
deep-link/return, archive-size, and physical-device gates pass, and after the first write
contract proves one authoritative rebuilt snapshot across every affected Money surface.
