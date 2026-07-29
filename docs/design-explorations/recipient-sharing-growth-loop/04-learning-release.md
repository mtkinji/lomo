# Learning Release: Recipient Sharing Growth Loop

## Release shape

Use a **production-small** learning release with Andrew plus 2–5 trusted two-person pairs using real Kwilt accounts and real `go.kwilt.app` Goal links.

The experience should run against production Supabase and the production website, but distribution remains deliberate and small. Do not announce a general Friends, Games, or web-product launch.

## Learning goal

Learn whether a safe, useful web action closes a support loop strongly enough to produce a second interaction and whether the account/app handoff feels like added value rather than an entrance fee.

## Must be real

- A valid Goal link opens a useful web page on a normal mobile browser.
- The page states who invited the recipient, which one Goal is involved, what supporters can see, and what remains private.
- Available check-ins can receive a guest cheer or short reply.
- The sender receives that action in the real Goal feed without manual database intervention.
- The recipient sees an honest post-action next step and can decline it.
- Open/install handoff preserves the invitation context.
- Universal-link association and native deep-link routing are deployed and verified for the intended hosts and paths.
- Expired, revoked, already-accepted, malformed, and unavailable invitations have distinct safe states.
- Rate limits and abuse controls protect public response endpoints.
- Analytics conform to the privacy contract before traffic is sent to the learning release.

## Intentionally thin

- The cohort is recruited manually.
- Goal is the only implemented envelope.
- A Friend suggestion may be represented by a quiet contextual action after success; full web Friend acceptance is not required.
- Funnel reporting may be aggregate and manually reconciled for the small cohort.
- App Store/TestFlight handoff may use one supported iOS path first, provided the fallback is truthful.

## Explicitly excluded

- Full browser authentication or a web Kwilt dashboard.
- Games guest participation.
- Household joining, child grants, Screen Time setup, Money, Explore location, or other sensitive capability access.
- Referral rewards, contact imports, public profiles, feeds, friend counts, or automated invitation campaigns.
- A paywall, trial prompt, or pricing test on the first recipient action.
- Monetization claims based only on invite opens or installs.

## Brand and interaction guardrails

- The invitation is a calm human moment, not an acquisition landing page with a private payload attached.
- Color has semantic meaning: brand identity, state, a critical action, or a reusable concept. It is not decorative section chrome.
- The primary action is the recipient's useful response when available. **Get Kwilt** is subordinate until after value.
- Pass, expiry, and revocation are respectful terminal states, not error traps.
- Copy distinguishes guest response, Goal membership, friendship, and Household authority.

## Reversibility

- The Goal web action can be disabled independently of Goal invitation preview.
- The post-value Friend offer can be hidden independently.
- Handoff routing can fall back to the web state without losing the invitation.
- New analytics fields are allowlisted; prohibited properties are removed rather than merely ignored in dashboards.
- A privacy or authorization failure immediately disables guest mutations while preserving a safe terminal page.

## Build order

1. Remove prohibited private properties from Goal landing and response analytics; add contract tests.
2. Repair and verify AASA/asset-links plus native route ownership for Goal invite URLs.
3. Introduce the typed recipient-envelope response contract behind the existing Goal page.
4. Make active, expired, revoked, accepted, and unavailable states explicit.
5. Preserve context through open/install and back to the invite.
6. Verify recipient action → sender receipt with two separate accounts.
7. Add the quiet post-action Friend offer only after the complete Goal loop is proven.

## Stop conditions

- Any recipient can inspect an invitation they were not meant to see.
- Analytics capture an invite code, name, content, raw identity, or reconstructable relationship.
- A guest response is attributed to the wrong Goal or sender.
- The page implies an action succeeded when the sender did not receive it.
- App handoff loses context or creates membership without explicit consent.
