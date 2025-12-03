## UI architecture and React Native Reusables

This app intentionally separates **layout/shell** concerns from **surface/control** concerns:

- **Layout + shell (existing app system)**
  - Layout using React Native `StyleSheet` plus `src/theme/*` tokens.
  - App shell / canvas via `AppShell` and `PageHeader` (shell background, gutters, and safe‑area).
- **React Native Reusables system (ShadCN‑style)**
  - Tailwind/NativeWind `className` styles, driven by `global.css` and `tailwind.config.js`.
  - Low‑level primitives in `components/ui/*` (Card, Button, Dialog, DropdownMenu, Input, Text, etc.).
  - App‑level adapters in `src/ui/*` that expose the primitives the rest of the app uses.

Because these systems have different assumptions, **feature code must not talk to Reusables directly**. Instead, the app uses a thin adapter layer in `src/ui/*`.

---

## Adapter layer (current, intentional approach)

All feature code should go through **`src/ui/*` adapters**, not the raw Reusables exports.

- `components/ui/*`  
  - Raw React Native Reusables components, kept as close to upstream as possible.  
  - Tailwind‑native, assume `className` + `global.css` tokens exist.

- `src/ui/*`  
  - Takado‑specific wrappers over Reusables:
    - `Button`, `Card`, `Dialog`, `DropdownMenu`, `Sheet`, `Input`, `Badge`, etc.
    - Layout primitives: `VStack`, `HStack`.
    - Typography primitives: `Text`, `Heading`.
  - Responsible for:
    - Providing **React Native `style` fallbacks** so components still render correctly even if NativeWind styles are missing or delayed.
    - Mapping Reusables props/variants into Takado’s naming (e.g. `variant="accent"` on `Button`, typography/tone on `Text`).
    - Integrating with `src/theme` tokens and the **shell / canvas** layout model.

- **Feature layers** (`src/features/*`)  
  - Import only from:
    - `src/ui/*` (surfaces, controls, stacks, text/heading),
    - `src/theme/*` (tokens),
    - layout components (e.g. `AppShell`, `PageHeader`),
    - store/services/domain.
  - **Never** import from `components/ui/*` directly.

This keeps React Native Reusables as an implementation detail behind a small, consistent surface area while preserving the app’s existing UX structure.

---

## Ground rules (to avoid “nothing shows up” problems)

1. **Only use adapters in feature code**
   - ✅ `import { Card } from '../../ui/Card';`
   - ✅ `import { Button } from '../../ui/Button';`
   - ✅ `import { VStack, HStack, Text, Heading } from '../../ui/primitives';`
   - ❌ `import { Card } from '@/components/ui/card';`
   - ❌ `import { Button } from '@/components/ui/button';`
   - ❌ `import { Text } from 'react-native';` for on‑canvas copy and headings (use the adapters instead).

2. **Adapters must guarantee visible surfaces**
   - Each adapter wraps the corresponding Reusables component and:
     - Adds a **theme‑aware React Native `style` fallback** for background, border, radius, and padding (so components still look like real controls without Tailwind).
     - Passes through `className` unchanged, so NativeWind can enhance the visuals when available.
   - Example: `components/ui/card.tsx` defines a `styles.card` fallback; `src/ui/Card.tsx` can further tweak layout (e.g., margins) for the app’s lists.

3. **Keep shell / canvas responsibilities separate**
   - `AppShell` owns:
     - The **shell background** (`colors.shell`) and safe‑area padding.
     - The app‑wide horizontal gutters for the canvas.
   - Cards, dialogs, etc. **never** set a full‑screen background; they are surfaces that sit *on* the canvas.

4. **Prefer composition over new primitives**
   - When adding a new UI pattern (e.g., a new type of list tile), first try:
     - `Card` from `src/ui/Card.tsx` as the surface, plus
     - Layout using `StyleSheet` + `src/theme/*` for inner content.
   - Only add a brand‑new `src/ui/*` component when there is clear reuse across multiple screens.

---

## How to build a screen using the system

When implementing a new screen or refactoring an existing one:

1. **Wrap the screen in the app shell**
   - Use `AppShell` as the root container.
   - Use `PageHeader` for page‑level titles and primary actions when appropriate.

2. **Use layout primitives + theme for structure**
   - Use `VStack`/`HStack` from `src/ui/primitives` for vertical/horizontal stacks and spacing (`space` prop).
   - Use `StyleSheet` + `spacing`, `colors`, `typography` for layout details inside the canvas.

3. **Use UI primitives for surfaces and controls**
   - Buttons: `Button` / `IconButton` (`variant`, `size`).
   - Surfaces: `Card`, `Dialog`, `Sheet`, `DropdownMenu`, `Badge`.
   - Form controls: `Input` (or `Textarea` alias), plus RN components for very custom inputs when needed.
  - For agent-hosted onboarding flows that create identity Arcs, the step cards rendered in the canvas should follow the FTUE spec in `docs/arc-aspiration-ftue.md` (five tap-only questions leading to a synthesized Arc).

4. **Use `Text` / `Heading` for all on‑canvas copy**
   - Choose a `variant` that matches the design (`body`, `bodySm`, `label`, or `xl`/`lg`/`md`/`sm` for headings).
   - Choose a `tone` (`default`, `secondary`, `muted`, `accent`, `destructive`, `inverse`) instead of hard‑coding colors when possible.
   - You can still override `style` for one‑off cases, but prefer variants/tone so typography stays consistent.

5. **Only drop to raw RN primitives when necessary**
   - Use `View`, `ScrollView`, `FlatList`, `Pressable`, etc. for layout and interaction scaffolding.
   - Don’t introduce new visual systems (e.g. another component library) at the feature level; wrap anything new in `src/ui/*` if it becomes a shared primitive.

---

## Adding a new adapter (checklist)

When you introduce a new Reusables component:

1. **Create an adapter in `src/ui/*`**
   - Example: for `components/ui/alert.tsx`, create `src/ui/Alert.tsx`.
   - Wrap the upstream component and:
     - Expose only the props you actually intend to support.
     - Add RN `style` fallbacks that align with `src/theme`.

2. **Update Tailwind tokens only if needed**
   - If the component relies on specific tokens (e.g., `bg-popover`), make sure they are mapped in `global.css` and/or `tailwind.config.js`.  
   - Keep these tokens conceptually aligned with the app’s existing `colors.ts` surfaces to preserve the shell/canvas hierarchy.

3. **Use the adapter everywhere**
   - Migrate any direct imports of `components/ui/*` in `src` to the new `src/ui/*` wrapper.

---

## Debugging checklist for “card/button/dialog looks wrong”

When a Reusables‑backed component doesn’t look right:

1. **Check imports**
   - Confirm the feature imports from `src/ui/*`, not `components/ui/*`.

2. **Check the adapter’s fallback**
   - Ensure the adapter (or the underlying `components/ui/*` file) defines a **non‑empty `StyleSheet` fallback**:  
     - Background color,
     - Border color/width (if appropriate),
     - Border radius,
     - Padding/margins as needed.

3. **Check contrast with the shell**
   - If the card technically exists but feels invisible:
     - Compare `colors.shell` and the card’s background/border colors (`global.css` + `tailwind.config.js`).  
     - Adjust one of them slightly to increase visual separation.

4. **Assume Tailwind is an enhancement, not a requirement**
   - If something is only correct when Tailwind is working, the adapter is too thin.  
   - Strengthen the RN `style` fallback until the component is “good enough” even with no `className` styling.

Following this pattern keeps React Native Reusables integrated cleanly while avoiding the “component renders but looks like nothing” traps that motivated Option A in the first place.


