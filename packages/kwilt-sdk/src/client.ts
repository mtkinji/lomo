export type KwiltSupabaseClient = {
  from: (table: string) => any;
};

export type KwiltSdk = {
  supabase: KwiltSupabaseClient;
};

export function createKwiltSdk(supabase: KwiltSupabaseClient): KwiltSdk {
  return { supabase };
}
