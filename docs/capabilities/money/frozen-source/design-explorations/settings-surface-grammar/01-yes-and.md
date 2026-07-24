# Yes-And: Settings Surface Grammar

## Original idea

Define clearer rules for category settings UI in Kwilt Money by learning from native iOS Settings: smaller page title, gray canvas, grouped white controls, optional section labels, smaller helper text, and consistent toggles.

## Yes-And Adjacencies

**Yes, and what if it could become a shared settings grammar across Kwilt and Kwilt Money?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Settings become predictable across the ecosystem, so high-trust controls feel familiar rather than one-off.
- New value: A user who learns notification, privacy, or Screen Time controls in one Kwilt app recognizes the pattern in another.
- Cost delta vs. original: medium
- Anti-pattern check: pass if introduced as shared primitives, failure if it triggers a broad redesign before the pattern proves itself.

**Yes, and what if it could separate object pages from maintenance pages?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The app stops using primary-product hierarchy for routine configuration, so settings do not feel like new work.
- New value: Designers and agents can decide whether a surface should be expressive/product-led or quiet/settings-led before picking layout, type, and card treatment.
- Cost delta vs. original: low
- Anti-pattern check: pass; this reduces ambiguity instead of adding feature surface.

**Yes, and what if it could give us explicit card rules?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Users can visually distinguish "this is content to inspect" from "this is a control to maintain."
- New value: Cards stop being the default container for everything. Grouped rows become the default for settings; cards remain for summaries, repeated objects, tools, and modal content.
- Cost delta vs. original: low
- Anti-pattern check: pass; the rule removes clutter rather than inventing decoration.

**Yes, and what if it could make Screen Time controls feel native without becoming generic iOS Settings?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: App-pause rules stay clear and user-owned, while the surrounding settings surface becomes calm and familiar.
- New value: The sentence-form rule builder remains a Kwilt-specific control, but it sits inside a settings group with system-like density and reversibility.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the sentence stays compact; failure if it becomes a hero message inside a maintenance page.

**Yes, and what if it could standardize toggles and row density across the ecosystem?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Permission and behavior switches become predictable, which matters for privacy, notifications, Screen Time, and budget settings.
- New value: Kwilt can pick one toggle style and one row anatomy: label, optional value/subtitle, trailing switch/chevron/check.
- Cost delta vs. original: medium
- Anti-pattern check: pass if it centralizes a component; failure if each feature keeps a local switch variant.

**Yes, and what if it could reduce explanatory copy by moving it below groups?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Maya can scan the control first and read detail only when she needs it.
- New value: Settings pages stop sounding like onboarding. The row says the thing; helper text explains consequence below the group.
- Cost delta vs. original: low
- Anti-pattern check: pass; matches prior Kwilt guidance to keep rows/sheets minimal and move lifecycle explanation out of the primary line.

**Yes, and what if it could become a design-token acceptance test for future settings screens?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: New settings screens inherit consistency instead of relying on taste in the moment.
- New value: A checklist can catch oversized page headers, over-bold row text, card misuse, missing helper placement, and local toggle drift before review.
- Cost delta vs. original: low to medium
- Anti-pattern check: pass if the checklist is short; failure if it becomes design bureaucracy.

## Job Elevation

The original category settings critique is really a maintenance-surface problem. Maya does not want to admire or learn a settings page; she wants to make a small trusted change and get back to the budget moment. A reusable grammar elevates the job from "make this one page less big" to "make Kwilt's behavior controls calm, predictable, and reversible everywhere."

## Frame Recommendation

**Run design-thinking-loop with an expanded frame.**

Use Budget category settings as the first proof, but define the concept as a shared settings grammar for Kwilt and Kwilt Money. The implementation should stay narrow at first:

1. Create/define settings primitives in Budget: settings page shell, group, row, helper text, toggle.
2. Apply them to category settings.
3. Compare against main Kwilt settings screens before promoting the primitives upstream.
4. Avoid migrating every settings screen until the category settings proof feels right in the simulator.
