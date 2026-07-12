import { readFileSync } from 'fs';
import path from 'path';

const configPath = path.join(__dirname, '../../supabase/config.toml');
const configToml = readFileSync(configPath, 'utf8');

function readQuotedValue(key: string): string | null {
  const match = configToml.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1] ?? null;
}

function readQuotedArray(key: string): string[] {
  const match = configToml.match(new RegExp(`^${key}\\s*=\\s*\\[([^\\]]*)\\]`, 'm'));
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/"([^"]*)"/g)].map(([, value]) => value);
}

describe('Supabase Auth URL configuration', () => {
  it('keeps the hosted MCP consent flow as an allowed web redirect', () => {
    const siteUrl = readQuotedValue('site_url');
    const redirectUrls = readQuotedArray('additional_redirect_urls');

    expect(siteUrl).toBe('https://go.kwilt.app');
    expect(redirectUrls).toContain('https://go.kwilt.app/oauth/consent');
    expect(siteUrl).not.toMatch(/^exp:\/\//);
    expect(siteUrl).not.toMatch(/127\.0\.0\.1|localhost/);
  });

  it('allows every shipped Kwilt app to complete OAuth', () => {
    const redirectUrls = readQuotedArray('additional_redirect_urls');

    expect(redirectUrls).toEqual(expect.arrayContaining([
      'kwilt://auth/callback',
      'kwiltbudget://auth/callback',
      'kwiltgames://auth/callback',
    ]));
  });
});
