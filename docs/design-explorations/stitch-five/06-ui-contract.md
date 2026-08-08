# UI Contract: Stitch Five

Job: When two to four people have a short opening, they need to begin a familiar dice game and understand the current choice, so they can enjoy making something together.

Authority chain: User decision → Stitch Five feature brief → iOS/Android/accessibility → Kwilt UI constitution and Games theme → local Tumble and GamePlayerSetup precedents → RNR generic control anatomy.

Three-second read: Whose stitch it is, the five dice, and whether to roll, pin, or choose a patch.

Primary action: Roll the available dice. After the third roll, choose one patch.

Primary information: Active player, rolls remaining, dice and pin state, unused categories, live score previews.

Secondary information: Current total, Seam Bonus progress, other-player totals, category explanations.

Reveal later: Full rules and the completed result/share surface.

Scan order: Active stitch → dice and pinned state → quilt board → current action.

Must not add: Rule configuration, daily challenge, streak, leaderboard, remote controls, AI recommendation, ornamental cards around every region, or a second scorecard.

Reuse map: Player setup → `GamePlayerSetup`; primary action → `GameButton`; backdrop/theme → Games-owned primitives; dice feedback → `useGameFeedback`; back behavior → `backToGames`; quilt/dice visuals → feature-owned presentation.

Nearest precedent: Tumble local play. Preserve immediate setup, optional names, direct dice manipulation, sound control, and one action region. Differ by using a vertically scrolling quilt board instead of a felt table and landscape broadcast layout.

External exemplar ledger: N/A. The established Patchwork tabletop product informed the decision to rename the game; it is not a visual reference.

Behavior sources: Rules → `03-converge.md`; Workshop gating → `04-learning-release.md`; sharing → explicit user concept plus learning-release boundary; navigation/setup → current Games contracts.

Unresolved decisions: Final production name; image sharing; shortened board; remote or solo variants. None changes the local learning slice.

Required states: Setup, before first roll, after first/second/third roll, pinned/unpinned, zero-score category, player handoff, final tie/win, rules open, share cancellation, and rematch.

Proof path: Games → Workshop → Stitch Five on the current iPhone Simulator runtime; exercise a complete two-player game, smallest supported viewport, larger text, reduced motion, rules, result, share invocation, and rematch. Physical-device haptics and native share completion remain separate gates.
