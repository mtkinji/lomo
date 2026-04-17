// Email-campaign attribution for incoming deep links.
//
// Phase 6.2 of docs/email-system-ga-plan.md. When the app is opened via a
// URL that carries `utm_source=email`, we fire an `EmailDeepLinkConverted`
// analytics event so the PostHog funnel can measure
// `EmailSent → EmailOpened → EmailClicked → EmailDeepLinkConverted → recordShowUp`.
//
// Handles three URL shapes the app actually sees in production:
//   1. Custom scheme (scheme launch from the kwilt-site /open handoff page):
//      `kwilt://chapters/abc123?utm_source=email&utm_campaign=chapter_digest`
//   2. Universal link (iOS hands off before the /open page renders):
//      `https://go.kwilt.app/open/chapters/abc123?utm_source=email&utm_campaign=chapter_digest`
//   3. Apex universal link (legacy direct kwilt.app links, pre-handoff):
//      `https://kwilt.app/today?utm_source=email&utm_campaign=welcome_day_0`
//
// In every case the return shape is the same: the normalized target route
// (never includes a leading slash, never includes the `/open/` handoff
// segment) plus the utm_campaign / utm_medium for the event payload.

export type EmailAttribution = {
  /** The `utm_campaign` query param, or null if unset. Drives PostHog funnel slicing. */
  utmCampaign: string | null;
  /** The `utm_medium` query param, or null if unset. */
  utmMedium: string | null;
  /**
   * Normalized route path (no leading `/`, no `/open/` handoff prefix).
   * Examples: `chapters/abc123`, `today`, `settings/subscription`.
   * Matches the shape of paths in `linkingConfig.ts`.
   */
  targetRoute: string;
};

/**
 * Parse a deep-link URL for email-campaign attribution. Returns `null` when
 * the URL doesn't carry `utm_source=email` (the vast majority of links —
 * share-goal URLs, calendar `kwilt://` links, widget taps, etc.).
 *
 * Pure function; never throws. Used both from `RootNavigator` and from tests.
 */
export function parseEmailAttribution(url: string): EmailAttribution | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.searchParams.get('utm_source') !== 'email') return null;

  let targetRoute: string;
  if (parsed.protocol === 'kwilt:') {
    // `kwilt://chapters/abc` → hostname=chapters, pathname=/abc
    // `kwilt://plan`         → hostname=plan,     pathname=(empty or /)
    const host = parsed.hostname ?? '';
    const rawPath = parsed.pathname ?? '';
    const pathSuffix = rawPath && rawPath !== '/' ? rawPath : '';
    targetRoute = (host + pathSuffix).replace(/^\/+/, '');
  } else {
    // HTTPS: strip leading slash, then drop the `open/` handoff prefix if
    // present so attribution is reported against the real target route.
    let path = parsed.pathname.replace(/^\/+/, '');
    if (path === 'open' || path.startsWith('open/')) {
      path = path.slice('open'.length).replace(/^\/+/, '');
    }
    targetRoute = path;
  }

  return {
    utmCampaign: parsed.searchParams.get('utm_campaign'),
    utmMedium: parsed.searchParams.get('utm_medium'),
    targetRoute,
  };
}
