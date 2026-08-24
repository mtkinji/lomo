import { createRequire } from 'node:module';
import { buildMealKitExpansionAuthoring } from '../../meal-kit-expansion-authoring.mjs';

const require = createRequire(import.meta.url);
const manifest = require('../../../../docs/design-explorations/recipe-catalog-scale-audit/batches/recipe-enrichment-24.json');
const media = require('./recipe-enrichment-21-24-media.json');
const mediaByRosterId = Object.fromEntries(media.recipes.map((record) => [record.rosterId, record]));

export default buildMealKitExpansionAuthoring(manifest, mediaByRosterId);
