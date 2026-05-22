// Type shim for the remote std/http import used by Supabase Edge Functions.
// Deno globals and npm: package exports come from supabase/functions/tsconfig.json.

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

