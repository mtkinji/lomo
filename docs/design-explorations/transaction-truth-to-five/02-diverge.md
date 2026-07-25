# Diverge: Transaction Truth To Five

## A. More aggressive personal classifier

Low maintenance when right, but cannot truthfully represent a mixed purchase and risks false precision.

## B. Exception queue only

Preserves uncertainty and is system-light, but still requires choosing one knowingly incomplete category.

## C. Contextual split truth

Keep the common one-category flow; let transaction detail allocate a posted outflow across existing categories. Persist atomically, keep one row, and feed each meter only its share.

## D. Receipt-level automatic allocation

Potentially useful later, but adds capture, privacy, parsing, and model-evaluation complexity before explicit split need is proven.

Direction: advance C, preserve B as fallback, and defer A/D.
