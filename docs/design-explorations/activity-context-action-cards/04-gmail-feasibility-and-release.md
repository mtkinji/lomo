# Gmail Feasibility and Release Ladder

Research checked against official Google documentation on 2026-08-05.

## What is possible without a commercial partnership

Kwilt does not need a negotiated Gmail partnership to build either path below.
It does need a Google Cloud project, OAuth configuration, user consent,
compliance with Google Workspace policies, and—depending on access—Google's app
verification process.

### Path 1: user-invoked Gmail add-on

A Google Workspace add-on can appear beside an open Gmail message on desktop
and mobile. When the user invokes it, temporary current-message scopes can let
the add-on read that message or thread and send selected context to Kwilt. A
first action could be **Create Kwilt To-do**, followed by a reviewable title,
date, and source reference.

Why this is the recommended first Gmail bridge:

- access is initiated from the message the user is already viewing;
- `gmail.addons.current.message.readonly` is classified as sensitive rather
  than restricted;
- the add-on can obtain a Gmail thread permalink for an exact return;
- it proves source provenance and handoff without scanning the mailbox;
- it works in Gmail's desktop and mobile clients.

This still requires OAuth verification for public use and should send only the
minimum selected context to Kwilt. It is not ambient inbox review.

### Path 2: background mailbox review

The Gmail API can list/search messages, read messages or metadata, retrieve
history, and watch a mailbox through Google Cloud Pub/Sub. This can support
rules such as “look for school messages with dates and propose To-dos.”

The practical constraint is material: `gmail.metadata`, `gmail.readonly`, and
`gmail.modify` are restricted scopes. A public app needs restricted-scope OAuth
verification; if Kwilt stores or transmits restricted-scope data through its
servers, Google says a security assessment is required. This is not a retailer
partnership negotiation, but it is a real production compliance dependency.

Metadata-only access does not include message bodies or attachments, so it is
unlikely to extract reliable actions from many emails. Full body analysis needs
`gmail.readonly` or another suitably broad restricted scope.

For server-side change detection, Gmail supports `users.watch` with Cloud
Pub/Sub and incremental history. Watches must be renewed at least every seven
days; Google recommends daily renewal. Notifications can be delayed or dropped,
so periodic reconciliation is still required. Google separately recommends
poll-based sync for user-owned devices.

## Recommended release ladder

### Release 0: native provider proves the host

Use Meal Planning as the first Activity action-card provider. It avoids OAuth
complexity and proves recurrence, viewer authorization, live status, action,
receipt, and exact return.

### Release 1: explicit Gmail capture

Build a Gmail add-on action for the currently open message:

1. User chooses **Create Kwilt To-do**.
2. Kwilt proposes one title, optional date, and short reason with source.
3. User creates, corrects, or dismisses it.
4. Activity detail offers **Open email** and “Why this became a To-do.”
5. No mailbox-wide access, silent creation, reply, send, or completion
   inference.

This release proves whether source-linked capture is valuable before Kwilt pays
the privacy and compliance cost of ambient review.

### Release 2: bounded connected-inbox candidates

After verification and security work, let the user select labels, senders, or a
narrow category. Produce a small candidate digest, not an inbox mirror. Every
candidate shows evidence and can be corrected. Dedupe by source thread and
action identity.

### Release 3: reviewed standing rules

Offer auto-creation only after the user has approved repeated examples. Rules
are narrow, visible, pausable, expiring, and reversible. Unfamiliar patterns
return to candidate review.

### Release 4: additional Gmail actions

Consider capability-owned **Draft reply** or **Mark handled** actions only after
capture trust is established. Drafting and sending require additional scopes
and explicit review. Kwilt should never silently send email.

## Security and privacy requirements

- Encrypt OAuth tokens and opaque source identifiers; never expose them in
  analytics or model logs.
- Store the minimum durable excerpt needed to explain the Activity, with clear
  retention and deletion behavior.
- Separate provider fetch from model inference and log both as inspectable,
  owner-scoped events.
- Redact quoted threads, signatures, tracking pixels, and attachments from the
  model input unless specifically needed and authorized.
- Treat message content as untrusted input. It may contain instructions aimed
  at the model and must never expand tool authority.
- Reauthorize at action time and use idempotency/version checks for every
  mutation.
- A shared Activity reveals no Gmail source content to a family member unless
  Gmail and the owner explicitly authorize it.

## Go/no-go gates for ambient Gmail review

Proceed beyond the add-on only if all are true:

- explicit capture demonstrates repeated user value;
- users understand and trust the source/evidence presentation;
- candidate precision is high enough that review reduces work rather than
  creating another triage queue;
- Google verification and security-assessment cost is acceptable;
- Kwilt has production-grade token storage, revocation, deletion, audit, and
  prompt-injection defenses;
- the system can explain every creation and avoid duplicates across thread
  updates.

## Official sources

- [Gmail add-ons](https://developers.google.com/workspace/add-ons/gmail)
- [Extending the Gmail message UI](https://developers.google.com/workspace/add-ons/gmail/extending-message-ui)
- [Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail push notifications](https://developers.google.com/workspace/gmail/api/guides/push)
- [Restricted-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
