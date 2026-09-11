# Kwilt Foundation Propagation

Kwilt apps receive shared design updates only when they consume shared contracts.

## Propagation Levels

1. Token propagation
   - Shared source: `@kwilt/tokens`.
   - Example: `radii.card`.
   - Consumers update after dependency install/build when they import the token or use a Tailwind class emitted by the preset.

2. Component propagation
   - Shared source: future `@kwilt/ui-rn` or `@kwilt/ui-web`.
   - Example: a shared `Card` component.
   - Consumers update when they import the shared component.

3. Local implementation
   - Shared source: none.
   - Example: `borderRadius: 18` or `rounded-[18px]` inside an app.
   - Consumers do not update automatically.

## Rule

Raw design values belong in the foundation package. App code should consume semantic roles:

```ts
radii.card
radii.compactCard
radii.control
```

or Tailwind classes emitted by the shared preset:

```tsx
<div className="rounded-card" />
<div className="rounded-compact-card" />
```

## First Proof Case

Card radius is owned by `@kwilt/tokens/radii`:

```ts
export const radii = {
  card: 18,
  compactCard: 16,
  control: 8,
  sheet: 28,
  pill: 999,
} as const;
```

Kwilt Goals and Kwilt Money card surfaces consume `cardSurfaceStyle.borderRadius`, and `cardSurfaceStyle` consumes `radii.card`.

Desktop consumes the Tailwind preset, so `rounded-compact-card` resolves from `radii.compactCard`.

The marketing site is intentionally outside this first propagation path. It can opt into shared brand primitives later while keeping campaign and landing-page leeway.

## Input family propagation — approved target, migration pending

The [input contract](input-guidance.md) introduces input-specific material roles because legacy `fieldFill`/`fieldFillPressed` also style non-input surfaces. Preserve those consumers while input callers migrate; a global token replacement is not sufficient adoption evidence.

Native `Input` and picker/inline/rich adapters converge through owned UI components. The embedded Unified Chat workbench lives in `/Users/andrewwatanabe/kwilt-site/components/unified-chat/` and currently uses site CSS variables without an `@kwilt/tokens` package dependency. Its mapping and verification are explicit work in Task 09 of the [implementation plan](../superpowers/plans/2026-09-10-input-unification.md). Native token builds do not update that browser surface automatically. Marketing, guest forms and desktop require their own scope/proof before any claim of convergence.
