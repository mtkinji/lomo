# Converge: Role-Aware Contextual Help

## Chosen alternative

Add one contextual help/report action to Shared Home, Goal feed content, and
friendship identity controls. Reports retain a server-captured snapshot and are
visible only to moderation operations. After submission, the server distinguishes
peer sharing from active Household relationships. Peer reports may offer Block;
Household reports never use social blocking as a substitute for role governance.
In the shared Meal Plan, contextual help stays inside the existing hard-pass
popover and guest-suggestion row. A reporter may hide that response for
themselves; the underlying Household role and moderation evidence remain intact.

## Capability delta

Today, a user cannot report the exact person or content without composing a generic email, and blocking does not reliably suppress every existing and future interaction.

After this slice, a user can report in context and receive a truthful response.
A peer can optionally block and stop bilateral social contact. A child reporting
an active Household member receives a private-help confirmation without caregiver
notification or a false removal claim. An owner/caregiver is told to manage
Household access separately.

Still unsupported: automatic suspension, user-visible case status, public reputation, and automated moderation decisions.

## Reductive decisions

- One help/report drawer and one backend contract, not per-feature forms.
- Bounded reasons plus an optional short note; no evidence-upload flow.
- No consumer moderation inbox. A submitted receipt and support contact are enough for this release.
- Filtering covers remotely shared free-form check-ins, replies, hard-pass
  explanations, guest names, and guest suggestions; private local content and
  private AI chat are outside this UGC boundary.

## Bet

We're betting that one contextual intake with role-aware follow-up gives people
truthful control without making ordinary household life feel policed. If children
cannot understand or trust the private-help receipt, revisit a dedicated child
safety entry rather than expanding social blocking.
