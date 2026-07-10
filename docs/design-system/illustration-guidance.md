# Kwilt Illustration Guidance

Kwilt Goals illustrations are design-system references for emotional product moments. They should make the app feel warm, handmade, and practical without becoming decorative filler.

## Current Source Assets

| Asset | Role | Current use |
| --- | --- | --- |
| `assets/illustrations/goal-set.png` | Moment hero | First-goal celebration interstitial. |
| `assets/illustrations/welcome.png` | Onboarding hero | First-time welcome step. |
| `assets/illustrations/aspirations.png` | Path-setting hero | First-time aspirations/path setup step. |
| `assets/illustrations/notifications.png` | Permission hero | First-time reminder setup step. |
| `assets/illustrations/empty.png` | Utility spot | Default empty state illustration. |

## Style Rules

- Use one scene with one clear action, not a loose symbol collage.
- Keep the palette earthy and cross-app compatible: pine, quilt blue, turmeric, clay, parchment, and warm sumi neutrals.
- Preserve the current rendering language: soft texture, rounded objects, gentle shadows, approachable characters, and clean silhouettes.
- Match scale to surface weight. Full-screen moments can use 260-320px art; onboarding steps can use 200-260px; empty states should usually stay around 96-180px.
- Treat illustrations as supporting content. They should never crowd the primary action, hide the next step, or replace clear copy.
- Do not add photorealistic, glossy, stock-like, or corporate-vector art to this family.

## Promotion Posture

This is guidance, not a shared component API yet. Keep assets local until at least two Kwilt apps need the same illustration role. Promote only after the role, sizing rules, accessibility behavior, and asset loading path are stable.

Review the current catalog in Storybook under `Illustration/Goals Styles`.
