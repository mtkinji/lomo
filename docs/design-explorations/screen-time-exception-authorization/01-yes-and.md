# Screen Time exception authorization — yes, and

## Original idea

Make temporary Screen Time exceptions unavailable by default, including for existing rules, and require deliberate authentication when the rule owner has explicitly enabled them.

## Adjacencies

**Yes, and what if it could... protect the exception setting itself, not only the final override?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: The commitment made in a calm moment cannot be undone by taking one extra unprotected step during the same impulse.
- New value: Changing **Allow temporary exceptions** would require fresh authorization too, closing the obvious settings-route loophole.
- Cost delta vs. original: low
- Anti-pattern check: pass — this adds earned friction to a protective control without shame, scoring, or forced commitment.

**Yes, and what if it could... separate intentional recovery from an in-the-moment escape?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Marcus can trust the guardrail without fearing that one configuration choice will trap him.
- New value: Rule management remains a clear, authenticated recovery path even when the bottom guide offers no quick exception.
- Cost delta vs. original: low
- Anti-pattern check: pass — recovery stays calm and user-owned rather than punitive.

**Yes, and what if it could... make exception strength a property of the rule rather than a vague app-wide promise?**

- Serves: `jtbd-put-intention-before-impulse`
- Job elevation: The amount of friction reflects the commitment the user actually made, instead of weakening every guardrail because one rule sometimes needs flexibility.
- New value: Different personal rules can remain strong or permit authenticated exceptions without adding multiple global modes.
- Cost delta vs. original: medium
- Anti-pattern check: pass — it avoids a dashboard and keeps the decision next to the rule it governs.

**Yes, and what if it could... explain the stronger default exactly when an existing rule first encounters it?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: A safer migration feels intentional and legible rather than like a missing or broken control.
- New value: One calm, non-modal explanation can say that temporary exceptions are now off and point to rule management without creating an onboarding campaign.
- Cost delta vs. original: low
- Anti-pattern check: pass — contextual education is quiet, dismissible, and non-promotional.

**Yes, and what if it could... preserve the rule unchanged when authentication fails or is cancelled?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can trust that an incomplete security interaction never leaves protection in an ambiguous partial state.
- New value: Cancellation, unavailable biometrics, and failed credentials have an explicit, testable no-change outcome.
- Cost delta vs. original: low
- Anti-pattern check: pass — failure copy can remain factual and non-shaming.

**Yes, and what if it could... move family exceptions to the caregiver’s authority surface?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Maya can make a bounded exception without teaching the child that possession of the restricted device equals authority.
- New value: A child or shared device can remain blocked while a caregiver acts from a caregiver-authenticated context.
- Cost delta vs. original: high
- Anti-pattern check: pass — this preserves private family authority and avoids public pressure or surveillance theater.

**Yes, and what if it could... leave a lightweight family-only receipt for a caregiver exception?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Caregivers can understand what changed, by whom, and until when without converting Screen Time into monitoring software.
- New value: Bounded accountability for family rules and easier diagnosis of unexpected access.
- Cost delta vs. original: medium
- Anti-pattern check: pass with constraint — the receipt must be factual, private, retention-limited, and never become a child-compliance score or feed.

## Job elevation

The offered idea is not merely stronger authentication. It makes a Screen Time rule an honest commitment boundary: difficult to undo reflexively, easy to understand, recoverable by its legitimate owner, and explicit about who holds authority.

The strongest adjacencies are protecting the setting itself, separating recovery from quick escape, and defining a no-change authentication failure contract. The caregiver-surface and family receipt ideas reveal valuable later work but should not enlarge the first personal-rule slice.

## Frame recommendation

**Run the design-thinking loop with the original frame.** The frame already captures the larger job and the family authority boundary. Carry the three strongest adjacencies into divergence as required constraints; keep caregiver-remote approval and family receipts outside the initial slice.
