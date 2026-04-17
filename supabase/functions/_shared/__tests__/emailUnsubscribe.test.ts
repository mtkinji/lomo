// Jest tests for `_shared/emailUnsubscribe.ts`.
//
// Phase 7.1 of docs/email-system-ga-plan.md.
//
// Coverage:
//   - HMAC token roundtrip (encode → decode returns the original payload)
//   - Forged / tampered token rejection (signature mismatch, bad payload)
//   - Missing-secret handling (both sides fail closed with null)
//   - Category taxonomy mapping from campaign names
//   - URL builders: visible (kwilt.app) and one-click (supabase) shapes

import { webcrypto } from 'node:crypto';

declare const globalThis: {
  Deno?: { env: { get: (k: string) => string | undefined } };
  crypto?: typeof webcrypto;
};

beforeAll(() => {
  // Node's built-in crypto has `subtle`, but on some versions `globalThis.crypto`
  // isn't auto-installed by Jest. Pin it here so `crypto.subtle` resolves.
  if (!globalThis.crypto) {
    (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
  }
  globalThis.Deno = {
    env: {
      get: (k: string) => process.env[k],
    },
  };
});

afterAll(() => {
  delete globalThis.Deno;
});

function loadModule() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../emailUnsubscribe') as typeof import('../emailUnsubscribe');
}

const TEST_SECRET = 'x'.repeat(48); // >= 32 chars so hasUnsubscribeSecret returns true.
const TEST_UID = '11111111-2222-3333-4444-555555555555';

describe('emailUnsubscribe — HMAC token codec (Phase 7.1)', () => {
  const ORIG_SECRET = process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET;

  afterEach(() => {
    if (ORIG_SECRET == null) delete process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET;
    else process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = ORIG_SECRET;
  });

  it('encodes + decodes a valid token round-trip', async () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = TEST_SECRET;
    const mod = loadModule();
    const token = await mod.encodeUnsubscribeToken({
      uid: TEST_UID,
      cat: 'chapter_digest',
    });
    expect(token).toBeTruthy();
    const decoded = await mod.decodeUnsubscribeToken(token!);
    expect(decoded).not.toBeNull();
    expect(decoded!.uid).toBe(TEST_UID);
    expect(decoded!.cat).toBe('chapter_digest');
    // iat is epoch seconds — must be a non-zero integer.
    expect(typeof decoded!.iat).toBe('number');
    expect(decoded!.iat).toBeGreaterThan(0);
  });

  it('rejects tokens signed with a different secret', async () => {
    // Encode under secret A; decode under secret B.
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = 'a'.repeat(48);
    const modA = loadModule();
    const token = await modA.encodeUnsubscribeToken({
      uid: TEST_UID,
      cat: 'welcome_drip',
    });
    expect(token).toBeTruthy();

    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = 'b'.repeat(48);
    const modB = loadModule();
    const decoded = await modB.decodeUnsubscribeToken(token!);
    expect(decoded).toBeNull();
  });

  it('rejects tokens whose payload has been tampered with', async () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = TEST_SECRET;
    const mod = loadModule();
    const token = await mod.encodeUnsubscribeToken({
      uid: TEST_UID,
      cat: 'chapter_digest',
    });
    expect(token).toBeTruthy();

    // Token shape is `<base64url-payload>.<base64url-sig>`. Swap the first
    // character of the payload — the HMAC check should then reject.
    const [payload, sig] = token!.split('.');
    const tamperedChar = payload[0] === 'A' ? 'B' : 'A';
    const tamperedPayload = tamperedChar + payload.slice(1);
    const tampered = `${tamperedPayload}.${sig}`;
    const decoded = await mod.decodeUnsubscribeToken(tampered);
    expect(decoded).toBeNull();
  });

  it('rejects tokens with an unknown category', async () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = TEST_SECRET;
    const mod = loadModule();
    // Bypass the typed API and encode a bogus category directly through the
    // internal path so we exercise the category validator.
    const token = await mod.encodeUnsubscribeToken({
      uid: TEST_UID,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cat: 'not_a_real_category' as any,
    });
    expect(token).toBeTruthy();
    const decoded = await mod.decodeUnsubscribeToken(token!);
    expect(decoded).toBeNull();
  });

  it('rejects tokens with empty or missing uid', async () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = TEST_SECRET;
    const mod = loadModule();
    const token = await mod.encodeUnsubscribeToken({
      uid: '',
      cat: 'welcome_drip',
    });
    expect(token).toBeTruthy();
    const decoded = await mod.decodeUnsubscribeToken(token!);
    expect(decoded).toBeNull();
  });

  it('returns null when the signing secret is unconfigured', async () => {
    delete process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET;
    const mod = loadModule();
    expect(mod.hasUnsubscribeSecret()).toBe(false);
    const token = await mod.encodeUnsubscribeToken({
      uid: TEST_UID,
      cat: 'chapter_digest',
    });
    expect(token).toBeNull();
    const decoded = await mod.decodeUnsubscribeToken('anything');
    expect(decoded).toBeNull();
  });

  it('treats a too-short secret as unconfigured (defensive minimum)', async () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = 'tinysecret';
    const mod = loadModule();
    expect(mod.hasUnsubscribeSecret()).toBe(false);
  });
});

describe('emailUnsubscribe — category mapping (Phase 7.1)', () => {
  it('maps welcome drip campaigns to the welcome_drip category', () => {
    const mod = loadModule();
    expect(mod.categoryForCampaign('welcome_day_0')).toBe('welcome_drip');
    expect(mod.categoryForCampaign('welcome_day_1')).toBe('welcome_drip');
    expect(mod.categoryForCampaign('welcome_day_3')).toBe('welcome_drip');
    expect(mod.categoryForCampaign('welcome_day_7')).toBe('welcome_drip');
  });

  it('maps chapter_digest -> chapter_digest', () => {
    const mod = loadModule();
    expect(mod.categoryForCampaign('chapter_digest')).toBe('chapter_digest');
  });

  it('maps both winback campaigns to streak_winback', () => {
    const mod = loadModule();
    expect(mod.categoryForCampaign('winback_1')).toBe('streak_winback');
    expect(mod.categoryForCampaign('winback_2')).toBe('streak_winback');
  });

  it('maps trial_expiry to the marketing category', () => {
    const mod = loadModule();
    expect(mod.categoryForCampaign('trial_expiry')).toBe('marketing');
  });

  it('returns null for transactional / admin campaigns (never unsubscribable)', () => {
    const mod = loadModule();
    // These are the campaigns we intentionally DO NOT attach unsubscribe to —
    // they're either user-initiated (invite) or account-state (pro billing)
    // or admin-only (secrets). See emailUnsubscribe.ts::categoryForCampaign
    // — changing this list is a conscious scope change, not a bugfix.
    expect(mod.categoryForCampaign('pro_granted')).toBeNull();
    expect(mod.categoryForCampaign('pro_code')).toBeNull();
    expect(mod.categoryForCampaign('goal_invite')).toBeNull();
    expect(mod.categoryForCampaign('secret_expiry')).toBeNull();
  });

  it('returns null for unknown campaigns (fail-closed: no unsubscribe URL)', () => {
    const mod = loadModule();
    expect(mod.categoryForCampaign('')).toBeNull();
    expect(mod.categoryForCampaign('made_up_campaign')).toBeNull();
  });

  it('category taxonomy columns 1:1 match kwilt_email_preferences schema', () => {
    // Defensive: if someone adds/removes a category here they also have to
    // migrate the table. Asserted by comparing against the canonical list.
    const mod = loadModule();
    expect(new Set(mod.EMAIL_PREFERENCE_CATEGORIES)).toEqual(
      new Set(['welcome_drip', 'chapter_digest', 'streak_winback', 'marketing']),
    );
  });
});

describe('emailUnsubscribe — URL builders (Phase 7.1)', () => {
  const ORIG_VIS = process.env.KWILT_EMAIL_UNSUBSCRIBE_BASE_URL;
  const ORIG_POST = process.env.KWILT_EMAIL_UNSUBSCRIBE_POST_URL;
  const ORIG_SB = process.env.SUPABASE_URL;

  afterEach(() => {
    if (ORIG_VIS == null) delete process.env.KWILT_EMAIL_UNSUBSCRIBE_BASE_URL;
    else process.env.KWILT_EMAIL_UNSUBSCRIBE_BASE_URL = ORIG_VIS;
    if (ORIG_POST == null) delete process.env.KWILT_EMAIL_UNSUBSCRIBE_POST_URL;
    else process.env.KWILT_EMAIL_UNSUBSCRIBE_POST_URL = ORIG_POST;
    if (ORIG_SB == null) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = ORIG_SB;
  });

  it('visible URL defaults to kwilt.app/unsubscribe with a urlencoded token param', () => {
    delete process.env.KWILT_EMAIL_UNSUBSCRIBE_BASE_URL;
    const mod = loadModule();
    const url = mod.buildVisibleUnsubscribeUrl('abc.def');
    expect(url).toBe('https://kwilt.app/unsubscribe?t=abc.def');
  });

  it('visible URL honors KWILT_EMAIL_UNSUBSCRIBE_BASE_URL override and strips trailing slash', () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_BASE_URL = 'https://staging.kwilt.app/unsubscribe/';
    const mod = loadModule();
    const url = mod.buildVisibleUnsubscribeUrl('xyz');
    expect(url).toBe('https://staging.kwilt.app/unsubscribe?t=xyz');
  });

  it('one-click URL derives from SUPABASE_URL when no explicit override is set', () => {
    delete process.env.KWILT_EMAIL_UNSUBSCRIBE_POST_URL;
    process.env.SUPABASE_URL = 'https://proj.supabase.co/';
    const mod = loadModule();
    const url = mod.buildOneClickUnsubscribeUrl('tkn');
    expect(url).toBe('https://proj.supabase.co/functions/v1/unsubscribe?t=tkn');
  });

  it('one-click URL honors KWILT_EMAIL_UNSUBSCRIBE_POST_URL override', () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_POST_URL = 'https://api.kwilt.app/u/';
    const mod = loadModule();
    const url = mod.buildOneClickUnsubscribeUrl('tkn');
    expect(url).toBe('https://api.kwilt.app/u?t=tkn');
  });

  it('one-click URL returns empty string when neither override nor SUPABASE_URL is set', () => {
    delete process.env.KWILT_EMAIL_UNSUBSCRIBE_POST_URL;
    delete process.env.SUPABASE_URL;
    const mod = loadModule();
    expect(mod.buildOneClickUnsubscribeUrl('tkn')).toBe('');
  });

  it('buildUnsubscribeHeaders emits RFC 8058 shape with both headers', async () => {
    process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET = TEST_SECRET;
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    const mod = loadModule();
    const result = await mod.buildUnsubscribeHeaders({
      userId: TEST_UID,
      category: 'chapter_digest',
    });
    expect(result).not.toBeNull();
    // List-Unsubscribe must be a bracketed URI per RFC 2369.
    expect(result!.headers['List-Unsubscribe']).toMatch(/^<https:\/\/.+>$/);
    expect(result!.headers['List-Unsubscribe']).toContain('functions/v1/unsubscribe?t=');
    // List-Unsubscribe-Post must be exactly this string per RFC 8058.
    expect(result!.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    // The visible URL is what goes in the in-body footer link.
    expect(result!.visibleUrl).toMatch(/^https:\/\/kwilt\.app\/unsubscribe\?t=/);
  });

  it('buildUnsubscribeHeaders returns null when the signing secret is missing', async () => {
    delete process.env.KWILT_EMAIL_UNSUBSCRIBE_SECRET;
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    const mod = loadModule();
    const result = await mod.buildUnsubscribeHeaders({
      userId: TEST_UID,
      category: 'chapter_digest',
    });
    expect(result).toBeNull();
  });
});
