import {
  buildGoalCheckinDelivery,
  type SharedDeliveryInsert,
} from '../_shared/sharedHomeDelivery.ts';

export type GoalCheckinSource = {
  id: string;
  goalId: string;
  userId: string;
  preset: string | null;
  text: string | null;
};

export type GoalCheckinPublisherRepository = {
  getCheckin: (checkinId: string) => Promise<GoalCheckinSource | null>;
  isActiveGoalMember: (goalId: string, userId: string) => Promise<boolean>;
  listActiveGoalMemberIds: (goalId: string) => Promise<string[]>;
  isBlockedRelationship: (actorUserId: string, recipientUserId: string) => Promise<boolean>;
  getActorDisplayName: (userId: string) => Promise<string | null>;
  getGoalTitle: (goalId: string) => Promise<string | null>;
  insert: (row: SharedDeliveryInsert) => Promise<{ id: string; created: boolean }>;
  push: (recipientUserId: string, deliveryId: string) => Promise<unknown>;
};

export class PublishGoalCheckinError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PublishGoalCheckinError';
  }
}

export async function publishGoalCheckin(
  input: { callerUserId: string; checkinId: string },
  repository: GoalCheckinPublisherRepository,
  recipientEnabled: (recipientUserId: string) => boolean,
): Promise<{ eligibleRecipients: number; enabledRecipients: number; created: number }> {
  const checkin = await repository.getCheckin(input.checkinId);
  if (!checkin) throw new PublishGoalCheckinError('checkin_not_found');
  if (checkin.userId !== input.callerUserId) {
    throw new PublishGoalCheckinError('checkin_author_required');
  }
  if (!await repository.isActiveGoalMember(checkin.goalId, input.callerUserId)) {
    throw new PublishGoalCheckinError('active_goal_membership_required');
  }

  const memberIds = await repository.listActiveGoalMemberIds(checkin.goalId);
  const eligibleRecipients = Array.from(new Set(
    memberIds.map((value) => value.trim()).filter((value) => value && value !== input.callerUserId),
  ));
  const allowlistedRecipients = eligibleRecipients.filter(recipientEnabled);
  const blockedChecks = await Promise.all(
    allowlistedRecipients.map(async (recipientUserId) => ({
      recipientUserId,
      blocked: await repository.isBlockedRelationship(input.callerUserId, recipientUserId),
    })),
  );
  const enabledRecipients = blockedChecks.filter((value) => !value.blocked).map((value) => value.recipientUserId);
  const [actorDisplayName, goalTitle] = await Promise.all([
    repository.getActorDisplayName(input.callerUserId),
    repository.getGoalTitle(checkin.goalId),
  ]);

  let created = 0;
  for (const recipientUserId of enabledRecipients) {
    const result = await repository.insert(buildGoalCheckinDelivery({
      checkinId: checkin.id,
      goalId: checkin.goalId,
      recipientUserId,
      actorUserId: input.callerUserId,
      actorDisplayName,
      goalTitle,
      preset: checkin.preset,
      text: checkin.text,
    }));
    if (result.created) {
      created += 1;
      await repository.push(recipientUserId, result.id).catch(() => undefined);
    }
  }

  return {
    eligibleRecipients: eligibleRecipients.length,
    enabledRecipients: enabledRecipients.length,
    created,
  };
}
