import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { PGlite } = await import(
  process.env.KWILT_PGLITE_PATH || "@electric-sql/pglite"
);
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function fixture(connected = false) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create schema storage;
 create table auth.users(id uuid primary key, is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table public.kwilt_people(id uuid primary key, display_name text, kind text);
 create table public.kwilt_person_auth_bindings(person_id uuid, user_id uuid, status text);
 create table public.kwilt_households(id uuid primary key, name text);
 create table public.kwilt_household_memberships(id uuid primary key, person_id uuid, household_id uuid, role text, status text, joined_at timestamptz default now());
 create table public.kwilt_friendships(user_a uuid,user_b uuid,status text);
 create table public.kwilt_blocks(blocker_id uuid,blocked_id uuid);
 create function public.kwilt_shared_text_allowed(candidate text) returns boolean language sql as $$ select coalesce(candidate,'') not like '%kill yourself%' $$;
 create table public.kwilt_ugc_reports(id uuid primary key default gen_random_uuid(),reporter_user_id uuid,reported_user_id uuid,reported_person_id uuid, constraint kwilt_ugc_reports_has_subject check (reported_user_id is not null or reported_person_id is not null),target_kind text constraint kwilt_ugc_reports_target_kind_check check(target_kind in ('user')),target_id uuid,reason text,reporter_note text,snapshot jsonb,priority text,response_due_at timestamptz);
 create table public.kwilt_memberships(entity_type text,entity_id uuid,user_id uuid,status text);
 create table public.kwilt_feed_events(id uuid,entity_type text,entity_id uuid,actor_id uuid,type text,payload jsonb,created_at timestamptz default now());
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage to authenticated; grant select,insert,update,delete on storage.objects to authenticated;
 grant execute on function auth.uid() to authenticated;
 insert into auth.users(id,is_anonymous) values ${[1, 2, 3, 4, 5].map((n) => `('${id(n)}',${n === 5})`).join(",")};
 insert into kwilt_people values ${[1, 2, 3, 4].map((n) => `('${id(n)}','Person ${n}','${n === 4 ? "dependent" : "adult"}')`).join(",")};
 insert into kwilt_person_auth_bindings values ${[1, 2, 3, 4].map((n) => `('${id(n)}','${id(n)}','active')`).join(",")};
 insert into kwilt_households values ('${id(10)}','Our household'),('${id(11)}','Other household');
 insert into kwilt_household_memberships(id,person_id,household_id,role,status) values
 ('${id(21)}','${id(1)}','${id(10)}','owner','active'),('${id(22)}','${id(2)}','${id(10)}','caregiver','active'),('${id(23)}','${id(3)}','${id(11)}','owner','active'),('${id(24)}','${id(4)}','${id(10)}','child','active');
 insert into kwilt_friendships values ('${id(1)}','${id(3)}','active');`);
  const migration = (await fs.readdir("supabase/migrations")).find((x) =>
    x.endsWith("_home_shared_life.sql"),
  );
  await db.exec(await fs.readFile(`supabase/migrations/${migration}`, "utf8"));
  await db.exec(
    `create table public.kwilt_activities(user_id uuid, id text, data jsonb, primary key(user_id,id));`,
  );
  const choreSql = await fs.readFile(
    "supabase/migrations/20260829054800_activity_backed_chore_profiles.sql",
    "utf8",
  );
  await db.exec(
    choreSql.slice(
      0,
      choreSql.indexOf(
        "create table if not exists public.kwilt_chore_evidence_refs",
      ),
    ),
  );
  const choreMigration = (await fs.readdir("supabase/migrations")).find((x) =>
    x.endsWith("_home_chore_updates.sql"),
  );
  await db.exec(
    await fs.readFile(`supabase/migrations/${choreMigration}`, "utf8"),
  );
  const reportMigration = (await fs.readdir("supabase/migrations")).find((x) =>
    x.endsWith("_home_chore_report_subject.sql"),
  );
  await db.exec(
    await fs.readFile(`supabase/migrations/${reportMigration}`, "utf8"),
  );
  if (connected) await db.exec(await fs.readFile("supabase/migrations/20260909154123_home_connected_moments.sql", "utf8"));
  if (connected) await db.exec(await fs.readFile("supabase/migrations/20260909155117_home_photo_dimensions.sql", "utf8"));
  if (connected) await db.exec(await fs.readFile("supabase/migrations/20260909160213_home_saved_destinations.sql", "utf8"));
  await db.exec(await fs.readFile("supabase/migrations/20260910003221_home_chore_command_authority.sql", "utf8"));
  return db;
}
async function call(db, user, op, args = {}) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id(user)}',false); set role authenticated;`,
  );
  return (
    await db.query("select public.kwilt_home_command($1,$2::jsonb) as result", [
      op,
      JSON.stringify(args),
    ])
  ).rows[0].result;
}
async function post(db, user = 1, args = {}) {
  const draft = await call(db, user, "draft", {
    id: id(100),
    text: "An ordinary day",
    audience: "household",
    householdId: id(10),
    ...args,
  });
  await call(db, user, "publish", { id: draft.id });
  return draft.id;
}
test("household publishing is durable, idempotent and excludes nonmembers and children", async () => {
  const db = await fixture();
  try {
    const p = await post(db);
    await call(db, 1, "publish", { id: p });
    assert.equal((await call(db, 2, "feed")).posts.length, 1);
    assert.equal((await call(db, 3, "feed")).posts.length, 0);
    await assert.rejects(call(db, 4, "feed"), /adult/);
    await assert.rejects(call(db, 5, "feed"), /adult/);
    await assert.rejects(
      call(db, 2, "draft", {
        id: p,
        text: "Hijacked",
        audience: "household",
        householdId: id(10),
      }),
    );
    await assert.rejects(
      call(db, 3, "reply", { postId: p, id: id(201), text: "Intrusion" }),
    );
    await call(db, 2, "reply", { postId: p, id: id(202), text: "Love this" });
    await call(db, 2, "reply", { postId: p, id: id(202), text: "Love this" });
    assert.equal(
      (await call(db, 1, "conversation", { id: p })).replies.length,
      1,
    );
    await call(db, 1, "delete", { id: p });
    assert.equal((await call(db, 2, "feed")).posts.length, 0);
  } finally {
    await db.close();
  }
});
test("follows require approval, never backfill, and revocation takes effect", async () => {
  const db = await fixture();
  try {
    await post(db, 1, { audience: "followers", householdId: null });
    const f = await call(db, 3, "follow_request", { targetUserId: id(1) });
    assert.equal((await call(db, 3, "feed")).posts.length, 0);
    await assert.rejects(call(db, 3, "follow_accept", { id: f.id }));
    await call(db, 1, "follow_accept", { id: f.id });
    assert.equal((await call(db, 3, "feed")).posts.length, 0);
    await post(db, 1, {
      id: id(101),
      audience: "followers",
      householdId: null,
    });
    assert.equal((await call(db, 3, "feed")).posts.length, 1);
    await call(db, 1, "follow_remove", { id: f.id });
    assert.equal((await call(db, 3, "feed")).posts.length, 0);
  } finally {
    await db.close();
  }
});
test("blocking and household removal revoke reads and response authority", async () => {
  const db = await fixture();
  try {
    const p = await post(db);
    await db.exec(
      `reset role; insert into kwilt_blocks values ('${id(2)}','${id(1)}');`,
    );
    assert.equal((await call(db, 2, "feed")).posts.length, 0);
    await assert.rejects(call(db, 2, "react", { id: p, reaction: "heart" }));
    await db.exec(
      `reset role; delete from kwilt_blocks; update kwilt_household_memberships set status='removed' where person_id='${id(2)}';`,
    );
    assert.equal((await call(db, 2, "feed")).posts.length, 0);
  } finally {
    await db.close();
  }
});
test("rejects unreviewed attachment fields, missing photos, and arbitrary recipient IDs", async () => {
  const db = await fixture();
  try {
    await assert.rejects(
      post(db, 1, {
        attachment: {
          kind: "place",
          name: "Park",
          latitude: 40,
          longitude: -111,
          privateRoute: [1, 2],
        },
      }),
    );
    await assert.rejects(
      post(db, 1, { audience: "people", recipientIds: [id(5)] }),
    );
    await assert.rejects(
      post(db, 1, {
        media: [{ path: `${id(1)}/${id(100)}/photo.jpg`, alt: "Day" }],
      }),
    );
  } finally {
    await db.close();
  }
});

test("photos are private, readable only after publication, and revoked on deletion", async () => {
  const db = await fixture();
  try {
    const path = `${id(1)}/${id(100)}/photo.jpg`;
    await call(db, 1, "draft", {
      id: id(100),
      text: "Photo",
      audience: "household",
      householdId: id(10),
      media: [{ path, alt: "Dinner" }],
    });
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('home-moments',$1)",
      [path],
    );
    await call(db, 2, "bootstrap");
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await call(db, 1, "publish", { id: id(100) });
    await call(db, 2, "bootstrap");
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values ('home-moments',$1)",
        [path],
      ),
    );
    await call(db, 1, "delete", { id: id(100) });
    await call(db, 2, "bootstrap");
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("report snapshots require post access and keep the reporter private", async () => {
  const db = await fixture();
  try {
    const p = await post(db);
    await assert.rejects(call(db, 3, "report", { id: p, reason: "privacy" }));
    const result = await call(db, 2, "report", { id: p, reason: "privacy" });
    assert.equal(result.status, "submitted");
    await db.exec("reset role");
    const rows = (await db.query("select * from kwilt_ugc_reports")).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].snapshot.text, "An ordinary day");
  } finally {
    await db.close();
  }
});
test("Goal notes retain source membership and never reach a household-only reader", async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into kwilt_memberships values ('goal','${id(60)}','${id(1)}','active'),('goal','${id(60)}','${id(3)}','active');
 insert into kwilt_feed_events(id,entity_type,entity_id,actor_id,type,payload) values ('${id(61)}','goal','${id(60)}','${id(3)}','checkin_reply','{"text":"Cheering you on"}');`);
    assert.equal((await call(db, 1, "notes")).length, 1);
    assert.equal((await call(db, 2, "notes")).length, 0);
    await db.exec(
      `reset role;update kwilt_memberships set status='left' where user_id='${id(1)}';`,
    );
    assert.equal((await call(db, 1, "notes")).length, 0);
  } finally {
    await db.close();
  }
});
test("authors can delete replies and recipients can report the actual reply author", async () => {
  const db = await fixture();
  try {
    const p = await post(db);
    await call(db, 2, "reply", { postId: p, id: id(202), text: "A reply" });
    const report = await call(db, 1, "report", {
      id: id(202),
      kind: "home_reply",
      reason: "harassment",
    });
    assert.equal(report.status, "submitted");
    await assert.rejects(call(db, 1, "delete_reply", { id: id(202) }));
    await call(db, 2, "delete_reply", { id: id(202) });
    assert.equal(
      (await call(db, 1, "conversation", { id: p })).replies.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test("cleanup retains exact paths until physical removal and draft discard cannot delete a published post", async () => {
  const db = await fixture();
  try {
    const path = `${id(1)}/${id(100)}/photo.jpg`;
    await call(db, 1, "draft", {
      id: id(100),
      text: "Photo",
      audience: "household",
      householdId: id(10),
      media: [{ path, alt: "Dinner" }],
    });
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('home-moments',$1)",
      [path],
    );
    await call(db, 1, "publish", { id: id(100) });
    await assert.rejects(call(db, 1, "discard", { id: id(100) }));
    await call(db, 1, "delete", { id: id(100) });
    assert.deepEqual(await call(db, 1, "cleanup"), [path]);
    await db.query("delete from storage.objects where name=$1", [path]);
    assert.deepEqual(await call(db, 1, "cleanup"), []);
    await call(db, 1, "draft", {
      id: id(111),
      text: "Unfinished",
      audience: "household",
      householdId: id(10),
    });
    await call(db, 1, "discard", { id: id(111) });
    await assert.rejects(call(db, 1, "publish", { id: id(111) }));
  } finally {
    await db.close();
  }
});
test("isolates Chores storage authority from Home uploads without exposing the actor helper", async () => {
  const db = await fixture();
  try {
    await db.exec(`create function public.kwilt_agent_household_actor(uuid) returns public.kwilt_household_memberships language sql security definer as $$ select m from kwilt_household_memberships m where person_id=$1 limit 1 $$;
    revoke all on function public.kwilt_agent_household_actor(uuid) from public,authenticated;
    create function public.kwilt_is_active_household_member(uuid) returns boolean language sql security definer as $$ select exists(select 1 from kwilt_household_memberships where household_id=$1 and person_id=auth.uid() and status='active') $$;
    create policy kwilt_chore_evidence_storage_insert on storage.objects for insert to authenticated with check(bucket_id='chore_evidence' and (public.kwilt_agent_household_actor(auth.uid())).role='owner');
    create policy kwilt_chore_evidence_storage_read on storage.objects for select to authenticated using(false);`);
    const migration = (await fs.readdir("supabase/migrations")).find((x) =>
      x.endsWith("_home_storage_policy_isolation.sql"),
    );
    await db.exec(
      await fs.readFile(`supabase/migrations/${migration}`, "utf8"),
    );
    await call(db, 1, "draft", {
      id: id(120),
      text: "Photo",
      audience: "household",
      householdId: id(10),
      media: [{ path: `${id(1)}/${id(120)}/photo.jpg`, alt: "A photo" }],
    });
    await db.exec(
      `insert into storage.objects(bucket_id,name) values('home-moments','${id(1)}/${id(120)}/photo.jpg')`,
    );
    await assert.rejects(
      db.query(`select public.kwilt_agent_household_actor('${id(1)}')`),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name) values('chore_evidence','${id(99)}/photo.jpg')`,
      ),
      /row-level security/,
    );
  } finally {
    await db.close();
  }
});
test("completed goal stories share only the title snapshot, never private goal details", async () => {
  const db = await fixture();
  try {
    const file = (await fs.readdir("supabase/migrations")).find((x) =>
      x.endsWith("_goal_completion_home_moments.sql"),
    );
    await db.exec(await fs.readFile(`supabase/migrations/${file}`, "utf8"));
    await post(db, 1, {
      attachment: { kind: "goal_completed", title: "Finish the garden" },
    });
    assert.deepEqual((await call(db, 2, "feed")).posts[0].attachment, {
      kind: "goal_completed",
      title: "Finish the garden",
    });
    await assert.rejects(
      post(db, 1, {
        id: id(130),
        attachment: {
          kind: "goal_completed",
          title: "Finish the garden",
          goalId: id(999),
          privateNotes: "private",
        },
      }),
      /Invalid/,
    );
  } finally {
    await db.close();
  }
});

async function choreFixture() {
  const db = await fixture();
  await db.exec(
    `update kwilt_household_memberships set joined_at=now()-interval '1 day';`,
  );
  await db.exec(`insert into kwilt_activities values ('${id(1)}','series','{"title":"Recycling"}'),('${id(1)}','one','{"title":"Recycling"}'),('${id(1)}','two','{"title":"Dishes"}');
  insert into kwilt_chore_profiles(id,household_id,activity_owner_user_id,activity_series_id,created_by_membership_id) values ('${id(40)}','${id(10)}','${id(1)}','series','${id(21)}');
  insert into kwilt_chore_occurrences(id,profile_id,activity_owner_user_id,activity_id) values ('${id(41)}','${id(40)}','${id(1)}','one'),('${id(42)}','${id(40)}','${id(1)}','two');`);
  return db;
}
async function completeChore(
  db,
  occurrence = 41,
  state = "completed",
  member = 24,
) {
  await db.exec(
    `reset role; update kwilt_chore_occurrences set state='${state}',performed_by_membership_id='${id(member)}',performed_at=now() where id='${id(occurrence)}';`,
  );
}
test("chore completion automatically reaches adults in its household, never followers or a composer", async () => {
  const db = await choreFixture();
  try {
    await call(db, 3, "follow_request", { targetHouseholdId: id(10) });
    const connections = await call(db, 1, "connections");
    await call(db, 1, "follow_accept", { id: connections[0].id });
    await completeChore(db);
    const { posts } = await call(db, 2, "feed");
    assert.equal(posts.length, 1);
    assert.equal(posts[0].authorId, null);
    assert.equal(posts[0].authorName, "Person 4");
    assert.equal(posts[0].kind, "chore_update");
    assert.equal(posts[0].choreUpdate.items[0].title, "Recycling");
    assert.equal(posts[0].choreUpdate.items[0].state, "completed");
    assert.equal(posts[0].attachment, null);
    assert.deepEqual(posts[0].media, []);
    assert.equal((await call(db, 3, "feed")).posts.length, 0);
    await assert.rejects(call(db, 4, "feed"), /adult/);
    await assert.rejects(
      db.query("select * from kwilt_home_chore_events"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("nearby chores group, approvals retain responses, and undone items disappear", async () => {
  const db = await choreFixture();
  try {
    await completeChore(db, 41, "waiting_approval");
    const first = (await call(db, 1, "feed")).posts[0];
    assert.ok(first, "waiting approval should immediately create an update");
    await call(db, 2, "react", { id: first.id, reaction: "heart" });
    await call(db, 2, "reply", {
      id: id(60),
      postId: first.id,
      text: "Thank you!",
    });
    await completeChore(db, 42);
    await completeChore(db, 41);
    let posts = (await call(db, 1, "feed")).posts;
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, first.id);
    assert.equal(posts[0].choreUpdate.items.length, 2);
    assert.equal(posts[0].replyCount, 1);
    assert.equal(posts[0].reactionCount, 1);
    await db.exec(
      `reset role; update kwilt_chore_occurrences set state='ready',performed_by_membership_id=null,performed_at=null where id='${id(41)}'`,
    );
    posts = (await call(db, 1, "feed")).posts;
    assert.equal(posts[0].choreUpdate.items.length, 1);
    await db.exec(
      `reset role; delete from kwilt_chore_occurrences where id='${id(42)}'`,
    );
    assert.equal((await call(db, 1, "feed")).posts.length, 0);
    await assert.rejects(
      call(db, 1, "conversation", { id: first.id }),
      /unavailable|no longer available/,
    );
  } finally {
    await db.close();
  }
});
test("chore updates reject edit and delete through either RPC ID alias", async () => {
  const db = await choreFixture();
  try {
    await completeChore(db);
    const post = (await call(db, 1, "feed")).posts[0];
    for (const op of ["edit", "delete"]) {
      for (const args of [{ postId: post.id }, { id: id(999), postId: post.id }, { id: post.id }]) {
        await assert.rejects(call(db, 1, op, { ...args, text: "Forged contribution" }), /Chore updates|Only the author/);
      }
    }
    const after = (await call(db, 1, "feed")).posts[0];
    assert.equal(after.id, post.id);
    assert.equal(after.text, post.text);
  } finally { await db.close(); }
});
test("chore updates reject forged Home writes and revoke household access", async () => {
  const db = await choreFixture();
  try {
    await completeChore(db);
    const post = (await call(db, 1, "feed")).posts[0];
    assert.ok(post);
    for (const op of ["edit", "delete", "discard", "publish", "draft"]) {
      await assert.rejects(
        call(db, 1, op, { id: post.id, text: "Fake", audience: "followers" }),
        /Chore updates/,
      );
    }
    await db.exec(
      `reset role; update kwilt_household_memberships set status='removed' where id='${id(22)}'`,
    );
    assert.equal((await call(db, 2, "feed")).posts.length, 0);
    await assert.rejects(
      call(db, 2, "react", { id: post.id, reaction: "heart" }),
      /unavailable|no longer available/,
    );
    await db.exec(
      `reset role; update kwilt_household_memberships set status='removed' where id='${id(24)}'`,
    );
    assert.equal((await call(db, 1, "feed")).posts.length, 0);
  } finally {
    await db.close();
  }
});
test("no historical backfill; long-separated completions create separate groups", async () => {
  const db = await choreFixture();
  try {
    await completeChore(db);
    const post = (await call(db, 1, "feed")).posts[0];
    assert.ok(post);
    await db.exec(
      `reset role; update kwilt_home_posts set published_at=now()-interval '31 minutes' where id='${post.id}';`,
    );
    await completeChore(db, 42);
    assert.equal((await call(db, 1, "feed")).posts.length, 2);
    await db.exec(
      `reset role; insert into kwilt_household_memberships(id,person_id,household_id,role,status) values ('${id(25)}','${id(3)}','${id(10)}','caregiver','active')`,
    );
    assert.equal((await call(db, 3, "feed")).posts.length, 0);
  } finally {
    await db.close();
  }
});

test("Chores accepts its snapshot timestamp while rejecting missing and stale occurrence versions", async () => {
  const db = await choreFixture();
  try {
    const source = await fs.readFile(
      "supabase/migrations/20260829054800_activity_backed_chore_profiles.sql",
      "utf8",
    );
    await db.exec(
      source.slice(
        source.indexOf(
          "create table if not exists public.kwilt_chore_evidence_refs",
        ),
        source.indexOf("insert into storage.buckets"),
      ),
    );
    await db.exec(`alter table kwilt_activities add column updated_at timestamptz default now();
    create function public.kwilt_chore_actor(u uuid,member uuid,install text) returns public.kwilt_household_memberships language sql as $$ select m from public.kwilt_household_memberships m where person_id=u and status='active' limit 1 $$;`);
    await db.exec(
      source.slice(
        source.indexOf(
          "create or replace function public.execute_kwilt_agent_chore_action",
        ),
        source.indexOf(
          "create or replace function public.execute_kwilt_chore_action",
        ),
      ),
    );
    const fix = (await fs.readdir("supabase/migrations")).find((x) =>
      x.endsWith("_chore_occurrence_version_comparison.sql"),
    );
    await db.exec(await fs.readFile(`supabase/migrations/${fix}`, "utf8"));
    const version = (
      await db.query(
        `select to_jsonb(updated_at)#>>'{}' as version from kwilt_chore_occurrences where id='${id(41)}'`,
      )
    ).rows[0].version;
    const perform = (expectedVersion) =>
      db.query("select public.execute_kwilt_agent_chore_action($1,$2::jsonb)", [
        id(4),
        JSON.stringify({
          requestId: crypto.randomUUID(),
          operationId: "chores.occurrence.complete",
          targetId: id(41),
          expectedVersion,
          payload: {},
        }),
      ]);
    await assert.rejects(perform(null), /stale_chore_occurrence/);
    await assert.rejects(
      perform("2000-01-01T00:00:00Z"),
      /stale_chore_occurrence/,
    );
    await perform(version);
    assert.equal((await call(db, 1, "feed")).posts.length, 1);
  } finally {
    await db.close();
  }
});

test("automatic update reports identify its household person and route to household management", async () => {
  const db = await choreFixture();
  try {
    await completeChore(db);
    const p = (await call(db, 1, "feed")).posts[0];
    const report = await call(db, 1, "report", {
      id: p.id,
      kind: "home_post",
      reason: "privacy",
    });
    assert.equal(report.followup.kind, "manage_household");
    await db.exec("reset role");
    const row = (
      await db.query(
        "select reported_user_id,reported_person_id from kwilt_ugc_reports",
      )
    ).rows[0];
    assert.equal(row.reported_user_id, null);
    assert.equal(row.reported_person_id, id(4));
  } finally {
    await db.close();
  }
});

test("connected moments saves, collections, seen and previews preserve authority", async () => {
 const db=await fixture(true);
 try {
  const p=await post(db);
  await call(db,2,'bookmark',{id:p,saved:true});
  assert.equal((await call(db,2,'library')).posts.length,1);
  assert.equal((await call(db,3,'library')).posts.length,0);
  await assert.rejects(call(db,3,'bookmark',{id:p,saved:true}));
  await call(db,2,'collection_put',{id:id(701),name:'Summer'});
  await call(db,2,'collect',{id:p,collectionId:id(701),included:true});
  await assert.rejects(call(db,1,'collect',{id:p,collectionId:id(701),included:true}));
  assert.equal((await call(db,2,'library',{collectionId:id(701)})).posts.length,1);
  const bubbles=await call(db,2,'catchup');
  assert.equal(bubbles.some(x=>x.id===id(1)&&x.count===1),true);
  await call(db,2,'seen',{ids:[p]});
  assert.equal((await call(db,2,'catchup')).length,0);
  await call(db,2,'reply',{id:id(702),postId:p,text:'Wonderful'});
  await call(db,2,'react',{id:p,reaction:'heart'});
  const preview=(await call(db,1,'feed')).posts[0];
  assert.equal(preview.replyPreview.text,'Wonderful');
  assert.equal(preview.reactors[0].id,id(2));
  await call(db,2,'collection_delete',{id:id(701)});
  assert.equal((await call(db,2,'library')).posts.length,1);
  await call(db,1,'delete',{id:p});
  assert.equal((await call(db,2,'library')).posts.length,0);
 } finally {await db.close();}
});

test("explicit Explore copies are private, create no visit, and survive source deletion", async () => {
 const db=await fixture(true);
 try {
 const p=await post(db,1,{attachment:{kind:"place",name:"A park",latitude:40,longitude:-111}});
 await assert.rejects(call(db,3,"save_place",{id:p}));
 await call(db,2,"save_place",{id:p});
 await call(db,2,"save_place",{id:p});
 assert.equal((await call(db,2,"explore_places")).length,1);
 assert.equal((await call(db,2,'feed')).posts[0].savedToExplore,true);
 assert.equal((await call(db,1,"explore_places")).length,0);
 await call(db,1,"delete",{id:p});
 const saved=await call(db,2,"explore_places");
 assert.equal(saved[0].name,"A park");
 assert.equal("visitedAt" in saved[0],false);
 await call(db,2,"remove_explore_place",{id:p});
 assert.equal((await call(db,2,"explore_places")).length,0);
 }finally{await db.close();}
});
test('photo dimensions accept bounded paired metadata and reject malformed dimensions',async()=>{
 const db=await fixture(true);
 try{
  const media={path:`${id(1)}/${id(777)}/image.jpg`,alt:'A canyon',width:1200,height:1600};
  await call(db,1,'draft',{id:id(777),text:'Photo',audience:'household',householdId:id(10),media:[media]});
  await assert.rejects(call(db,1,'draft',{id:id(777),text:'Photo',audience:'household',householdId:id(10),media:[{...media,height:0}]}));
  await assert.rejects(call(db,1,'draft',{id:id(777),text:'Photo',audience:'household',householdId:id(10),media:[{...media,width:'oops'}]}));
 }finally{await db.close();}
});
