# Converge: Required App Threshold

## Qualitative score

| Alternative | Maya fit | Truthfulness | System fit | Automatic follow-through | Risk |
| --- | --- | --- | --- | --- | --- |
| Required App Threshold | Strong | Strong with careful copy | Strong | Strong | Native proof required |
| Kwilt Activity Completion | Medium | Strong | Medium | Medium | Assignment dependency |
| Scheduled Delay | Medium | Strong | Strong | Weak | Does not meet request |
| Child Confirmation | Medium | Medium | Medium | Weak | Adds ceremony |

## Chosen alternative

Add a `prerequisiteActivity` criterion to the Family Access Rule:

```text
Before [target selection] becomes available,
use [prerequisite selection] for [N foreground minutes],
resetting [daily / within the rule schedule].
```

Chat resolves the child and both saved selections. If either selection is missing, it routes the caregiver to Apple's picker for that exact label and does not stage a partial rule. Once both exist, Chat stages one consequential proposal:

> **Use Gospel Library before Games**
> Charlie uses Gospel Library for 5 minutes before Games become available each day.

Approval saves a versioned active agreement. It does not claim that the child device has applied it; delivery state remains separate.

## Capability delta

Today, Maya cannot express a prerequisite app-use threshold through Chat, and the backend agreement schema does not distinguish the prerequisite from the apps being governed.

After this slice, Maya can create and review that rule using saved privacy-preserving selections, and an enrolled device can compile it into a Device Activity event and target shield.

Still unsupported: verifying scripture content, arbitrary boolean logic, silently choosing apps, or claiming physical-device enforcement from tests or Simulator.

## Reductive decisions

- Extend Family Access Rule; do not expose “rules engine.”
- One prerequisite selection and one target selection per rule.
- One positive threshold with daily reset; no operators or formulas.
- No progress dashboard or detailed usage history.
- No notification when the threshold normally succeeds.
- The shield names the required action: “Use Gospel Library for 5 minutes to open Games.”

## Activation

Chat is the activation surface because the caregiver already thinks in complete family sentences. Native app selection appears only when a label has not been saved for Charlie.

## Bet

We're betting that a caregiver can express most “do this app activity before entertainment” needs as one prerequisite threshold inside a readable family agreement. If families immediately need multiple prerequisites or nested logic, revisit the sentence model before adding operators.

## Success signal

Maya can say the example request, review the exact child/required app/threshold/target/reset, approve it, and later distinguish Saved from Applied. On a signed child device, five foreground minutes trigger the target transition without opening Kwilt or contacting a caregiver.
