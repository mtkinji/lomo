# Evaluate Learning: To-Do Attachment Previews

## Learning questions

- Can the intended attachment be recognized without opening each item?
- Does whole-card preview feel like the expected mobile action?
- Are photo thumbnails worth their loading cost?
- Does the richer section remain subordinate to the To-Do itself?

## Evidence plan

Use ordinary To-Dos containing a long photo name, video, audio recording, PDF, uploading item, and failed item. Observe recognition, opening, return, sharing-state comprehension, and vertical density on the smallest supported iPhone viewport.

## Disconfirming signals

- Users still open multiple attachments to find the right one.
- The section dominates the To-Do detail page.
- Thumbnails produce distracting loading or repeated network work.
- Users mistake the card overflow action for preview.

## Decision rule

Keep the universal cards if mixed attachments are recognizable and direct preview works reliably. Simplify metadata if density is the problem. Consider a separate photo-only rail only if repeated photo-set usage demonstrates the need.

## Instrumentation

No new behavioral analytics are required for the Andrew-only learning release. Use direct observation and failure logs; do not track attachment contents.
