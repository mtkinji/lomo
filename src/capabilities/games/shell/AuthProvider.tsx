import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { signOut } from '../platform/auth';

type AuthState = {
  checking: boolean;
  session: Session | null;
  configError: string | null;
  signOut: () => Promise<void>;
};

const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const client = getSupabaseClient();
      void client.auth.getSession().then(({ data, error }) => {
        if (error) setConfigError(error.message);
        setSession(data.session ?? null);
        setChecking(false);
      });
      const subscription = client.auth.onAuthStateChange((_event, next) => setSession(next));
      return () => subscription.data.subscription.unsubscribe();
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Unable to configure Kwilt sign-in.');
      setChecking(false);
      return undefined;
    }
  }, []);

  const value = useMemo<AuthState>(() => ({
    checking,
    session,
    configError,
    signOut: async () => {
      await signOut();
      setSession(null);
    },
  }), [checking, configError, session]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
