# Screen Time exception authorization — frame

## What Andrew said

> “Maybe it shouldn’t be so easy to turn it off? Maybe it should require a passcode, and maybe there should be a setting to turn off the ability to quickly shut off screen time, and this ability should be off by default.”

## Restated in the user’s voice

When a Screen Time guardrail catches me at the moment of impulse, I want reversing it to require a deliberate act and real authority. The protection should remain meaningful without becoming punitive or impossible to recover from.

## Audience and persona

- **Primary audience:** burned-out productivity power users
- **Representative persona:** Marcus
- **Situation:** Marcus has deliberately created a personal Screen Time rule, then encounters its intervention in the same hot moment when taking the easiest escape is most tempting.
- **What he is trying to achieve:** keep the commitment he made in a calmer moment while retaining explicit ownership of the rule.
- **Core tension:** an exception must remain possible, but a one-tap escape turns the guardrail into a suggestion.
- **What would feel wrong:** accidental lockout, shame, an unrecoverable rule, security theater, or a second Kwilt-specific passcode to remember and protect.

Maya is the secondary boundary persona. For a family rule, a child must not gain an override merely by knowing the device passcode, and a caregiver must still have a safe recovery path.

## Hero job and underserved step

- **Hero JTBD:** `jtbd-move-the-few-things-that-matter`
- **Active job:** `jtbd-put-intention-before-impulse`
- **Trust boundary:** `jtbd-trust-this-app-with-my-life`
- **Job-flow step:** Marcus, step 5 — decide the next action when the intervention appears (currently delivered at 3/5).

The current intervention creates a useful pause, but the immediately available temporary-open action can collapse that pause into a single reflexive tap. In Maya’s family flow, the weaker delivery around ordinary access makes the distinction between child access and caregiver authority especially important.

## Anchor assessment

The proposal strongly advances putting intention before impulse: it preserves the owner’s agency while moving the exception out of the reflex path. It also advances trust by making the source of authority legible instead of treating possession of the device as proof.

```yaml
personas: [marcus, maya]
serves: [jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
```

## Current-system read

- The bottom guide derives whether to show **Open for 20 minutes** from actor authority and each rule’s `temporaryOpen.allowed` value.
- Choosing the action currently applies the bounded exception immediately; there is no fresh authentication step.
- Personal composite and family projections currently make temporary opening available by default, while older personal-rule normalization also treats an omitted value as allowed.
- The app already uses native local authentication for privacy-sensitive access. That provides Face ID, Touch ID, or the device credential without creating or storing a Kwilt-specific PIN.
- For shared and child devices, device authentication alone does not prove caregiver identity. Family overrides must continue to require caregiver-scoped authority, and may need account reauthentication on a caregiver-owned surface.

## System alignment

**Posture: extend the system.**

The control plane already owns bounded exceptions and their expiry, while each policy domain owns who may bypass a rule. This change should add a durable exception policy and an authentication gate to those existing responsibilities, not create a second override path inside the bottom guide.

## Constraint posture

- Temporary exceptions are unavailable by default.
- The child experience never exposes a direct temporary-open action.
- Enabling exceptions is an explicit policy choice, not an incidental guide preference.
- An enabled quick exception still requires fresh native authentication before it is applied.
- A family exception requires both caregiver authority and appropriate fresh authentication; a shared device passcode is not sufficient caregiver proof.
- Recovery remains available from an intentional rule-management path so a configuration mistake cannot create an unexplained lockout.
- Exceptions remain bounded, selection-specific, and automatically expiring; they never silently clear unrelated rules.
- Kwilt should not invent or store a custom Screen Time passcode when platform authentication can satisfy the personal-rule case.

## Aspirational design challenge

How might Kwilt help Marcus keep the promise he made in a calm moment when impulse is strongest, while preserving explicit, recoverable ownership—and ensure Maya’s family rules can only be overridden by a genuinely authorized caregiver?

## Out of scope for this exploration

- Changing the default 20-minute exception duration.
- Designing child-to-caregiver exception requests.
- Integrating with Apple’s Screen Time passcode, which is not a Kwilt-owned credential.
- Creating a general-purpose app-lock or household identity system.
- Redesigning the bottom guide’s visual layout beyond what the authorization flow requires.

## Migration decision

Existing rules and newly created rules both default to **temporary exceptions off**. The migration must not preserve the prior permissive behavior merely because a rule predates this change.
