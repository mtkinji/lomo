import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, mergeReviews, reviewStatus, summary } from './review-state.mjs';
const variants=[{id:'a',revision:1},{id:'b',revision:2}];
const review={status:'needs_changes',priority:'high',notes:'Move the source above actions',fixtureVersion:1,updatedAt:'2026-09-09T00:00:00Z'};
test('round trips valid reviews without losing unrelated local records',()=>{
 const incoming=parseImport(JSON.stringify({schemaVersion:1,reviews:{a:review}}),variants);
 const b={...review,notes:'Keep this local note',fixtureVersion:2};
 assert.deepEqual(mergeReviews({b},incoming),{b,a:review});
});
test('rejects bad schema, unknown variants and invalid review fields atomically',()=>{
 for(const doc of [{schemaVersion:2,reviews:{a:review}},{schemaVersion:1,reviews:{unknown:review}},{schemaVersion:1,reviews:{a:{...review,status:'shipped'}}},{schemaVersion:1,reviews:{a:{...review,notes:4}}}]) assert.throws(()=>parseImport(JSON.stringify(doc),variants));
});
test('changed fixtures keep notes but no longer count as approved',()=>{
 const reviews={a:{...review,status:'approved'},b:{...review,status:'approved'}};
 assert.equal(reviewStatus(reviews.b,variants[1]),'recheck');
 assert.deepEqual(summary(variants,reviews),{total:2,unreviewed:0,needs_changes:0,approved:1,deferred:0,recheck:1});
});
