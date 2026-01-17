import type {
  ActivityView,
  ActivityViewLayout,
  FilterGroup,
  KanbanGroupBy,
  SortCondition,
} from '../../domain/types';
import type { IconName } from '../../ui/Icon';

/**
 * ViewTemplate defines a pre-configured activity view that users can create
 * with a single tap. Each template includes meaningful filters, sorts, and
 * layout configurations so new views are immediately useful.
 */
export type ViewTemplate = {
  /** Unique identifier for this template */
  id: string;
  /** Display name shown in the UI */
  label: string;
  /** Short description of what this view shows */
  description: string;
  /** Icon name from the Icon component */
  icon: IconName;
  /** Layout type */
  layout: ActivityViewLayout;
  /** For kanban layouts, how activities are grouped */
  kanbanGroupBy?: KanbanGroupBy;
  /** Pre-configured filters */
  filters?: FilterGroup[];
  /** Pre-configured sorts */
  sorts?: SortCondition[];
  /** Whether to show completed activities */
  showCompleted?: boolean;
  /** Category for grouping templates in the UI */
  category: 'list' | 'board';
};

/**
 * Helper to generate a unique view ID
 */
export function generateViewId(): string {
  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Convert a template into a full ActivityView ready for creation
 */
export function templateToView(
  template: ViewTemplate,
  customName?: string,
): ActivityView {
  return {
    id: generateViewId(),
    name: customName ?? template.label,
    layout: template.layout,
    kanbanGroupBy: template.kanbanGroupBy,
    // Legacy fields (keep for backward compatibility)
    filterMode: 'all',
    sortMode: 'manual',
    // New structured filters/sorts
    filters: template.filters,
    sorts: template.sorts,
    showCompleted: template.showCompleted ?? true,
    isSystem: false,
  };
}

/**
 * List view templates - vertical scrolling lists with various filters
 */
export const LIST_TEMPLATES: ViewTemplate[] = [
  {
    id: 'template-list-all',
    label: 'All Activities',
    description: 'Everything in one place',
    icon: 'viewList',
    layout: 'list',
    category: 'list',
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
  },
  {
    id: 'template-list-today',
    label: 'Today',
    description: 'Due today or earlier',
    icon: 'today',
    layout: 'list',
    category: 'list',
    filters: [
      {
        logic: 'and',
        conditions: [
          {
            id: 'due-today',
            field: 'scheduledDate',
            operator: 'lte',
            value: 'today', // Runtime should interpret this as today's date
          },
          {
            id: 'not-completed',
            field: 'status',
            operator: 'neq',
            value: 'completed',
          },
        ],
      },
    ],
    sorts: [{ field: 'priority', direction: 'desc' }],
    showCompleted: false,
  },
  {
    id: 'template-list-priorities',
    label: 'Priorities',
    description: 'Starred activities only',
    icon: 'starFilled',
    layout: 'list',
    category: 'list',
    filters: [
      {
        logic: 'and',
        conditions: [
          {
            id: 'high-priority',
            field: 'priority',
            operator: 'eq',
            value: 1,
          },
        ],
      },
    ],
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
  },
  {
    id: 'template-list-upcoming',
    label: 'Upcoming',
    description: 'Due in the next 7 days',
    icon: 'today',
    layout: 'list',
    category: 'list',
    filters: [
      {
        logic: 'and',
        conditions: [
          {
            id: 'upcoming-7d',
            field: 'scheduledDate',
            operator: 'lte',
            value: '+7days', // Runtime should interpret this
          },
        ],
      },
    ],
    sorts: [{ field: 'scheduledDate', direction: 'asc' }],
  },
];

/**
 * Board view templates - kanban-style boards with different groupings
 */
export const BOARD_TEMPLATES: ViewTemplate[] = [
  {
    id: 'template-board-status',
    label: 'By Status',
    description: 'Columns for each status',
    icon: 'viewKanban',
    layout: 'kanban',
    kanbanGroupBy: 'status',
    category: 'board',
  },
  {
    id: 'template-board-goal',
    label: 'By Goal',
    description: 'Grouped by linked goal',
    icon: 'target',
    layout: 'kanban',
    kanbanGroupBy: 'goal',
    category: 'board',
  },
  {
    id: 'template-board-priority',
    label: 'By Priority',
    description: 'High to low priority',
    icon: 'starFilled',
    layout: 'kanban',
    kanbanGroupBy: 'priority',
    category: 'board',
  },
  {
    id: 'template-board-phase',
    label: 'By Phase',
    description: 'Planning workflow stages',
    icon: 'layers',
    layout: 'kanban',
    kanbanGroupBy: 'phase',
    category: 'board',
  },
];

/**
 * Blank templates for power users who want to configure from scratch
 */
export const BLANK_TEMPLATES: ViewTemplate[] = [
  {
    id: 'template-blank-list',
    label: 'Blank List',
    description: 'Start fresh',
    icon: 'viewList',
    layout: 'list',
    category: 'list',
  },
  {
    id: 'template-blank-board',
    label: 'Blank Board',
    description: 'Start fresh',
    icon: 'viewKanban',
    layout: 'kanban',
    kanbanGroupBy: 'status',
    category: 'board',
  },
];

/**
 * All templates combined
 */
export const ALL_TEMPLATES: ViewTemplate[] = [
  ...LIST_TEMPLATES,
  ...BOARD_TEMPLATES,
  ...BLANK_TEMPLATES,
];

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): ViewTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

