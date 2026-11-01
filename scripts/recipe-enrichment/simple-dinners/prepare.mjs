import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileTypeScriptExport, loadCanonicalCatalog } from '../catalog.mjs';
import { buildStructuredIngredientDraft } from '../structured-ingredient-draft.mjs';
import { buildEnrichmentManifest } from '../pipeline.mjs';
import { buildBatchManifests } from '../batch-manifests.mjs';
import { auditRecipeInstructions } from '../instruction-audit.mjs';

const root=process.cwd();
const output=process.argv[2];
const moduleSpecs=process.argv.slice(3);
if (!output) throw new Error('Usage: node prepare.mjs output.json (after catalog integration)');
const [all, parser]=await Promise.all([
  moduleSpecs.length ? Promise.all(moduleSpecs.map(async spec => {
    const [file, exportName] = spec.split('#');
    if (!exportName) throw new Error('Module arguments must be path#EXPORT_NAME');
    const exportFile=path.resolve(file);
    return compileTypeScriptExport({sourceFiles:[exportFile],rootDir:path.join(root,'src/capabilities/recipes/data'),exportFile,exportName});
  })).then(groups=>groups.flat()) : loadCanonicalCatalog(root),
  compileTypeScriptExport({sourceFiles:[path.join(root,'packages/food-core/src/index.ts')],rootDir:path.join(root,'packages/food-core/src'),exportFile:path.join(root,'packages/food-core/src/index.ts'),exportName:'parseIngredientLine'}),
]);
const catalog=all.filter(r=>/^DI\d+$/.test(r.rosterId)&&+r.rosterId.slice(2)>=331&&+r.rosterId.slice(2)<=530);
if((!moduleSpecs.length && catalog.length!==200)||!catalog.length||new Set(catalog.map(r=>r.rosterId)).size!==catalog.length) throw new Error(`Expected all 200 unique expansion recipes; found ${catalog.length}.`);
const manifest=buildEnrichmentManifest(catalog,[]);
const drafts=catalog.map(r=>buildStructuredIngredientDraft(r,parser));
await writeFile(output,JSON.stringify({schemaVersion:1,catalog,drafts,batches:buildBatchManifests(manifest,10),instructionAudits:catalog.map(recipe=>({rosterId:recipe.rosterId,...auditRecipeInstructions(recipe)}))},null,2)+'\n');
process.stdout.write(`Prepared ${catalog.length} recipes in ${Math.ceil(catalog.length/10)} batches. Ingredient decisions and desk reviews remain pending.\n`);
