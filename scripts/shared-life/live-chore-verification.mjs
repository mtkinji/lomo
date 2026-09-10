/** Opt-in live acceptance against dedicated, temporary accounts. Never uses existing users. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
if (process.env.KWILT_HOME_LIVE_VERIFY !== "yes")
  throw new Error("Explicit live verification opt-in required");
const keys = JSON.parse(
  await fs.readFile(process.env.KWILT_HOME_KEYS_FILE, "utf8"),
);
const url = "https://sqxwjtorodqjdfnuvprf.supabase.co";
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(
  url,
  keys.find((k) => k.name === "service_role").api_key,
  options,
);
const publicKey = keys.find((k) => k.type === "publishable").api_key;
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
  return ok(await client.rpc("kwilt_home_command", { op, args }));
}
async function readPhoto(client, path) {
  const token = (await client.auth.getSession()).data.session.access_token;
  const response = await fetch(
    `${url}/storage/v1/object/authenticated/home-moments/${path}?v=${randomUUID()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: publicKey,
        "Cache-Control": "no-store",
      },
      cache: "no-store",
    },
  );
  return {
    error: response.ok ? null : new Error(`Photo denied: ${response.status}`),
  };
}
const run = randomUUID();
try {
  for (let i = 0; i < 4; i++) {
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
        .from("kwilt_people")
        .insert({
          display_name: `Home verification ${i}`,
          kind: i === 3 ? "dependent" : "adult",
          created_by_user_id: user.id,
        })
        .select("id")
        .single(),
    );
    people.push(person.id);
    ok(
      await admin
        .from("kwilt_person_auth_bindings")
        .insert({ person_id: person.id, user_id: user.id }),
    );
    users[i] = { ...user, personId: person.id };
  }
  const [a, b, c, child] = users;
  const h = ok(
    await admin
      .from("kwilt_households")
      .insert({ name: "Temporary Home verification", created_by_user_id: a.id })
      .select("id")
      .single(),
  );
  households.push(h.id);
  ok(
    await admin.from("kwilt_household_memberships").insert([
      { household_id: h.id, person_id: a.personId, role: "owner" },
      { household_id: h.id, person_id: b.personId, role: "caregiver" },
      { household_id: h.id, person_id: child.personId, role: "child" },
    ]),
  );
  const h2 = ok(
    await admin
      .from("kwilt_households")
      .insert({
        name: "Temporary Home connections verification",
        created_by_user_id: a.id,
      })
      .select("id")
      .single(),
  );
  households.push(h2.id);
  ok(
    await admin.from("kwilt_household_memberships").insert([
      { household_id: h2.id, person_id: a.personId, role: "owner" },
      { household_id: h2.id, person_id: c.personId, role: "caregiver" },
    ]),
  );
  const members = ok(
    await admin
      .from("kwilt_household_memberships")
      .select("id,person_id")
      .eq("household_id", h.id),
  );
  const childMember = members.find((m) => m.person_id === child.personId).id;
  const ownerMember = members.find((m) => m.person_id === a.personId).id;
  const chore = async (client, operation, member = null) =>
    ok(
      await client.rpc("execute_kwilt_chore_action", {
        p_operation: operation,
        p_actor_membership_id: member,
      }),
    );
  const snapshot = async (client, member = null) =>
    ok(
      await client.rpc("get_kwilt_chore_snapshot", {
        p_actor_membership_id: member,
      }),
    );
  const follow = await call(c.client, "follow_request", {
    targetHouseholdId: h.id,
  });
  await call(a.client, "follow_accept", { id: follow.id });
  const created = [];
  for (const [title, reviewPolicy] of [
    ["Recycling", "trusted"],
    ["Dishes", "caregiver_review"],
  ]) {
    await chore(
      a.client,
      {
        requestId: randomUUID(),
        operationId: "chores.definition.create",
        payload: {
          fields: {
            title,
            assignedMembershipId: childMember,
            photoPolicy: "optional",
            reviewPolicy,
          },
        },
      },
      ownerMember,
    );
  }
  let snap = await snapshot(child.client);
  assert.equal(snap.occurrences.length, 2);
  for (const occurrence of snap.occurrences) {
    const operation = {
      requestId: randomUUID(),
      operationId: "chores.occurrence.complete",
      targetId: occurrence.id,
      expectedVersion: occurrence.updatedAt,
      payload: {},
    };
    await chore(child.client, operation);
    await chore(child.client, operation); // same request must never produce another feed event
  }
  let posts = (await call(b.client, "feed")).posts;
  assert.equal(posts.length, 1);
  const postId = posts[0].id;
  assert.equal(posts[0].kind, "chore_update");
  assert.equal(posts[0].authorId, null);
  assert.equal(posts[0].authorName, "Home verification 3");
  assert.equal(posts[0].choreUpdate.items.length, 2);
  assert.equal(
    posts[0].choreUpdate.items.filter((i) => i.state === "waiting_approval")
      .length,
    1,
  );
  assert.equal((await call(c.client, "feed")).posts.length, 0);
  for (const op of ["edit", "delete", "discard", "publish", "draft"])
    await assert.rejects(
      call(a.client, op, { id: postId, text: "forged", audience: "followers" }),
      /Chore updates/,
    );
  await call(b.client, "react", { id: postId, reaction: "heart" });
  await call(b.client, "reply", {
    id: randomUUID(),
    postId,
    text: "Thank you!",
  });
  snap = await snapshot(a.client, ownerMember);
  const pending = snap.occurrences.find((o) => o.status === "waiting_approval");
  await chore(
    a.client,
    {
      requestId: randomUUID(),
      operationId: "chores.review.approve",
      targetId: pending.id,
      expectedVersion: pending.updatedAt,
      payload: {},
    },
    ownerMember,
  );
  posts = (await call(b.client, "feed")).posts;
  assert.equal(posts[0].id, postId);
  assert.ok(posts[0].choreUpdate.items.every((i) => i.state === "completed"));
  assert.equal(posts[0].reactionCount, 1);
  assert.equal(posts[0].replyCount, 1);
  const report = await call(b.client, "report", {
    id: postId,
    kind: "home_post",
    reason: "other",
    note: "Temporary QA report",
  });
  reports.push(report.reportId);
  for (const occurrence of (await snapshot(child.client)).occurrences) {
    await chore(child.client, {
      requestId: randomUUID(),
      operationId: "chores.occurrence.reopen",
      targetId: occurrence.id,
      expectedVersion: occurrence.updatedAt,
      payload: {},
    });
  }
  assert.equal((await call(b.client, "feed")).posts.length, 0);
  await assert.rejects(
    call(b.client, "conversation", { id: postId }),
    /no longer available/,
  );
  console.log(
    "PASS live Chores RPC -> Home: child attribution, idempotent completion, grouped pending/approved state, thanks/comments, follower denial, guarded mutations, reports, reopening.",
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
    await clean("photos", () =>
      admin.storage.from("home-moments").remove(paths),
    );
  if (reports.length)
    await clean("reports", () =>
      admin.from("kwilt_ugc_reports").delete().in("id", reports),
    );
  const userIds = users.map((u) => (typeof u === "string" ? u : u.id));
  if (households.length) {
    await clean("chore ledger", () =>
      admin
        .from("kwilt_chore_reward_ledger")
        .delete()
        .in("household_id", households),
    );
  }
  if (userIds.length) {
    await clean("chore occurrences", () =>
      admin
        .from("kwilt_chore_occurrences")
        .delete()
        .in("activity_owner_user_id", userIds),
    );
    await clean("chore profiles", () =>
      admin
        .from("kwilt_chore_profiles")
        .delete()
        .in("activity_owner_user_id", userIds),
    );
  }
  if (households.length)
    await clean("households", () =>
      admin.from("kwilt_households").delete().in("id", households),
    );
  if (people.length)
    await clean("people", () =>
      admin.from("kwilt_people").delete().in("id", people),
    );
  for (const user of users) {
    const id = typeof user === "string" ? user : user.id;
    await clean("test account", () => admin.auth.admin.deleteUser(id));
  }
  if (failures.length)
    throw new Error(
      `Temporary verification cleanup needs attention: ${failures.join("; ")}`,
    );
  console.log("PASS cleanup: dedicated accounts and fixture data removed.");
}
