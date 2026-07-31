# Limited animation language

## Observation

Leafling already carries an appealing Japanese-animation influence in its silhouette, eyes, expressions, and key poses. The motion weakens when every drawing receives similar screen time or when a micro-action recruits the entire body. The original blink used eight full-body variants over 1.28 seconds, including visible head, ear, torso, and tail changes. It read as a slow acting gesture rather than a blink.

## Direction

Lean into anime-style limited animation: display-rate rendering with intentionally held drawings, fast connective poses, readable accents, and selective anatomy.

The motion vocabulary is:

- **Hold:** preserve a readable pose and let the audience take it in.
- **Key:** establish a new intention or direction.
- **In-between:** connect keys quickly without demanding attention.
- **Accent:** hold the emotional or physical apex long enough to read.
- **Recovery:** add follow-through and return without a mechanical reversal.

More drawings are useful at a change in direction, expression, weight, or contact. They are not useful when they merely divide time evenly.

## Blink proof

The blink keeps one approved full-body pose as its base. Five brief eye-channel drawings close and reopen the lids in 184 ms. The open pose holds before and after the action, producing a 2.764-second natural loop. The head, ears, leaf crown, face position, mouth, torso, paws, haunch, tail, silhouette, and ground anchor remain fixed.

The portable frame snapshot now carries optional masked anatomy layers. Canvas 2D composites the eye source through two registered eye masks; a future Skia, web, or desktop renderer can consume the same layer instructions.

## Asset strategy

- Use fewer drawings for micro-actions such as blink, breathing, ear flick, and eye tracking, with only the necessary anatomy channel moving.
- Use 8–12 drawings for expressive one-shots such as greet, pounce, care, discovery, and evolution.
- Commission new in-betweens first for locomotion, where the current procedural travel still lacks a true gait.
- Preserve strong keys and adjust timing before requesting new artwork.
- Reject generated replacements that simplify Leafling, drift the face, or repaint already-approved motion families.

## Bet

If each drawing has a clear job, Leafling will feel more alive with a modest art budget because motion direction—not raw frame count—will carry the character.
