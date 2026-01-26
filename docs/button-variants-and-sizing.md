# Button variants & sizing (canonical)

This document defines the canonical rules for which `Button` variants we use in Kwilt, and how we size primary CTAs. The goal is **consistent hierarchy**: AI actions feel like AI, primary actions feel like “do the thing”, and brand moments feel celebratory—without the whole app reading as “green CTA everywhere”.

Source of truth for the API:
- `src/ui/Button.tsx`
- `src/ui/buttonTokens.ts`

## Variant thesis (when to use what)

### `variant="ai"` (gradient)
Use for **explicit AI actions**:
- “Generate”, “Refine”, “Ask AI”, “Arc AI”, “Goal AI”
- Buttons that trigger an agent step / AI draft / AI refinement

Never use `ai` for generic navigation like “Continue” or “Done”.

### `variant="primary"` (Sumi / neutral dark)
Use for the **primary action on neutral surfaces**:
- “Continue”, “Save”, “Submit”, “Done”, “Create”, “Add”, “Confirm”
- The main CTA at the bottom of a card, page, or sheet when the context is not explicitly AI

This is our default “do the thing” button across the app.

### `variant="accent"` (Kwilt green)
Use for **brand / affirmation / celebration moments**:
- Onboarding “Let’s begin” / “Let’s do it” moments (when you intentionally want a brand punch)
- Positive “commit” moments that we want to feel distinctly Kwilt (sparingly)

Avoid using `accent` as the default primary CTA everywhere; it flattens hierarchy and overweights flow controls like “Continue”.

### FTUE “pill” actions (special pattern)
Some onboarding/tutorial surfaces intentionally use **pill-style response buttons** (e.g. quick response options, coachmark actions). These are a **deliberate exception**: they are part of a guidance UI language and should keep their established look.

Rules:
- Keep these visually light and compact (they should not compete with the highlighted target/content).
- Use `secondary` / `outline` / `accent` *only within that pill pattern* when it improves clarity, rather than forcing `primary`.
- If we need to reuse this pattern beyond onboarding, we should introduce a dedicated component or variant (e.g. `PillButton`) rather than ad-hoc styles.

### `variant="secondary"` and `variant="outline"`
Use for **secondary actions**:
- “Not now”, “Back” (when it needs to look like a button), “Cancel” (non-destructive)
- Alternative paths that should be clearly available but not compete with the primary action

Rule of thumb:
- `secondary`: soft filled button on white cards/surfaces
- `outline`: more “utility” / less filled emphasis

### `variant="ghost"` and `variant="link"`
Use for **tertiary actions**:
- Inline actions, lightweight “Back”, “Learn more”, “Skip”
- Toolbar-ish actions where a filled surface would be too heavy

### `variant="destructive"`
Use for **irreversible / destructive actions**:
- “Delete”, “Remove”, “Archive” (when framed as destructive)

## Sizing thesis

### Primary CTA size is canonical: `md` (44pt)
Primary CTAs should default to **`md`** sizing (44pt height). This is both:
- **Accessibility** (reliable tap target)
- **Consistency** (primary actions feel the same across contexts)

Only use `sm`/`xs` for:
- Secondary/utility actions
- Dense toolbars / icon-like controls

## Placement patterns

### Card footer CTA (e.g. surveys)
- Primary action: `primary` (Sumi), `md`
- Secondary action: `ghost` or `outline`, `md`

### Sheet footer CTA
- Primary action: `primary` (Sumi), `md`, often `fullWidth`
- AI sheet footer: `ai` (gradient), `md`, often `fullWidth`

### Header / small affordances
- Prefer `IconButton` or `variant="ghost"` with clear iconography
- Keep these visually light to preserve content hierarchy

**Important:** `IconButton` defaults to the **CTA** token (filled, accent-forward). That is great for true “primary icon CTAs”, but it is **not** appropriate for navigation.
- **Header navigation (Back / Info / Menu)** should be `variant="ghost"` (neutral).
- Reserve **Kwilt green** (CTA) for high-signal primary actions.

See also: `docs/back-affordances.md`.


