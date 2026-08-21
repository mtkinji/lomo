import assert from 'node:assert/strict';
import test from 'node:test';

import {
  auditRecipeInstructions,
  buildInstructionAuditReport,
} from './instruction-audit.mjs';

function recipe(overrides = {}) {
  return {
    rosterId: 'BR001',
    title: 'Test pancakes',
    description: 'A test Recipe.',
    category: 'Breakfast & brunch',
    cuisine: 'American',
    yieldQuantity: 4,
    yieldUnit: 'servings',
    prepMinutes: 10,
    cookMinutes: 10,
    ingredients: ['1 cup flour', '1 egg', '1 cup milk', '1 tablespoon butter', '1 teaspoon salt'],
    instructions: [
      'Whisk the flour, egg, milk, and salt until smooth.',
      'Heat a skillet over medium heat for 2 minutes.',
      'Cook until bubbles stay open and the underside is golden, 2 to 3 minutes.',
      'Flip and cook until the center springs back, about 1 minute.',
    ],
    notes: 'Serve warm.',
    research: {
      sources: [{ url: 'https://example.com/pancakes' }, { url: 'https://example.org/pancakes' }],
      nonNegotiableTechniques: ['Do not overmix.'],
      repeatedSuccessSignals: ['Open bubbles.'],
      repeatedFailureRisks: ['High heat.'],
      adaptationDecision: 'Keep the method direct.',
    },
    ...overrides,
  };
}

test('accepts a readable method with time and observable doneness cues', () => {
  const result = auditRecipeInstructions(recipe());

  assert.equal(result.blockingFindings.length, 0);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.phaseCount, 4);
  assert.equal(result.cueCount, 4);
  assert.equal(result.researchEvidence.sourceCount, 2);
});

test('blocks duplicate steps and ambiguous completion language', () => {
  const result = auditRecipeInstructions(recipe({
    instructions: [
      'Mix the filling.',
      'Cook until done.',
      'Mix the filling.',
      'Serve warm.',
    ],
  }));

  assert.deepEqual(
    result.blockingFindings.map(({ code }) => code).sort(),
    ['ambiguous-completion', 'duplicate-step'],
  );
});

test('warns about dense phases, technique steps without timing or doneness, and late preparation', () => {
  const result = auditRecipeInstructions(recipe({
    instructions: [
      'Heat the oil in a skillet.',
      'Dice the onion and add it to the pan.',
      'Bake the mixture.',
      'Drain the beans. Mash the beans. Add the spices. Fold in the cheese. Transfer to a dish.',
    ],
  }));

  const codes = new Set(result.warnings.map(({ code }) => code));
  assert.equal(codes.has('late-preparation'), true);
  assert.equal(codes.has('missing-technique-time-or-temperature'), true);
  assert.equal(codes.has('missing-doneness-cue'), true);
  assert.equal(codes.has('dense-phase'), true);
});

test('blocks equipment annotations that no longer quote one exact instruction', () => {
  const result = auditRecipeInstructions(recipe(), {
    enrichment: {
      equipmentAnnotations: [{ instructionIndex: 1, phrase: 'cast-iron skillet', needId: 'skillet' }],
    },
  });

  assert.deepEqual(result.blockingFindings.map(({ code }) => code), ['broken-equipment-phrase']);
});

test('builds a deterministic hash-pinned catalog report', () => {
  const report = buildInstructionAuditReport([
    recipe(),
    recipe({ rosterId: 'BR002', title: 'Second Recipe', instructions: ['Mix.', 'Cook until done.', 'Rest.', 'Serve.'] }),
  ]);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.summary.totalRecipes, 2);
  assert.equal(report.summary.recipesWithBlockingFindings, 1);
  assert.equal(report.recipes[0].rosterId, 'BR001');
  assert.equal(report.recipes[1].rosterId, 'BR002');
  assert.match(report.recipes[0].sourceRecipeHash, /^sha256:[a-f0-9]{64}$/);
});
