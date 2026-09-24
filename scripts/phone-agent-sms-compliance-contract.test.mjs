import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const linkSource = readFileSync(
  new URL('../supabase/functions/phone-agent-link/index.ts', import.meta.url),
  'utf8',
);
const smsSource = readFileSync(
  new URL('../supabase/functions/phone-agent-sms/index.ts', import.meta.url),
  'utf8',
);

test('Phone Agent enrollment and keyword replies carry the registered SMS disclosures', () => {
  assert.match(linkSource, /Kwilt Phone Agent: Your verification code is/);
  assert.match(linkSource, /Message frequency varies/);
  assert.match(linkSource, /Msg & data rates may apply/);
  assert.match(linkSource, /Reply STOP to opt out, HELP for help/);

  assert.match(smsSource, /Kwilt Phone Agent help:/);
  assert.match(smsSource, /Support: kwilt\.app\/support/);
  assert.match(smsSource, /You are opted in again/);
  assert.match(smsSource, /up to 3\/day by default/);
  assert.match(smsSource, /Reply HELP for help, STOP to opt out/);
});
