# Component Interaction Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kwilt Money's menus and transient surfaces feel immediate, consistent, and platform-literate, starting with the category-detail overflow menu and the highest-leverage shared primitives.

**Architecture:** Keep product behavior unchanged. Replace the category-detail screen's one-off modal popover with the existing shared dropdown primitive, then improve feedback and motion inside that primitive so all dropdown call sites inherit the same behavior. Centralize drawer motion values in the motion theme and leave a measured inventory for later migration of bespoke controls.

**Tech Stack:** Expo 54, React Native 0.81, React 19, `@rn-primitives/dropdown-menu`, React Native Reanimated 4, Expo Haptics, TypeScript.

---

### Task 1: Capture the interaction contract and baseline

**Files:**
- Create: `docs/development/component-quality-audit.md`

- [ ] **Step 1: Record the UI contract**

Document the category-menu job, its one primary trigger, required actions, exclusions, reuse map, states, and simulator proof path.

- [ ] **Step 2: Record measured baseline counts**

Run:

```bash
rg -o '<Pressable\b' app src --glob '*.{ts,tsx}' | wc -l
rg -o '<DropdownMenu>' app src --glob '*.{ts,tsx}' | wc -l
rg -o '<BottomDrawer\b' app src --glob '*.{ts,tsx}' | wc -l
rg -o '<Modal\b' app src --glob '*.{ts,tsx}' | wc -l
```

Expected baseline: 112 direct `Pressable` uses, 3 dropdown roots, 12 drawer uses, and 5 modal uses before this change.

### Task 2: Make the shared dropdown immediate and tactile

**Files:**
- Modify: `src/components/dropdown-menu.tsx`
- Modify: `src/theme/motion.ts`
- Modify: `packages/kwilt-tokens/src/motion.ts`

- [ ] **Step 1: Add pressed-state composition to dropdown items**

Resolve callback and static `style` props into a single callback so each item receives an immediate background/scale response without breaking call-site styles.

- [ ] **Step 2: Add subtle trigger feedback**

Wrap the primitive trigger and call `Haptics.selectionAsync()` on native platforms before forwarding the caller's `onPress`.

- [ ] **Step 3: Replace directional menu drift with short anchored motion**

Change menu entry/exit to an approximately 110ms/80ms fade with a 4px translation and 0.985 scale, using the system reduced-motion preference.

- [ ] **Step 4: Verify types**

Run:

```bash
npm run lint -- --pretty false
```

Expected: exit 0.

### Task 3: Move category actions onto the shared menu

**Files:**
- Modify: `src/components/object-page-header.tsx`
- Modify: `app/budgets/[budgetId].tsx`

- [ ] **Step 1: Make the header action pill composable**

Forward the pressable ref so `DropdownMenuTrigger asChild` can preserve the existing frosted header control while supplying menu behavior.

- [ ] **Step 2: Replace the custom modal**

Remove `settingsOpen`, the screen-specific `Modal`, `MenuRow`, and local popover styles. Render the two actions as shared `DropdownMenuItem` rows aligned to the overflow trigger.

- [ ] **Step 3: Verify the regression net**

Run:

```bash
npm run lint -- --pretty false
```

Expected: exit 0, with no `settingsOpen`, `menuScrim`, or `menuPopover` references in the category-detail screen.

### Task 4: Tune the shared bottom drawer

**Files:**
- Modify: `src/components/bottom-drawer.tsx`
- Modify: `src/theme/motion.ts`

- [ ] **Step 1: Centralize drawer motion**

Add one spring config for opening/settling and short timing configs for closing and scrim transitions.

- [ ] **Step 2: Apply motion to every drawer path**

Use the same spring when opening and returning after a partial drag, and the same close timing for backdrop, parent-driven, and gesture-driven dismissal.

- [ ] **Step 3: Verify types**

Run `npm run lint -- --pretty false`; expect exit 0.

### Task 5: Render and operate the real path

**Files:**
- Update: `docs/development/component-quality-audit.md`

- [ ] **Step 1: Launch the iOS simulator path**

Use the repository's simulator verification instructions, open a category detail, and tap the overflow button.

- [ ] **Step 2: Exercise required states**

Verify open, row press, outside dismissal, repeated rapid open/close, VoiceOver labels, and reduced-motion behavior. Confirm `Category settings` and `Edit header image` still navigate to the same destinations.

- [ ] **Step 3: Score and document**

Mark job clarity, reduction, hierarchy, system fit, interaction, states, resilience, and runtime proof as PASS/FAIL with evidence. Do not claim the broader inventory is complete if the real path could not be operated.
