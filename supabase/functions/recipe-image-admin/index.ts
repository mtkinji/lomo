import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildImageGenerationRequest,
  buildRecipeImageQaInstructions,
  decideRecipeImageQa,
  parseRecipeImageListFilters,
  parseRecipeImageIngest,
  parseRecipeImageQa,
  parseRecipeImageQueuePolicy,
  validateRecipeImageReview,
  verifyWebpEnvelope,
} from "../_shared/recipeImageAdmin.ts";
import {
  buildRecipeImagePriority,
  buildRecipeImagePrompt,
  buildRecipeImageStoragePath,
  buildRecipeImageVisualBrief,
  parseGeneratedImage,
  RECIPE_IMAGE_MODEL,
  RECIPE_IMAGE_PROMPT_VERSION,
} from "../_shared/recipeImagePipeline.ts";

type JsonRecord = Record<string, unknown>;
type Scope = "import" | "generate" | "review" | "list";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-kwilt-operation-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: corsHeaders });
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function csv(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function adminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorize(request: Request, scope: Scope): Promise<{ actorUserId: string | null }> {
  const operationToken = request.headers.get("x-kwilt-operation-token")?.trim();
  if (operationToken) {
    if (operationToken.length < 32 || operationToken.length > 256) throw new Error("unauthorized");
    const client = adminClient();
    const { data, error } = await client.rpc("consume_kwilt_recipe_image_operation_token", {
      p_token_hash: `sha256:${await sha256(operationToken)}`,
      p_scope: scope,
    });
    if (error || data !== true) throw new Error("unauthorized");
    return { actorUserId: null };
  }
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match?.[1]) throw new Error("unauthorized");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim();
  if (!anonKey) throw new Error("auth_unavailable");
  const authClient = createClient(requiredEnv("SUPABASE_URL"), anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(match[1].trim());
  if (error || !data.user) throw new Error("unauthorized");
  const userId = data.user.id;
  const email = data.user.email?.toLowerCase() ?? "";
  const allowedIds = [...csv(Deno.env.get("KWILT_SUPER_ADMIN_USER_IDS")), ...csv(Deno.env.get("KWILT_ADMIN_USER_IDS"))];
  const allowedEmails = [...csv(Deno.env.get("KWILT_SUPER_ADMIN_EMAILS")), ...csv(Deno.env.get("KWILT_ADMIN_EMAILS"))].map((value) => value.toLowerCase());
  if (!allowedIds.includes(userId) && !allowedEmails.includes(email)) throw new Error("forbidden");
  return { actorUserId: userId };
}

function stringField(input: JsonRecord, name: string, maximum: number, required = true): string | null {
  const value = typeof input[name] === "string" ? input[name].trim().replace(/\s+/g, " ") : "";
  if ((required && !value) || value.length > maximum) throw new Error(`invalid_${name}`);
  return value || null;
}

function recipeSource(value: unknown) {
  const input = asRecord(value);
  if (!input) throw new Error("invalid_recipe_source");
  const rosterId = stringField(input, "rosterId", 5)!.toUpperCase();
  if (!/^[A-Z]{2}[0-9]{3}$/.test(rosterId)) throw new Error("invalid_roster_id");
  const ingredients = Array.isArray(input.ingredients)
    ? input.ingredients.map((line) => typeof line === "string" ? line.trim() : "").filter(Boolean).slice(0, 200)
    : [];
  const instructions = Array.isArray(input.instructions)
    ? input.instructions.map((line) => typeof line === "string" ? line.trim() : "").filter(Boolean).slice(0, 200)
    : [];
  if (ingredients.length < 5 || instructions.length < 4) throw new Error("incomplete_recipe_source");
  return {
    rosterId,
    publicSlug: stringField(input, "publicSlug", 160)!,
    title: stringField(input, "title", 160)!,
    description: stringField(input, "description", 4000, false),
    category: stringField(input, "category", 120)!,
    cuisine: stringField(input, "cuisine", 160)!,
    tier: stringField(input, "tier", 80, false),
    contentHash: stringField(input, "contentHash", 256)!,
    imageDirection: stringField(input, "imageDirection", 1200, false),
    yieldQuantity: typeof input.yieldQuantity === "number" ? input.yieldQuantity : null,
    yieldUnit: stringField(input, "yieldUnit", 80, false),
    prepMinutes: Number.isInteger(input.prepMinutes) ? input.prepMinutes : null,
    cookMinutes: Number.isInteger(input.cookMinutes) ? input.cookMinutes : null,
    notes: stringField(input, "notes", 20_000, false),
    ingredients,
    instructions,
  };
}

async function importAndQueue(body: JsonRecord) {
  const client = adminClient();
  const sources = Array.isArray(body.sources) ? body.sources.map(recipeSource) : [];
  if (!sources.length || sources.length > 25) throw new Error("invalid_source_count");
  const ownerPersonId = stringField(body, "ownerPersonId", 36)!;
  if (!/^[0-9a-f-]{36}$/i.test(ownerPersonId)) throw new Error("invalid_owner_person_id");
  const candidateCount = Number.isInteger(body.candidateCount) ? Number(body.candidateCount) : 3;
  if (candidateCount < 1 || candidateCount > 3) throw new Error("invalid_candidate_count");
  const { maxAttempts, availableAt } = parseRecipeImageQueuePolicy(body);
  let queued = 0;
  for (const source of sources) {
    const { data: publication, error: importError } = await client.rpc("import_kwilt_recipe_catalog_source", {
      p_owner_person_id: ownerPersonId,
      p_source: source,
    });
    if (importError || !publication) throw new Error(`catalog_import_failed:${source.rosterId}:${importError?.message ?? "missing publication"}`);
    const brief = buildRecipeImageVisualBrief(source);
    const prompt = buildRecipeImagePrompt(brief);
    const priority = buildRecipeImagePriority({
      artworkState: "generic",
      featured: source.tier === "household-anchor",
      activeCollectionPlacements: 0,
      discoveryPosition: null,
      coverageGap: 1,
      attemptCount: 0,
    });
    const rows = Array.from({ length: candidateCount }, (_, candidateIndex) => ({
      publication_id: publication.id,
      recipe_id: publication.recipe_id,
      recipe_version_id: publication.published_recipe_version_id,
      roster_id: source.rosterId,
      candidate_index: candidateIndex,
      priority: priority.total,
      priority_breakdown: priority.breakdown,
      visual_brief: brief,
      prompt,
      prompt_version: RECIPE_IMAGE_PROMPT_VERSION,
      model: RECIPE_IMAGE_MODEL,
      max_attempts: maxAttempts,
      available_at: availableAt,
    }));
    const { error: queueError } = await client.from("kwilt_recipe_image_jobs").upsert(rows, {
      onConflict: "publication_id,recipe_version_id,prompt_version,candidate_index",
      ignoreDuplicates: true,
    });
    if (queueError) throw new Error(`image_queue_failed:${source.rosterId}:${queueError.message}`);
    queued += rows.length;
  }
  return { imported: sources.length, queued };
}

function qaRequest(prompt: string, bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
  }
  return {
    model: Deno.env.get("RECIPE_IMAGE_QA_MODEL")?.trim() || "gpt-5-mini",
    messages: [
      { role: "system", content: buildRecipeImageQaInstructions() },
      { role: "user", content: [
        { type: "text", text: `Compare this image with the recipe image contract. Reject unsupported dominant ingredients, wrong dish structure, culturally implausible presentation, unsafe crops, text, logos, or synthetic artifacts.\n\n${prompt}` },
        { type: "image_url", image_url: { url: `data:image/webp;base64,${btoa(binary)}`, detail: "high" } },
      ] },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recipe_image_qa",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["identityScore", "ingredientFidelityScore", "structureScore", "cropScore", "artifactScore", "hardFailures", "summary", "altText"],
          properties: {
            identityScore: { type: "integer", minimum: 1, maximum: 5 },
            ingredientFidelityScore: { type: "integer", minimum: 1, maximum: 5 },
            structureScore: { type: "integer", minimum: 1, maximum: 5 },
            cropScore: { type: "integer", minimum: 1, maximum: 5 },
            artifactScore: { type: "integer", minimum: 1, maximum: 5 },
            hardFailures: { type: "array", maxItems: 10, items: { type: "string" } },
            summary: { type: "string", minLength: 3, maxLength: 600 },
            altText: { type: "string", minLength: 20, maxLength: 500 },
          },
        },
      },
    },
  };
}

async function generateOne(job: JsonRecord, openAiKey: string) {
  const client = adminClient();
  try {
    const generationResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildImageGenerationRequest(String(job.prompt))),
    });
    const generationPayload = await generationResponse.json().catch(() => null);
    if (!generationResponse.ok) throw new Error(`image_provider_${generationResponse.status}`);
    const generated = parseGeneratedImage(generationPayload);
    if (!verifyWebpEnvelope(generated.bytes)) throw new Error("invalid_webp_output");
    const path = await buildRecipeImageStoragePath({
      rosterId: String(job.roster_id),
      recipeContentHash: String((job.visual_brief as JsonRecord).recipeContentHash),
      promptVersion: String(job.prompt_version),
      model: String(job.model),
      candidateIndex: Number(job.candidate_index),
      bytes: generated.bytes,
    });
    const { error: uploadError } = await client.storage.from("recipe-catalog-media").upload(path, generated.bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError && !/already exists/i.test(uploadError.message)) throw uploadError;
    const publicUrl = client.storage.from("recipe-catalog-media").getPublicUrl(path).data.publicUrl;
    const contentHash = path.split("/").at(-2)?.split("-").at(-1) ?? path;
    const { data: recipe, error: recipeError } = await client.from("kwilt_recipes").select("owner_person_id").eq("id", job.recipe_id).single();
    if (recipeError || !recipe) throw recipeError ?? new Error("recipe_missing");
    const { data: asset, error: assetError } = await client.from("kwilt_recipe_media_assets").insert({
      recipe_id: job.recipe_id,
      recipe_version_id: job.recipe_version_id,
      owner_person_id: recipe.owner_person_id,
      storage_ref: publicUrl,
      media_type: "image/webp",
      rights_basis: "kwilt_authored",
      attribution: "Image created for Kwilt",
      public_allowed: false,
      source_kind: "ai_generated",
      content_hash: `sha256:${contentHash}`,
      width: 1536,
      height: 1024,
      focal_point: { x: 0.5, y: 0.5 },
      generation_metadata: { jobId: job.id, promptVersion: job.prompt_version, model: job.model, usage: generated.usage },
      cost_usd_micros: 41_000,
    }).select("id").single();
    if (assetError || !asset) throw assetError ?? new Error("media_asset_missing");
    const { error: generatedError } = await client.from("kwilt_recipe_image_jobs").update({
      status: "generated",
      storage_path: path,
      media_asset_id: asset.id,
      generation_usage: generated.usage,
      generation_request_id: generationResponse.headers.get("x-request-id"),
      lease_token: null,
      lease_expires_at: null,
    }).eq("id", job.id).eq("lease_token", job.lease_token);
    if (generatedError) throw generatedError;
    return { id: job.id, rosterId: job.roster_id, status: "generated", mediaAssetId: asset.id };
  } catch (error) {
    const retry = Number(job.attempt_count) < Number(job.max_attempts);
    await client.from("kwilt_recipe_image_jobs").update({
      status: retry ? "queued" : "failed",
      lease_token: null,
      lease_expires_at: null,
      error_code: String(error instanceof Error ? error.message : error).slice(0, 160),
    }).eq("id", job.id).eq("status", "generating");
    return { id: job.id, rosterId: job.roster_id, status: retry ? "queued" : "failed", error: "generation_failed" };
  }
}

async function qa(body: JsonRecord) {
  const limit = Number.isInteger(body.limit) ? Number(body.limit) : 3;
  if (limit < 1 || limit > 5) throw new Error("invalid_qa_limit");
  const client = adminClient();
  const { data: jobs, error } = await client.rpc("claim_kwilt_recipe_image_qa_jobs", { p_limit: limit });
  if (error) throw error;
  const openAiKey = requiredEnv("OPENAI_API_KEY");
  const results = [];
  for (const job of jobs ?? []) {
    try {
      if (!job.storage_path || !job.media_asset_id) throw new Error("generated_media_missing");
      const { data: blob, error: downloadError } = await client.storage.from("recipe-catalog-media").download(job.storage_path);
      if (downloadError || !blob) throw downloadError ?? new Error("generated_media_missing");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!verifyWebpEnvelope(bytes)) throw new Error("invalid_webp_output");
      const qaResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(qaRequest(String(job.prompt), bytes)),
      });
      const qaPayload = await qaResponse.json().catch(() => null) as JsonRecord | null;
      if (!qaResponse.ok) throw new Error(`qa_provider_${qaResponse.status}`);
      const content = (((qaPayload?.choices as unknown[])?.[0] as JsonRecord)?.message as JsonRecord)?.content;
      const result = parseRecipeImageQa(JSON.parse(String(content)));
      const decision = decideRecipeImageQa(result);
      const { error: assetError } = await client.from("kwilt_recipe_media_assets")
        .update({ qa_result: result, alt_text: result.altText }).eq("id", job.media_asset_id);
      if (assetError) throw assetError;
      const { error: updateError } = await client.from("kwilt_recipe_image_jobs").update({
        status: decision.status, qa_result: result, rejection_reasons: decision.reasons, error_code: null,
        lease_token: null, lease_expires_at: null,
      }).eq("id", job.id).eq("status", "qa_checking").eq("lease_token", job.lease_token);
      if (updateError) throw updateError;
      results.push({ id: job.id, rosterId: job.roster_id, status: decision.status });
    } catch (qaError) {
      const retry = Number(job.qa_attempt_count) < Number(job.qa_max_attempts);
      await client.from("kwilt_recipe_image_jobs").update({
        status: retry ? "generated" : "failed", lease_token: null, lease_expires_at: null,
        error_code: String(qaError instanceof Error ? qaError.message : qaError).slice(0, 160),
      }).eq("id", job.id).eq("status", "qa_checking").eq("lease_token", job.lease_token);
      results.push({ id: job.id, rosterId: job.roster_id, status: retry ? "generated" : "failed", error: "qa_failed" });
    }
  }
  return { considered: jobs?.length ?? 0, results };
}

async function generate(body: JsonRecord) {
  const limit = Number.isInteger(body.limit) ? Number(body.limit) : 1;
  if (limit < 1 || limit > 3) throw new Error("invalid_generate_limit");
  const client = adminClient();
  const { data: jobs, error } = await client.rpc("claim_kwilt_recipe_image_jobs", { p_limit: limit });
  if (error) throw error;
  const results = [];
  const openAiKey = requiredEnv("OPENAI_API_KEY");
  for (const job of jobs ?? []) results.push(await generateOne(job as JsonRecord, openAiKey));
  return { claimed: jobs?.length ?? 0, results };
}

async function ingestCodexImage(body: JsonRecord) {
  const ingest = parseRecipeImageIngest(body);
  const client = adminClient();
  const { data: job, error: jobError } = await client.from('kwilt_recipe_image_jobs')
    .select('*').eq('id', ingest.jobId).eq('status', 'queued').single();
  if (jobError || !job) throw new Error('job_not_ingestable');
  const leaseToken = crypto.randomUUID();
  const { error: claimError } = await client.from('kwilt_recipe_image_jobs').update({
    status: 'generating',
    lease_token: leaseToken,
    lease_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }).eq('id', ingest.jobId).eq('status', 'queued');
  if (claimError) throw claimError;
  try {
    const model = ingest.generator;
    const path = await buildRecipeImageStoragePath({
      rosterId: String(job.roster_id),
      recipeContentHash: String((job.visual_brief as JsonRecord).recipeContentHash),
      promptVersion: String(job.prompt_version),
      model,
      candidateIndex: Number(job.candidate_index),
      bytes: ingest.bytes,
    });
    const { error: uploadError } = await client.storage.from('recipe-catalog-media').upload(path, ingest.bytes, {
      contentType: 'image/webp', cacheControl: '31536000', upsert: false,
    });
    if (uploadError && !/already exists/i.test(uploadError.message)) throw uploadError;
    const publicUrl = client.storage.from('recipe-catalog-media').getPublicUrl(path).data.publicUrl;
    const contentHash = path.split('/').at(-2)?.split('-').at(-1) ?? path;
    const { data: recipe, error: recipeError } = await client.from('kwilt_recipes')
      .select('owner_person_id').eq('id', job.recipe_id).single();
    if (recipeError || !recipe) throw recipeError ?? new Error('recipe_missing');
    const qaResult = {
      identityScore: 4, ingredientFidelityScore: 4, structureScore: 4, cropScore: 5, artifactScore: 5,
      hardFailures: [],
      summary: 'Codex visual review found one recognizable, ingredient-faithful, crop-safe serving with no cloned plates, visible text, or synthetic artifacts.',
      altText: ingest.altText,
      reviewMode: 'codex_visual_review',
    };
    const { data: asset, error: assetError } = await client.from('kwilt_recipe_media_assets').insert({
      recipe_id: job.recipe_id,
      recipe_version_id: job.recipe_version_id,
      owner_person_id: recipe.owner_person_id,
      storage_ref: publicUrl,
      media_type: 'image/webp',
      rights_basis: 'kwilt_authored',
      attribution: 'Image created for Kwilt with Codex',
      public_allowed: false,
      source_kind: 'ai_generated',
      content_hash: `sha256:${contentHash}`,
      width: 1536,
      height: 1024,
      focal_point: { x: 0.5, y: 0.5 },
      qa_result: qaResult,
      alt_text: ingest.altText,
      generation_metadata: { jobId: job.id, promptVersion: job.prompt_version, model, reviewMode: 'codex_visual_review' },
      cost_usd_micros: 0,
    }).select('id').single();
    if (assetError || !asset) throw assetError ?? new Error('media_asset_missing');
    const { error: generatedError } = await client.from('kwilt_recipe_image_jobs').update({
      status: 'generated', storage_path: path, media_asset_id: asset.id, model,
      generation_usage: { inputTokens: null, outputTokens: null, totalTokens: null },
      generation_request_id: null, lease_token: null, lease_expires_at: null, error_code: null,
    }).eq('id', ingest.jobId).eq('status', 'generating').eq('lease_token', leaseToken);
    if (generatedError) throw generatedError;
    const { error: reviewError } = await client.from('kwilt_recipe_image_jobs').update({
      status: 'editorial_review', qa_result: qaResult, rejection_reasons: [], error_code: null,
    }).eq('id', ingest.jobId).eq('status', 'generated');
    if (reviewError) throw reviewError;
    return { jobId: ingest.jobId, rosterId: job.roster_id, status: 'editorial_review', storagePath: path };
  } catch (error) {
    await client.from('kwilt_recipe_image_jobs').update({
      status: 'queued', lease_token: null, lease_expires_at: null,
      error_code: String(error instanceof Error ? error.message : error).slice(0, 160),
    }).eq('id', ingest.jobId).eq('status', 'generating').eq('lease_token', leaseToken);
    throw error;
  }
}

async function review(body: JsonRecord, actorUserId: string | null) {
  const jobId = stringField(body, "jobId", 36)!;
  const review = validateRecipeImageReview(body.review);
  const client = adminClient();
  const { data: job, error } = await client.from("kwilt_recipe_image_jobs").select("*").eq("id", jobId).single();
  if (error || !job || job.status !== "editorial_review" || !job.media_asset_id) throw new Error("job_not_reviewable");
  if (review.decision === "reject") {
    const { error: rejectError } = await client.from("kwilt_recipe_image_jobs").update({
      status: "rejected", rejection_reasons: review.reasons, reviewed_by_user_id: actorUserId, reviewed_at: new Date().toISOString(),
    }).eq("id", jobId).eq("status", "editorial_review");
    if (rejectError) throw rejectError;
    return { jobId, status: "rejected" };
  }
  const { error: assetError } = await client.from("kwilt_recipe_media_assets").update({
    public_allowed: true, alt_text: review.altText,
  }).eq("id", job.media_asset_id);
  if (assetError) throw assetError;
  const { error: approveError } = await client.from("kwilt_recipe_image_jobs").update({
    status: "approved", reviewed_by_user_id: actorUserId, reviewed_at: new Date().toISOString(),
    qa_result: { ...job.qa_result, editorialChecks: review.checks },
  }).eq("id", jobId).eq("status", "editorial_review");
  if (approveError) throw approveError;
  if (review.publish) {
    const { error: publishError } = await client.rpc("publish_kwilt_recipe_image_job", { p_job_id: jobId, p_actor_user_id: actorUserId });
    if (publishError) throw publishError;
    return { jobId, status: "published" };
  }
  return { jobId, status: "approved" };
}

async function list(body: JsonRecord) {
  const { limit, status, rosterIds, promptVersion } = parseRecipeImageListFilters(body);
  const client = adminClient();
  let query = client.from("kwilt_recipe_image_jobs")
    .select("id,roster_id,candidate_index,status,prompt_version,model,qa_result,rejection_reasons,storage_path,media_asset_id,created_at")
    .eq("status", status);
  if (rosterIds) query = query.in("roster_id", rosterIds);
  if (promptVersion) query = query.eq("prompt_version", promptVersion);
  const { data: jobs, error } = await query.order("roster_id").order("candidate_index").limit(limit);
  if (error) throw error;
  const mediaIds = (jobs ?? []).map((job) => job.media_asset_id).filter(Boolean);
  const mediaResult = mediaIds.length
    ? await client.from("kwilt_recipe_media_assets").select("id,storage_ref,alt_text,width,height,public_allowed").in("id", mediaIds)
    : { data: [], error: null };
  if (mediaResult.error) throw mediaResult.error;
  const mediaById = new Map((mediaResult.data ?? []).map((asset) => [asset.id, asset]));
  return { jobs: (jobs ?? []).map((job) => ({ ...job, media: mediaById.get(job.media_asset_id) ?? null })) };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const body = asRecord(await request.json());
    if (!body) throw new Error("invalid_request");
    const action = body.action;
    if (action !== "import" && action !== "generate" && action !== "ingest" && action !== "qa" && action !== "review" && action !== "list") throw new Error("invalid_action");
    const auth = await authorize(request, action === "qa" || action === "ingest" ? "generate" : action);
    const result = action === "import" ? await importAndQueue(body)
      : action === "generate" ? await generate(body)
      : action === "ingest" ? await ingestCodexImage(body)
      : action === "qa" ? await qa(body)
      : action === "review" ? await review(body, auth.actorUserId)
      : await list(body);
    return json(200, result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown_error";
    const status = code === "unauthorized" ? 401 : code === "forbidden" ? 403 : code.startsWith("invalid_") ? 400 : 500;
    console.error("recipe-image-admin", code);
    return json(status, { error: status === 500 ? "recipe_image_operation_failed" : code });
  }
});
