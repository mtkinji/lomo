import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { reviewedScalingForRecipe } from './reviewed-scaling.mjs';

function classifyRecord(record) {
  if (!Array.isArray(record.structuredIngredients)) return record;
  const reviewedLines = record.rosterId === 'BA001'
    ? record.structuredIngredients.map((line) => line.position === 0 ? { ...line, parseConfidence: 1 } : line)
    : record.structuredIngredients;
  const classification = reviewedScalingForRecipe(record.rosterId, record.structuredIngredients.length);
  if (classification.scalingState === 'unavailable') {
    return {
      ...record,
      scalingState: 'unavailable',
      structuredIngredients: reviewedLines.map((line) => ({
        ...line,
        scaleRule: { kind: 'review_required' },
      })),
    };
  }
  return {
    ...record,
    scalingState: 'verified',
    structuredIngredients: reviewedLines.map((line) => ({
      ...line,
      scaleRule: classification.scalingReview[line.position],
    })),
  };
}

const files = process.argv.slice(2);
if (!files.length) throw new Error('Pass one or more reviewed enrichment JSON files.');
for (const input of files) {
  const filePath = path.resolve(input);
  const envelope = JSON.parse(await readFile(filePath, 'utf8'));
  if (!Array.isArray(envelope.recipes)) throw new Error(`${input} has no reviewed recipe records.`);
  const classified = { ...envelope, recipes: envelope.recipes.map(classifyRecord) };
  await writeFile(filePath, `${JSON.stringify(classified, null, 2)}\n`, 'utf8');
  process.stdout.write(`${input}: classified ${classified.recipes.length} recipes\n`);
}
