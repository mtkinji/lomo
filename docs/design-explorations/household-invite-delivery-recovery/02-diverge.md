# Diverge: Household Invite Delivery And Recovery

Axis: sender-driven transport vs recipient-aware recovery vs proximity-first setup.

## A. Transport-complete receipt

Create a new invitation, actually send email, and show QR/code/share on the sender receipt. This fixes delivery truth and manual friction, but a recipient who misses the email still has to obtain a secret. Best when sender and recipient can coordinate; fails when the first handoff disappears.

## B. Account-aware pending invitation

Email is a real transport, but the signed-in recipient also sees an email-matched pending invitation automatically. Re-inviting the same email and role recovers the same pending invitation identity. QR, link, and a short code are immediate fallbacks from one sender receipt. Best when the family may resume later or switch transports; fails only when the invite is not email-bound, where explicit secret entry remains necessary.

## C. Nearby-first family setup

Put both phones into foreground pairing and use a matching phrase, with QR/code fallback. This is excellent when both people are together but adds permissions, session state, and a second mental model for a failure that also occurs at a distance.

All three preserve explicit review, private-by-default membership, and capability-owned access. None introduces a feed, public discovery, default sharing, or productivity administration.
