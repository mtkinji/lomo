# Converge: Household device pairing receipt

## Chosen direction

Use authorized receipt polling. It fits the existing RPC boundary, avoids opening the private device tables to Realtime, and turns the screen into a live receipt with a bounded three-second maximum detection delay.

## Capability delta

Today, a caregiver can see a QR code but the visible action stack implies that setup still requires management. After this change, the caregiver can leave the receipt open and see it automatically become **Charlie's device is connected** after the server records the claim.

This release still does not claim that Apple Screen Time authorization or policy application completed.

## Reductive decisions

- Move Share into the header as the one optional transport action.
- Remove **Cancel setup**; back owns leaving the receipt and cancels the active session.
- Remove **Use an existing Kwilt account** from the caregiver receipt; identity choice belongs on the receiving device.
- Add no refresh button, progress steps, celebratory modal, or new setting.

## Activation

Automatic verification begins only after the short-lived setup session exists and stops immediately after connection or unmount.

## Bet

We're betting that competing controls and uncertain completion are the dominant blockers. If the surface still feels fussy, revisit the amount of explanatory copy rather than adding controls.

## Success signal

In a two-device setup, the caregiver does not tap anything after presenting the QR or code and can correctly distinguish Kwilt connection from later Apple authorization.
