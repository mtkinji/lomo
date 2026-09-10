-- Extend the existing reviewed snapshot allowlist; no goal ID, notes, or
-- membership are disclosed by a completion post.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('kwilt_home_private.command(text,jsonb)'::regprocedure);
  if position('not in (''place'',''outing'')' in definition)=0 then
    raise exception 'Home attachment validation changed; review before applying';
  end if;
  execute replace(definition, 'not in (''place'',''outing'')', 'not in (''place'',''outing'',''goal_completed'')');
end;
$$;
