# Kwilt Money V1 Local Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first local Kwilt Money product loop: budget-first setup, runway home, budget rows, suggested transaction matches, correction learning, optional app-control summary, and budget review.

**Architecture:** Keep this as a local fixture-backed product slice before Plaid and FamilyControls are wired. Add domain types and pure functions first, then a repository facade, then screens/components that consume those interfaces. Native Plaid and FamilyControls integrations remain seams that can replace fixture data later.

**Tech Stack:** Expo Router, React Native, TypeScript, existing Kwilt local design tokens, `npm run lint` using `tsc --noEmit`.

---

## File structure

- Modify `src/domain/budget-meter.ts`: replace lane-only model with budget, period, transaction, assignment, meter, and runway domain helpers while keeping compatibility exports where useful.
- Modify `src/domain/app-gate.ts`: rename concepts around budgets while preserving review event behavior.
- Create `src/domain/budget-matching.ts`: pure matching/correction helpers for suggestions, confirmations, and similar transaction previews.
- Modify `src/platform/budget-repository.ts`: fixture-backed repository that exposes budgets, transactions, runway, suggestions, app control rules, and review events.
- Create `src/components/runway-chart.tsx`: simple Kwilt-native chart using React Native views, no chart dependency.
- Create `src/components/budget-row.tsx`: dense row inspired by Robinhood hierarchy, translated into Kwilt styling.
- Create `src/components/transaction-match-row.tsx`: transaction row with suggested/confirmed/unmatched budget pill.
- Modify `src/components/meter-card.tsx`: accept new budget shape or computed meter snapshot.
- Modify `app/(tabs)/index.tsx`: replace single meter card with runway header/chart and budget list.
- Create `app/(tabs)/transactions.tsx`: transaction projection list filtered by match state.
- Create `app/(tabs)/ask.tsx`: temporary mobile renderer shaped like the shared Giraffed agent workspace contracts.
- Create `src/agent-workspace/`: Kwilt Money adapter boundary for the future shared agent workspace package.
- Create `app/budgets/new.tsx`: budget-first setup screen.
- Create `app/budgets/[budgetId].tsx`: budget detail, suggested matches, correction entry points, app-control prompt.
- Create `app/transactions/[transactionId].tsx`: transaction match correction screen.
- Create `app/app-control/[budgetId].tsx`: simulated app-control rule summary with review and maxed-out modes.
- Modify `app/review.tsx`: load review state by budget/app target where possible, fallback to primary fixture.
- Modify `app/(tabs)/_layout.tsx`: use tabs `Budget`, `Transactions`, `Ask`, and `More`.
- Modify `src/shell/kwilt-tab-bar.tsx`: update tab labels/icons and route the floating action to `/ask` or keep it as the Ask entry.
- Update `docs/concepts/kwilt-budget-v1-concept.md` and `docs/concepts/shared-agent-workspace-capability.md` as decisions change.

## Task 1: Domain Model And Meter Helpers

**Files:**
- Modify: `src/domain/budget-meter.ts`

- [ ] **Step 1: Replace the domain file with budget-first types and helpers**

```ts
export type BudgetCadence = 'monthly';

export type BudgetGroup = {
  id: string;
  name: string;
};

export type Budget = {
  id: string;
  groupId?: string;
  name: string;
  createdAtIso: string;
};

export type BudgetPeriod = {
  id: string;
  budgetId: string;
  cadence: BudgetCadence;
  label: string;
  startDateIso: string;
  endDateIso: string;
  amountCents: number;
  elapsedPercent: number;
};

export type BudgetMeterSnapshot = {
  budgetId: string;
  periodId: string;
  percentUsed: number;
  percentUsedLabel: string;
  spentCents: number;
  spentLabel: string;
  remainingCents: number;
  remainingLabel: string;
  paceLabel: string;
  projectedOverageCents: number;
  status: 'steady' | 'watch' | 'hot';
};

export type BudgetLane = {
  id: string;
  name: string;
  periodLabel: string;
  budgetCents: number;
  spentCents: number;
  periodElapsedPercent: number;
};

export function getBudgetMeterSnapshot(params: {
  budget: Budget;
  period: BudgetPeriod;
  spentCents: number;
}): BudgetMeterSnapshot {
  const percentUsed = params.period.amountCents > 0 ? (params.spentCents / params.period.amountCents) * 100 : 0;
  const remainingCents = Math.max(0, params.period.amountCents - params.spentCents);
  const expectedSpendCents = params.period.amountCents * params.period.elapsedPercent;
  const projectedSpendCents =
    params.period.elapsedPercent > 0 ? params.spentCents / params.period.elapsedPercent : params.spentCents;
  const projectedOverageCents = Math.round(projectedSpendCents - params.period.amountCents);
  const paceDeltaCents = Math.round(params.spentCents - expectedSpendCents);
  const status = projectedOverageCents > 0 ? 'hot' : percentUsed > params.period.elapsedPercent * 100 + 10 ? 'watch' : 'steady';

  return {
    budgetId: params.budget.id,
    periodId: params.period.id,
    percentUsed,
    percentUsedLabel: `${Math.round(percentUsed)}%`,
    spentCents: params.spentCents,
    spentLabel: formatCurrency(params.spentCents),
    remainingCents,
    remainingLabel: formatCurrency(remainingCents),
    projectedOverageCents,
    paceLabel:
      projectedOverageCents > 0
        ? `${formatCurrency(Math.abs(paceDeltaCents))} ahead of pace for ${params.period.label}`
        : `${formatCurrency(Math.abs(paceDeltaCents))} under pace for ${params.period.label}`,
    status,
  };
}

export function getBudgetLaneMeter(lane: BudgetLane): BudgetMeterSnapshot {
  return getBudgetMeterSnapshot({
    budget: {
      id: lane.id,
      name: lane.name,
      createdAtIso: new Date(0).toISOString(),
    },
    period: {
      id: `${lane.id}-period`,
      budgetId: lane.id,
      cadence: 'monthly',
      label: lane.periodLabel,
      startDateIso: new Date(0).toISOString(),
      endDateIso: new Date(0).toISOString(),
      amountCents: lane.budgetCents,
      elapsedPercent: lane.periodElapsedPercent,
    },
    spentCents: lane.spentCents,
  });
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: existing app should still typecheck. If callers fail because they expect `BudgetMeter`, update imports to `BudgetMeterSnapshot`.

- [ ] **Step 3: Commit**

```bash
git add src/domain/budget-meter.ts
git commit -m "feat: add budget-first meter domain"
```

## Task 2: Transaction Matching Domain

**Files:**
- Create: `src/domain/budget-matching.ts`

- [ ] **Step 1: Add transaction and matching helpers**

```ts
export type TransactionKind = 'income' | 'spend' | 'transfer' | 'payment';

export type NormalizedTransaction = {
  id: string;
  merchantName: string;
  originalName: string;
  amountCents: number;
  postedAtIso: string;
  accountLabel: string;
  kind: TransactionKind;
  providerCategory?: string;
};

export type BudgetMatchState = 'unmatched' | 'suggested' | 'confirmed' | 'ignored' | 'excluded' | 'split';

export type AssignmentSuggestion = {
  id: string;
  transactionId: string;
  budgetId: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

export type TransactionAssignment = {
  id: string;
  transactionId: string;
  budgetId: string;
  state: Exclude<BudgetMatchState, 'unmatched'>;
  assignedAtIso: string;
  source: 'suggestion' | 'user' | 'rule';
};

export type MatchingRule = {
  id: string;
  budgetId: string;
  type: 'merchant_to_budget' | 'merchant_account_to_budget' | 'category_to_budget' | 'never_for_budget' | 'exclude_from_budgets';
  merchantName?: string;
  accountLabel?: string;
  providerCategory?: string;
  createdAtIso: string;
};

export function getTransactionMatchState(params: {
  transactionId: string;
  assignments: TransactionAssignment[];
  suggestions: AssignmentSuggestion[];
}): BudgetMatchState {
  const assignment = params.assignments.find((item) => item.transactionId === params.transactionId);
  if (assignment) return assignment.state;
  const suggestion = params.suggestions.find((item) => item.transactionId === params.transactionId);
  return suggestion ? 'suggested' : 'unmatched';
}

export function findSimilarTransactions(params: {
  transaction: NormalizedTransaction;
  transactions: NormalizedTransaction[];
}): NormalizedTransaction[] {
  return params.transactions.filter((candidate) => {
    if (candidate.id === params.transaction.id) return false;
    if (candidate.kind !== params.transaction.kind) return false;
    const sameMerchant = normalizeName(candidate.merchantName) === normalizeName(params.transaction.merchantName);
    const sameAccountAndCategory =
      candidate.accountLabel === params.transaction.accountLabel &&
      candidate.providerCategory === params.transaction.providerCategory;
    return sameMerchant || sameAccountAndCategory;
  });
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/domain/budget-matching.ts
git commit -m "feat: add transaction matching domain"
```

## Task 3: Fixture Repository For V1 Product Loop

**Files:**
- Modify: `src/platform/budget-repository.ts`

- [ ] **Step 1: Replace repository with fixture data and query/mutation helpers**

```ts
import { type AppGateTarget, type BudgetReviewEvent, type BudgetReviewOutcome } from '@/domain/app-gate';
import {
  type Budget,
  type BudgetGroup,
  type BudgetLane,
  type BudgetMeterSnapshot,
  type BudgetPeriod,
  getBudgetMeterSnapshot,
} from '@/domain/budget-meter';
import {
  type AssignmentSuggestion,
  type MatchingRule,
  type NormalizedTransaction,
  type TransactionAssignment,
  findSimilarTransactions,
} from '@/domain/budget-matching';

export type HouseholdRunway = {
  monthLabel: string;
  incomeCents: number;
  spendCents: number;
  remainingCents: number;
  paceLabel: string;
  syncLabel: string;
  points: Array<{ day: number; spendCents: number; expectedCents: number }>;
};

export type BudgetRowModel = {
  budget: Budget;
  period: BudgetPeriod;
  meter: BudgetMeterSnapshot;
  hasAppControl: boolean;
  matchSummary: string;
  trend: number[];
};

const nowIso = new Date().toISOString();

const groups: BudgetGroup[] = [{ id: 'household', name: 'Household' }];

const budgets: Budget[] = [
  { id: 'shopping', groupId: 'household', name: 'Shopping', createdAtIso: nowIso },
  { id: 'takeout', groupId: 'household', name: 'Takeout', createdAtIso: nowIso },
  { id: 'groceries', groupId: 'household', name: 'Groceries', createdAtIso: nowIso },
];

const periods: BudgetPeriod[] = [
  {
    id: 'shopping-june',
    budgetId: 'shopping',
    cadence: 'monthly',
    label: 'June',
    startDateIso: '2026-06-01',
    endDateIso: '2026-06-30',
    amountCents: 10000,
    elapsedPercent: 0.8,
  },
  {
    id: 'takeout-june',
    budgetId: 'takeout',
    cadence: 'monthly',
    label: 'June',
    startDateIso: '2026-06-01',
    endDateIso: '2026-06-30',
    amountCents: 22000,
    elapsedPercent: 0.8,
  },
  {
    id: 'groceries-june',
    budgetId: 'groceries',
    cadence: 'monthly',
    label: 'June',
    startDateIso: '2026-06-01',
    endDateIso: '2026-06-30',
    amountCents: 80000,
    elapsedPercent: 0.8,
  },
];

const transactions: NormalizedTransaction[] = [
  {
    id: 'tx-amazon-1',
    merchantName: 'Amazon Marketplace',
    originalName: 'Amazon Mktpl*215d43ml3',
    amountCents: 2481,
    postedAtIso: '2026-06-22',
    accountLabel: 'Prime Visa',
    kind: 'spend',
    providerCategory: 'Shops',
  },
  {
    id: 'tx-target-1',
    merchantName: 'Target',
    originalName: 'Target T-1234',
    amountCents: 3372,
    postedAtIso: '2026-06-19',
    accountLabel: 'Prime Visa',
    kind: 'spend',
    providerCategory: 'Shops',
  },
  {
    id: 'tx-doordash-1',
    merchantName: 'DoorDash',
    originalName: 'DOORDASH DASHMART',
    amountCents: 2864,
    postedAtIso: '2026-06-18',
    accountLabel: 'Checking',
    kind: 'spend',
    providerCategory: 'Restaurants',
  },
];

let suggestions: AssignmentSuggestion[] = [
  {
    id: 'sugg-amazon-shopping',
    transactionId: 'tx-amazon-1',
    budgetId: 'shopping',
    confidence: 'high',
    reason: 'Amazon Marketplace usually belongs to Shopping.',
  },
  {
    id: 'sugg-target-shopping',
    transactionId: 'tx-target-1',
    budgetId: 'shopping',
    confidence: 'medium',
    reason: 'Target is a shop merchant and may belong to Shopping.',
  },
];

let assignments: TransactionAssignment[] = [
  {
    id: 'assign-doordash-takeout',
    transactionId: 'tx-doordash-1',
    budgetId: 'takeout',
    state: 'confirmed',
    assignedAtIso: nowIso,
    source: 'rule',
  },
];

let rules: MatchingRule[] = [];

const targets: AppGateTarget[] = [
  {
    id: 'amazon',
    label: 'Amazon',
    budgetId: 'shopping',
    webDomains: ['amazon.com'],
    unlockWindowMinutes: 15,
    controlMode: 'pause_when_maxed',
  },
];

const reviewEvents: BudgetReviewEvent[] = [];

export function getHouseholdRunway(): HouseholdRunway {
  return {
    monthLabel: 'June',
    incomeCents: 680000,
    spendCents: 538000,
    remainingCents: 142000,
    paceLabel: 'On pace through Jun 24',
    syncLabel: 'Synced today',
    points: [
      { day: 1, spendCents: 12000, expectedCents: 18000 },
      { day: 6, spendCents: 92000, expectedCents: 108000 },
      { day: 12, spendCents: 226000, expectedCents: 216000 },
      { day: 18, spendCents: 390000, expectedCents: 324000 },
      { day: 24, spendCents: 538000, expectedCents: 432000 },
    ],
  };
}

export function getBudgetRows(): BudgetRowModel[] {
  return budgets.map((budget) => {
    const period = requirePeriod(budget.id);
    const spentCents = getConfirmedSpendForBudget(budget.id);
    return {
      budget,
      period,
      meter: getBudgetMeterSnapshot({ budget, period, spentCents }),
      hasAppControl: targets.some((target) => target.budgetId === budget.id),
      matchSummary: getMatchSummary(budget.id),
      trend: getTrendForBudget(budget.id),
    };
  });
}

export function getBudgetDetail(budgetId: string) {
  const budget = requireBudget(budgetId);
  const period = requirePeriod(budgetId);
  return {
    budget,
    period,
    meter: getBudgetMeterSnapshot({ budget, period, spentCents: getConfirmedSpendForBudget(budgetId) }),
    transactions,
    suggestions: suggestions.filter((suggestion) => suggestion.budgetId === budgetId),
    assignments: assignments.filter((assignment) => assignment.budgetId === budgetId),
    target: targets.find((target) => target.budgetId === budgetId) ?? null,
  };
}

export function getTransactionDetail(transactionId: string) {
  const transaction = transactions.find((item) => item.id === transactionId);
  if (!transaction) throw new Error(`Unknown transaction: ${transactionId}`);
  return {
    transaction,
    budgets,
    suggestions: suggestions.filter((suggestion) => suggestion.transactionId === transactionId),
    assignments: assignments.filter((assignment) => assignment.transactionId === transactionId),
    similarTransactions: findSimilarTransactions({ transaction, transactions }),
  };
}

export function confirmTransactionBudgetMatch(params: {
  transactionId: string;
  budgetId: string;
  applyToSimilar?: boolean;
}): void {
  const ids = [params.transactionId];
  if (params.applyToSimilar) {
    const transaction = transactions.find((item) => item.id === params.transactionId);
    if (transaction) {
      ids.push(...findSimilarTransactions({ transaction, transactions }).map((item) => item.id));
      rules.push({
        id: `rule-${Date.now()}`,
        budgetId: params.budgetId,
        type: 'merchant_to_budget',
        merchantName: transaction.merchantName,
        createdAtIso: new Date().toISOString(),
      });
    }
  }

  ids.forEach((transactionId) => {
    assignments = assignments.filter((assignment) => assignment.transactionId !== transactionId);
    assignments.push({
      id: `assign-${transactionId}-${params.budgetId}`,
      transactionId,
      budgetId: params.budgetId,
      state: 'confirmed',
      assignedAtIso: new Date().toISOString(),
      source: 'user',
    });
  });

  suggestions = suggestions.filter((suggestion) => !ids.includes(suggestion.transactionId));
}

export function getPrimaryBudgetLane(): BudgetLane {
  const budget = requireBudget('shopping');
  const period = requirePeriod(budget.id);
  return {
    id: budget.id,
    name: budget.name,
    periodLabel: period.label,
    budgetCents: period.amountCents,
    spentCents: getConfirmedSpendForBudget(budget.id),
    periodElapsedPercent: period.elapsedPercent,
  };
}

export function getGateTargets(): AppGateTarget[] {
  return targets;
}

export function getRecentReviews(): Array<BudgetReviewEvent & { reviewedAtLabel: string; outcomeLabel: string }> {
  return reviewEvents.slice(0, 5).map((event) => ({
    ...event,
    reviewedAtLabel: formatRelativeTime(event.reviewedAtIso),
    outcomeLabel: event.outcome === 'unlocked' ? 'opened for now' : 'left blocked',
  }));
}

export function recordBudgetReview(params: {
  laneId: string;
  targetAppId: string;
  targetLabel: string;
  outcome: BudgetReviewOutcome;
}): BudgetReviewEvent {
  const event: BudgetReviewEvent = {
    id: `review-${Date.now()}`,
    laneId: params.laneId,
    targetAppId: params.targetAppId,
    targetLabel: params.targetLabel,
    outcome: params.outcome,
    reviewedAtIso: new Date().toISOString(),
  };
  reviewEvents.unshift(event);
  return event;
}

function requireBudget(budgetId: string): Budget {
  const budget = budgets.find((item) => item.id === budgetId);
  if (!budget) throw new Error(`Unknown budget: ${budgetId}`);
  return budget;
}

function requirePeriod(budgetId: string): BudgetPeriod {
  const period = periods.find((item) => item.budgetId === budgetId);
  if (!period) throw new Error(`Unknown period for budget: ${budgetId}`);
  return period;
}

function getConfirmedSpendForBudget(budgetId: string): number {
  return assignments
    .filter((assignment) => assignment.budgetId === budgetId && assignment.state === 'confirmed')
    .reduce((total, assignment) => {
      const transaction = transactions.find((item) => item.id === assignment.transactionId);
      return total + (transaction?.kind === 'spend' ? transaction.amountCents : 0);
    }, 0);
}

function getMatchSummary(budgetId: string): string {
  const confirmed = assignments.filter((assignment) => assignment.budgetId === budgetId).length;
  const suggested = suggestions.filter((suggestion) => suggestion.budgetId === budgetId).length;
  if (suggested > 0) return `${suggested} suggested`;
  if (confirmed > 0) return `${confirmed} matched`;
  return 'No matches yet';
}

function getTrendForBudget(budgetId: string): number[] {
  if (budgetId === 'shopping') return [12, 18, 16, 28, 33, 42, 58];
  if (budgetId === 'takeout') return [20, 32, 45, 84, 120, 166, 186];
  return [90, 160, 240, 330, 470, 560, 640];
}

function formatRelativeTime(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'recently';
  const diffMs = Date.now() - ms;
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: fail because `AppGateTarget` does not yet include `budgetId` or `unlockWindowMinutes`.

- [ ] **Step 3: Extend app gate target type**

Update `src/domain/app-gate.ts`:

```ts
export type AppGateTarget = {
  id: string;
  label: string;
  budgetId?: string;
  bundleId?: string;
  webDomains: string[];
  unlockWindowMinutes?: number;
  controlMode?: 'review_always' | 'review_when_hot' | 'pause_when_maxed';
};

export type BudgetReviewOutcome = 'unlocked' | 'dismissed';

export type BudgetReviewEvent = {
  id: string;
  laneId: string;
  targetAppId: string;
  targetLabel: string;
  outcome: BudgetReviewOutcome;
  reviewedAtIso: string;
};
```

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/platform/budget-repository.ts src/domain/app-gate.ts
git commit -m "feat: add fixture budget repository"
```

## Task 4: Runway Chart And Budget Rows

**Files:**
- Create: `src/components/runway-chart.tsx`
- Create: `src/components/budget-row.tsx`

- [ ] **Step 1: Create simple runway chart**

```tsx
import { Text, View } from 'react-native';
import { type HouseholdRunway } from '@/platform/budget-repository';
import { colors } from '@/theme/colors';
import { formatCurrency } from '@/domain/budget-meter';

export function RunwayChart({ runway }: { runway: HouseholdRunway }) {
  const max = Math.max(...runway.points.map((point) => Math.max(point.spendCents, point.expectedCents)), 1);

  return (
    <View style={{ backgroundColor: colors.pine900, borderRadius: 8, padding: 20, gap: 18 }}>
      <View style={{ gap: 4 }}>
        <Text selectable style={{ color: colors.pine200, fontSize: 13, fontWeight: '800' }}>
          {runway.monthLabel.toUpperCase()} RUNWAY
        </Text>
        <Text selectable style={{ color: colors.canvas, fontSize: 42, fontWeight: '900' }}>
          {formatCurrency(runway.remainingCents)}
        </Text>
        <Text selectable style={{ color: colors.pine200, fontSize: 14, fontWeight: '700' }}>
          {runway.paceLabel} · {runway.syncLabel}
        </Text>
      </View>

      <View style={{ height: 112, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        {runway.points.map((point) => (
          <View key={point.day} style={{ flex: 1, gap: 4, alignItems: 'center' }}>
            <View
              style={{
                width: '100%',
                height: Math.max(8, (point.expectedCents / max) * 96),
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.18)',
                justifyContent: 'flex-end',
              }}
            >
              <View
                style={{
                  width: '100%',
                  height: Math.max(6, (point.spendCents / Math.max(point.expectedCents, point.spendCents)) * 96),
                  borderRadius: 5,
                  backgroundColor: point.spendCents > point.expectedCents ? colors.turmeric : colors.pine400,
                }}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Summary label="Income" value={formatCurrency(runway.incomeCents)} />
        <Summary label="Spend" value={formatCurrency(runway.spendCents)} />
      </View>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text selectable style={{ color: colors.pine200, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
      <Text selectable style={{ color: colors.canvas, fontSize: 18, fontWeight: '900' }}>
        {value}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Create budget row**

```tsx
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { type BudgetRowModel } from '@/platform/budget-repository';
import { colors } from '@/theme/colors';

export function BudgetRow({ row }: { row: BudgetRowModel }) {
  const statusColor =
    row.meter.status === 'hot' ? colors.madder600 : row.meter.status === 'watch' ? colors.turmeric600 : colors.pine700;

  return (
    <Link href={`/budgets/${row.budget.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          opacity: pressed ? 0.72 : 1,
          gap: 8,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900' }}>
              {row.budget.name}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
              {row.meter.spentLabel} of {row.period.label} · {row.matchSummary}
            </Text>
          </View>
          <MiniTrend values={row.trend} hot={row.meter.status === 'hot'} />
          <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 76 }}>
            <Text selectable style={{ color: statusColor, fontSize: 15, fontWeight: '900' }}>
              {row.meter.remainingLabel}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
              {row.hasAppControl ? 'app gate' : row.meter.status}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function MiniTrend({ values, hot }: { values: number[]; hot: boolean }) {
  const max = Math.max(...values, 1);
  return (
    <View style={{ width: 70, height: 30, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
      {values.map((value, index) => (
        <View
          key={`${value}-${index}`}
          style={{
            flex: 1,
            height: Math.max(4, (value / max) * 28),
            borderRadius: 3,
            backgroundColor: hot ? colors.turmeric : colors.pine300,
          }}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/runway-chart.tsx src/components/budget-row.tsx
git commit -m "feat: add runway and budget row components"
```

## Task 5: Home Screen Runway And Budget List

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace home screen content**

```tsx
import { Link } from 'expo-router';
import { View } from 'react-native';
import { BudgetRow } from '@/components/budget-row';
import { Button } from '@/components/button';
import { RunwayChart } from '@/components/runway-chart';
import { ScreenSection } from '@/components/screen-section';
import { getBudgetRows, getHouseholdRunway } from '@/platform/budget-repository';
import { KwiltPage } from '@/shell/kwilt-page';

const runway = getHouseholdRunway();
const rows = getBudgetRows();

export default function BudgetHomeScreen() {
  return (
    <KwiltPage eyebrow="KWILT BUDGET" title="How this month is moving.">
      <RunwayChart runway={runway} />

      <Link href="/budgets/new" asChild>
        <Button label="New budget" />
      </Link>

      <ScreenSection title="Budgets">
        <View>
          {rows.map((row) => (
            <BudgetRow key={row.budget.id} row={row} />
          ))}
        </View>
      </ScreenSection>
    </KwiltPage>
  );
}
```

- [ ] **Step 2: Rename tab title**

In `app/(tabs)/_layout.tsx`, update the `index` screen title:

```tsx
<Tabs.Screen
  name="index"
  options={{
    title: 'Budget',
  }}
/>
```

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'app/(tabs)/index.tsx' 'app/(tabs)/_layout.tsx'
git commit -m "feat: show runway and budget list on home"
```

## Task 5A: Transactions Tab And Projection List

**Files:**
- Create: `app/(tabs)/transactions.tsx`

- [ ] **Step 1: Create transactions tab from the fixture projection**

```tsx
import { View } from 'react-native';
import { ScreenSection } from '@/components/screen-section';
import { TransactionMatchRow } from '@/components/transaction-match-row';
import { getBudgetDetail } from '@/platform/budget-repository';
import { KwiltPage } from '@/shell/kwilt-page';

export default function TransactionsScreen() {
  const detail = getBudgetDetail('shopping');

  return (
    <KwiltPage eyebrow="TRANSACTIONS" title="What Kwilt has seen.">
      <ScreenSection title="Recent activity">
        <View>
          {detail.transactions.map((transaction) => (
            <TransactionMatchRow
              key={transaction.id}
              transaction={transaction}
              suggestion={detail.suggestions.find((suggestion) => suggestion.transactionId === transaction.id)}
              assignment={detail.assignments.find((assignment) => assignment.transactionId === transaction.id)}
            />
          ))}
        </View>
      </ScreenSection>
    </KwiltPage>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS after Task 6 has created `TransactionMatchRow`. If implementing before Task 6, create this screen after Task 6.

- [ ] **Step 3: Commit**

```bash
git add 'app/(tabs)/transactions.tsx'
git commit -m "feat: add transactions projection tab"
```

## Task 5B: Shared Agent Workspace Boundary

**Files:**
- Create: `src/agent-workspace/types.ts`
- Create: `src/agent-workspace/fixture-workspace.ts`
- Create: `app/(tabs)/ask.tsx`

- [ ] **Step 1: Create shared-contract-shaped agent types**

```ts
export type AgentThread = {
  id: string;
  title: string;
  status: 'Active' | 'Paused' | 'Resolved' | 'Archived';
};

export type AgentMessage = {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
};

export type AgentRunEvent = {
  id: string;
  runId: string;
  sequence: number;
  type: 'status' | 'steer' | 'assistant_checkpoint' | 'object_card' | 'run_result';
  phase: 'thinking' | 'doing' | 'steering' | null;
  label: string;
  detail: string | null;
  status: 'active' | 'complete' | 'warning';
  payload: Record<string, unknown>;
};

export type ProposalOperation = {
  id: string;
  operationType: string;
  targetType: 'budget' | 'transaction_assignment' | 'matching_rule' | 'app_gate_rule';
  targetId: string | null;
  summary: string;
  payload: Record<string, unknown>;
  status: 'Proposed' | 'Applied' | 'Rejected' | 'Superseded';
};

export type AgentProposal = {
  id: string;
  threadId: string;
  title: string;
  kind: string;
  body: string;
  status: 'Proposed' | 'Accepted' | 'Rejected' | 'Superseded';
  operations: ProposalOperation[];
};

export type AgentWorkspaceState = {
  thread: AgentThread;
  messages: AgentMessage[];
  runEvents: AgentRunEvent[];
  proposals: AgentProposal[];
};
```

- [ ] **Step 2: Create fixture workspace using Giraffed-shaped contracts**

```ts
import { type AgentWorkspaceState } from './types';

export const fixtureAgentWorkspace: AgentWorkspaceState = {
  thread: {
    id: 'kwilt-budget-ask',
    title: 'Kwilt Money',
    status: 'Active',
  },
  messages: [
    {
      id: 'msg-welcome',
      threadId: 'kwilt-budget-ask',
      role: 'assistant',
      body: 'I can create budgets, explain this month, find unmatched transactions, and adjust app controls.',
      createdAt: new Date(0).toISOString(),
    },
  ],
  runEvents: [
    {
      id: 'event-context',
      runId: 'run-fixture',
      sequence: 1,
      type: 'object_card',
      phase: 'thinking',
      label: 'Budget context ready',
      detail: 'Shopping has suggested matches and Amazon can be paused when maxed out.',
      status: 'complete',
      payload: { budgetId: 'shopping' },
    },
  ],
  proposals: [
    {
      id: 'proposal-unmatched',
      threadId: 'kwilt-budget-ask',
      title: 'Review unmatched shopping transactions',
      kind: 'transaction_match',
      body: 'Kwilt found transactions that look like Shopping but are not confirmed yet.',
      status: 'Proposed',
      operations: [
        {
          id: 'op-match-amazon',
          operationType: 'confirm_match',
          targetType: 'transaction_assignment',
          targetId: 'tx-amazon-1',
          summary: 'Move Amazon Marketplace to Shopping.',
          payload: { transactionId: 'tx-amazon-1', budgetId: 'shopping' },
          status: 'Proposed',
        },
      ],
    },
  ],
};
```

- [ ] **Step 3: Create mobile Ask renderer against the shared-shaped state**

```tsx
import { Pressable, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { fixtureAgentWorkspace } from '@/agent-workspace/fixture-workspace';
import { colors } from '@/theme/colors';
import { KwiltPage } from '@/shell/kwilt-page';

export default function AskScreen() {
  const [message, setMessage] = useState('');
  const workspace = fixtureAgentWorkspace;

  return (
    <KwiltPage eyebrow="ASK" title="Control your budget with Kwilt.">
      <View style={{ gap: 12 }}>
        {workspace.messages.map((item) => (
          <View key={item.id} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, padding: 14, gap: 6 }}>
            <Text selectable style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>
              {item.role === 'assistant' ? 'Kwilt' : 'You'}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
              {item.body}
            </Text>
          </View>
        ))}
        {workspace.runEvents.map((event) => (
          <View key={event.id} style={{ borderWidth: 1, borderColor: colors.pine200, borderRadius: 8, padding: 14, gap: 6 }}>
            <Text selectable style={{ color: colors.pine800, fontSize: 13, fontWeight: '900' }}>
              {event.phase?.toUpperCase() ?? 'EVENT'}
            </Text>
            <Text selectable style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>
              {event.label}
            </Text>
            {event.detail ? (
              <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                {event.detail}
              </Text>
            ) : null}
          </View>
        ))}
        {workspace.proposals.map((proposal) => (
          <View key={proposal.id} style={{ borderWidth: 1, borderColor: colors.turmeric, borderRadius: 8, padding: 14, gap: 8 }}>
            <Text selectable style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>
              {proposal.title}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
              {proposal.body}
            </Text>
            {proposal.operations.map((operation) => (
              <Text key={operation.id} selectable style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800' }}>
                {operation.summary}
              </Text>
            ))}
          </View>
        ))}
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 8,
          padding: 10,
          gap: 8,
          backgroundColor: colors.card,
        }}
      >
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ask about budgets, matches, or app controls"
          placeholderTextColor={colors.textSecondary}
          style={{ color: colors.textPrimary, fontSize: 16, minHeight: 44 }}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          style={{
            alignSelf: 'flex-end',
            backgroundColor: colors.primary,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '900' }}>Send</Text>
        </Pressable>
      </View>
    </KwiltPage>
  );
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/agent-workspace/types.ts src/agent-workspace/fixture-workspace.ts 'app/(tabs)/ask.tsx'
git commit -m "feat: add shared-shaped ask workspace"
```

## Task 5C: Plan Shared Agent Workspace Extraction

**Files:**
- Create: `docs/superpowers/plans/2026-06-24-shared-agent-workspace-extraction.md`

- [ ] **Step 1: Write the extraction plan**

Create a separate plan that ports the mature Giraffed capability into a shared package. It should cover:

- source audit of `/Users/andrewwatanabe/Documents/Orchard/src/components/orchard-workbench.tsx`,
- source audit of `/Users/andrewwatanabe/Documents/Orchard/src/lib/orchard-repository.ts`,
- source audit of `/Users/andrewwatanabe/Documents/Orchard/src/app/api/agent/run/route.ts`,
- source audit of steer/stop routes,
- source audit of AI gateway,
- shared TypeScript contracts,
- shared stream reducer/client,
- proposal operation model,
- web renderer migration for Giraffed,
- mobile renderer for Kwilt Money,
- Kwilt Money tools and proposal operation types,
- persistence migrations or schema mirroring.

- [ ] **Step 2: Keep this local slice unblocked**

Do not implement the shared extraction inside this local slice. The local Ask tab must remain shaped like the shared contracts so it can be replaced with the real capability later.

## Task 6: Budget Detail And Match Rows

**Files:**
- Create: `src/components/transaction-match-row.tsx`
- Create: `app/budgets/[budgetId].tsx`

- [ ] **Step 1: Create transaction match row component**

```tsx
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { type AssignmentSuggestion, type NormalizedTransaction, type TransactionAssignment } from '@/domain/budget-matching';
import { colors } from '@/theme/colors';

export function TransactionMatchRow({
  transaction,
  suggestion,
  assignment,
}: {
  transaction: NormalizedTransaction;
  suggestion?: AssignmentSuggestion;
  assignment?: TransactionAssignment;
}) {
  const state = assignment?.state ?? (suggestion ? 'suggested' : 'unmatched');
  const label = state === 'suggested' ? 'Suggested' : state === 'confirmed' ? 'Matched' : state === 'excluded' ? 'Excluded' : 'Unmatched';
  const borderColor = state === 'suggested' ? colors.turmeric : state === 'confirmed' ? colors.pine300 : colors.gray300;

  return (
    <Link href={`/transactions/${transaction.id}`} asChild>
      <Pressable
        style={({ pressed }) => ({
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text selectable style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
              {transaction.merchantName}
            </Text>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {transaction.accountLabel}
            </Text>
          </View>
          <View
            style={{
              borderWidth: 1,
              borderColor,
              backgroundColor: state === 'confirmed' ? colors.pine50 : colors.canvas,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text selectable style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }}>
              {label}
            </Text>
          </View>
          <Text selectable style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '900', minWidth: 64, textAlign: 'right' }}>
            -${(transaction.amountCents / 100).toFixed(2)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
```

- [ ] **Step 2: Create budget detail screen**

```tsx
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { MeterCard } from '@/components/meter-card';
import { ScreenSection } from '@/components/screen-section';
import { TransactionMatchRow } from '@/components/transaction-match-row';
import { getBudgetDetail } from '@/platform/budget-repository';
import { KwiltPage } from '@/shell/kwilt-page';
import { colors } from '@/theme/colors';

export default function BudgetDetailScreen() {
  const { budgetId } = useLocalSearchParams<{ budgetId: string }>();
  const detail = getBudgetDetail(budgetId ?? 'shopping');

  return (
    <KwiltPage eyebrow="BUDGET" title={detail.budget.name}>
      <MeterCard
        lane={{
          id: detail.budget.id,
          name: detail.budget.name,
          periodLabel: detail.period.label,
          budgetCents: detail.period.amountCents,
          spentCents: detail.meter.spentCents,
          periodElapsedPercent: detail.period.elapsedPercent,
        }}
      />

      <ScreenSection title="App controls">
        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
            {detail.target
              ? `${detail.target.label} waits behind this budget.`
              : 'No apps wait behind this budget yet.'}
          </Text>
          <Link href={`/app-control/${detail.budget.id}`} asChild>
            <Button variant="secondary" label={detail.target ? 'View app control' : 'Add app control'} />
          </Link>
        </View>
      </ScreenSection>

      <ScreenSection title="Transaction matches">
        <View>
          {detail.transactions.map((transaction) => (
            <TransactionMatchRow
              key={transaction.id}
              transaction={transaction}
              suggestion={detail.suggestions.find((suggestion) => suggestion.transactionId === transaction.id)}
              assignment={detail.assignments.find((assignment) => assignment.transactionId === transaction.id)}
            />
          ))}
        </View>
      </ScreenSection>
    </KwiltPage>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/transaction-match-row.tsx app/budgets/[budgetId].tsx
git commit -m "feat: add budget detail with transaction matches"
```

## Task 7: Transaction Correction Screen

**Files:**
- Create: `app/transactions/[transactionId].tsx`

- [ ] **Step 1: Create transaction correction screen**

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { ScreenSection } from '@/components/screen-section';
import { confirmTransactionBudgetMatch, getTransactionDetail } from '@/platform/budget-repository';
import { KwiltPage } from '@/shell/kwilt-page';
import { colors } from '@/theme/colors';

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const detail = getTransactionDetail(transactionId ?? 'tx-amazon-1');
  const firstBudget = detail.budgets[0];

  function moveToBudget(applyToSimilar: boolean) {
    confirmTransactionBudgetMatch({
      transactionId: detail.transaction.id,
      budgetId: firstBudget.id,
      applyToSimilar,
    });
    router.back();
  }

  return (
    <KwiltPage eyebrow="TRANSACTION" title={detail.transaction.merchantName}>
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: colors.textPrimary, fontSize: 42, fontWeight: '900', textAlign: 'center' }}>
          -${(detail.transaction.amountCents / 100).toFixed(2)}
        </Text>
        <Text selectable style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
          {detail.transaction.accountLabel}
        </Text>
      </View>

      <ScreenSection title="Budget match">
        <View style={{ gap: 10 }}>
          <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
            Move this transaction to {firstBudget.name}. Kwilt will update this budget's meter without changing the source transaction.
          </Text>
          <Button label={`Move to ${firstBudget.name}`} onPress={() => moveToBudget(false)} />
        </View>
      </ScreenSection>

      {detail.similarTransactions.length > 0 ? (
        <ScreenSection title="Similar transactions">
          <View style={{ gap: 10 }}>
            <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Kwilt found {detail.similarTransactions.length} similar transaction{detail.similarTransactions.length === 1 ? '' : 's'}.
            </Text>
            <Button
              variant="secondary"
              label={`Move ${detail.similarTransactions.length + 1} transactions`}
              onPress={() => moveToBudget(true)}
            />
            <Button variant="ghost" label="Just this one" onPress={() => moveToBudget(false)} />
          </View>
        </ScreenSection>
      ) : null}
    </KwiltPage>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/transactions/[transactionId].tsx
git commit -m "feat: add transaction match correction"
```

## Task 8: Budget Creation Screen

**Files:**
- Create: `app/budgets/new.tsx`

- [ ] **Step 1: Add local budget-first setup screen**

```tsx
import { router } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { Button } from '@/components/button';
import { ScreenSection } from '@/components/screen-section';
import { KwiltPage } from '@/shell/kwilt-page';
import { colors } from '@/theme/colors';

export default function NewBudgetScreen() {
  const [name, setName] = useState('Shopping');
  const [amount, setAmount] = useState('100');

  return (
    <KwiltPage eyebrow="NEW BUDGET" title="Set up a budget.">
      <ScreenSection title="Budget">
        <View style={{ gap: 12 }}>
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Monthly amount" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
          <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
            This creates the budget first. You can connect transactions or add app controls after the meter exists.
          </Text>
          <Button label="Create budget" onPress={() => router.push('/budgets/shopping')} />
        </View>
      </ScreenSection>
    </KwiltPage>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'number-pad';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800' }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={{
          backgroundColor: colors.fieldFill,
          borderRadius: 8,
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: '800',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      />
    </View>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/budgets/new.tsx
git commit -m "feat: add budget-first setup screen"
```

## Task 9: App Control Summary And Review Wiring

**Files:**
- Create: `app/app-control/[budgetId].tsx`
- Modify: `app/review.tsx`

- [ ] **Step 1: Create app-control summary screen**

```tsx
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { ScreenSection } from '@/components/screen-section';
import { getBudgetDetail } from '@/platform/budget-repository';
import { KwiltPage } from '@/shell/kwilt-page';
import { colors } from '@/theme/colors';

export default function AppControlScreen() {
  const { budgetId } = useLocalSearchParams<{ budgetId: string }>();
  const detail = getBudgetDetail(budgetId ?? 'shopping');
  const targetLabel = detail.target?.label ?? 'Amazon';

  return (
    <KwiltPage eyebrow="APP CONTROL" title="Put an app behind this budget.">
      <ScreenSection title="Rule summary">
        <View style={{ gap: 12 }}>
          <Text selectable style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900', lineHeight: 26 }}>
            Before {targetLabel} opens, show {detail.budget.name}.
          </Text>
          <Text selectable style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
            If you review it, {targetLabel} opens for {detail.target?.unlockWindowMinutes ?? 15} minutes. If this budget is maxed out, {targetLabel} stays paused until next month or until you change this rule.
          </Text>
          <Link href="/review" asChild>
            <Button label="Rehearse review" />
          </Link>
        </View>
      </ScreenSection>
    </KwiltPage>
  );
}
```

- [ ] **Step 2: Update review screen copy for budget-first language**

In `app/review.tsx`, change the title and explanatory copy:

```tsx
<KwiltPage eyebrow="AMAZON ACCESS" title="Review Shopping first.">
```

And:

```tsx
<Text selectable style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
  This app waits behind your budget. Review the current meter, then choose whether to open it for now.
</Text>
```

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/app-control/[budgetId].tsx app/review.tsx
git commit -m "feat: add app control summary"
```

## Task 10: Verification Pass

**Files:**
- No new files unless bugs are found.

- [ ] **Step 1: Run typecheck**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 2: Start Expo**

Run: `npm run start`

Expected: Expo starts and prints a local URL/QR code.

- [ ] **Step 3: Manual route smoke test**

Open these routes in the Expo app or web preview:

- `/`
- `/budgets/new`
- `/budgets/shopping`
- `/transactions/tx-amazon-1`
- `/app-control/shopping`
- `/review`

Expected:

- home shows runway chart and three budget rows,
- new budget screen says budget first, controls later,
- shopping detail shows matches and app-control prompt,
- transaction detail can move a transaction and offer similar updates,
- app-control summary mentions review access and maxed-out pause behavior,
- review screen still records an open-for-now event.

- [ ] **Step 4: Final commit**

```bash
git status --short
git add app src docs/concepts/kwilt-budget-v1-concept.md docs/superpowers/plans/2026-06-24-kwilt-budget-v1-local-slice.md
git commit -m "feat: build kwilt budget v1 local slice"
```

## Self-review

Spec coverage:

- Budget-first setup: Task 8.
- Robinhood-inspired runway plus rows: Tasks 4 and 5.
- Budgets, groups, periods, transactions, suggestions, assignments: Tasks 1 through 3.
- Unmatched/suggested/confirmed transaction handling: Tasks 2, 3, 6, and 7.
- Correction and apply-to-similar: Task 7.
- Optional app controls after budget creation: Tasks 6 and 9.
- Review gate still present: Task 9.

Placeholder scan:

- No task uses TBD/TODO placeholders.
- Native Plaid and FamilyControls are intentionally excluded from this local slice and named as seams.

Type consistency:

- User-facing object is `Budget`.
- Existing compatibility type `BudgetLane` remains for `MeterCard` and `review.tsx`.
- `TransactionAssignment` and `AssignmentSuggestion` are separate from `NormalizedTransaction`.
