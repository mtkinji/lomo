import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Heading, Text } from '../../ui/primitives';
import { ButtonLabel } from '../../ui/Typography';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  SYNTHETIC_RESPONSES,
  PROMPT_PARADIGMS,
  runFullTestSuite,
  runSingleTest,
  testAllParadigmsForResponse,
  formatTestResults,
  type ComparisonResult,
} from '../arcs/arcGenerationTesting';

export function ArcGenerationTestingScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const [currentTestOutput, setCurrentTestOutput] = useState<string>('');
  const [hasCopiedResults, setHasCopiedResults] = useState(false);

  const handleRunFullSuite = async () => {
    setIsRunning(true);
    setCurrentTestOutput('Starting full test suite...\n');
    try {
      const testResults = await runFullTestSuite();
      setResults(testResults);
      const formatted = testResults.map(formatTestResults).join('\n\n');
      setCurrentTestOutput(formatted);
    } catch (error) {
      setCurrentTestOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestSingleResponse = async (responseId: string) => {
    setIsRunning(true);
    setSelectedResponseId(responseId);
    setCurrentTestOutput(`Testing response: ${responseId}...\n`);
    try {
      const response = SYNTHETIC_RESPONSES.find((r) => r.id === responseId);
      if (!response) {
        setCurrentTestOutput(`Response ${responseId} not found`);
        return;
      }

      const comparison = await testAllParadigmsForResponse(response);
      setResults([comparison]);
      setCurrentTestOutput(formatTestResults(comparison));
    } catch (error) {
      setCurrentTestOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestSingleParadigm = async (paradigmId: string, responseId: string) => {
    setIsRunning(true);
    setCurrentTestOutput(`Testing ${paradigmId} against ${responseId}...\n`);
    try {
      const paradigm = PROMPT_PARADIGMS.find((p) => p.id === paradigmId);
      const response = SYNTHETIC_RESPONSES.find((r) => r.id === responseId);
      if (!paradigm || !response) {
        setCurrentTestOutput('Paradigm or response not found');
        return;
      }

      const testResult = await runSingleTest(paradigm, response);
      setCurrentTestOutput(
        `Paradigm: ${paradigm.name}\nResponse: ${response.description}\n\n` +
          (testResult.error
            ? `ERROR: ${testResult.error}`
            : testResult.arcs
                .map(
                  (arc, i) =>
                    `Arc ${i + 1}:\n  Name: ${arc.name}\n  Narrative: ${arc.narrative}\n`
                )
                .join('\n'))
      );
    } catch (error) {
      setCurrentTestOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyResults = async () => {
    const text = (currentTestOutput ?? '').trim();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setHasCopiedResults(true);
      setTimeout(() => setHasCopiedResults(false), 2000);
    } catch (error) {
      Alert.alert('Copy failed', 'Unable to copy to clipboard on this device right now.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.section}>
        <Heading style={styles.sectionTitle}>Test Actions</Heading>
        <View style={styles.buttonRow}>
          <Button variant="accent" onPress={handleRunFullSuite} disabled={isRunning} style={styles.button}>
            <ButtonLabel size="md" tone="inverse">
              Run Full Test Suite
            </ButtonLabel>
          </Button>
        </View>
      </Card>

      <Card style={styles.section}>
        <Heading style={styles.sectionTitle}>Synthetic Responses ({SYNTHETIC_RESPONSES.length})</Heading>
        {SYNTHETIC_RESPONSES.map((response) => (
          <View key={response.id} style={styles.responseItem}>
            <Text style={styles.responseId}>{response.id}</Text>
            <Text style={styles.responseDesc}>{response.description}</Text>
            <Button
              variant="accent"
              size="sm"
              onPress={() => handleTestSingleResponse(response.id)}
              disabled={isRunning}
              style={styles.smallButton}
            >
              <ButtonLabel size="sm" tone="inverse">
                Test This Response
              </ButtonLabel>
            </Button>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Heading style={styles.sectionTitle}>Prompt Paradigms ({PROMPT_PARADIGMS.length})</Heading>
        {PROMPT_PARADIGMS.map((paradigm) => (
          <View key={paradigm.id} style={styles.paradigmItem}>
            <Text style={styles.paradigmName}>{paradigm.name}</Text>
            <Text style={styles.paradigmDesc}>{paradigm.description}</Text>
          </View>
        ))}
      </Card>

      {isRunning && (
        <Card style={styles.section}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Running tests...</Text>
          </View>
        </Card>
      )}

      {currentTestOutput && (
        <Card style={styles.section}>
          <View style={styles.resultsHeaderRow}>
            <Heading style={styles.sectionTitle}>Test Results</Heading>
            <Button
              variant="secondary"
              size="sm"
              onPress={handleCopyResults}
              disabled={isRunning || !currentTestOutput}
            >
              <ButtonLabel size="sm">{hasCopiedResults ? 'Copied' : 'Copy'}</ButtonLabel>
            </Button>
          </View>
          <ScrollView style={styles.outputContainer} nestedScrollEnabled>
            <Text style={styles.outputText}>{currentTestOutput}</Text>
          </ScrollView>
        </Card>
      )}

      {results.length > 0 && (
        <Card style={styles.section}>
          <Heading style={styles.sectionTitle}>Summary</Heading>
          <Text style={styles.summaryText}>
            Completed {results.length} comparison{results.length !== 1 ? 's' : ''}
          </Text>
          {results.map((comparison) => (
            <View key={comparison.responseId} style={styles.summaryItem}>
              <Text style={styles.summaryResponseId}>{comparison.responseId}</Text>
              <Text style={styles.summaryCount}>
                {comparison.results.filter((r) => !r.error).length} / {comparison.results.length}{' '}
                paradigms succeeded
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

// Create styles in a function to ensure spacing is available
const SAFE_SPACING: typeof spacing = (spacing ??
  ({
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
  } as const));

const SAFE_TYPOGRAPHY_SIZES: typeof typography.sizes = (typography?.sizes ??
  ({
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
  } as const));

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SAFE_SPACING.lg,
  },
  section: {
    marginBottom: SAFE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.lg,
    fontWeight: '600',
    marginBottom: SAFE_SPACING.md,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SAFE_SPACING.md,
  },
  button: {
    flex: 1,
  },
  smallButton: {
    marginTop: SAFE_SPACING.sm,
  },
  responseItem: {
    padding: SAFE_SPACING.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: SAFE_SPACING.sm,
  },
  responseId: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.sm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: SAFE_SPACING.xs,
  },
  responseDesc: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.md,
    color: colors.text,
    marginBottom: SAFE_SPACING.xs,
  },
  paradigmItem: {
    padding: SAFE_SPACING.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: SAFE_SPACING.sm,
  },
  paradigmName: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SAFE_SPACING.xs,
  },
  paradigmDesc: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.sm,
    color: colors.textSecondary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: SAFE_SPACING.xl,
  },
  loadingText: {
    marginTop: SAFE_SPACING.md,
    color: colors.textSecondary,
  },
  outputContainer: {
    maxHeight: 600,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: SAFE_SPACING.md,
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: SAFE_TYPOGRAPHY_SIZES.sm,
    color: colors.text,
    lineHeight: 20,
  },
  summaryText: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.md,
    color: colors.text,
    marginBottom: SAFE_SPACING.md,
  },
  summaryItem: {
    padding: SAFE_SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: SAFE_SPACING.xs,
  },
  summaryResponseId: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.sm,
    fontWeight: '600',
    color: colors.text,
  },
  summaryCount: {
    fontSize: SAFE_TYPOGRAPHY_SIZES.sm,
    color: colors.textSecondary,
    marginTop: SAFE_SPACING.xs,
  },
});

const styles = getStyles();

