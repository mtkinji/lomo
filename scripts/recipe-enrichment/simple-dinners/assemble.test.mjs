import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalRecipeHash } from '../catalog.mjs';
import { assembleAuthoring } from './assemble.mjs';
const recipe={rosterId:'DI331',title:'Beans',ingredients:['2 cups beans'],instructions:['Warm in a large pot.'],research:{sources:[{url:'https://a.test',publisher:'A',title:'Beans'},{url:'https://b.test',publisher:'B',title:'Beans'}]}};
const draft={lines:[{position:0,quantityMin:2,parseConfidence:.98,originalText:'2 cups beans'}]};
const receipt={sourceRecipeHash:canonicalRecipeHash(recipe),reviewedAt:'2026-10-16',cookingRationale:'Reviewed beans quantity and heat-through method.',ingredientRationales:['Cooked volume, drained beans.'],scalingRationale:'Multiply beans; larger pot for double batch.',equipment:[{phrase:'large pot',instructionIndex:0,label:'Large pot'}],historyParagraphs:['Original composition.','Technique references.']};
test('assembles explicit review evidence while keeping imagery unpublished',()=>{const a=assembleAuthoring(recipe,draft,receipt);assert.equal(a.heroImage.state,'missing');assert.equal(a.publication.publishedAt,null);assert.equal(a.ingredientReview[0].rationale,receipt.ingredientRationales[0]);assert.deepEqual(a.scalingReview[0],{kind:'multiply'});});
test('does not silently resolve uncertain quantities or low-confidence ingredient parse',()=>{assert.throws(()=>assembleAuthoring(recipe,{lines:[{...draft.lines[0],quantityMin:null}]},receipt),/explicit scaling/);assert.throws(()=>assembleAuthoring(recipe,{lines:[{...draft.lines[0],parseConfidence:.5}]},receipt),/patch/);});
test('does not approve an unreviewed recipe or missing ingredient review',()=>{assert.throws(()=>assembleAuthoring(recipe,draft,null),/receipt/);assert.throws(()=>assembleAuthoring(recipe,draft,{...receipt,ingredientRationales:[]}),/ingredient/);});
test('rejects stale parser-resolution evidence',()=>{assert.throws(()=>assembleAuthoring(recipe,draft,receipt,{sourceRecipeHash:'stale',ingredientPatches:{}}),/stale/);});

test('requires the receipt itself to bind the reviewed source and rejects changed methods',()=>{assert.throws(()=>assembleAuthoring(recipe,draft,{...receipt,sourceRecipeHash:undefined}),/receipt.*hash/);assert.throws(()=>assembleAuthoring({...recipe,instructions:['Serve cold.']},draft,receipt),/stale/);});
