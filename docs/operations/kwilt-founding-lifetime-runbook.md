# Founding Lifetime operations

## Configuration contract

| System | Configuration |
| --- | --- |
| Apple | Kwilt app, non-consumable product `pro_lifetime`, reference/display name Kwilt Pro Lifetime, initial US price $19.99 |
| RevenueCat entitlement | Existing `pro`; attach `pro_lifetime` permanently |
| RevenueCat Offering | `founders`, Lifetime package `$rc_lifetime`, linked to `pro_lifetime`; retain existing default/subscription Offering |
| App | Separate optional Founding Lifetime card using Apple's localized price |

Apple description draft: `All Kwilt Pro features with one payment. No renewal.`
Andrew selected Apple Family Sharing for the lifetime purchase. It is not equivalent to Kwilt Household membership.

## Price reviews and ending the offer

Count distinct paid production purchase transactions for this product, excluding Sandbox, restores, Family Sharing recipients, duplicate webhooks and refunded purchases. Review every roughly 50 purchases. Change the same product's price in App Store Connect, optionally adding $10; verify the resulting localized price in the purchase sheet after propagation. No new SKU or app release per price step.

At roughly 1,000 purchases, review subscription conversion and cohort support/usage costs. To end new founding sales, remove the lifetime package from `founders`. Do not detach the product from `pro`, delete entitlements or remove customer records. An already-open/cached offer may linger temporarily; this is a soft offer change, not hard inventory enforcement.

## Verification before paid launch

- Configure and approve the Apple IAP; confirm RevenueCat imports the actual store product.
- Confirm the existing subscription choices still load unchanged.
- Buy lifetime with a disposable Sandbox account and confirm app and server agree on full Pro with no expiration.
- Restore after reinstall/account re-identification, including when `founders` no longer includes the package.
- Verify a separate Apple Family Sharing recipient receives full Pro in the app and server mirror, and loses shared access when sharing is revoked without affecting the purchaser.
- End a separate subscription while lifetime remains active. Confirm all server Pro gates stay active and Screen Time downgrade actions do not fire.
- Refund lifetime with and without another active Pro subscription; verify correct remaining access.
- Verify webhook retries, out-of-order product events, and concurrent deliveries; the mirror uses conditional writes and retries collisions.
- Verify existing subscribers see the notice that lifetime purchase does not cancel their subscription.
- Verify the small-screen layout and action dock on the actual release build.

The existing mirror's `raw` field stores only `pro_product_states_v1`, a map of minimal product access projections (product ID, state, dates and event IDs), not raw provider payloads. No schema migration is needed.

## Setup status

2026-09-10: store configuration saved and verified through the Work/kwilt.app Chrome profile:

- Apple Kwilt app `6755990439`, non-consumable `pro_lifetime`, Apple product ID `6810843026`.
- US base price $19.99 confirmed; Apple-generated localized prices retained. All purchase countries/regions selected; the parent app's existing 85-storefront distribution remains unchanged.
- English (U.S.): Kwilt Pro Lifetime / All Pro features. One payment. No renewal.
- Andrew authorized Family Sharing. Apple confirmation was attempted; persisted enabled status still needs verification.
- RevenueCat project `6eaa1fd1`, App Store app `app50213145a3`, product `prodfe60321059`, attached to `pro` (`entl77b9782a2f`).
- Separate Offering `founders` (`ofrng3b17d3049b`) saved with the Lifetime package and `pro_lifetime`. Existing default `kwilt` offering and four subscription packages retained.
- Apple explicitly requires the first non-consumable to be submitted with a new app version. Review screenshot, build, Sandbox reconciliation, backend deployment and submission remain pending; this is not a live purchasable launch.

The earlier browser blocker was a mismatch between the connected personal Chrome profile and Andrew's visible Work profile. Native UI control of the visible Work profile completed configuration without disabling extensions or security settings.

Local verification: 50 focused Jest tests passed across purchase/restore, the plan chooser, entitlement store and lifecycle reducers (49 in the combined run, then the chooser's 11 tests after adding the final confirmation regression). Focused Deno checks for `pro-codes/index.ts` and the new reducer passed. Test TypeScript and product lint passed; code health completed with warnings only. The scoped `verify:local` command was attempted but could not acquire the shared runner lock held by another task. Native purchase/restore, webhook/database reconciliation, the full local gate, deployment and Apple review remain pending.
