import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import { compileGroceryAuthority, compileHouseholdPlanGroceryAuthority, compileRecipeGroceryAuthority, type RecipeGrocerySource } from '../_shared/groceryCompiler.ts';
import { resolveHardPassReview } from '../_shared/mealPlanHardPass.ts';

const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
async function hash(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return[...new Uint8Array(bytes)].map((byte)=>byte.toString(16).padStart(2,'0')).join('');}

function parseRecipeSource(value: unknown): RecipeGrocerySource | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const ingredients = Array.isArray(source.ingredients) ? source.ingredients : null;
  if (typeof source.recipeId !== 'string'
    || typeof source.recipeVersionId !== 'string'
    || !Number.isInteger(source.recipeVersion)
    || typeof source.contentHash !== 'string'
    || typeof source.sourceType !== 'string'
    || typeof source.title !== 'string'
    || source.title.length > 500
    || (source.yieldQuantity !== null && typeof source.yieldQuantity !== 'number')
    || !ingredients
    || ingredients.length > 200) return null;
  const parsedIngredients: RecipeGrocerySource['ingredients'] = [];
  for (const value of ingredients) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const ingredient = value as Record<string, unknown>;
    if (typeof ingredient.id !== 'string'
      || typeof ingredient.originalText !== 'string'
      || !ingredient.originalText.trim()
      || ingredient.originalText.length > 500
      || typeof ingredient.optional !== 'boolean') return null;
    parsedIngredients.push({ id: ingredient.id, originalText: ingredient.originalText, optional: ingredient.optional });
  }
  return {
    recipeId: source.recipeId,
    recipeVersionId: source.recipeVersionId,
    recipeVersion: Number(source.recipeVersion),
    contentHash: source.contentHash,
    sourceType: source.sourceType,
    title: source.title,
    yieldQuantity: source.yieldQuantity === null ? null : Number(source.yieldQuantity),
    ingredients: parsedIngredients,
  };
}

serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders}); if(req.method!=='POST')return json(405,{error:{code:'method_not_allowed'}});
  try{
    const {supabase:admin,user}=await getAuthenticatedUser(req); const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
    const {data:binding}=await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id',user.id).eq('status','active').maybeSingle(); if(!binding?.person_id)return json(409,{error:{code:'person_binding_required'}});
    const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')??'')?.[1]; const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_ANON_KEY')??Deno.env.get('SUPABASE_PUBLISHABLE_KEY'); if(!token||!url||!key)throw new Error('configuration_error');
    const userClient=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});

    const recipeSource=parseRecipeSource(body?.recipe); const servings=Number(body?.servings);
    if(recipeSource){
      if(!Number.isFinite(servings)||servings<=0)return json(400,{error:{code:'invalid_request'}});
      let authoritativeIngredients:Array<{id:string;original_text:string;optional:boolean}>|null=null;
      if(recipeSource.sourceType!=='catalog'){
        const {data:version,error:versionError}=await userClient.from('kwilt_recipe_versions').select('id,recipe_id,version,content_hash,ingredients:kwilt_recipe_ingredients(id,original_text,optional),recipe:kwilt_recipes!inner(id,lifecycle)').eq('id',recipeSource.recipeVersionId).maybeSingle();
        if(versionError)throw versionError;
        const recipeRelation=Array.isArray(version?.recipe)?version.recipe[0]:version?.recipe;
        if(!version
          || version.recipe_id!==recipeSource.recipeId
          || version.version!==recipeSource.recipeVersion
          || version.content_hash!==recipeSource.contentHash
          || recipeRelation?.lifecycle==='deleted')throw new Error('missing_recipe_version');
        authoritativeIngredients=(version.ingredients??[]) as Array<{id:string;original_text:string;optional:boolean}>;
      }
      const compiled=compileRecipeGroceryAuthority({source:recipeSource,servings,authoritativeIngredients}); const payloadHash=await hash(compiled.items);
      const {data:receipt,error}=await userClient.rpc('compile_kwilt_recipe_grocery_list',{p_recipe_source:{...recipeSource,servings},p_payload_hash:payloadHash,p_compiled_items:compiled.items}); if(error)throw error;
      return json(200,{receipt});
    }

    const planAction=body?.planAction==='send'||body?.planAction==='remove'||body?.planAction==='return'?body.planAction:null;
    if(planAction){
      const planId=typeof body?.planId==='string'?body.planId:''; const expectedVersion=Number(body?.expectedVersion);
      const acknowledgeHardPasses=body?.acknowledgeHardPasses===true;
      const candidateIds=Array.isArray(body?.candidateIds)?body.candidateIds.filter((value):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)):[];
      if(!planId||!Number.isInteger(expectedVersion)||expectedVersion<1||candidateIds.length<1||candidateIds.length>60||candidateIds.length!==new Set(candidateIds).size)return json(400,{error:{code:'invalid_request'}});
      const {data:plan,error:planError}=await admin.from('kwilt_meal_plans').select('id,household_id,organizer_person_id,version,state').eq('id',planId).single(); if(planError)throw planError;
      const membershipResult=plan.household_id
        ? await admin.from('kwilt_household_memberships').select('role').eq('household_id',plan.household_id).eq('person_id',binding.person_id).eq('status','active').maybeSingle()
        : {data:null,error:null};
      const {data:membership,error:membershipError}=membershipResult; if(membershipError)throw membershipError;
      const {data:candidateRows,error:candidateError}=await admin.from('kwilt_meal_plan_candidates').select('id,lifecycle_state,removed_grocery_behavior,recipe_snapshot,hard_pass_overridden_at').eq('plan_id',planId); if(candidateError)throw candidateError;
      if(planAction==='send'&&!acknowledgeHardPasses){
        const {data:hardPassRows,error:hardPassError}=await admin.from('kwilt_meal_candidate_reactions').select('candidate_id,created_at').in('candidate_id',candidateIds).eq('reaction','hard_pass'); if(hardPassError)throw hardPassError;
        const blocked=resolveHardPassReview({selectedCandidateIds:candidateIds,candidates:(candidateRows??[]).map((candidate)=>({id:candidate.id,hardPassOverriddenAt:candidate.hard_pass_overridden_at??null})),hardPasses:(hardPassRows??[]).map((reaction)=>({candidateId:reaction.candidate_id,createdAt:reaction.created_at}))});
        if(blocked.length)throw new Error('hard_pass_review_required');
      }
      const selected=new Set(candidateIds); const candidates=(candidateRows??[]).filter((candidate)=>planAction!=='return'||!selected.has(candidate.id)).map((candidate)=>({
        id:candidate.id,
        lifecycleState:(selected.has(candidate.id)?(planAction==='send'?'sent':'removed'):candidate.lifecycle_state) as 'sent'|'removed',
        removedGroceryBehavior:selected.has(candidate.id)&&planAction==='remove'?null:(candidate.removed_grocery_behavior??null) as 'kept'|null,
        recipeSnapshot:candidate.recipe_snapshot&&typeof candidate.recipe_snapshot==='object'?candidate.recipe_snapshot as Record<string,unknown>:null,
      })).filter((candidate)=>candidate.lifecycleState==='sent'||candidate.lifecycleState==='removed'&&candidate.removedGroceryBehavior==='kept');
      if(candidateIds.some((id)=>!candidateRows?.some((candidate)=>candidate.id===id&&candidate.recipe_snapshot)))throw new Error('invalid_household_plan_candidate');
      const versionIds=[...new Set(candidates.flatMap((candidate)=>typeof candidate.recipeSnapshot?.recipeVersionId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.recipeSnapshot.recipeVersionId)?[candidate.recipeSnapshot.recipeVersionId]:[]))];
      const {data:recipeRows,error:recipeError}=versionIds.length?await admin.from('kwilt_recipe_versions').select('id,ingredients:kwilt_recipe_ingredients(id,original_text,optional),recipe:kwilt_recipes!inner(lifecycle)').in('id',versionIds):{data:[],error:null}; if(recipeError)throw recipeError;
      const ingredientsByVersionId:Record<string,Array<{id:string;original_text:string;optional:boolean}>>={}; for(const row of recipeRows??[]){const recipeRelation=Array.isArray(row.recipe)?row.recipe[0]:row.recipe;if(recipeRelation?.lifecycle==='deleted')throw new Error('missing_recipe_version');ingredientsByVersionId[row.id]=(row.ingredients??[]) as Array<{id:string;original_text:string;optional:boolean}>;}
      const compiled=compileHouseholdPlanGroceryAuthority({plan,expectedVersion,actorPersonId:binding.person_id,actorRole:membership?.role??null,candidates,ingredientsByVersionId}); const payloadHash=await hash(compiled.items);
      const persistenceRpc=planAction==='return'
        ? plan.household_id?'return_kwilt_household_plan_candidate_to_ideas':'return_kwilt_personal_plan_candidate_to_ideas'
        : plan.household_id?'sync_kwilt_household_plan_groceries_with_hard_pass_review':'sync_kwilt_personal_plan_groceries';
      const persistenceArgs=planAction==='return'
        ? {p_actor_person_id:binding.person_id,p_plan_id:planId,p_expected_version:expectedVersion,p_candidate_ids:candidateIds,p_payload_hash:payloadHash,p_compiled_items:compiled.items}
        : {p_actor_person_id:binding.person_id,p_plan_id:planId,p_expected_version:expectedVersion,p_action:planAction,p_candidate_ids:candidateIds,p_payload_hash:payloadHash,p_compiled_items:compiled.items,p_acknowledge_hard_passes:acknowledgeHardPasses};
      const {data:receipt,error}=await admin.rpc(persistenceRpc,persistenceArgs); if(error)throw error;
      return json(200,{receipt});
    }

    const planId=typeof body?.planId==='string'?body.planId:''; const expectedVersion=Number(body?.expectedVersion); const rebaseFromListId=typeof body?.rebaseFromListId==='string'?body.rebaseFromListId:null; const expectedRebaseRevision=body?.expectedRebaseRevision===undefined?null:Number(body.expectedRebaseRevision);
    if(!planId||!Number.isInteger(expectedVersion)||expectedVersion<1||(rebaseFromListId===null)!==(expectedRebaseRevision===null)||expectedRebaseRevision!==null&&(!Number.isInteger(expectedRebaseRevision)||expectedRebaseRevision<1))return json(400,{error:{code:'invalid_request'}});
    const {data:plan,error:planError}=await admin.from('kwilt_meal_plans').select('id,version,state,organizer_person_id').eq('id',planId).single(); if(planError)throw planError;
    const {data:entries,error:entryError}=await admin.from('kwilt_meal_plan_entries').select('id,plan_version,servings,recipe_snapshot').eq('plan_id',planId).eq('plan_version',expectedVersion).order('position'); if(entryError)throw entryError;
    const versionIds=[...new Set((entries??[]).flatMap((entry)=>typeof entry.recipe_snapshot?.recipeVersionId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.recipe_snapshot.recipeVersionId)?[entry.recipe_snapshot.recipeVersionId]:[]))];
    const {data:recipeRows,error:recipeError}=versionIds.length?await admin.from('kwilt_recipe_versions').select('id,recipe_id,ingredients:kwilt_recipe_ingredients(id,original_text,optional),recipe:kwilt_recipes!inner(lifecycle)').in('id',versionIds):{data:[],error:null}; if(recipeError)throw recipeError;
    const ingredientsByVersionId:Record<string,Array<{id:string;original_text:string;optional:boolean}>>={}; for(const row of recipeRows??[]){const recipeRelation=Array.isArray(row.recipe)?row.recipe[0]:row.recipe;if(recipeRelation?.lifecycle==='deleted')throw new Error('missing_recipe_version');ingredientsByVersionId[row.id]=(row.ingredients??[]) as Array<{id:string;original_text:string;optional:boolean}>;}
    const compiled=compileGroceryAuthority({plan,expectedVersion,actorPersonId:binding.person_id,entries:entries??[],ingredientsByVersionId}); const payloadHash=await hash(compiled.items);
    const {data:receipt,error}=await userClient.rpc('compile_kwilt_grocery_list',{p_plan_id:planId,p_expected_plan_version:expectedVersion,p_payload_hash:payloadHash,p_compiled_items:compiled.items,p_rebase_from_list_id:rebaseFromListId,p_expected_rebase_revision:expectedRebaseRevision}); if(error)throw error;
    return json(200,{receipt});
  }catch(error){const unauthorized=isAuthenticationError(error);const code=error instanceof Error&&['stale_or_unfinalized_meal_plan','grocery_plan_not_owned','missing_recipe_version','invalid_recipe_grocery_source','grocery_compilation_idempotency_conflict','stale_grocery_rebase_source','grocery_rebase_idempotency_conflict','invalid_grocery_rebase','household_plan_grocery_manage_forbidden','personal_plan_grocery_manage_forbidden','stale_household_plan','invalid_household_plan_candidate','hard_pass_review_required'].includes(error.message)?error.message:unauthorized?'unauthorized':'grocery_compile_failed';return json(unauthorized?401:code==='grocery_compile_failed'?500:409,{error:{code,message:unauthorized?'Sign in to compile groceries.':'Groceries could not be compiled from the current source.'}});}
});
