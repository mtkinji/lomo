# Converge: Capability-Native AI

## Decision

Choose **C: capability-native AI operating layer**, with the import-assistant
quality bar from option A.

Every meaningful food operation is declared once with:

- capability owner;
- typed input and output;
- evidence requirements;
- effect and reversibility;
- confirmation class;
- eligible execution providers and channels;
- proposal or completion receipt;
- exact return destination; and
- explicit unavailable behavior.

AI interprets requests, extracts evidence, proposes structured changes,
explains results, and executes permitted operations. Recipes, Meal Planning,
and Groceries remain the only authorities that validate and commit their
records.

## Authority classes

| Class | Use | Examples |
| --- | --- | --- |
| Direct | Read-only or low-risk, reversible work explicitly requested | search Recipes; read a plan; create an empty draft |
| Reviewed | Meaningful content or state change with uncertainty | approve an import; edit ingredients; accept a plan proposal; confirm a product mapping |
| Explicit consequential | Another person, public identity, money, or external state is affected | invite a participant; publish a version; activate an authorized offer; add confirmed products to a cart |
| Native handoff | Provider owns the final interaction | retailer checkout, payment, delivery slot, account login |
| Excluded | Kwilt or its AI has no defensible authority | infer rights attestation; silently publish; claim unsupported allergy safety; invent or mark a coupon applied; autonomous payment |

An explicit natural-language request may satisfy intent for a reversible action,
but it does not eliminate review when source ambiguity, another person's
access, public distribution, money, or provider state is involved.

## Core operation families

- `recipes.search`, `recipes.read`, `recipes.create`,
  `recipes.import.prepare`, `recipes.import.approve`, `recipes.update`,
  `recipes.scale.preview`, `recipes.fork`, `recipes.share_copy.prepare`,
  `recipes.collaborator.invite`, `recipes.publication.prepare`,
  `recipes.publication.publish`, `recipes.delete`
- `meal_planning.plan.create`, `meal_planning.plan.update`,
  `meal_planning.candidate.add`, `meal_planning.candidate.remove`,
  `meal_planning.round.open`, `meal_planning.round.close`,
  `meal_planning.response.submit`, `meal_planning.response.withdraw`,
  `meal_planning.plan.finalize`, `meal_planning.plan.revise`
- `groceries.compile`, `groceries.item.update`, `groceries.item.set_state`,
  `groceries.list.review`, `groceries.product_match.prepare`,
  `groceries.product_match.confirm`, `groceries.handoff.prepare`,
  `groceries.handoff.open`
- `savings.review`, `savings.accept`, `receipt.extract`,
  `receipt.reconcile`

The manifest must expose a mechanical coverage report for mobile, Unified Chat,
action cards, Phone, and future connectors. “Supported” means the channel can
collect required evidence, show the required confirmation, return the actual
receipt, and deep-link back to the owning surface—not merely that a model knows
the tool name.

## Stated bet

A polished photo-or-URL-to-recipe flow followed by AI-assisted planning and a
deterministic grocery compilation will remove enough real work to earn repeated
household use. The broader operation contract is designed now so the product
does not accumulate one-off AI buttons, but only the first lovable vertical
spine is implemented before demand is proven.
