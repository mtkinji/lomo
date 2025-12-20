# MCP Strategic Proposal for Kwilt (Connectors, Catalogs, and a Stable UX)

### TL;DR

Model Context Protocol (MCP) suggests a strategy where **integrations are not “features”** with bespoke UI, but **capabilities provided by connectors** (often implemented as MCP servers/tools). Kwilt can keep a stable app shell + canvas while expanding into many real-world use cases by:

- Standardizing a **small set of in-app artifact formats** (already: `ActivityType`)
- Introducing a **single outbound surface**: **“Send to…”**
- Powering “Send to…” with a **connector registry** that can include **MCP-backed connectors**
- Treating external ecosystems as **pluggable catalogs**, not one-off integrations

---

### Why MCP matters strategically (not just technically)

MCP’s core shift is **decoupling**:

- **UX** (what users see): stable, minimal, predictable
- **Capabilities** (what the app can do): expandable, composable, discoverable

This aligns with Kwilt’s product constraints:

- Don’t add clutter.
- Keep core Arc/Goal/Activity experience intact.
- Still enable “real world” workflows: shopping, scheduling, exporting, routing, filing, etc.

---

### A product-level mental model: Connectors

Define a connector as:

- **Eligibility**: when it should appear (ActivityType, platform, permissions, content signal)
- **Payload**: what data it needs (text export, structured list, event spec)
- **Transport**: how it executes (open URL, native SDK, share sheet, file export, MCP tool call)
- **Outcome**: optional feedback to Kwilt (opened, sent, purchased, error details)

Kwilt should view MCP as a way to implement connectors cleanly and safely.

---

### UX strategy: one stable surface, many expanding capabilities

#### 1) Preserve the “artifact format” switch

Kwilt already has `ActivityType` as a small deterministic set. This should remain the primary *user-facing* control for what kind of artifact they’re creating:

- Task
- Checklist
- Shopping list
- Recipe / instructions
- Plan

#### 2) Add a single generic outbound surface

Use **“Send to…”** (drawer) as the long-tail integration surface:

- Amazon, Home Depot, Instacart, etc.
- Copy / Share (universal fallbacks)
- Future: email, Slack, Notion, Drive, GitHub issues, etc.

Keep a few **purpose-built fast paths** when they’re high-confidence and high-frequency:

- Calendar (native permissions, ICS fallback) can remain a dedicated tile even if it’s “just another connector.”

This yields progressive disclosure: integrations appear **when relevant**, not everywhere.

---

### What we should build (phase plan)

#### Phase 1 — Connector Registry (internal)

Build a small in-app registry that returns “viable connectors” for a given context:

- `getEligibleConnectors(activity, platform, permissions) -> Connector[]`
- Each connector provides label/icon + handler

Initial connectors can be in-app (URLs + copy/share) for speed and reliability.

#### Phase 2 — Structured payloads (“resources”)

Introduce a tiny set of internal resource schemas (even before MCP):

- `ShoppingListResource` (items, quantities, notes, substitutions)
- `InstructionResource` (steps + extracted ingredients/tools)
- `EventResource` (title, start/end, recurrence)

This improves export quality and reduces brittleness (vs freeform text).

#### Phase 3 — MCP-backed connectors

As we add deeper integrations, implement them as MCP servers/tools that:

- Accept structured resources as input
- Return structured results (handoff URL, created object id, error diagnostics)

This keeps the app thin and avoids embedding many third-party SDKs.

---

### “Catalog / universe” question: can we hook into a broader MCP ecosystem?

There isn’t a single universally-adopted, built-in “App Store” for MCP (yet), but there **are de-facto catalogs** you can use for discovery and inspiration:

- **MCP Catalog (community directory)**: `https://mcpcatalog.com/`
- **Protocol org + SDKs**: `https://github.com/modelcontextprotocol`

How to treat this strategically:

- **Don’t rely on live third-party discovery for core UX.**
  - The UX should be stable even if catalogs change.
- **Do use catalogs as a feeder for your connector roadmap.**
  - Identify high-demand connectors (calendar/email/docs/tasks/commerce).
- **Treat “hooking in” as a trust + packaging problem.**
  - A catalog link is not the same as a safe connector.

---

### Key strategic decisions to make explicitly

#### 1) Connector trust model

Decide which connectors are:

- **First-party** (shipped by Kwilt)
- **Verified partners** (reviewed/signed)
- **Unverified community** (dev-only or heavily sandboxed)

This is crucial because MCP increases the surface area for:

- Prompt injection
- Tool poisoning
- Exfiltration (sending more context than intended)

#### 2) User consent model

For any connector that leaves the device/app boundary:

- Always show a **payload preview** (what will be sent)
- Prefer **least privilege** (send only list items, not the full goal narrative)
- Make “Copy” the universal escape hatch

#### 3) Monetization alignment (optional, later)

MCP/connectors create natural tiers without UI changes:

- Free: Copy/Share + basic web search links
- Pro: deep connectors (native handoffs), automation, partner integrations

---

### What success looks like

- Kwilt keeps its core identity (Arc/Goal/Activity, calm UI).
- Users can complete real-world workflows via one surface (“Send to…”).
- New integrations ship without adding new screens.
- Connector reliability and safety improve over time via structured payloads + schemas.

---

### Related docs

- `docs/send-to-connector-strategy.md`


