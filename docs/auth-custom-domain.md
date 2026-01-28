## Custom auth domain: `auth.kwilt.app` (Supabase)

### Why this matters

When we use Supabase OAuth flows on iOS, the system may show a confirmation prompt before opening the web auth session.

If the auth URLs are on `*.supabase.co`, that prompt looks like:
- `“Kwilt” Wants to Use “supabase.co” to Sign In`

By ensuring the OAuth start URL is on a Kwilt-owned domain, we can make the prompt read like:
- `“Kwilt” Wants to Use “kwilt.app” to Sign In`

We **cannot** restyle the prompt itself (Apple controls it), but we *can* make it feel trustworthy by using our own domain.

---

### Supabase setup (dashboard)

1. **Decide the domain**: `auth.kwilt.app`
2. In Supabase dashboard, go to the project’s **Custom Domains** (or equivalent) section.
3. Add a domain for auth: `auth.kwilt.app`
4. Supabase will provide **DNS records** to prove ownership (typically a `CNAME`, sometimes a `TXT`).

---

### DNS setup

In your DNS provider for `kwilt.app`, add the records Supabase provides for:
- `auth.kwilt.app`

Wait for propagation + Supabase verification to complete.

---

### Supabase Auth settings (redirect allowlist)

Kwilt uses an in-app browser session and a deep-link callback:
- Dev build / prod: `kwilt://auth/callback`
- Expo Go: `exp://<LAN-IP>:<port>/--/auth/callback` (this varies by network)

In Supabase dashboard:
- Go to **Auth → URL Configuration**
- Add the relevant redirect URLs to **Redirect URLs**
  - Always include: `kwilt://auth/callback`
  - For Expo Go testing, run the app once and copy the `exp://.../--/auth/callback` value it prints/shows, then add that too.

Notes:
- Expo Go redirects are not stable across network changes (LAN IP/port can change). Prefer a dev build for reliable OAuth testing.

---

### App configuration (Kwilt repo)

This app reads the Supabase base URL from Expo config `extra.supabaseUrl` (populated by `app.config.ts`) or (fallback) `process.env`:
- `src/utils/getEnv.ts`
- `src/services/backend/supabaseClient.ts`
- `app.config.ts` (sets `extra.supabaseUrl` from `SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`)

To use the custom domain, set:
- `SUPABASE_URL=https://auth.kwilt.app`
  - (or `EXPO_PUBLIC_SUPABASE_URL` / `extra.supabaseUrl` depending on environment)

Optionally (recommended for iOS polish), set a separate “brand origin” used ONLY for the OAuth start URL host:
- `AUTH_BRAND_ORIGIN=https://kwilt.app`

Keep the key the same:
- `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` stays unchanged.

Important: in this app, the Supabase URL is a **single base URL** used by `@supabase/supabase-js` for **Auth + REST + Storage + Realtime + Functions URL derivation**. So `https://auth.kwilt.app` must behave like the normal project URL (not just Auth-only) or non-auth calls may fail.

---

### Important notes

- **Expo Go vs dev build/prod**: the system prompt can show `Expo` in Expo Go. In a dev build / prod build, it will show the real app name (Kwilt).
- Validation checklist after setup:
  - **Auth URL host**: the OAuth URL opened in the system auth session should be on `kwilt.app` (this is what drives the iOS prompt domain). Note: Supabase may sometimes return a canonical `*.supabase.co` host in the OAuth URL even when the client is configured with a custom domain; the app rewrites the start URL host to `AUTH_BRAND_ORIGIN` (or falls back to the Supabase base URL origin) to keep the prompt branded.
  - **Non-auth endpoints still work**: basic Supabase calls (REST queries, storage, etc.) still succeed with `SUPABASE_URL=https://auth.kwilt.app`.

---

### Verification (quick)

- DNS/TLS: visit `https://auth.kwilt.app` in a browser and confirm it serves with a valid certificate.
- OAuth prompt: in a **dev build/prod** on iOS, start “Continue with Apple/Google” and confirm the system prompt references `auth.kwilt.app`.
- Redirect allowlist: if you see “redirect URL not allowed”, add the exact `redirectTo` URL printed/shown by the app to Supabase **Redirect URLs**.


