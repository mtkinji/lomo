import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';
import { prepareSavingsOptions, type SavingsRow } from '../_shared/grocerySavings.ts';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: { code: 'method_not_allowed' } });
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!uuid(body?.groceryListId) || !Number.isInteger(body?.expectedRevision)) return json(400, { error: { code: 'invalid_request' } });
    const { data: binding } = await supabase.from('kwilt_person_auth_bindings').select('person_id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    const { data: list } = await supabase.from('kwilt_grocery_lists').select('id,owner_person_id,revision,status').eq('id', body.groceryListId).maybeSingle();
    if (!binding?.person_id || !list || list.owner_person_id !== binding.person_id) return json(404, { error: { code: 'grocery_list_not_found' } });
    if (list.revision !== body.expectedRevision || list.status !== 'ready') return json(409, { error: { code: 'stale_or_unreviewed_grocery_list' } });
    const { data: mappings, error } = await supabase.from('kwilt_grocery_product_mappings').select('id,grocery_item_id,provider,retailer_product_id,title,store_name,package_base_units,quantity,state,quotes:kwilt_grocery_price_quotes(*),offers:kwilt_grocery_offers(*)').eq('grocery_list_id', list.id).eq('state', 'confirmed');
    if (error) throw error;
    const now = new Date().toISOString();
    const rows: SavingsRow[] = (mappings ?? []).flatMap((mapping: any) => {
      const quote = (mapping.quotes ?? []).filter((entry: any) => Date.parse(entry.expires_at) > Date.now()).sort((a: any, b: any) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
      if (!quote) return [];
      const offer = (mapping.offers ?? []).filter((entry: any) => entry.state !== 'expired' && Date.parse(entry.expires_at) > Date.now())[0];
      return [{ groceryItemId: mapping.grocery_item_id, mappingId: mapping.id, title: mapping.title, productId: mapping.retailer_product_id, store: mapping.store_name, quantity: mapping.quantity, packageBaseUnits: Number(mapping.package_base_units), regularPriceCents: Number(quote.regular_price_cents), currentPriceCents: Number(quote.current_price_cents), feeCents: Number(quote.fee_cents), observedAt: quote.observed_at, expiresAt: quote.expires_at, offer: offer ? { id: offer.id, kind: offer.kind, amountCents: Number(offer.amount_cents), memberRequired: offer.member_required, activationRequired: offer.activation_required, state: offer.state, expiresAt: offer.expires_at, acknowledgementRef: offer.acknowledgement_ref } : null }];
    });
    const options = prepareSavingsOptions(rows, now);
    const neededCount = await supabase.from('kwilt_grocery_items').select('id', { count: 'exact', head: true }).eq('grocery_list_id', list.id).eq('state', 'needed');
    const covered = new Set(rows.map((row) => row.groceryItemId)).size;
    const coverage = neededCount.count ? Math.round(covered / neededCount.count * 100) : 0;
    return json(200, { status: options.length ? 'ready' : 'no_verified_evidence', options, evidenceCoveragePercent: coverage });
  } catch (error) {
    return json(isAuthenticationError(error) ? 401 : 500, { error: { code: isAuthenticationError(error) ? 'unauthorized' : 'savings_prepare_failed' } });
  }
});
