# Screen Time exception authorization — creative direction

## Status

- **Creative review:** reviewed
- **User approval:** pending
- **Native runtime proof:** unverified; the Mac was locked during this pass, so the live Simulator could not be inspected

## Visible artifacts

- [Editable SVG source](mockups/guide-states.svg)
- [Rendered guide-state board](mockups/guide-states-rendered.png)

The board shows four 390 × 844 point compositions:

1. a concrete Focus prerequisite with a rule-derived primary action;
2. a time-of-day boundary with no invented prerequisite;
3. a child/unauthorized state with no management action; and
4. overlapping rules at larger text with bounded scrolling and no misleading action.

## Creative brief

Marcus or a caregiver encounters this guide immediately after Screen Time interrupts an attempted app open. The first job of the composition is to explain the active boundary without alarm or shame; the second is to offer only actions that are truthful for that rule. The format remains Kwilt’s floating `BottomGuide`, not a new screen or full-height modal.

### User-approved

- Remove **Open for 20 minutes** from the bottom guide.
- Offer authorized caregivers a path to manage the underlying rules.
- Do not assume **Do this first** applies to time-of-day or usage-based rules.

### Observed product authority

- `BottomGuide` owns a floating white card, soft elevation, device-sheet radius, optional light scrim, close behavior, bounded content, and safe-area-aware footer.
- `BottomDrawerSemanticFooter` places a true primary action after secondary actions and stacks at larger text.
- Kwilt’s owned tokens use Sumi ink, Pine for quiet navigational emphasis, neutral card borders, 12–24 point spacing, and pill-shaped primary controls.
- The current guide already uses a clear title, restrained secondary copy, bordered rule summaries, and the current route as background context.

### Proposed for this surface

- Treat **Manage rules** as a Pine text link, never as the visually dominant response to a limit.
- Let ordinary states hug their rendered content rather than occupying a fixed percentage of the screen.
- Escalate to a tall, internally scrolling guide only for large text or overlapping-rule density.
- Derive the primary label from a real resolution such as **Return to Focus**; omit the primary action when the rule only describes a boundary.

## Direction statement

**A quiet boundary organized around the reason, not the escape:** one plain-language state, one contained rule explanation, and only the action the rule can honestly resolve; adult management stays visible but visually recessive.

The intentional restraint is as important as the styling: no warning color, shield illustration, timer theatrics, lock icon, progress pressure, or dedicated “override” visual language.

## Reference-to-design decisions

| Source | Observed mechanism | Translation here | What does not transfer |
| --- | --- | --- | --- |
| `src/ui/BottomGuide.tsx` | Floating inset surface preserves the page underneath and distinguishes compact from drawer-like layouts | Keep the guide bottom-anchored with equal side/bottom clearance, white card material, light scrim, and explicit close | Do not use a fixed compact snap height when content is materially shorter or larger text requires expansion |
| `src/ui/layout/BottomDrawerSemanticFooter.tsx` | One true primary action carries visual weight; responsive layouts stack at large text | Use a dark pill only for a genuine prerequisite resolution | Management is not promoted merely because it is the only link available |
| Kwilt tokens | Warm neutral ink and Pine links create hierarchy without urgency | Sumi for explanation and primary control; Pine for **Manage rules**; neutral borders for rule summaries | No feature-local palette, warning red, or ornamental gradient |
| [Converged product direction](03-converge.md) | The guide explains and redirects; rule management is canonical recovery | The rule state dominates every composition and no mockup contains temporary opening | The guide does not become a miniature rule editor |

No external exemplar was needed; the accepted Kwilt guide and settings grammar supplied the relevant authority.

## Visual grammar

### Hierarchy

1. The title states the current condition, not a generic error.
2. One supporting sentence explains why the boundary holds.
3. Each active rule receives a bordered summary with its name and concrete release condition.
4. A primary action appears only when it can resolve the active rule set.
5. **Manage rules ›** remains an adult-only text link.

For overlapping rules, the guide explicitly says when completing one prerequisite will not restore access. That prevents the primary action from making a false promise; the stress-state specimen therefore shows no **Return to Focus** button.

### Typography and spacing

- Use existing `titleSm`, `bodySm`, and `label` roles at ordinary text sizes.
- Use accessible system scaling rather than shrinking labels to preserve the compact silhouette.
- Keep 24-point outer content gutters, 12–16 point group spacing, and 16-point rule-card radius.
- Preserve at least 44 points of touch target around close, links, and buttons even when the visible link treatment is smaller.

### Color and material

- White guide and rule surfaces use existing `card` and `cardBorder` tokens.
- Primary prerequisite action uses Sumi `primary` with `primaryForeground` text.
- Management uses Pine `accent` as a navigation relationship, not a filled action.
- The light scrim separates the intervention without making it look destructive or punitive.

### Motion

Reuse the current bottom-guide entrance and dismissal. No new countdown, pulse, shake, or attention animation is proposed. Reduced-motion behavior remains whatever the shared drawer already provides and requires runtime confirmation.

## Component and token handoff

- `BottomGuide`: preserve floating layout, light scrim, close header, and content-owned height capped by a maximum snap point.
- `BottomDrawerScrollView`: use only when content can exceed available height; normal states should not create empty scroll space.
- `BottomDrawerHeader`: keep the close affordance aligned to the title’s first line.
- `BottomDrawerSemanticFooter`: retain for a real prerequisite primary action. A management-only state needs an optional link treatment rather than a synthetic primary button.
- `Button variant="primary"`: prerequisite action only.
- `Button variant="link"` or equivalent owned link control: **Manage rules ›**, with a 44-point accessible target.
- `Text variant="label"`: rule identity; `Text tone="secondary"`: reason and release condition.
- Existing tokens only: `colors.card`, `colors.cardBorder`, `colors.primary`, `colors.primaryForeground`, `colors.accent`, `colors.textPrimary`, `colors.textSecondary`, `spacing`, and `radii`.

## State coverage

- Personal actionable prerequisite.
- Personal time-of-day boundary.
- Family child/unauthorized boundary.
- Authorized management link.
- Two overlapping rules where one prerequisite cannot clear the full block.
- Large text and internally scrolling rule inventory.

Not yet rendered: authentication failure, no Screen Time capability, unresolved handoff restriction, Android, landscape, and the destination management screen. These are implementation or runtime states, not evidence supplied by this static board.

## Critique and revisions

### First render

- The three ordinary guides retained too much unused vertical space, reproducing the original “doesn’t know how tall to be” problem.
- Dark primary-button labels were dropped by one SVG-to-PNG renderer.
- A management-only state promoted **Manage rules** to a filled primary button, visually suggesting that changing the rule was the recommended response.

### Revisions

- Tightened each ordinary guide to its actual content while preserving a tall capped state for large text and overlap.
- Made primary-label color explicit in the SVG source so the capture remains legible across renderers.
- Demoted **Manage rules** to a consistent Pine text link in every adult-authorized state.
- Removed internal specimen annotations from the product surfaces so the mockups show only plausible interface content.

### Second inspection

The content hierarchy now survives across all four states: the explanation and rule condition lead, the actionable Focus state has one clear primary response, time-based and child states do not fabricate work, and the large-text overlap state communicates that one completed prerequisite would still leave another rule active. The normal guides visibly hug their content; the stress state earns its height.

## Remaining limitations

- The artifacts prove static composition only. They do not prove measured React Native layout, keyboard/safe-area behavior, dynamic-type reflow, scrolling, focus order, VoiceOver/TalkBack, or physical-device shield handoff.
- The mock background screens are contextual placeholders, not proposed changes to Home or family surfaces.
- Exact rule wording must come from real normalized conditions and handoff details; implementation must not infer times or outcomes absent from the source data.
- Fresh authentication before a weakening rule mutation remains a behavioral requirement but is not visually redesigned here because the prompt is platform-owned and the destination rule editor already exists.
