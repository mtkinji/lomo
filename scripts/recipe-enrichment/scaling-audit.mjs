import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadCanonicalCatalog } from './catalog.mjs';

const reasonOrder = [
  'low_confidence_quantity',
  'parenthetical_equivalent_unreviewed',
  'vessel_quantity_unreviewed',
  'instruction_quantity_unreviewed',
  'scaling_rule_missing',
];

function currentRule(line) {
  return line?.scaleRule ?? { kind: 'review_required' };
}

export function auditRecipe(recipe) {
  if (recipe.scalingState === 'unavailable') return { reasons: [], rows: [] };
  const rows = [];
  for (const line of recipe.structuredIngredients ?? []) {
    const rule = currentRule(line);
    const add = (reason) => rows.push({
      rosterId: recipe.rosterId,
      position: line.position,
      originalText: line.originalText,
      reason,
      currentRule: rule,
    });
    if (line.quantityMin !== null && line.parseConfidence < 0.8) add('low_confidence_quantity');
    if (/\(\s*\d[^)]*(?:grams?|g|kilograms?|kg|ounces?|oz|pounds?|lb)\s*\)/i.test(line.originalText) && rule.kind === 'review_required') {
      add('parenthetical_equivalent_unreviewed');
    }
    if (/(?:for frying|frying oil|fill (?:the )?(?:bowl|pan|pot)|oil (?:the )?(?:bowl|pan))/i.test(line.originalText) && rule.kind === 'review_required') {
      add('vessel_quantity_unreviewed');
    }
    if (rule.kind === 'review_required') add('scaling_rule_missing');
  }
  const reasons = reasonOrder.filter((reason) => rows.some((row) => row.reason === reason));
  return { reasons, rows };
}

export function auditCatalog(records) {
  const audits = records.map((record) => ({ record, audit: auditRecipe(record) }));
  return {
    recipeCount: records.length,
    unclassifiedRecipes: audits.filter(({ record }) => record.scalingState !== 'verified' && record.scalingState !== 'unavailable').length,
    partialScalingRecipes: audits.filter(({ record, audit }) => record.scalingState === 'verified' && audit.rows.length > 0).length,
    rows: audits.flatMap(({ audit }) => audit.rows),
  };
}

async function main() {
  const formatIndex = process.argv.indexOf('--format');
  const format = formatIndex >= 0 ? process.argv[formatIndex + 1] : 'summary';
  const root = process.cwd();
  const [seed, catalog] = await Promise.all([
    readFile(path.join(root, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json'), 'utf8').then(JSON.parse),
    loadCanonicalCatalog(root),
  ]);
  const catalogById = new Map(catalog.map((recipe) => [recipe.rosterId, recipe]));
  const records = seed.recipes.map((record) => ({ ...catalogById.get(record.rosterId), ...record }));
  const result = auditCatalog(records);
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${result.recipeCount} recipes classified; ${result.unclassifiedRecipes} unclassified recipes; ${result.partialScalingRecipes} partial-scaling recipes\n`);
  const counts = new Map();
  for (const row of result.rows) counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  for (const reason of reasonOrder) {
    if (counts.has(reason)) process.stdout.write(`${reason}: ${counts.get(reason)} blockers\n`);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
