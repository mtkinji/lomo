import { getSupabaseClient } from '../backend/supabaseClient';
import { getSupabaseUrl } from '../../utils/getEnv';

export type ExecutionTargetDefinitionRow = {
  id: string;
  kind: string;
  display_name: string;
  description: string | null;
  version: number;
  config_schema: any;
  requirements_schema: any;
  playbook_schema: any;
  default_config: any;
  default_requirements: any;
  default_playbook: any;
};

export type ExecutionTargetRow = {
  id: string;
  owner_id: string;
  definition_id: string | null;
  kind: string;
  display_name: string;
  config: any;
  requirements: any;
  playbook: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function getKwiltMcpBaseUrl(): string | null {
  // Derive from Supabase project URL.
  // supabaseUrl format: https://<project-ref>.supabase.co
  const supabaseUrl = getSupabaseUrl()?.trim();
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    const host = u.hostname ?? '';
    const suffix = '.supabase.co';
    // Custom domain: prefer same origin for Edge Functions.
    if (!host.endsWith(suffix)) {
      const normalized = supabaseUrl.replace(/\/+$/, '');
      return `${normalized}/functions/v1/kwilt-mcp`;
    }
    const projectRef = host.slice(0, -suffix.length);
    if (!projectRef) return null;
    return `https://${projectRef}.functions.supabase.co/functions/v1/kwilt-mcp`;
  } catch {
    return null;
  }
}

export async function listExecutionTargetDefinitions(): Promise<ExecutionTargetDefinitionRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_execution_target_definitions')
    .select('*')
    .order('display_name', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data as any;
}

export async function listExecutionTargets(): Promise<ExecutionTargetRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_execution_targets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return data as any;
}

export async function createExecutionTargetFromDefinition(args: {
  definitionId: string;
  displayName: string;
  kind: string;
  config: any;
  requirements: any;
  playbook: any;
}): Promise<ExecutionTargetRow | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('kwilt_execution_targets')
    .insert({
      definition_id: args.definitionId,
      kind: args.kind,
      display_name: args.displayName,
      config: args.config ?? {},
      requirements: args.requirements ?? {},
      playbook: args.playbook ?? {},
      is_enabled: true,
    })
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

export async function updateExecutionTarget(args: {
  id: string;
  displayName?: string;
  isEnabled?: boolean;
  config?: any;
  requirements?: any;
  playbook?: any;
}): Promise<ExecutionTargetRow | null> {
  const supabase = getSupabaseClient();
  const patch: Record<string, any> = {};
  if (typeof args.displayName === 'string') patch.display_name = args.displayName;
  if (typeof args.isEnabled === 'boolean') patch.is_enabled = args.isEnabled;
  if (args.config !== undefined) patch.config = args.config;
  if (args.requirements !== undefined) patch.requirements = args.requirements;
  if (args.playbook !== undefined) patch.playbook = args.playbook;
  const { data, error } = await supabase
    .from('kwilt_execution_targets')
    .update(patch)
    .eq('id', args.id)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return data as any;
}

export async function deleteExecutionTarget(args: { id: string }): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('kwilt_execution_targets').delete().eq('id', args.id);
  return !error;
}


