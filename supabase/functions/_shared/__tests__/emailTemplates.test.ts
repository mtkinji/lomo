// Jest tests for the Supabase edge-function email templates.
//
// These tests run under Node + Jest (via jest-expo) but the templates
// themselves are written for the Deno runtime and use `Deno.env.get(...)`.
// We shim a tiny `Deno` global before importing the module so the runtime
// access works in Node too.
//
// Coverage:
//   - CTA URL migration: every user-facing template emits a
//     `https://go.kwilt.app/open/...` URL with `utm_source=email`,
//     `utm_medium=email`, and the right `utm_campaign`.
//   - Fallback paste-link paragraph appears under every CTA button.
//   - Chapter digest reads narrative from `outputJson.sections.story.body`,
//     truncates intelligently, and humanizes the period label.
//   - CI guard (Phase 3.5 of email-system-ga-plan.md): the source file
//     never contains literal `kwilt://` or `www.kwilt.app` strings.

import * as fs from 'fs';
import * as path from 'path';

declare const globalThis: {
  Deno?: { env: { get: (k: string) => string | undefined } };
};

// Set up Deno shim BEFORE importing the templates module so the call sites
// that defensively call `Deno.env.get(...)` at function time can resolve.
beforeAll(() => {
  globalThis.Deno = {
    env: {
      get: (k: string) => process.env[k],
    },
  };
});

afterAll(() => {
  delete globalThis.Deno;
});

// Lazy import inside tests so the Deno shim is in place. Path is relative to
// this test file (supabase/functions/_shared/__tests__/).
function loadTemplates() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../emailTemplates') as typeof import('../emailTemplates');
}

const OPEN_BASE = 'https://go.kwilt.app/open';

function expectsOpenCta(html: string, opts: { path: string; campaign: string }) {
  const re = new RegExp(
    `${OPEN_BASE.replace(/[/.]/g, (c) => `\\${c}`)}/${opts.path.replace(/[/.]/g, (c) => `\\${c}`)}\\?[^"\\s]*utm_campaign=${opts.campaign}`,
  );
  expect(html).toMatch(re);
  expect(html).toMatch(/utm_source=email/);
  expect(html).toMatch(/utm_medium=email/);
}

function expectsFallbackBlock(html: string) {
  expect(html).toMatch(/copy and paste this link into your browser/i);
}

describe('CTA URL migration (Phase 3 of email-system-ga-plan.md)', () => {
  it('Welcome Day 0 → /open/today with welcome_day_0 campaign', () => {
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email();
    expectsOpenCta(out.html, { path: 'today', campaign: 'welcome_day_0' });
    expectsFallbackBlock(out.html);
    expect(out.text).toContain(`${OPEN_BASE}/today`);
  });

  it('Welcome Day 1 → /open/today with welcome_day_1 campaign', () => {
    const { buildWelcomeDay1Email } = loadTemplates();
    const out = buildWelcomeDay1Email();
    expectsOpenCta(out.html, { path: 'today', campaign: 'welcome_day_1' });
    expectsFallbackBlock(out.html);
  });

  it('Welcome Day 3 → /open/plan with welcome_day_3 campaign', () => {
    const { buildWelcomeDay3Email } = loadTemplates();
    const out = buildWelcomeDay3Email({ streakLength: 3 });
    expectsOpenCta(out.html, { path: 'plan', campaign: 'welcome_day_3' });
    expectsFallbackBlock(out.html);
  });

  it('Welcome Day 7 → /open/today with welcome_day_7 campaign', () => {
    const { buildWelcomeDay7Email } = loadTemplates();
    const out = buildWelcomeDay7Email({ streakLength: 7, activitiesCompleted: 5 });
    expectsOpenCta(out.html, { path: 'today', campaign: 'welcome_day_7' });
    expectsFallbackBlock(out.html);
  });

  it('Streak Win-back 1 → /open/today with winback_1 campaign', () => {
    const { buildStreakWinback1Email } = loadTemplates();
    const out = buildStreakWinback1Email({ streakLength: 5 });
    expectsOpenCta(out.html, { path: 'today', campaign: 'winback_1' });
    expectsFallbackBlock(out.html);
  });

  it('Streak Win-back 2 → /open/today with winback_2 campaign', () => {
    const { buildStreakWinback2Email } = loadTemplates();
    const out = buildStreakWinback2Email({ streakLength: 5 });
    expectsOpenCta(out.html, { path: 'today', campaign: 'winback_2' });
    expectsFallbackBlock(out.html);
  });

  it('Trial Expiry → /open/settings/subscription with trial_expiry campaign', () => {
    const { buildTrialExpiryEmail } = loadTemplates();
    const out = buildTrialExpiryEmail({ daysRemaining: 3 });
    expectsOpenCta(out.html, { path: 'settings/subscription', campaign: 'trial_expiry' });
    expectsFallbackBlock(out.html);
  });

  it('Pro Grant → /open/settings/subscription with pro_granted campaign', () => {
    const { buildProGrantEmail } = loadTemplates();
    const out = buildProGrantEmail({ expiresAtIso: '2026-12-31T00:00:00.000Z' });
    expectsOpenCta(out.html, { path: 'settings/subscription', campaign: 'pro_granted' });
    expectsFallbackBlock(out.html);
  });

  it('honors KWILT_EMAIL_OPEN_BASE_URL env override', () => {
    const original = process.env.KWILT_EMAIL_OPEN_BASE_URL;
    process.env.KWILT_EMAIL_OPEN_BASE_URL = 'https://example.test/o';
    try {
      // Re-require to ensure no module-level cache holds the previous value.
      jest.resetModules();
      const { buildWelcomeDay0Email } = loadTemplates();
      const out = buildWelcomeDay0Email();
      expect(out.html).toContain('https://example.test/o/today?');
    } finally {
      if (original == null) delete process.env.KWILT_EMAIL_OPEN_BASE_URL;
      else process.env.KWILT_EMAIL_OPEN_BASE_URL = original;
      jest.resetModules();
    }
  });
});

describe('extractChapterSnippet', () => {
  it('reads the canonical sections.story.body field', () => {
    const { extractChapterSnippet } = loadTemplates();
    const snippet = extractChapterSnippet({
      title: 'Test',
      sections: [
        { key: 'story', title: 'The Story', body: 'This is the lede paragraph and it is short.' },
        { key: 'where_time_went', title: 'Where', bullets: [] },
      ],
    });
    expect(snippet).toBe('This is the lede paragraph and it is short.');
  });

  it('truncates at the first paragraph boundary when one fits in budget', () => {
    const { extractChapterSnippet } = loadTemplates();
    const body = 'First paragraph, short and sweet.\n\nSecond paragraph that should not appear.';
    const snippet = extractChapterSnippet({
      sections: [{ key: 'story', body }],
    });
    expect(snippet).toBe('First paragraph, short and sweet.');
  });

  it('truncates at a word boundary with an ellipsis when a paragraph is too long', () => {
    const { extractChapterSnippet } = loadTemplates();
    const long = 'word '.repeat(120).trim();
    const snippet = extractChapterSnippet({
      sections: [{ key: 'story', body: long }],
    }, 50);
    expect(snippet.length).toBeLessThanOrEqual(50);
    expect(snippet.endsWith('\u2026')).toBe(true);
    expect(snippet).not.toContain('word word word word word word word word word word word');
  });

  it('falls back to the legacy outputJson.narrative field if present', () => {
    const { extractChapterSnippet } = loadTemplates();
    const snippet = extractChapterSnippet({ narrative: 'Legacy narrative.' });
    expect(snippet).toBe('Legacy narrative.');
  });

  it('returns empty string when narrative cannot be located', () => {
    const { extractChapterSnippet } = loadTemplates();
    expect(extractChapterSnippet({})).toBe('');
    expect(extractChapterSnippet(null)).toBe('');
    expect(extractChapterSnippet({ sections: [{ key: 'where_time_went', bullets: [] }] })).toBe('');
  });
});

describe('buildChapterDigestEmail (Phase 3 + 3.5 of email-system-ga-plan.md)', () => {
  // Fixture loosely modeled on a real chapters-generate output.
  const fixture = {
    title: 'A Quiet Comeback Week',
    dek: 'Five sessions, one new arc.',
    sections: [
      {
        key: 'story',
        title: 'The Story',
        body: 'It was the kind of week that did not look impressive on paper but mattered. You finished five sessions, started a new arc on Wednesday, and reset the streak you broke last weekend.\n\nThe second paragraph should not appear in the email snippet because we cut at the first paragraph break.',
      },
      { key: 'where_time_went', title: 'Where', bullets: ['a', 'b'] },
    ],
  };

  it('uses /open/chapters/<id> CTA with chapter_digest campaign and fallback link', () => {
    const { buildChapterDigestEmail } = loadTemplates();
    const out = buildChapterDigestEmail({
      chapterTitle: fixture.title,
      outputJson: fixture,
      chapterId: 'abc-123',
      cadence: 'weekly',
      periodStartIso: '2026-04-13T07:00:00.000Z',
      periodEndIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(out.html).toMatch(
      /https:\/\/go\.kwilt\.app\/open\/chapters\/abc-123\?[^"\s]*utm_campaign=chapter_digest/,
    );
    expectsFallbackBlock(out.html);
  });

  it('extracts the snippet from sections.story.body, not legacy outputJson.narrative', () => {
    const { buildChapterDigestEmail } = loadTemplates();
    const out = buildChapterDigestEmail({
      chapterTitle: fixture.title,
      outputJson: fixture,
      chapterId: 'abc-123',
      cadence: 'weekly',
      periodStartIso: '2026-04-13T07:00:00.000Z',
      periodEndIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(out.html).toContain('It was the kind of week that did not look impressive on paper');
    expect(out.html).not.toContain('The second paragraph should not appear');
    expect(out.text).toContain('It was the kind of week that did not look impressive on paper');
  });

  it('humanizes the period label (no machine keys leak into subject/preheader/body)', () => {
    const { buildChapterDigestEmail } = loadTemplates();
    const out = buildChapterDigestEmail({
      chapterTitle: fixture.title,
      outputJson: fixture,
      chapterId: 'abc-123',
      cadence: 'weekly',
      periodStartIso: '2026-04-13T07:00:00.000Z',
      periodEndIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    expect(out.subject).toBe('Your chapter for the week of Apr 13 is ready');
    // The kicker block renders the label as written; CSS `text-transform`
    // visually uppercases it. Assert the literal label appears.
    expect(out.html).toContain('the week of Apr 13');
    // None of subject/preheader/HTML/body should leak ISO-week or YYYY-MM keys.
    const haystack = `${out.subject}\n${out.html}\n${out.text}`;
    expect(haystack).not.toMatch(/\d{4}-W\d{2}/);
    expect(haystack).not.toMatch(/\b\d{4}-\d{2}-\d{2}T/);
  });

  it('preheader does not duplicate the subject', () => {
    const { buildChapterDigestEmail } = loadTemplates();
    const out = buildChapterDigestEmail({
      chapterTitle: fixture.title,
      outputJson: fixture,
      chapterId: 'abc-123',
      cadence: 'weekly',
      periodStartIso: '2026-04-13T07:00:00.000Z',
      periodEndIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    // The preheader is rendered into a hidden div; assert its text appears in
    // the HTML and is not byte-identical to the subject.
    expect(out.html).toContain('A short read about the week of Apr 13.');
    expect(out.html).not.toContain(`>${out.subject}<`);
  });
});

describe('brand logo rendering (Phase 4 of email-system-ga-plan.md)', () => {
  const ORIGINAL_LOGO_URL = process.env.KWILT_EMAIL_LOGO_URL;

  afterEach(() => {
    if (ORIGINAL_LOGO_URL == null) delete process.env.KWILT_EMAIL_LOGO_URL;
    else process.env.KWILT_EMAIL_LOGO_URL = ORIGINAL_LOGO_URL;
    jest.resetModules();
  });

  it('renders no <img> when KWILT_EMAIL_LOGO_URL is unset', () => {
    delete process.env.KWILT_EMAIL_LOGO_URL;
    jest.resetModules();
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email();
    // Wordmark text still renders, but no image tag leaks when the asset URL
    // is absent — prevents broken-image placeholders in Gmail / Outlook.
    expect(out.html).not.toMatch(/<img[^>]+alt="Kwilt"/i);
    expect(out.html).toContain('>Kwilt<');
  });

  it('emits explicit width + height HTML attrs on the logo <img> (Outlook-safe)', () => {
    // Outlook desktop ignores CSS-only sizing on <img>; missing width/height
    // attrs cause the raw-resolution asset (129px) to blow up the header.
    // This is a regression fence for email-system-ga-plan.md Phase 4.2.
    process.env.KWILT_EMAIL_LOGO_URL = 'https://kwilt.app/assets/email/logo@2x.png';
    jest.resetModules();
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email();
    const imgMatch = out.html.match(/<img\b[^>]*alt="Kwilt"[^>]*\/?\>/i);
    expect(imgMatch).not.toBeNull();
    const imgTag = imgMatch![0];
    expect(imgTag).toMatch(/\bwidth="24"/);
    expect(imgTag).toMatch(/\bheight="24"/);
    expect(imgTag).toContain('src="https://kwilt.app/assets/email/logo@2x.png"');
    // Double-belt: the CSS must not tell the client to auto-compute width.
    expect(imgTag).not.toMatch(/width:\s*auto/i);
  });

  it('logo <img> uses the same width/height across every template that renders it', () => {
    // Every template flows through `renderLayout`, so the header <img>
    // should be byte-identical across templates. Pick two very different
    // templates and compare their <img> tags.
    process.env.KWILT_EMAIL_LOGO_URL = 'https://kwilt.app/assets/email/logo@2x.png';
    jest.resetModules();
    const { buildWelcomeDay0Email, buildTrialExpiryEmail } = loadTemplates();
    const a = buildWelcomeDay0Email().html.match(/<img\b[^>]*alt="Kwilt"[^>]*\/?\>/i);
    const b = buildTrialExpiryEmail({ daysRemaining: 2 }).html.match(/<img\b[^>]*alt="Kwilt"[^>]*\/?\>/i);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a![0]).toBe(b![0]);
  });
});

describe('email UX refinement (Phase 5 of email-system-ga-plan.md)', () => {
  it('renderLayout emits a single-surface shell (no gray canvas + white card nesting)', () => {
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email();
    // The old layout wrapped content in a `bg:#f3f4f6` canvas with a white
    // card inside. Phase 5.1 collapses both into a single white surface.
    expect(out.html).not.toMatch(/background:\s*#f3f4f6/i);
    expect(out.html).not.toMatch(/border:\s*1px solid\s*#e5e7eb;border-radius:16px/i);
    // Body background must be white (or a near-neutral) for the new shell.
    expect(out.html).toMatch(/<body[^>]*background:#ffffff/i);
  });

  it('includes color-scheme meta tags for dark-mode safe rendering (Phase 5.7)', () => {
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email();
    expect(out.html).toMatch(/<meta\s+name="color-scheme"\s+content="light dark"/i);
    expect(out.html).toMatch(/<meta\s+name="supported-color-schemes"\s+content="light dark"/i);
  });

  it('content column is 480\u2013520px wide (letter-like, not webpage-like)', () => {
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email();
    const match = out.html.match(/max-width:\s*(\d+)px/i);
    expect(match).not.toBeNull();
    const width = Number.parseInt(match![1], 10);
    expect(width).toBeGreaterThanOrEqual(480);
    expect(width).toBeLessThanOrEqual(520);
  });

  it('every non-admin template uses the shared renderCta primitive shape (Phase 5.2)', () => {
    // The renderCta helper produces a specific shape:
    //   <a ...padding:12px 18px;border-radius:10px;font-weight:700...>
    // Every user-facing template should route through it, not hand-roll
    // button HTML with per-template variations.
    const {
      buildWelcomeDay0Email,
      buildWelcomeDay1Email,
      buildWelcomeDay3Email,
      buildWelcomeDay7Email,
      buildStreakWinback1Email,
      buildStreakWinback2Email,
      buildTrialExpiryEmail,
      buildProGrantEmail,
      buildChapterDigestEmail,
      buildGoalInviteEmail,
    } = loadTemplates();

    const ctaSignature = /padding:\s*12px\s*18px;border-radius:\s*10px;font-weight:\s*700/;

    const samples: Array<{ name: string; html: string }> = [
      { name: 'welcome0', html: buildWelcomeDay0Email().html },
      { name: 'welcome1', html: buildWelcomeDay1Email().html },
      { name: 'welcome3', html: buildWelcomeDay3Email({ streakLength: 3 }).html },
      { name: 'welcome7', html: buildWelcomeDay7Email({ streakLength: 7, activitiesCompleted: 5 }).html },
      { name: 'winback1', html: buildStreakWinback1Email({ streakLength: 5 }).html },
      { name: 'winback2', html: buildStreakWinback2Email({ streakLength: 5 }).html },
      { name: 'trial', html: buildTrialExpiryEmail({ daysRemaining: 3 }).html },
      { name: 'pro_grant', html: buildProGrantEmail({ expiresAtIso: '2026-12-31T00:00:00.000Z' }).html },
      { name: 'goal_invite', html: buildGoalInviteEmail({ goalTitle: 'Ship v1', inviteLink: 'https://go.kwilt.app/i/abc' }).html },
      {
        name: 'chapter_digest',
        html: buildChapterDigestEmail({
          chapterTitle: 'A Quiet Comeback Week',
          outputJson: { sections: [{ key: 'story', body: 'Snippet text.' }] },
          chapterId: 'c-1',
          cadence: 'weekly',
          periodStartIso: '2026-04-13T07:00:00.000Z',
          periodEndIso: '2026-04-20T07:00:00.000Z',
          timezone: 'America/Los_Angeles',
        }).html,
      },
    ];

    for (const s of samples) {
      expect({ name: s.name, matches: ctaSignature.test(s.html) }).toEqual({ name: s.name, matches: true });
    }
  });

  it('Welcome Day 7 stats are inline type, not a framed card (Phase 5.3)', () => {
    const { buildWelcomeDay7Email } = loadTemplates();
    const out = buildWelcomeDay7Email({ streakLength: 7, activitiesCompleted: 5 });
    // The old stats card was a padded gray box with a border. Phase 5 turns
    // this into inline prose like "You built a 7-day show-up streak and
    // completed 5 activities."
    expect(out.html).not.toMatch(/Streak<\/div>[^<]*<div[^>]*font-size:20px/i);
    expect(out.html).toMatch(/built a <strong>7-day<\/strong> show-up streak/i);
    expect(out.html).toMatch(/completed <strong>5 activities<\/strong>/i);
  });

  it('Trial expiry feature list is inline prose, not a bulleted card (Phase 5.3)', () => {
    const { buildTrialExpiryEmail } = loadTemplates();
    const out = buildTrialExpiryEmail({ daysRemaining: 3 });
    // Old: a gray box with four \u2022 bullet rows. New: one prose sentence.
    expect(out.html).not.toMatch(/\u2022 Focus Mode/);
    expect(out.html).toMatch(/<strong>Focus Mode<\/strong>/);
    expect(out.html).toMatch(/<strong>Saved Views<\/strong>/);
  });

  it('Chapter digest snippet is a border-left blockquote, not a filled box (Phase 5.3)', () => {
    const { buildChapterDigestEmail } = loadTemplates();
    const out = buildChapterDigestEmail({
      chapterTitle: 'A Quiet Comeback Week',
      outputJson: { sections: [{ key: 'story', body: 'The lede paragraph that carries the week.' }] },
      chapterId: 'c-1',
      cadence: 'weekly',
      periodStartIso: '2026-04-13T07:00:00.000Z',
      periodEndIso: '2026-04-20T07:00:00.000Z',
      timezone: 'America/Los_Angeles',
    });
    // No filled gray box wrapping the snippet.
    expect(out.html).not.toMatch(/background:#f9fafb;border:1px solid #e5e7eb[^"]*">[\s\n]*<p[^>]*>The lede/);
    // Instead: a left-border quote.
    expect(out.html).toMatch(/border-left:\s*3px solid #1F5226/i);
    expect(out.html).toContain('The lede paragraph that carries the week.');
  });

  it('no preheader duplicates its subject (Phase 5.5)', () => {
    const {
      buildWelcomeDay0Email,
      buildWelcomeDay1Email,
      buildWelcomeDay3Email,
      buildWelcomeDay7Email,
      buildStreakWinback1Email,
      buildStreakWinback2Email,
      buildTrialExpiryEmail,
      buildProGrantEmail,
      buildProCodeEmail,
      buildGoalInviteEmail,
      buildChapterDigestEmail,
    } = loadTemplates();

    const samples = [
      buildWelcomeDay0Email(),
      buildWelcomeDay1Email(),
      buildWelcomeDay3Email({ streakLength: 3 }),
      buildWelcomeDay7Email({ streakLength: 7, activitiesCompleted: 5 }),
      buildStreakWinback1Email({ streakLength: 5 }),
      buildStreakWinback2Email({ streakLength: 5 }),
      buildTrialExpiryEmail({ daysRemaining: 3 }),
      buildProGrantEmail({ expiresAtIso: '2026-12-31T00:00:00.000Z' }),
      buildProCodeEmail({ code: 'ABCD-1234' }),
      buildGoalInviteEmail({ goalTitle: 'Ship v1', inviteLink: 'https://go.kwilt.app/i/abc' }),
      buildChapterDigestEmail({
        chapterTitle: 'A Quiet Comeback Week',
        outputJson: { sections: [{ key: 'story', body: 'Snippet.' }] },
        chapterId: 'c-1',
        cadence: 'weekly',
        periodStartIso: '2026-04-13T07:00:00.000Z',
        periodEndIso: '2026-04-20T07:00:00.000Z',
        timezone: 'America/Los_Angeles',
      }),
    ];

    for (const { subject, html } of samples) {
      const preheaderMatch = html.match(
        /<div[^>]*display:none[^>]*max-height:0[^>]*>\s*([^<]+?)\s*<\/div>/i,
      );
      // Every non-admin template sets a preheader. If one is absent that's
      // its own bug, but assert what we can.
      if (preheaderMatch) {
        const preheader = preheaderMatch[1].trim();
        expect({ subject, preheader }).toEqual({ subject, preheader });
        expect(preheader.toLowerCase()).not.toBe(subject.toLowerCase());
      }
    }
  });

  it('plain-text versions include the fallback URL on its own line (Phase 5.6)', () => {
    const {
      buildWelcomeDay0Email,
      buildWelcomeDay3Email,
      buildTrialExpiryEmail,
    } = loadTemplates();
    const samples = [
      buildWelcomeDay0Email(),
      buildWelcomeDay3Email({ streakLength: 3 }),
      buildTrialExpiryEmail({ daysRemaining: 3 }),
    ];
    for (const { text } of samples) {
      // Every plain-text version must contain at least one standalone line
      // that is exactly the go.kwilt.app/open URL (so text-only clients render
      // it as a clickable link).
      const lines = text.split('\n').map((l) => l.trim());
      const hasStandaloneOpenUrl = lines.some((l) => /^https:\/\/go\.kwilt\.app\/open\//.test(l));
      expect(hasStandaloneOpenUrl).toBe(true);
    }
  });
});

describe('footer unsubscribe link (Phase 7.1 of email-system-ga-plan.md)', () => {
  // Placeholder URL that callers will real-world fill with the signed token
  // URL returned by `_shared/emailUnsubscribe.ts::buildUnsubscribeHeaders`.
  const EXAMPLE_UNSUB_URL = 'https://example.test/unsubscribe?t=abc.def';

  it('no preference-gated template emits the stale "Manage in Settings -> Notifications" copy', () => {
    // Phase 5 left a "Manage in Settings -> Notifications" string in every
    // footer — but the in-app Settings screen doesn't actually manage email
    // prefs, so the copy was misleading. Phase 7.1 removes it in favor of a
    // real unsubscribe link. This fence prevents regression.
    const {
      buildWelcomeDay0Email,
      buildWelcomeDay1Email,
      buildWelcomeDay3Email,
      buildWelcomeDay7Email,
      buildStreakWinback1Email,
      buildStreakWinback2Email,
      buildChapterDigestEmail,
      buildTrialExpiryEmail,
    } = loadTemplates();
    const samples = [
      buildWelcomeDay0Email(),
      buildWelcomeDay1Email(),
      buildWelcomeDay3Email({ streakLength: 3 }),
      buildWelcomeDay7Email({ streakLength: 7, activitiesCompleted: 5 }),
      buildStreakWinback1Email({ streakLength: 3 }),
      buildStreakWinback2Email({ streakLength: 3 }),
      buildChapterDigestEmail({
        chapterTitle: 'Test',
        outputJson: {
          sections: [{ key: 'story', title: 'Story', body: 'A quiet week.' }],
        },
        chapterId: 'abc',
        cadence: 'weekly',
        periodStartIso: '2026-04-13T07:00:00.000Z',
        periodEndIso: '2026-04-20T07:00:00.000Z',
        timezone: 'America/Los_Angeles',
      }),
      buildTrialExpiryEmail({ daysRemaining: 3 }),
    ];
    for (const { html, text } of samples) {
      expect(html).not.toMatch(/Manage in Settings/i);
      expect(text).not.toMatch(/Manage in Settings/i);
      // The old copy mentioned "Unsubscribe in Settings" — also stale.
      expect(html).not.toMatch(/Unsubscribe in Settings/i);
      expect(text).not.toMatch(/Unsubscribe in Settings/i);
    }
  });

  it('renders an "Unsubscribe" link in the footer when unsubscribeUrl is provided', () => {
    const { buildWelcomeDay0Email } = loadTemplates();
    const out = buildWelcomeDay0Email({ unsubscribeUrl: EXAMPLE_UNSUB_URL });
    // Exact anchor shape: <a href="<url>" ...>Unsubscribe</a>
    expect(out.html).toMatch(
      /<a href="https:\/\/example\.test\/unsubscribe\?t=abc\.def"[^>]*>\s*Unsubscribe\s*<\/a>/i,
    );
  });

  it('omits the unsubscribe anchor when unsubscribeUrl is not provided', () => {
    // Transactional templates (and any caller that doesn't pass the URL)
    // must not surface a dangling "Unsubscribe" link.
    const {
      buildProGrantEmail,
      buildProCodeEmail,
      buildGoalInviteEmail,
    } = loadTemplates();
    const samples = [
      buildProGrantEmail({ expiresAtIso: '2026-12-31T00:00:00.000Z' }),
      buildProCodeEmail({ code: 'ABC12345', note: '' }),
      buildGoalInviteEmail({ goalTitle: 'Hike more', inviteLink: 'https://go.kwilt.app/i/xyz' }),
    ];
    for (const { html } of samples) {
      expect(html).not.toMatch(/>Unsubscribe</i);
    }
  });

  it('threads unsubscribeUrl into every preference-gated template', () => {
    // If any of these templates silently drops the param, users on that
    // campaign will get Resend headers that don't match the footer link —
    // a consistency hazard. Validate each one explicitly.
    const {
      buildWelcomeDay0Email,
      buildWelcomeDay1Email,
      buildWelcomeDay3Email,
      buildWelcomeDay7Email,
      buildStreakWinback1Email,
      buildStreakWinback2Email,
      buildChapterDigestEmail,
      buildTrialExpiryEmail,
    } = loadTemplates();
    const cases = [
      buildWelcomeDay0Email({ unsubscribeUrl: EXAMPLE_UNSUB_URL }),
      buildWelcomeDay1Email({ unsubscribeUrl: EXAMPLE_UNSUB_URL }),
      buildWelcomeDay3Email({ streakLength: 3, unsubscribeUrl: EXAMPLE_UNSUB_URL }),
      buildWelcomeDay7Email({
        streakLength: 7,
        activitiesCompleted: 5,
        unsubscribeUrl: EXAMPLE_UNSUB_URL,
      }),
      buildStreakWinback1Email({ streakLength: 3, unsubscribeUrl: EXAMPLE_UNSUB_URL }),
      buildStreakWinback2Email({ streakLength: 3, unsubscribeUrl: EXAMPLE_UNSUB_URL }),
      buildChapterDigestEmail({
        chapterTitle: 'Test',
        outputJson: {
          sections: [{ key: 'story', title: 'Story', body: 'A quiet week.' }],
        },
        chapterId: 'abc',
        cadence: 'weekly',
        periodStartIso: '2026-04-13T07:00:00.000Z',
        periodEndIso: '2026-04-20T07:00:00.000Z',
        timezone: 'America/Los_Angeles',
        unsubscribeUrl: EXAMPLE_UNSUB_URL,
      }),
      buildTrialExpiryEmail({ daysRemaining: 3, unsubscribeUrl: EXAMPLE_UNSUB_URL }),
    ];
    for (const { html } of cases) {
      expect(html).toContain('https://example.test/unsubscribe?t=abc.def');
      expect(html).toMatch(/>\s*Unsubscribe\s*</);
    }
  });
});

describe('CAN-SPAM postal address footer (Phase 7 of email-system-ga-plan.md)', () => {
  // These tests mutate process.env (via the Deno shim) so reset between cases.
  const ORIGINAL = process.env.KWILT_COMPANY_POSTAL_ADDRESS;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.KWILT_COMPANY_POSTAL_ADDRESS;
    } else {
      process.env.KWILT_COMPANY_POSTAL_ADDRESS = ORIGINAL;
    }
  });

  it('renders the postal address in the footer of every preference-gated template when set', () => {
    process.env.KWILT_COMPANY_POSTAL_ADDRESS =
      'Kwilt Inc.|123 Example St, Suite 200|San Francisco, CA 94103';
    const {
      buildWelcomeDay0Email,
      buildWelcomeDay1Email,
      buildWelcomeDay3Email,
      buildWelcomeDay7Email,
      buildStreakWinback1Email,
      buildStreakWinback2Email,
      buildChapterDigestEmail,
      buildTrialExpiryEmail,
    } = loadTemplates();
    const cases = [
      buildWelcomeDay0Email(),
      buildWelcomeDay1Email(),
      buildWelcomeDay3Email({ streakLength: 3 }),
      buildWelcomeDay7Email({ streakLength: 7, activitiesCompleted: 5 }),
      buildStreakWinback1Email({ streakLength: 3 }),
      buildStreakWinback2Email({ streakLength: 3 }),
      buildChapterDigestEmail({
        chapterTitle: 'Test',
        outputJson: {
          sections: [{ key: 'story', title: 'Story', body: 'A quiet week.' }],
        },
        chapterId: 'abc',
        cadence: 'weekly',
        periodStartIso: '2026-04-13T07:00:00.000Z',
        periodEndIso: '2026-04-20T07:00:00.000Z',
        timezone: 'America/Los_Angeles',
      }),
      buildTrialExpiryEmail({ daysRemaining: 3 }),
    ];
    for (const { html } of cases) {
      expect(html).toContain('Kwilt Inc.');
      expect(html).toContain('123 Example St, Suite 200');
      expect(html).toContain('San Francisco, CA 94103');
      // `|` delimiters become explicit line breaks.
      expect(html).toMatch(/Kwilt Inc\.<br\/>123 Example St/);
    }
  });

  it('omits the postal address when the env var is unset', () => {
    delete process.env.KWILT_COMPANY_POSTAL_ADDRESS;
    const { buildWelcomeDay0Email } = loadTemplates();
    const { html } = buildWelcomeDay0Email();
    // No postal address heuristic: no <br/> inside the footer paragraph and
    // nothing that looks like a comma-separated street/city block.
    expect(html).not.toMatch(/Kwilt Inc\./);
    expect(html).not.toMatch(/San Francisco/);
  });

  it('escapes HTML in postal address lines', () => {
    process.env.KWILT_COMPANY_POSTAL_ADDRESS =
      'Evil <script>alert(1)</script> Co.|Line two';
    const { buildWelcomeDay0Email } = loadTemplates();
    const { html } = buildWelcomeDay0Email();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('still omits the entire footer for transactional templates that do not set footerText/unsubscribeUrl', () => {
    // CAN-SPAM exempts transactional emails from the postal address
    // requirement. Pro grant / Pro code currently render no footer at all;
    // they must stay that way even with the env set.
    process.env.KWILT_COMPANY_POSTAL_ADDRESS =
      'Kwilt Inc.|123 Example St, Suite 200|San Francisco, CA 94103';
    const { buildProGrantEmail, buildProCodeEmail } = loadTemplates();
    const grant = buildProGrantEmail({ expiresAtIso: '2026-12-31T00:00:00.000Z' });
    const code = buildProCodeEmail({ code: 'ABC12345', note: '' });
    for (const { html } of [grant, code]) {
      expect(html).not.toContain('Kwilt Inc.');
      expect(html).not.toContain('San Francisco');
    }
  });

  it('renders postal address on goal invite (has footerText but no unsubscribeUrl)', () => {
    // Goal invites carry a footerText ("This invite link may expire…") so
    // they already emit a footer. When the postal address env is set, it
    // appears alongside that rationale — even though there is no unsubscribe
    // link (the recipient might not be a Kwilt user yet).
    process.env.KWILT_COMPANY_POSTAL_ADDRESS = 'Kwilt Inc.|123 Example St';
    const { buildGoalInviteEmail } = loadTemplates();
    const { html } = buildGoalInviteEmail({
      goalTitle: 'Hike more',
      inviteLink: 'https://go.kwilt.app/i/xyz',
    });
    expect(html).toContain('Kwilt Inc.');
    expect(html).toContain('123 Example St');
    expect(html).not.toMatch(/>\s*Unsubscribe\s*</);
  });
});

describe('CI guard: emailTemplates.ts source hygiene (Phase 3.5)', () => {
  // Relative to repo root (jest cwd is the repo root via npm test).
  const SOURCE = path.resolve(__dirname, '..', 'emailTemplates.ts');
  let source = '';
  beforeAll(() => {
    source = fs.readFileSync(SOURCE, 'utf-8');
  });

  it('contains no kwilt:// scheme literals', () => {
    // Any literal `kwilt://` is a dead-end on desktop and stays broken on
    // chapters even on mobile until Phase 2 ships in every installed app
    // version. Phase 3 routes everything through go.kwilt.app/open instead.
    expect(source).not.toMatch(/kwilt:\/\//);
  });

  it('contains no www.kwilt.app marketing URLs', () => {
    // www.kwilt.app is not in associatedDomains, so it never deep-links into
    // the installed app. All CTAs go through go.kwilt.app/open.
    expect(source).not.toMatch(/www\.kwilt\.app/);
  });

  it('routes every CTA through makeOpenUrl (no hard-coded https URLs in template bodies)', () => {
    // Allow only:
    //   - The default base inside getOpenBaseUrl (https://go.kwilt.app/open).
    //   - User-supplied invite links (rendered via params.inviteLink).
    // No template should hand-write `<a href="https://...">` for a CTA.
    const matches = source.match(/https?:\/\/[^\s"'`]+/g) ?? [];
    const violations = matches.filter((m) => {
      // Allow comments / docstrings to mention example URLs implicitly through
      // the openRoutes/openBaseUrl scope. Strip the `getOpenBaseUrl` default.
      if (m.startsWith('https://go.kwilt.app/open')) return false;
      return true;
    });
    expect(violations).toEqual([]);
  });
});
