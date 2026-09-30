# Chat-inline personal Screen Time limit

## Frame

When Nina asks Kwilt Chat to create a Screen Time rule for her own phone, she
wants to finish the rule in that conversation while retaining explicit control
over Apple's private app selection and the final write.

- Audience: `audience-ai-native-life-operators`
- Persona: Nina
- Hero JTBD: `jtbd-trust-this-app-with-my-life`
- Job-flow gap: Nina can ask Chat to act, but a handoff into Settings breaks the
  conversational operating model and makes the action feel unfinished.
- Active anchors: `jtbd-stay-in-control-of-ai-actions` and
  `jtbd-put-intention-before-impulse`

```yaml
serves: [jtbd-stay-in-control-of-ai-actions, jtbd-put-intention-before-impulse]
```

## Yes-and

This is a bounded refinement of an accepted Screen Time rule shape, so broad
adjacency generation is intentionally skipped. The job elevation is continuity:
Chat becomes a trustworthy place to complete a private device action, not merely
a router to another Kwilt screen.

## Diverge

1. **Navigate to the full rule builder.** Reuses the canonical editor, but
   abandons the conversation and repeats information Chat already resolved.
2. **Use app labels supplied in conversation.** Stays inline, but cannot safely
   invent or serialize Apple's opaque Family Controls tokens.
3. **Present Apple's picker over Chat, then complete the reviewed action.**
   Keeps token selection native and device-local while preserving one Chat card,
   one clear consequence, and one durable receipt.

## Converge

Choose option 3. The Chat card is the review boundary for the daily allowance;
Apple's picker is the temporary native selection boundary. The picker's Done
action applies the exact reviewed rule, returns to the unchanged thread, and
turns the same card into a receipt. Dismissing the picker leaves the action
available to continue again.

The bet is that users read the experience as one continuous Chat action when
the only interruption is the privacy-owned Apple picker, rather than a new
Kwilt destination.

## Reductive UI contract

- Job: select the private apps and turn on the already-stated daily allowance.
- Authority: user decision -> accepted Screen Time brief -> Chat action contract
  -> Apple FamilyActivityPicker -> device-local rule runtime.
- Three-second read: **Choose apps for a 10-minute limit.**
- Primary action: continue into Apple's picker; Done completes the rule.
- Secondary action: decline the prepared action.
- Reveal later: rule editing and governance in Settings > Screen Time.
- Must not add: a second setup card, custom app browser, token-bearing cloud
  proposal, navigation to the rule builder, or a second Kwilt confirmation.

```text
CHAT THREAD
┌──────────────────────────────────────────┐
│ Choose apps for a 10-minute limit        │
│ Apple's picker will appear over Chat.    │
│                         Decline  Continue │
└──────────────────────────────────────────┘
                    │
                    ▼
APPLE FAMILYACTIVITYPICKER (temporary sheet)
┌──────────────────────────────────────────┐
│ Select apps and categories          Done │
│  □ Instagram                            │
│  □ Social                               │
└──────────────────────────────────────────┘
                    │
                    ▼
SAME CHAT THREAD
┌──────────────────────────────────────────┐
│ 10-minute daily limit is on for          │
│ Instagram.                               │
└──────────────────────────────────────────┘
```

## Required states and proof

- Authorization approved, denied, revoked, or unavailable.
- Picker completed with at least one app/category.
- Picker dismissed or completed empty; action remains retryable.
- Device activation/persistence failure; Chat must not claim completion.
- Completed receipt contains labels and counts only, never Apple tokens.
- Physical signed iPhone proof remains required for sheet presentation and
  enforcement. Source and Jest proof cover routing, validation, privacy, and
  receipt projection only.
