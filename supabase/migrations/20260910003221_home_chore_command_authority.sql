-- Chore posts have no human author. Reject both supported edit/delete ID aliases
-- and use a null-safe ownership comparison in the legacy command implementation.
do $$
declare
  target regprocedure := coalesce(to_regprocedure('kwilt_home_private.command_v1(text,jsonb)'), to_regprocedure('kwilt_home_private.command(text,jsonb)'));
  definition text;
begin
  definition := pg_get_functiondef(target);
  if position('if p.author_id<>u then' in definition) = 0 then
    raise exception 'Home ownership guard changed; review migration';
  end if;
  definition := replace(definition, 'if p.author_id<>u then', 'if p.author_id is distinct from u then');
  definition := replace(definition, 'where id=(args->>''id'')::uuid and kind=''chore_update''', 'where id=coalesce(args->>''postId'',args->>''id'')::uuid and kind=''chore_update''');
  execute definition;
end;
$$;
