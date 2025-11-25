## UI architecture and React Native Reusables

This app deliberately runs with a **mixed UI stack**:

- **Existing app system**
  - Layout and surfaces using React Native `StyleSheet` plus `src/theme/*` tokens.
  - App shell / canvas via `AppShell` and `PageHeader`.
  - Gluestack components (`@gluestack-ui/themed`) in a few places.
- **React Native Reusables system**
  - Tailwind/NativeWind `className` styles, driven by `global.css` and `tailwind.config.js`.
  - Low‑level primitives in `components/ui/*` (Card, Button, Dialog, DropdownMenu, etc.).

Because these systems have different assumptions, **feature code must not talk to Reusables directly**. Instead, the app uses a thin adapter layer.

---

## Option A: adapter layer (current, intentional approach)

All feature code should go through **`src/ui/*` adapters**, not the raw Reusables exports.

- `components/ui/*`  
  - Raw React Native Reusables components, kept as close to upstream as possible.  
  - Tailwind‑native, assume `className` + `global.css` tokens exist.

- `src/ui/*`  
  - Takado‑specific wrappers over Reusables (and, where needed, Gluestack).  
  - Responsible for:
    - Providing **React Native `style` fallbacks** so components still render correctly even if NativeWind styles are missing or delayed.
    - Mapping Reusables props/variants into Takado’s naming (e.g. `variant="accent"` on `Button`).  
    - Integrating with `src/theme` tokens and the **shell / canvas** layout model.

- **Feature layers** (`src/features/*`)  
  - Import only from `src/ui/*`, `src/theme/*`, and layout components.  
  - Never import from `components/ui/*` directly.

This keeps React Native Reusables as an implementation detail behind a small, consistent surface area while preserving the app’s existing UX structure.

---

## Ground rules (to avoid “nothing shows up” problems)

1. **Only use adapters in feature code**
   - ✅ `import { Card } from '../../ui/Card';`
   - ✅ `import { Button } from '../../ui/Button';`
   - ❌ `import { Card } from '@/components/ui/card';`
   - ❌ `import { Button } from '@/components/ui/button';`

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


