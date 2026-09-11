# Native composition review

Andrew's feedback: “Is not as good as the mocks from earlier.”

## What I see

Compared the accepted [invitation flow](options/invitation-flow.png), earlier [draft review](options/draft-review.png), and the [native review screenshot](../../../artifacts/home-moment-sharing/review.png). The implementation carried over the controls but lost the composition. Passing functionality checks did not establish visual parity.

| Earlier mock                                                    | Native implementation                                                                  | Correction                                                                                                            |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| The selected moment is the dominant visual object.              | The selected moment is a small metadata row above a large empty field.                 | Restore an appropriately prominent visual preview; use a deliberate compact fallback when no image exists.            |
| Writing and Photo / Recent moment form one coherent surface.    | Tools float outside the field; photos appear farther down with another management row. | Use the canonical Input footer slot for composition tools. Keep Post outside the field.                               |
| Added imagery belongs to the visible post composition.          | Added photos look like file attachments beneath the form.                              | Show selected photos before the caption, with quiet editing affordances adjacent to the photos.                       |
| Suggested titles lead and source metadata recedes.              | Title weight is weak; row spacing and centered View more dilute the list.              | Restore compact thumbnail rows, stronger titles, subtle separators and a subordinate left-aligned View more.          |
| The writing invitation is a small, approachable starting point. | The initial empty textarea occupies too much space.                                    | Start with a compact entry surface and expand for actual writing; preserve native text scaling and keyboard behavior. |
| Spacing groups related content and separates major steps.       | Nearly every element gets another row and similar large gaps.                          | Compose three groups: audience, moment/media, writing/tools. Keep draft maintenance subordinate.                      |

## The anchor in play

`jtbd-invite-the-right-people-in`: help someone recognize a moment, make it personal, and knowingly share it. The moment and the person's words should carry more visual weight than the controls used to manage the draft.

## References worth knowing

- Accepted Kwilt invitation-flow mock: authoritative composition for this work. Preserve its visual hierarchy; the subsequent discussion supersedes its in-field Post placement.
- Instagram feed screenshots supplied in this conversation: imagery provides a clear first landing point and actions sit together. Translate grouping and hierarchy, without copying public engagement mechanics.
- Pinterest treatment described and accepted in this conversation: recognizable visual objects with subordinate metadata. Translate object identity and caption placement, without turning the composer into a masonry feed.
- Kwilt's current `Input` and `InputFrame`: shared material, typography, keyboard integration and a footer slot already support a composed writing surface. Using canonical components does not require separating every control into its own form row.

## Three sketches

Axis: whether an existing moment, new imagery, or writing leads the composition.

1. **Restore the accepted flow — recommended.** Three compact suggestions and a clear writing invitation; review gives the selected moment a prominent preview, then a grouped caption/tools surface. Audience stays quiet above; Post stays in the header. Best for recognizing and sharing something already in Kwilt. Missing artwork needs a designed fallback rather than invented imagery.
2. **Photo-led composition.** Selected user photos lead review, source context sits beneath, and writing/tools remain together. Best for a new photo story or adding photos to an existing moment; weaker when there is no photo. The supplied Instagram example grounds the media/action hierarchy.
3. **Note-led composition.** Writing takes the first position with optional compact source context and photo tools. Best for a short text-only update; weaker as the default for browsing suggested moments. The accepted invitation and canonical Input slots ground this variation.

## Recommendation

Restore option 1 as the default, using 2 and 3 only when the actual draft content calls for them. This is a correction to the approved implementation, not a request for Andrew to choose a new direction.

The bet: lost visual hierarchy and fragmented grouping are the dominant reasons the native version feels worse. Compare the same moment and draft state at the same viewport before calling the correction finished.

Retain the later accepted distinction: **Done ends editing; Post publishes the draft.** Post remains outside the Input; Photo and Recent moment can use its canonical footer slot.

Do not confuse source artwork with exported content. Any preview must make clear which imagery will actually be posted. Actual user-selected photos may lead the post preview; source artwork cannot silently become published media merely to match an illustrative mock.

## Acceptance boundary

- Compare picker, selected moment, manual note, and added-photo states against the accepted mock—not only against source tests.
- Verify sparse suggestions, missing artwork, long titles, long captions, keyboard-visible tools, and draft recovery.
- Preserve source selection, audience, publication and export behavior from the previous slice.
- Native correction observed on iPhone 17 Pro Simulator: the picker shows three compact visual rows, a quiet `View more`, and a separate story/photo invitation. The selected-moment state resets to the top, centers the standard drawer title between Back and Post, gives available source artwork the primary visual position, keeps audience review above it, and groups Photo / Choose another / Done inside the canonical composer surface.
- Evidence: [`picker-native.png`](../../../artifacts/home-moment-sharing/picker-native.png) and [`review-native.png`](../../../artifacts/home-moment-sharing/review-native.png). Missing-artwork review was also observed with the compact honest fallback. No post was published.
