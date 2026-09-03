---
id: brief-analytics-consent
title: Optional analytics consent and withdrawal
status: accepted
audiences: [audience-ai-native-life-operators]
personas: [Nina]
hero_jtbd: jtbd-trust-this-app-with-my-life
job_flow: job-flow-nina-trust-ai-with-my-life-system
serves: [jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-09-03
---

## Context

ASR-003 found that production analytics started before consent and had no withdrawal control.

## Target audience and persona

AI-native life operators represented by Nina need Kwilt's intimate system to remain inspectable, permissioned, and reversible.

## Aspirational design challenge

How might we help Nina make and reverse a clear analytics choice while preserving a quiet Settings hierarchy and ensuring no feature depends on that choice?

## Hero JTBD and job-flow step

`jtbd-trust-this-app-with-my-life` is the demand spine. This improves the permission/control gap across Nina's trust flow without claiming the AI-operation delivery scores changed.

## JTBD framing

When Kwilt can observe app usage, the user wants collection to be explicit, bounded, and reversible so they can trust Kwilt without surrendering control.

## Design

Product analytics defaults on after preference hydration, preserving Kwilt's previously approved posture and the owner's explicit risk decision. Legal & privacy contains one switch to withdraw or renew. Withdrawal immediately removes access to the client, clears persisted queues, resets identity, and opts out. Explicit withdrawal survives disclosure-version changes. Features retain deterministic behavior without analytics.

Essential authentication, authorization, sync, purchase, deletion, and security processing is separately classified and is not sent through this optional PostHog boundary.

## Success signal

Automated tests cover default-on unknown, granted, denied, withdrawn, persistence, rapid withdrawal, and version change; signed-build network evidence confirms no request after withdrawal.

## Spec refinement

The App Store ledger supplies the accepted scope and records the policy risk. Reinstall returns to default-on because local preference storage is removed. Device-to-device preference sync and per-event controls remain intentionally deferred.

## Open questions

None for source implementation. Signed TestFlight network verification remains a release gate.
