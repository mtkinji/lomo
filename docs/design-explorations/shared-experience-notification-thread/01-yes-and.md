# Yes-And: Shared Experience Notification Thread

## Original idea

Meaningful notifications from shared Kwilt experiences can also land in a
durable Chat continuation, where the recipient can understand what happened,
respond, and return to the owning capability.

## Adjacencies

**Yes, and what if it could...** preserve the exact event behind the push, so
opening it later returns to the same notice instead of merely opening the newest
Chat screen?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can safely return after an interruption without
  reconstructing what the notification meant.
- New value: one event identity can connect push delivery, Chat context, the
  native destination, and eventual handled state without duplicating authority.
- Cost delta vs. original: medium
- Anti-pattern check: pass when the event is a bounded handoff record rather
  than a new universal social object.

**Yes, and what if it could...** bundle related low-urgency events into one calm
update while still letting an urgent or time-sensitive invitation arrive alone?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: family participation remains visible without training Maya to
  ignore Kwilt.
- New value: several cheers, joins, or availability changes can become one
  comprehensible continuation instead of notification spam.
- Cost delta vs. original: medium
- Anti-pattern check: pass when bundling is deterministic and urgency is
  capability-declared, not engagement-optimized.

**Yes, and what if it could...** answer “What happened?” using only the context
that the originating invitation already authorizes?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: a person can understand a shared moment without opening
  several screens or accidentally widening disclosure.
- New value: Chat can explain a Goal-support response, Household change, or Game
  invitation state while the capability supplies the permitted evidence.
- Cost delta vs. original: medium
- Anti-pattern check: pass when Chat cites bounded capability facts and never
  infers private motive, sentiment, or undisclosed activity.

**Yes, and what if it could...** offer the next capability-owned response in
place: encourage, accept, decline, return to table, rematch, review access, or
open the source?

- Serves: `jtbd-help-us-enjoy-being-together`
- Job elevation: the notice becomes a small doorway back into participation,
  not merely a report that participation happened.
- New value: Chat can stage or invoke a typed action while Goal, Household, or
  Games remains responsible for validation and the authoritative result.
- Cost delta vs. original: medium
- Anti-pattern check: pass when actions are explicit and capability-governed;
  failure if freeform Chat text is silently sent as another person's message.

**Yes, and what if it could...** let Maya say “quiet these game-turn notices” or
“tell me only when the table is ready,” then show a reversible receipt?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: notification control happens at the moment its meaning is
  obvious, without making Maya manage a settings taxonomy.
- New value: contextual, capability-scoped delivery preferences can replace
  broad mute-or-allow choices.
- Cost delta vs. original: high
- Anti-pattern check: pass only with explicit scope, confirmation, undo, and no
  learned suppression based on engagement behavior.

**Yes, and what if it could...** remember that a notice was handled without
turning the thread into an unread-count obligation?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Maya can distinguish “still needs me” from “already resolved”
  without maintaining an inbox.
- New value: capability truth—accepted, declined, joined, expired, completed—can
  close a notice automatically and truthfully.
- Cost delta vs. original: medium
- Anti-pattern check: pass when handled state follows capability facts; failure
  if Kwilt introduces red badges, backlog pressure, or manual inbox zero.

**Yes, and what if it could...** give future Explore and Recipe invitations the
same delivery grammar without giving them the same data or actions?

- Serves: `jtbd-invite-the-right-people-in`
- Job elevation: Maya learns one calm way to recognize a shared invitation while
  each capability preserves its own participation and privacy contract.
- New value: a reusable delivery envelope can carry an experience type,
  disclosure summary, action contract, native return target, and lifecycle
  state without becoming a universal sharing table.
- Cost delta vs. original: low
- Anti-pattern check: pass when only the delivery envelope is shared; failure if
  the envelope becomes a blanket permission or shared-content model.

**Yes, and what if it could...** eventually continue through another authorized
channel while returning to the same in-app context?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: a family member can notice and resume the experience from the
  channel available to them without losing causality.
- New value: push, future Phone/SMS, and in-app Chat could share one event and
  return target rather than producing unrelated messages.
- Cost delta vs. original: high
- Anti-pattern check: pass only with channel-specific disclosure and consent;
  keep this out of the first release.

## Job elevation

The bigger job is not “save notifications in Chat.” It is: preserve a calm,
privacy-bounded path from **something meaningful happened** to **I understand it
and can participate**. Chat is useful because it can hold context and ordinary
language; the notification and the capability still own interruption and truth,
respectively.

## Frame recommendation

**Run the design-thinking loop with the original frame.** The frame is already
large enough to test the important idea: durable, respondable continuation for
selected shared-experience notices. Carry forward event identity, bounded
explanation, typed next actions, handled state, and a reusable delivery envelope.
Defer cross-channel delivery and conversational preference management so the
work does not expand into a general notification platform before the core
experience proves useful.
