# Authored Locomotion System

## The illusion break

Direct touch made Leafling feel alive, but travel exposed the boundary of the earlier engine. The world position changed while an idle or attention drawing played, with a sine-wave bob added in code. The character moved, but it slid rather than chose, pushed, landed, and carried weight.

## Chosen direction

Baby, young, and guardian Leafling now each own two eight-drawing cycles:

- **Walk:** alternating diagonal footfalls, weight settle, passing paws, and a loop-ready reach.
- **Run:** compression, push, airborne reach, contact, and recovery, repeated across the opposing lead.

The drawings preserve the same screen-right travel direction and ground vocabulary across forms while allowing age-specific personality. Baby bounds; young moves lightly and curiously; guardian uses a longer, more powerful stride.

## Anime timing language

Eight drawings do not mean eight equal intervals. Walk contacts hold longer than the passing drawings. Run pushes and contacts read as accents while flight drawings pass quickly. This produces deliberate limited animation: enough drawings to describe force and overlap, but not so many that the creature loses the crisp authored rhythm the user liked.

## Engine contract

- World behavior selects semantic `walk` and `run` clips rather than falling back to `idle`.
- Far direct-touch targets request run; the engine changes to walk as Leafling approaches.
- Rain shelter, sun seeking, and Focus arrival use walk.
- The world engine owns horizontal displacement and camera follow.
- The clip owns vertical weight transfer; code no longer adds a generic travel bob.
- Run frames explicitly declare planted or airborne contact so the terrain cue responds to the drawing.
- A 160 × 128 cell and `(80, 120)` ground anchor provide horizontal silhouette room while preserving the established 128-pixel vertical construction system.
- Every source strip is normalized to canonical screen-right travel during assembly; the renderer may then mirror the complete frame for screen-left without clip-specific exceptions.

## Stated bet

We are betting that authored contact matters more to believability than adding environmental decoration or increasing frame rate everywhere. If users notice a creature running toward their touch rather than a sprite being translated, this is the right foundation for richer pounces, jumps, terrain responses, and future renderers.

## Acceptance evidence

- Each life stage has a visibly distinct but identity-preserving walk and run.
- Paws alternate during walks; runs contain readable compression, flight, and landing.
- No travel state applies the old whole-body sine bob.
- The pet remains registered to the terrain in planted frames and visibly leaves it only in authored airborne frames.
- Camera follow, zoom, weather destinations, and form switching continue to use the same portable world state.
