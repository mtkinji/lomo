# Yes-And: Kwilt Loops

## Status

This is Phase 0 product exploration. It proposes no app changes and does not
authorize implementation.

## Original idea

Let a customer tell Kwilt in ordinary language what should happen later—at a
time, after an event, or when a condition becomes true—and let the owning
capability create a durable, inspectable loop that can notify, ask, prepare, or
perform only the level of action the customer authorized.

Money checks such as `Tell me every Friday` and `Text me when I get paid` are
the first concrete examples, not the whole capability.

## Adjacencies

**Yes, and what if any useful Chat moment could become a loop without opening
settings?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: turns an answer, intention, or unresolved question into future
  help while the meaning is still obvious.
- New value: `Tell me this every Friday`, `Ask me again in two weeks`, and
  `Prepare this every Sunday` reuse the current context instead of making the
  customer rebuild a rule.
- Cost delta vs. original: low
- Anti-pattern check: pass when Chat creates a typed proposal or receipt and no
  empty automation object exists before the customer asks.

**Yes, and what if loops could notice events and conditions, not only clocks?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: brings attention closer to the real-life moment that makes the
  intention relevant.
- New value: income deposit settled, account became stale, a Goal entered a
  quiet period, an Activity was completed, a Screen Time request arrived, or a
  place was entered can all be supported trigger families.
- Cost delta vs. original: medium
- Anti-pattern check: pass only when the owning capability defines trustworthy
  trigger evidence and Kwilt labels inference rather than pretending certainty.

**Yes, and what if a loop could produce different levels of outcome?**

- Serves: `jtbd-stay-in-control-of-ai-actions`
- Job elevation: customers can receive useful follow-through without granting
  one universal automation permission.
- New value: one loop may notify, another may ask a question, another may
  prepare a proposal, and a narrowly authorized reversible loop may execute an
  operation and return a receipt.
- Cost delta vs. original: high
- Anti-pattern check: pass when authority is attached to the outcome operation,
  not inferred from the existence of a schedule.

**Yes, and what if every capability supplied its own loop recipes?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt can generalize timing and delivery without flattening
  the meaning of Money, Goals, Activities, Chapters, Screen Time, or Household.
- New value: Money defines supported financial checks; Goals defines check-ins;
  Activities defines reminders and recurrence; Chapters defines retrospective
  preparation; Screen Time defines device enforcement and review handoffs.
- Cost delta vs. original: medium
- Anti-pattern check: pass when the shared runtime never owns domain
  calculations, eligibility, mutation policy, or correction semantics.

**Yes, and what if one loop could meet the customer through the right channel?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: preserves continuity when the useful moment occurs away from
  the app.
- New value: an in-app update, private push, Phone Agent SMS, later voice, or a
  native handoff can deliver the same loop outcome with channel-specific
  consent and disclosure.
- Cost delta vs. original: medium
- Anti-pattern check: pass when channels share causal history but retain their
  own privacy, identity, delivery-status, and opt-out requirements.

**Yes, and what if Kwilt could suggest a loop after observing repeated demand?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: reduces setup for customers who repeatedly ask the same useful
  question or perform the same review.
- New value: after several Friday Money questions, Kwilt may offer `Want this
  every Friday?` without enabling it automatically.
- Cost delta vs. original: medium
- Anti-pattern check: pass only when the offer is occasional, dismissible, based
  on inspectable evidence, and never treated as consent.

**Yes, and what if every loop explained its last evaluation and next moment?**

- Serves: `jtbd-understand-why-ai-suggested-this`
- Job elevation: makes background silence and action trustworthy rather than
  mysterious.
- New value: `Last checked Friday—nothing sent because flexible room was above
  $200`, `Next check after the next supported income deposit`, and exact action
  receipts.
- Cost delta vs. original: low
- Anti-pattern check: pass when this remains a calm detail and does not become a
  monitoring dashboard.

## Job elevation

The larger job is not “schedule notifications.” It is:

> Help me carry a useful intention across time, notice when it becomes relevant,
> and close the loop without requiring me to remember where or how Kwilt works.

This is already expressed precisely by `jtbd-carry-intentions-into-action`,
whose definition covers carrying an intention across time, channels, prompts,
action help, and loop closure without making the customer manage every step.
No new JTBD is needed.

## Proposed system boundary

### One loop contract

```text
KwiltLoop
├── owner             capability and object/scope
├── intent            customer-visible sentence
├── trigger           time | event | condition | elapsed-without-event
├── evaluation        capability-owned question or eligibility check
├── outcome           notify | ask | prepare_proposal | execute_operation
├── authority         ask_each_time | standing_scoped_permission
├── delivery          in_app | push | phone_agent_sms | native_handoff
├── disclosure        private | summary | detailed
├── lifecycle         active | paused | completed | expired | failed
└── evidence          last evaluation, delivery, proposal, or receipt
```

The shared loop runtime owns trigger registration, due evaluation, timezone,
quiet hours, caps, deduplication, retry, delivery state, pause/resume, and causal
run creation. The owning capability supplies the evaluation and operation.
Unified Chat is the primary natural-language authoring and correction surface.
Phone Agent and notifications are delivery providers.

### Outcome authority ladder

1. **Notify:** report a supported answer or state change.
2. **Ask:** request one decision or missing fact.
3. **Prepare:** create a typed proposal for review.
4. **Execute:** invoke one explicitly permitted, narrow, reversible operation
   and return an authoritative receipt.

Authority does not automatically climb this ladder. `Tell me when I get paid`
does not authorize moving money. `Ask me about this Goal next month` does not
authorize editing it. `Prepare my Sunday options` does not add Activities until
the relevant capability policy permits and records that action.

### Important distinctions

- A recurring **Activity** says the customer intends to do something repeatedly.
  A loop says Kwilt should notice a trigger and produce an outcome. Do not turn
  every recurrence into background agent work.
- A device **notification** is one delivery channel, not the loop itself.
- A **Phone Agent prompt** is one channel projection of the same loop and causal
  agent run, not a parallel source of domain truth.
- A capability's existing scheduled process may adopt the shared substrate
  later, but consolidation alone is not a user benefit and should not block a
  focused learning release.

## Experience model

Do not add a top-level `Loops` or `Automations` capability. Customers should
encounter loops where their meaning is clearest:

- Chat: `Tell me this every Friday.`
- Money: `Money checks` under the Money plan.
- Goal detail: `Check in with me about this.`
- Activity detail: recurrence and reminders remain Activity-owned.
- Screen Time: enforcement conditions and exceptions remain owner-local.
- Phone Agent: channel permission, quiet hours, caps, and delivery health.

If cross-capability management becomes necessary, **Settings > Follow-ups** can
be a quiet overview and router, analogous to Settings > Screen Time. Rows show
the customer's sentence, next moment, channel, and status, then route back to
the canonical owner. It should not become a general rule builder.

## Examples across Kwilt

| Customer says | Owner | Trigger | Outcome | Maximum initial authority |
| --- | --- | --- | --- | --- |
| `Tell me after payday what is flexible.` | Money | supported income deposit settled | fresh Money answer | notify |
| `Every Friday, text me my Money check.` | Money | weekly cadence | Phone Agent SMS | notify |
| `Ask me about this Goal in two weeks.` | Goals | one-time clock | contextual Chat question | ask |
| `If I have not called Dad in three weeks, check in.` | Relationships/Activities | elapsed without supported evidence | Phone Agent or push question | ask |
| `Every Sunday, prepare a few options for my week.` | Goals/Activities | weekly cadence | Weekly Options proposal | prepare |
| `Remind me when I get to Costco.` | Activities/Places | confirmed place entry | Activity reminder | notify |
| `When Shopping runs hot, pause these apps.` | Money/Screen Time | Money-owned condition | device enforcement claim | execute only through existing explicit Screen Time agreement |

## Risks to solve before convergence

- Which trigger families are trustworthy enough for a first release?
- What default time is used when a cadence omits one, and where is it explained?
- Which operations, if any, deserve standing permission rather than per-run
  review?
- How do multiple loops deduplicate without silently changing customer intent?
- When does a finite follow-up complete rather than becoming permanent noise?
- How are household actor, subject, recipient, and authority represented?
- What does failure look like when a provider, device, account, or trigger
  evidence is unavailable?
- How does the customer find and stop every loop through both its owning
  capability and a quiet central overview?

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

The Money outreach idea is the first high-value instance of a broader
capability: a channel-independent, capability-owned **Kwilt Loop** system for
carrying intentions across time. Frame the next exploration around one shared
trigger/outcome/authority contract, but keep the first learning slice inside
Money. Generalize the contract before generalizing the user interface.

Suggested design challenge:

> How might Kwilt let a customer say what should happen later in ordinary
> language, then reliably notice the right moment and produce only the level of
> help they authorized—without making them learn automation or surrender
> control of the underlying capability?
