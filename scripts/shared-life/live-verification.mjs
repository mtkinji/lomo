/** Opt-in live acceptance against dedicated, temporary accounts. Never uses existing users. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
if (process.env.KWILT_HOME_LIVE_VERIFY !== 'yes')
  throw new Error('Explicit live verification opt-in required');
const keys = JSON.parse(
  await fs.readFile(process.env.KWILT_HOME_KEYS_FILE, 'utf8'),
);
const url = 'https://sqxwjtorodqjdfnuvprf.supabase.co';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(
  url,
  keys.find((k) => k.name === 'service_role').api_key,
  options,
);
const publicKey = keys.find((k) => k.type === 'publishable').api_key;
const users = [],
  people = [],
  households = [],
  paths = [],
  reports = [];
const ok = (r) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
async function call(client, op, args = {}) {
  return ok(await client.rpc('kwilt_home_command', { op, args }));
}
async function readPhoto(client, path) {
  const token = (await client.auth.getSession()).data.session.access_token;
  const response = await fetch(
    `${url}/storage/v1/object/authenticated/home-moments/${path}?v=${randomUUID()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: publicKey,
        'Cache-Control': 'no-store',
      },
      cache: 'no-store',
    },
  );
  return {
    error: response.ok ? null : new Error(`Photo denied: ${response.status}`),
  };
}
const run = randomUUID();
try {
  for (let i = 0; i < 3; i++) {
    const email = `home-verify-${run}-${i}@example.com`,
      password = randomUUID() + randomUUID();
    const user = ok(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { home_verification: run },
      }),
    ).user;
    users.push(user.id);
    const client = createClient(url, publicKey, options);
    ok(await client.auth.signInWithPassword({ email, password }));
    user.client = client;
    const person = ok(
      await admin
        .from('kwilt_people')
        .insert({
          display_name: `Home verification ${i}`,
          kind: 'adult',
          created_by_user_id: user.id,
        })
        .select('id')
        .single(),
    );
    people.push(person.id);
    ok(
      await admin
        .from('kwilt_person_auth_bindings')
        .insert({ person_id: person.id, user_id: user.id }),
    );
    users[i] = { ...user, personId: person.id };
  }
  const [a, b, c] = users;
  const h = ok(
    await admin
      .from('kwilt_households')
      .insert({ name: 'Temporary Home verification', created_by_user_id: a.id })
      .select('id')
      .single(),
  );
  households.push(h.id);
  ok(
    await admin.from('kwilt_household_memberships').insert([
      { household_id: h.id, person_id: a.personId, role: 'owner' },
      { household_id: h.id, person_id: b.personId, role: 'caregiver' },
    ]),
  );
  const h2 = ok(
    await admin
      .from('kwilt_households')
      .insert({
        name: 'Temporary Home connections verification',
        created_by_user_id: a.id,
      })
      .select('id')
      .single(),
  );
  households.push(h2.id);
  ok(
    await admin.from('kwilt_household_memberships').insert([
      { household_id: h2.id, person_id: a.personId, role: 'owner' },
      { household_id: h2.id, person_id: c.personId, role: 'caregiver' },
    ]),
  );
  assert.ok(
    (await call(a.client, 'bootstrap')).households.some((x) => x.id === h.id),
  );
  const id = randomUUID(),
    path = `${a.id}/${id}/${randomUUID()}.jpg`;
  paths.push(path);
  const payload = {
    id,
    text: 'A moment from today',
    audience: 'household',
    householdId: h.id,
    media: [{ path, alt: 'Verification image' }],
    attachment: {
      kind: 'place',
      name: 'A shared park',
      latitude: 40,
      longitude: -111,
    },
  };
  await call(a.client, 'draft', payload);
  await assert.rejects(call(a.client, 'publish', { id }), /Photo upload/);
  // Minimal JPEG bytes suffice for the Storage authorization round trip.
  ok(
    await a.client.storage
      .from('home-moments')
      .upload(path, Buffer.from([255, 216, 255, 217]), {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '0',
      }),
  );
  assert.ok((await readPhoto(b.client, path)).error);
  await call(a.client, 'publish', { id });
  await call(a.client, 'publish', { id });
  assert.equal((await call(b.client, 'feed')).posts.length, 1);
  assert.equal((await call(c.client, 'feed')).posts.length, 0);
  ok(await readPhoto(b.client, path));
  assert.ok((await readPhoto(c.client, path)).error);
  assert.ok((await b.client.from('kwilt_home_posts').select('*')).error);
  const reply = randomUUID();
  await call(b.client, 'reply', { id: reply, postId: id, text: 'Love this' });
  await call(b.client, 'reply', { id: reply, postId: id, text: 'Love this' });
  assert.equal(
    (await call(a.client, 'conversation', { id })).replies.length,
    1,
  );
  await call(b.client, 'react', { id, reaction: 'heart' });
  await call(b.client, 'save_place', { id });
  const report = await call(a.client, 'report', {
    id: reply,
    kind: 'home_reply',
    reason: 'other',
    note: 'Temporary automated verification; remove after test.',
  });
  reports.push(report.reportId);
  assert.equal(
    ok(
      await admin
        .from('kwilt_ugc_reports')
        .select('reported_user_id')
        .eq('id', report.reportId)
        .single(),
    ).reported_user_id,
    b.id,
  );
  await call(b.client, 'delete_reply', { id: reply });
  assert.match(
    (
      await admin
        .from('kwilt_blocks')
        .insert({ blocker_id: b.id, blocked_id: a.id })
    ).error.message,
    /household_relationship_requires_role_action/,
  );
  ok(
    await admin
      .from('kwilt_household_memberships')
      .update({ status: 'removed', removed_at: new Date().toISOString() })
      .eq('household_id', h.id)
      .eq('person_id', b.personId),
  );
  assert.equal((await call(b.client, 'feed')).posts.length, 0);
  assert.ok((await readPhoto(b.client, path)).error);
  const before = randomUUID();
  await call(a.client, 'draft', {
    id: before,
    text: 'Before approval',
    audience: 'followers',
  });
  await call(a.client, 'publish', { id: before });
  const follow = await call(c.client, 'follow_request', { targetUserId: a.id });
  await call(a.client, 'follow_accept', { id: follow.id });
  assert.equal((await call(c.client, 'feed')).posts.length, 0);
  const after = randomUUID();
  await call(a.client, 'draft', {
    id: after,
    text: 'After approval',
    attachment: { kind: 'goal_completed', title: 'Finish the garden' },
    audience: 'followers',
  });
  await call(a.client, 'publish', { id: after });
  assert.equal((await call(c.client, 'feed')).posts.length, 1);
  assert.deepEqual((await call(c.client, 'feed')).posts[0].attachment, {
    kind: 'goal_completed',
    title: 'Finish the garden',
  });
  await call(a.client, 'follow_remove', { id: follow.id });
  assert.equal((await call(c.client, 'feed')).posts.length, 0);
  await call(a.client, 'delete', { id });
  assert.ok((await readPhoto(b.client, path)).error);
  assert.ok((await call(a.client, 'cleanup')).includes(path));
  ok(await a.client.storage.from('home-moments').remove([path]));
  assert.equal((await call(a.client, 'cleanup')).length, 0);
  console.log(
    'PASS live API: household publishing/retry, upload gate, private Storage, direct-table denial, reply idempotency, reporting attribution, cheers, saved places, household removal revocation, approved follows/no backfill/removal, tombstone and physical cleanup.',
  );
} finally {
  const failures = [];
  async function clean(label, fn) {
    try {
      ok(await fn());
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
    }
  }
  if (paths.length)
    await clean('photos', () =>
      admin.storage.from('home-moments').remove(paths),
    );
  if (reports.length)
    await clean('reports', () =>
      admin.from('kwilt_ugc_reports').delete().in('id', reports),
    );
  if (households.length)
    await clean('households', () =>
      admin.from('kwilt_households').delete().in('id', households),
    );
  if (people.length)
    await clean('people', () =>
      admin.from('kwilt_people').delete().in('id', people),
    );
  for (const user of users) {
    const id = typeof user === 'string' ? user : user.id;
    await clean('test account', () => admin.auth.admin.deleteUser(id));
  }
  if (failures.length)
    throw new Error(
      `Temporary verification cleanup needs attention: ${failures.join('; ')}`,
    );
  console.log('PASS cleanup: dedicated accounts and fixture data removed.');
}
