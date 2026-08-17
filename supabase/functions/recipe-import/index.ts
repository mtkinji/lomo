import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, getSupabaseAdmin, json, requireUserId } from '../_shared/calendarUtils.ts';
import {
  extractSchemaRecipe,
  fetchRecipeHtml,
  parseRecipeImportRequest,
  type ExtractedSchemaRecipe,
  type RecipeImportRequest,
} from '../_shared/recipeImport.ts';
import {
  buildRecipeImportExtractionSchema,
  recipeImportExtractionInstruction,
  validateRecipeEquipmentRequirements,
  type ExtractedRecipeEquipmentRequirement,
} from '../_shared/recipeEquipmentExtraction.ts';

type ExtractedRecipe = Omit<ExtractedSchemaRecipe, 'sourceUrl'> & {
  sourceUrl: string | null;
  fieldEvidence: Array<{ fieldPath: string; sourceText: string | null; confidence: number; warning: string | null }>;
  warnings: string[];
  equipmentRequirements: ExtractedRecipeEquipmentRequirement[];
};

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeDataUrl(value:string):{bytes:Uint8Array;contentType:string}{const match=/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i.exec(value);if(!match)throw new Error('unsupported_source_type');const binary=atob(match[2]);const bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);return{bytes,contentType:match[1]};}

function deterministicExtraction(recipe: ExtractedSchemaRecipe): ExtractedRecipe {
  return {
    ...recipe,
    fieldEvidence: [
      { fieldPath: 'title', sourceText: recipe.title, confidence: 1, warning: null },
      ...recipe.ingredients.map((line, index) => ({ fieldPath: `ingredients[${index}].originalText`, sourceText: line.originalText, confidence: 1, warning: null })),
      ...recipe.instructions.map((step, index) => ({ fieldPath: `instructions[${index}].text`, sourceText: step.text, confidence: 1, warning: null })),
    ],
    warnings: [],
    equipmentRequirements: [],
  };
}

function validateAiExtraction(value: unknown, sourceUrl: string | null): ExtractedRecipe {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_extraction');
  const row = value as Record<string, unknown>;
  const title = typeof row.title === 'string' ? row.title.trim().slice(0, 160) : '';
  const ingredients = Array.isArray(row.ingredients) ? row.ingredients.slice(0, 200).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const originalText = typeof (item as Record<string, unknown>).originalText === 'string' ? String((item as Record<string, unknown>).originalText).trim().slice(0, 1000) : '';
    return originalText ? [{ id: `import-ingredient-${index + 1}`, originalText }] : [];
  }) : [];
  const instructions = Array.isArray(row.instructions) ? row.instructions.slice(0, 200).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const text = typeof (item as Record<string, unknown>).text === 'string' ? String((item as Record<string, unknown>).text).trim().slice(0, 8000) : '';
    return text ? [{ id: `import-step-${index + 1}`, text }] : [];
  }) : [];
  if (!title) throw new Error('invalid_extraction');
  const evidenceRows = Array.isArray(row.fieldEvidence) ? row.fieldEvidence : [];
  const fieldEvidence = evidenceRows.slice(0, 1000).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const evidence = item as Record<string, unknown>;
    const fieldPath = typeof evidence.fieldPath === 'string' ? evidence.fieldPath.slice(0, 320) : '';
    if (!fieldPath) return [];
    return [{
      fieldPath,
      sourceText: typeof evidence.sourceText === 'string' ? evidence.sourceText.slice(0, 8000) : null,
      confidence: typeof evidence.confidence === 'number' ? Math.max(0, Math.min(1, evidence.confidence)) : 0,
      warning: typeof evidence.warning === 'string' ? evidence.warning.slice(0, 1000) : null,
    }];
  });
  return {
    title,
    description: typeof row.description === 'string' ? row.description.slice(0, 4000) : null,
    yieldQuantity: typeof row.yieldQuantity === 'number' && row.yieldQuantity > 0 ? row.yieldQuantity : null,
    yieldUnit: typeof row.yieldUnit === 'string' ? row.yieldUnit.slice(0, 80) : null,
    prepMinutes: Number.isInteger(row.prepMinutes) && Number(row.prepMinutes) >= 0 ? Number(row.prepMinutes) : null,
    cookMinutes: Number.isInteger(row.cookMinutes) && Number(row.cookMinutes) >= 0 ? Number(row.cookMinutes) : null,
    ingredients,
    instructions,
    equipmentRequirements: validateRecipeEquipmentRequirements(row.equipmentRequirements, instructions.map((step) => step.text)),
    sourceTitle: typeof row.sourceTitle === 'string' ? row.sourceTitle.slice(0, 512) : null,
    sourceAuthor: typeof row.sourceAuthor === 'string' ? row.sourceAuthor.slice(0, 512) : null,
    sourceUrl,
    fieldEvidence,
    warnings: Array.isArray(row.warnings) ? row.warnings.filter((item): item is string => typeof item === 'string').slice(0, 50).map((item) => item.slice(0, 1000)) : [],
  };
}

async function aiExtraction(request: RecipeImportRequest, sourceText: string | null): Promise<{ recipe: ExtractedRecipe; model: string }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  if (!apiKey) throw new Error('provider_unavailable');
  const model = Deno.env.get('RECIPE_IMPORT_MODEL')?.trim() || 'gpt-4.1-mini';
  const content: Array<Record<string, unknown>> = [{
    type: 'text',
    text: recipeImportExtractionInstruction(sourceText ?? ''),
  }];
  for (const imageUrl of request.imageDataUrls) content.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } });
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [{ role: 'system', content: 'You transcribe private recipes into review drafts. You do not complete missing facts.' }, { role: 'user', content }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'recipe_import_draft', strict: true,
          schema: buildRecipeImportExtractionSchema(),
        },
      },
    }),
  });
  const payload = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok) throw new Error('provider_unavailable');
  const output = payload?.choices?.[0]?.message?.content;
  if (typeof output !== 'string') throw new Error('invalid_extraction');
  return { recipe: validateAiExtraction(JSON.parse(output), request.sourceUrl), model };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed.' } });
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > 85_000_000) return json(413, { error: { code: 'request_too_large', message: 'That import is too large.' } });
  const userId = await requireUserId(req);
  const admin = getSupabaseAdmin();
  if (!userId || !admin) return json(401, { error: { code: 'unauthorized', message: 'Sign in to import a recipe.' } });
  const parsed = parseRecipeImportRequest(await req.json().catch(() => null));
  if (!parsed.ok) return json(400, { error: { code: parsed.code, message: 'The recipe source could not be read.' } });
  const { data: binding } = await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (!binding?.person_id) return json(409, { error: { code: 'person_binding_required', message: 'Finish account setup before importing.' } });
  const { data: existing } = await admin.from('kwilt_recipe_import_drafts').select('*').eq('owner_person_id', binding.person_id).eq('extraction_idempotency_key', parsed.value.idempotencyKey).maybeSingle();
  if (existing) return json(200, { draft: existing, replayed: true });
  const uploadedPaths: string[] = [];
  try {
    const draftId=crypto.randomUUID();
    let sourceText = parsed.value.sourceText;
    let finalUrl = parsed.value.sourceUrl;
    let recipe: ExtractedRecipe | null = null;
    let model: string | null = null;
    if (parsed.value.method === 'url' && parsed.value.sourceUrl) {
      const fetched = await fetchRecipeHtml(parsed.value.sourceUrl);
      finalUrl = fetched.finalUrl;
      const schema = extractSchemaRecipe(fetched.html, fetched.finalUrl);
      if (schema) {
        recipe = deterministicExtraction(schema);
        try {
          const equipmentResult = await aiExtraction(parsed.value, JSON.stringify({
            title: recipe.title,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
          }));
          recipe = { ...recipe, equipmentRequirements: equipmentResult.recipe.equipmentRequirements };
          model = equipmentResult.model;
        } catch {
          // Structured recipe data remains usable; the app's deterministic equipment fallback still applies.
        }
      }
      else sourceText = fetched.html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50_000);
    }
    if (!recipe) { const result = await aiExtraction(parsed.value, sourceText); recipe = result.recipe; model = result.model; }
    const artifacts = parsed.value.method === 'url'
      ? [{ id: 'artifact-url', storageRef: null, page: 1, mediaType: 'text/html', contentHash: await sha256(finalUrl ?? '') }]
      : parsed.value.imageDataUrls.length
        ? await Promise.all(parsed.value.imageDataUrls.map(async (image,index)=>{const decoded=decodeDataUrl(image);const extension=decoded.contentType==='image/png'?'png':decoded.contentType==='image/webp'?'webp':'jpg';const path=`${binding.person_id}/${draftId}/page-${index+1}.${extension}`;const{error:uploadError}=await admin.storage.from('recipe-import-artifacts').upload(path,decoded.bytes,{contentType:decoded.contentType,upsert:false,cacheControl:'private, max-age=0'});if(uploadError)throw new Error('artifact_upload_failed');uploadedPaths.push(path);return{id:`artifact-image-${index+1}`,storageRef:path,page:index+1,mediaType:decoded.contentType,contentHash:await sha256(image)};}))
        : [{ id: 'artifact-text', storageRef: null, page: 1, mediaType: 'text/plain', contentHash: await sha256(sourceText ?? '') }];
    const evidence = recipe.fieldEvidence.map((item) => ({ ...item, sourceArtifactId: artifacts[0].id, sourceRegion: null }));
    const extractedData = { ...recipe, sourceUrl: finalUrl, fieldEvidence: undefined, warnings: undefined };
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: draft, error } = await admin.from('kwilt_recipe_import_drafts').insert({
      id:draftId,
      owner_person_id: binding.person_id, state: 'needs_review', source_method: parsed.value.method,
      source_artifact_refs: artifacts, extracted_data: extractedData, evidence: { fields: evidence },
      field_confidence: Object.fromEntries(evidence.map((item) => [item.fieldPath, item.confidence])), warnings: recipe.warnings,
      extractor_model: model, prompt_version: 'recipe-import-v2', extraction_idempotency_key: parsed.value.idempotencyKey, expires_at: expiresAt,
    }).select('*').single();
    if(error){if(uploadedPaths.length)await admin.storage.from('recipe-import-artifacts').remove(uploadedPaths);throw error;}
    return json(200, { draft, replayed: false });
  } catch (error) {
    if (uploadedPaths.length) await admin.storage.from('recipe-import-artifacts').remove(uploadedPaths);
    const code = error instanceof Error ? error.message : 'recipe_import_failed';
    const safeCode = ['unsafe_source_url','unsafe_redirect','source_too_large','source_fetch_failed','unsupported_source_type','provider_unavailable','invalid_extraction'].includes(code) ? code : 'recipe_import_failed';
    return json(safeCode === 'source_too_large' ? 413 : safeCode === 'provider_unavailable' ? 503 : 422, { error: { code: safeCode, message: safeCode === 'provider_unavailable' ? 'Recipe import is temporarily unavailable.' : 'Kwilt could not create a reliable recipe draft from that source.' } });
  }
});
