# Monetization release readiness — alternatives

## Option A — Patch each new feature

Add the existing paywall drawer to every originally proposed paid entry button,
including Money and Budgets, Cook Mode, Family Screen Time, and Live
Conversation.

- **Benefit:** smallest UI change.
- **Failure mode:** deep links, Chat, background jobs, MCP, and direct
  provider/server calls can bypass it. Old Free-feature gates and the
  partial-trial model remain, and a Cook/Conversation paywall adds friction to
  low-value MVP previews while confusing cost protection with a claim that
  those experiences are ready or highly valuable.
- **Verdict:** reject. It creates the appearance of monetization without reliable access control or lifecycle behavior.

## Option B — Central client policy

Create one typed `ProCapability` policy in the app and route all visible navigation through it.

- **Benefit:** consistent interstitial copy and client behavior.
- **Failure mode:** a modified or stale client can still initialize paid providers or call privileged server operations. RevenueCat cancellation, grace, expiration, cleanup, and support truth remain fragmented.
- **Verdict:** necessary but insufficient.

## Option C — Layered monetization control plane

Use one declared capability policy for product meaning, then enforce it at four layers:

1. contextual paid-intent entry in the app;
2. navigation, Chat, deep-link, and background orchestration guards;
3. trusted server/provider authorization;
4. durable subscription lifecycle, analytics, support, and release evidence.

The Pro capability list protects the accepted paid value. Separate authenticated
cost controls protect free previews. The public value hierarchy and production
exposure are readiness-led decisions rather than consequences of code presence
alone.

- **Benefit:** consistent customer experience, resistant to bypass, supports downgrade and provider-cost control, and creates a reusable contract for future capabilities.
- **Cost:** touches product policy, app, backend, store configuration, marketing, analytics, support, and release operations.
- **Verdict:** choose.
