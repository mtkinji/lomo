import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './food-provider-feasibility.mjs';

const REQUIRED_FIELDS = ['name', 'recipeIngredient', 'recipeInstructions'];

function findRecipeJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const candidates = [];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      candidates.push(...(Array.isArray(parsed) ? parsed : parsed?.['@graph'] ?? [parsed]));
    } catch {
      // Malformed source is counted but never copied to output.
    }
  }
  return candidates.filter((item) => item?.['@type'] === 'Recipe' || (Array.isArray(item?.['@type']) && item['@type'].includes('Recipe')));
}

export async function runRecipeImportCorpus(args) {
  if (!args['fixture-dir'] || typeof args['fixture-dir'] !== 'string') throw new Error('--fixture-dir is required');
  if (!args.output || typeof args.output !== 'string') throw new Error('--output is required');
  const names = (await readdir(resolve(args['fixture-dir']))).filter((name) => ['.html', '.htm'].includes(extname(name)));
  const observations = [];
  for (const [index, name] of names.sort().entries()) {
    const html = await readFile(resolve(args['fixture-dir'], name), 'utf8');
    const recipes = findRecipeJsonLd(html);
    const fieldCount = recipes.reduce((count, recipe) => count + REQUIRED_FIELDS.filter((field) => recipe[field] != null).length, 0);
    observations.push({
      fixtureId: `fixture-${index + 1}`,
      status: recipes.length ? 'parsed' : 'no_recipe_jsonld',
      recipeObjectCount: recipes.length,
      requiredFieldCount: fieldCount,
      missingRequiredFieldCount: recipes.length * REQUIRED_FIELDS.length - fieldCount,
      sourceBytesBucket: html.length < 10_000 ? 'under_10kb' : html.length < 100_000 ? '10kb_to_100kb' : 'over_100kb',
    });
  }
  const report = { schemaVersion: 1, mode: 'fixture', observations };
  await writeFile(resolve(args.output), `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runRecipeImportCorpus(parseArgs(process.argv.slice(2))).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Recipe corpus failed'}\n`);
    process.exitCode = 1;
  });
}
