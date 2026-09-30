# Origin: focused drawer background

Reference ID: `REF-2026-09-28-origin-drawer-background`\
Received: 2026-09-28. Capture date and app version: unknown.\
Source: Andrew-supplied Origin screenshot, apparently iOS; attribution supplied by Andrew.\
Level: component + overlay composition. Tags: drawer, scrim, blur, background, focus, interstitial.\
Status: captured preference; candidate Kwilt adaptation, not a canonical app-wide rule.\
Refresh: before implementation; static evidence remains useful but is not a claim about current Origin.

![Origin drawer with darkened and visually obscured background](source.jpg)

## What Andrew liked

“Not only do they have the scrim over the background when their drawer is open, but they also obscure the contents.”

The selected quality is background suppression while the foreground drawer remains legible. This does not approve Origin's colors, typography, illustration, copy, CTA placement, or a replacement for Kwilt onboarding.

## Observed versus unknown

Observed: a lower sheet is sharp, with a close affordance and one prominent action; the exposed background is darkened and appears blurred, making its content difficult to read. The hierarchy separates the active task from its background context.

Unknown: actual rendering technique, blur radius, opacity, animation, gesture behavior, focus management, screen-reader behavior, accessibility fallback, and treatment on other platforms. A still image does not prove these. Blur is a plausible implementation technique, not verified Origin source behavior or a privacy guarantee.

## Preserve / Translate / Reject

| Preserve | Translate into Kwilt | Reject |
| --- | --- | --- |
| Sharp active drawer, background detail suppressed as well as dimmed | Shared overlay material owned by drawer mechanics and semantic theme tokens | Feature-local blur wrappers or screenshot-derived numeric values |
| One clear foreground decision | Existing drawer anatomy and appropriate footer/dock for the job | Copying Origin's illustration, palette, headline, or budget flow |
| Background remains spatial context | A scoped focused-modal treatment with a deliberate fallback | Blurring every guide, coachmark, or background needed for comparison |

## Candidate: focused modal background

Job: concentrate on a bounded modal decision when background text competes with it.

Proposed anatomy: underlying app content → shared background-obscuring treatment → scrim → sharp drawer and its existing controls. Preserve interaction/dismissal semantics and ensure the modal host actually samples the intended underlying surface.

Do: own the material centrally; keep sheet content sharp; test entry, drag, close, keyboard and layered overlays; support Reduce Transparency/Reduce Motion and platform limitations with an intentional fallback; retain accessible focus isolation independently of the visual effect.

Don't: blur the entire modal subtree; use blur as protection for sensitive data; introduce duplicate scrims; apply this to a nonblocking guide or a task that depends on reading the underlying screen; infer exact intensity from this image.

Candidate scope: focused blocking drawers only. Exact variants, default behavior and material values remain unresolved. Existing canonical drawer behavior remains binding until the adaptation is accepted for its specific scope.

Implementation owner to evaluate: `src/ui/BottomDrawer.tsx`, shared scrim/material tokens, and modal/portal host. `BottomGuide` needs explicit exclusion review. Legacy `KwiltBottomSheet` requires a separate migration decision.

Proof to collect: real Kwilt route before/after; short and tall drawers; detailed text behind the drawer; open/drag/dismiss; keyboard; nested overlay; smallest supported viewport; enlarged text; accessibility focus and transparency/motion preferences; iOS and Android where supported. Record unsupported or untested combinations explicitly.

Initial source audit: [drawer audit](../../../audits/2026-09-28-drawer-background.md).

Sequence context added 2026-09-28: Andrew identifies this as an earlier screen in the [post-launch budget experience](../post-launch-budget-2026-09/source.md). Its “Your budget is ready” invitation and “Unwrap it” CTA are now also cataloged as flow evidence. Exact transition to the supplied review/summary states remains unverified; this does not broaden the accepted background-treatment scope.

Research asset only. Do not import this screenshot into production or publish it as Kwilt artwork.
