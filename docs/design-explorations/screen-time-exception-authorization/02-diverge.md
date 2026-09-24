# Screen Time exception authorization — diverge

## Fixed frame

All alternatives preserve these decisions:

- Existing and new rules default to temporary exceptions off.
- A child never receives a direct temporary-open action.
- Enabling exceptions and using an exception both require appropriate fresh authorization.
- Failed or cancelled authorization changes nothing.
- Recovery remains possible and legible.
- Exceptions remain bounded to the selected rules and expire automatically.

## Axis of variation

**Where exception authority lives, and how much access to it remains in the impulse moment.**

The alternatives range from a flexible rule-local opt-in, to a simple app-wide policy, to a stronger management-only commitment boundary, to a time-delayed policy change.

## Alternative A — Rule-local authenticated exception

Each personal Screen Time rule contains an **Allow temporary exceptions** setting, off by default. Turning it on requires native authentication. When every overlapping active rule permits an exception, the bottom guide shows **Open for 20 minutes**; choosing it invokes fresh authentication before applying the bounded exception. If any overlapping rule keeps exceptions off, the guide offers no quick opening and instead provides the existing route to review the rule.

- **Persona fit:** Gives Marcus deliberate flexibility without weakening unrelated commitments. It fits someone who wants some rules to be firm and others to tolerate a bounded exception.
- **Design-challenge answer:** Moves exception authority into the rule created during the calm moment, then verifies ownership at the moment of use.
- **System fit:** Extends the canonical personal-rule model with a durable exception policy; reuses the rule builder, guide action derivation, 20-minute override command, and native local authentication.
- **Family boundary:** A child device never displays the action. Family-rule exception policy remains caregiver-owned and cannot be enabled by device possession alone.
- **Best when:** Different rules deserve different strength and the user values flexibility.
- **Fails when:** Native authentication is too easy to treat as reflexive confirmation, or users cannot predict which overlapping rule suppresses the action.
- **Smallest system extension:** Add the policy to personal composite rules, default/migrate it off, protect policy changes, and gate guide actions and commands against it.
- **Four-object model:** Touches no new planning object. It protects the conditions around carrying out an Activity or Goal-linked intention; the rule remains infrastructure rather than a fifth object.
- **Capture-first stance:** Pass. Activity capture remains available and never requires an Arc or Goal.
- **Anti-pattern check:** Pass. No dashboard, score, streak, urgency, forced commitment, or anthropomorphic language. The guide must calmly name an overlapping firm rule rather than implying malfunction.

## Alternative B — One Screen Time master gate

Screen Time settings contain one **Allow temporary exceptions** control, off by default for the account/device. Enabling it requires fresh authentication and makes authenticated 20-minute exceptions available across eligible personal rules. Turning it off removes the quick action everywhere. Individual rules do not carry their own exception policy.

- **Persona fit:** Gives Marcus one simple answer to “Can I quickly override Screen Time?” and minimizes configuration.
- **Design-challenge answer:** Establishes a clear app-wide commitment posture and verifies identity whenever that posture or an exception changes.
- **System fit:** Adds a device/account preference above the existing rule model; guide derivation must combine this preference with actor authority and overlapping rule eligibility.
- **Family boundary:** The master gate cannot confer family authority. Family rules still remain unavailable to children and require separate caregiver authorization.
- **Best when:** The user expects all personal Screen Time rules to share one strength level and values simplicity over nuance.
- **Fails when:** A legitimate flexible rule weakens every firm rule, the user forgets the broad effect of the setting, or device/account sync semantics become ambiguous.
- **Smallest system extension:** Add one persisted master policy, migrate it off, protect changes, and consult it before guide actions and commands.
- **Four-object model:** Touches no Arc, Goal, Activity, or Chapter directly. It is a Screen Time infrastructure preference.
- **Capture-first stance:** Pass. Activity capture is unaffected.
- **Anti-pattern check:** Pass with a clarity risk. A broad control must state its scope plainly and cannot become another settings dashboard.

## Alternative C — Management-only recovery

The bottom guide never offers a temporary opening. It preserves the current page, explains which rule intervened, and offers **Review rule**. From the rule-management surface, an authorized owner can authenticate and either apply a bounded 20-minute exception, pause the rule, or edit it. The rule may still carry **Allow temporary exceptions**, but that setting governs whether the management surface may create the bounded exception; it never restores a hot-path guide action.

- **Persona fit:** Best matches Marcus when the guardrail’s purpose is to survive the impulse moment and he accepts leaving that moment before making an exception.
- **Design-challenge answer:** Separates the intervention from the recovery path structurally, not merely with one authentication prompt.
- **System fit:** Reuses rule management and the existing override command, but changes the accepted contextual-unlock contract by removing temporary opening from the bottom guide.
- **Family boundary:** Strong. Child devices receive no exception action; caregiver management remains a separate authorized context.
- **Best when:** The product wants the guide to be an intentional pause rather than an override surface.
- **Fails when:** A legitimate time-sensitive need makes navigation feel punitive, or the management surface becomes an indirect but equally quick escape without clear hierarchy.
- **Smallest system extension:** Add the default-off policy and authenticated management action; remove the guide’s direct override branch.
- **Four-object model:** Touches no new object. The guide can continue to point toward the selected Activity when one exists, without requiring it.
- **Capture-first stance:** Pass. Capture remains unblocked; the extra friction applies only to bypassing a Screen Time rule.
- **Anti-pattern check:** Pass if **Review rule** is dismissible and factual. It fails if the guide forces a planning action before the user can close it.

## Alternative D — Delayed commitment changes

Use the rule-local model from Alternative A, but turning **Allow temporary exceptions** on does not take effect immediately. The user authenticates, sees the effective time, and the policy becomes active after a calm-period delay such as the next day. Turning exceptions off can happen immediately. Once previously enabled, each 20-minute exception still requires fresh authentication.

- **Persona fit:** Gives Marcus the strongest self-authored commitment device: the decision made during an intervention cannot instantly weaken the rule.
- **Design-challenge answer:** Uses time, not only identity, to distinguish a calm policy decision from an impulse response.
- **System fit:** Requires a pending policy state, activation timestamp, migration rules, foreground reconciliation, and clear copy across rule management and guide projection.
- **Family boundary:** The child remains unable to change policy. Caregiver-owned family policy would need separately defined timing and is not implied by the personal rule.
- **Best when:** Users explicitly want a commitment contract that resists even authenticated in-the-moment changes.
- **Fails when:** The delay blocks a legitimate urgent need, timezone or clock behavior becomes confusing, or users perceive the app as taking ownership away from them.
- **Smallest system extension:** Add `requestedAllowed` and `effectiveAt` semantics to the exception policy plus deterministic reconciliation.
- **Four-object model:** Touches no new planning object; it is temporal policy on Screen Time infrastructure.
- **Capture-first stance:** Pass. It does not block Activity capture, though it deliberately delays a restriction-policy change.
- **Anti-pattern check:** Pass only if opt-in, transparent, and reversible toward greater protection. It becomes punitive if imposed universally or framed as failure prevention.

## Comparative read

| Alternative | Hot-path exception | Policy scope | Main strength | Main liability |
| --- | --- | --- | --- | --- |
| A. Rule-local authenticated | Yes, when pre-enabled | Per rule | Flexible without weakening every rule | Authentication may still become reflexive |
| B. Master gate | Yes, when enabled | All personal rules | Simplest mental model | One flexible need weakens every rule |
| C. Management-only recovery | No | Per rule | Strong separation between impulse and recovery | More steps during a legitimate urgent need |
| D. Delayed commitment changes | Yes, only after prior calm-period enablement | Per rule plus time | Closes the settings-route impulse loophole | More state, explanation, and lockout risk |

## Divergence takeaway

Alternative B is the smallest UI addition but the weakest policy model: its broad scope creates hidden coupling between unrelated rules. Alternative D is the strongest commitment mechanism but adds disproportionate temporal state and recovery risk for an initial release.

The real convergence decision is between:

- **Alternative A:** preserve a genuinely quick exception, but make it rule-local, explicitly enabled, and authenticated; or
- **Alternative C:** remove quick exceptions from the intervention surface and make rule management the deliberate recovery path.

Both honor the approved default-off migration. They differ on whether the bottom guide should ever be an override surface at all.
