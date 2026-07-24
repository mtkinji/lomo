# Yes-And: transaction-display-names

Original idea: let the user acknowledge the real bank name while choosing a more useful display name.

**Yes, and what if it could make source truth explicit instead of implicit?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can tell which text is their label and which text came from the bank.
- New value: reduces the fear that Kwilt is hiding or changing financial evidence.
- Cost delta vs. original: low
- Anti-pattern check: pass; keep it as small source/evidence copy, not a provider diagnostics panel.

**Yes, and what if the same correction could apply to future similar transactions?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: one naming correction makes future review less annoying.
- New value: recurring ACH or rent-provider rows become recognizable without repeated editing.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it is invited after editing, not forced into every rename.

**Yes, and what if transaction lists used the preferred name while detail kept the full descriptor?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: budget activity becomes scannable without losing audit detail.
- New value: Summary/detail/activity rows can feel calmer while detail remains truthful.
- Cost delta vs. original: medium
- Anti-pattern check: pass; avoid decorative metadata on list rows.

**Yes, and what if the app suggested a cleaned name only after the user starts editing?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: reduces typing without pretending Kwilt knows the right answer.
- New value: "TenantCloud" can be offered as a draft, but the user owns the final label.
- Cost delta vs. original: medium
- Anti-pattern check: pass if suggestions are editable and not saved automatically.

**Yes, and what if display naming stayed separate from category naming?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can rename "TenantCloud" without accidentally changing Housing logic.
- New value: keeps review decisions crisp: what is this called, and where does it count?
- Cost delta vs. original: low
- Anti-pattern check: pass; this prevents a cluttered all-purpose correction panel.

## Frame Recommendation

**Run design-thinking-loop with the original frame** - the user need is real and bounded. Do not expand into broad merchant enrichment yet; first prove a trusted personal display-name layer.
