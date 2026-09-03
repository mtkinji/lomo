# ASR-004 privacy-alignment evidence — September 3, 2026

## Scope and proof boundary

This record covers the public legal deployment, the app-owned privacy manifest, the published App Store Connect disclosure set, and an Xcode privacy report from a local diagnostic archive. It does not prove the exact future EAS/App Store archive, runtime network behavior for every optional capability, or deletion/provider-cleanup behavior.

## Public policy deployment

- Site source base: `/Users/andrewwatanabe/kwilt-site` commit `a5e46fb`, plus only the existing working-tree changes to `app/(site)/privacy/page.tsx` and `app/(site)/terms/page.tsx`.
- Preview deployment: `dpl_Hd3XPYXfy3JK49gKUAQAxbcfYYe6`.
- Production deployment: `dpl_CZKzm5kkCvajtP42Tk2aie6p77zp`.
- Production URL: `https://kwilt-site-ndwx17m6g-andys-projects-d85f8feb.vercel.app`.
- Vercel reported aliases for `kwilt.app`, `www.kwilt.app`, `go.kwilt.app`, `app.kwilt.app`, and `games.kwilt.app`.
- HTTP verification: Privacy and Terms returned 200 with `Last updated: September 2, 2026` on `www.kwilt.app` and `go.kwilt.app`; `kwilt.app` returned 200 after canonical redirect to `www.kwilt.app`. The Privacy page includes the stable `privacy-choices` fragment.
- Isolated release snapshot checks: 289 tests passed; Next.js production build completed. One pre-existing React Hook dependency warning remained in `components/keep/KeepHeroPreview.tsx`.

The isolated snapshot excluded the site's unrelated pricing, analytics-event, and Reddit working-tree changes.

## App privacy manifest

`app.config.ts` source-controls 22 app-collected categories through `ios.privacyManifests`, so Expo prebuild regenerates the declarations into the ignored native `ios/Kwilt/PrivacyInfo.xcprivacy`. They cover contact information, Health and Fitness, financial information, precise and coarse location, user content, Search History, identifiers, Purchase History, usage data, and diagnostics. Every app declaration is linked where Kwilt can associate it with an account or device, and every declaration is marked not tracking. Purposes match `docs/app-store/privacy-disclosures-current-candidate.md`.

The existing required-reason API declarations remain present for file timestamps, UserDefaults, system boot time, and disk space.

## Diagnostic archive and Xcode privacy report

- Checkout: `/Users/andrewwatanabe/Kwilt`, branch `main`, starting commit `8bcca392`. The archive used the live dirty working tree while concurrent unrelated changes were arriving, so it is not immutable candidate evidence.
- Command: `xcodebuild -workspace ios/Kwilt.xcworkspace -scheme Kwilt -configuration Release -destination 'generic/platform=iOS' -archivePath /tmp/kwilt-asr004.xcarchive CODE_SIGNING_ALLOWED=NO archive`.
- Result: `ARCHIVE SUCCEEDED` under Xcode 26.6.
- Contents: main app, KwiltWidgets, KwiltShieldConfiguration, KwiltShieldAction, and KwiltDeviceActivityMonitor.
- Archive identity: `com.andrewwatanabe.kwilt`, `1.0.118 (118)`, arm64, unsigned.
- Xcode report generated: September 3, 2026 at 07:39 MDT.
- Report SHA-256: `8c1abedcf3090ca0fb1031c5b1e0e308805f85167a188e78bf2ab8a08560d221`.
- Archived app manifest SHA-256: `a237e834753945abff2a5ee5f83b198c153c1f148a6de8f116d35dc6a32b9d9a`.

The visual and extracted report agreed. It showed the app's 22 categories plus LinkKit User ID, RevenueCat Purchase History, and react-native-maps Precise Location. All report rows said Tracking = No. Kwilt-owned rows said Linked = Yes; incorporated SDK rows reflected each SDK's own declaration.

Because the native archive identity was stale relative to `app.config.ts` and the archive was unsigned, this is diagnostic evidence rather than closure proof. Repeat the report inspection against the exact signed archive selected for submission.

## App Store Connect reconciliation

- Account/app: Andrew Watanabe / Kwilt, App Store Connect app `6755990439`.
- Before reconciliation: published 4 months earlier with 8 types — Name, Email Address, Precise Location, Emails or Text Messages, Photos or Videos, User ID, Device ID, and Product Interaction.
- After reconciliation: App Store Connect reported `Published a few seconds ago by Andrew Watanabe` and listed all 22 types in the current-candidate packet.
- Every type's detail says `Linked to the user's identity`; every tracking question was answered No. The detailed product-page preview contains no `Data Used to Track You` section.
- Corrected existing purposes: Name added App Functionality; Precise Location added Product Personalization; Emails or Text Messages removed Developer's Advertising or Marketing; Photos or Videos added Product Personalization; User ID removed Developer's Advertising or Marketing and added Product Personalization; Product Interaction added Product Personalization.
- Privacy Policy URL remains published as `https://www.kwilt.app/privacy`.
- User Privacy Choices URL was saved as `https://www.kwilt.app/privacy#privacy-choices`. App Store Connect marks it `Edited` and says URL changes will be released with the next app version, so it is not claimed as current-listing proof yet.
- The detailed aggregate preview also shows User ID, Photos or Videos, Precise Location, Product Interaction, and Name under `Data Not Linked to You`, while their individual details say linked. This observed aggregate behavior must be rechecked after the exact candidate is processed rather than silently normalized away.
- No app version was submitted for review.

## Simulator privacy pass

- Runtime: `Kwilt Chat Matrix` iPhone 17 Pro Simulator on iOS 26.5.
- JavaScript source: `/Users/andrewwatanabe/Kwilt`, branch `main`, commit `8bcca392`, dirty shared checkout, served by Metro from that checkout on port 8081.
- Native shell: installed Simulator build 117. This pass is evidence only for JavaScript-owned screens and behavior, not for the future signed candidate or native entitlement behavior.
- Signed-in state: existing synthetic Simulator account; no credentials or account identifier are recorded here.
- Privacy Policy: Settings → Legal & privacy → Privacy Policy opened `go.kwilt.app` and visibly rendered `Privacy Policy — Last updated: September 2, 2026`.
- Terms: Settings → Legal & privacy → Terms of Use opened `go.kwilt.app` and visibly rendered `Kwilt Terms of Service — Last updated: September 2, 2026`.
- Optional analytics: the accessible switch began On, changed to Off, remained Off after terminating and relaunching the app, and was restored to its original On state after the persistence check.
- Account deletion: Legal & privacy routed to Account settings; Delete account opened an explicit irreversible warning stating that Kwilt account/cloud data deletion cannot be undone and does not cancel Apple billing. The test canceled before deletion, so no account or cloud data was destroyed.
- Focused analytics/legal/deletion tests: 5 suites, 26 tests passed.
- Full account-deletion contract: 3 schema checks, 11 Deno provider/storage/orchestration tests, and 3 Jest suites/19 tests passed.

The Simulator pass does not prove that optional analytics produces no network traffic in a production-signed build, that remote provider credentials are actually revoked in production, or that Health, Screen Time, background location, microphone quality, push delivery, StoreKit, and signed entitlements behave on hardware.

## Production-readiness audit from the Simulator pass

- The active Metro runtime resolved `environment = development`. A PostHog project key and host were configured, but the non-production override was not enabled. Under `src/services/analytics/posthog.ts`, this means the development session intentionally does not create a PostHog client. The UI persistence result above is valid, but this runtime cannot establish production ingestion or network silence after withdrawal.
- A read-only production Supabase inventory confirmed that the synthetic Simulator account still exists with one email identity, one Kwilt person binding, and one install identity. It had no push token, Plaid connection, calendar account, grocery-provider account, active external OAuth token, or active Phone Agent link. No email address, user ID, token, or provider record was captured in this evidence.
- The account is suitable for a later basic standalone deletion smoke, but it cannot exercise the connected-provider cleanup matrix by itself.
- Production project `sqxwjtorodqjdfnuvprf` did not list migration `20260903141350_account_deletion_integrity`; its deployed `account-delete` function was the pre-existing version 21, and `account-deletion-token-register` was not deployed. Running irreversible deletion now would exercise the older production path and would not verify the new fail-closed provider/storage/session orchestration. The account was therefore preserved.

## Remaining ASR-004 gates

1. Build the exact signed candidate from committed source, confirm version/build provenance, and generate its Xcode privacy report.
2. Recheck the processed candidate's aggregate App Store preview, including the linked/not-linked presentation and the released Privacy Choices URL.
3. Deploy and record the account-deletion migration and both Edge Functions, then exercise a fully authorized disposable-account deletion/provider cleanup. The current synthetic Simulator account can cover only the standalone smoke; separate sandbox-connected fixtures are required for the provider matrix.
4. Exercise analytics withdrawal in a production-equivalent signed build while observing outbound traffic; the development Simulator runtime is intentionally analytics-disabled and cannot supply this proof.
5. Run the smaller physical-device pass for native-only privacy boundaries.
6. Obtain the required second review and counsel review for counsel-owned policy decisions.
