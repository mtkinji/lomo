# Frame: To-Do Attachment Previews

## What the user said

> ShadCN has a pattern for attachment previews that I like. I want better attachment previews in To-Dos. Figure out what patterns make sense for mobile and my context.

## Restated in user voice

When I attach reference material to a To-Do, I want to recognize and open the right thing immediately, so I can act without decoding filenames or leaving the task.

## Target audience

`audience-burned-out-productivity-power-users` — people who need useful context without another system to maintain.

## Representative persona

Marcus has already chosen a To-Do and is ready to act. An attachment is supporting material, not another object to organize.

## Hero anchor

`jtbd-move-the-few-things-that-matter`

## Job flow step

Marcus's "Decide what to do next" step is currently scored 3. To-Dos hold concrete work, but attached context is difficult to recognize and requires an extra details stop before it becomes useful.

## Active anchors

- `jtbd-carry-intentions-into-action` — the attachment should reduce activation energy at the moment of doing.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Activity Detail owns attachments.
- The Activity model already records kind, filename, MIME type, size, duration, upload state, failure text, and Goal-member sharing.
- The To-Dos list intentionally omits attachment metadata.
- Current attachment rows show only an icon and filename; the details drawer previews photos only.

Constraints to preserve:

- To-Dos remain the plan in motion.
- The main list remains a calm decision surface.
- Sharing remains explicit and attachment-owned.
- Capture remains unblocked.

## Aspirational design challenge

How might we help Marcus recognize and open the supporting material for the To-Do in front of him, while preserving a calm list and avoiding a file-management system?

## Out of scope

Attachment galleries, primary-attachment selection, sorting, folders, document capture, and attachment indicators in the main To-Dos list.
