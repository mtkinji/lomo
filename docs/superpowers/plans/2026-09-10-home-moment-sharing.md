# Home moment sharing implementation plan

> Execution: inline in the existing checkout, using executing-plans. No parallel runtime or worktree.

**Goal:** Bring the reviewed moment picker/composer and contextual external sharing into the native app.
**Architecture:** Shared Input/BottomDrawer own entry geometry; Home owns drafts and publication. One authenticated share-copy service rechecks the post, downloads only its attached media, and hands text plus photos to the existing Kwilt native share module. No public link or audience expansion.
**Tech Stack:** Expo55 / React Native, owned UI, existing Home RPC, KwiltShareSheet iOS module.

## UI contract

Job: recognize a moment worth sharing, add words/photos, review audience and post; optionally send a copy to family.
Authority: explicit accepted mock and subsequent completion discussion, input-guidance, drawer-guidance, existing Home contracts. RNR is an anatomy reference; mature local Input/Button/BottomDrawer components fit. No new dependency or local input appearance.
Hierarchy: three thumbnail rows + View more; Share a story or photo invitation; one header Post only in draft review. Audience and draft management belong to review. Done ends paragraph editing without publishing. Metadata remains beneath the existing feed action row.
States: no source, missing artwork, restore/retry, changing source without losing words/photos, account change, upload failure, export cancellation/access loss.

- [x] Extend suggestion presentation with Goal artwork and existing recipe artwork; use an honest map-pin fallback for Places (Place has no photo field). No fabricated events/media. Test presentation metadata never enters a post payload.
- [x] Compose standard scroll-owned drawer header; compact suggestion rows and owned Input invitation; explicit back to picker, small audience Change, header Post; preserve all draft recovery paths.
- [x] Add authenticated export-copy service and native text/multiple-image handoff. Recheck account and live post access before handoff; clean temp files after completion/failure; never include tokens/private storage URLs or replies. Text-only export remains available through RN Share. Tests: revoked access, account switch, download failure, cleanup, multiple images and cancellation.
- [x] Add shared Share action to feed cards and detail, and Posted to Home toast with Share callback using confirmed post ID. Export uses live post data; no optimistic publication claims.
- [x] Run focused regressions and scoped verify:local; inspect picker, draft, long text and photo selection in Simulator. Record native build provenance and unavailable gates below.
- [ ] Before release, exercise a published post through the native share sheet and verify the receiving app copy; complete photo-editor and smallest-device checks.

Local source baseline: main 4cd81b8289dfe8eba9c4b6d664e24967a9fdbbb5, clean. Kwilt control-plane connector exposes read-only Life tools; no task write claimed. Durable work maps to the existing Home initiative; this plan is the local continuity record.

## Evidence and remaining release checks

- Source: normal checkout `/Users/andrewwatanabe/Kwilt`, branch `codex/home-moment-sharing`, base `4cd81b8289dfe8eba9c4b6d664e24967a9fdbbb5`; this slice is uncommitted. Metro on 8081 serves that checkout.
- Final scoped `verify:local`: passed (40.34s); app/test types, architecture/input policy, code health, whitespace, 8 related Jest suites / 33 tests. Concurrent Kanban edits were present outside this Home scope and were left untouched.
- iOS Debug Simulator build including `presentMoment`: **BUILD SUCCEEDED**. Installed `Debug-iphonesimulator/Kwilt.app` from DerivedData on iPhone 17 Pro, iOS 26.5, device `D437E709-EF87-49B1-A6C1-7AE350C0BF8A`. Native build log `/tmp/kwilt-home-native-build.log`; final JS changes served by Metro.
- Simulator observed: compact three-row chooser; actual goal artwork or fallback; review audience; centered Back/title/Post drawer header; review resets to the top after choosing a lower row; Post outside Input; multiline draft with usable Photo / Choose another / Done actions in the canonical composer; returning to suggestions preserves the draft. Current evidence: `artifacts/home-moment-sharing/picker-native.png` and `artifacts/home-moment-sharing/review-native.png`.
- Export tests cover every attached photo, caption/context, live access/account rechecks, changed content, failed downloads and cleanup after cancellation. Native compilation is not end-to-end Messages delivery proof. This account has an empty Home feed, so a published-post share sheet and real receiver experience remain a release check. No QA post or message was published.
- This is iOS-native photo sharing. Android/older native binaries support text-only sharing and explicitly reject photo-copy export. A new iOS binary is required for the new native method; no TestFlight build or deployment was performed.
- Suggestions stay honest: only eligible recent sources appear; Place currently has no thumbnail field, so it uses a map-pin fallback. Goal artwork is chooser/review context only; the post includes its title, plus photos the person explicitly adds.

Final cleanup: stopped the app and removed only the exact empty QA draft created by selecting `Land a new job offer`, preserving all other stored entries. The draft had no photos or text. Local manifest backup is `/tmp/kwilt-home-review-manifest-backup.json`. No server post existed or was deleted.
