# Converge: Chat Recipe Management

## Chosen alternative
Recipe proposal cards.

It reuses Chat's existing grammar, Recipe's versioned authority, and the existing Recipe return target. It adds no mode, settings, or durable concept.

## Capability delta
Today, Chat can discuss and read Recipes but cannot prepare a real Recipe change. After this release, an explicit request can stage a private Recipe create, complete-version update, or soft delete for review and then apply it with an authoritative receipt. Publication, collaboration, rights attestation, and attachment extraction remain unsupported here.

## Reductive decisions
- Enhance the existing proposal card; add no Recipe-specific Chat screen.
- Use one full reviewed Recipe payload for create/update so untouched fields cannot disappear.
- Require explicit approval for all three writes; make delete consequence copy stronger.
- Open the resulting Recipe through the existing object-return mapping.
- Do not add per-field proposal editing in this release; the user can ask Chat for a revised proposal.

## Activation
Organic and contextual: when the user says “save this as a recipe,” “change my recipe,” or “delete that recipe,” Chat uses the typed Recipe tool. No education banner is needed.

## Bet
We're betting that one coherent review card is enough for users to trust Chat-authored Recipe changes. If users repeatedly need field-level correction before approval, revisit with a Recipe-owned inline review editor rather than weakening confirmation.

## Success signal
On a local build, Chat can stage, approve, persist, reload, and open create/update/delete Recipe outcomes without unsupported-action prose or loss of unchanged fields.
