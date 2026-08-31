# Converge: Household Invite Delivery And Recovery

## Chosen alternative

Choose **Account-aware pending invitation** with a transport-complete sender receipt.

It is the only option that addresses all observed failures: real email delivery, recognition of the earlier invite, duplicate prevention, and low-friction same-room recovery.

## Capability delta

Today:

- entering an email creates an email restriction but sends no email;
- the recipient app does not surface an email-matched pending invitation;
- creating again produces a second pending invitation;
- manual recovery uses a 12-character hexadecimal code and no QR receipt.

After:

- the sender receives truthful email delivery status;
- the signed-in intended recipient sees the pending invitation automatically;
- retrying the same household/email/role recovers one invitation identity;
- the sender can show a QR code, share the link, or read an eight-character code.

Still intentionally unsupported: automatic acceptance, blanket Household content access, public account discovery, and nearby-device pairing.

## Reductive decisions

- Enhance the current invitation receipt; add no invitation dashboard.
- One dominant action: **Share invitation**.
- QR and short code are visible recovery information, not separate modes.
- Email status is factual and quiet: **Email sent** or **Email wasn’t sent**.
- The recipient still reviews inviter, Household, role, and privacy before joining.

## Activation

The sender sees the receipt immediately after creating or recovering an invitation. A matching signed-in recipient sees the review automatically on opening Household. Manual code entry remains available when no matching email invite exists.

## Bet

We are betting that one remembered invitation with several transports removes most household-join failure without adding setup ceremony. If families still fail to connect while together, revisit foreground nearby pairing.

## UI contract

Job: When an invitation must cross devices or recover from failed email, the family needs one clear handoff they can use now or resume later.

Authority chain: Household foundation brief -> current Household Settings surface -> device-setup QR receipt precedent -> Kwilt tokens/components.

Three-second read: **Blaire can join your household** and whether email was sent.

Primary action: **Share invitation**.

Primary information: QR code and readable short code.

Secondary information: expiry and privacy boundary.

Reveal later: manual code form remains behind **Join a household** when no pending invite is discovered.

Scan order: recipient/outcome -> QR -> code -> Share.

Must not add: transport tabs, an invite-management dashboard, automatic acceptance, or duplicate primary actions.

Reuse map: QR -> `react-native-qrcode-svg`; share -> native Share; controls -> local Button/Input; receipt composition -> `HouseholdDeviceSetupScreen` precedent.

Required states: creating, email sent, email failed with usable QR/code, recovered pending invite, expired/invalid, recipient review, accepted.

Proof path: Settings > Household > Invite a caregiver; separate signed-in account opens Settings > Household and reviews the discovered invite; QR and manual code fallback are exercised in iOS Simulator.
