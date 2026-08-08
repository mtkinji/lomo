# Learning Release: Stitch Five

## Concept To Build

A familiar five-dice scorecard game where every committed score stitches a visible patch into a private quilt board.

## Capability Delta

Today, the user cannot:

- Choose a calm, constructive dice game from the Kwilt Games shelf.

After this release, the user can:

- Start local play with two to four optional names.
- Roll, pin, reroll, and stitch through a complete thirteen-turn board.
- See trustworthy score previews and totals.
- Finish with a visible quilt and share a compact text version.

Still intentionally not supported:

- Solo daily challenges, remote play, saved games, public ranking, image export, or new scoring mechanics.

## User Experience

Stitch Five appears under Games → Workshop. Players choose two to four seats and start. The active player rolls five dice, taps dice to pin them, rolls up to twice more, then taps an unused patch to commit its displayed score. The board fills in place. After every player fills thirteen patches, the result names the winner or tie, shows the finished quilts, and offers Share quilt or New game.

## Existing Product Relationship

The release extends Games with a feature-owned screen and pure game domain. It reuses the shelf, player setup, dice feedback, local guest model, theme, navigation shell, and native Share sheet. Bank, Farkle, Dice Roller, remote tables, and existing personal-best behavior remain unchanged.

## Buildable Slice

Must be real:

- Complete scoring and turn state with unit tests.
- Two-to-four-player local setup.
- Five tappable fabric dice with pinned semantics.
- Thirteen-category quilt board with live previews and exact totals.
- Seam Bonus, full-game completion, ties, rematch, rules reference, and text sharing.
- Deep-link and persisted-navigation registration.

Can be thin or temporary:

- Fabric patterns are code-drawn color, inset, seam, and motif treatments.
- Sharing is a text quilt rather than an exported image.
- The title remains a working name inside Workshop.

Intentionally excluded:

- Backend state, accounts, remote rooms, analytics beyond existing app infrastructure, notifications, daily content, and rule variants.

## Release Channel

`Local build`, surfaced in the development Workshop. This is the fastest honest path to table play without presenting the working title or unproven fun as production-ready.

## Brand-Goodwill Guardrails

- Workshop placement makes the learning status explicit.
- No public prompt, streak, notification, or account request.
- Scoring is deterministic and visible before commitment.
- Sharing occurs only after an explicit native Share action.

## Reversibility

The catalog entry is learning-gated, navigation is additive, and the feature owns no persistence or migration. Removing the catalog entry and route makes it unreachable without orphaned user data.

## Permanent Product Threshold

Choose a distinct production name, complete at least two observed local table sessions, see both sessions finish without coaching or scoring disputes, and hear an unprompted request to replay or share from at least one group.
