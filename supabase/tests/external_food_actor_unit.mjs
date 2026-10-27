const { PGlite } = await import(process.env.KWILT_PGLITE_MODULE ?? '@electric-sql/pglite');
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../../',import.meta.url).pathname; const db=new PGlite(); let count=0;
const read=p=>readFileSync(root+p,'utf8');
await db.exec(read('supabase/tests/fixtures/external_food_unit_schema.sql'));
function fn(path,name){const s=read(path),start=s.indexOf('create or replace function public.'+name+'(');if(start<0)throw Error(name);return s.slice(start,s.indexOf('\n$$;',start)+4);}
for(const name of ['kwilt_is_meal_plan_organizer','create_kwilt_meal_plan'])await db.exec(fn('supabase/migrations/20260827221500_food_conversational_control.sql',name));
for(const name of ['add_kwilt_shared_meal_candidate','get_kwilt_shared_meal_cart'])await db.exec(fn('supabase/migrations/20260812023544_collaborative_household_recipe_plan.sql',name));
for(const name of ['add_kwilt_grocery_item','update_kwilt_grocery_item'])await db.exec(fn('supabase/migrations/20260806030000_groceries.sql',name));
await db.exec(fn('supabase/migrations/20260812023544_collaborative_household_recipe_plan.sql','set_kwilt_grocery_item_state'));
await db.exec(fn('supabase/migrations/20260827221500_food_conversational_control.sql','apply_kwilt_grocery_list_conversational'));
await db.exec(fn('supabase/migrations/20260903142344_restore_personal_meal_plan_grocery_authority.sql','sync_kwilt_personal_plan_groceries'));
await db.exec(fn('supabase/migrations/20260827221500_food_conversational_control.sql','apply_kwilt_meal_plan_conversational'));
await db.exec(fn('supabase/migrations/20260806020000_meal_planning.sql','update_kwilt_meal_plan'));
await db.exec(read('supabase/migrations/20261026021448_external_food_actor_execution.sql'));
await db.exec(read('supabase/tests/external_food_actor_execution.sql'));count+=4;
const u='10000000-0000-4000-8000-000000000001', person='20000000-0000-4000-8000-000000000001', household='30000000-0000-4000-8000-000000000001', recipe='40000000-0000-4000-8000-000000000001', version='50000000-0000-4000-8000-000000000001', candidate='60000000-0000-4000-8000-000000000001';
await db.exec(`insert into auth.users(id) values('${u}');insert into kwilt_people values('${person}','Actor');insert into kwilt_person_auth_bindings values('${u}','${person}','active');insert into kwilt_household_memberships(id,household_id,person_id,status,role) values(gen_random_uuid(),'${household}','${person}','active','owner');insert into kwilt_recipes(id,owner_person_id) values('${recipe}','${person}');insert into kwilt_recipe_versions values('${version}','${recipe}','hash','verified');set role service_role;select set_config('request.jwt.claims','{"role":"service_role"}',false);`);
const call=async(id,op,target,payload,args={})=>(await db.query('select public.execute_kwilt_external_food_operations($1::uuid,$2,$3,$4,$5::jsonb,$6::jsonb) as result',[u,'fixture-client',id,op,JSON.stringify(args),JSON.stringify([{type:op,targetId:target,payload}])])).rows[0].result;
const claims=async()=>assert.equal((await db.query('select auth.jwt() as claims')).rows[0].claims.role,'service_role');
let r=await call('ensure-personal','meal_planning.cart.ensure',null,{householdId:null});const personal=r.output.planId;assert.equal(r.status,'completed');assert.equal(r.output.version,1);await claims();count++;
assert.equal((await call('ensure-personal2','meal_planning.cart.ensure',null,{householdId:null})).output.planId,personal);count++;
assert.equal((await call('ensure-personal','meal_planning.cart.ensure',null,{householdId:null})).replayed,true);count++;
await assert.rejects(()=>call('ensure-personal','meal_planning.cart.ensure',null,{householdId:null},{changed:true}),/idempotency_key_conflict/);await claims();count++;
await assert.rejects(()=>call('forbidden-house','meal_planning.cart.ensure',null,{householdId:'30000000-0000-4000-8000-000000000099'}),/meal_plan_organizer_required/);await claims();count++;
r=await call('ensure-shared','meal_planning.cart.ensure',null,{householdId:household});const shared=r.output.planId;
await db.exec(`insert into kwilt_meal_plans(household_id,organizer_person_id,organizer_membership_id,horizon,updated_at) select '${household}','${person}',id,'{"kind":"bounded"}'::jsonb,now()+interval '1 day' from kwilt_household_memberships where household_id='${household}';`);
assert.equal((await call('ensure-shared-again','meal_planning.cart.ensure',null,{householdId:household})).output.planId,shared);count++;
const candidateBody={id:candidate,kind:'recipe',title:'Dinner',recipeSnapshot:{recipeId:recipe,recipeVersionId:version,contentHash:'hash',recipeScaleMultiplier:1,plannedPortions:6}};
r=await call('add-shared','meal_planning.cart.add',shared,{expectedVersion:1,candidate:candidateBody,timing:{kind:'occasion',date:'2026-10-27',mealPeriod:'dinner'}});assert.equal(r.output.planId,shared);assert.equal(r.output.version,2);await claims();count++;
await assert.rejects(()=>call('stale-add','meal_planning.cart.add',shared,{expectedVersion:1,candidate:{...candidateBody,id:'60000000-0000-4000-8000-000000000002'}}),/stale_meal_plan_version/);count++;
assert.equal((await call('add-shared','meal_planning.cart.add',shared,{expectedVersion:1,candidate:candidateBody})).replayed,true);count++;
let h=(await db.query('select public.get_kwilt_external_meal_cart_history($1::uuid,$2::uuid) as history',[u,shared])).rows[0].history;
assert.equal(h.activeCandidates[0].timing.date,'2026-10-27');assert.equal(h.history.length,0);count++;
r=await call('remove-shared','meal_planning.cart.remove',candidate,{expectedVersion:2});assert.equal(r.output.state,'removed');assert.equal(r.output.version,3);count++;
h=(await db.query('select public.get_kwilt_external_meal_cart_history($1::uuid,$2::uuid) as history',[u,shared])).rows[0].history;assert.equal(h.history.length,1);assert.equal(h.activeCandidates.length,0);count++;
assert.equal((await db.query('select count(*)::int as n from kwilt_recipes')).rows[0].n,1);assert.equal((await db.query('select count(*)::int as n from kwilt_meal_plan_candidates')).rows[0].n,1);count++;
await assert.rejects(()=>call('remove-again','meal_planning.cart.remove',candidate,{expectedVersion:3}),/stale_plan_candidate/);count++;
let snap=(await db.query('select public.get_kwilt_external_food_control_snapshot($1::uuid) as snapshot',[u])).rows[0].snapshot;assert.equal(snap.actorPersonId,person);assert.equal(snap.mealPlans.length,3);await claims();count++;
await db.exec(`update auth.users set is_anonymous=true where id='${u}';`);await assert.rejects(()=>call('anon','meal_planning.cart.ensure',null,{householdId:null}),/external_food_actor_unavailable/);await claims();count++;
await db.exec(`update auth.users set is_anonymous=false,banned_until=now()+interval '1 hour' where id='${u}';`);await assert.rejects(()=>call('banned','meal_planning.cart.ensure',null,{householdId:null}),/external_food_actor_unavailable/);count++;
await db.exec(`update auth.users set banned_until=null,deleted_at=now() where id='${u}';`);await assert.rejects(()=>call('deleted','meal_planning.cart.ensure',null,{householdId:null}),/external_food_actor_unavailable/);count++;

await db.exec(`update auth.users set deleted_at=null where id='${u}';`);
const candidate2='60000000-0000-4000-8000-000000000002', ingredient='70000000-0000-4000-8000-000000000001';
await db.exec(`insert into kwilt_recipe_ingredients values('${ingredient}','${version}','2 cups rice',false);`);
r=await call('add-personal','meal_planning.cart.add',personal,{expectedVersion:1,candidate:{...candidateBody,id:candidate2}});assert.equal(r.output.version,2);count++;
const compiled={concept:'rice',quantityMin:2,quantityMax:2,unit:'cup',sources:[{kind:'recipe_ingredient',planCandidateId:candidate2,recipeVersionId:version,ingredientLineId:ingredient,originalText:'2 cups rice',quantityMin:2,quantityMax:2,unit:'cup',optional:false}]};
r=await call('compile-personal','groceries.compile',personal,{expectedVersion:2,planAction:'send',candidateIds:[candidate2],payloadHash:'fixture-1',compiledItems:[compiled]});
let grocery=r.output.groceryListId;assert.equal(r.output.version,3);assert.equal(r.output.rebaseConflictCount,0);count++;
let rice=(await db.query('select id from kwilt_grocery_items where grocery_list_id=$1',[grocery])).rows[0].id;
r=await call('manual','groceries.item.add',grocery,{expectedVersion:1,title:'Dish soap',sourceKind:'manual'});assert.equal(r.output.revision,2);count++;
r=await call('edit','groceries.item.update',rice,{expectedVersion:2,patch:{quantityMin:3,quantityMax:3,note:'Family edit'},reason:'Need extra'});assert.equal(r.output.revision,3);count++;
r=await call('state','groceries.item.set_state',rice,{expectedVersion:3,state:'purchased'});assert.equal(r.output.revision,4);count++;
const candidate3='60000000-0000-4000-8000-000000000003';
r=await call('add-more','meal_planning.cart.add',personal,{expectedVersion:3,candidate:{...candidateBody,id:candidate3}});assert.equal(r.output.version,4);count++;
const merged={...compiled,quantityMin:4,quantityMax:4,sources:[...compiled.sources,{...compiled.sources[0],planCandidateId:candidate3}]};
r=await call('compile-more','groceries.compile',personal,{expectedVersion:4,planAction:'send',candidateIds:[candidate3],payloadHash:'fixture-2',compiledItems:[merged]});
const newGrocery=r.output.groceryListId;assert.notEqual(newGrocery,grocery);assert.equal(r.output.rebaseConflictCount,1);assert.equal(r.output.warnings.length,1);count++;
const rows=(await db.query('select concept,quantity_min,state,note from kwilt_grocery_items where grocery_list_id=$1 order by position',[newGrocery])).rows;
assert.deepEqual(rows,[{concept:'rice',quantity_min:'3',state:'purchased',note:'Family edit'},{concept:'Dish soap',quantity_min:null,state:'needed',note:null}]);count++;
assert.equal((await db.query('select status from kwilt_grocery_lists where id=$1',[grocery])).rows[0].status,'stale');count++;
await assert.rejects(()=>call('old-edit','groceries.item.update',rice,{expectedVersion:4,patch:{note:'stale edit'},reason:null}),/stale_grocery_list_revision/);count++;
r=await call('made','meal_planning.cart.mark_made',candidate2,{expectedVersion:5});assert.equal(r.output.state,'made');count++;

h=(await db.query('select public.get_kwilt_external_meal_cart_history($1::uuid,$2::uuid) as history',[u,personal])).rows[0].history;
assert.deepEqual(h.groceryList,{id:newGrocery,revision:5,status:'review_needed'});assert.equal(h.history[0].id,candidate2);assert.equal(h.activeCandidates[0].id,candidate3);count++;
const soap=(await db.query('select id from kwilt_grocery_items where grocery_list_id=$1 and concept=$2',[newGrocery,'Dish soap'])).rows[0].id;
r=await call('remove-manual','groceries.item.set_state',soap,{expectedVersion:5,state:'removed'});assert.equal(r.output.state,'skipped');count++;
assert.equal((await call('remove-manual','groceries.item.set_state',soap,{expectedVersion:5,state:'removed'})).replayed,true);count++;
await claims();

r=await call('legacy-create','meal_planning.plan.create',null,{expectedVersion:0,householdId:null,horizon:{kind:'open'}});assert.equal(r.output.version,1);count++;
r=await call('legacy-update','meal_planning.plan.update',r.output.planId,{expectedVersion:1,horizon:{kind:'open'}});assert.equal(r.output.version,2);count++;
await assert.rejects(()=>call('legacy-candidate','meal_planning.candidate.remove',personal,{expectedVersion:6,candidateId:candidate3}),/operation_contract_mismatch/);count++;

// Focused rebase mapping: two corrected old lines must never race to overwrite
// one merged line, and a state-only correction must not freeze a new quantity.
async function correctionFixture(suffix,oldQuantities,newQuantity,stateOnly=false){
 const base=`80000000-0000-4000-8000-${suffix.padStart(12,'0')}`;
 const ids=(await db.query('select gen_random_uuid() as previous, gen_random_uuid() as current,gen_random_uuid() as item')).rows[0];
 await db.query(`insert into kwilt_grocery_lists(id,owner_person_id,source_meal_plan_id,revision,status) values($1,$2,$3,1,'stale')`,[ids.previous,person,personal]);
 await db.query(`insert into kwilt_grocery_lists(id,owner_person_id,source_meal_plan_id,revision,rebased_from_list_id,status) values($1,$2,$3,2,$4,'review_needed')`,[ids.current,person,personal,ids.previous]);
 await db.query(`insert into kwilt_grocery_items(id,grocery_list_id,concept,quantity_min,quantity_max,unit,state) values($1,$2,'rice',$3,$3,'cup','needed')`,[ids.item,ids.current,newQuantity]);
 await db.query(`insert into kwilt_grocery_item_sources(grocery_item_id,kind,recipe_version_id,ingredient_line_id) values($1,'recipe_ingredient',$2,$3)`,[ids.item,version,base]);
 for(const q of oldQuantities){
  const old=(await db.query(`insert into kwilt_grocery_items(grocery_list_id,concept,quantity_min,quantity_max,unit,state,note) values($1,'rice',$2,$2,'cup',$3,$4) returning id`,[ids.previous,q,stateOnly?'purchased':'needed',stateOnly?null:'kept note'])).rows[0].id;
  await db.query(`insert into kwilt_grocery_item_sources(grocery_item_id,kind,recipe_version_id,ingredient_line_id) values($1,'recipe_ingredient',$2,$3)`,[old,version,base]);
  const before={concept:'rice',quantity_min:q,quantity_max:q,unit:'cup',state:'needed',note:null};
  const after={...before,state:stateOnly?'purchased':'needed',note:stateOnly?null:'kept note'};
  await db.query(`insert into kwilt_grocery_item_corrections(grocery_item_id,corrected_by_person_id,before_value,after_value) values($1,$2,$3::jsonb,$4::jsonb)`,[old,person,JSON.stringify(before),JSON.stringify(after)]);
 }
 await db.exec('begin');
 await db.query('select public.kwilt_external_food_actor_context($1::uuid)',[u]);
 const conflicts=(await db.query('select public.kwilt_preserve_external_grocery_corrections($1::uuid) as n',[ids.current])).rows[0].n;
 await db.exec('commit');
 const item=(await db.query('select quantity_min,note,state from kwilt_grocery_items where id=$1',[ids.item])).rows[0];
 return {conflicts,item};
}
assert.deepEqual(await correctionFixture('1',[1,2],3),{conflicts:2,item:{quantity_min:'3',note:null,state:'needed'}});count++;
assert.deepEqual(await correctionFixture('2',[2],4,true),{conflicts:1,item:{quantity_min:'4',note:null,state:'purchased'}});count++;
await claims();
console.log(`${count} isolated SQL runtime assertions passed (NOT full migration-chain verification)`);await db.close();




