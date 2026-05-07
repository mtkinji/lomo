export type JsonObject = Record<string, unknown>;

export type DomainSyncRow<TData extends JsonObject> = {
  id: string;
  user_id: string;
  data: TData;
  created_at: string;
  updated_at: string;
};

export type ObjectStatus = 'active' | 'paused' | 'archived';
export type ActivityStatus = 'planned' | 'in_progress' | 'completed' | 'blocked';
export type ActivityType = 'task' | 'habit' | 'project' | 'checklist' | string;

export type Arc = JsonObject & {
  id: string;
  name: string;
  status?: ObjectStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type Goal = JsonObject & {
  id: string;
  title?: string;
  name?: string;
  arcId?: string | null;
  status?: ObjectStatus | string;
  createdAt?: string;
  updatedAt?: string;
};

export type Activity = JsonObject & {
  id: string;
  title: string;
  goalId?: string | null;
  type?: ActivityType;
  status?: ActivityStatus | string;
  tags?: string[];
  scheduledDate?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Chapter = JsonObject & {
  id: string;
  title?: string;
  templateId?: string;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
};

export type CheckIn = JsonObject & {
  id: string;
  goalId: string;
  userId?: string;
  preset?: 'made_progress' | 'struggled_today' | 'need_encouragement' | 'just_checking_in' | null;
  text?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ActivitySummary = Pick<
  Activity,
  | 'id'
  | 'title'
  | 'goalId'
  | 'type'
  | 'status'
  | 'scheduledDate'
  | 'scheduledAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type GoalSummary = Pick<
  Goal,
  'id' | 'title' | 'name' | 'arcId' | 'status' | 'createdAt' | 'updatedAt'
>;

export type ArcSummary = Pick<
  Arc,
  'id' | 'name' | 'status' | 'createdAt' | 'updatedAt'
>;

export function unwrapDomainData<TData extends JsonObject>(
  row: DomainSyncRow<TData>,
): TData & { id: string } {
  return { id: row.id, ...row.data };
}
