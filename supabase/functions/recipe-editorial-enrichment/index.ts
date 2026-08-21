import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildRecipeEditorialEnrichmentRequest,
  DEFAULT_RECIPE_EDITORIAL_MODEL,
  parseRecipeEditorialEnrichmentResponse,
  parseRecipeEditorialSource,
  RECIPE_EDITORIAL_PROMPT_VERSION,
  type RecipeEditorialSource,
} from "../_shared/recipeEditorialEnrichment.ts";

type JsonRecord = Record<string, unknown>;
type Scope = "enqueue" | "process" | "list";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-kwilt-operation-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return Response.json(body, { status, headers: corsHeaders });
}

function object(value: unknown, error: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(error);
  return value as JsonRecord;
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

async function authorize(request: Request, scope: Scope): Promise<void> {
  const token = request.headers.get("x-kwilt-operation-token")?.trim();
  if (!token || token.length < 32 || token.length > 256) throw new Error("unauthorized");
  const client = adminClient();
  const { data, error } = await client.rpc("consume_kwilt_recipe_editorial_enrichment_operation_token", {
    p_token_hash: `sha256:${await sha256(token)}`,
    p_scope: scope,
  });
  if (error || data !== true) throw new Error("unauthorized");
}

function model(): string {
  const value = Deno.env.get("RECIPE_EDITORIAL_MODEL")?.trim() || DEFAULT_RECIPE_EDITORIAL_MODEL;
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(value)) throw new Error("invalid_recipe_editorial_model");
  return value;
}

async function enqueue(body: JsonRecord) {
  const sources = Array.isArray(body.sources) ? body.sources.map(parseRecipeEditorialSource) : [];
  if (!sources.length || sources.length > 25) throw new Error("invalid_source_count");
  const selectedModel = model();
  const rows = sources.map((source) => ({
    roster_id: source.rosterId,
    source_recipe_hash: source.sourceRecipeHash,
    source,
    status: "queued",
    prompt_version: RECIPE_EDITORIAL_PROMPT_VERSION,
    model: selectedModel,
  }));
  const { data, error } = await adminClient().from("kwilt_recipe_editorial_enrichment_jobs").upsert(rows, {
    onConflict: "roster_id,source_recipe_hash,prompt_version",
    ignoreDuplicates: true,
  }).select("id,roster_id,status");
  if (error) throw new Error(`enqueue_failed:${error.code ?? "database"}`);
  return { accepted: sources.length, insertedOrExisting: data?.length ?? 0 };
}

async function research(job: JsonRecord, openAiKey: string) {
  const client = adminClient();
  const jobId = String(job.id ?? "");
  const leaseToken = String(job.lease_token ?? "");
  try {
    const source = parseRecipeEditorialSource(job.source);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildRecipeEditorialEnrichmentRequest(source, String(job.model || model()))),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      const envelope = detail && typeof detail === "object" && !Array.isArray(detail) ? detail as JsonRecord : {};
      const apiError = envelope.error && typeof envelope.error === "object" && !Array.isArray(envelope.error)
        ? envelope.error as JsonRecord
        : {};
      const parts = [response.status, apiError.code, apiError.param, apiError.message]
        .filter((value) => typeof value === "string" || typeof value === "number")
        .map((value) => String(value).replace(/[^a-zA-Z0-9 ._:[\]-]/g, " ").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      throw new Error(`openai_http_${parts.join(":")}`.slice(0, 240));
    }
    const parsed = parseRecipeEditorialEnrichmentResponse(await response.json(), source);
    const { data, error } = await client.rpc("complete_kwilt_recipe_editorial_enrichment_job", {
      p_job_id: jobId,
      p_lease_token: leaseToken,
      p_draft: parsed.draft,
      p_citations: parsed.citations,
      p_response_id: parsed.responseId,
      p_response_usage: parsed.usage,
    });
    if (error || data !== true) throw new Error("completion_lease_rejected");
    return { rosterId: source.rosterId, status: "researched", usage: parsed.usage };
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 240) : "research_failed";
    await client.rpc("fail_kwilt_recipe_editorial_enrichment_job", {
      p_job_id: jobId,
      p_lease_token: leaseToken,
      p_error_code: errorCode,
    });
    return { rosterId: String(job.roster_id ?? ""), status: "failed", errorCode };
  }
}

async function processJobs(body: JsonRecord) {
  const requested = Number.isInteger(body.limit) ? Number(body.limit) : 1;
  const limit = Math.max(1, Math.min(requested, 3));
  const client = adminClient();
  const { data, error } = await client.rpc("claim_kwilt_recipe_editorial_enrichment_jobs", { p_limit: limit });
  if (error) throw new Error(`claim_failed:${error.code ?? "database"}`);
  const jobs = Array.isArray(data) ? data.map((job) => object(job, "invalid_claimed_job")) : [];
  const openAiKey = requiredEnv("OPENAI_API_KEY");
  const results = [];
  for (const job of jobs) results.push(await research(job, openAiKey));
  return { claimed: jobs.length, results };
}

async function listStatus() {
  const { data, error } = await adminClient().from("kwilt_recipe_editorial_enrichment_jobs")
    .select("status,attempt_count,response_usage,error_code");
  if (error) throw new Error(`list_failed:${error.code ?? "database"}`);
  const counts: Record<string, number> = {};
  let totalTokens = 0;
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    const usage = object(row.response_usage ?? {}, "invalid_response_usage");
    if (typeof usage.totalTokens === "number") totalTokens += usage.totalTokens;
  }
  return { counts, totalTokens, jobs: data?.length ?? 0 };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  try {
    const body = object(await request.json(), "invalid_request_body");
    const action = body.action;
    if (action !== "enqueue" && action !== "process" && action !== "list") throw new Error("invalid_action");
    await authorize(request, action);
    if (action === "enqueue") return json(200, await enqueue(body));
    if (action === "process") return json(200, await processJobs(body));
    return json(200, await listStatus());
  } catch (error) {
    const code = error instanceof Error ? error.message : "request_failed";
    const status = code === "unauthorized" ? 401 : code === "invalid_action" || code.startsWith("invalid_") ? 400 : 500;
    return json(status, { error: code });
  }
});
