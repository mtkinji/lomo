# Diverge: Chat Recipe Management

Axis: durable Chat-native action versus navigation handoff versus silent direct execution.

## A. Recipe proposal cards
Chat prepares a complete Recipe create, update, or delete proposal. Approval applies it through Recipe-owned persistence and produces a receipt that opens Recipe Home. Best fit with the current trust architecture; fails if the proposal payload cannot preserve a complete immutable version.

## B. Prefilled Recipe Edit handoff
Chat opens Recipe Edit with suggested fields. It is simpler to wire but makes the user repeat the final assembly outside Chat and does not satisfy “directly from within it.” It remains a fallback for import or unsupported media review.

## C. Immediate write with undo
Chat writes as soon as the user asks and offers undo. This minimizes taps but breaks Kwilt's proposal boundary for structured household knowledge and makes destructive or incomplete changes too easy.

Anti-pattern check: A avoids a dashboard, streak, setup ritual, anthropomorphic agent, and silent commitment. B preserves safety but not the requested job. C fails the trust constraint.
