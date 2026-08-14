import {
  createRetailerLinkSession,
  getRetailerLinkProgress,
  parseRetailerLinkSession,
  recordRetailerLinkDecision,
  reconcileRetailerLinkSession,
} from './retailerLinkSession';

const updatedAt = '2026-08-14T16:00:00.000Z';

describe('retailer link session', () => {
  it('creates an empty session and advances only after an explicit decision', () => {
    const session = createRetailerLinkSession({
      listId: 'list-1',
      listRevision: 4,
      retailerId: 'amazon',
      updatedAt,
    });
    expect(getRetailerLinkProgress(['milk', 'eggs'], session)).toEqual({
      currentItemId: 'milk',
      workedThroughCount: 0,
      reportedAddedCount: 0,
      keptForLaterCount: 0,
      totalCount: 2,
      complete: false,
    });

    const next = recordRetailerLinkDecision(session, 'milk', 'reported_added', updatedAt);
    expect(getRetailerLinkProgress(['milk', 'eggs'], next)).toMatchObject({
      currentItemId: 'eggs',
      workedThroughCount: 1,
      reportedAddedCount: 1,
      keptForLaterCount: 0,
      complete: false,
    });
  });

  it('reports completion without claiming a retailer cart or order', () => {
    let session = createRetailerLinkSession({ listId: 'list-1', listRevision: 4, retailerId: 'walmart', updatedAt });
    session = recordRetailerLinkDecision(session, 'milk', 'reported_added', updatedAt);
    session = recordRetailerLinkDecision(session, 'eggs', 'kept_for_later', updatedAt);

    expect(getRetailerLinkProgress(['milk', 'eggs'], session)).toEqual({
      currentItemId: null,
      workedThroughCount: 2,
      reportedAddedCount: 1,
      keptForLaterCount: 1,
      totalCount: 2,
      complete: true,
    });
  });

  it('drops decisions for items that are no longer in the current remainder', () => {
    const reconciled = reconcileRetailerLinkSession({
      session: {
        schemaVersion: 1,
        listId: 'list-1',
        listRevision: 4,
        retailerId: 'amazon',
        decisions: { milk: 'reported_added', old: 'kept_for_later' },
        updatedAt,
      },
      listId: 'list-1',
      listRevision: 4,
      retailerId: 'amazon',
      itemIds: ['milk', 'eggs'],
      updatedAt,
    });
    expect(reconciled.decisions).toEqual({ milk: 'reported_added' });
  });

  it('starts over when the list revision or retailer changes', () => {
    const session = createRetailerLinkSession({ listId: 'list-1', listRevision: 4, retailerId: 'amazon', updatedAt });
    const decided = recordRetailerLinkDecision(session, 'milk', 'reported_added', updatedAt);

    expect(reconcileRetailerLinkSession({
      session: decided,
      listId: 'list-1',
      listRevision: 5,
      retailerId: 'amazon',
      itemIds: ['milk'],
      updatedAt,
    }).decisions).toEqual({});
  });

  it('rejects invalid persisted decisions', () => {
    expect(parseRetailerLinkSession({
      schemaVersion: 1,
      listId: 'list-1',
      listRevision: 4,
      retailerId: 'amazon',
      decisions: { milk: 'ordered' },
      updatedAt,
    })).toBeNull();
  });
});
