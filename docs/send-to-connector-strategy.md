# Send-to Connector Strategy (Activity-driven integrations)

### Summary

Kwilt should treat outbound integrations as **connectors** that export or route an Activity’s details into other systems (shopping carts, retailers, calendars, notes, etc.). The UX should remain uncluttered by:

- Using **`ActivityType`** as the deterministic “artifact format” switch (Task / Checklist / Shopping list / Recipe / Plan).
- Unlocking integrations via a **generic “Send to…”** entry point that appears only when relevant.
- Keeping a small number of **purpose-built fast paths** (e.g. Calendar) when confidence + utility are extremely high.

This preserves the fundamental UX layers:

- **App shell**: stable navigation + page canvas margin.
- **App canvas**: Activity details remain the center; integrations are progressive disclosure, not a new top-level surface.

---

### Core principle: Type drives format; capabilities drive actions

An Activity has a canonical `type`:

- It should remain **small, deterministic, and predictable**.
- It shapes what the user is “making” (the artifact) and what actions are appropriate.

We treat “acquisition intent” (shopping, procurement, ordering) as a **capability** inferred from the Activity’s type (and optionally tags/keywords/AI later), not as a new object category that adds UI clutter.

---

### Capability matrix (recommended starting point)

Start conservative so we don’t spam actions on every Activity:

- **`shopping_list`**
  - **Default capabilities**: acquisition + export
  - **UX**: show “Send to…” by default
- **`instructions`** (recipe / how-to)
  - **Default capabilities**: guidance + (often) acquisition + export
  - **UX**: show “Send to…” by default
- **`plan`**
  - **Default capabilities**: guidance + export
  - **Acquisition**: conditional (e.g. tags/keywords like “materials”, “order”, “parts”)
- **`task` / `checklist`**
  - **Default capabilities**: execution + export (optional)
  - **Acquisition**: conditional (high-signal only)

Rule of thumb: **If we’re unsure, don’t show “Send to…”**—users can always switch the Activity type to `shopping_list` when they want shopping behavior.

---

### UX: a single generic integration point (progressive disclosure)

#### Where “Send to…” lives

- **Activity detail canvas** is the primary home.
- It should appear as a **single action tile** alongside other key actions (Focus mode, Add to calendar, etc.).
- It opens a **BottomDrawer** listing viable connector options.

This keeps integration affordances discoverable while avoiding new navigation or persistent UI chrome.

#### Purpose-built connectors vs generic connectors

Some connectors have enough universal value to warrant a dedicated fast path:

- **Calendar**: “Add to calendar” is a connector with extra UI and permissions (native calendar access, ICS export fallback).

Everything else can live in the generic drawer:

- Amazon / Home Depot / Instacart
- Copy / Share
- “Open in…” targets as we add more connectors

We can later unify Calendar into the same drawer if desired, but the default posture is:

- **Fast path**: for the few, high-confidence, high-frequency actions
- **Drawer**: for the long tail of integrations

---

### Connector model (how we should think about integrations)

A connector is responsible for:

- **Eligibility**: when it should appear (Activity type, platform, permissions, content signals).
- **Serialization**: how to turn an Activity into an export payload (text, list items, structured fields).
- **Transport**: how to deliver (open URL, share sheet, clipboard, file export, native SDK).
- **Outcome**: optional status tracking (opened cart, purchased, sent, etc.)—not required for MVP.

Connectors should degrade gracefully:

- If a native deep link fails, fall back to a web URL.
- If share fails or is dismissed, do not error loudly.
- Always offer a **Copy** fallback for portable data.

---

### Data export: the minimum viable payload

For MVP, export can be plain text derived from:

- Activity title
- Notes
- Steps (for lists/recipes)

This supports:

- Copy/paste into any system
- Share to any app that accepts text
- Query generation for retailer search URLs

Later, we can add structured exports (e.g. item quantities, categories, substitutions).

---

### Examples (why this generalizes well)

- **Occasion gifting**
  - Activity: `shopping_list` (“Gift ideas for niece, budget $40”)
  - Connector: Amazon search (affiliate later)
- **Groceries**
  - Activity: `shopping_list` with quantities and substitutions
  - Connector: Instacart (deep link or web fallback), Copy list
- **Sprinkler repair**
  - Activity: `instructions` or `plan`
  - Connector: Home Depot search for parts/tools, Copy checklist

Same UI affordance, different connectors, minimal clutter.

---

### Non-goals (for MVP)

- Building an in-app marketplace or product browser
- Storing SKU-level carts inside Kwilt
- Adding new primary navigation around shopping/integrations

---

### Recommended next steps

- **Make connectors data-driven** via a small registry (eligibility + action handler).
- **Add optional connector settings** (enable/disable specific options in the drawer).
- **Improve acquisition inference** (tags/keywords and AI) for `task`/`plan` without increasing noise.
- **Affiliate enablement** (Amazon): start with search links + tag; only move to Product Advertising API when justified.


