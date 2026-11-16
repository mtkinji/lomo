import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRecipeHash } from '../catalog.mjs';
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export function assembleAuthoring(recipe,draft,receipt,resolutions={}) {
  const fail=message=>{throw new Error(`${recipe.rosterId}: ${message}`);};
  if(resolutions.sourceRecipeHash && resolutions.sourceRecipeHash!==canonicalRecipeHash(recipe)) fail('parser resolutions are stale');
  if(!receipt?.cookingRationale?.trim()||!receipt.scalingRationale?.trim()) fail('substantive review receipt required');
  if(!receipt.sourceRecipeHash) fail('review receipt source hash is missing');
  if(receipt.sourceRecipeHash!==canonicalRecipeHash(recipe)) fail('review receipt is stale');
  if(receipt.ingredientRationales?.length!==draft.lines.length) fail('ingredient review count does not match source');
  const ingredientReview={};
  const scalingReview={};
  for(const line of draft.lines) {
    const patch=resolutions.ingredientPatches?.[line.position];
    if(line.parseConfidence<.8&&!patch) fail(`ingredient ${line.position} needs an explicit parser patch`);
    const resolved={...line,...patch};
    const rule=resolutions.scalingRules?.[line.position]??receipt.scalingRules?.[line.position];
    if(resolved.quantityMin===null&&!rule) fail(`ingredient ${line.position} needs an explicit scaling rule`);
    ingredientReview[line.position]={...(patch?{patch}:{accept:true}),rationale:receipt.ingredientRationales[line.position]};
    scalingReview[line.position]=rule??{kind:'multiply'};
  }
  const equipment=receipt.equipment??[];
  const protein=recipe.ingredients.join(' ');
  return {
    sourceRecipeHash:receipt.sourceRecipeHash,reviewedAt:receipt.reviewedAt,
    cookingReview:{decision:'approved',rationale:receipt.cookingRationale},
    ingredientReview,scalingReview,scalingRationale:receipt.scalingRationale,
    instructionAuditRationale:receipt.instructionAuditRationale,
    instructionQuantityPhrases:resolutions.instructionQuantityPhrases??receipt.instructionQuantityPhrases??{},
    costTier:receipt.costTier??(/salmon|shrimp|cod|steak|trout|halibut/i.test(protein)?'$$$':/chicken|turkey|beef|pork|sausage/i.test(protein)?'$$':'$'),
    difficulty:receipt.difficulty??'Easy',
    equipmentNeeds:equipment.map(e=>({id:slug(e.label),label:e.label})),
    equipmentAnnotations:equipment.map(e=>({instructionIndex:e.instructionIndex,phrase:e.phrase,needId:slug(e.label),focus:'general'})),
    commerce:{decision:'no_purchase_needed',needId:null,reviewCategoryId:null,rationale:'The reviewed method uses ordinary household cookware.',noPurchaseAlternative:null},
    origin:{label:'Kwilt Kitchen, United States',region:'Contemporary home cooking; original Kwilt composition',markers:[{label:'Kwilt Kitchen, United States',latitude:39.7392,longitude:-104.9903}],map:{center:[-104.9903,39.7392],scale:700,highlightedCountryIds:['840']}},
    history:{paragraphs:receipt.historyParagraphs,sources:recipe.research.sources.map(({title,publisher,url})=>({title,publisher,url}))},
    publication:{publishedAt:null},
    heroImage:{state:'missing',storageRef:null,altText:`${recipe.title}, prepared with the ingredients in the recipe.`,width:null,height:null},
  };
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  const [preparedPath,receiptPath,resolutionsPath,outputPath]=process.argv.slice(2);
  if(!outputPath) throw new Error('Usage: node assemble.mjs prepared.json receipts.json resolutions.json authoring.json');
  const [prepared,receipts,resolutions]=await Promise.all([preparedPath,receiptPath,resolutionsPath].map(async p=>JSON.parse(await readFile(p,'utf8'))));
  const authoring=Object.fromEntries(prepared.catalog.map(recipe=>[recipe.rosterId,assembleAuthoring(recipe,prepared.drafts.find(d=>d.rosterId===recipe.rosterId),receipts[recipe.rosterId],resolutions[recipe.rosterId])]));
  await writeFile(outputPath,JSON.stringify(authoring,null,2)+'\n');
  process.stdout.write(`Assembled ${Object.keys(authoring).length} explicit author reviews; no images published.\n`);
}
