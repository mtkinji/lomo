import { createClient } from 'npm:@supabase/supabase-js@2.78.0';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createServiceClient() {
  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const jwt = authHeader?.replace(/^Bearer\s+/i, '');

  if (!jwt) {
    throw new AuthenticationError('Missing authorization token.');
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.getUser(jwt);

  if (error || !data.user) {
    throw new AuthenticationError('Invalid authorization token.');
  }

  return { supabase, user: data.user };
}
