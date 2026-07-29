# Yes-And: Friends Sharing

## Original idea

Add a Friends list outside Household so people—especially people who are single—have broader, reusable sharing relationships in Kwilt.

## Adjacencies

**Yes, and what if a Friend became a reusable recipient without becoming a standing permission?**

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: David chooses a trusted person once, then can invite that person into later Goals or moments without rebuilding the relationship each time.
- New value: A consistent friend picker across shareable Kwilt objects, while every share remains separately confirmed.
- Cost delta vs. original: medium
- Anti-pattern check: pass, provided friendship never implies visibility and the share preview names exactly what will become visible.

**Yes, and what if each friendship clearly showed the sharing boundary in both directions?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: David no longer has to remember or wonder what a trusted person can see.
- New value: A calm relationship detail showing “Shared by you,” “Shared with you,” and “Nothing shared” states, with direct revoke controls.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this is a privacy ledger, not an activity dashboard.

**Yes, and what if Kwilt offered Friends at the moment someone is already being invited?**

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: The durable relationship emerges from a real sharing moment instead of asking users to build an empty address book.
- New value: After accepting a Goal invitation, both people may choose to remain connected for easier future sharing.
- Cost delta vs. original: low
- Anti-pattern check: pass if the choice is optional, mutual, and does not change the visibility of the item already shared.

**Yes, and what if Friends could support small encouragement moments without creating a feed?**

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: A trusted person can acknowledge meaningful progress without needing access to the work behind it.
- New value: Cheers or short signals attached only to an explicitly shared Goal, milestone, or other object.
- Cost delta vs. original: medium
- Anti-pattern check: pass if signals are attached to user-shared objects; failure if Kwilt creates a general Friends Activity feed or broadcasts milestones by default.

**Yes, and what if the same person could be both a Friend and a Household member without either role leaking into the other?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Real relationships can overlap without forcing the user to choose one inaccurate label or accept accidental access.
- New value: A spouse can be a Household caregiver for one capability and also a Friend for a separately shared personal Goal.
- Cost delta vs. original: low
- Anti-pattern check: pass only if Household grants and friend shares remain independently visible and revocable.

**Yes, and what if Friends became the reusable people layer for future capability-specific sharing?**

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: David can bring the right person into the right room of his life using one familiar selection and preview pattern.
- New value: Goals first; later, deliberately approved share contracts could support an event, recipe, story, completed Explore path, or Chapter excerpt without inventing a new invitation system every time.
- Cost delta vs. original: high
- Anti-pattern check: pass as infrastructure; failure if capabilities inherit sharing automatically or if highly sensitive capabilities such as Money, live location, or Screen Time are treated as ordinary shares.

**Yes, and what if a friend invitation also became a natural, honest introduction to Kwilt for someone who does not use it yet?**

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: The recipient understands why they are joining because the invitation carries a real relationship and a specific future sharing intention.
- New value: Product-led growth that begins with trust and usefulness rather than referral rewards or contact harvesting.
- Cost delta vs. original: medium
- Anti-pattern check: pass if friend invitations and reward-bearing referral links remain distinct and the recipient sees no private content before accepting a separate share.

## Job elevation

The larger opportunity is not a social graph. It is a **trusted people layer** that makes Kwilt's privacy-first sharing model understandable and reusable across time. A Friends list is the first visible expression of that layer.

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

Keep **Friends inside Sharing** as the initial surface, but design it as the first reusable relationship layer for explicit, object-level sharing. The first release should remain narrow: recover the Friends roster, make relationship state clear, show that friendship grants no access, and reuse Friends when sharing a Goal. Relationship detail, cross-capability sharing, encouragement mechanics, and growth loops should remain sequenced expansions rather than v1 scope.

## Guardrail

Do not rename the first surface to “People” yet. “Trusted people layer” is an architectural and product framing, not another navigation concept the user must learn.
