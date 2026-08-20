-- Rollback-only assertions for the private Recipe editorial research queue.
begin;

insert into public.kwilt_recipe_editorial_enrichment_jobs(
  id, roster_id, source_recipe_hash, source, prompt_version, model
) values (
  '98000000-0000-0000-0000-000000000001',
  'ZZ998',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '{"rosterId":"ZZ998","sourceRecipeHash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","title":"Test recipe","description":null,"category":"Dinner","cuisine":"Test","ingredients":["one"],"instructions":["Use one pan."]}',
  'kwilt-recipe-editorial-v1',
  'gpt-5.6-luna'
);

do $$
declare claimed public.kwilt_recipe_editorial_enrichment_jobs;
begin
  select * into claimed from public.claim_kwilt_recipe_editorial_enrichment_jobs(1);
  if claimed.id <> '98000000-0000-0000-0000-000000000001' then raise exception 'queued editorial job was not claimed'; end if;
  if claimed.status <> 'researching' or claimed.attempt_count <> 1 or claimed.lease_token is null then
    raise exception 'editorial claim did not establish a lease';
  end if;

  if not public.complete_kwilt_recipe_editorial_enrichment_job(
    claimed.id,
    claimed.lease_token,
    '{"rosterId":"ZZ998","sourceRecipeHash":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
    '[{"title":"Source","url":"https://example.invalid/source"}]',
    'resp_test',
    '{"inputTokens":10,"outputTokens":20,"totalTokens":30}'
  ) then raise exception 'valid editorial completion was rejected'; end if;
end $$;

do $$ begin
  if (select status from public.kwilt_recipe_editorial_enrichment_jobs where id = '98000000-0000-0000-0000-000000000001') <> 'researched'
    or (select researched_at from public.kwilt_recipe_editorial_enrichment_jobs where id = '98000000-0000-0000-0000-000000000001') is null
  then raise exception 'completed editorial job did not preserve researched state'; end if;
end $$;

insert into public.kwilt_recipe_editorial_enrichment_operation_tokens(token_hash, scope, uses_remaining, expires_at)
values ('sha256:test-editorial-token', 'process', 1, now() + interval '5 minutes');
do $$ begin
  if not public.consume_kwilt_recipe_editorial_enrichment_operation_token('sha256:test-editorial-token', 'process') then
    raise exception 'valid editorial operation token was rejected';
  end if;
  if public.consume_kwilt_recipe_editorial_enrichment_operation_token('sha256:test-editorial-token', 'process') then
    raise exception 'editorial operation token was reusable';
  end if;
end $$;

rollback;
