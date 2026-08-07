import { normalizeActivityContext } from './activityActionCardPolicy';

const capturedAt = '2026-08-05T12:00:00.000Z';

describe('Activity action-card context policy', () => {
  it('keeps one closed binding, three passive references, and bounded evidence', () => {
    const result = normalizeActivityContext({
      sourceReferences: Array.from({ length: 5 }, (_, index) => ({
        id: `s-${index}`,
        providerId: 'meal_planning',
        resourceKind: 'choice_round',
        resourceRef: `round-${index}`,
        capturedAt,
        snapshot: { providerLabel: 'Meal Planning', sourceLabel: null, reason: 'x'.repeat(300), occurredAt: null },
      })),
      actionCardBinding: {
        providerId: 'meal_planning', projectionKind: 'choice_round',
        resourceRef: 'round-1', sourceVersion: '4', action: { url: 'https://bad.invalid' },
      },
    });

    expect(result.sourceReferences).toHaveLength(3);
    expect(result.sourceReferences[0].snapshot.reason).toHaveLength(240);
    expect(result.actionCardBinding).toEqual({
      providerId: 'meal_planning', projectionKind: 'choice_round', resourceRef: 'round-1', sourceVersion: '4',
    });
    expect(result.actionCardBinding).not.toHaveProperty('action');
  });

  it('caps opaque references and retains unknown providers as unavailable evidence', () => {
    const result = normalizeActivityContext({
      sourceReferences: [{
        id: ' source ', providerId: 'future_provider', resourceKind: ' thing ', resourceRef: ` ${'r'.repeat(600)} `,
        capturedAt, snapshot: { providerLabel: ' Future ', reason: ' Imported source ' },
      }],
      actionCardBinding: {
        providerId: 'future_provider', projectionKind: 'thing', resourceRef: 'r'.repeat(600), sourceVersion: null,
      },
    });
    expect(result.sourceReferences[0]).toEqual(expect.objectContaining({ providerId: 'future_provider', resourceRef: 'r'.repeat(512) }));
    expect(result.actionCardBinding).toEqual(expect.objectContaining({ providerId: 'future_provider', resourceRef: 'r'.repeat(512) }));
  });

  it('removes malformed entries and returns an empty envelope for arbitrary input', () => {
    expect(normalizeActivityContext({ sourceReferences: [{ action: 'delete everything' }], actionCardBinding: { actionId: 'hidden' } }))
      .toEqual({ sourceReferences: [], actionCardBinding: null });
  });
});
