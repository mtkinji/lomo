import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import {
  buildInstacartListPayload,
  createInstacartListLink,
  RetailerAdapterError,
} from '../_shared/groceryRetailerAdapters.ts';

const NEXT_STEP = 'Review products and check out on Instacart.';
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeEndpoint(): string | undefined {
  const configured = Deno.env.get('INSTACART_PRODUCTS_LINK_URL')?.trim();
  if (!configured) return undefined;
  const url = new URL(configured);
  const allowed = url.protocol === 'https:' && ['connect.dev.instacart.tools', 'connect.instacart.com'].includes(url.hostname);
  if (!allowed || url.pathname !== '/idp/v1/products/products_link') throw new Error('configuration_error');
  return url.toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed' } });
  try {
    const { supabase: admin, user } = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action === 'opened' ? 'opened' : 'create';
    const { data: binding } = await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!binding?.person_id) return json(409, { error: { code: 'person_binding_required' } });

    if (action === 'opened') {
      if (!validUuid(body?.handoffId)) return json(400, { error: { code: 'invalid_request' } });
      const { data: handoff, error: handoffError } = await admin.from('kwilt_retailer_handoffs').select('id,grocery_list_id,grocery_list_revision,state').eq('id', body.handoffId).maybeSingle();
      if (handoffError) throw handoffError;
      if (!handoff) return json(404, { error: { code: 'handoff_not_found' } });
      const { data: list, error: listError } = await admin.from('kwilt_grocery_lists').select('owner_person_id,revision,status').eq('id', handoff.grocery_list_id).maybeSingle();
      if (listError) throw listError;
      if (!list || list.owner_person_id !== binding.person_id) return json(404, { error: { code: 'handoff_not_found' } });
      if (list.status !== 'ready' || list.revision !== handoff.grocery_list_revision) return json(409, { error: { code: 'stale_grocery_list' } });
      if (!['provider_link_created', 'opened_for_product_review'].includes(handoff.state)) return json(409, { error: { code: 'handoff_not_ready' } });
      const { error: updateError } = await admin.from('kwilt_retailer_handoffs').update({ state: 'opened_for_product_review', opened_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', handoff.id);
      if (updateError) throw updateError;
      return json(200, { handoffId: handoff.id, state: 'opened_for_product_review' });
    }

    if (!validUuid(body?.groceryListId) || !Number.isInteger(body?.expectedRevision) || Number(body?.expectedRevision) < 1 || body?.provider !== 'instacart') {
      return json(400, { error: { code: 'invalid_request' } });
    }
    const listId = body.groceryListId;
    const expectedRevision = Number(body.expectedRevision);
    const { data: list, error: listError } = await admin.from('kwilt_grocery_lists').select('id,owner_person_id,revision,status,updated_at').eq('id', listId).maybeSingle();
    if (listError) throw listError;
    if (!list || list.owner_person_id !== binding.person_id) return json(404, { error: { code: 'grocery_list_not_found' } });
    if (list.status !== 'ready' || list.revision !== expectedRevision) return json(409, { error: { code: 'stale_or_unreviewed_grocery_list' } });
    const { data: rows, error: itemError } = await admin.from('kwilt_grocery_items').select('concept,quantity_min,quantity_max,unit,note,state,position').eq('grocery_list_id', listId).eq('state', 'needed').order('position');
    if (itemError) throw itemError;
    if (!rows?.length) return json(409, { error: { code: 'no_needed_items' } });
    const payload = buildInstacartListPayload('Kwilt grocery list', rows.map((item) => ({
      concept: item.concept,
      quantityMin: item.quantity_min === null ? null : Number(item.quantity_min),
      quantityMax: item.quantity_max === null ? null : Number(item.quantity_max),
      unit: item.unit,
      note: item.note,
    })));
    const payloadHash = await sha256(payload);
    const idempotencyKey = `instacart:${listId}:${expectedRevision}`;
    const { data: existing, error: existingError } = await admin.from('kwilt_retailer_handoffs').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
    if (existingError) throw existingError;
    if (existing && existing.payload_hash !== payloadHash) return json(409, { error: { code: 'handoff_idempotency_conflict' } });
    if (existing?.state === 'provider_link_created' && existing.private_url && (!existing.expires_at || Date.parse(existing.expires_at) > Date.now())) {
      return json(200, { handoffId: existing.id, url: existing.private_url, state: existing.state, nextStep: NEXT_STEP, expiresAt: existing.expires_at, preparedItemCount: rows.length, remainingRetailerReviewCount: rows.length, replayed: true });
    }
    if (existing?.state === 'provider_link_requested') return json(409, { error: { code: 'handoff_in_progress' } });

    let handoffId = existing?.id as string | undefined;
    if (handoffId) {
      const { error } = await admin.from('kwilt_retailer_handoffs').update({ state: 'provider_link_requested', private_url: null, updated_at: new Date().toISOString() }).eq('id', handoffId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await admin.from('kwilt_retailer_handoffs').insert({
        grocery_list_id: listId, grocery_list_revision: expectedRevision, provider: 'instacart', idempotency_key: idempotencyKey,
        payload_hash: payloadHash, state: 'provider_link_requested', next_step: NEXT_STEP,
      }).select('id').single();
      if (error) {
        const { data: raced } = await admin.from('kwilt_retailer_handoffs').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
        if (raced?.state === 'provider_link_created' && raced.private_url) return json(200, { handoffId: raced.id, url: raced.private_url, state: raced.state, nextStep: NEXT_STEP, expiresAt: raced.expires_at, preparedItemCount: rows.length, remainingRetailerReviewCount: rows.length, replayed: true });
        return json(409, { error: { code: 'handoff_in_progress' } });
      }
      handoffId = inserted.id;
    }

    try {
      const result = await createInstacartListLink({
        enabled: Deno.env.get('FOOD_INSTACART_HANDOFF_ENABLED') === 'true',
        apiKey: Deno.env.get('INSTACART_DEVELOPER_PLATFORM_API_KEY') ?? null,
        endpoint: safeEndpoint(), payload,
      });
      const { error } = await admin.from('kwilt_retailer_handoffs').update({
        state: 'provider_link_created', private_url: result.url, provider_request_id: result.providerRequestId,
        next_step: NEXT_STEP, expires_at: result.expiresAt, updated_at: new Date().toISOString(),
      }).eq('id', handoffId);
      if (error) throw error;
      return json(200, { handoffId, url: result.url, state: 'provider_link_created', nextStep: NEXT_STEP, expiresAt: result.expiresAt, preparedItemCount: rows.length, remainingRetailerReviewCount: rows.length, replayed: false });
    } catch (error) {
      await admin.from('kwilt_retailer_handoffs').update({ state: 'failed', private_url: null, updated_at: new Date().toISOString() }).eq('id', handoffId);
      throw error;
    }
  } catch (error) {
    const unauthorized = isAuthenticationError(error);
    const code = error instanceof RetailerAdapterError ? error.message : unauthorized ? 'unauthorized' : 'grocery_handoff_failed';
    const status = unauthorized ? 401 : code === 'provider_rate_limited' ? 429 : ['provider_disabled', 'provider_unavailable'].includes(code) ? 503 : 500;
    return json(status, { error: { code, message: status === 503 ? 'Instacart handoff is unavailable. Your plain list is still ready.' : 'The retailer handoff could not be prepared.' } });
  }
});
