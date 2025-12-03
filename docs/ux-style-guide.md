# LOMO UX Style Guide

Source reference: the “Timezy” mockups provided on 2025‑11‑17 (three-screen set, pastel green palette). Use the details below as the single source of truth for producing consistent UI updates across the app shell, feature screens, and marketing flows.

---

## 1. Experience Principles

1. **Calm productivity** – everything should feel friendly, unhurried, and supportive. Avoid harsh contrast or dense layouts. Provide ample breathing room around blocks of content.
2. **Soft structure** – surfaces are clearly separated using subtle elevation, rounded corners, and gentle color changes—not hard borders.
3. **Playful but mature** – illustration, rounded typography, and pill buttons keep things approachable, yet copy and hierarchy stay professional.
4. **Guided focus** – each screen has a single primary action above-the-fold (e.g., “Create New Task”). Secondary information stacks underneath in summarized cards.

---

## 2. Visual Language

### Color Palette

Base canvas now leans on the **shadcn/ui Neutral** scale (a calming gray-beige) instead of the earlier pale green backdrop. Reference: neutral swatches at [ui.shadcn.com/colors](https://ui.shadcn.com/colors).

| Role | Hex | Notes |
| --- | --- | --- |
| Canvas base | `#F5F5F4` (Neutral-100) | App background gradient anchor; mix with `#E7E5E4` (Neutral-200) for gentle vertical shift. |
| Elevated surface | `#FFFFFF` | Cards, modals, app shell panels; add subtle shadow to lift from neutral canvas. |
| Primary accent | `#1F5226` | Dark pine; buttons, key text, icons (kept for brand contrast). |
| Secondary accent | `#4F5D4A` | Subheadings, icons, progress outlines (slightly cooler to pair with neutrals). |
| Tertiary accent | `#A2C08B` | Timeline highlights, chart bars; keeps organic freshness amidst neutral base. |
| Positive badge | `#E9FFCE` | Light success backgrounds. |
| Neutral badge | `#E7E5E4` | Date pills, inactive cards, skeleton states. |
| Warning badge | `#FFE6D1` | Soft orange for caution states. |

Usage rules:
- Canvas gradient shifts from neutral-100 (`#F5F5F4`) at the top to neutral-200 (`#E7E5E4`) at the bottom. Optionally tint a hint of desaturated sage (`#DDE5D0` at 15% opacity) to retain warmth.
- Cards use solid `#FFFFFF` plus a faint drop shadow (`rgba(31, 82, 38, 0.08)`, y: 8, blur: 20) and 28px corner radius.
- Primary buttons: solid `#1F5226` background, white text, 24px radius.

### Typography

- **App name / logo lockup**: set “Takado” in **Poppins** (weight 700, 34–36px) with only the first character capitalized to keep the playful rounded brand mark.
- **All other copy**: use **Inter** (system-friendly, neutral). Maintain the hierarchy below:
  - Display / Title: 32-36px, weight 700, tracking +1%.
  - Section heading: 20-24px, weight 600.
  - Body text: 16px, weight 400.
  - Micro copy / labels: 12-13px, uppercase with 15% letter spacing.

Primary color `#1F5226` for titles; `#5D6B54` for body text; `#8E9B83` for labels.

### Iconography & Illustration

Icons are line-based with rounded ends, single-color strokes using `#567658`. When filling icons, use the same color at 16% opacity. Illustrations (like the hero character) should stay hand-drawn and outlined to keep the friendly vibe.

---

## 3. Layout System

### App Shell

- Outer padding: 24px horizontal, 32px top (to accommodate status bar).
- Safe area background uses the gradient described above.
- Content area encapsulated in rounded rectangles (radius 32px).
- Primary nav / quick actions live inside a floating pill near the header (icons inside white circles).

### Section Structure

1. **Greeting Block**
   - Row with badge icon (40px circle) + text stack.
   - Example copy: “Good Morning, Zevanya Casey”.
2. **Primary CTA Card**
   - Large pill-constrained button (“Create New Task”) with icon on the left, descriptive helper text.
3. **Metrics Grid**
   - Four cards, each 140x90px, arranged in two columns.
   - Each card uses an icon bubble, metric label, and large value (Project 150, Client 75, etc.).
4. **Activity Graph**
   - Soft grid background (dotted lines) + vertical bars. Colors from palette above; highlight the current day with `#1F5226`.
5. **Timeline / Planner**
   - Date pills across the top (rounded capsules, active day filled with `#1F5226` + white text).
   - Rows separated by 16px vertical spacing, each row a color-coded pill with avatar, name, and times.

### Component Details

- **Date Pill**: 36px height, 18px radius, background `#F2F4E8`, active `#1F5226`.
- **Schedule Row**: 60px height. Left column shows time label (uppercase, 12px). Right container is a 100% width pill with pastel background and faint diagonal pattern (SVG or background image).
- **Badge Avatars**: 42px circle with subtle inner shadow; names in 16px bold, times 13px regular.

---

## 4. Interaction Guidelines

1. **Motion** – transitions should be subtle (200–250ms) with ease-out curves. Cards slide and fade; no abrupt color flashes.
2. **Feedback** – button presses darken the background by 5% and lift + translate Y(-2px). Use ripple on Android with matching pastel color.
3. **Empty States** – reuse the illustration style from the hero image (line art + minimal color). Keep messaging short and encouraging.
4. **Loading** – skeleton states use lighter shades of `#F2F4E8`. Avoid spinners when possible; prefer shimmering placeholders.

---

## 5. Screen-Specific Notes

### Home / Today
- Replace dark shell with pastel gradient background.
- Show greeting, quick action button, summary metrics (Arcs, Goals, Activities), and an activity chart mirroring the reference’s stacked bars.
- Activity list should transform into colored schedule pills sorted by day/time.

### Arcs List
- Each arc card becomes a rounded surface with icon “chips” for status and north star text. Use the metrics grid style (icon bubble + text).
- Arc names and narratives displayed here should follow the identity-first Arc model defined in `docs/arc-aspiration-ftue.md` (domain of becoming, motivational style, signature trait, growth edge, everyday proud moment), so even a single onboarding Arc feels like a specific, personal storyline.
- The “New Arc” button should follow the primary CTA card style—full-width, icon circle on the left, large label on the right.

### Arc Detail
- Top hero: gradient card with arc name, status chip, quick stats.
- Recommended goals list uses the schedule row pill style (avatar replaced by force icon).
- Timeline of goals adopts the calendar view: each goal inside a pastel chip with force bars at the bottom.

### Modals/Wizards
- Full-height sheets with rounded top corners (32px).
- Use dot or bar progress indicator above the title.
- Inputs have pale backgrounds `#F2F4E8` and strong focus outlines `#567658`.

---

## 6. Assets & Future Work

- **Illustration**: create vector hero + optional empty-state illustrations that match the reference line weight and palette.
- **Pattern backgrounds**: design 3–4 subtle diagonal patterns for schedule blocks (SVG or PNG @2x).
- **Icon set**: unify icons using a rounded 24px grid, single stroke width (~1.75px).
- **Font loading**: add chosen rounded font via Expo’s `useFonts` hook and ensure fallback to system fonts.

---

Use this document whenever introducing new components or adjusting existing screens to ensure LOMO retains a cohesive, pastel-forward, gentle productivity aesthetic. Update the guide if the palette or typography choices evolve. 

