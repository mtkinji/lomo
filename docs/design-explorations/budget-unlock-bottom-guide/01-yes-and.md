# Yes-And: budget-unlock-bottom-guide

Original idea: Move the paused-app unlock choice from an inline card into a Kwilt Goals style bottom guide.

## Adjacencies

**Yes, and what if it could keep the chart visually primary?**

- Serves: `jtbd-review-budget-reality-before-spending`
- Job elevation: the app-pause choice stops interrupting the user's read of the budget reality.
- New value: Maya sees the spending line and the decision affordance at the same time.
- Cost delta vs. original: low
- Anti-pattern check: pass if the guide does not cover the important chart point or axis.

**Yes, and what if it could behave like Plan Kickoff: invited, not blocking?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the pause feels like guidance from Kwilt, not a modal command.
- New value: the user can still scroll/read the budget behind the guide.
- Cost delta vs. original: medium, because Kwilt Money needs a non-blocking guide wrapper.
- Anti-pattern check: pass if the guide is dismissible and does not trap the canvas.

**Yes, and what if it could make `Keep blocked` feel successful?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: choosing not to open Amazon becomes a valid completion, not a dismissal.
- New value: the guide can use action copy and receipt copy that dignify both outcomes.
- Cost delta vs. original: low
- Anti-pattern check: pass if `Keep blocked` remains text, not only an X icon, in the first learning slice.

**Yes, and what if it could become the common pattern for spending-moment interventions?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Kwilt Money gets one recognizable intervention grammar for pauses, sync receipts, and review prompts.
- New value: avoids one-off cards sprinkled through Budget Detail.
- Cost delta vs. original: medium
- Anti-pattern check: watch for creating a generic framework before the app-pause job is proven.

**Yes, and what if the guide could collapse into a receipt after action?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user sees what happened without needing a separate history screen.
- New value: `Amazon is open for 20 min` or `Amazon stays blocked` can replace the guide content briefly.
- Cost delta vs. original: low
- Anti-pattern check: pass if the receipt is quiet and not celebratory.

**Yes, and what if the guide could suppress competing bottom UI while visible?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the app does not stack toasts, tab bars, drawers, and pause controls in the same corner.
- New value: Money can borrow Kwilt `BottomGuide`'s "foreground guide owns attention" policy.
- Cost delta vs. original: medium
- Anti-pattern check: pass if suppression is local and reversible.

## Frame Recommendation

Run design-thinking-loop with the original frame. This is not a bigger new product surface; it is a better placement and interaction grammar for the existing Budget App Unlock Review.
