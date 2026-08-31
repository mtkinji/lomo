import type { Session } from '@supabase/supabase-js';

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'kwilt://auth/callback'),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    expoConfig: { scheme: 'kwilt' },
  },
}));

const mockGetSupabaseClient = jest.fn();
const mockResetSupabaseAuthStorage = jest.fn(async () => undefined);

jest.mock('./supabaseClient', () => ({
  getSupabaseClient: () => mockGetSupabaseClient(),
  resetSupabaseAuthStorage: () => mockResetSupabaseAuthStorage(),
  flushSupabaseAuthStorage: jest.fn(async () => undefined),
}));

jest.mock('../../store/useAuthPromptStore', () => ({
  useAuthPromptStore: {
    getState: () => ({
      open: jest.fn(),
    }),
  },
}));

import {
  EmailPasswordSignInError,
  getSession,
  isInvalidRefreshTokenError,
  signInWithEmailPassword,
  signInWithProvider,
} from './auth';
import * as WebBrowser from 'expo-web-browser';

const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.Mock;

describe('auth invalid refresh recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('coalesces invalid refresh recovery when getSession is called concurrently', async () => {
    const signOutMock = jest.fn(async () => ({ error: null }));
    const supabase = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: null as Session | null },
          error: { message: 'Invalid Refresh Token: token not found' },
        })),
        signOut: signOutMock,
      },
    };
    mockGetSupabaseClient.mockReturnValue(supabase);

    await Promise.all([getSession(), getSession()]);

    expect(mockResetSupabaseAuthStorage).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('does not clear storage for non-refresh errors', async () => {
    const signOutMock = jest.fn(async () => ({ error: null }));
    const supabase = {
      auth: {
        getSession: jest.fn(async () => ({
          data: { session: null as Session | null },
          error: { message: 'Network timeout' },
        })),
        signOut: signOutMock,
      },
    };
    mockGetSupabaseClient.mockReturnValue(supabase);

    await getSession();

    expect(mockResetSupabaseAuthStorage).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('detects invalid refresh token messages robustly', () => {
    expect(isInvalidRefreshTokenError({ message: 'Invalid Refresh Token' })).toBe(true);
    expect(isInvalidRefreshTokenError({ message: 'refresh token invalid' })).toBe(true);
    expect(isInvalidRefreshTokenError({ message: 'other failure' })).toBe(false);
    expect(isInvalidRefreshTokenError(null)).toBe(false);
  });
});
describe('OAuth callback failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('turns an Apple provider callback failure into a safe retry message', async () => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        signInWithOAuth: jest.fn(async () => ({
          data: { url: 'https://auth.kwilt.app/auth/v1/authorize?provider=apple' },
          error: null,
        })),
      },
    });
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url:
        'kwilt://auth/callback?' +
        'error=server_error&error_code=unexpected_failure&' +
        'error_description=Unable+to+exchange+external+code%3A+cacb' +
        '#error=server_error&error_code=unexpected_failure&' +
        'error_description=Unable+to+exchange+external+code%253A+cacb&sb=opaque',
    });

    await expect(signInWithProvider('apple')).rejects.toThrow(
      'Apple sign-in is temporarily unavailable. Please try again, or continue with Google.',
    );
  });
});

describe('email and password sign-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes the email, preserves the password, and returns the ordinary session', async () => {
    const session = { access_token: 'opaque', user: { id: 'user-1' } } as Session;
    const signInWithPassword = jest.fn(async () => ({ data: { session }, error: null }));
    mockGetSupabaseClient.mockReturnValue({ auth: { signInWithPassword } });

    await expect(
      signInWithEmailPassword('  Reviewer@Example.COM ', '  keep password spaces  '),
    ).resolves.toBe(session);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'reviewer@example.com',
      password: '  keep password spaces  ',
    });
  });

  it.each([
    [{ message: 'Invalid login credentials' }, null],
    [null, null],
  ])('returns one bounded error without exposing backend details', async (error, session) => {
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        signInWithPassword: jest.fn(async () => ({ data: { session }, error })),
      },
    });

    const result = signInWithEmailPassword('reviewer@example.com', 'not-a-real-password');
    await expect(result).rejects.toBeInstanceOf(EmailPasswordSignInError);
    await expect(result).rejects.toThrow("That email or password wasn't recognized. Try again.");
    await expect(result).rejects.not.toThrow('Invalid login credentials');
  });
});
