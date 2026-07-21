# Kwilt Brand Family Architecture

> **Superseded for public product hierarchy (2026-07-21).** The accepted
> `docs/architecture/unified-kwilt-capability-platform.md` direction is one public app named
> **Kwilt**, with Money, Games, Goals, and other domains represented as capabilities rather
> than separate public apps or a `Kwilt Goals` parent layer. The visual-role, token, and
> capability-distinction guidance below remains useful only where it does not conflict with
> that decision. Separate-app naming, App Store, app-icon, and launch-lockup recommendations
> are historical and must not drive new implementation.

Kwilt is becoming a family of apps, not one green app. The parent brand should give every product a shared sense of trust, warmth, and calm intelligence, while each app gets enough visual independence to be recognizable on a home screen, in App Store listings, and inside cross-app workflows.

North-star phrase:

> Calm intelligence for a life in motion.

This document defines the brand-family rules for Kwilt as a suite and for its product lines. It is intentionally upstream of exact token changes: use it to evaluate color palettes, app icons, launch screens, paywalls, full-bleed focus states, and shared design-system work before changing `packages/kwilt-tokens`.

## Reference Models

Kwilt should borrow the architecture, not the aesthetics, of large app families:

- **Microsoft 365 / Fluent**: shared system grammar, distinct app colors, recognizable product silhouettes.
- **Google Workspace / Material**: common brand behavior and construction rules, but enough product distinction that users can find the right app quickly.
- **Adobe Creative Cloud / Spectrum**: a professional suite shell with many specialized tools; product identity comes from a repeatable icon container plus app-specific color and mnemonic behavior.

The lesson for Kwilt:

> The parent brand is the construction system, not a single hue.

## Brand Roles

Kwilt's family identity is built from four roles. Every app should use all four, but with different emphasis.

| Role | Meaning | Visual Expression |
| --- | --- | --- |
| **Weave** | The parent signature. Life has threads; Kwilt helps hold them together. | Woven mark, rounded-square icon language, interlaced motifs, continuity across apps. |
| **Place** | The app feels safe enough for intimate life data. | Deep field colors, warm ivory, calm spacing, non-shouty contrast. |
| **Signal** | The app has noticed something useful. | Small accents, progress edges, meters, focus rings, active glints. Never body copy. |
| **Meaning** | The app helps the user discern what matters. | Soft gold, force colors, status emphasis, reflective moments, selected importance. |

## Shared Family DNA

These rules apply to every Kwilt-family app.

1. **Use the woven mark or woven construction language.**  
   The mark can vary by app, but the family must feel woven, interlaced, or threaded.

2. **Use a rounded-square app icon container.**  
   The app icon should feel like part of one suite even when the field color changes.

3. **Keep warm ivory as the high-contrast companion.**  
   On saturated full-bleed fields, prefer `parchment` / warm ivory over pure white.

4. **Use charcoal/sumi for readable daily UI.**  
   Do not use bright accent colors for core text.

5. **Treat color as meaning, not decoration.**  
   A product color identifies an app. A signal color indicates aliveness or attention. A status color communicates state. Do not let those roles collapse into one color.

6. **Stay calm by default.**  
   No neon text, red shame states, urgency styling, streak guilt, dashboard noise, or gamified celebration as the base posture.

7. **Make AI inspectable, not magical.**  
   AI visual treatment should communicate transparency, permission, preview, and reversibility. Avoid wizard/sparkle tropes as the primary visual language.

8. **Keep recognition strong at small sizes.**  
   A user should be able to distinguish Kwilt product lines without reading the app name.

## App Identity Rules

Every Kwilt app gets:

1. A **primary field color**: the app's dominant full-bleed/icon color.
2. A **meaning accent**: the app's restrained emphasis color.
3. A **signal accent**: tiny aliveness/progress/attention detail.
4. A **woven variation**: how the parent mark flexes for this app.
5. A **job metaphor**: the emotional job the app owns.

Public app names should not simply repeat the internal job metaphor. A metaphor can guide the product, but the public name has to survive ordinary speech.

Naming filter:

> A person should be able to say "I checked Kwilt ___" or "We use Kwilt ___ for that" without sounding like they are pitching software.

Recommended template:

```yaml
app: Kwilt Money
job_metaphor: stewardship / runway / household resource flow
primary_field: deep indigo or green-black
meaning_accent: soft gold
signal_accent: restrained mint or lime, used only for tiny live-state details
woven_variation: weave plus meter/runway/progress thread
avoid:
  - bank app blue
  - spreadsheet green
  - finance-bro neon
  - luxury gold borders everywhere
```

## Suite And Product Lines

### Kwilt Parent Brand

Kwilt can be the parent brand without also being the name of a default "main app." This keeps the suite architecture open: the first products can each have their own public name, app icon, and color identity without making one app feel like the canonical center.

Use **Kwilt** alone for:

- The company / suite name.
- Shared account, subscription, and entitlement language.
- Parent-brand lockups.
- Cross-app explanations.
- The shared design system and woven identity.

Do not use **Core** as a public app name. It is an internal architecture label, not a user-facing promise.

### Goals App

The goals product line is the goals, activities, focus, and reflection app. Its leading public-name recommendation is **Kwilt Goals**. "Goals" is not the full philosophy, but it is the clearest public doorway into the job: make progress on what matters.

| Role | Recommendation |
| --- | --- |
| Job metaphor | Becoming / threads of a life / focused motion |
| Primary field | Deep pine / living ink |
| Meaning accent | Soft gold for focus, progress, selected importance |
| Signal accent | Very small lime/mint only when the system feels alive or current |
| Woven variation | Whole woven mark; stable, centered, complete |
| Best full-bleed use | Focus timer, onboarding identity moments, reflective chapter states |

The goals app should not be modernized by abandoning pine everywhere. The current full-bleed focus screen works because it is quiet, embodied, and legible. Modernization should come from precision: warmer ivory, better control material, deeper field choices when appropriate, and meaning accents that do not compete with the timer.

Possible public-name directions:

- **Kwilt Goals**: leading recommendation; clear, socially natural, and recognizable even if the product includes Activities, Focus, Arcs, and Chapters.
- **Kwilt Progress**: broader than Goals, but more generic.
- **Kwilt Coach**: expansive and helpful, but risks sounding anthropomorphic or therapy-like.
- **Kwilt Life**: broad and natural, but generic and less recognizable.
- **Kwilt Focus**: strong for the timer/work-session lane, too narrow for becoming/reflection.
- **Kwilt Plan**: practical and sayable, but may drift toward productivity software.
- **Kwilt**: still possible for this product, but only if the suite strategy intentionally lets the first product own the parent name.

Recommended App Store naming pattern:

```text
Kwilt Goals
Goals, to-dos, and follow-through
```

Focus timer rule:

> If adding a progress indicator, use soft gold as a progress arc/bar anchored from the bottom-left. It should feel like time becoming visible, not a gamified countdown.

### Money App

The money app's internal metaphor is stewardship, household runway, and money-awareness. Its public name does not have to be **Kwilt Budget**. "Budget" is clear, but it may overconstrain the product toward category ledgers instead of live resource visibility and family decisions.

| Role | Recommendation |
| --- | --- |
| Job metaphor | Stewardship / runway / resource flow |
| Primary field | Deep indigo, green-black, or a hybrid ink field |
| Meaning accent | Soft gold for runway, safe-to-spend, credit/resource attention |
| Signal accent | Restrained mint/lime only for live sync or active meter details |
| Woven variation | Woven mark with a meter, ledger line, runway arc, or resource thread |
| Best full-bleed use | Launch screen, subscription/paywall moments, budget runway summaries |

The money app should not look like "Kwilt with money labels." It needs a distinct field color and app-icon read. It also should not look like a bank, spreadsheet, or market-trading tool. Its emotional promise is calm financial truth for ordinary family decisions.

Preferred public-name direction:

- **Kwilt Money**: plain, easy to say, broad enough for budgets, runway, subscriptions, family spending, and safe-to-spend decisions.
- **Kwilt Home**: warmer and family-centered, but may hide the money job unless the product expands beyond finances.
- **Kwilt Wallet**: familiar, but risks implying payments, cards, or banking.
- **Kwilt Budget**: clear for search and positioning, but narrower and more spreadsheet-coded.
- **Kwilt Ledger**, **Kwilt Runway**, and **Kwilt Steward**: useful internal metaphors, but less natural in casual speech.

Use App Store subtitles, screenshots, and onboarding copy to carry explicit search language. The product name can be more natural than the metadata:

```text
Kwilt Money
Family budgeting and spending clarity
```

### Future Kwilt Apps

Future apps should join the family by inheriting the weave and construction rules, not by inheriting pine.

Potential pattern:

| App Type | Possible Field | Meaning Accent | Job Metaphor |
| --- | --- | --- | --- |
| Kwilt Goals | Deep pine / living ink | Soft gold | Becoming |
| Kwilt Money | Deep indigo or green-black | Soft gold | Stewardship |
| Kwilt Family | Warm clay or deep blue | Rose/gold | Coordination |
| Kwilt Chapters | Indigo/charcoal | Lavender/gold | Reflection |

Do not assign these as final colors until there is an app-level JTBD and icon test.

## Naming Rules

Kwilt app names should optimize for real human conversation before internal elegance.

Strong names are:

- **Easy to say after "Kwilt."** One common word is usually better than a clever metaphor.
- **Comfortable in social settings.** A user can say "I use Kwilt Money for groceries" or "I put that in Kwilt" without embarrassment.
- **Broad enough for the job.** Do not name the app after one feature if the job is larger.
- **Plain outside, poetic inside.** Use clear public names; let metaphors live in product language, icon construction, and UI moments.
- **Distinct at the app-family level.** The name, icon field, and app-store description should make each app recognizable.

Weak names often:

- Sound like internal architecture: **Core**, **Platform**, **OS**, **Command Center**.
- Require explanation before they make sense: **Runway**, **Steward**, **Thread**, **Loom**.
- Overpromise the category: **Wallet** if there are no payments; **Budget** if the job is broader than budgeting.
- Feel awkward in a sentence: "I checked Steward" or "put that in Runway."

Speech tests:

```text
I use Kwilt Goals for goals and to-dos.
I checked Kwilt Money before we ordered takeout.
We put the school stuff in Kwilt Home.
I started a focus timer in Kwilt Goals.
```

If the sentence feels like a normal person could say it to a spouse, friend, or coworker, the name is probably close.

## Icon System

The icon system should behave more like a family of woven tiles than a set of unrelated logos.

Required:

- Rounded-square tile.
- Warm-ivory mark or high-contrast mark.
- One dominant app field color.
- One app-specific woven variation or internal thread gesture.
- Legible at iOS home-screen size.

Allowed:

- App-specific inner thread color.
- Small meaning-accent line or glint.
- Different mark density by app, if the parent weave is still recognizable.

Avoid:

- Electric/neon logo marks as the default.
- App initials as the primary system unless the suite becomes too large for mark variations.
- Gold text or gold body copy.
- Same field color across all apps.
- Tiny detail that only works in large marketing mockups.

## Splash And Launch Lockups

Each app's launch screen should use a brand lockup that names the parent brand and the product line.

Required pattern:

```text
[woven mark]
Kwilt
Goals / Money / Home / etc.
```

Rules:

- The top wordmark is always **Kwilt**.
- The product name appears as a second line, sized as an app name rather than a subtitle.
- The native splash can stay a plain field-color bridge, but the in-app launch screen must show the full product lockup.
- Use the product line's primary field color as the launch background.
- Use warm ivory/parchment for the mark, wordmark, and product name.
- Do not use signal green, gold, or Force colors for launch-screen copy.

Current launch lockups:

| Product | Launch lockup | Field direction |
| --- | --- | --- |
| Kwilt Goals | `Kwilt` + `Goals` | Deep pine / living ink |
| Kwilt Money | `Kwilt` + `Money` | Deep indigo or green-black |

## Color Role Rules

### Deep Field Colors

Deep fields carry identity and trust. They can be pine, indigo, green-black, charcoal, or another app-specific dark color.

Use for:

- App icons.
- Launch screens.
- Full-bleed focus/reflection states.
- Premium subscription cards.
- High-emotion app moments.

Avoid using deep fields for:

- Dense everyday lists unless the app is intentionally in focus mode.
- Large blocks of body copy.
- Surfaces where controls become hard to distinguish.

### Soft Gold

Gold means meaning, resource attention, focus, and importance. It is not luxury trim.

Use for:

- Progress arcs and meter edges.
- Selected importance.
- Resource/runway cues in Budget.
- Focus timer progress.
- Subtle app-icon thread detail.

Do not use for:

- Body copy.
- Large filled buttons by default.
- Decorative borders around every card.
- Pricing hype.

### Electric / Lime / Mint Signal

Bright green is signal, not brand ink.

Use for:

- Tiny live-state dots.
- Sync/currentness indicators.
- Meter glints.
- Focus rings.
- "The system noticed this" moments.

Do not use for:

- Logo marks by default.
- Body copy.
- Large active pills.
- Primary CTAs.
- Anything users must read for comprehension.

### Force And Meaning Colors

Kwilt's Forces can use a richer color system when the user needs to compare kinds of growth. These colors should be quiet, readable, and meaning-bearing, not rainbow decoration.

Rules:

- Use Force colors as chips, bars, dots, and small comparative signals.
- Do not reduce Forces to a single composite score.
- Do not let Force colors compete with app identity colors on primary navigation.

## UI Rules Across Apps

1. **Daily UI stays readable and mostly neutral.**  
   Warm white, sumi text, muted borders, and app-color accents should do most of the work.

2. **Full-bleed color is reserved for state change.**  
   Launch, focus, reflection, paywall/subscription, and major app-mode transitions can use full fields. Lists and admin surfaces should usually stay light.

3. **Progress must feel honest.**  
   Progress visuals should represent real time, real resource use, real activity, or user-approved interpretation. Avoid fake momentum.

4. **Subscription surfaces inherit app identity, not parent identity blindly.**  
   Kwilt Pro can share entitlement language, but Kwilt Money's subscription/admin screens may use the money app's field and meaning accent.

5. **Navigation selected states should be calm.**  
   Use ink, pine, indigo, or app field colors. Avoid neon selected states.

6. **Controls over full-bleed fields need real material.**  
   Tactile, legible buttons beat washed-out translucency. Use warm-ivory icons and app-field-aware fills.

## Token Strategy

Do not rename or replace existing tokens until the app-family roles are agreed.

Near-term token direction:

- Keep existing `pine*`, `indigo*`, `turmeric*`, `parchment`, and `sumi*` as the source palette.
- Add semantic family tokens only when a rule has a real product surface:
  - `brandFamily.parentMark`
  - `appGoals.field`
  - `appGoals.meaningAccent`
  - `appMoney.field`
  - `appMoney.meaningAccent`
  - `signal.live`
  - `signal.focus`
- Keep semantic tokens separate from raw palette tokens.

Acceptance bar for any token change:

- It improves at least one real screen, not just swatches.
- It preserves contrast for text and icons.
- It can distinguish Kwilt Goals and Kwilt Money at app-icon size.
- It does not make Goals feel less trustworthy or Money feel like a generic finance product.

## Evaluation Checklist

Use this when reviewing a new palette, icon, or app-family surface.

- Can a user tell which Kwilt app this is without reading the label?
- Does it still feel like part of the Kwilt family?
- Does the field color match the app's job metaphor?
- Is gold used as meaning/resource/focus rather than luxury?
- Is bright green used only as signal?
- Is core copy readable without relying on accent colors?
- Does it avoid dashboards, shame, urgency, and fake AI magic?
- Does it work on both a full-bleed emotional surface and a quiet daily list?
- Does it feel smart, helpful, trustworthy, modern, calm, human, capable, discerning, private, and alive?

## Open Questions

- Should Kwilt Money use deep indigo as its primary field, or green-black with gold?
- Should Kwilt Goals' app icon remain white-on-pine, or introduce one soft-gold thread?
- Should the parent Kwilt suite ever have its own app/container icon?
- Should app-family colors map to product jobs, user modes, or business lines?
- How much woven-mark variation is enough before recognition breaks?
