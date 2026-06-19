# Yes-And: Dynamic Next Best Action

Original idea: Replace the Activity Detail capability toolbar with a single recommendation-led action that answers what is most useful to do next.

**Yes, and what if it could...** learn which action usually helps this user move a similar to-do forward.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The button becomes less about available tools and more about practical next motion.
- New value: Future personalization can improve the recommendation without changing the surface.
- Cost delta vs. original: medium
- Anti-pattern check: pass; keep the first version rule-based and transparent enough to feel calm.

**Yes, and what if it could...** treat AI as a helper behind concrete actions like breaking steps down instead of a standalone destination.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user gets help executing without needing to write a prompt.
- New value: AI usage can rise because it is embedded in the job, not hidden behind "chat with AI."
- Cost delta vs. original: low
- Anti-pattern check: pass; avoid anthropomorphic AI copy.

**Yes, and what if it could...** make completion the recommendation when all visible steps are already done.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Kwilt helps close open loops instead of leaving progress ambiguous.
- New value: The Activity Detail surface can reduce lingering almost-done work.
- Cost delta vs. original: low
- Anti-pattern check: pass; preserve the existing circular completion button so finishing stays calm and explicit.

**Yes, and what if it could...** keep secondary actions discoverable without making them compete visually.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user trusts that nothing disappeared, while the app still recommends a path.
- New value: Safer migration from the old toolbar.
- Cost delta vs. original: low
- Anti-pattern check: pass; a menu is quiet and reversible.

**Yes, and what if it could...** eventually factor in goal context and previous focus sessions.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Kwilt can notice when "schedule" or "focus" is actually the honest next move.
- New value: The recommender becomes a product spine for "what now?"
- Cost delta vs. original: high
- Anti-pattern check: pass if framed as a suggestion, not a scoring dashboard.

**Frame Recommendation:** Run design-thinking-loop with the original frame. The enhancement is scoped enough to ship now, but it opens a larger recommendation surface later.
