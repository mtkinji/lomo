# Diverge: Multimodal Money Answers

## Axis
Where comprehension lives: inside native Money surfaces, inside conversation,
inside proactive delivery, or in a shared answer contract projected into all
three.

## A. UI-First Simplification
Make the 70% limit persistently visible on Summary and replace generic category
impact language with a plain before-and-after review. Keep Chat and outbound
delivery out of the first concept.

- Audience/persona fit: strong for users already inside Money; weak for users
  who do not know where to look.
- Design-challenge answer: improves the authoritative surface but does not remove
  the navigation-learning burden.
- System fit: high; most facts and preview models exist.
- Best when: Money usage is primarily screen-led.
- Fails when: low-UI-fluency users abandon the search before reaching the answer.
- Anti-pattern check: pass if Summary remains calm rather than becoming a KPI grid.

## B. Conversational Money Guide
Make in-app Chat the simplest way to ask about limits, categories, forecasts,
and what-if changes. Answers deep-link to existing Money destinations, but the
native UI receives only narrow copy fixes.

- Audience/persona fit: strong for people comfortable texting; weaker for people
  who expect to inspect and compare state visually.
- Design-challenge answer: removes navigation burden but risks making Chat the
  only comprehensible interpretation.
- System fit: medium; `money.read` exists but needs living-plan facts and bounded
  question semantics.
- Best when: questions are occasional and naturally phrased.
- Fails when: the user needs correction, comparison, or persistent orientation.
- Anti-pattern check: fails if Chat owns financial meaning; fixed by requiring
  capability-owned results and authoritative return targets.

## C. Shared Money Answer System
Define a small set of capability-owned Money questions and answer receipts. The
same answer appears as a compact plan contract in UI, a plain Chat response, or
a privacy-controlled scheduled delivery. Native Money owns inspection,
correction, preview, and reversal.

- Audience/persona fit: strongest across both UI-comfortable and low-UI-fluency
  users.
- Design-challenge answer: reduces learning burden without weakening the source
  of truth.
- System fit: medium-high; it extends current Money read/preview contracts and
  the existing channel-independent Chat direction.
- Best when: consistency and trust matter more than shipping one isolated surface.
- Fails when: each channel invents its own formatter or release scope expands to
  arbitrary financial analysis.
- Anti-pattern check: pass when the question catalog stays bounded and the UI
  remains calm and authoritative.

## D. Proactive SMS Money Assistant
Start with scheduled and condition-triggered SMS. Users configure questions and
cadence through a short setup, then ask follow-ups by replying.

- Audience/persona fit: potentially strong for users who live in Messages.
- Design-challenge answer: minimizes app navigation most aggressively.
- System fit: low-medium; it requires durable server execution, channel identity,
  consent, compliance, disclosure controls, delivery status, and thread continuity.
- Best when: the underlying answers and messaging trust model are already proven.
- Fails when: sensitive details appear unexpectedly or the message cannot lead to
  authoritative correction.
- Anti-pattern check: fails as the first slice because convenience would outrun
  privacy and evidence proof; fix by sequencing it after UI and in-app Chat.

## Direction
Carry **C: Shared Money Answer System** forward. It is genuinely multi-pronged
without becoming three separately designed products.
