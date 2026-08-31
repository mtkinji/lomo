import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  EDITORIAL_MEAL_COLLECTIONS,
  EDITORIAL_MEAL_COLLECTION_ROTATIONS,
} from '../../src/capabilities/recipes/data/editorialMealCollections';
import { buildPublicEditorialMealCollectionExport } from '../../src/capabilities/recipes/domain/publicEditorialMealCollections';

async function run() {
  const outputPath = process.argv[2];
  if (!outputPath) throw new Error('Provide an output path for the public editorial Collection export.');

  const kwiltRoot = process.cwd();
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: kwiltRoot,
    encoding: 'utf8',
  }).trim();

  const output = buildPublicEditorialMealCollectionExport({
    collections: EDITORIAL_MEAL_COLLECTIONS,
    rotations: EDITORIAL_MEAL_COLLECTION_ROTATIONS,
    sourceCommit,
  });

  await writeFile(path.resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

void run();
