// Type shims so VSCode/tsserver can type-check Supabase Edge Functions without requiring
// Deno tooling to be active. Runtime is still Deno (Supabase edge runtime).

declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
}

declare module 'https://deno.land/std@0.224.0/http/server.ts' {
  export type ServeHandler = (req: Request) => Response | Promise<Response>;

  export interface ServeInit {
    port?: number;
    hostname?: string;
    onListen?: (params: { port: number; hostname: string }) => void;
    signal?: AbortSignal;
  }

  export function serve(handler: ServeHandler, options?: ServeInit): void;
}

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}


