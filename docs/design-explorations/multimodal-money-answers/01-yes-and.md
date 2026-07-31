# Yes-And: Multimodal Money Answers

## Original idea
Let users ask Kwilt household-money questions in ordinary language, save useful
questions, and receive fresh answers through Chat or scheduled text delivery.

## Adjacencies

**Yes, and what if the first answer always led with the decision-ready result?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: replaces dashboard interpretation with a plain answer.
- New value: `You are within your 70% limit. $96 remains.`
- Cost delta: low
- Anti-pattern check: pass when evidence and freshness remain inspectable.

**Yes, and what if the user could ask one natural follow-up such as `Why?`?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: makes a short answer explainable without leading with detail.
- New value: reveals the categories or evidence that materially shaped the answer.
- Cost delta: low
- Anti-pattern check: pass when the response shows evidence rather than hidden
  chain-of-thought or invented rationale.

**Yes, and what if Chat could preview a category change?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: connects the user's proposed amount to the whole-plan limit.
- New value: answers `What happens if Groceries becomes $800?` before any save.
- Cost delta: medium
- Anti-pattern check: pass only when Money's deterministic preview contract owns
  the math and every affected category is named.

**Yes, and what if a useful question could become a saved check?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: turns a repeated question into a reusable household-money habit.
- New value: the user saves meaning such as `current plan versus income limit`,
  not an implementation-specific database query.
- Cost delta: medium
- Anti-pattern check: pass when the saved check stays visible, editable, and
  removable.

**Yes, and what if delivery were condition-based rather than report-based?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: brings attention only when a chosen boundary needs it.
- New value: `Tell me Sundays only when the plan is over 70%.`
- Cost delta: medium
- Anti-pattern check: pass when silence means `condition not met`, not failed
  delivery, and status remains inspectable.

**Yes, and what if users selected how much a message may reveal?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: makes convenience compatible with shared phones and lock screens.
- New value: private, summary, or detailed disclosure levels.
- Cost delta: medium
- Anti-pattern check: pass when detailed financial values are never the assumed
  default.

**Yes, and what if replying continued the same durable Kwilt conversation?**

- Serves: `jtbd-get-help-without-retelling-my-life`
- Job elevation: makes scheduled delivery conversational rather than a dead alert.
- New value: `What caused that?` can reuse the same authorized saved check and
  return to the same Money evidence.
- Cost delta: high
- Anti-pattern check: pass only when channel identity, consent, thread ownership,
  and capability policy are shared with in-app Chat rather than duplicated.

## Job elevation
This is not merely a way to query a database. It is a way to receive a trusted
household-money answer without learning where the product stores it, while
retaining a simple path to inspect and correct the source.

## Frame recommendation
Run the loop with the expanded frame: one capability-owned Money-answer system
projected into native UI, Chat, and permissioned scheduled delivery.
