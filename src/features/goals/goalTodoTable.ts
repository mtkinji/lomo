import type { Activity, GoalTodoTable } from '../../domain/types';

export type GoalTodoTableRowDraft = {
  title: string;
  values: Record<string, string>;
};

type ParsedResult =
  | { ok: true; table: GoalTodoTable; rows: GoalTodoTableRowDraft[] }
  | { ok: false; error: string };

export type GoalTodoTableImportPlan = {
  table: GoalTodoTable;
  existingUpdates: Array<{ activityId: string; values: Record<string, string> }>;
  newRows: GoalTodoTableRowDraft[];
};

type ImportPlanResult =
  | {
      ok: true;
      table: GoalTodoTableImportPlan['table'];
      existingUpdates: GoalTodoTableImportPlan['existingUpdates'];
      newRows: GoalTodoTableImportPlan['newRows'];
    }
  | { ok: false; error: string };

const TITLE_HEADER_CANDIDATES = [
  'high point',
  'summit',
  'peak',
  'to do',
  'todo',
  'task',
  'item',
  'title',
  'name',
];

function splitLine(line: string): string[] {
  return line
    .trim()
    .split(/\t+| {2,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function slugify(label: string, index: number, used: Set<string>): string {
  const base = label
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `column-${index + 1}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function parseGoalTodoTableText(
  source: string,
  nowIso = new Date().toISOString(),
  existing?: GoalTodoTable,
): ParsedResult {
  const lines = source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(splitLine)
    .filter((cells) => cells.length > 0);
  if (lines.length === 0) {
    return { ok: false, error: 'Paste a header and at least one To-do row.' };
  }
  const headers = lines[0] ?? [];
  if (headers.length > 3) {
    return { ok: false, error: 'To-do tables can have up to 3 columns.' };
  }
  if (lines.length < 2) {
    return { ok: false, error: 'Add at least one To-do beneath the header.' };
  }

  const used = new Set<string>();
  const columns = headers.map((label, index) => ({ id: slugify(label, index, used), label }));
  const inferredTitleIndex = headers.findIndex((header) =>
    TITLE_HEADER_CANDIDATES.includes(header.trim().toLocaleLowerCase()),
  );
  const titleColumnIndex = inferredTitleIndex >= 0 ? inferredTitleIndex : 0;
  const titleColumn = columns[titleColumnIndex]!;

  const rows: GoalTodoTableRowDraft[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const cells = lines[index] ?? [];
    if (cells.length > columns.length) {
      return { ok: false, error: `Row ${index + 1} has more cells than the header.` };
    }
    const title = cells[titleColumnIndex]?.trim() ?? '';
    if (!title) {
      return { ok: false, error: `Row ${index + 1} needs a value in ${titleColumn.label}.` };
    }
    const values = Object.fromEntries(
      columns
        .map((column, cellIndex) => [column.id, cells[cellIndex]?.trim() ?? ''] as const)
        .filter(([columnId]) => columnId !== titleColumn.id),
    );
    rows.push({ title, values });
  }

  return {
    ok: true,
    table: {
      columns,
      titleColumnId: titleColumn.id,
      createdAt: existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
    },
    rows,
  };
}

export function planGoalTodoTableImport(args: {
  source: string;
  activities: Activity[];
  existingTable?: GoalTodoTable;
  nowIso?: string;
}): ImportPlanResult {
  const parsed = parseGoalTodoTableText(args.source, args.nowIso, args.existingTable);
  if (!parsed.ok) return parsed;

  const availableByTitle = new Map<string, Activity[]>();
  for (const activity of args.activities) {
    const key = normalizeTitle(activity.title);
    availableByTitle.set(key, [...(availableByTitle.get(key) ?? []), activity]);
  }

  const existingUpdates: Array<{ activityId: string; values: Record<string, string> }> = [];
  const newRows: GoalTodoTableRowDraft[] = [];
  for (const row of parsed.rows) {
    const existing = availableByTitle.get(normalizeTitle(row.title))?.shift();
    if (existing) existingUpdates.push({ activityId: existing.id, values: row.values });
    else newRows.push(row);
  }

  return { ok: true, table: parsed.table, existingUpdates, newRows };
}

export function serializeGoalTodoTable(table: GoalTodoTable, activities: Activity[]): string {
  const header = table.columns.map((column) => column.label).join('\t');
  const rows = activities.map((activity) =>
    table.columns
      .map((column) =>
        column.id === table.titleColumnId
          ? activity.title
          : activity.todoTableValues?.[column.id] ?? '',
      )
      .join('\t'),
  );
  return [header, ...rows].join('\n');
}
