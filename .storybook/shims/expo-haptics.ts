export const ImpactFeedbackStyle = {
  Light: 0,
  Medium: 1,
  Heavy: 2,
};

export const NotificationFeedbackType = {
  Success: 0,
  Warning: 1,
  Error: 2,
};

export async function selectionAsync() {
  return undefined;
}

export async function impactAsync() {
  return undefined;
}

export async function notificationAsync() {
  return undefined;
}

export default {
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  selectionAsync,
};
