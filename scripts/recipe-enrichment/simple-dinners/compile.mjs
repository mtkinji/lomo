import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRecipeHash, compileTypeScriptExport } from '../catalog.mjs';
import { compileReviewedBatch } from '../batch-compiler.mjs';
import { auditRecipeInstructions } from '../instruction-audit.mjs';

export function validateDeskReview(recipe, draft, authored) {
  const fail = (message) => { throw new Error(`${recipe.rosterId}: ${message}`); };
  if (!authored) fail('explicit desk review is missing');
  if (authored.sourceRecipeHash !== canonicalRecipeHash(recipe)) fail('desk review is stale');
  if (authored.cookingReview?.decision !== 'approved' || !authored.cookingReview.rationale?.trim()) fail('cooking review approval is missing');
  if (!authored.reviewedAt || !authored.scalingRationale?.trim()) fail('dated scaling review rationale is missing');
  for (const line of draft.lines) {
    const decision = authored.ingredientReview?.[line.position];
    if (!decision?.rationale?.trim() || (!decision.accept && !decision.patch)) fail(`ingredient ${line.position} needs a reasoned decision`);
    if (line.parseConfidence < .8 && (!decision.patch || !(decision.patch.parseConfidence >= .8))) fail(`ingredient ${line.position} requires a corrected patch`);
    const resolved = {...line,...decision.patch};
    if (resolved.originalText !== line.originalText || resolved.position !== line.position) fail(`ingredient ${line.position} patch changed source identity`);
    if (resolved.quantityMin === null && authored.scalingReview?.[line.position]?.kind !== 'fixed') fail(`ingredient ${line.position} without quantity needs a fixed scaling rule`);
    if (!resolved.ingredientConcept?.trim() && 'ingredientConcept' in line) fail(`ingredient ${line.position} has no concept`);
    if (resolved.quantityMin !== null && !(resolved.quantityMin > 0)) fail(`ingredient ${line.position} has invalid quantity`);
    if (!authored.scalingReview?.[line.position]) fail(`ingredient ${line.position} lacks scaling rule`);
  }
  if (!authored.equipmentNeeds?.length || !authored.equipmentAnnotations?.length) fail('equipment review is missing');
  const needIds = new Set(authored.equipmentNeeds.map(x=>x.id));
  for (const annotation of authored.equipmentAnnotations) {
    if (!needIds.has(annotation.needId) || !annotation.phrase || !recipe.instructions[annotation.instructionIndex]?.includes(annotation.phrase)) fail('equipment annotation is not grounded in instructions');
    const instruction = recipe.instructions[annotation.instructionIndex];
    const start = instruction.indexOf(annotation.phrase);
    if (/[a-z]/i.test(instruction[start - 1] ?? '') || /[a-z]/i.test(instruction[start + annotation.phrase.length] ?? '')) fail('equipment annotation matched only part of a word');
  }
  for (const id of needIds) if (!authored.equipmentAnnotations.some(a=>a.needId===id)) fail('equipment need has no instruction annotation');
  if (new Set(authored.history?.sources?.map(s=>s.url)).size < 2) fail('two history sources are required');
  const instructionAudit = auditRecipeInstructions(recipe, {enrichment: authored});
  const findings = [...instructionAudit.blockingFindings, ...instructionAudit.warnings];
  if (findings.some(f=>f.severity==='blocking')) fail('blocking instruction findings remain');
  if (findings.length && !authored.instructionAuditRationale?.trim()) fail('instruction warnings need an explicit review rationale');
  if (authored.heroImage?.state === 'published' && (!authored.heroImage.storageRef || !authored.heroImage.width || !authored.heroImage.height || !authored.mediaReview?.reviewedAt || !authored.mediaReview?.uploadReceipt)) fail('published media requires reviewed upload evidence');
}

export function compileExpansion(prepared, authoring) {
  const expected = new Map(prepared.catalog.map(recipe=>[recipe.rosterId,canonicalRecipeHash(recipe)]));
  if (!expected.size || expected.size !== prepared.catalog.length) throw new Error('catalog coverage must contain unique recipes');
  const seen = new Set();
  for (const batch of prepared.batches ?? []) for (const entry of batch.recipes ?? []) {
    if (!expected.has(entry.rosterId) || seen.has(entry.rosterId)) throw new Error('batch coverage contains foreign or repeated recipe');
    if (entry.sourceRecipeHash !== expected.get(entry.rosterId)) throw new Error('batch source hash is stale');
    seen.add(entry.rosterId);
  }
  if (seen.size !== expected.size) throw new Error('batch coverage does not match prepared catalog');
  for (const recipe of prepared.catalog) validateDeskReview(recipe, prepared.drafts.find(d=>d.rosterId===recipe.rosterId), authoring[recipe.rosterId]);
  return {schemaVersion:2, source:'kwilt-codex-reviewed-recipe-enrichment',recipes:prepared.batches.flatMap(batch=>compileReviewedBatch({batch,catalog:prepared.catalog,structuredDrafts:prepared.drafts,authoring,existingRecords:[]}).recipes)};
}
if (process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  const [preparedPath, authoringPath, outputPath] = process.argv.slice(2);
  if (!outputPath) throw new Error('Usage: node compile.mjs prepared.json authoring.json output.json');
  const prepared=JSON.parse(await readFile(preparedPath,'utf8'));
  const authoring=JSON.parse(await readFile(authoringPath,'utf8'));
  const result=compileExpansion(prepared,authoring);
  const exportFile=path.resolve('src/capabilities/recipes/data/recipeEditorialEnrichment.ts');
  const parse=await compileTypeScriptExport({sourceFiles:[exportFile],rootDir:path.resolve('src/capabilities/recipes'),exportFile,exportName:'parseRecipeEditorialEnrichment'});
  for (const record of result.recipes) {
    const recipe=prepared.catalog.find(r=>r.rosterId===record.rosterId);
    parse(record,recipe.instructions,recipe.ingredients);
  }
  await writeFile(outputPath,JSON.stringify(result,null,2)+'\n');
  process.stdout.write(`Compiled ${result.recipes.length} records; ${result.recipes.filter(r=>r.heroImage.state==='missing').length} images still missing.\n`);
}
