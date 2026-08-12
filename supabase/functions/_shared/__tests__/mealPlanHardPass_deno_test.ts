import { resolveHardPassReview } from '../mealPlanHardPass.ts';

Deno.test('requires review for a selected candidate with a newer hard pass', () => {
  const blocked = resolveHardPassReview({
    selectedCandidateIds: ['candidate-1', 'candidate-2'],
    candidates: [
      { id: 'candidate-1', hardPassOverriddenAt: null },
      { id: 'candidate-2', hardPassOverriddenAt: '2026-08-12T12:00:00Z' },
    ],
    hardPasses: [
      { candidateId: 'candidate-1', createdAt: '2026-08-12T11:00:00Z' },
      { candidateId: 'candidate-2', createdAt: '2026-08-12T13:00:00Z' },
    ],
  });

  if (blocked.join(',') !== 'candidate-1,candidate-2') throw new Error(`unexpected review set: ${blocked}`);
});

Deno.test('does not reopen a reviewed hard pass until a newer one is recorded', () => {
  const blocked = resolveHardPassReview({
    selectedCandidateIds: ['candidate-1'],
    candidates: [{ id: 'candidate-1', hardPassOverriddenAt: '2026-08-12T13:00:00Z' }],
    hardPasses: [{ candidateId: 'candidate-1', createdAt: '2026-08-12T12:00:00Z' }],
  });

  if (blocked.length !== 0) throw new Error('reviewed hard pass was blocked again');
});
