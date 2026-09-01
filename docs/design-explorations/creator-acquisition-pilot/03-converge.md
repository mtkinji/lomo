# Converge: creator acquisition pilot

## Qualitative comparison

| Alternative | Marcus/job fit | Attribution truth | System fit | Privacy/ops risk | Pilot value |
| --- | --- | --- | --- | --- | --- |
| Link-only | good | low | high | low | medium |
| Apple offer code | medium | medium-high | medium | low | medium |
| First-party claim + Apple purchase | high | high | high | medium | high |
| External platform | medium | high | low for pilot | high | low |

## Chosen alternative

Choose **First-party claim plus Apple purchase**. It is the smallest system
extension that produces payout-grade attribution while preserving StoreKit and
RevenueCat as subscription truth. Apple offer codes remain an optional later
campaign type, not the creator-program foundation.

## Capability delta

Today, a customer cannot reliably carry creator identity through App Store
installation, and Kwilt cannot defensibly connect a creator to a retained paid
conversion.

After the pilot, the customer can claim a creator campaign before purchase,
receive the creator's optional activation challenge, buy the ordinary Kwilt Pro
subscription through Apple, and remain privately attributable to the campaign.
Kwilt can calculate a reversible commission from authenticated lifecycle events.

The pilot still will not support multi-touch attribution, claim switching,
lifetime revenue share, automated payouts, or a self-serve creator portal.

## Reductive design decisions

- Enhance the existing link/install identity and subscription ledger; do not build a second checkout.
- Add one skippable code claim, not a persistent “creator” section in customer settings.
- Use one campaign promise and one activation challenge per creator.
- Use manual reviewed payout batches; do not store tax or bank data in Kwilt.
- Refuse post-purchase claims and first/last-touch configuration screens.

## Activation path

The creator demonstrates one approved advanced Screen Time outcome. Their link
opens a matching page. The app offers the code claim during continuation or
before the first Pro purchase. Claiming reveals the optional challenge/template;
the contextual paywall appears only when the customer asks to save the advanced
rule or use another Pro capability.

## Accepted trade-offs

- A small post-install claim step is required for deterministic attribution.
- Manual partner operations are acceptable for five creators.
- Link-only visits remain useful aggregate analytics but do not earn a bounty.

## Rejected trade-offs

- No lifetime revenue share.
- No commission at trial start; the first real paid period is the qualifying event.
- No probabilistic payout based only on a web click.
- No creator access to user-level product behavior or private content.

## Stated bet

We are betting that a creator who demonstrates one concrete advanced Screen
Time job can acquire retained Pro customers more efficiently than broad feature
promotion. If that is false, revisit the promise and creator fit before adding
discounts, more channels, or heavier attribution infrastructure.

## Success signal

Multiple creators produce first paid periods from people who claimed the code,
completed the demonstrated activation, and did not generate abnormal refunds
or attribution disputes at a sustainable modeled payback.
