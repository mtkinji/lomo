-- Rollback-only assertions for the shared Recipe commerce catalog.
begin;

do $$ begin
  if not exists (
    select 1 from pg_class where oid = 'public.kwilt_equipment_categories'::regclass and relrowsecurity
  ) then raise exception 'equipment categories must use RLS'; end if;
  if not exists (
    select 1 from pg_class where oid = 'public.kwilt_equipment_review_versions'::regclass and relrowsecurity
  ) then raise exception 'equipment reviews must use RLS'; end if;
  if not exists (
    select 1 from pg_class where oid = 'public.kwilt_commerce_products'::regclass and relrowsecurity
  ) then raise exception 'commerce products must use RLS'; end if;
  if not exists (
    select 1 from pg_class where oid = 'public.kwilt_commerce_retailer_listings'::regclass and relrowsecurity
  ) then raise exception 'retailer listings must use RLS'; end if;
  if not exists (
    select 1 from pg_class where oid = 'public.kwilt_equipment_review_picks'::regclass and relrowsecurity
  ) then raise exception 'equipment review picks must use RLS'; end if;
end $$;

insert into public.kwilt_equipment_categories(id, label)
values ('test-pan', 'Test pan');

insert into public.kwilt_equipment_review_versions(
  id, category_id, version, state, evidence_class, reviewed_at, review_by,
  methodology, substitute_summary, source_urls, published_at
) values (
  'test-pan-review-v1', 'test-pan', 1, 'published', 'research-backed',
  current_date, current_date + 30, 'Compared the relevant test constraints.',
  'Use an ordinary skillet instead.', '[{"label":"Test source","url":"https://example.invalid/source"}]', now()
);

insert into public.kwilt_commerce_products(
  id, manufacturer, model, title, image_storage_ref, image_alt, capacity_cups
) values (
  'test-pan-product', 'Test maker', 'TP-1', 'Test pan product', null,
  'A test pan', null
);

insert into public.kwilt_commerce_retailer_listings(
  id, product_id, retailer, marketplace, external_product_id, state, verified_at
) values (
  'amazon-us-test-pan-product', 'test-pan-product', 'amazon', 'US',
  'B000000001', 'active', current_date
);

insert into public.kwilt_equipment_review_picks(
  id, review_id, product_id, retailer_listing_id, role, position, rationale, tradeoff
) values (
  'test-pan-review-v1-lead', 'test-pan-review-v1', 'test-pan-product',
  'amazon-us-test-pan-product', 'lead', 0, 'Fits the test need.', 'Has a test trade-off.'
);

do $$ begin
  if not exists (
    select 1
    from public.kwilt_equipment_review_versions review
    join public.kwilt_equipment_review_picks pick on pick.review_id = review.id
    join public.kwilt_commerce_products product on product.id = pick.product_id
    join public.kwilt_commerce_retailer_listings listing
      on listing.id = pick.retailer_listing_id and listing.product_id = product.id
    where review.category_id = 'test-pan'
      and review.state = 'published'
      and product.id = 'test-pan-product'
      and listing.external_product_id = 'B000000001'
  ) then raise exception 'published review did not resolve through separate commerce objects'; end if;
end $$;

do $$ begin
  begin
    insert into public.kwilt_equipment_review_picks(
      id, review_id, product_id, retailer_listing_id, role, position, rationale, tradeoff
    ) values (
      'test-pan-review-v1-mismatch', 'test-pan-review-v1',
      'kitchenaid-7-cup-food-processor', 'amazon-us-test-pan-product',
      'alternative', 1, 'Invalid cross-product pick.', 'Must be rejected.'
    );
    raise exception 'mismatched product and retailer listing was accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'kwilt_commerce_retailer_listings'
      and column_name in ('url', 'affiliate_url', 'affiliate_tag')
  ) then raise exception 'retailer listings must not persist resolved or tagged URLs'; end if;
end $$;

rollback;
