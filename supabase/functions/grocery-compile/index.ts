import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import { compileGroceryAuthority } from '../_shared/groceryCompiler.ts';

const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
async function hash(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return[...new Uint8Array(bytes)].map((byte)=>byte.toString(16).padStart(2,'0')).join('');}

serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders}); if(req.method!=='POST')return json(405,{error:{code:'method_not_allowed'}});
  try{
    const {supabase:admin,user}=await getAuthenticatedUser(req); const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
    const planId=typeof body?.planId==='string'?body.planId:''; const expectedVersion=Number(body?.expectedVersion); const rebaseFromListId=typeof body?.rebaseFromListId==='string'?body.rebaseFromListId:null; const expectedRebaseRevision=body?.expectedRebaseRevision===undefined?null:Number(body.expectedRebaseRevision);
    if(!planId||!Number.isInteger(expectedVersion)||expectedVersion<1||(rebaseFromListId===null)!==(expectedRebaseRevision===null)||expectedRebaseRevision!==null&&(!Number.isInteger(expectedRebaseRevision)||expectedRebaseRevision<1))return json(400,{error:{code:'invalid_request'}});
    const {data:binding}=await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id',user.id).eq('status','active').maybeSingle(); if(!binding?.person_id)return json(409,{error:{code:'person_binding_required'}});
    const {data:plan,error:planError}=await admin.from('kwilt_meal_plans').select('id,version,state,organizer_person_id').eq('id',planId).single(); if(planError)throw planError;
    const {data:entries,error:entryError}=await admin.from('kwilt_meal_plan_entries').select('id,plan_version,servings,recipe_snapshot').eq('plan_id',planId).eq('plan_version',expectedVersion).order('position'); if(entryError)throw entryError;
    const versionIds=[...new Set((entries??[]).flatMap((entry)=>typeof entry.recipe_snapshot?.recipeVersionId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.recipe_snapshot.recipeVersionId)?[entry.recipe_snapshot.recipeVersionId]:[]))];
    const {data:recipeRows,error:recipeError}=versionIds.length?await admin.from('kwilt_recipe_versions').select('id,recipe_id,ingredients:kwilt_recipe_ingredients(id,original_text,optional),recipe:kwilt_recipes!inner(lifecycle)').in('id',versionIds):{data:[],error:null}; if(recipeError)throw recipeError;
    const ingredientsByVersionId:Record<string,Array<{id:string;original_text:string;optional:boolean}>>={}; for(const row of recipeRows??[]){if((row as any).recipe?.lifecycle==='deleted')throw new Error('missing_recipe_version');ingredientsByVersionId[row.id]=(row as any).ingredients??[];}
    const compiled=compileGroceryAuthority({plan,expectedVersion,actorPersonId:binding.person_id,entries:entries??[],ingredientsByVersionId}); const payloadHash=await hash(compiled.items);
    const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')??'')?.[1]; const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_ANON_KEY')??Deno.env.get('SUPABASE_PUBLISHABLE_KEY'); if(!token||!url||!key)throw new Error('configuration_error');
    const userClient=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:receipt,error}=await userClient.rpc('compile_kwilt_grocery_list',{p_plan_id:planId,p_expected_plan_version:expectedVersion,p_payload_hash:payloadHash,p_compiled_items:compiled.items,p_rebase_from_list_id:rebaseFromListId,p_expected_rebase_revision:expectedRebaseRevision}); if(error)throw error;
    return json(200,{receipt});
  }catch(error){const unauthorized=isAuthenticationError(error);const code=error instanceof Error&&['stale_or_unfinalized_meal_plan','grocery_plan_not_owned','missing_recipe_version','grocery_compilation_idempotency_conflict','stale_grocery_rebase_source','grocery_rebase_idempotency_conflict','invalid_grocery_rebase'].includes(error.message)?error.message:unauthorized?'unauthorized':'grocery_compile_failed';return json(unauthorized?401:code==='grocery_compile_failed'?500:409,{error:{code,message:unauthorized?'Sign in to compile groceries.':'Groceries could not be compiled from the current plan.'}});}
});
