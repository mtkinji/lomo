import type { Activity } from '../../domain/types';
import {
  parseGoalTodoTableText,
  planGoalTodoTableImport,
  serializeGoalTodoTable,
} from './goalTodoTable';

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'activity-1',
    goalId: 'goal-1',
    title: 'Naomi Peak',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('goalTodoTable', () => {
  const source =
    'County   High point   Elevation\n' +
    'Beaver   Delano Peak   12,169 ft\n' +
    'Cache   Naomi Peak   9,984 ft';

  it('parses manually spaced rows and infers High point as the To-do title', () => {
    const result = parseGoalTodoTableText(source, '2026-08-02T20:00:00.000Z');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.table.columns.map((column) => column.label)).toEqual([
      'County',
      'High point',
      'Elevation',
    ]);
    expect(result.table.titleColumnId).toBe('high-point');
    expect(result.rows).toEqual([
      {
        title: 'Delano Peak',
        values: { county: 'Beaver', elevation: '12,169 ft' },
      },
      {
        title: 'Naomi Peak',
        values: { county: 'Cache', elevation: '9,984 ft' },
      },
    ]);
  });

  it('supports tab separators, ignores blank lines, and falls back to the first column as title', () => {
    const result = parseGoalTodoTableText('\nBook\tAuthor\nDune\tFrank Herbert\n', '2026-08-02T20:00:00.000Z');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.table.titleColumnId).toBe('book');
    expect(result.rows[0]).toEqual({ title: 'Dune', values: { author: 'Frank Herbert' } });
  });

  it.each([
    ['', 'Paste a header and at least one To-do row.'],
    ['County  High point', 'Add at least one To-do beneath the header.'],
    ['A  B  C  D\n1  2  3  4', 'To-do tables can have up to 3 columns.'],
    ['County  High point\nBeaver', 'Row 2 needs a value in High point.'],
  ])('rejects malformed source %#', (text, error) => {
    expect(parseGoalTodoTableText(text, '2026-08-02T20:00:00.000Z')).toEqual({ ok: false, error });
  });

  it('reconciles an existing completed To-do by title instead of creating a duplicate', () => {
    const existing = activity({
      id: 'naomi',
      status: 'done',
      completedAt: '2026-07-15T12:00:00.000Z',
    });
    const result = planGoalTodoTableImport({
      source,
      activities: [existing],
      nowIso: '2026-08-02T20:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.existingUpdates).toEqual([
      {
        activityId: 'naomi',
        values: { county: 'Cache', elevation: '9,984 ft' },
      },
    ]);
    expect(result.newRows).toEqual([
      { title: 'Delano Peak', values: { county: 'Beaver', elevation: '12,169 ft' } },
    ]);
  });

  it('serializes active and completed To-dos together in the configured column order', () => {
    const parsed = parseGoalTodoTableText(source, '2026-08-02T20:00:00.000Z');
    if (!parsed.ok) throw new Error(parsed.error);
    const activities = [
      activity({
        id: 'naomi',
        status: 'done',
        todoTableValues: { county: 'Cache', elevation: '9,984 ft' },
      }),
      activity({
        id: 'delano',
        title: 'Delano Peak',
        todoTableValues: { county: 'Beaver', elevation: '12,169 ft' },
      }),
    ];

    expect(serializeGoalTodoTable(parsed.table, activities)).toBe(
      'County\tHigh point\tElevation\nCache\tNaomi Peak\t9,984 ft\nBeaver\tDelano Peak\t12,169 ft',
    );
  });
});
