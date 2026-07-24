# Yes-And: category-rollovers

Original idea: allow a category's unused or overspent monthly amount to roll into the next month.

**Yes, and what if it could make the current meter more truthful?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: the meter answers today's spending decision using the real available room, not just the clean monthly limit.
- New value: Summary and detail can show `+$42 rolled in` or `-$18 from last month` as compact context.
- Cost delta vs. original: low
- Anti-pattern check: pass if the adjustment stays near the meter and does not become a ledger panel.

**Yes, and what if it could make month switching explainable?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: prior, current, and next months become connected receipts instead of isolated resets.
- New value: category detail can show rollover out for last month and rollover in for this month.
- Cost delta vs. original: medium
- Anti-pattern check: pass if month navigation remains adjacent-month and receipt-like.

**Yes, and what if rollover policy lived in the category's budget plan?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user sets the rule once for the category and the app carries it forward.
- New value: Groceries can reset monthly while AI tools or kids' activities can carry unused room.
- Cost delta vs. original: low
- Anti-pattern check: pass if the setting is a simple toggle, not a finance-methodology choice tree.

**Yes, and what if it could protect against fake room?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: overspending last month can reduce this month's visible room when the user wants that discipline.
- New value: the app avoids implying a fresh full budget when the household is still catching up.
- Cost delta vs. original: medium
- Anti-pattern check: conditional pass; copy must stay non-shaming.

**Yes, and what if rollover could support future app gates?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: a spend-triggering app can wait behind the same true available-room number the user sees in Summary.
- New value: app-control thresholds become more trustworthy for rollover categories.
- Cost delta vs. original: medium
- Anti-pattern check: pass if gate rules consume the computed meter state instead of adding separate rollover gate logic.

**Yes, and what if it could become a learning prompt after month close?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the app notices a category ended with leftover or overspend and asks whether that pattern should carry forward.
- New value: users discover rollovers at the moment they are understandable.
- Cost delta vs. original: high
- Anti-pattern check: risk of adding notification/prompt noise; defer until core math is trusted.

## Frame Recommendation

Run design-thinking-loop with the original frame.

The original frame is a real capability, but the release should be smaller than a month-planning system. Build rollover as category budget-plan math first; let future prompts or richer month-close workflows wait until the meter truth is proven.
