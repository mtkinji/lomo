import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1';
import {
  parseHouseholdDeviceClaimRequest,
  randomCredential,
  resolveManagedChildAccessRpcStatus,
  sha256Hex,
} from '../householdDeviceParticipation.ts';

Deno.test('managed child device claim parser does not require a child JWT', () => {
  assertEquals(parseHouseholdDeviceClaimRequest({
    action: 'claim', transport: 'link', secret: 'a'.repeat(64), installId: 'install-123',
    label: "Charlie's iPhone", platform: 'ios',
  }), {
    action: 'claim', transport: 'link', secret: 'a'.repeat(64), installId: 'install-123',
    label: "Charlie's iPhone", platform: 'ios',
  });
});

Deno.test('managed child status requires the exact device, install, and credential', () => {
  assertEquals(parseHouseholdDeviceClaimRequest({
    action: 'status', deviceId: 'device-1', installId: 'install-123', credential: 'a'.repeat(64),
  }), {
    action: 'status', deviceId: 'device-1', installId: 'install-123', credential: 'a'.repeat(64),
  });
  assertThrows(() => parseHouseholdDeviceClaimRequest({
    action: 'status', deviceId: 'device-1', installId: 'install-123', credential: 'short',
  }), Error, 'invalid_request');
});

Deno.test('managed child status distinguishes revocation from a transient backend failure', () => {
  assertEquals(resolveManagedChildAccessRpcStatus(null, { deviceId: 'device-1' }), 200);
  assertEquals(resolveManagedChildAccessRpcStatus({ message: 'managed_child_access_revoked' }, null), 401);
  assertEquals(resolveManagedChildAccessRpcStatus({ message: 'connection reset' }, null), 503);
});

Deno.test('manual setup codes normalize and malformed requests stay generic', () => {
  const preview = parseHouseholdDeviceClaimRequest({
    action: 'preview', transport: 'manual_code', secret: '482 731', installId: 'install-123',
  });
  assertEquals(preview.action, 'preview');
  if (preview.action !== 'preview') throw new Error('expected preview');
  assertEquals(preview.secret, '482731');
  assertThrows(() => parseHouseholdDeviceClaimRequest({
    action: 'preview', transport: 'manual_code', secret: 'ABC123', installId: 'install-123',
  }), Error, 'invalid_request');
  assertThrows(() => parseHouseholdDeviceClaimRequest({
    action: 'preview', transport: 'manual_code', secret: '482731998877', installId: 'install-123',
  }), Error, 'invalid_request');
  assertThrows(() => parseHouseholdDeviceClaimRequest({
    action: 'preview', transport: 'link', secret: 'Charlie',
  }), Error, 'invalid_request');
  assertThrows(() => parseHouseholdDeviceClaimRequest({
    action: 'claim', transport: 'manual_code', secret: '482731', installId: 'install-123',
    label: "Charlie's iPhone", platform: 'ios',
  }), Error, 'invalid_request');
  assertEquals(parseHouseholdDeviceClaimRequest({
    action: 'claim', transport: 'manual_code', secret: '482731', previewSessionId: 'session-1',
    installId: 'install-123', label: "Charlie's iPhone", platform: 'ios',
  }).action, 'claim');
});

Deno.test('claim credentials and hashes have the expected entropy shape', async () => {
  const credential = randomCredential();
  assertEquals(credential.length, 64);
  assertEquals((await sha256Hex(credential)).length, 64);
  await assertRejects(() => crypto.subtle.digest('not-a-digest', new Uint8Array()), Error);
});
