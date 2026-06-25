# Learning Release: Activity Areas

## Concept To Build

Add Settings-managed **Areas** so Activities can optionally belong to a life area, and scheduling can use each Area's usual availability window.

## Capability Delta

Today, the user cannot:

- manage the life areas Kwilt should understand;
- assign an Activity to a durable life area;
- configure scheduling availability by life area;
- see scheduling suggestions respect Work vs Family vs Personal windows except through rough inference.

After this release, the user can:

- review intelligent default Areas in Settings;
- add, rename, reorder, hide/archive Areas;
- set when each Area usually fits;
- assign an Area to an Activity;
- get schedule proposals that prefer the Activity's Area windows.

Still intentionally not supported:

- multi-area Activities;
- Area grouping in the Activities list;
- Area-specific sharing/privacy;
- background auto-scheduling;
- AI-created Areas without confirmation.

## User Experience

Settings contains an **Areas** entry. The first open shows intelligent defaults:

- Work
- Personal
- Family
- Home
- Health

Users can edit the list. Each Area can have a simple scheduling section: "Usually fits" with days and time windows. Defaults should work without setup.

Activity detail shows Area as optional metadata. Quick Add and AI can suggest an Area when confidence is high, but capture never requires it.

Scheduling surfaces use Area to choose candidate windows. If the Activity is in `Family`, Kwilt prefers Family windows. If no Area exists, Kwilt falls back to existing personal/work inference and general availability.

## Existing Product Relationship

This enhances:

- Activity metadata;
- Settings scheduling preferences;
- Activity detail scheduling;
- daily plan proposal logic;
- Smart order / Recommended context evidence later.

This replaces or generalizes:

- rough `work` / `personal` scheduling-domain inference as the durable user-facing model.

This leaves unchanged:

- Goals and Arcs as meaning/identity anchors;
- tags as flexible lightweight labels;
- context as when/where an Activity is doable;
- grouping as a scan lens.

## Buildable Slice

Must be real:

- Area data shape in user preferences with stable ids.
- Intelligent default Area seeding.
- Settings Areas management screen or section.
- Optional Activity `areaId`.
- Activity detail Area selection.
- Scheduling setup can configure Area availability.
- Scheduling proposal chooses windows from Activity Area when present.
- Tests for scheduling Area selection and fallback behavior.

Can be thin or temporary:

- AI/Quick Add Area suggestion can be omitted or rule-based.
- Area scheduling defaults can map to existing work/personal windows initially.
- Recommended can read Area later unless the implementation cost is low.

Intentionally excluded:

- Area grouping.
- multi-select Areas.
- AI-managed Area creation.
- widgets, notifications, or context chips.

## Release Channel

`Local build` first, then `TestFlight build`.

Rationale: Areas affect scheduling behavior and user trust. Andrew-only local testing can validate data shape and basic scheduling fit before exposing the concept to beta users.

## Brand-Goodwill Guardrails

- Area copy stays practical: "Area", "No area", "Usually fits".
- Unassigned Activities remain normal.
- Scheduling explains Area-based placement in plain language.
- Users can override any proposed slot.
- Hiding or archiving an Area should not delete Activities.

## Reversibility

Areas should be additive and optional. If the learning release misses, the app can hide Area UI while leaving `areaId` inert. Scheduling can fall back to existing inference. Archived Areas remain resolvable for old Activities.

## Permanent Product Threshold

Make Areas a permanent product concept if users understand them quickly, assign them without feeling burdened, and scheduling proposals visibly improve with fewer wrong-window corrections.
