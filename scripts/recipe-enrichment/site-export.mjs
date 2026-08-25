import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalRecipeHash, loadCanonicalCatalog } from './catalog.mjs';
import { validateReviewedRecords } from './pipeline.mjs';

const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function publicationBlockers(recipe, record) {
  if (!record) return ['missing_enrichment'];
  const reasons = [];
  if (record.sourceRecipeHash !== canonicalRecipeHash(recipe)) reasons.push('source_hash');
  if (record.review.state !== 'reviewed') reasons.push('overall_review');
  const sectionNames = {
    cookingTruth: 'cooking_truth',
    structuredIngredients: 'structured_ingredients',
    originHistory: 'origin_history',
    equipment: 'equipment',
    commerce: 'commerce',
  };
  for (const [section, reason] of Object.entries(sectionNames)) {
    if (record.review.sections[section] !== 'reviewed') reasons.push(reason);
  }
  if (record.review.sections.sitePublication !== 'published') reasons.push('site_publication');
  if (!record.costTier) reasons.push('cost_tier');
  if (!record.difficulty) reasons.push('difficulty');
  if (record.structuredIngredients.length !== recipe.ingredients.length) reasons.push('ingredient_coverage');
  if (record.history.sources.length < 2) reasons.push('history_sources');
  if (record.heroImage.state !== 'published') reasons.push('hero_image');
  if (!record.publication.slug || !record.publication.publishedAt) reasons.push('publication_identity');
  return reasons;
}

export function buildSiteExport(catalog, records, sourceCommit) {
  const byRosterId = new Map(records.map((record) => [record.rosterId, record]));
  const recipes = [];
  const blocked = [];
  for (const recipe of [...catalog].sort((left, right) => left.rosterId.localeCompare(right.rosterId))) {
    const record = byRosterId.get(recipe.rosterId);
    const reasons = publicationBlockers(recipe, record);
    if (reasons.length) {
      blocked.push({ rosterId: recipe.rosterId, reasons });
      continue;
    }
    recipes.push({
      rosterId: recipe.rosterId,
      slug: record.publication.slug,
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      cuisine: recipe.cuisine,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      inactiveMinutes: recipe.inactiveMinutes,
      totalMinutes: recipe.prepMinutes + recipe.cookMinutes + recipe.inactiveMinutes,
      yieldQuantity: recipe.yieldQuantity,
      yieldUnit: recipe.yieldUnit,
      scalingState: record.scalingState,
      ingredients: recipe.ingredients,
      structuredIngredients: record.structuredIngredients,
      instructions: recipe.instructions,
      notes: recipe.notes ?? null,
      author: 'Kwilt Kitchen',
      rightsBasis: 'kwilt_authored',
      publishedAt: record.publication.publishedAt,
      image: {
        url: record.heroImage.storageRef,
        alt: record.heroImage.altText,
        width: record.heroImage.width,
        height: record.heroImage.height,
      },
      editorial: {
        costTier: record.costTier,
        difficulty: record.difficulty,
        instructionQuantityPhrases: record.instructionQuantityPhrases,
        origin: record.origin,
        paragraphs: record.history.paragraphs,
        sources: record.history.sources,
        equipmentNeeds: record.equipmentNeeds,
        equipmentAnnotations: record.equipmentAnnotations,
        commerce: record.commerce,
      },
    });
  }
  return { schemaVersion: 2, sourceCommit, recipes, blocked };
}

export function preserveExistingPublicRecipes(current, existing) {
  const previousRecipes = Array.isArray(existing?.recipes) ? existing.recipes : [];
  const byRosterId = new Map(previousRecipes.map((recipe) => [recipe.rosterId, recipe]));
  for (const recipe of current.recipes) byRosterId.set(recipe.rosterId, recipe);
  const recipes = [...byRosterId.values()].sort((left, right) => left.rosterId.localeCompare(right.rosterId));
  const publicRosterIds = new Set(recipes.map((recipe) => recipe.rosterId));
  return {
    ...current,
    recipes,
    blocked: current.blocked.filter(({ rosterId }) => !publicRosterIds.has(rosterId)),
    preservedExistingRecipes: recipes.length - current.recipes.length,
  };
}

async function runCli() {
  const seedPath = path.join(kwiltRoot, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json');
  const [catalog, envelope] = await Promise.all([
    loadCanonicalCatalog(kwiltRoot),
    readFile(seedPath, 'utf8').then(JSON.parse),
  ]);
  const records = await validateReviewedRecords(catalog, envelope.recipes);
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: kwiltRoot, encoding: 'utf8' }).trim();
  const outputPath = process.argv[2];
  let output = buildSiteExport(catalog, records, sourceCommit);
  if (outputPath) {
    const resolvedOutputPath = path.resolve(outputPath);
    const existing = await readFile(resolvedOutputPath, 'utf8').then(JSON.parse).catch((error) => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    output = preserveExistingPublicRecipes(output, existing);
    await writeFile(resolvedOutputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  } else {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await runCli();
