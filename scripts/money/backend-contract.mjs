import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const digest = (value, algorithm = 'sha256') => createHash(algorithm).update(value).digest('hex');
const atomicMigration = '20261101154005_atomic_budget_category_settings.sql';
const rolloverMigration = '20261013123903_category_rollover_start_policy.sql';
const ownerMigration = '20260901040118_canonical_household_money_access.sql';
const canonicalType = value => value === 'timestamptz' ? 'timestamp with time zone' : value;
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function functionsFrom(source, include = () => true) {
  return [...source.matchAll(/create or replace function\s+([\w.]+)\s*\(([\s\S]*?)\)\s*returns\s+(\w+)([\s\S]*?)as\s+\$\$([\s\S]*?)\$\$;/gi)].filter(match => include(match[1])).map(match => {
    const args = match[2].trim() ? match[2].split(',').map(arg => {
      const parsed = arg.trim().match(/^(\w+)\s+(uuid|jsonb|text|integer|timestamptz|boolean)(\s+default\s+[\s\S]+)?$/i);
      if (!parsed) throw new Error(`Unsupported contract argument in ${match[1]}`);
      return { name: parsed[1], type: canonicalType(parsed[2]), default: Boolean(parsed[3]) };
    }) : [];
    return { name: match[1], args, returns: match[3], definer: /security\s+definer/i.test(match[4]),
      language: match[4].match(/language\s+(\w+)/i)?.[1],
      searchPath: match[4].match(/set\s+search_path\s*=\s*(''|public)/i)?.[1] ?? null, bodyHash: digest(match[5], 'md5') };
  });
}

export function buildContract() {
  const functions = [
    ...functionsFrom(read(`supabase/migrations/${atomicMigration}`)),
    ...functionsFrom(read(`supabase/migrations/${rolloverMigration}`)),
    ...functionsFrom(read(`supabase/migrations/${ownerMigration}`), name => [
      'public.budget_effective_owner_user_id', 'private.budget_effective_owner_user_id',
      'private.budget_canonical_adult_owner_user_id', 'private.budget_actor_is_active_household_child',
    ].includes(name)),
  ];
  functions.push(...functionsFrom(read('supabase/migrations/20260710234659_project_active_living_plan_into_budgets.sql')),
    ...functionsFrom(read('supabase/migrations/20260709131031_budget_living_plan_preferences.sql'), name => name === 'public.set_updated_at'));
  if (functions.length !== 14) throw new Error('Budget contract function inventory changed; review its coverage.');
  const columns = [
    ...Object.entries({ actor_user_id: 'uuid', request_id: 'uuid', owner_user_id: 'uuid', category_id: 'uuid',
      request: 'jsonb', receipt: 'jsonb', created_at: 'timestamp with time zone' }).map(([name, type]) => ({ schema: 'private', table: 'budget_category_settings_receipts', name, type })),
    ...Object.entries({ rollover_policy: 'jsonb', base_budget_cents: 'integer', rollover_enabled: 'boolean',
      funding_rhythm: 'text', expected_need_cents: 'integer', expected_need_due_month: 'text', plan_role: 'text',
      updated_at: 'timestamp with time zone' }).map(([name, type]) => ({ table: 'budget_plans', name, type })),
    ...Object.entries({ name: 'text', updated_at: 'timestamp with time zone', status: 'text' }).map(([name, type]) => ({ table: 'budget_categories', name, type })),
  ];
  const household = "((COALESCE(( SELECT ((auth.jwt() ->> 'is_anonymous'::text))::boolean AS bool), false) IS FALSE) AND (user_id = ( SELECT budget_effective_owner_user_id() AS budget_effective_owner_user_id)))";
  const policies = [
    { table: 'budget_planning_basis_overrides', name: 'Users can read their Money planning basis', qual: "((COALESCE(( SELECT ((auth.jwt() ->> 'is_anonymous'::text))::boolean AS bool), false) IS FALSE) AND (( SELECT auth.uid() AS uid) = user_id))" },
    { table: 'budget_planning_basis_overrides', name: 'Household adults can read the Money planning basis', qual: household },
    { table: 'budget_living_plan_config', name: 'Household adults can read the Money plan config', qual: household },
    { table: 'budget_living_plan_config', name: 'Owners read living config', qual: "((COALESCE(( SELECT ((auth.jwt() ->> 'is_anonymous'::text))::boolean AS bool), false) IS FALSE) AND (user_id = ( SELECT auth.uid() AS uid)))" },
  ];
  const triggers = [
    { table: 'budget_categories', name: 'set_budget_categories_updated_at', function: 'set_updated_at', type: 19, columns: [] },
    { table: 'budget_plans', name: 'set_budget_plans_updated_at', function: 'set_updated_at', type: 19, columns: [] },
    { table: 'budget_active_living_plans', name: 'project_active_living_plan_into_budget_plans',
      function: 'project_active_living_plan_into_budget_plans', type: 21, columns: ['plan_version_id'] },
  ];
  const contract = { version: 1, projectRef: 'sqxwjtorodqjdfnuvprf', origin: 'https://auth.kwilt.app', functions, columns, policies, triggers };
  contract.checkIds = [...functions.map(fn => `function:${fn.name}`), ...columns.map(c => `column:${c.schema ?? 'public'}.${c.table}.${c.name}`),
    ...policies.map(p => `policy:${p.name}`), ...triggers.map(t => `trigger:${t.name}`), 'command-execute', 'private-receipts', 'household-helper-access', 'preview-read-access', 'policy-select-scope', 'rollover-constraint', 'rollover-trigger'];
  contract.hash = digest(JSON.stringify(contract));
  return contract;
}

export function contractQuery(contract) {
  const checks = [];
  const check = (id, sql) => checks.push(`select ${q(id)} as id, coalesce((${sql}),false) as ok`);
  for (const fn of contract.functions) {
    const [schema, name] = fn.name.split('.');
    const names = fn.args.length ? `array[${fn.args.map(arg => q(arg.name)).join(',')}]::text[]` : 'null::text[]';
    const searchPathCheck = fn.searchPath === null
      ? `not exists(select 1 from unnest(p.proconfig) config where config like 'search_path=%')`
      : `p.proconfig @> array[${q(`search_path=${fn.searchPath === "''" ? '""' : fn.searchPath}`)}]::text[]`;
    check(`function:${fn.name}`, `select count(*)=1 and bool_and(
      pg_catalog.md5(p.prosrc)=${q(fn.bodyHash)} and p.prosecdef=${fn.definer}
      and pg_catalog.format_type(p.prorettype,null)=${q(fn.returns)} and l.lanname=${q(fn.language)}
      and p.proargnames is not distinct from ${names} and p.pronargdefaults=${fn.args.filter(arg => arg.default).length}
      and ${searchPathCheck})
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      join pg_catalog.pg_language l on l.oid=p.prolang
      where n.nspname=${q(schema)} and p.proname=${q(name)} and p.prokind='f'
      and pg_catalog.oidvectortypes(p.proargtypes)=${q(fn.args.map(arg => arg.type).join(', '))}`);
  }
  for (const trigger of contract.triggers) check(`trigger:${trigger.name}`, `exists(
    select 1 from pg_catalog.pg_trigger g join pg_catalog.pg_class t on t.oid=g.tgrelid
    join pg_catalog.pg_namespace n on n.oid=t.relnamespace join pg_catalog.pg_proc p on p.oid=g.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid=p.pronamespace
    where n.nspname='public' and t.relname=${q(trigger.table)} and g.tgname=${q(trigger.name)}
      and not g.tgisinternal and g.tgenabled in ('O','A') and g.tgtype=${trigger.type}
      and g.tgqual is null and g.tgnargs=0 and fn.nspname='public' and p.proname=${q(trigger.function)}
      and p.pronargs=0 and array(select a.attname::text from unnest(g.tgattr) with ordinality cols(num,ord)
        join pg_catalog.pg_attribute a on a.attrelid=t.oid and a.attnum=cols.num order by cols.ord)
        =array[${trigger.columns.map(q).join(',')}]::text[] )`);
  for (const c of contract.columns) check(`column:${c.schema ?? 'public'}.${c.table}.${c.name}`, `exists(select 1 from pg_catalog.pg_attribute a
    join pg_catalog.pg_class t on t.oid=a.attrelid join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    where n.nspname=${q(c.schema ?? 'public')} and t.relname=${q(c.table)} and a.attname=${q(c.name)} and not a.attisdropped
      and pg_catalog.format_type(a.atttypid,a.atttypmod)=${q(c.type)})`);
  for (const p of contract.policies) check(`policy:${p.name}`, `exists(select 1 from pg_catalog.pg_policies p
    where p.schemaname='public' and p.tablename=${q(p.table)} and p.policyname=${q(p.name)}
      and p.cmd='SELECT' and p.roles=array['authenticated']::name[] and p.permissive='PERMISSIVE'
      and pg_catalog.regexp_replace(replace(p.qual,'public.',''),'\\s+','','g')=${q(p.qual.replace(/\s+/g, ''))})`);
  check('command-execute', `select count(*)=3 and bool_and(
    case when n.nspname='private' then not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
      else pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') end
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE'))
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='public' and p.proname in ('save_budget_category_settings','get_budget_category_settings_receipt'))
      or (n.nspname='private' and p.proname='promote_budget_living_plan_for_owner')`);
  check('household-helper-access', `pg_catalog.has_schema_privilege('authenticated','public','USAGE')
    and pg_catalog.has_schema_privilege('authenticated','private','USAGE')
    and (select count(*)=2 and bool_and(pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
      where p.proname='budget_effective_owner_user_id' and n.nspname in ('public','private'))`);
  check('private-receipts', `exists(select 1 from pg_catalog.pg_class t join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    where n.nspname='private' and t.relname='budget_category_settings_receipts' and t.relrowsecurity
    and not exists(select 1 from (values ('anon'),('authenticated'),('service_role')) r(role)
      where pg_catalog.has_table_privilege(r.role,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')))`);
  check('preview-read-access', `select count(*)=4 and bool_and(t.relrowsecurity and pg_catalog.has_table_privilege('authenticated',t.oid,'SELECT'))
    from pg_catalog.pg_class t join pg_catalog.pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname in ('budget_categories','budget_plans','budget_planning_basis_overrides','budget_living_plan_config')`);
  check('policy-select-scope', `not exists(select 1 from pg_catalog.pg_policies p
    where p.schemaname='public' and p.permissive='PERMISSIVE' and p.cmd in ('SELECT','ALL')
    and ((p.tablename='budget_living_plan_config' and p.policyname not in ('Owners read living config','Household adults can read the Money plan config'))
      or (p.tablename='budget_planning_basis_overrides' and p.policyname not in ('Users can read their Money planning basis','Household adults can read the Money planning basis'))))`);
  check('rollover-constraint', `exists(select 1 from pg_catalog.pg_constraint c join pg_catalog.pg_class t on t.oid=c.conrelid
    join pg_catalog.pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='budget_plans'
    and c.conname='budget_plans_valid_rollover_policy' and c.convalidated and c.contype='c'
    and replace(pg_catalog.pg_get_expr(c.conbin,c.conrelid),'public.','')='valid_budget_rollover_policy(rollover_policy)')`);
  check('rollover-trigger', `exists(select 1 from pg_catalog.pg_trigger g join pg_catalog.pg_class t on t.oid=g.tgrelid
    join pg_catalog.pg_namespace n on n.oid=t.relnamespace join pg_catalog.pg_proc p on p.oid=g.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid=p.pronamespace where n.nspname='public' and t.relname='budget_plans'
    and g.tgname='track_budget_rollover_amount' and g.tgenabled in ('O','A') and g.tgtype=23 and g.tgqual is null
    and fn.nspname='public' and p.proname='track_budget_rollover_amount')`);
  return `with checks as (${checks.join('\nunion all\n')}) select id,ok from checks order by id;`;
}

export function validateChecks(contract, rows) {
  if (!Array.isArray(rows) || rows.length !== contract.checkIds.length
    || new Set(rows.map(row => row?.id)).size !== contract.checkIds.length
    || rows.some(row => !contract.checkIds.includes(row?.id))) throw new Error('Backend compatibility observation is incomplete.');
  const failed = rows.filter(row => row.ok !== true).map(row => row.id);
  if (failed.length) throw new Error(`Budget backend incompatible: ${failed.join(', ')}`);
}

export function resolveProfile(eas, profile, seen = new Set()) {
  if (seen.has(profile)) throw new Error('EAS profile inheritance cycle.');
  const config = eas.build?.[profile];
  if (!config) throw new Error('Unknown release profile.');
  seen.add(profile);
  return { ...(config.extends ? resolveProfile(eas, config.extends, seen) : {}), ...config.env };
}

export function resolveAppTarget({ env, effective, profile }) {
  const childEnv = { ...env, ...effective, EAS_BUILD_PROFILE: profile, DOTENV_CONFIG_QUIET: 'true' };
  delete childEnv.SUPABASE_ACCESS_TOKEN;
  try {
    const result = execFileSync(process.execPath, ['-e',
      "process.stdout.write(JSON.stringify(require('./app.config.ts').extra.supabaseUrl))"],
      { cwd: root, env: childEnv, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(result);
  } catch { throw new Error('Effective Expo release backend could not be verified; release stopped.'); }
}

export async function verifyBackend({ contract, env, eas, profile, fetcher = fetch, resolveTarget = resolveAppTarget }) {
  const effective = resolveProfile(eas, profile);
  if (effective.SUPABASE_URL !== contract.origin || (env.SUPABASE_URL && env.SUPABASE_URL !== contract.origin)
    || (env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_URL !== contract.origin)) throw new Error('Release backend target does not match the Budget contract.');
  if (await resolveTarget({ env, effective, profile }) !== contract.origin) throw new Error('Effective Expo release backend target differs from the checked backend.');
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required for the read-only release preflight.');
  const request = async (suffix, body) => {
    let response;
    try { response = await fetcher(`https://api.supabase.com/v1/projects/${contract.projectRef}/${suffix}`, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }); } catch { throw new Error('Backend preflight request unavailable; release stopped.'); }
    if (!response.ok) throw new Error(`Backend preflight request failed (${response.status})`);
    try { return await response.json(); } catch { throw new Error('Backend preflight returned an invalid response.'); }
  };
  const hostname = await request('custom-hostname');
  if (hostname?.custom_hostname !== new URL(contract.origin).hostname) throw new Error('Release hostname does not belong to the expected backend target.');
  validateChecks(contract, await request('database/query/read-only', { query: contractQuery(contract) }));
  return { contractVersion: contract.version, contractHash: contract.hash, projectRef: contract.projectRef,
    origin: contract.origin, profile, observedAt: new Date().toISOString(), checksPassed: contract.checkIds.length };
}

async function main() {
  const args = process.argv.slice(2);
  const contract = buildContract();
  if (args.length === 1 && args[0] === '--query') { console.log(contractQuery(contract)); return; }
  if (args.length !== 2 || args[0] !== '--profile') throw new Error('Usage: backend-contract.mjs --profile <EAS profile>');
  const result = await verifyBackend({ contract, env: process.env, eas: JSON.parse(read('eas.json')), profile: args[1] });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim());
  console.log(JSON.stringify({ ...result, sourceHead: head, dirty, evidence: 'database-catalog-only; native/API-runtime acceptance separate' }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
