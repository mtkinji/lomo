# Yes-And: Nearby Game Join

Original idea: make the Games **Join** action discover nearby open games so joining is easier.

## Adjacencies

**Yes, and what if it could use the player's remembered Games name so a found table is genuinely one tap away?**

- Serves: `jtbd-help-us-enjoy-being-together`
- Job elevation: removes the last setup field for a returning player.
- New value: nearby discovery becomes action, not merely information.
- Cost delta vs. original: low
- Anti-pattern check: pass; identity stays editable and local to the game context.

**Yes, and what if every remote-capable game used the same open-table pass and nearby card grammar?**

- Serves: `jtbd-help-us-enjoy-being-together`
- Job elevation: people learn one way to join Kwilt play.
- New value: Bank and Slanguage stop feeling like isolated technical exceptions.
- Cost delta vs. original: medium
- Anti-pattern check: pass if only games with a real shared-room contract opt in.

**Yes, and what if the host and joiner saw the same playful table mark when several tables were nearby?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: choosing the right table feels confident without revealing identity or distance.
- New value: safe disambiguation at gatherings with multiple games.
- Cost delta vs. original: low
- Anti-pattern check: pass; it is a transient human check, not a tracking identifier.

**Yes, and what if discovery failure taught the fallback in place instead of producing a permission dead end?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the group keeps moving even when local-network discovery does not.
- New value: denial and weak-network states do not end the play attempt.
- Cost delta vs. original: low
- Anti-pattern check: pass; calm, contextual education rather than a tour.

**Yes, and what if the underlying transport became a small shared nearby-session primitive for Games and device setup?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt gains one audited foreground-discovery foundation instead of unrelated native implementations.
- New value: consistent lifecycle, permission handling, timeout, and privacy boundaries.
- Cost delta vs. original: high
- Anti-pattern check: pass only if product contracts remain separate. A game advertisement can be one-sided; child-device pairing requires mutual entry, phrase confirmation, authenticated acceptance, and stronger expiry.

**Yes, and what if a disconnected player could find and rejoin the same still-open table without asking the host for help?**

- Serves: `jtbd-help-us-enjoy-being-together`
- Job elevation: a transient radio or app interruption does not turn one person into table support.
- New value: recovery preserves the social moment.
- Cost delta vs. original: medium
- Anti-pattern check: pass if server membership remains authoritative and proximity never bypasses rejoin rules.

**Yes, and what if a person without Kwilt could eventually use a QR/App Clip path while installed phones kept the nearby path?**

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: guests can participate without an account ceremony.
- New value: lowers the install boundary for mixed groups.
- Cost delta vs. original: high
- Anti-pattern check: pass in principle, but it is a separate distribution bet and should not expand this release.

## Frame recommendation

**Run design-thinking-loop with the original frame**, refined as **nearby-first activation inside the existing Join sheet**. The shared transport primitive is a worthwhile architecture follow-up only after both Games and child-device pairing have proven concrete native requirements.
