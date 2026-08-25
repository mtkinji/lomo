## Haptics strategy (Kwilt)

### Goals

- **Feel consistent**: haptics should build a learnable “language” across the product.
- **Protect calm**: every enabled app-owned button acknowledges a tap, using a subtle, rate-limited default unless the action has a stronger semantic event.
- **Respect accessibility**: when **Reduce Motion** is enabled, suppress decorative haptics.
- **Preserve UX layers**:
  - **App shell** (primary nav / global chrome): minimal, mostly selection haptics.
  - **App canvas** (object work): buttons acknowledge taps; meaningful commitments and outcomes use their stronger semantic event instead of a second generic pulse.

### One rule: no direct haptics in UI

Do not import platform haptics directly from screens/components. Use the centralized service:

- `src/services/HapticsService.ts`

This gives us:
- semantic tokens (so UX can evolve without touching every callsite)
- rate limiting (prevents “machine gun” feel)
- future user setting integration (toggle intensity/off)

### Token map (what to use when)

#### App shell (nav / chrome)

- **`shell.nav.selection`**: switching tabs, selecting a primary destination.
- **`shell.nav.open` / `shell.nav.close`**: opening/closing drawer, global overlays.

Constraints:
- Keep shell haptics **light** and **rare** (service already throttles these more).
- No haptics for scrolling, inert taps, or repeated re-selects of the same destination.

#### App canvas (content work)

- **`canvas.selection`**: the quiet default acknowledgement for an enabled app-owned button, and for item selection when no stronger semantic event applies.
- **`canvas.toggle.on` / `canvas.toggle.off`**: toggles that change state (not disabled).
- **`canvas.primary.confirm`**: confirm/submit actions that commit work (save, schedule, create).
- **`canvas.destructive.confirm`**: destructive confirmation (delete, discard).

Constraints:
- Generic button acknowledgement fires with the accepted press. Stateful and outcome haptics should still follow the real change whenever the interaction can fail.
- Prefer visual feedback first; haptics are secondary.

#### Outcomes (learnable language)

- **`outcome.success`**: completion/celebration moments, successful saves.
- **`outcome.warning`**: soft-blocks / “are you sure?” or non-fatal issues.
- **`outcome.error`**: failed save, rejected action, validation error after submit.

Constraints:
- Outcomes should be **rare but reliable**; these tokens are not throttled.

### Accessibility & preferences

- **Reduce Motion**: when enabled, we suppress “decorative” haptics (nav + selection) while keeping confirmations/outcomes.
- **User toggle**: we should add an in-app setting later (“Haptics: On/Off”, optionally intensity). The service already supports `setEnabled()`.

### Example callsites (guidelines)

- **Tab switch**: call `HapticsService.trigger('shell.nav.selection')` on actual destination change.
- **Bottom sheet item selection**: the button receives the shared quiet acknowledgement; do not layer another selection pulse on top.
- **Save button**:
  - immediately after a successful save: `outcome.success`
  - on validation failure after submit: `outcome.error`

### Anti-patterns (don’t)

- Don’t add a second generic pulse when a button already owns a semantic haptic.
- Don’t fire haptics in loops / animations / scroll handlers.
- Don’t fire on “disabled” interactions.
- Don’t use heavy haptics for navigation.

### Moment → token mapping (recommended)

Use this as the “source of truth” for what gets haptics and how strong it should feel.

| Moment | Layer | Token | Notes |
|---|---|---|---|
| Mark Activity done | Canvas | `outcome.success` | Strong, Duolingo-style “progress happened”. |
| Mark Activity undone | Canvas | `canvas.primary.confirm` | Lighter than success; still confirms the change. |
| Create Activity | Canvas | `outcome.success` | Fire once per create (avoid per-item loops). |
| Create Goal / Arc | Canvas | `outcome.success` | Pair with existing success toast. |
| Focus: start | Canvas | `canvas.primary.confirm` | When user commits to starting Focus. |
| Focus: pause/resume | Canvas | `canvas.toggle.off` / `canvas.toggle.on` | Keep subtle; this can happen frequently. |
| Focus: completed (timer hits 0) | Canvas | `outcome.success` | A milestone; should feel rewarding. |
| Soft block (paywall limit, validation gating) | Canvas | `outcome.warning` | Not an error; communicates “blocked” clearly. |
| Commit failed (save/schedule error) | Canvas | `outcome.error` | Only when user attempted a commit and it failed. |
| Bottom sheet option picked | Canvas | `canvas.selection` | Throttled; do not use for scroll/drag. |
| Activities: view/filter/sort changed | Canvas | `canvas.selection` | Only when value actually changes. |
| Activities: priority star toggled | Canvas | `canvas.toggle.on/off` | Only on state change. |
| Onboarding milestone guide appears (first Arc/Goal/plan-ready) | Canvas | `outcome.success` | Fire once when the guide first appears. |
| App shell: drawer/menu opened | Shell | `shell.nav.open` | Use sparingly; only for actual open action. |
| App shell: drawer/menu closed | Shell | `shell.nav.close` | Pair with open; fire only when an open menu actually closes. |
| App shell: primary destination change | Shell | `shell.nav.selection` | Only when destination actually changes. |
| Chat composer engaged/disengaged | Canvas | `canvas.toggle.on/off` | One subtle selection at each real boundary; suppress the disengage pulse when opening navigation already provides shell feedback. |
