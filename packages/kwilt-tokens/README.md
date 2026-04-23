# @kwilt/tokens

Shared design tokens (color, spacing, typography, motion, surfaces, overlays) for every Kwilt client.

This package is the single source of truth. Every surface — mobile (React Native), web (`kwilt-site`), and the future desktop app — consumes tokens from here so the three clients cannot drift on brand fundamentals.

## Layout

```
src/
  colors.ts            Raw color palette + semantic role tokens
  spacing.ts           Spacing scale
  typography.ts        Font families, typographic scale; CSS-friendly mono stack
  motion.ts            Web/desktop-friendly motion primitives: durations + easings
  surfaces.ts          Card elevations + card surface style (React-Native shadow shape)
  overlays.ts          Scrims + blurs
  colorUtils.ts        Color helpers (hexToRgba)
  objectTypeBadges.ts  Object-type badge color mapping
  tailwind-preset.ts   Tailwind v3 preset that maps the above tokens to Tailwind theme keys
  index.ts             Barrel that re-exports every symbol above
```

## Usage

### Mobile (Kwilt Expo app)

Mobile's `src/theme/*` files are thin re-exports of this package, so existing imports (e.g. `import { colors } from '../../theme'`) continue to work unchanged. New code can import directly from `@kwilt/tokens` if preferred:

```ts
import { colors, spacing } from '@kwilt/tokens';
```

The `react-native` export condition points at the TypeScript source, so Metro bundles the tokens directly — no build step required for mobile iteration.

### Web (kwilt-site) / Desktop

Tailwind preset:

```ts
// tailwind.config.ts
import kwiltTailwindPreset from '@kwilt/tokens/tailwind-preset';

export default {
  presets: [kwiltTailwindPreset],
  content: [...],
};
```

Raw token imports work too (e.g. in CSS-in-JS or inline styles):

```ts
import { colors } from '@kwilt/tokens';
```

## Motion on mobile vs web

Mobile's `src/theme/motion.ts` emits `react-native-reanimated` transition objects and intentionally lives outside this package. The package's `motion.ts` ships raw primitives only (`durations`, `easings`) so web + desktop can consume them without pulling in Reanimated. If mobile later wants a shared source for the numbers, it can import `durations`/`easings` from `@kwilt/tokens/motion` and rebuild its Reanimated objects from them.

## Build

```bash
npm run -w @kwilt/tokens build    # emits dist/ (CJS + ESM + .d.ts) via tsup
npm run -w @kwilt/tokens typecheck
```

The package is private (`"private": true`) and intended for workspace consumption only — never published to npm.
