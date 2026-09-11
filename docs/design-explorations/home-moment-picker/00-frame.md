# Frame: Home moment picker

Maya, an aspirational family organizer, opens Home wanting to share something from her day without inventing a post from a blank field. Hero: `jtbd-move-the-few-things-that-matter`; active job: `jtbd-invite-the-right-people-in`. David's existing sharing job flow, step 6 (share signals without raw details; score 4 for Goal check-ins), supplies the privacy boundary but does not yet cover finding recent cross-capability moments.

Constraint posture: Fit the system. Root Expo / React Native iOS and Android app in /Users/andrewwatanabe/Kwilt. Reuse BottomDrawer, BottomDrawerHeader, semantic footer, and drawer scroll coordination. Local constitution and drawer guidance outrank the older Home full-screen-editor brief. RNR is anatomy reference only; retain mature local primitives and StyleSheet/tokens. No external exemplar or new dependency.

Data: current-account hydrated Goals have status and updatedAt, but no dedicated completion timestamp; never display updatedAt as a completion date. Explore relationships carry userId and visit timestamps. Cook records are owner-only via RLS; recipe titles can be resolved through the existing recipe repository. Home accepts place/goal attachments; meals will prepare ordinary text, not a new unsupported attachment.

Challenge: help Maya recognize a real moment worth sharing, then review exactly what her chosen people will see.
