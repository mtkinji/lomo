import fs from 'node:fs';
import path from 'node:path';

const CLIENT_ACTION_SOURCES = [
  'src/features/unifiedChat/chapterAndNotificationToolProvider.ts',
  'src/features/unifiedChat/choreToolProvider.ts',
  'src/features/unifiedChat/deviceToolProvider.ts',
  'src/features/unifiedChat/groceryControlToolProvider.ts',
  'src/features/unifiedChat/moneyToolProvider.ts',
  'src/features/unifiedChat/unifiedChatToolProvider.ts',
  'supabase/functions/_shared/serverAgentTools.ts',
  'supabase/functions/_shared/serverChoreTools.ts',
  'supabase/functions/_shared/serverDeviceHandoffs.ts',
  'supabase/functions/_shared/serverFoodTools.ts',
  'supabase/functions/_shared/serverGroceryTools.ts',
  'supabase/functions/_shared/serverHouseholdTools.ts',
  'supabase/functions/_shared/serverMoneyTools.ts',
  'supabase/functions/_shared/serverPlanAvailabilityTools.ts',
  'supabase/functions/_shared/serverPlanCalendarTools.ts',
  'supabase/functions/_shared/serverScreenTimeTools.ts',
] as const;

const INTERNAL_COPY = [
  /\bnative(?:ly)?\b/i,
  /\bauthoritative\b/i,
  /\bbounded\b/i,
  /\bselected (?:Kwilt )?device\b/i,
  /\bprovider-owned\b/i,
  /\bversion-bound\b/i,
  /\breviewed state\b/i,
  /\bunderlying action\b/i,
] as const;

function consequenceCopy(source: string): string[] {
  const lines = source.split('\n');
  return lines.flatMap((line, index) => {
    if (!line.includes('consequenceSummary:')) return [];
    const block = lines.slice(index, index + 5).join('\n');
    return [...block.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)].map((match) => match[2]);
  });
}

test('client action cards keep implementation language out of user-facing summaries', () => {
  const violations = CLIENT_ACTION_SOURCES.flatMap((relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
    return consequenceCopy(source).flatMap((copy) => INTERNAL_COPY
      .filter((pattern) => pattern.test(copy))
      .map((pattern) => `${relativePath}: ${String(pattern)} matched “${copy}”`));
  });

  expect(violations).toEqual([]);
});
