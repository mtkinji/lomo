# Frame: Activities as a Context-and-Action Host

Status: proposed platform direction, not an implementation commitment.

## Offered idea

Kwilt may eventually review connected systems such as Gmail, identify work the
user might need to do, and create a To-do. The To-do should retain enough
context to explain why it exists and offer a direct action where the work
actually happens. The same mechanism should host a Meal Planning contribution
card inside a recurring reminder.

## Audience and job

- Audience: `audience-ai-native-life-operators`
- Representative persona: Nina
- Hero JTBD: `jtbd-trust-this-app-with-my-life`
- Supporting JTBDs: `jtbd-capture-and-find-meaning`,
  `jtbd-move-the-few-things-that-matter`,
  `jtbd-get-help-without-retelling-my-life`,
  `jtbd-understand-why-ai-suggested-this`, and
  `jtbd-stay-in-control-of-ai-actions`
- Job-flow seam: Nina's trust flow already expects bounded context,
  inspectable evidence, proportionate action, an authoritative receipt, and an
  exact return destination. Activities do not yet have a reusable way to carry
  those contracts after Chat creates or updates one.

## Aspirational design challenge

How might Kwilt turn actionable context from another capability or connected
service into a calm, trustworthy Activity that explains why it exists and
takes Nina to the right action, without turning To-dos into an inbox, a
dashboard, or an unbounded automation system?

## Object model stance

This extends the existing four-object model; it does not introduce a fifth
planning object.

- **Activity:** what Nina intends to do, and optionally when.
- **Source reference:** why the Activity exists and where its evidence came
  from.
- **Capability action card:** where and how the next action can be taken.
- **Provider receipt:** what actually happened after an action.

The Activity remains useful after a provider disconnects. The source system or
Kwilt capability retains authority over its own data, permissions, actions,
freshness, and receipts.

## Product constraints

- Never interpret access to a connected account as permission to create every
  plausible To-do.
- Never store arbitrary provider-authored UI or executable action JSON on an
  Activity.
- Never make a user reopen or reread the original source just to understand the
  To-do.
- Never let the presence of a card bypass current authorization.
- Never infer completion merely because an email was opened or answered.
- Preserve a useful user-owned Activity when a source is removed or a
  connection expires.
- Prefer one primary action card. Additional provenance can be compact passive
  references, not a stack of mini-apps.

## Existing Kwilt fit

Activity detail already contains isolated special surfaces, including Screen
Time opportunity content and shopping destination actions. Unified Chat
already defines capability-owned evidence, action, receipt, and return
contracts. The missing primitive is a reusable Activity host that can ask a
registered capability or connector what this viewer may see and do now.
