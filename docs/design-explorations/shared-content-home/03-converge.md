# Converge: Shared Content Home

## Chosen direction

Choose **B. Feed-first receiving surface**.

It directly answers the expanded job while reusing the current route, recipient-only query, realtime cache, push identity, and capability destinations. A compact action section preserves the useful part of the first implementation without letting it define Home.

## Capability delta

Today, someone can intentionally publish a Goal check-in to their supporters, but the recipient must discover it inside that Goal. After this slice, the recipient can find it in Home, recognize the sender and Goal context, and open the authoritative Goal.

Still intentionally impossible:

- posting generic content directly from Home;
- seeing private capability activity because of a Household or Friendship;
- sharing an Exploration before Explore has its own recipient authorization contract;
- editing or copying source content inside Home.

## Reductive decisions

- Reuse `kwilt_shared_deliveries`; extend its contract rather than introducing a parallel feed table.
- Keep **Needs you** only for pending actions.
- Rename the body stream to **Shared with you**.
- Use name-derived avatars now; do not add an avatar snapshot column.
- Use existing Goal check-in replies/reactions after opening the Goal; do not recreate them on Home.
- Keep deterministic newest-first ordering and the existing 30-day retention boundary.
- Add no filters, unread badges, composer, or settings.

## Activation

Home is learned when a push opens an exact item or when a user returns through the **Home** doorway. No coachmark is required. The first naturally understandable rich item is a check-in authored for an already shared Goal.

## Bet

We are betting that sender-led rich cards plus one real non-actionable share will make Home read as “things people shared with me,” not “Kwilt notifications.” If it still reads as an inbox, the next move is capability-specific media previews—not more event types.

## Success signal

Without explanation, a recipient can distinguish a Goal check-in from an invitation or turn, identify who shared it, and open the correct Goal. The empty state feels centered and intentional when no items exist.
