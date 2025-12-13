import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import * as Clipboard from 'expo-clipboard';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Heading, Text } from '../../ui/primitives';
import { ButtonLabel } from '../../ui/Typography';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import {
  SYNTHETIC_RESPONSES,
  runFullTestSuiteWithOptions,
  testAllParadigmsForResponse,
  formatTestResults,
  computeRubricTableForComparison,
  computeRubricTableForComparisonAsync,
  formatRubricTable,
  aggregateRubricTables,
  aggregateRubricRows,
  clearArcTestingJudgeCaches,
  recordArcTestingAggregateRun,
  getArcTestingPruningDecision,
  clearArcTestingPruningHistory,
  type ComparisonResult,
} from '../arcs/arcGenerationTesting';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type DevArcTestingResultsRoute = RouteProp<RootDrawerParamList, 'DevArcTestingResults'>;

export function ArcTestingResultsPage() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<DevArcTestingResultsRoute>();
  const mode = route.params?.mode ?? 'full';
  const responseId = route.params?.responseId ?? null;
  const model = route.params?.model ?? 'gpt-4o-mini';
  const scoringMode = route.params?.scoringMode ?? 'heuristic';
  const judgeModel = route.params?.judgeModel ?? 'gpt-4o-mini';

  const [isRunning, setIsRunning] = useState(true);
  const [comparisons, setComparisons] = useState<ComparisonResult[]>([]);
  const [output, setOutput] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCleared, setHasCleared] = useState(false);
  const [hasResetPruning, setHasResetPruning] = useState(false);

  const title = useMemo(() => {
    if (mode === 'response' && responseId) {
      const found = SYNTHETIC_RESPONSES.find((r) => r.id === responseId);
      return found?.description ?? `Arc Test: ${responseId}`;
    }
    return 'Arc Test Suite Results';
  }, [mode, responseId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsRunning(true);
      setOutput('Running test…');
      try {
        let results: ComparisonResult[] = [];
        if (mode === 'response' && responseId) {
          const response = SYNTHETIC_RESPONSES.find((r) => r.id === responseId);
          if (!response) {
            throw new Error(`Unknown responseId: ${responseId}`);
          }
          results = [await testAllParadigmsForResponse(response, { modelOverride: model })];
        } else {
          results = await runFullTestSuiteWithOptions({ modelOverride: model });
        }

        if (cancelled) return;
        setComparisons(results);

        // Build output: aggregated table (for full suite), then per-response table + raw.
        const blocks: string[] = [];
        const rubricTables =
          scoringMode === 'ai'
            ? await Promise.all(
                results.map((comparison) =>
                  computeRubricTableForComparisonAsync(comparison, {
                    aiJudge: { enabled: true, judgeModel },
                  })
                )
              )
            : results.map((comparison) => computeRubricTableForComparison(comparison));

        if (results.length > 1) {
          if (scoringMode === 'ai') {
            const allRows = rubricTables.flatMap((t) => t.rows);
            const agg = aggregateRubricRows(allRows);
            await recordArcTestingAggregateRun({
              rows: agg,
              scoringMode: 'ai',
              judgeModel,
              generationModel: model,
              responseCount: results.length,
            });
            const pruning = await getArcTestingPruningDecision();
            blocks.push(
              `PRUNING (data-driven) • historyRuns=${pruning.usedRuns} • eligible=${pruning.eligibleCount} • keep=${pruning.keepCount} • pruned=${pruning.prunedParadigmIds.length} • cutoffMean=${pruning.cutoffMeanOverall?.toFixed(2) ?? 'n/a'} • reason=${pruning.reason ?? 'ok'}`
            );
            blocks.push('');
            blocks.push('Paradigm | Runs | MeanOverall | MeanΔMedian | LastOverall | LastΔMedian | Status');
            blocks.push('---|---:|---:|---:|---:|---:|---');
            const prunedSet = new Set(pruning.prunedParadigmIds);
            pruning.stats.forEach((s) => {
              const status = prunedSet.has(s.paradigmId) ? 'PRUNED' : 'KEPT/NOT-ELIGIBLE';
              blocks.push(
                `${s.paradigmName} | ${s.runs} | ${s.meanOverall.toFixed(2)} | ${s.meanDeltaFromMedian.toFixed(2)} | ${(s.lastOverall ?? 0).toFixed(2)} | ${(s.lastDeltaFromMedian ?? 0).toFixed(2)} | ${status}`
              );
            });
            blocks.push('');
            blocks.push(`RUBRIC SCORES — AGGREGATE (AI-judged, mean across responses) • judge=${judgeModel}`);
            blocks.push('');
            blocks.push('Paradigm | Ease(14yo) | Length | Quality | Felt | ReadEase | Everyday | Clarity | Overall');
            blocks.push('---|---:|---:|---:|---:|---:|---:|---:|---:');
            agg.forEach((row) => {
              blocks.push(
                `${row.paradigmName} | ${row.easeAnswering14yo.toFixed(1)} | ${row.surveyLength.toFixed(1)} | ${row.arcQuality.toFixed(1)} | ${row.arcFeltAccuracy.toFixed(1)} | ${row.arcReadingEase.toFixed(1)} | ${row.arcEverydayConcreteness.toFixed(1)} | ${row.arcClarity.toFixed(1)} | ${row.overall.toFixed(1)}`
              );
            });
            blocks.push('');
            blocks.push('---');
            blocks.push('');
          } else {
            const aggregate = aggregateRubricTables(results);
            await recordArcTestingAggregateRun({
              rows: aggregate.rows,
              scoringMode: 'heuristic',
              generationModel: model,
              responseCount: results.length,
            });
            const pruning = await getArcTestingPruningDecision();
            blocks.push(
              `PRUNING (data-driven) • historyRuns=${pruning.usedRuns} • eligible=${pruning.eligibleCount} • keep=${pruning.keepCount} • pruned=${pruning.prunedParadigmIds.length} • cutoffMean=${pruning.cutoffMeanOverall?.toFixed(2) ?? 'n/a'} • reason=${pruning.reason ?? 'ok'}`
            );
            blocks.push('');
            blocks.push('Paradigm | Runs | MeanOverall | MeanΔMedian | LastOverall | LastΔMedian | Status');
            blocks.push('---|---:|---:|---:|---:|---:|---');
            const prunedSet = new Set(pruning.prunedParadigmIds);
            pruning.stats.forEach((s) => {
              const status = prunedSet.has(s.paradigmId) ? 'PRUNED' : 'KEPT/NOT-ELIGIBLE';
              blocks.push(
                `${s.paradigmName} | ${s.runs} | ${s.meanOverall.toFixed(2)} | ${s.meanDeltaFromMedian.toFixed(2)} | ${(s.lastOverall ?? 0).toFixed(2)} | ${(s.lastDeltaFromMedian ?? 0).toFixed(2)} | ${status}`
              );
            });
            blocks.push('');
            blocks.push('RUBRIC SCORES — AGGREGATE (heuristic, mean across responses)');
            blocks.push('');
            blocks.push('Paradigm | Ease(14yo) | Length | Quality | Felt | ReadEase | Everyday | Clarity | Overall');
            blocks.push('---|---:|---:|---:|---:|---:|---:|---:|---:');
            aggregate.rows.forEach((row) => {
              blocks.push(
                `${row.paradigmName} | ${row.easeAnswering14yo.toFixed(1)} | ${row.surveyLength.toFixed(1)} | ${row.arcQuality.toFixed(1)} | ${row.arcFeltAccuracy.toFixed(1)} | ${row.arcReadingEase.toFixed(1)} | ${row.arcEverydayConcreteness.toFixed(1)} | ${row.arcClarity.toFixed(1)} | ${row.overall.toFixed(1)}`
              );
            });
            blocks.push('');
            blocks.push('---');
            blocks.push('');
          }
        }

        results.forEach((comparison, idx) => {
          const rubric = rubricTables[idx]!;
          blocks.push(formatRubricTable(rubric));
          blocks.push('');
          blocks.push(formatTestResults(comparison));
          blocks.push('');
        });

        setOutput(blocks.join('\n'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setOutput(`Error: ${message}`);
      } finally {
        setIsRunning(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [mode, responseId, model, scoringMode, judgeModel]);

  const handleCopy = async () => {
    const text = output.trim();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      Alert.alert('Copy failed', 'Unable to copy to clipboard on this device right now.');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear results?',
      'This clears the displayed output. If AI judging is enabled, it also clears the in-memory judge cache so the next run is fully re-judged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setComparisons([]);
            setOutput('');
            setHasCopied(false);
            clearArcTestingJudgeCaches();
            setHasCleared(true);
            setTimeout(() => setHasCleared(false), 1500);
          },
        },
      ]
    );
  };

  const handleResetPruning = () => {
    Alert.alert(
      'Reset pruning history?',
      'This clears the persisted pruning history used for data-driven pruning. Underperformer history will be lost until you run the suite again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearArcTestingPruningHistory();
              setHasResetPruning(true);
              setTimeout(() => setHasResetPruning(false), 1500);
            } catch {
              Alert.alert('Reset failed', 'Unable to clear pruning history on this device right now.');
            }
          },
        },
      ]
    );
  };

  return (
    <AppShell>
      <PageHeader
        title="Arc Testing Results"
        onPressBack={() => navigation.navigate('DevTools', { initialTab: 'arcTesting' })}
      />

      <CanvasScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <Heading style={styles.title}>{title}</Heading>
          <Text style={styles.meta}>
            {mode === 'response' ? 'Single response run' : 'Full suite run'} •{' '}
            Model: {model} • Scoring: {scoringMode === 'ai' ? `AI (judge=${judgeModel})` : 'Heuristic'} •{' '}
            {isRunning ? 'Running…' : `${comparisons.length} response(s)`}
          </Text>
          <View style={styles.actionsRow}>
            <Button variant="secondary" size="sm" onPress={handleCopy} disabled={!output}>
              <ButtonLabel size="sm">{hasCopied ? 'Copied' : 'Copy results'}</ButtonLabel>
            </Button>
            <Button variant="secondary" size="sm" onPress={handleClear} disabled={isRunning}>
              <ButtonLabel size="sm">{hasCleared ? 'Cleared' : 'Clear'}</ButtonLabel>
            </Button>
            <Button variant="secondary" size="sm" onPress={handleResetPruning} disabled={isRunning}>
              <ButtonLabel size="sm">{hasResetPruning ? 'Reset' : 'Reset pruning'}</ButtonLabel>
            </Button>
          </View>
        </Card>

        <Card style={styles.resultsCard}>
          <View style={styles.resultsHeaderRow}>
            <Heading style={styles.sectionTitle}>Results</Heading>
            {isRunning ? (
              <Text style={styles.runningPill}>Running</Text>
            ) : (
              <Text style={styles.donePill}>Done</Text>
            )}
          </View>
          <ScrollView style={styles.outputScroll} nestedScrollEnabled>
            <Text style={styles.outputText} selectable>
              {output}
            </Text>
          </ScrollView>
        </Card>
      </CanvasScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing['2xl'],
    rowGap: spacing.lg,
  },
  headerCard: {
    padding: spacing.lg,
    rowGap: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  actionsRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  resultsCard: {
    padding: spacing.lg,
    rowGap: spacing.sm,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  runningPill: {
    ...typography.label,
    color: colors.textSecondary,
  },
  donePill: {
    ...typography.label,
    color: colors.accent,
  },
  outputScroll: {
    maxHeight: 720,
    borderRadius: 10,
    backgroundColor: colors.shellAlt,
    padding: spacing.md,
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textPrimary,
  },
});


