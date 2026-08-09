-- A retailer cart acknowledgement is not proof of purchase. Preserve it as a
-- server-owned per-item receipt so later shopping passes can target only the remainder.
create table public.kwilt_retailer_handoff_items (
  id uuid primary key default gen_random_uuid(),
  retailer_handoff_id uuid not null references public.kwilt_retailer_handoffs(id) on delete cascade,
  grocery_item_id uuid not null references public.kwilt_grocery_items(id) on delete cascade,
  product_mapping_id uuid not null references public.kwilt_grocery_product_mappings(id) on delete restrict,
  provider text not null check (provider = 'kroger'),
  retailer_label text not null check (char_length(btrim(retailer_label)) between 1 and 120),
  location_id text,
  location_name text,
  state text not null check (state = 'cart_add_acknowledged'),
  created_at timestamptz not null default now(),
  unique(retailer_handoff_id, grocery_item_id)
);

create index kwilt_retailer_handoff_items_grocery_item_idx
  on public.kwilt_retailer_handoff_items(grocery_item_id, created_at desc);

alter table public.kwilt_retailer_handoff_items enable row level security;
create policy kwilt_retailer_handoff_items_owner_read
  on public.kwilt_retailer_handoff_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.kwilt_grocery_items item
      where item.id = grocery_item_id
        and public.kwilt_owns_grocery_list(item.grocery_list_id)
    )
  );

grant select on public.kwilt_retailer_handoff_items to authenticated;
grant select, insert, update, delete on public.kwilt_retailer_handoff_items to service_role;
revoke insert, update, delete on public.kwilt_retailer_handoff_items
  from public, anon, authenticated;

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
  if coalesce(array_length(p_mapping_ids, 1), 0) = 0 then
    raise exception 'retailer_mappings_required';
  end if;

  insert into public.kwilt_retailer_handoff_items(
    retailer_handoff_id, grocery_item_id, product_mapping_id, provider,
    retailer_label, location_id, location_name, state
  )
  select v_handoff.id, mapping.grocery_item_id, mapping.id, mapping.provider,
    btrim(p_retailer_label), p_location_id, p_location_name, 'cart_add_acknowledged'
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
    'remainingItemCount', v_remaining_count
  );
end;
$$;

revoke execute on function public.acknowledge_kwilt_retailer_cart_add(uuid, uuid[], text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.acknowledge_kwilt_retailer_cart_add(uuid, uuid[], text, text, text, text)
  to service_role;

comment on table public.kwilt_retailer_handoff_items is
  'Provider-acknowledged cart membership only; never purchase, pickup, delivery, or possession evidence.';
