# Learning Release: Home Screen Intent Launcher

## Concept To Build

A medium iOS Home Screen widget gives the user four configurable shortcuts into Kwilt and one stable full-width Ask Kwilt action.

## Capability Delta

Today, the user cannot:

- Keep four personally important Kwilt destinations together in one configurable widget.
- Replace the separate Chat and Focus launcher footprint with one coherent front door.

After this release, the user can:

- Add the Kwilt Launcher with useful defaults and edit all four upper shortcuts through Edit Widget.
- Open the exact selected capability without intermediate Kwilt navigation.
- Open a fresh unsent Chat composer through the fixed Ask Kwilt action.
- See and reopen an active Focus session from a configured Focus shortcut.

Still intentionally not supported:

- Arbitrary URLs or custom labels.
- Automatic shortcut ranking or synchronization through the Kwilt account.
- Private content previews, badges, recommendations, or capability mutations inside the widget.
- Lock Screen, Action Button, Android, large, or extra-large variants.

## User Experience

The user adds one medium `Kwilt Launcher` from the iOS widget gallery. The upper row contains four large icon-only shortcuts using Kwilt's neutral secondary-control roles. The initial defaults are Focus, Calendar, To-dos, and Meals. A full-width pine Ask Kwilt capsule anchors the bottom as the singular brand moment.

Long-pressing and choosing Edit Widget exposes four independent shortcut pickers backed by a bounded list of stable Kwilt destinations. A selection appears in the same position immediately after WidgetKit reloads the timeline. Duplicate selections are honored visibly in V1 rather than silently normalized; the user owns all four positions.

Tapping an upper shortcut deep-links to the owning Kwilt surface. Focus opens the existing deliberate duration-and-audio setup. If Focus is active and Focus occupies a slot, that slot shows the remaining or paused duration and opens the existing controls. Ask Kwilt opens the existing fresh, threadless composer and never begins recording automatically.

## Existing Product Relationship

The release enhances the existing generated `KwiltWidgetsBundle`, deep-link configuration, Focus App Group state, and Unified Chat fresh-entry contract. It does not create a new in-app launcher screen, capability model, Focus runtime, Chat backend, or navigation hierarchy.

The existing small Chat and Focus widgets remain available during the learning release as optional alternatives. Kwilt's widget setup copy promotes the new configurable launcher so dogfooding can determine whether it earns replacement status before the older configurations are removed.

## Buildable Slice

Must be real:

- A tracked launcher Swift-template generator and generated WidgetKit registration.
- `AppIntentConfiguration` with four persisted scalar shortcut selections and useful defaults.
- A bounded destination registry owning identifier, label, SF Symbol, and deep link.
- A four-shortcut upper rail with distinctive symbols, configuration-time labels, and accessibility descriptions.
- A fixed full-width Ask Kwilt lower action.
- Active and paused Focus projection when Focus is configured.
- Focus lifecycle reloads for both the standalone Focus widget and launcher.
- Focused route parsing and generator contract coverage.
- Updated in-app widget setup language.
- Generated Swift typecheck/build and Home Screen add/edit/tap proof.

Can be thin or temporary:

- Configuration remains in Apple's Edit Widget UI.
- The destination list is a static native registry.
- Dogfood observations can be recorded manually without new analytics events.
- The old small Chat and Focus widgets can remain registered during evaluation.

Intentionally excluded:

- Backend persistence or cross-device synchronization of shortcut choices.
- In-app widget preview/configuration UI.
- Custom destination creation, object-specific destinations, or recent-item suggestions.
- New capability-specific data in the App Group snapshot.
- Automatic discovery prompts beyond correcting the existing Widgets settings copy.

## Release Channel

Start with a **local widget-enabled Simulator build** for source, native compilation, gallery, configuration, layout, and routing proof. Advance to an **Andrew-only TestFlight build** only after the actual Home Screen widget can be added, edited, and tapped successfully and all four symbols remain recognizable in supported appearances.

Use the existing `production-widgets` lane for signed distribution. EAS upload, App Store Connect processing, tester availability, installation, widget discovery, and physical-device behavior remain separate evidence gates.

## Brand-Goodwill Guardrails

- The widget must look intentional at its real medium size in standard, dark, and tinted Home Screen appearances.
- Each shortcut keeps a confident circular tap target, a distinctive symbol, a labeled configuration choice, and complete accessibility text.
- Soft pine is not a Kwilt control role and must not appear; pine is reserved for the branded Ask Kwilt capsule.
- No private Kwilt content appears outside the app.
- Every tap has a stable, literal destination; no inferred navigation.
- Ask Kwilt remains user-initiated and recording remains explicit.
- Focus status is calm continuity, never pressure or performance scoring.

## Reversibility

The launcher is one additive widget kind generated into the existing extension. It can be removed from the bundle without data migration. Shortcut configuration belongs to WidgetKit and contains only bounded string identifiers. Deep links remain useful independently, and the existing small widgets stay available during the learning release.

## Permanent Product Threshold

Promote the launcher as Kwilt's default Home Screen widget when it remains installed through ordinary use, all four configuration positions work reliably, the chosen destinations reduce manual navigation, Ask Kwilt still feels primary, active Focus remains readable, and no privacy, lifecycle, or signed-build regression appears.
