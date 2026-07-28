import {
  buildAppleClientSecret,
  recordAppleSecretRotation,
  updateSupabaseAppleSecret,
  validateAppleClientSecret,
} from './apple-auth-secret-rotation-lib.mjs';

function requireEnv(name) {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const clientId = requireEnv('APPLE_SERVICES_ID');
  const generated = buildAppleClientSecret({
    privateKeyPem: requireEnv('APPLE_AUTH_PRIVATE_KEY_P8').replace(/\\n/g, '\n'),
    keyId: requireEnv('APPLE_KEY_ID'),
    teamId: requireEnv('APPLE_TEAM_ID'),
    clientId,
  });

  await validateAppleClientSecret({ clientSecret: generated.clientSecret, clientId });
  await updateSupabaseAppleSecret({
    accessToken: requireEnv('SUPABASE_ACCESS_TOKEN'),
    projectRef: requireEnv('SUPABASE_PROJECT_REF'),
    clientId,
    clientSecret: generated.clientSecret,
  });
  await recordAppleSecretRotation({
    monitorUrl: requireEnv('KWILT_SECRET_MONITOR_URL'),
    monitorSecret: requireEnv('KWILT_SECRET_MONITOR_CRON_SECRET'),
    expiresAt: generated.expiresAt,
  });

  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      provider: 'apple',
      clientId,
      issuedAt: generated.issuedAt,
      expiresAt: generated.expiresAt,
      monitorRecorded: true,
    })}\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Apple auth secret rotation failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
