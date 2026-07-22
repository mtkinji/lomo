# Diverge: Chat Lightweight To-do Capture

## Axis

Where the system spends the user's attention: before creation, during creation, or only after creation when inspection is useful.

## A. Confirm Before Create

Chat parses and enriches the request, then asks the user to approve a compact card before writing. The card shows title/date and leaves full fields to the To-do detail page.

- Nina fit: transparent, but repeats an instruction she already gave.
- System fit: smallest change to the current proposal path.
- Best when: the operation is ambiguous, destructive, or difficult to reverse.
- Fails when: ordinary capture feels like filling out a permission slip.
- Anti-pattern check: avoids a full editor, but still blocks capture.

## B. Capture, Enrich, Inspect

An explicit create instruction immediately creates the Activity through the same creation and AI-enrichment semantics as Quick Add. Chat shows the canonical compact Activity inventory presentation, initially using its enrichment/loading state if needed, then a settled authoritative row. Tapping the row opens native To-do detail; Back returns to the exact Chat thread and position. Swipe-left exposes Delete.

- Nina fit: Kwilt does the job in one beat and remains inspectable.
- System fit: reuses Activity creation, enrichment, inventory metadata, native detail navigation, return targets, and undo.
- Best when: creation is explicit, low-risk, and reversible.
- Fails when: intent is genuinely ambiguous; Chat should ask one short question instead.
- Anti-pattern check: capture-first, no duplicate editor, no dashboard, no forced review.

## C. Create Then Open Detail

Chat creates the To-do and immediately pushes the native detail page so the user can inspect enrichment before returning.

- Nina fit: maximum visibility, but turns every capture into navigation work.
- System fit: reuses the native editor directly.
- Best when: most created records require immediate correction.
- Fails when: the user simply wants to name something and continue talking.
- Anti-pattern check: avoids duplicate UI but violates lightweight capture through forced inspection.
