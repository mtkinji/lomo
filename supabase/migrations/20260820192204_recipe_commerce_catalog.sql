-- Shared, review-gated commerce objects for Recipe equipment recommendations.
-- Recipes retain only stable equipment/category references; retailer URLs are
-- resolved at handoff time from the marketplace-specific external product ID.

create table public.kwilt_equipment_categories (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 80),
  label text not null check (char_length(btrim(label)) between 1 and 160),
  created_at timestamptz not null default now()
);

create table public.kwilt_equipment_review_versions (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 120),
  category_id text not null references public.kwilt_equipment_categories(id) on delete restrict,
  version integer not null check (version > 0),
  state text not null default 'draft' check (state in ('draft', 'published', 'withdrawn')),
  evidence_class text not null check (evidence_class in ('editorial-review', 'research-backed', 'kwilt-tested')),
  reviewed_at date not null,
  review_by date not null check (review_by >= reviewed_at),
  methodology text not null check (char_length(btrim(methodology)) between 1 and 8000),
  substitute_summary text not null check (char_length(btrim(substitute_summary)) between 1 and 1000),
  source_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(source_urls) = 'array'),
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  unique(category_id, version),
  check (
    (state = 'draft' and published_at is null and withdrawn_at is null)
    or (state = 'published' and published_at is not null and withdrawn_at is null)
    or (state = 'withdrawn' and withdrawn_at is not null)
  )
);

create index kwilt_equipment_reviews_published_idx
  on public.kwilt_equipment_review_versions(category_id, version desc)
  where state = 'published';

create table public.kwilt_commerce_products (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 120),
  manufacturer text not null check (char_length(btrim(manufacturer)) between 1 and 160),
  model text not null check (char_length(btrim(model)) between 1 and 160),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  image_storage_ref text check (image_storage_ref is null or char_length(image_storage_ref) <= 1000),
  image_alt text not null check (char_length(btrim(image_alt)) between 1 and 500),
  capacity_cups numeric check (capacity_cups is null or capacity_cups > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(manufacturer, model)
);

create table public.kwilt_commerce_retailer_listings (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 160),
  product_id text not null references public.kwilt_commerce_products(id) on delete restrict,
  retailer text not null check (retailer in ('amazon', 'walmart', 'manufacturer')),
  marketplace text not null check (marketplace ~ '^[A-Z]{2}$'),
  external_product_id text not null check (char_length(btrim(external_product_id)) between 1 and 160),
  state text not null default 'active' check (state in ('active', 'withdrawn')),
  verified_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(retailer, marketplace, external_product_id),
  unique(id, product_id)
);

create table public.kwilt_equipment_review_picks (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 160),
  review_id text not null references public.kwilt_equipment_review_versions(id) on delete restrict,
  product_id text not null references public.kwilt_commerce_products(id) on delete restrict,
  retailer_listing_id text not null,
  role text not null check (role in ('lead', 'alternative')),
  position integer not null check (position >= 0),
  rationale text not null check (char_length(btrim(rationale)) between 1 and 2000),
  tradeoff text not null check (char_length(btrim(tradeoff)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (retailer_listing_id, product_id)
    references public.kwilt_commerce_retailer_listings(id, product_id) on delete restrict,
  unique(review_id, position),
  unique(review_id, product_id, retailer_listing_id)
);

alter table public.kwilt_equipment_categories enable row level security;
alter table public.kwilt_equipment_review_versions enable row level security;
alter table public.kwilt_commerce_products enable row level security;
alter table public.kwilt_commerce_retailer_listings enable row level security;
alter table public.kwilt_equipment_review_picks enable row level security;

create policy kwilt_equipment_categories_published_read
  on public.kwilt_equipment_categories for select to anon, authenticated
  using (exists (
    select 1 from public.kwilt_equipment_review_versions review
    where review.category_id = kwilt_equipment_categories.id
      and review.state = 'published'
      and review.reviewed_at <= current_date
      and review.review_by >= current_date
  ));

create policy kwilt_equipment_reviews_published_read
  on public.kwilt_equipment_review_versions for select to anon, authenticated
  using (
    state = 'published'
    and reviewed_at <= current_date
    and review_by >= current_date
  );

create policy kwilt_commerce_products_published_read
  on public.kwilt_commerce_products for select to anon, authenticated
  using (exists (
    select 1
    from public.kwilt_equipment_review_picks pick
    join public.kwilt_equipment_review_versions review on review.id = pick.review_id
    where pick.product_id = kwilt_commerce_products.id
      and review.state = 'published'
      and review.reviewed_at <= current_date
      and review.review_by >= current_date
  ));

create policy kwilt_commerce_listings_published_read
  on public.kwilt_commerce_retailer_listings for select to anon, authenticated
  using (
    state = 'active'
    and exists (
      select 1
      from public.kwilt_equipment_review_picks pick
      join public.kwilt_equipment_review_versions review on review.id = pick.review_id
      where pick.retailer_listing_id = kwilt_commerce_retailer_listings.id
        and review.state = 'published'
        and review.reviewed_at <= current_date
        and review.review_by >= current_date
    )
  );

create policy kwilt_equipment_picks_published_read
  on public.kwilt_equipment_review_picks for select to anon, authenticated
  using (exists (
    select 1 from public.kwilt_equipment_review_versions review
    where review.id = kwilt_equipment_review_picks.review_id
      and review.state = 'published'
      and review.reviewed_at <= current_date
      and review.review_by >= current_date
  ));

grant select on public.kwilt_equipment_categories,
  public.kwilt_equipment_review_versions,
  public.kwilt_commerce_products,
  public.kwilt_commerce_retailer_listings,
  public.kwilt_equipment_review_picks to anon, authenticated;
revoke insert, update, delete on public.kwilt_equipment_categories,
  public.kwilt_equipment_review_versions,
  public.kwilt_commerce_products,
  public.kwilt_commerce_retailer_listings,
  public.kwilt_equipment_review_picks from public, anon, authenticated;

insert into public.kwilt_equipment_categories(id, label)
values ('food-processor', 'Food processor');

insert into public.kwilt_equipment_review_versions(
  id, category_id, version, state, evidence_class, reviewed_at, review_by,
  methodology, substitute_summary, source_urls, published_at
) values (
  'food-processor-review-v1', 'food-processor', 1, 'published',
  'editorial-review', '2026-08-16', '2026-11-16',
  'Reviewed useful capacity, everyday preparation range, storage burden, and the availability of a no-purchase hand-cutting substitute. Kwilt has not tested this product.',
  'A sharp knife works when you do not need a fine, even texture.',
  '[{"label":"KitchenAid food processors","url":"https://www.kitchenaid.com/countertop-appliances/food-processors.html"}]',
  now()
);

insert into public.kwilt_commerce_products(
  id, manufacturer, model, title, image_storage_ref, image_alt, capacity_cups
) values (
  'kitchenaid-7-cup-food-processor', 'KitchenAid', 'KFP0718',
  'KitchenAid 7-Cup Food Processor', null,
  'Compact seven-cup food processor', 7
);

insert into public.kwilt_commerce_retailer_listings(
  id, product_id, retailer, marketplace, external_product_id, state, verified_at
) values (
  'amazon-us-kitchenaid-7-cup-food-processor',
  'kitchenaid-7-cup-food-processor', 'amazon', 'US', 'B07BW1ZPB5',
  'active', '2026-08-16'
);

insert into public.kwilt_equipment_review_picks(
  id, review_id, product_id, retailer_listing_id, role, position, rationale, tradeoff
) values (
  'food-processor-review-v1-lead', 'food-processor-review-v1',
  'kitchenaid-7-cup-food-processor',
  'amazon-us-kitchenaid-7-cup-food-processor', 'lead', 0,
  'A practical size for everyday chopping, slicing, and puréeing.',
  'Seven cups suits ordinary batches, but it is too small when a Recipe explicitly requires a larger processor.'
);
