import { FocusAreaId } from './types';

export type FocusAreaOption = {
  id: FocusAreaId;
  label: string;
  description?: string;
};

export const FOCUS_AREA_OPTIONS: FocusAreaOption[] = [
  {
    id: 'health_energy',
    label: 'Health & energy',
    description: 'Feeling steady in your body, rhythms, and rest.',
  },
  {
    id: 'work_career',
    label: 'Work & career',
    description: 'Progress in your craft, leadership, or vocation.',
  },
  {
    id: 'learning_skills',
    label: 'Learning & skills',
    description: 'Growing mastery, curiosity, and depth.',
  },
  {
    id: 'relationships_family',
    label: 'Relationships & family',
    description: 'Showing up for the people who matter most.',
  },
  {
    id: 'creativity_hobbies',
    label: 'Creativity & hobbies',
    description: 'Making time for the playful, expressive parts of life.',
  },
  {
    id: 'organizing_life',
    label: 'Organizing my life',
    description: 'Systems, habits, and clarity for everyday life.',
  },
];

export function getFocusAreaLabel(id: FocusAreaId): string {
  const match = FOCUS_AREA_OPTIONS.find((option) => option.id === id);
  return match?.label ?? id;
}


