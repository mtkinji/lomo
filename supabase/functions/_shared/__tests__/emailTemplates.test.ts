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
