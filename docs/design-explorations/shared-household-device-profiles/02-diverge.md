# Diverge: Shared Household Device Profiles

## Axis of variation

Where does durable authentication live, and how does the device distinguish a child's bounded participation from an adult's full Kwilt authority?

## Direction A: Caregiver-anchored Household Mode

One individually assigned caregiver remains the device's authenticated Kwilt account. Entering a child context covers the caregiver experience with a restricted Household Mode and establishes the selected child as the acting household member. Child-to-child switching uses the household member switcher and optional member codes. Selecting the caregiver requires fresh device authentication and exits back to the caregiver's ordinary full Kwilt.

- Best when: the iPad is a trusted family device with one adult responsible for it.
- System fit: preserves the current one-auth-session app process and reuses native local authentication.
- Main risk: the restricted layer must be complete; a navigation or background-state leak could expose caregiver content.
- Anchor check: strongest balance of low family friction and explicit adult authority.

## Direction B: Separately enrolled household terminal

A caregiver authorizes the iPad, but the device receives a revocable household-scoped credential rather than retaining an adult account session. Every participating person enters a bounded member session; adult management requires approval from another signed-in device or a separate authentication ceremony.

- Best when: the device should have no latent personal account beneath it.
- System fit: requires a new device-credential and server-authorization model.
- Main risk: substantially greater identity, recovery, offline, and capability plumbing before the family can use Chores.
- Anchor check: strongest isolation, but too much system for the current household use case.

## Direction C: Full multi-account switching

Each adult or older child signs into a complete personal Kwilt session on the shared iPad, similar to operating-system user switching. Accountless dependents would still need a separate managed-profile model.

- Best when: every participant already has an independent account and needs their entire private Kwilt.
- System fit: conflicts with the current one-session app process and multiplies token, cache, notification, and privacy lifecycle risk.
- Main risk: slow ordinary switching and ambiguous handling of dependent children.
- Anchor check: high personal ownership, low household simplicity.

## Identity-control treatments

The shared-device architecture still needs a visible interaction model:

1. **Menu avatar only:** smallest change, but the acting child becomes invisible after the menu closes.
2. **Capability-local switcher only:** clear in Chores, but inconsistent when Household Mode also exposes Goals, To-dos, Recipes, Meal Plan, and Groceries.
3. **One mode-aware identity control in both places:** the capability-menu avatar and the Chores header show the same active member and open the same switcher.

All three are viable. The third best preserves attribution at the moment of chore completion while creating a scalable Household Mode identity grammar.

## Recommendation

Choose **Direction A**, expressed through identity-control treatment **3**. It reuses Kwilt's current authenticated-session architecture, gives the shared iPad a simple family rhythm, and makes the boundary between child participation and adult authority explicit.
