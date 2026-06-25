import type { ActivityArea } from '../../domain/types';
import type { IconName } from '../../ui/Icon';

const DEFAULT_AREA_ICONS: Record<string, IconName> = {
  'area-work': 'briefcase',
  'area-personal': 'identity',
  'area-family': 'users',
  'area-home': 'home',
  'area-health': 'heart',
};

const LABEL_AREA_ICONS: Array<{ pattern: RegExp; icon: IconName }> = [
  { pattern: /\b(work|job|career|office|client|business)\b/i, icon: 'briefcase' },
  { pattern: /\b(personal|self|life)\b/i, icon: 'identity' },
  { pattern: /\b(family|kids|children|parent|parents|household)\b/i, icon: 'users' },
  { pattern: /\b(home|house|chores|errands)\b/i, icon: 'home' },
  { pattern: /\b(health|fitness|doctor|medical|wellness)\b/i, icon: 'heart' },
];

export function getActivityAreaIcon(area: Pick<ActivityArea, 'id' | 'label'> | null | undefined): IconName {
  if (!area) return 'layers';
  const defaultIcon = DEFAULT_AREA_ICONS[area.id];
  if (defaultIcon) return defaultIcon;
  const label = area.label.trim();
  return LABEL_AREA_ICONS.find((candidate) => candidate.pattern.test(label))?.icon ?? 'layers';
}

export function getActivityAreaIconById(
  areas: Array<Pick<ActivityArea, 'id' | 'label'>>,
  areaId: string | null | undefined,
): IconName {
  if (!areaId || areaId === '__none__') return 'inbox';
  return getActivityAreaIcon(areas.find((area) => area.id === areaId));
}
