# Evaluate Learning: transaction-rule-truth

## Learning questions

- Can the user tell whether future Costco transactions will be categorized automatically?
- Does `Rule active` remove the perceived need to create a duplicate rule?
- Does separating `existing transactions changed` from `future matches covered` make the builder trustworthy?
- Is inline status sufficient, or does the user still need row-level provenance?
- Does a conflicting rule state remain understandable without a global rules screen?

## Evidence plan

Supporting evidence:

- In phone self-use, Andrew answers `Is a rule active?` correctly before opening the drawer.
- An equivalent saved rule never produces `Create rule`.
- With 59 already-Shopping Costco rows and no rule, the builder reports `0 existing transactions will change` plus future coverage.
- After creation and refresh, the page changes to `Rule active`.
- Closing or swiping the builder leaves category and rule state unchanged.

Disconfirming evidence:

- Users interpret `Rule active` as proof that every historical row was assigned by the rule.
- Users still open the drawer only to discover no action is needed.
- The UI reports active when a rule targets another category or uses incompatible scope.
- The displayed impact count differs from persisted updates.
- Users ask for a rules dashboard to understand the single transaction.

## Instrumentation

- `transaction_rule_receipt_viewed` with state only: active, absent, or conflicting.
- `transaction_rule_builder_opened` with entry state and exact/partial mode.
- `transaction_rule_created` with existing rows changed count and future coverage enabled.
- `transaction_rule_builder_dismissed` without creation.
- Manual phone notes for whether the status was understood before interaction.

Do not track merchant names, transaction descriptions, amounts, or raw rule text for this learning.

## Brand-goodwill evidence

- No duplicate-rule prompt appears for an equivalent active rule.
- Copy never contradicts the visible preview.
- Rule creation remains explicit and reversible.

## Decision rule

- Proceed to accepted capability after at least five representative merchant checks across active, absent, and conflicting states, with correct status and impact every time.
- Revise if status is technically correct but users still cannot predict future behavior; add provenance explanation in the drawer before adding per-row badges.
- Retire the inline receipt if it adds noise without changing comprehension, while retaining equivalent-rule deduplication and truthful impact counts.

## Expected next action

Refine the implementation spec, then build a narrow TestFlight slice and evaluate it on the same Costco and Smith's scenarios that exposed the confusion.
