import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
import { Card } from '../../ui/Card';
import { Heading, Text } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { ButtonLabel } from '../../ui/Typography';
import { SegmentedControl } from '../../ui/SegmentedControl';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { SYNTHETIC_RESPONSES } from '../arcs/arcGenerationTesting';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type TestModelChoice = 'gpt-4o-mini' | 'gpt-5.2';
type ScoringModeChoice = 'heuristic' | 'ai';
type JudgeModelChoice = 'gpt-4o-mini' | 'gpt-5.2';

export function ArcTestingLauncher() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const [model, setModel] = useState<TestModelChoice>('gpt-4o-mini');
  const [scoringMode, setScoringMode] = useState<ScoringModeChoice>('heuristic');
  const [judgeModel, setJudgeModel] = useState<JudgeModelChoice>('gpt-4o-mini');

  return (
    <CanvasScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.card} padding="sm">
        <Heading style={styles.title}>Model</Heading>
        <Text style={styles.body}>Pick the OpenAI model to run Arc Testing with.</Text>
        <SegmentedControl
          value={model}
          onChange={setModel}
          options={[
            { value: 'gpt-4o-mini', label: '4o mini' },
            { value: 'gpt-5.2', label: '5.2' },
          ]}
        />
        <Text style={styles.meta}>Current: {model}</Text>
      </Card>

      <Card style={styles.card} padding="sm">
        <Heading style={styles.title}>Scoring</Heading>
        <Text style={styles.body}>
          Choose how rubric scores are computed. AI scoring uses a separate judge model.
        </Text>
        <SegmentedControl
          value={scoringMode}
          onChange={setScoringMode}
          options={[
            { value: 'heuristic', label: 'Heuristic' },
            { value: 'ai', label: 'AI-judged' },
          ]}
        />
        {scoringMode === 'ai' && (
          <>
            <Text style={styles.meta}>Judge model</Text>
            <SegmentedControl
              value={judgeModel}
              onChange={setJudgeModel}
              options={[
                { value: 'gpt-4o-mini', label: '4o mini' },
                { value: 'gpt-5.2', label: '5.2' },
              ]}
              size="compact"
            />
          </>
        )}
      </Card>

      <Card style={styles.card} padding="sm">
        <Heading style={styles.title}>Arc Testing</Heading>
        <Text style={styles.body}>
          Launch a run and review results on the dedicated Results page (includes a scored rubric table +
          raw outputs).
        </Text>
        <View style={styles.actionsRow}>
          <Button
            variant="accent"
            onPress={() =>
              navigation.navigate('DevArcTestingResults', {
                mode: 'full',
                model,
                scoringMode,
                judgeModel: scoringMode === 'ai' ? judgeModel : undefined,
              })
            }
          >
            <ButtonLabel size="md" tone="inverse">
              Run Full Test Suite
            </ButtonLabel>
          </Button>
        </View>
      </Card>

      <Card style={styles.card}>
        <Heading style={styles.title}>Synthetic Responses ({SYNTHETIC_RESPONSES.length})</Heading>
        <Text style={styles.body}>Run a single response across all paradigms.</Text>
        <View style={styles.list}>
          {SYNTHETIC_RESPONSES.map((response) => (
            <View key={response.id} style={styles.responseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.responseId}>
                  {response.id} {response.ageBand ? `• age ${response.ageBand}` : ''}
                </Text>
                <Text style={styles.responseDesc}>{response.description}</Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                onPress={() =>
                  navigation.navigate('DevArcTestingResults', {
                    mode: 'response',
                    responseId: response.id,
                    model,
                    scoringMode,
                    judgeModel: scoringMode === 'ai' ? judgeModel : undefined,
                  })
                }
              >
                <ButtonLabel size="sm">Run</ButtonLabel>
              </Button>
            </View>
          ))}
        </View>
      </Card>
    </CanvasScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing['2xl'],
    rowGap: 0,
  },
  card: {
    rowGap: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.label,
    color: colors.textSecondary,
  },
  actionsRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  list: {
    marginTop: spacing.sm,
    rowGap: spacing.sm,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  responseId: {
    ...typography.label,
    color: colors.textSecondary,
  },
  responseDesc: {
    ...typography.body,
    color: colors.textPrimary,
  },
});


