---
id: brief-todo-attachment-previews
title: To-Do attachment previews
status: accepted
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-carry-intentions-into-action]
related_briefs: []
owner: andrew
last_updated: 2026-08-05
---

# To-Do Attachment Previews

## Context

Activity Detail stores photos, videos, audio, and documents, but presents them as filename-only rows. Its attachment drawer previews photos only, which makes supporting material feel stored rather than ready to use.

## Target audience

Burned-out productivity power users need useful context without another file-management surface or a denser To-Dos list.

## Representative persona

Marcus has already chosen the To-Do in front of him. He needs the attached reference to reduce activation energy at the moment of doing.

## Aspirational design challenge

How might we help Marcus recognize and open the supporting material for the To-Do in front of him, while preserving a calm list and avoiding a file-management system?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — attached context matters only insofar as it helps the chosen work move.

## Job flow step

In `job-flow-marcus-move-the-few-things-that-matter`, "Decide what to do next" is scored 3. To-Dos hold concrete work, but attached context currently requires avoidable recognition and navigation effort.

## JTBD framing

When Marcus attaches reference material to a To-Do, he wants to recognize and open the right thing immediately so he can carry the intention into action without decoding filenames or maintaining another system.

## Design

### UI contract

Job: When supporting material is attached to the current To-Do, the user needs to recognize and open it, so they can continue the work with less activation energy.

Primary action: Tap an attachment card to preview it.

Must show: media or type preview, filename, useful type/size/duration metadata, upload or failure state, and explicit Goal-sharing state when applicable.

Reveal later: added date, full failure detail, sharing controls, export/share, and deletion.

Must not add: main-list indicators, a gallery mode, primary attachment selection, sorting, folders, a separate attachment screen, or eager downloads.

Reuse map:

- Attachment section and field-fill tokens → existing Activity Detail system.
- Add choices and secondary actions → existing `DropdownMenu` and attachment drawer.
- Signed attachment access → existing attachment services.
- Photo rendering → React Native `Image`.

Behavior sources:

- Whole-card preview and independent actions → approved ShadCN-inspired direction.
- Main list remains attachment-free → existing Activity list metadata contract.
- Sharing remains explicit → current Activity attachment model.

Unresolved decisions: native document/video thumbnail generation remains a later enhancement unless it can be added without eager download or schema work.

Required states: empty, uploaded photo, uploaded video, uploaded audio, uploaded document, uploading, failed, shared with Goal members, missing metadata, long filename, and preview-load failure.

Proof path: To-Dos → open a To-Do with mixed attachments → inspect smallest supported iPhone viewport → open and return from each preview → inspect loading, failure, and sharing states.

### Interaction

- With no attachments, retain the current full-width Add attachments affordance.
- With attachments, place a compact add action in the Attachments heading and remove the redundant full-width add row.
- Render one vertical card layout for every attachment kind.
- Make the whole card the preview target with at least a 44-point touch target.
- Keep delete and export/share in the details surface rather than the resting card.
- Load photo thumbnails lazily. Do not download other files until preview is requested.

## Success signal

The user can identify and open the intended attachment directly from Activity Detail, and the section still reads as supporting context rather than a separate file manager.

## Spec refinement

- The first implementation may use the existing details drawer as a platform fallback where a native preview bridge is unavailable.
- No data migration is required.
- Native-device proof is required before calling non-photo preview complete.
- UI tests cover presentation branches; native preview fallback is covered at the service boundary.

## Open questions

- After real photo-set use, is a photo-only snapping rail justified as an optional layout?
