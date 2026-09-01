# Frame: creator acquisition pilot

## What the user said

> Influencers should be part of Kwilt's next go-to-market phase, with a code,
> a customer benefit, and a creator kickback. The technical plan needs to work
> with Apple's subscription system.

## Restated in user voice

When Marcus hears a trusted creator describe a calmer way to put intention
before impulse, he wants to try the exact Kwilt experience being demonstrated
and understand the offer, so that he can decide whether Kwilt helps him act on
what matters without adopting another system to maintain.

## Target audience

`audience-burned-out-productivity-power-users` — people who have tried enough
tools and respond to credible, demonstrated relief rather than broad feature
claims.

## Representative persona

Marcus is tired of rebuilding his productivity system. He wants a small number
of trustworthy guardrails that turn intention into action.

- Current situation: his phone can win the moment before the action he meant to take.
- What he is trying to do: make the next honest move on what matters.
- Emotional tension: skeptical of hype, but willing to adopt something visibly useful.
- What would feel wrong: pressure, fake urgency, unclear pricing, or a code that behaves differently than promised.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — the creator demonstration must lead to
real progress, not merely an install or subscription.

## Job flow step

In `job-flow-marcus-move-the-few-things-that-matter`, **Decide what to do next**
is 3/5. Plan helps, but “what now?” is not yet the product spine. An advanced
Screen Time rule can make the next action the calm prerequisite before a drift
app opens. The creator program can make that value legible before download.

## Active anchors

- `jtbd-put-intention-before-impulse` — the first creator promise demonstrates a meaningful action before drift.
- `jtbd-carry-intentions-into-action` — the paid value should carry a chosen intention through a real moment.
- `jtbd-trust-this-app-with-my-life` — pricing, attribution, claims, privacy, and cancellation must be inspectable.

## Friction we're addressing

Kwilt has no deterministic, payout-grade creator attribution path. A web click
can disappear across App Store installation, Apple offer codes do not define
Kwilt's complete commission policy, and the existing friend-referral system is
an install/AI-credit loop rather than a commercial partner ledger.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: the public site already routes referral links and stores pending link context.
- Existing user flow: App Store purchase remains StoreKit through RevenueCat.
- Existing domain/data model: installs, authenticated users, RevenueCat app user IDs, subscription webhooks, and friend referrals already exist.
- Existing technical affordances: campaign/UTM analytics, deep links, Edge Functions, and super-admin tools can be extended.
- Existing UX/copy conventions: contextual value, honest pricing, Restore, and calm non-promotional language.

Constraints to preserve:

- Apple remains the purchase and subscription source of truth.
- A creator code never grants Pro by itself.
- Friend referrals remain separate from commercial creator compensation.
- Private content, child data, selected apps, and financial data never enter attribution or payout records.

Constraints we may challenge:

- Today there is no explicit post-install creator claim. The pilot may add one small, skippable claim step because deterministic attribution cannot otherwise survive every install path.

Design implication: extend the current install identity and RevenueCat lifecycle
with a server-owned creator claim and commission ledger; do not create a second
billing system or a broad creator portal for the pilot.

## Aspirational design challenge

How might we help Marcus move from a trusted creator's concrete demonstration
to a truthful Kwilt experience and retained paid value, while preserving Apple
billing truth, customer privacy, and calm choice?

## Out of scope

An open creator marketplace, lifetime revenue share, automated tax/bank
onboarding, multi-touch attribution, and a self-serve creator portal.

## Open question

Which five creators can demonstrate the same approved advanced Screen Time job
without making claims beyond signed-device and App Review evidence?
