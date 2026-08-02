# Evaluate Learning: Multimodal Money Answers

## Learning questions
- Can users state their income spending limit after looking at Summary once?
- Can they distinguish the limit from category remaining and month-to-date spend?
- Does asking Chat reduce navigation and terminology burden for low-UI-fluency users?
- Do users recognize that Summary and Chat are presenting the same Money truth?
- Does the private scheduled check feel useful, understandable, and under their control?
- Do users want a condition-based check or SMS after experiencing the bounded
  in-app version?
- Does the answer preserve trust when evidence is stale and Kwilt refuses to calculate?

## Evidence plan
Run observed tasks with at least five participants across a range of UI fluency;
include retirement-age participants without assuming age alone predicts ability.

Ask each participant to:
1. Find their monthly income spending limit.
2. Explain whether the current plan fits it.
3. Preview a category increase and name what else changes.
4. Ask the same limit question in Chat.
5. Save, inspect, pause, and remove a private weekly check.

Supporting evidence:
- At least four of five can answer the three core Money questions without coaching.
- No participant reports contradictory UI and Chat answers.
- At least four of five understand that the notification opens a fresh check
  rather than containing a frozen answer.
- Participants can find and stop scheduled delivery without assistance.
- Lower-UI-fluency participants prefer Chat for some questions while still
  understanding where the source can be inspected.

Disconfirming evidence:
- Users confuse `70% of income` with `70% of a category spent`.
- Chat provides an answer users cannot verify in Money.
- Participants treat a short answer as financial advice.
- Users expect saving a check to change or rebalance their plan.
- Private notification copy is too vague to be useful, or any richer copy feels unsafe.
- Scheduling creates more setup burden than repeatedly asking the question.

## Instrumentation
Record only privacy-safe events and buckets:
- limit block viewed and Money details opened;
- supported Money question asked and answer/refusal outcome;
- authoritative return target opened;
- saved check offered, created, paused, resumed, or deleted;
- delivery attempted/opened and coarse freshness/refusal bucket.

Do not record exact amounts, income percentages chosen by the user, merchant or
category names, raw questions, answer text, phone numbers, or notification copy.

## Decision rule
Proceed to condition-based checks when the core comprehension threshold passes
and users naturally ask for exception-only delivery. Proceed to SMS only when
participants demonstrate demand for delivery outside Kwilt and the consent,
identity, privacy, compliance, delivery-status, and thread-continuity contracts
are separately ready.

Revise the Summary language or shared answer formatter before adding modalities
if users cannot distinguish plan limit, spending, and category remaining. Retire
scheduled delivery if users understand the answer but do not value receiving it
without asking.

## Expected next action
If the learning threshold is met, specify condition-triggered saved checks and
privacy-controlled SMS as the next release. If it is not, improve the shared
Money answer and authoritative UI before expanding channels.
