type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type DomainTable = 'kwilt_arcs' | 'kwilt_goals' | 'kwilt_activities';
type ObjectType = 'arc' | 'goal' | 'activity' | 'goal_checkin' | 'chapter_note';

export type ExternalWriteResult = {
  object_type: ObjectType;
  object_id: string;
  result_summary: string;
  structured: JsonObject;
};

const DEFAULT_FORCE_LEVELS = {
  'force-activity': 0,
  'force-connection': 0,
  'force-mastery': 0,
  'force-spirituality': 0,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value.trim() || null : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return Array.from(new Set(value.map(asString).filter((item): item is string => !!item)));
}

function asPriority(value: unknown): 1 | 2 | 3 | undefined {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return numberValue === 1 || numberValue === 2 || numberValue === 3 ? numberValue : undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function pickStatus(value: unknown, allowed: readonly string[], fallback: string): string {
  const status = asString(value);
  return status && allowed.includes(status) ? status : fallback;
}

function mergeDefined(base: Record<string, JsonValue>, patch: Record<string, JsonValue | undefined>): JsonObject {
  const next: Record<string, JsonValue> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

function dataFromRow(row: unknown): Record<string, JsonValue> {
  return asRecord(asRecord(row).data) as Record<string, JsonValue>;
}

async function getDomainRow(admin: any, table: DomainTable, userId: string, id: string): Promise<any | null> {
  const { data, error } = await admin
    .from(table)
    .select('id,data,is_deleted,updated_at')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`${table}_read_failed`);
  if (!data || (data as any).is_deleted) return null;
  return data as any;
}

async function upsertDomainObject(admin: any, table: DomainTable, userId: string, id: string, data: JsonObject) {
  const timestamp = asString(data.updatedAt) ?? nowIso();
  const { error } = await admin.from(table).upsert(
    {
      user_id: userId,
      id,
      data,
      created_at: asString(data.createdAt) ?? timestamp,
      updated_at: timestamp,
      is_deleted: false,
      deleted_at: null,
    },
    { onConflict: 'user_id,id' },
  );
  if (error) throw new Error(`${table}_upsert_failed`);
}

async function recordExternalShowUpEvent(admin: any, userId: string, activityId: string): Promise<void> {
  const occurredAt = nowIso();
  const localDate = occurredAt.slice(0, 10);
  try {
    await admin.from('kwilt_streak_events').upsert(
      {
        user_id: userId,
        client_event_id: `${userId}:external_mcp_show_up:${activityId}:${localDate}`,
        event_type: 'show_up',
        local_date: localDate,
        payload: { source: 'external_mcp', activityId },
        occurred_at: occurredAt,
      },
      { onConflict: 'user_id,client_event_id', ignoreDuplicates: true },
    );
  } catch {
    // Streak attribution should never block the user's write.
  }
}

export async function softDeleteObjectForUser(admin: any, userId: string, table: DomainTable, id: string): Promise<void> {
  const existing = await getDomainRow(admin, table, userId, id);
  if (!existing) throw new Error('object_not_found');
  const timestamp = nowIso();
  const { error } = await admin.from(table).upsert(
    {
      user_id: userId,
      id,
      data: {},
      updated_at: timestamp,
      is_deleted: true,
      deleted_at: timestamp,
    },
    { onConflict: 'user_id,id' },
  );
  if (error) throw new Error(`${table}_delete_failed`);
}

export async function createArcForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const name = asString(args.name);
  if (!name) throw new Error('missing_name');
  const timestamp = nowIso();
  const id = createId('arc');
  const identityStatement = asString(args.identity_statement);
  const data = mergeDefined(
    {
      id,
      name,
      status: pickStatus(args.status, ['active', 'paused', 'archived'], 'active'),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      narrative: asNullableString(args.narrative),
      identity: identityStatement ? { statement: identityStatement, centralInsight: identityStatement } : undefined,
    },
  );
  await upsertDomainObject(admin, 'kwilt_arcs', userId, id, data);
  return { object_type: 'arc', object_id: id, result_summary: `Created Arc "${name}".`, structured: { arc_id: id, name } };
}

export async function updateArcForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const id = asString(args.arc_id);
  if (!id) throw new Error('missing_arc_id');
  const existing = await getDomainRow(admin, 'kwilt_arcs', userId, id);
  if (!existing) throw new Error('arc_not_found');
  const current = dataFromRow(existing);
  const identityStatement = asNullableString(args.identity_statement);
  const currentIdentity = asRecord(current.identity);
  const data = mergeDefined(current, {
    name: asString(args.name) ?? undefined,
    narrative: asNullableString(args.narrative),
    status: asString(args.status) ? pickStatus(args.status, ['active', 'paused', 'archived'], asString(current.status) ?? 'active') : undefined,
    identity: identityStatement === undefined
      ? undefined
      : identityStatement
        ? ({ ...currentIdentity, statement: identityStatement, centralInsight: asString(currentIdentity.centralInsight) ?? identityStatement } as JsonObject)
        : null,
    updatedAt: nowIso(),
  });
  await upsertDomainObject(admin, 'kwilt_arcs', userId, id, data);
  return { object_type: 'arc', object_id: id, result_summary: `Updated Arc "${asString(data.name) ?? id}".`, structured: { arc_id: id } };
}

export async function deleteArcForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const id = asString(asRecord(raw).arc_id);
  if (!id) throw new Error('missing_arc_id');
  await softDeleteObjectForUser(admin, userId, 'kwilt_arcs', id);
  return { object_type: 'arc', object_id: id, result_summary: 'Deleted Arc.', structured: { arc_id: id, deleted: true } };
}

export async function createGoalForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const title = asString(args.title);
  if (!title) throw new Error('missing_title');
  const arcId = asNullableString(args.arc_id);
  if (arcId) {
    const arc = await getDomainRow(admin, 'kwilt_arcs', userId, arcId);
    if (!arc) throw new Error('arc_not_found');
  }
  const timestamp = nowIso();
  const id = createId('goal');
  const data = mergeDefined(
    {
      id,
      arcId: arcId ?? null,
      title,
      status: pickStatus(args.status, ['planned', 'in_progress', 'completed', 'archived'], 'planned'),
      forceIntent: DEFAULT_FORCE_LEVELS,
      metrics: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      description: asNullableString(args.description),
      priority: asPriority(args.priority),
      targetDate: asNullableString(args.target_date),
    },
  );
  await upsertDomainObject(admin, 'kwilt_goals', userId, id, data);
  return { object_type: 'goal', object_id: id, result_summary: `Created Goal "${title}".`, structured: { goal_id: id, title } };
}

export async function updateGoalForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const id = asString(args.goal_id);
  if (!id) throw new Error('missing_goal_id');
  const existing = await getDomainRow(admin, 'kwilt_goals', userId, id);
  if (!existing) throw new Error('goal_not_found');
  const current = dataFromRow(existing);
  const arcId = asNullableString(args.arc_id);
  if (arcId) {
    const arc = await getDomainRow(admin, 'kwilt_arcs', userId, arcId);
    if (!arc) throw new Error('arc_not_found');
  }
  const data = mergeDefined(current, {
    title: asString(args.title) ?? undefined,
    description: asNullableString(args.description),
    arcId,
    status: asString(args.status) ? pickStatus(args.status, ['planned', 'in_progress', 'completed', 'archived'], asString(current.status) ?? 'planned') : undefined,
    priority: asPriority(args.priority),
    targetDate: asNullableString(args.target_date),
    updatedAt: nowIso(),
  });
  await upsertDomainObject(admin, 'kwilt_goals', userId, id, data);
  return { object_type: 'goal', object_id: id, result_summary: `Updated Goal "${asString(data.title) ?? id}".`, structured: { goal_id: id } };
}

export async function deleteGoalForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const id = asString(asRecord(raw).goal_id);
  if (!id) throw new Error('missing_goal_id');
  await softDeleteObjectForUser(admin, userId, 'kwilt_goals', id);
  return { object_type: 'goal', object_id: id, result_summary: 'Deleted Goal.', structured: { goal_id: id, deleted: true } };
}

export async function createActivityForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const title = asString(args.title);
  if (!title) throw new Error('missing_title');
  const goalId = asNullableString(args.goal_id);
  if (goalId) {
    const goal = await getDomainRow(admin, 'kwilt_goals', userId, goalId);
    if (!goal) throw new Error('goal_not_found');
  }
  const timestamp = nowIso();
  const id = createId('activity');
  const status = pickStatus(args.status, ['planned', 'in_progress', 'done', 'skipped', 'cancelled'], 'planned');
  const data = mergeDefined(
    {
      id,
      goalId: goalId ?? null,
      title,
      type: asString(args.type) ?? 'task',
      tags: asStringArray(args.tags) ?? [],
      status,
      forceActual: DEFAULT_FORCE_LEVELS,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      notes: asNullableString(args.notes),
      priority: asPriority(args.priority),
      scheduledDate: asNullableString(args.scheduled_date),
      completedAt: status === 'done' ? timestamp : undefined,
    },
  );
  await upsertDomainObject(admin, 'kwilt_activities', userId, id, data);
  await recordExternalShowUpEvent(admin, userId, id);
  return { object_type: 'activity', object_id: id, result_summary: `Created To-do "${title}".`, structured: { activity_id: id, title } };
}

export async function updateActivityForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const id = asString(args.activity_id);
  if (!id) throw new Error('missing_activity_id');
  const existing = await getDomainRow(admin, 'kwilt_activities', userId, id);
  if (!existing) throw new Error('activity_not_found');
  const current = dataFromRow(existing);
  const goalId = asNullableString(args.goal_id);
  if (goalId) {
    const goal = await getDomainRow(admin, 'kwilt_goals', userId, goalId);
    if (!goal) throw new Error('goal_not_found');
  }
  const status = asString(args.status)
    ? pickStatus(args.status, ['planned', 'in_progress', 'done', 'skipped', 'cancelled'], asString(current.status) ?? 'planned')
    : undefined;
  const timestamp = nowIso();
  const data = mergeDefined(current, {
    goalId,
    title: asString(args.title) ?? undefined,
    notes: asNullableString(args.notes),
    type: asString(args.type) ?? undefined,
    status,
    tags: asStringArray(args.tags) as JsonValue | undefined,
    priority: asPriority(args.priority),
    scheduledDate: asNullableString(args.scheduled_date),
    completedAt: status === 'done' ? (asString(args.completed_at) ?? timestamp) : status && status !== 'done' ? null : undefined,
    updatedAt: timestamp,
  });
  await upsertDomainObject(admin, 'kwilt_activities', userId, id, data);
  if (status === 'done') await recordExternalShowUpEvent(admin, userId, id);
  return { object_type: 'activity', object_id: id, result_summary: `Updated To-do "${asString(data.title) ?? id}".`, structured: { activity_id: id } };
}

export async function markActivityDoneForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const completedAt = asString(args.completed_at) ?? nowIso();
  return updateActivityForUser(admin, userId, { ...args, status: 'done', completed_at: completedAt });
}

export async function setFocusTodayForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const date = asString(args.date) ?? new Date().toISOString().slice(0, 10);
  return updateActivityForUser(admin, userId, { ...args, scheduled_date: date });
}

export async function deleteActivityForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const id = asString(asRecord(raw).activity_id);
  if (!id) throw new Error('missing_activity_id');
  await softDeleteObjectForUser(admin, userId, 'kwilt_activities', id);
  return { object_type: 'activity', object_id: id, result_summary: 'Deleted To-do.', structured: { activity_id: id, deleted: true } };
}

export async function addGoalCheckinForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const goalId = asString(args.goal_id);
  if (!goalId) throw new Error('missing_goal_id');
  const goal = await getDomainRow(admin, 'kwilt_goals', userId, goalId);
  if (!goal) throw new Error('goal_not_found');
  const preset = pickStatus(args.preset, ['made_progress', 'struggled_today', 'need_encouragement', 'just_checking_in'], '');
  const { data, error } = await admin
    .from('goal_checkins')
    .insert({
      goal_id: goalId,
      user_id: userId,
      preset: preset || null,
      text: asNullableString(args.text) ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error('goal_checkin_failed');
  const id = String((data as any).id);
  try {
    await admin.from('kwilt_feed_events').insert({
      entity_type: 'goal',
      entity_id: goalId,
      actor_id: userId,
      type: 'checkin_submitted',
      payload: { checkinId: id, preset: preset || null, hasText: Boolean(asString(args.text)) },
    });
  } catch {
    // Feed events are best-effort, matching the app service.
  }
  return { object_type: 'goal_checkin', object_id: id, result_summary: 'Added Goal check-in.', structured: { checkin_id: id, goal_id: goalId } };
}

export async function updateChapterUserNoteForUser(admin: any, userId: string, raw: unknown): Promise<ExternalWriteResult> {
  const args = asRecord(raw);
  const chapterId = asString(args.chapter_id);
  if (!chapterId) throw new Error('missing_chapter_id');
  const note = asString(args.note) ?? '';
  const { data, error } = await admin
    .from('kwilt_chapters')
    .update({
      user_note: note.trim() ? note.trim() : null,
      user_note_updated_at: note.trim() ? nowIso() : null,
      updated_at: nowIso(),
    })
    .eq('id', chapterId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error('chapter_note_update_failed');
  if (!data) throw new Error('chapter_not_found');
  return { object_type: 'chapter_note', object_id: chapterId, result_summary: 'Updated Chapter note.', structured: { chapter_id: chapterId } };
}
