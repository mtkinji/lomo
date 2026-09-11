import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleUnifiedChatTranscription } from './handler.ts';

serve(req => handleUnifiedChatTranscription(req, {
  apiKey: Deno.env.get('OPENAI_API_KEY')?.trim(),
  fetch,
  authorize: async (token, signal) => {
    const url = Deno.env.get('SUPABASE_URL')?.trim();
    const key = (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY'))?.trim();
    if (!url || !key) return false;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
    });
    const { data, error } = await client.auth.getUser(token);
    return !error && Boolean(data.user);
  },
}));
