# Back affordances (inventory + unification plan)

This doc inventories every “back” affordance pattern currently used in Kwilt and defines the canonical, unified approach.

**Goal:** keep navigation affordances visually *secondary* and reserve **Kwilt green** for **high-signal primary CTAs**.

## Inventory (current patterns)

### 1) Standard canvas headers: `PageHeader` (most screens)
- **Component**: `src/ui/layout/PageHeader.tsx`
- **Used by** (examples): Settings, Subscriptions, Calendars, destinations, admin tools, etc.
- **Affordance**: icon-only back button on the left, title centered.
- **Rule**: this back affordance is **navigation**, not a CTA.

### 2) Full-bleed / hero object pages: `ObjectPageHeader` + `HeaderActionPill`
- **Component**: `src/ui/layout/ObjectPageHeader.tsx`
- **Used by**: Arc + Goal detail, Activity detail refresh header.
- **Affordance**: frosted circular pill (blur material) with chevron-left.
- **Why it exists**: hero imagery requires a background treatment for legibility; the frosted material communicates “header control” without reading as a CTA.

### 3) Ad-hoc custom headers (legacy / one-offs)
- **Example**: `src/features/friends/FriendsScreen.tsx` previously implemented its own header row with a chevron-left `Pressable`.
- **Risk**: these drift in hit targets, icon choice, spacing, and color tokens.
- **Plan**: migrate to `PageHeader` unless there’s a strong reason not to.

### 4) “Back” inside multi-step flows (not header nav)
- **Examples**:
  - `src/features/account/ConnectCursorWizardScreen.tsx` uses `Button variant="secondary" size="sm" label="Back"` for wizard steps.
  - `src/features/arcs/ArcCreationFlow.tsx` uses a `ghost` back button inside the flow.
- **Rule**: this is *in-flow navigation*, not a screen pop; it should look like a secondary/tertiary action **inside the canvas**, not like a header control.

## Unification plan (canonical rules)

### A) Canonical “screen back” (stack pop)
- **Use**: `PageHeader` with `onPressBack`.
- **Visual**: icon-only, **neutral** (ghost) styling; no green fill.
- **Hit target**: 44×44 minimum.
- **Accessibility**: label should be “Go back from {title}” or equivalent.

### B) Canonical “hero header back” (stack pop on hero imagery)
- **Use**: `ObjectPageHeader` + `HeaderActionPill` with a chevron-left icon.
- **Icon**: use `arrowLeft` (same as `PageHeader`) so “Back” reads consistently across the app.
- **Visual**: frosted pill material (default variant), neutral icon color.
- **Why**: preserves legibility over imagery without implying a primary CTA.

### C) Canonical “flow back” (stepper state change)
- **Use**: `Button variant="secondary"` (or `ghost` if visually crowded), typically `size="sm"`.
- **Text**: “Back” is fine; it’s not a header affordance.

## Hard rules (to prevent regressions)
- **Do not** use a filled **accent/green** circular control for back navigation.
- **Do not** use `IconButton`’s default/CTA styling for navigation icons in headers.
- Prefer using shared header components rather than ad-hoc `Pressable` headers.

## Migration checklist
- Replace custom headers with `PageHeader` when the screen lives inside the standard app canvas.
- For hero pages, standardize on `HeaderActionPill` (avoid bespoke circles).
- Ensure any remaining custom implementations match: 44pt target, neutral colors, consistent iconography.


