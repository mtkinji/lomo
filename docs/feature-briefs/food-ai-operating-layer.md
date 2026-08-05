---
id: brief-food-ai-operating-layer
title: Food AI Operating Layer
status: accepted
audiences: [audience-aspirational-family-organizers, audience-ai-native-life-operators]
personas: [Maya, Nina]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-get-help-without-retelling-my-life, jtbd-understand-why-ai-suggested-this, jtbd-stay-in-control-of-ai-actions, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-household-food-loop, brief-activity-context-action-platform, brief-unified-chat]
owner: andrew
last_updated: 2026-08-05
---

# Food AI Operating Layer

## Context

Household Food will fail its convenience promise if preserving a recipe still
requires transcription, planning begins from a blank screen, grocery review
requires decoding ingredient math, or Chat can only discuss work that the
native product must repeat. AI must reduce effort across the entire food loop
without becoming a second source of state or silently assuming family, public,
retailer, financial, or rights authority.

## Target audience

The primary audience is `audience-aspirational-family-organizers`. Maya should
experience a lighter household job, not an AI console. The secondary audience,
`audience-ai-native-life-operators`, establishes the operating-system quality
bar: Nina expects natural-language control, evidence, review, correction,
durable results, and exact return to the owning work surface.

## Representative persona

Maya has photographed family cards, saved recipe links, changing household
preferences, and a next shopping horizon. She wants to say or show Kwilt what
she has and receive useful structured progress. Nina wants the same operations
available through Chat and future channels without losing the protections and
state of the native Food surfaces.

## Aspirational design challenge

How might Kwilt move Maya from a photo, URL, spoken memory, or simple request to
a trustworthy meal and grocery outcome with dramatically less work, while
giving Nina inspectable evidence, scoped authority, correction, receipts, and
the ability to operate the same capability from any supported Kwilt channel?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` remains the hero because AI is valuable
only when it improves real household follow-through. The AI-specific anchors
define how that help remains trustworthy.

## Job flow step

`job-flow-maya-move-family-life-forward` scores **Know the next doable action**
and **Schedule or hand off** at 2/5. This brief improves both seams: AI turns
messy evidence into a reviewable next action, and capability operations carry
approved intent into durable Recipes, a plan, groceries, and a truthful
external handoff.

## JTBD framing

When feeding my household requires repeated typing, remembering, arithmetic,
and coordination, let me show or tell Kwilt what I mean and have it prepare the
work. Show me what it understood, what evidence it used, and what will change;
let me correct or approve it; then give me a durable result I can trust.

## Design

### One operation contract, multiple entry points

Every meaningful Recipe, Meal Planning, Grocery, Savings, Receipt, and
Publication operation is registered once in Kwilt's canonical capability
manifest. The declaration names its owner, schema, effect, reversibility,
confirmation, evidence, provider eligibility, receipt, and return behavior.

Native Food screens, Unified Chat, Activity action cards, Phone, and future
Gmail ingestion use the same operation. A channel is supported only when it can
collect required evidence, render the required review, invoke the authoritative
mutation, show the actual receipt, and return to the exact owning context.

### Import as base product quality

The first lovable release supports photographs or scans, structured URLs,
pasted text, and dictation. AI creates a temporary `RecipeImportDraft` with
source references, field-level confidence, warnings, and extracted structure.
The user reviews uncertain fields, can edit everything, confirms provenance and
credit, and approves one idempotent mutation that creates the private Recipe
and its first immutable version.

The model may transcribe and structure. It may not fill gaps with plausible
ingredients, quantities, times, authors, or rights. Original ingredient lines
and the evidence behind extracted fields remain available during review.

### AI across the food jobs

| Job | AI contribution | Authoritative boundary |
| --- | --- | --- |
| Preserve a Recipe | OCR, URL/text extraction, voice structuring, ambiguity detection, edits, scaling preview | User approves uncertain import; Recipes owns versions, provenance, and receipts |
| Find and reuse Recipes | semantic search, private-context ranking, substitution or adaptation proposal | No silent source or dietary claims; edits create a reviewed version |
| Plan meals | propose candidates, servings, horizon placement, and rationale from authorized context | Organizer edits and finalizes; invitations require explicit confirmation |
| Gather family input | prepare candidate summaries and summarize permitted aggregate responses | Meal Planning owns eligibility and response privacy; AI does not expose private reasoning |
| Compile groceries | explain provenance, flag ambiguous units and possible duplicates | Deterministic compiler owns quantities and merges; user confirms corrections |
| Match products | prepare likely mappings and explain tradeoffs | User confirms consequential mappings; retailer remains availability truth |
| Improve economics | rank evidence-backed options and explain why | Deterministic math owns qualifications and totals; no invented eligibility, activation, or savings |
| Prepare fulfillment | create or refresh a reviewed handoff | Provider owns account, substitutions, slot, payment, checkout, order, and fulfillment |
| Reconcile a receipt | OCR line items and prepare matches | User or provider evidence confirms reconciliation and realized outcome |
| Share or publish | propose description, tags, credits, alt text, and public preview | User chooses identity, exact version, rights attestation, media, scopes, and publish action |

### Authority policy

- Reads and low-risk reversible work explicitly requested may complete directly.
- Imports remain reviewed because transcription carries uncertainty.
- Invitations, live collaboration, public distribution, product confirmation,
  authorized coupon activation, and retailer cart mutation require explicit
  confirmation and a durable receipt.
- Checkout, payment, retailer login, delivery slot, and unsupported coupon
  application remain native handoffs or unavailable.
- AI can never attest content or media rights, infer a public identity, publish
  silently, claim allergy safety, invent an offer, or upgrade evidence to
  **applied**, **ordered**, or **saved**.

### Public-ready Recipe architecture

The private `Recipe` has immutable `RecipeVersion` content, provenance, credits,
lineage, explicit access grants, collections, and media-rights records. Public
distribution uses a separate `RecipePublication` pointing to one exact reviewed
version and an opted-in `PublicCreatorProfile`. Private edits do not silently
republish. Cross-Kwilt apps consume the publication projection, never the
private aggregate.

Public publishing is later scope but the model is release-one architecture.
Reporting, moderation, rights complaints, withdrawal, and child-publication
policy are launch gates for any discoverable catalog.

### Evaluation and observability

Import evaluations combine private household dogfood outside Git with
synthetic, public-domain, or releasable fixtures in source control. They cover
handwriting, glare, rotation, multiple pages, columns, stains, marginal notes,
fractions, abbreviations, incomplete evidence, and prompt injection.

Record model and prompt version, evidence references, confidence, warnings,
corrections, proposal, confirmation, receipt, latency, and cost without logging
private recipe text or images into analytics. Measure transcription accuracy,
invented-content rate, correction burden, time to clean save, provenance
retention, plan acceptance, and grocery correction burden. Unsupported facts,
authority escalation, and false economic claims have zero tolerance.

## Success signal

A real household repeatedly moves from photo or URL to a trusted clean Recipe,
accepts or easily corrects AI-assisted plan proposals, compiles groceries with
less work than manual reconstruction, and can explain what Kwilt did and why.
The same registered operations behave consistently in native Food and Unified
Chat, with proposals and receipts at the correct authority boundaries.

## Open questions

- Which on-device preprocessing and server model combination meets the required
  handwriting, latency, privacy, and cost envelope?
- What source-artifact retention default preserves family meaning without
  retaining unnecessary private evidence?
- Which reversible edits can safely complete directly after an explicit Chat
  request without making confirmation feel ceremonial?
- What correction evidence may improve future extraction privately without
  creating an opaque personal model?
- What moderation, identity, licensing, and child-safety policy is required
  before discoverable public publication?

## References

- [`docs/design-explorations/food-ai-operating-layer/`](../design-explorations/food-ai-operating-layer/)
- [`docs/design-explorations/meals-recipes-groceries/object-models.md`](../design-explorations/meals-recipes-groceries/object-models.md)
- [`docs/superpowers/plans/2026-08-05-household-food-program.md`](../superpowers/plans/2026-08-05-household-food-program.md)
