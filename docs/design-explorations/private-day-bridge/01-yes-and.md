# Yes-And: Private Day Bridge

## Original idea

When a Kwilt Activity becomes a real time commitment, continue writing the detailed event to the configured default write calendar and optionally protect the same time on a work calendar with an anonymous `Busy` block.

## Adjacencies

**Yes, and what if it could...** use availability-only access for calendars whose event details Kwilt does not need.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can receive planning help without granting unnecessary access to sensitive context.
- New value: a connected calendar can contribute time boundaries without becoming a source of titles, notes, guests, or locations.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this reduces data collection instead of creating a privacy dashboard.

**Yes, and what if it could...** keep an accepted commitment stable instead of continuously reshuffling it.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: protected time becomes a promise the user can trust, not a suggestion that an optimizer may move later.
- New value: the user can plan around Kwilt commitments and understand when a conflict genuinely requires attention.
- Cost delta vs. original: low
- Anti-pattern check: pass; no productivity-pressure or invisible AI control.

**Yes, and what if it could...** show one plain receipt for the detailed event and every anonymous protection block.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user knows what Kwilt changed, where it changed it, and what other people can see.
- New value: partial failures, moves, deletions, and repair can remain comprehensible without exposing integration plumbing during the happy path.
- Cost delta vs. original: low
- Anti-pattern check: pass; the receipt is evidence, not a status dashboard.

**Yes, and what if it could...** learn a calm default the first time the user protects personal time at work.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: repeated personal commitments are protected without requiring the same decision every time.
- New value: a one-time contextual choice replaces a pairwise calendar-sync rules builder.
- Cost delta vs. original: low
- Anti-pattern check: pass if the default is explicitly chosen, visible at commit time, and easy to override.

**Yes, and what if it could...** protect personal appointments that already exist outside Kwilt.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user's full personal day could be protected at work, not only the intentions created through Kwilt.
- New value: broader double-booking protection.
- Cost delta vs. original: high
- Anti-pattern check: risk; this becomes ongoing calendar mirroring, background mutation, and lifecycle reconciliation. Keep it out of the initial frame.

**Yes, and what if it could...** share anonymous availability boundaries with a partner or household without sharing event meaning.

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: coordination can improve without turning another person's life into a visible feed.
- New value: household planning could use availability as a boundary rather than surveillance data.
- Cost delta vs. original: high
- Anti-pattern check: pass in principle, but household authority and consent make this a separate future design problem.

## Job elevation

The original idea is not merely a convenience for calendar synchronization. It elevates `carry intentions into action` by making protected time the trustworthy handoff between deciding and doing, and it elevates `trust this app with my life` by making privacy minimization visible in the product behavior rather than only promised in policy.

## Frame recommendation

**Run the design-thinking loop with the original frame.**

The availability-only read, stability, receipt, and remembered-default adjacencies belong inside the protected-commitment design. Existing-event mirroring and household availability are meaningful future extensions, but including them now would turn a sharp Activity-to-time experience into a calendar-sync platform.
