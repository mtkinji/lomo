import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildPlaidPlatformFields,
  PLAID_CLIENT_NAME,
  resolvePlaidLinkPlatform,
} from '../plaidLinkRequest.ts';

Deno.test('Plaid presents the current Kwilt product name', () => {
  assertEquals(PLAID_CLIENT_NAME, 'Kwilt');
});

Deno.test('iOS Plaid link requests omit the Android package name', () => {
  assertEquals(
    buildPlaidPlatformFields({
      platform: 'ios',
      redirectUri: 'https://kwilt.app/plaid/oauth',
      androidPackageName: 'app.kwilt.mobile',
    }),
    { redirect_uri: 'https://kwilt.app/plaid/oauth' },
  );
});

Deno.test('Android Plaid link requests omit the OAuth redirect URI', () => {
  assertEquals(
    buildPlaidPlatformFields({
      platform: 'android',
      redirectUri: 'https://kwilt.app/plaid/oauth',
      androidPackageName: 'app.kwilt.mobile',
    }),
    { android_package_name: 'app.kwilt.mobile' },
  );
});

Deno.test('legacy iOS clients are inferred from their user agent', () => {
  assertEquals(resolvePlaidLinkPlatform(undefined, 'Kwilt/96 CFNetwork/3860 Darwin/25.5.0'), 'ios');
});
