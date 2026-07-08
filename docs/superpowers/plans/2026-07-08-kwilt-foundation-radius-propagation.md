# Kwilt Foundation Radius Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shared Kwilt design radii propagate from `@kwilt/tokens` into mobile, desktop, and site consumers, using card radius as the first proof case for a broader Kwilt foundation system.

**Architecture:** Add semantic radius tokens to `@kwilt/tokens`, expose them through the existing Tailwind preset, and replace representative local radius values with token imports/classes. Treat tokens as the shared contract; platform UI packages can come later after the propagation path is proven.

**Tech Stack:** TypeScript, npm workspaces, Expo React Native, Tailwind v3, Vite/Tauri desktop, Next.js site, `@kwilt/tokens`, `tsup`.

---

## Scope

This plan intentionally ships one durable foundation slice:

- Shared radius tokens.
- Tailwind propagation.
- Mobile theme bridge.
- One mobile surface proof.
- One desktop surface proof.
- One site configuration proof.
- Documentation for the propagation contract.

It does not create `@kwilt/ui-rn`, `@kwilt/ui-web`, `@kwilt/voice`, or `@kwilt/product-system` yet. Those should follow after token propagation is boring and verified.

## File Structure

- Create `packages/kwilt-tokens/src/radii.ts`
  - Owns semantic radius roles for all Kwilt clients.
- Modify `packages/kwilt-tokens/src/index.ts`
  - Re-exports `radii`.
- Modify `packages/kwilt-tokens/src/tailwind-preset.ts`
  - Maps semantic radius tokens to Tailwind `rounded-*` classes.
- Modify `packages/kwilt-tokens/src/surfaces.ts`
  - Makes `cardSurfaceStyle.borderRadius` consume `radii.card`.
- Modify `packages/kwilt-tokens/tsup.config.ts`
  - Emits the deep `@kwilt/tokens/radii` entry.
- Modify `packages/kwilt-tokens/package.json`
  - Adds `./radii` export.
- Modify `packages/kwilt-tokens/README.md`
  - Documents radius propagation.
- Create `src/theme/radii.ts`
  - Preserves the mobile theme bridge pattern.
- Modify `src/theme/index.ts`
  - Exports the mobile radius bridge.
- Modify `src/ui/ActivityListItem.tsx`
  - Leaves existing `cardSurfaceStyle` usage in place as the mobile proof that card radius changes propagate through surfaces.
- Modify `/Users/andrewwatanabe/kwilt-desktop/src/components/kwilt/workspace.tsx`
  - Replaces local card radius class with the shared Tailwind class.
- Modify `/Users/andrewwatanabe/kwilt-site/package.json`
  - Adds `@kwilt/tokens` file dependency.
- Modify `/Users/andrewwatanabe/kwilt-site/tailwind.config.ts`
  - Consumes the shared preset and keeps site-specific CSS variable aliases.
- Create `docs/design-system/foundation-propagation.md`
  - Documents the rule: apps only auto-update when they consume shared tokens or shared components.

---

### Task 1: Add Semantic Radius Tokens

**Files:**
- Create: `packages/kwilt-tokens/src/radii.ts`
- Modify: `packages/kwilt-tokens/src/index.ts`
- Modify: `packages/kwilt-tokens/tsup.config.ts`
- Modify: `packages/kwilt-tokens/package.json`

- [ ] **Step 1: Create the radius token file**

Create `packages/kwilt-tokens/src/radii.ts`:

```ts
/**
 * Semantic corner radii shared across Kwilt clients.
 *
 * Raw numbers belong here. Apps should consume semantic roles instead of
 * hard-coding `borderRadius` values or arbitrary Tailwind radius utilities.
 */
export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  control: 8,
  menuItem: 8,
  input: 12,
  card: 18,
  compactCard: 16,
  panel: 20,
  menu: 22,
  sheet: 28,
  hero: 28,
  pill: 999,
} as const;

export type RadiusRole = keyof typeof radii;
```

- [ ] **Step 2: Export radii from the package barrel**

In `packages/kwilt-tokens/src/index.ts`, add this export after the spacing export:

```ts
export * from './radii';
```

- [ ] **Step 3: Add the tsup entry**

In `packages/kwilt-tokens/tsup.config.ts`, add `src/radii.ts` to the `entry` array:

```ts
entry: [
  'src/index.ts',
  'src/colors.ts',
  'src/spacing.ts',
  'src/radii.ts',
  'src/typography.ts',
  'src/motion.ts',
  'src/surfaces.ts',
  'src/overlays.ts',
  'src/colorUtils.ts',
  'src/objectTypeBadges.ts',
  'src/tailwind-preset.ts',
],
```

- [ ] **Step 4: Add the package export**

In `packages/kwilt-tokens/package.json`, add this entry to `exports` after `./spacing`:

```json
"./radii": {
  "react-native": "./src/radii.ts",
  "types": "./dist/radii.d.ts",
  "import": "./dist/radii.js",
  "require": "./dist/radii.cjs",
  "default": "./dist/radii.js"
},
```

- [ ] **Step 5: Typecheck**

Run:

```bash
npm run -w @kwilt/tokens typecheck
```

Expected: `tsc --noEmit` exits successfully.

---

### Task 2: Wire Radius Tokens Into Surfaces And Tailwind

**Files:**
- Modify: `packages/kwilt-tokens/src/surfaces.ts`
- Modify: `packages/kwilt-tokens/src/tailwind-preset.ts`

- [ ] **Step 1: Make card surface consume `radii.card`**

In `packages/kwilt-tokens/src/surfaces.ts`, add the import:

```ts
import { radii } from './radii';
```

Then replace:

```ts
borderRadius: 18,
```

with:

```ts
borderRadius: radii.card,
```

- [ ] **Step 2: Add radius mapping helpers to the Tailwind preset**

In `packages/kwilt-tokens/src/tailwind-preset.ts`, add the import:

```ts
import { radii } from './radii';
```

Add these helpers below `pxify`:

```ts
function kebabify(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function pxifySemantic(record: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) out[kebabify(k)] = `${v}px`;
  return out;
}
```

- [ ] **Step 3: Extend Tailwind border radius**

In the preset `theme.extend` object, add:

```ts
borderRadius: pxifySemantic(radii as unknown as Record<string, number>),
```

The nearby shape should become:

```ts
extend: {
  colors: { ...colors },
  spacing: pxify(spacing as unknown as Record<string, number>),
  borderRadius: pxifySemantic(radii as unknown as Record<string, number>),
  fontFamily: {
```

- [ ] **Step 4: Build tokens and inspect the emitted preset**

Run:

```bash
npm run -w @kwilt/tokens build
```

Then run:

```bash
node --input-type=module -e "import preset from './packages/kwilt-tokens/dist/tailwind-preset.js'; const r = preset.theme.extend.borderRadius; if (r.card !== '18px' || r['compact-card'] !== '16px' || r.sheet !== '28px') throw new Error(JSON.stringify(r)); console.log('radius preset ok')"
```

Expected output:

```text
radius preset ok
```

---

### Task 3: Add The Mobile Theme Bridge

**Files:**
- Create: `src/theme/radii.ts`
- Modify: `src/theme/index.ts`
- Read: `src/ui/ActivityListItem.tsx`

- [ ] **Step 1: Create the mobile bridge**

Create `src/theme/radii.ts`:

```ts
export * from '@kwilt/tokens/radii';
```

- [ ] **Step 2: Export the bridge**

In `src/theme/index.ts`, add:

```ts
export * from './radii';
```

Place it after:

```ts
export * from './spacing';
```

- [ ] **Step 3: Confirm the existing card surface proof**

Open `src/ui/ActivityListItem.tsx` and confirm the card wrapper still uses:

```ts
borderRadius: cardSurfaceStyle.borderRadius,
```

Do not replace this with `radii.card`. The point is to preserve `cardSurfaceStyle` as the component-level contract while `cardSurfaceStyle` gets its value from `radii.card`.

- [ ] **Step 4: Typecheck mobile**

Run:

```bash
npm run lint
```

Expected: `tsc --noEmit` exits successfully.

---

### Task 4: Make Desktop Use Shared Radius Classes For One Kwilt Component Family

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-desktop/src/components/kwilt/workspace.tsx`
- Verify: `/Users/andrewwatanabe/kwilt-desktop/tailwind.config.ts`

- [ ] **Step 1: Confirm desktop already consumes the preset**

Open `/Users/andrewwatanabe/kwilt-desktop/tailwind.config.ts` and confirm it contains:

```ts
import kwiltTailwindPreset from "@kwilt/tokens/tailwind-preset";

export default {
  presets: [kwiltTailwindPreset],
```

- [ ] **Step 2: Replace the local workspace radius class**

In `/Users/andrewwatanabe/kwilt-desktop/src/components/kwilt/workspace.tsx`, replace:

```ts
card: "rounded-[16px]",
```

with:

```ts
card: "rounded-compact-card",
```

Keep:

```ts
accent: "rounded-full",
```

`rounded-full` is allowed for pill/circle geometry because Tailwind's built-in value is stable and maps to the same semantic behavior as `radii.pill`.

- [ ] **Step 3: Build desktop**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-desktop && npm run build
```

Expected: `tsc && vite build` exits successfully.

---

### Task 5: Make Site Consume The Shared Tailwind Preset

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/package.json`
- Modify: `/Users/andrewwatanabe/kwilt-site/tailwind.config.ts`

- [ ] **Step 1: Add the token package dependency**

In `/Users/andrewwatanabe/kwilt-site/package.json`, add this dependency:

```json
"@kwilt/tokens": "file:../Kwilt/packages/kwilt-tokens",
```

Place it in `dependencies`, before the Radix dependencies.

- [ ] **Step 2: Install site dependencies**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site && npm install
```

Expected: `package-lock.json` updates and `node_modules/@kwilt/tokens` resolves to the local file dependency.

- [ ] **Step 3: Import and apply the preset**

In `/Users/andrewwatanabe/kwilt-site/tailwind.config.ts`, add:

```ts
import kwiltTailwindPreset from "@kwilt/tokens/tailwind-preset";
```

Then add the preset key before `content`:

```ts
presets: [kwiltTailwindPreset],
```

Keep the existing `theme.extend.colors.kw` aliases and `borderRadius` aliases:

```ts
borderRadius: {
  control: "6px",
  card: "9px",
  pill: "999px"
},
```

This is intentional for the first site pass because `rounded-card` is already used as a site-specific public/share surface token. A later design pass should decide whether site `rounded-card` should become the shared `18px` value or remain a public-site override.

- [ ] **Step 4: Build the site**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site && npm run build
```

Expected: Next.js production build exits successfully.

---

### Task 6: Document The Propagation Contract

**Files:**
- Create: `docs/design-system/foundation-propagation.md`
- Modify: `packages/kwilt-tokens/README.md`

- [ ] **Step 1: Create the design-system docs directory**

Run:

```bash
mkdir -p docs/design-system
```

- [ ] **Step 2: Add the propagation contract doc**

Create `docs/design-system/foundation-propagation.md`:

```markdown
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

Mobile card surfaces consume `cardSurfaceStyle.borderRadius`, and `cardSurfaceStyle` consumes `radii.card`.

Desktop consumes the Tailwind preset, so `rounded-compact-card` resolves from `radii.compactCard`.

Site consumes the Tailwind preset, but keeps site-specific aliases until public-site surfaces are reviewed.
```

- [ ] **Step 3: Update `@kwilt/tokens` README**

In `packages/kwilt-tokens/README.md`, update the layout list to include:

```text
  radii.ts            Semantic corner radius roles shared by RN and Tailwind
```

Update the token mapping comment in the Tailwind usage section to include:

```markdown
The preset maps colors, spacing, radii, typography, shadows, and motion into Tailwind theme extension keys. Radius roles become kebab-case utilities such as `rounded-card`, `rounded-compact-card`, and `rounded-sheet`.
```

- [ ] **Step 4: Run product/documentation lint**

Run:

```bash
npm run product:lint
```

Expected: product lint exits successfully.

---

### Task 7: Full Verification

**Files:**
- All files changed in Tasks 1-6.

- [ ] **Step 1: Verify changed files in Kwilt**

Run from `/Users/andrewwatanabe/Kwilt`:

```bash
npm run verify:changed -- --run
```

Expected: diff-aware gates pass.

- [ ] **Step 2: Verify token build one more time**

Run:

```bash
npm run -w @kwilt/tokens build
```

Expected: `dist/radii.js`, `dist/radii.cjs`, and `dist/radii.d.ts` exist.

- [ ] **Step 3: Verify desktop**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-desktop && npm run build
```

Expected: desktop build passes.

- [ ] **Step 4: Verify site**

Run:

```bash
cd /Users/andrewwatanabe/kwilt-site && npm run build
```

Expected: site build passes.

- [ ] **Step 5: Inspect git diffs**

Run:

```bash
cd /Users/andrewwatanabe/Kwilt && git diff --stat
cd /Users/andrewwatanabe/kwilt-desktop && git diff --stat
cd /Users/andrewwatanabe/kwilt-site && git diff --stat
```

Expected: diffs are limited to token propagation, docs, and the first representative consumers.

---

## Follow-On Plans

After this plan ships, write separate implementation plans for:

- `@kwilt/voice`: copy primitives, forbidden phrases, AI tone guardrails.
- `@kwilt/product-system`: persona/JTBD/job-flow/feature-brief schemas, templates, and lint rules.
- `@kwilt/ui-rn`: shared mobile primitives once repeated React Native component patterns are stable.
- `@kwilt/ui-web`: shared web/desktop primitives once desktop and site agree on which primitives should actually be shared.

Do not bundle those into this radius propagation branch. The success signal for this branch is narrower: a radius token change has a clear path to all three app surfaces.
