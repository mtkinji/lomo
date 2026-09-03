import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Button } from '../../ui/Button';
import { HStack, VStack } from '../../ui/Stack';
import { Heading, Text } from '../../ui/Typography';
import type {
  WorkflowFeedbackPrompt,
  WorkflowFeedbackValue,
} from './workflowFeedbackRegistry';

export function WorkflowFeedbackQuestion(props: {
  prompt: WorkflowFeedbackPrompt;
  onSubmit: (value: WorkflowFeedbackValue) => void;
  onReason: (reasonCode: string) => void;
  onDismiss: () => void;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'rating' | 'reasons' | 'thanks'>('rating');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'thanks') return undefined;
    const timer = setTimeout(props.onComplete, 500);
    return () => clearTimeout(timer);
  }, [phase, props.onComplete]);

  if (phase === 'thanks') {
    return (
      <View style={styles.acknowledgement}>
        <Text accessible accessibilityLiveRegion="polite" variant="body">Thanks — that helps.</Text>
      </View>
    );
  }

  if (phase === 'reasons') {
    return (
      <VStack space="sm">
        <Heading variant="sm">What made it feel that way?</Heading>
        <VStack space="xs">
          {props.prompt.reasons.map((reason) => (
            <Button
              key={reason.code}
              variant={selectedReason === reason.code ? 'secondary' : 'outline'}
              size="sm"
              fullWidth
              accessibilityState={{ selected: selectedReason === reason.code }}
              onPress={() => {
                if (selectedReason) return;
                setSelectedReason(reason.code);
                props.onReason(reason.code);
              }}
            >
              {reason.label}
            </Button>
          ))}
        </VStack>
        <HStack space="sm" justifyContent="flex-end">
          <Button variant="ghost" size="sm" onPress={props.onComplete}>Skip</Button>
          <Button size="sm" disabled={!selectedReason} onPress={props.onComplete}>Done</Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack space="sm">
      <HStack alignItems="flex-start" space="sm">
        <Heading variant="sm" style={styles.question}>{props.prompt.question}</Heading>
        <Button variant="ghost" size="xs" onPress={props.onDismiss}>Close</Button>
      </HStack>
      <VStack space="xs">
        {props.prompt.choices.map((choice) => (
          <Button
            key={choice.value}
            variant="outline"
            size="sm"
            fullWidth
            accessibilityLabel={choice.accessibilityLabel}
            onPress={() => {
              props.onSubmit(choice.value);
              setPhase(choice.value <= 3 ? 'reasons' : 'thanks');
            }}
          >
            {choice.label}
          </Button>
        ))}
      </VStack>
    </VStack>
  );
}

const styles = StyleSheet.create({
  question: { flex: 1 },
  acknowledgement: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.fieldFill,
  },
});
