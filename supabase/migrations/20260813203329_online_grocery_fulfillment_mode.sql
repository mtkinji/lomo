-- Fulfillment mode is part of the server-owned Kroger cart receipt. It is not
-- inferred from UI copy or from an exact-store confirmation after the write.
alter table public.kwilt_retailer_handoffs
  add column if not exists fulfillment_mode text;

alter table public.kwilt_retailer_handoffs
  add constraint kwilt_retailer_handoffs_fulfillment_mode_check
  check (fulfillment_mode is null or fulfillment_mode in ('pickup', 'delivery'));

update public.kwilt_retailer_handoffs
set fulfillment_mode = 'pickup'
where provider = 'kroger'
  and fulfillment_mode is null;

alter table public.kwilt_retailer_handoff_items
  add column if not exists fulfillment_mode text;

update public.kwilt_retailer_handoff_items receipt
set fulfillment_mode = coalesce(handoff.fulfillment_mode, 'pickup')
from public.kwilt_retailer_handoffs handoff
where handoff.id = receipt.retailer_handoff_id
  and receipt.fulfillment_mode is null;

alter table public.kwilt_retailer_handoff_items
  alter column fulfillment_mode set not null;

alter table public.kwilt_retailer_handoff_items
  add constraint kwilt_retailer_handoff_items_fulfillment_mode_check
  check (fulfillment_mode in ('pickup', 'delivery'));

create or replace function public.acknowledge_kwilt_retailer_cart_add(
  p_handoff_id uuid,
  p_mapping_ids uuid[],
  p_retailer_label text,
  p_location_id text,
  p_location_name text,
  p_cart_url text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_handoff public.kwilt_retailer_handoffs;
  v_added_count integer;
  v_remaining_count integer;
  v_item_ids jsonb;
begin
  select * into v_handoff
  from public.kwilt_retailer_handoffs
  where id = p_handoff_id
  for update;

  if v_handoff.id is null or v_handoff.state <> 'cart_add_requested' then
    raise exception 'retailer_handoff_not_ready';
  end if;
  if v_handoff.fulfillment_mode not in ('pickup', 'delivery') then
    raise exception 'retailer_fulfillment_mode_required';
  end if;
  if coalesce(array_length(p_mapping_ids, 1), 0) = 0 then
    raise exception 'retailer_mappings_required';
  end if;

  insert into public.kwilt_retailer_handoff_items(
    retailer_handoff_id, grocery_item_id, product_mapping_id, provider,
    retailer_label, location_id, location_name, fulfillment_mode, state
  )
  select v_handoff.id, mapping.grocery_item_id, mapping.id, mapping.provider,
    btrim(p_retailer_label), p_location_id, p_location_name,
    v_handoff.fulfillment_mode, 'cart_add_acknowledged'
  from public.kwilt_grocery_product_mappings mapping
  where mapping.id = any(p_mapping_ids)
    and mapping.grocery_list_id = v_handoff.grocery_list_id
    and mapping.provider = v_handoff.provider
    and mapping.state = 'confirmed'
  on conflict (retailer_handoff_id, grocery_item_id) do nothing;

  get diagnostics v_added_count = row_count;
  if v_added_count <> array_length(p_mapping_ids, 1) then
    raise exception 'retailer_mapping_receipt_mismatch';
  end if;

  update public.kwilt_retailer_handoffs
  set state = 'cart_add_acknowledged', private_url = p_cart_url, updated_at = now()
  where id = v_handoff.id;

  select coalesce(jsonb_agg(receipt.grocery_item_id order by receipt.created_at), '[]'::jsonb)
    into v_item_ids
  from public.kwilt_retailer_handoff_items receipt
  where receipt.retailer_handoff_id = v_handoff.id;

  select count(*) into v_remaining_count
  from public.kwilt_grocery_items item
  where item.grocery_list_id = v_handoff.grocery_list_id
    and item.state = 'needed'
    and not exists (
      select 1 from public.kwilt_retailer_handoff_items receipt
      where receipt.grocery_item_id = item.id
        and receipt.state = 'cart_add_acknowledged'
    );

  return jsonb_build_object(
    'addedItemCount', v_added_count,
    'acknowledgedItemIds', v_item_ids,
    'remainingItemCount', v_remaining_count,
    'fulfillmentMode', v_handoff.fulfillment_mode
  );
end;
$$;

comment on column public.kwilt_retailer_handoffs.fulfillment_mode is
  'Server-validated requested retailer fulfillment mode; null for handoffs that do not prove one.';
comment on column public.kwilt_retailer_handoff_items.fulfillment_mode is
  'Fulfillment mode copied atomically from the owning handoff when cart addition is acknowledged.';
