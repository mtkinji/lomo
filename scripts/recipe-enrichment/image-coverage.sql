-- Read-only operational coverage for the review-gated Recipe hero-image pipeline.
-- A Recipe is classified by its furthest trustworthy state; rejected candidates remain visible
-- only when no candidate is still active, under review, approved, or published.
with ranked as (
  select
    roster_id,
    case
      when bool_or(status = 'published') then 'published'
      when bool_or(status = 'approved') then 'approved'
      when bool_or(status = 'editorial_review') then 'editorial_review'
      when bool_or(status in ('generated', 'qa_checking', 'generating', 'queued')) then 'in_pipeline'
      when bool_or(status = 'failed') then 'failed'
      when bool_or(status = 'rejected') then 'rejected'
      else 'missing'
    end as recipe_state
  from public.kwilt_recipe_image_jobs
  group by roster_id
), all_rosters as (
  select roster_id
  from public.kwilt_recipe_publications
  where roster_id is not null
)
select
  coalesce(ranked.recipe_state, 'missing') as recipe_state,
  count(*) as recipes
from all_rosters
left join ranked using (roster_id)
group by coalesce(ranked.recipe_state, 'missing')
order by recipe_state;
