# Diverge: Provisioned Email Sign-In And Demo Accounts

## Axis of variation

Ordinary provisioned credentials vs. an in-app synthetic mode vs. a new public account method vs. temporary access credentials.

## Alternative A: Provisioned Ordinary Accounts

Add **Sign in with email** as a secondary choice. Only server-provisioned accounts have passwords in the first release. Demo identities are ordinary least-privilege Supabase users backed by versioned synthetic data and a reset process.

- Persona fit: strong for Nina's trust expectations and Maya-shaped household demonstrations.
- Design-challenge answer: dependable access with no separate client authority model.
- System fit: extends the existing session path; keeps downstream auth provider-agnostic.
- Best when: App Review and invited evaluation need stable credentials and real account-backed behavior.
- Fails when: provisioning and reset are treated as manual one-off database edits.
- Four-object model: synthetic Arcs, Goals, Activities, and Chapters use the real model.
- Capture-first: preserved; signed-out local use remains.
- Anti-pattern check: pass.

## Alternative B: Fully Featured Demo Mode

Add an **Explore a demo household** entry that loads a bundled or server-projected synthetic state without creating an ordinary identity.

- Persona fit: approachable for Maya-shaped product tours.
- Design-challenge answer: easy exploration without credentials.
- System fit: weak; many account-backed, shared, server, and provider paths need parallel behavior.
- Best when: the goal is a self-guided visual tour rather than authentication or integration proof.
- Fails when: App Review needs full functionality or the demo path drifts from production.
- Four-object model: can display the real objects, but mutations risk becoming a parallel engine.
- Capture-first: preserved.
- Anti-pattern check: fails if fake receipts or fabricated provider success appear; fixing that removes much of its review value.

## Alternative C: Public Email Registration And Password Sign-In

Offer email/password signup, verification, recovery, login, and provider management to every user.

- Persona fit: strong for people avoiding social login.
- Design-challenge answer: creates a durable general-purpose account method.
- System fit: moderate; authentication is supported, but identity linking, duplicate accounts, recovery, and support become product commitments.
- Best when: user evidence shows meaningful demand for email-based account creation.
- Fails when: demo access is the only validated need.
- Four-object model: unchanged after authentication.
- Capture-first: preserved if signup stays optional.
- Anti-pattern check: pass, but overbuilt for the current evidence.

## Alternative D: Expiring Demo Link Or Access Code

Provision a temporary token that exchanges into one bounded demo identity or clone.

- Persona fit: good for short invited evaluations.
- Design-challenge answer: avoids a reusable password while keeping access controlled.
- System fit: weak-to-moderate; introduces a new credential exchange, expiry, recovery, and replay boundary.
- Best when: many external evaluators need isolated short-lived sessions.
- Fails when: App Review needs credentials that remain stable across asynchronous review.
- Four-object model: unchanged after exchange.
- Capture-first: preserved.
- Anti-pattern check: pass only if token use never becomes a hidden entitlement mechanism.
