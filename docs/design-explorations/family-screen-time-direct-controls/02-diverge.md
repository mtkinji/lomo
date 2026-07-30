# Diverge: Family Screen Time Direct Controls

Axis: first-use immediacy versus Apple privacy and repeat-use speed.

## A. Pure name-to-app Chat

Maya says an app name and Kwilt attempts to identify it without prior setup.

- Fit: ideal conversationally.
- System fit: fails the Apple boundary. `FamilyActivitySelection` deliberately exposes opaque selections, not a readable installed-app catalog or a bundle-ID lookup Chat can safely use.
- Best when: the platform provides a previously authorized semantic mapping.
- Fails when: the app has never been selected or two apps share a similar name.
- Anti-pattern: would encourage invented certainty. Reject as a first-use promise.

## B. Saved selection handles with one-time picker handoff

The first request opens Apple’s picker for any missing child-specific selection. Maya confirms the app and gives the selection a reusable label. Future Chat requests resolve the label immediately, show one compact proposal, and apply a versioned temporary override.

- Fit: strongest balance of simple repeat use and platform truth.
- System extension: add selection references, expiring overrides, multi-child batch validation, and per-device receipts.
- Best when: families repeat controls for the same small set of apps or groups.
- Fails when: the chosen app is new; one native handoff is still necessary.
- Anti-pattern check: pass. It stores chosen meaning, not general device inventory.

## C. Category-only direct control

Chat controls broad preselected categories such as Games or Social, never individual apps.

- Fit: cheapest and easiest to explain.
- System fit: reuses the starter **Games** selection.
- Best when: broad family moments matter more than app precision.
- Fails when: Maya wants Brawl Stars off but still wants other games available.
- Anti-pattern check: pass, but underserves the stated job.

## D. Native quick control first

A child detail screen offers **Block now**, child selection, and duration. Chat can open that surface but does not interpret the command.

- Fit: dependable fallback and good correction surface.
- System fit: uses canonical Household ownership.
- Best when: app selection is missing or the request is ambiguous.
- Fails when: Maya must repeat the same administrative path for two children.
- Anti-pattern check: pass, but does not deliver the conversational advantage.
