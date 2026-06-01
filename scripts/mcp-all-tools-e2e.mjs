#!/usr/bin/env node

const ALL_TOOLS = [
  'list_arcs',
  'get_arc',
  'list_goals',
  'get_goal',
  'list_recent_activities',
  'get_current_chapter',
  'get_show_up_status',
  'create_arc',
  'update_arc',
  'delete_arc',
  'create_goal',
  'update_goal',
  'delete_goal',
  'add_goal_checkin',
  'capture_activity',
  'update_activity',
  'mark_activity_done',
  'set_focus_today',
  'delete_activity',
  'update_chapter_user_note',
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeBaseUrl(raw) {
  return raw.replace(/\/+$/, '');
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`${init.method ?? 'GET'} ${url} returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }
  }
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${url} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function mcpCall(baseUrl, token, method, params = undefined, id = method) {
  const response = await requestJson(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      ...(params === undefined ? {} : { params }),
    }),
  });
  if (response?.error) throw new Error(`MCP ${method} failed: ${JSON.stringify(response.error)}`);
  return response.result;
}

async function mcpNotify(baseUrl, token, method, params = undefined) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      ...(params === undefined ? {} : { params }),
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`MCP notification ${method} failed (${response.status}): ${text.slice(0, 200)}`);
  if (text.trim()) throw new Error(`MCP notification ${method} returned a body (${response.status}): ${text.slice(0, 200)}`);
}

async function tool(baseUrl, token, name, args = {}) {
  const result = await mcpCall(baseUrl, token, 'tools/call', { name, arguments: args }, name);
  return result.structuredContent ?? result.structured_content ?? result;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectIncludes(collection, predicate, message) {
  expect(Array.isArray(collection) && collection.some(predicate), message);
}

async function run() {
  const baseUrl = normalizeBaseUrl(requiredEnv('MCP_BASE_URL'));
  const token = requiredEnv('MCP_ACCESS_TOKEN');
  const chapterId = requiredEnv('MCP_E2E_CHAPTER_ID');
  const stamp = process.env.MCP_E2E_STAMP?.trim() || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const today = new Date().toISOString().slice(0, 10);
  const created = { arcId: null, goalId: null, activityId: null };

  const metadata = await requestJson(`${baseUrl}/.well-known/oauth-authorization-server`);
  expect(metadata.resource_indicators_supported === true, 'authorization metadata missing resource_indicators_supported');
  console.log('metadata ok');

  const init = await mcpCall(baseUrl, token, 'initialize');
  expect(init.serverInfo?.name === 'Kwilt', 'initialize returned unexpected server');
  await mcpNotify(baseUrl, token, 'notifications/initialized');
  console.log('initialize ok');

  const tools = await mcpCall(baseUrl, token, 'tools/list');
  const names = tools.tools?.map((item) => item.name) ?? [];
  for (const name of ALL_TOOLS) expect(names.includes(name), `tools/list missing ${name}`);
  console.log(`tools/list ok (${names.length} tools)`);

  try {
    const arc = await tool(baseUrl, token, 'create_arc', {
      idempotency_key: `${stamp}:create_arc`,
      name: `MCP E2E Arc ${stamp}`,
      identity_statement: 'I verify external integrations without touching personal data.',
    });
    created.arcId = arc.arc_id;
    expect(created.arcId, 'create_arc missing arc_id');
    console.log('create_arc ok');

    await tool(baseUrl, token, 'update_arc', {
      idempotency_key: `${stamp}:update_arc`,
      arc_id: created.arcId,
      name: `MCP E2E Arc Updated ${stamp}`,
      narrative: 'Temporary E2E validation arc.',
      status: 'active',
    });
    console.log('update_arc ok');

    const gotArc = await tool(baseUrl, token, 'get_arc', { arc_id: created.arcId });
    expect(gotArc.arc?.id === created.arcId, 'get_arc did not return created arc');
    console.log('get_arc ok');

    const listedArcs = await tool(baseUrl, token, 'list_arcs', { status: 'active', limit: 20 });
    expectIncludes(listedArcs.arcs, (item) => item.id === created.arcId, 'list_arcs did not include created arc');
    console.log('list_arcs ok');

    const goal = await tool(baseUrl, token, 'create_goal', {
      idempotency_key: `${stamp}:create_goal`,
      arc_id: created.arcId,
      title: `MCP E2E Goal ${stamp}`,
      description: 'Temporary E2E validation goal.',
      status: 'planned',
      priority: 2,
    });
    created.goalId = goal.goal_id;
    expect(created.goalId, 'create_goal missing goal_id');
    console.log('create_goal ok');

    await tool(baseUrl, token, 'update_goal', {
      idempotency_key: `${stamp}:update_goal`,
      goal_id: created.goalId,
      title: `MCP E2E Goal Updated ${stamp}`,
      status: 'in_progress',
      priority: 1,
      target_date: today,
    });
    console.log('update_goal ok');

    const gotGoal = await tool(baseUrl, token, 'get_goal', { goal_id: created.goalId });
    expect(gotGoal.goal?.id === created.goalId, 'get_goal did not return created goal');
    console.log('get_goal ok');

    const listedGoals = await tool(baseUrl, token, 'list_goals', { arc_id: created.arcId, status: ['in_progress'], limit: 20 });
    expectIncludes(listedGoals.goals, (item) => item.id === created.goalId, 'list_goals did not include created goal');
    console.log('list_goals ok');

    const checkin = await tool(baseUrl, token, 'add_goal_checkin', {
      idempotency_key: `${stamp}:add_goal_checkin`,
      goal_id: created.goalId,
      preset: 'made_progress',
      text: 'Temporary E2E check-in.',
    });
    expect(checkin.checkin_id, 'add_goal_checkin missing checkin_id');
    console.log('add_goal_checkin ok');

    const activity = await tool(baseUrl, token, 'capture_activity', {
      idempotency_key: `${stamp}:capture_activity`,
      goal_id: created.goalId,
      title: `MCP E2E To-do ${stamp}`,
      notes: 'Temporary E2E validation to-do.',
      tags: ['mcp-e2e'],
      priority: 2,
    });
    created.activityId = activity.activity_id;
    expect(created.activityId, 'capture_activity missing activity_id');
    console.log('capture_activity ok');

    await tool(baseUrl, token, 'update_activity', {
      idempotency_key: `${stamp}:update_activity`,
      activity_id: created.activityId,
      title: `MCP E2E To-do Updated ${stamp}`,
      notes: 'Updated temporary E2E validation to-do.',
      status: 'in_progress',
      tags: ['mcp-e2e', 'updated'],
      priority: 1,
    });
    console.log('update_activity ok');

    await tool(baseUrl, token, 'set_focus_today', {
      idempotency_key: `${stamp}:set_focus_today`,
      activity_id: created.activityId,
      date: today,
    });
    console.log('set_focus_today ok');

    await tool(baseUrl, token, 'mark_activity_done', {
      idempotency_key: `${stamp}:mark_activity_done`,
      activity_id: created.activityId,
      completed_at: new Date().toISOString(),
    });
    console.log('mark_activity_done ok');

    const recent = await tool(baseUrl, token, 'list_recent_activities', { days: 1, include_rich: true });
    expectIncludes(recent.activities, (item) => item.id === created.activityId && item.status === 'done', 'list_recent_activities did not include completed activity');
    console.log('list_recent_activities ok');

    const chapter = await tool(baseUrl, token, 'get_current_chapter');
    expect(chapter.chapter?.id === chapterId, 'get_current_chapter did not return seeded chapter');
    console.log('get_current_chapter ok');

    await tool(baseUrl, token, 'update_chapter_user_note', {
      idempotency_key: `${stamp}:update_chapter_user_note`,
      chapter_id: chapterId,
      note: `Temporary MCP E2E note ${stamp}`,
    });
    console.log('update_chapter_user_note ok');

    const showUp = await tool(baseUrl, token, 'get_show_up_status');
    expect(showUp.show_up && typeof showUp.show_up.current_show_up_streak === 'number', 'get_show_up_status returned unexpected shape');
    console.log('get_show_up_status ok');
  } finally {
    if (created.activityId) {
      await tool(baseUrl, token, 'delete_activity', {
        idempotency_key: `${stamp}:delete_activity`,
        activity_id: created.activityId,
      }).then(() => console.log('delete_activity ok'));
    }
    if (created.goalId) {
      await tool(baseUrl, token, 'delete_goal', {
        idempotency_key: `${stamp}:delete_goal`,
        goal_id: created.goalId,
      }).then(() => console.log('delete_goal ok'));
    }
    if (created.arcId) {
      await tool(baseUrl, token, 'delete_arc', {
        idempotency_key: `${stamp}:delete_arc`,
        arc_id: created.arcId,
      }).then(() => console.log('delete_arc ok'));
    }
  }

  console.log(`all-tools e2e ok: ${ALL_TOOLS.length}/${ALL_TOOLS.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
