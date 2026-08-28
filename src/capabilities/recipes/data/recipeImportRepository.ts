import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';

export type RecipeImportSource =
  | { method: 'url'; sourceUrl: string }
  | { method: 'text' | 'voice'; sourceText: string }
  | { method: 'photo' | 'scan'; imageDataUrls: string[] };

export type RecipeImportProjection = {
  id: string;
  version: number;
  method: RecipeImportSource['method'];
  state: 'needs_review';
  extractedData: Record<string, unknown>;
  evidence: Record<string, unknown>;
  warnings: string[];
  expiresAt: string;
};

function mapDraft(value: unknown): RecipeImportProjection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid recipe import draft.');
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || !Number.isInteger(row.version) || Number(row.version) < 1
    || row.state !== 'needs_review' || !row.extracted_data || typeof row.extracted_data !== 'object' || Array.isArray(row.extracted_data)) {
    throw new Error('Invalid recipe import draft.');
  }
  return {
    id: row.id,
    version: Number(row.version),
    method: row.source_method as RecipeImportProjection['method'],
    state: 'needs_review',
    extractedData: row.extracted_data as Record<string, unknown>,
    evidence: row.evidence && typeof row.evidence === 'object' && !Array.isArray(row.evidence) ? row.evidence as Record<string, unknown> : {},
    warnings: Array.isArray(row.warnings) ? row.warnings.filter((item): item is string => typeof item === 'string') : [],
    expiresAt: String(row.expires_at),
  };
}

export function createRecipeImportRepository(client: SupabaseClient = getSupabaseClient()) {
  return {
    async extract(source: RecipeImportSource, idempotencyKey: string): Promise<RecipeImportProjection> {
      const { data, error } = await client.functions.invoke('recipe-import', { body: { ...source, idempotencyKey } });
      if (error) throw new Error(error.message);
      return mapDraft((data as { draft?: unknown } | null)?.draft);
    },
    async listReviewable(): Promise<RecipeImportProjection[]> {
      const { data, error } = await client.from('kwilt_recipe_import_drafts').select('*')
        .eq('state', 'needs_review').gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false }).limit(20);
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data.map(mapDraft) : [];
    },
  };
}

export { mapDraft as parseRecipeImportProjection };
