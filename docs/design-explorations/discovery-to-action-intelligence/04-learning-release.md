# Learning Release: Shared Agent Workbench Extraction

## Concept To Build

Extract Giraffed's mature agent composer, timeline, run controls, common cards, and recovery states into one configurable web workbench that Giraffed renders unchanged and Kwilt can later host inside its native Chat destination.

## Capability Delta

Today, the user cannot:

- benefit from the same mature Chat interaction in Kwilt without rebuilding or copying substantial Giraffed behavior;
- receive future composer, timeline, proposal, evidence, feedback, stop, steer, and recovery improvements in both products by default;
- prove whether Giraffed's web workbench can feel first-class inside Kwilt on an iPhone.

After this release, the user can:

- continue using Giraffed with no intentional visual or behavioral change after the workbench is extracted;
- open the same configurable workbench in a hidden Kwilt development surface;
- enter Chat globally or with a Kwilt capability object attached as explicit context;
- use the shared composer and timeline while Kwilt retains ownership of capability actions and native navigation.

Still intentionally not supported:

- public Kwilt availability;
- Money or Games mutations;
- one shared Giraffed/Kwilt user database, auth system, or application service;
- arbitrary product-defined layouts;
- a React Native rewrite before the hosted experience is tested on a real device.

## User Experience

Giraffed looks and behaves exactly as it does before extraction. In a hidden Kwilt development destination, Andrew opens unified Chat and sees the extracted workbench configured for Kwilt: authoring modes and expert model controls are absent, the composer accepts Kwilt context, and workbench actions return through a typed host bridge.

The learning release is successful only when the hosting boundary is invisible during ordinary use: keyboard, focus, scrolling, safe areas, accessibility, voice, attachments, stop, steer, and perceived performance must feel appropriate on a real iPhone.

## Existing Product Relationship

This replaces neither Giraffed's authoring shell nor Kwilt's native capability surfaces. It extracts the existing agent region from Giraffed, preserves Giraffed as its compatibility host, and replaces Kwilt's current minimal Chat input only inside a hidden development path.

## Buildable Slice

Must be real:

- product-neutral workbench contracts and command protocol;
- extracted Giraffed composer, timeline, run projection, common cards, feedback, and recovery states;
- a Giraffed compatibility adapter with no intentional visible change;
- characterization and conformance tests covering the mature interaction;
- an authenticated or credential-free standalone host that never owns product data or mutations;
- a versioned native bridge contract;
- a hidden Kwilt host proving initialization, snapshot updates, commands, native attachment/voice requests, and exact-return navigation;
- real-device proof on an iPhone.

Can be thin or temporary:

- the first Kwilt adapter may use only Goals, To-dos, and Chapters fixtures or read-only data;
- the standalone host may remain development-gated;
- Giraffed may remain the source repository for the shared web build until the second host proves the packaging boundary;
- analytics may be limited to bridge diagnostics and manual observation.

Intentionally excluded:

- broad Giraffed component cleanup unrelated to the agent surface;
- rewriting the full workbench component at once;
- moving Giraffed and Kwilt into one monorepo;
- shared physical persistence or credentials;
- public rollout, billing, entitlements, or cross-product account linking;
- native capability mutation beyond one reversible Activity proposal proof.

## Release Channel

Start with a Giraffed local/desktop compatibility build. After visual and behavioral parity, use a hidden Kwilt local development build on a real iPhone. Advance to TestFlight only after the hosted surface meets the native interaction bar and the bridge security review passes.

## Brand-Goodwill Guardrails

- Treat every unreviewed Giraffed visual or behavioral difference as a regression.
- Keep the Kwilt host hidden until it feels intentionally native.
- Never expose authoring vocabulary, model controls, or Giraffed identity in Kwilt configuration.
- Never inject long-lived Kwilt or Giraffed credentials into workbench JavaScript.
- Route all durable mutations through the owning product adapter and authoritative receipt path.
- Preserve native capability screens as the place to inspect and correct durable work.

## Reversibility

Giraffed continues rendering through a compatibility adapter and can return to the pre-extraction import boundary without migrating user data. Kwilt's host is feature-gated and can be removed without changing capability data. The bridge and workbench contracts are additive and versioned; no cross-product database dependency is introduced.

## Permanent Product Threshold

Keep the shared workbench when Giraffed remains behaviorally equivalent, the hosted Kwilt surface passes real-iPhone interaction and security checks, and one workbench improvement can reach both products without source copying or product-release coupling. If the hosted surface repeatedly fails the mobile bar, retain the shared protocol/runtime and selectively replace only the failing presentation layer in React Native.
