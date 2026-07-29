# Diverge: Recipient Sharing Growth Loop

## Design axis

The alternatives vary across two choices:

1. How much useful participation happens before identity or installation?
2. How broadly does Kwilt invest in browser capability before the first loop is proven?

## Alternative A: The Install Bridge

The web page safely previews the sender, object type, and visibility boundary, then asks the recipient to open or install Kwilt for every meaningful action.

### Strengths

- Smallest web implementation.
- All authenticated behavior remains in the native app.
- Simplifies rate limiting and recipient identity.

### Weaknesses

- Acquisition is measured as traffic, not delivered value.
- Activation depends on an install before the recipient has helped anyone.
- Weak fit for a quick cheer, reply, or Game response.
- Repeats the generic-download failure in a more polished form.

### Failure condition

This fails if recipients understand the invitation but abandon before installing because the requested action was small.

## Alternative B: The Web Companion Envelope

The link renders a capability-specific, bounded companion experience. The recipient can preview safely and take the smallest useful guest action. Account or app escalation appears only for durable identity, ongoing participation, notifications, history, or native authority.

### Strengths

- Closes the sender-recipient value loop before conversion pressure.
- Extends the existing Goal cheer/reply experience rather than starting over.
- Gives Goal, Friend, Game, Household, and Screen Time distinct escalation policies inside one consent grammar.
- Supports acquisition, activation, and retention as separate, measurable stages.

### Weaknesses

- Requires careful per-capability authorization, abuse controls, and expired/revoked states.
- Universal links and context-preserving handoff must be reliable.
- A common shell can become misleading if it flattens capability-specific authority.

### Failure condition

This fails if guest participation causes privacy confusion, abuse, or enough duplicated web behavior that the mobile product slows down.

## Alternative C: Kwilt on the Web

Build a general authenticated web product where recipients can accept relationships, browse shared objects, manage notifications, and eventually use most Kwilt capabilities.

### Strengths

- Lowest long-term channel friction.
- Durable participation works without a mobile device.
- Simplifies links because the browser is a complete destination.

### Weaknesses

- Large product and engineering commitment before recipient demand is proven.
- Creates parity expectations across planning, Money, Explore, family authority, Games, and Screen Time.
- Multiplies privacy, authorization, accessibility, and support surface.
- Delays learning on the one already-working Goal loop.

### Failure condition

This fails if Kwilt builds broad browser parity while most recipients only wanted to understand and answer one invitation.

## Alternative D: Channel-native response

Let recipients answer through SMS or email actions, with Kwilt parsing the response and returning it to the sender.

### Strengths

- Extremely low recipient friction.
- Meets people in a channel they already use.
- Useful fallback for accessibility or unreliable web handoff.

### Weaknesses

- Harder consent, identity, threading, abuse, and delivery semantics.
- Weak preview of exactly what is shared.
- Carrier/email forwarding can blur who actually responded.
- Makes Kwilt's object boundary less visible.

### Failure condition

This fails if convenience obscures the invitation contract or produces ambiguous authorship.

## Comparison

| Alternative | Recipient value before install | Privacy clarity | Time to learn | Long-term scope | Business-loop quality |
| --- | --- | --- | --- | --- | --- |
| Install Bridge | Low | Strong | Fast | Small | Weak activation |
| Web Companion Envelope | High but bounded | Strong if typed | Fast-medium | Incremental | Strongest |
| Kwilt on the Web | Very high | Complex | Slow | Very large | Unknown until shipped |
| Channel-native response | Medium | Weak-medium | Medium | Specialized | Good only for narrow actions |

## Recommendation to converge

Choose **The Web Companion Envelope** and begin with the Goal experience that already exists. Keep the Install Bridge as the required fallback for actions that need authenticated or native authority. Revisit a full web product only if repeated browser participation demonstrates a broader job than responding to an invitation.
