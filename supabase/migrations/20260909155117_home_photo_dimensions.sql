-- Optional bounded dimensions preserve new photo aspect ratios; old posts retain their fallback.
do $$
declare source text;
begin
 select pg_get_functiondef('kwilt_home_private.command_v1(text,jsonb)'::regprocedure) into source;
 if position('item-''path''-''alt''<>''{}''::jsonb' in source)=0 then raise exception 'Home media validation signature changed'; end if;
 source:=replace(source,'item-''path''-''alt''<>''{}''::jsonb','item-''path''-''alt''-''width''-''height''<>''{}''::jsonb');
 source:=replace(source,'for item in select value from jsonb_array_elements(coalesce(args->''media'',''[]'')) loop', $patch$for item in select value from jsonb_array_elements(coalesce(args->'media','[]')) loop
 if item ? 'width' or item ? 'height' then
 if jsonb_typeof(item->'width') is distinct from 'number' or jsonb_typeof(item->'height') is distinct from 'number' then raise exception 'Invalid photo dimensions'; end if;
 if (item->>'width')::numeric not between 1 and 10000 or (item->>'height')::numeric not between 1 and 10000 then raise exception 'Invalid photo dimensions'; end if;
 end if;$patch$);
 execute source;
end $$;
