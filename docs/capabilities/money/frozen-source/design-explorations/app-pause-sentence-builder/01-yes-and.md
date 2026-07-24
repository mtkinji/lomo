# Yes-And: app-pause-sentence-builder

## Original idea

Turn the app-pause destination into the rule builder itself, using one editable sentence instead of a dashboard, rule list, edit mode, and separate setup CTA.

## Adjacencies

**Yes, and what if the route name, entry label, and header all used the same noun?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: removes navigational doubt before the user starts setup.
- New value: `App pause` becomes the stable object name.
- Cost delta vs. original: low
- Anti-pattern check: pass. This removes product vocabulary instead of adding it.

**Yes, and what if app selection lived inside the sentence?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: the user chooses the drift app at the same moment they understand the rule.
- New value: the bottom CTA disappears.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the token is plain, for example `Choose apps`, not `Screen Time apps`.

**Yes, and what if the category was not a header at all?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the category appears only where it has meaning: in the rule sentence.
- New value: removes duplicate `Shopping` title and prevents a category detail page from pretending to be a separate dashboard.
- Cost delta vs. original: low
- Anti-pattern check: pass.

**Yes, and what if setup state was expressed as incomplete sentence tokens instead of badges?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: missing setup becomes an action to complete, not a warning to interpret.
- New value: no `Needs apps` pill.
- Cost delta vs. original: medium
- Anti-pattern check: pass if missing tokens are tappable and accessible.

**Yes, and what if advanced conditions were hidden until needed?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the default rule can stay understandable while preserving the power of multiple conditions.
- New value: `near 95% used`, `over budget`, and `transactions need review` can be edited without dominating the screen.
- Cost delta vs. original: medium
- Anti-pattern check: pass if `Advanced` does not become a junk drawer.

**Yes, and what if saving was implicit after each token choice?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the rule feels like a live setup object, not a form.
- New value: removes modal save/cancel ceremony.
- Cost delta vs. original: medium
- Anti-pattern check: pass only if changes are reversible and the rule text updates immediately.

## Frame recommendation

Run design-thinking-loop with the original focused frame. The bigger `budget-reality-gate` frame is already captured; this loop should refine the setup surface into a single app-pause sentence builder.

