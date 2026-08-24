import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMealKitExpansionAuthoring } from './meal-kit-expansion-authoring.mjs';

test('builds reviewed authoring with one-dish image direction and grounded equipment', () => {
  const manifest = {
    recipes: [{
      rosterId: 'DI231',
      title: 'Gochujang chicken rice bowls',
      cuisine: 'Korean-inspired',
      researchTask: {
        description: 'Sticky-spicy chicken, rice, broccoli, and cucumber.',
        ingredients: ['1 pound chicken', '1 cup rice'],
        instructions: ['Heat a large skillet over medium-high.', 'Build four bowls and serve.'],
        notes: 'An original Kwilt Kitchen dinner.',
        sources: [
          { title: 'Menus', publisher: 'Green Chef', url: 'https://example.com/green' },
          { title: 'Cookbook', publisher: 'Blue Apron', url: 'https://example.com/blue' },
        ],
        existingResearch: { adaptationDecision: 'Use a composed meal-kit structure.' },
      },
    }],
  };

  const authored = buildMealKitExpansionAuthoring(manifest).DI231;

  assert.equal(authored.equipmentAnnotations[0].phrase, 'large skillet');
  assert.match(authored.imageBrief, /one single hero serving/i);
  assert.match(authored.imageBrief, /do not show four cloned/i);
  assert.equal(authored.history.sources.length, 2);
  assert.equal(authored.commerce.decision, 'no_purchase_needed');
});

test('projects authoritative published media into the reviewed batch', () => {
  const manifest = {
    recipes: [{ rosterId: 'DI231', title: 'Dinner', cuisine: 'Modern American', researchTask: {
      description: 'A composed dinner.', ingredients: ['1 cup rice'],
      instructions: ['Heat a large skillet.'], notes: 'Original.',
      sources: [{ title: 'A', publisher: 'A', url: 'https://example.com/a' }, { title: 'B', publisher: 'B', url: 'https://example.com/b' }],
      existingResearch: { adaptationDecision: 'Keep the meal composed.' },
    } }],
  };
  const media = { DI231: { storageRef: 'https://example.com/di231.webp', altText: 'A composed dinner in one bowl.', width: 1536, height: 1024, publishedAt: '2026-08-24T13:45:00.000Z' } };
  const authored = buildMealKitExpansionAuthoring(manifest, media).DI231;
  assert.equal(authored.heroImage.state, 'published');
  assert.equal(authored.publication.publishedAt, media.DI231.publishedAt);
});
