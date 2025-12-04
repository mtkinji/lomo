## Celebration media and GIPHY-backed GIFs

This document describes how kwilt fetches and renders **celebration GIFs** (for example, the “first Arc created” dialog) using GIPHY, and how to configure, extend, or disable this behavior.

---

## 1. Configuration and environment

- **API key**
  - Create a GIPHY developer account and app to obtain an API key.
  - Add the key to your local env (not to source control), for example in `.env`:

```bash
GIPHY_API_KEY=your_giphy_key_here
```

- **Expo config wiring**
  - `app.config.ts` loads env files via `dotenv` and passes values through `extra`.
  - The GIPHY key is exposed to the app as:
    - `extra.giphyApiKey` (see `app.config.ts`).
    - Readable from JS/TS via `getGiphyApiKey()` in `src/utils/getEnv.ts`.

---

## 2. Service surface: `fetchCelebrationGif`

- **Location**
  - Service definitions live in `src/services/gifs.ts`.
  - Public types:
    - `MediaRole` – currently `'celebration' | 'instruction'`.
    - `CelebrationKind` – e.g. `'firstArc' | 'firstGoal' | 'streak' | 'milestone'`.
    - `CelebrationStylePreference` – e.g. `'cute' | 'minimal' | 'surprise'`.
    - `FetchCelebrationGifParams` – `(role, kind, ageRange, stylePreference)`.
    - `CelebrationGif` – `{ id: string; url: string }`.

- **Contract**
  - `fetchCelebrationGif(params): Promise<CelebrationGif | null>`.
  - Always returns **either**:
    - A normalized `{ id, url }` pointing to an image-safe GIF URL, or
    - `null` if:
      - No API key is configured,
      - The search yields no results,
      - The request fails / times out.
  - Callers **must** treat the GIF as *optional flair* and render a stable layout without it.

---

## 3. GIPHY integration details

- **Query mapping**
  - `buildGiphyQuery(params: FetchCelebrationGifParams): string` maps app concepts to safe search terms.
  - Examples:
    - `role: 'celebration', kind: 'firstArc'` → `'wholesome celebration confetti'`.
    - `role: 'celebration', kind: 'firstGoal'` → `'small win celebration'`.
    - `role: 'streak'` → `'you did it celebration'`.
  - Style/age tuning:
    - `stylePreference: 'cute'` → adds `"cute wholesome"` tone.
    - `stylePreference: 'minimal'` → nudges toward `"simple subtle celebration"`.
    - `ageRange` can further bias toward gentler queries for younger users.

- **Search call**
  - Endpoint: `https://api.giphy.com/v1/gifs/search`.
  - Core params:
    - `api_key`: from `getGiphyApiKey()`.
    - `q`: curated query string from `buildGiphyQuery`.
    - `rating`: `'g'` or `'pg'` only (safety).
    - `limit`: small set (e.g. `10`) to enable randomization without too many results.
    - `lang`: `'en'`.
  - Implementation details:
    - Uses `AbortController` with a ~4s timeout so UI dialogs never hang indefinitely.
    - On success, picks a random item from the result set and normalizes to `{ id, url }` using `images.downsized_medium.url`.
    - On any error or missing URL, returns `null`.

- **Safety**
  - Queries are **curated strings**, not arbitrary user input.
  - Rating is restricted to `'g'` or `'pg'`.
  - If the API key is missing or invalid, the UI degrades gracefully (no GIF, dialog still appears).

- **Debugging**
  - In development, the service may log the query and chosen GIF for tuning:

```ts
if (__DEV__) {
  console.log('[giphy]', { query, id: pick.id, url });
}
```

  - You can adjust `buildGiphyQuery` based on real-world results to keep the tone on-brand.

---

## 4. UI integration: `CelebrationGif`

- **Location**
  - Component: `src/ui/CelebrationGif.tsx`.
  - Adapter export: `CelebrationGif` is re-exported from `src/ui/primitives.ts` so feature code can import it with other primitives.

- **Behavior**
  - Props:
    - `role?: MediaRole` (defaults to `'celebration'`),
    - `kind: CelebrationKind`,
    - `ageRange?: AgeRange`,
    - `size?: 'sm' | 'md'` (controls tile height),
    - `stylePreference?: CelebrationStylePreference`.
  - On mount:
    - Calls `fetchCelebrationGif` with the provided params.
    - Shows an inline loading state while fetching.
    - Renders:
      - The GIF in a rounded tile on success.
      - A simple fallback surface if no GIF is available.
  - It never blocks its host surface; dialogs and screens stay responsive even if GIPHY is slow.

- **Example usage (first-Arc celebration dialog)**
  - In `ArcDetailScreen.tsx`, the “first Arc created” dialog includes:

```tsx
<CelebrationGif role="celebration" kind="firstArc" size="sm" />
```

  - The rest of the dialog copy and CTAs live in the app canvas; the GIF is purely additive flair.

---

## 5. User preferences: turning celebration media on/off

- **Profile-level preference**
  - `UserProfile` includes an optional `preferences.showCelebrationMedia?: boolean`.
  - Default: `true` for new local profiles (`buildDefaultUserProfile` in `useAppStore`).
  - This is meant as a **soft toggle** for users who prefer less motion or fewer celebratory visuals.

- **Respecting the preference in `CelebrationGif`**
  - `CelebrationGif` reads the preference from the app store:

```ts
const showCelebrations = useAppStore(
  (s) => s.userProfile?.preferences?.showCelebrationMedia ?? true,
);

if (!showCelebrations) return null;
```

  - When disabled, the component renders nothing and hosts should rely solely on text/emoji celebration.

- **Future UI**
  - A profile or appearance settings screen can expose this as:
    - “Show celebration media (GIFs, visual confetti)” with a simple toggle.
  - The underlying wiring is already in place; the toggle only needs to update the stored profile preference.

---

## 6. Future-proofing for other media

- The current implementation is scoped to **GIPHY-backed GIFs** for celebration moments.
- The service can be generalized to a broader abstraction, e.g.:
  - `fetchContextualMedia({ role, kind, preferredKind, preferredSource })`.
  - `preferredSource: 'giphy' | 'local' | 'none'`.
  - `preferredKind: 'gif' | 'image' | 'video'`.
- `CelebrationGif` can either:
  - Stay as a narrow GIF-specific adapter, or
  - Be replaced with a more general `ContextualMedia` component that switches rendering based on the returned media type.

This separation (curated query mapping → provider integration → UI adapter) keeps third-party dependencies behind a well-defined service and preserves the core shell/canvas UX model.


