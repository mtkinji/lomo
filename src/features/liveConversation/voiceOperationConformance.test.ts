import { KWILT_CAPABILITY_MANIFEST } from '@kwilt/agent-runtime';
import { CHAT_CAPABILITY_COVERAGE } from '../unifiedChat/chatCapabilityCoverage';
import { buildFinalizedConversationRunMessage } from '../unifiedChat/finalizedConversationTurn';
import { parseAgentWorkbenchSurfaceMessage } from '../unifiedChat/workbenchProtocol';
import {
  VOICE_CONFORMANCE_OPERATION_IDS,
  VOICE_OPERATION_CONFORMANCE,
} from './voiceOperationConformance';

test('every in-scope UI operation uses the shared durable voice runtime exactly once', () => {
  const expected = CHAT_CAPABILITY_COVERAGE
    .filter((operation) => operation.channels.mobile.state !== 'excluded')
    .map((operation) => operation.id).sort();
  expect([...VOICE_CONFORMANCE_OPERATION_IDS].sort()).toEqual(expected);
  expect(new Set(VOICE_CONFORMANCE_OPERATION_IDS).size).toBe(VOICE_CONFORMANCE_OPERATION_IDS.length);
});

test.each(VOICE_OPERATION_CONFORMANCE)('$operationId preserves canonical tools, confirmation, and result authority', (
  conformance,
) => {
  const canonical = KWILT_CAPABILITY_MANIFEST.find((operation) => operation.id === conformance.operationId)!;
  expect(conformance.toolIds).toEqual(canonical.tools.map((tool) => tool.id).sort());
  expect(conformance.confirmation).toBe(canonical.confirmation);
  expect(conformance.completionMode).toBe(canonical.completionMode);
  expect(conformance.inputPath).toBe('provider_final_transcript_to_shared_run_send');
  expect(conformance.resultPath).toBe('durable_run_terminal_state');
  expect(conformance.voiceApproval).toBe(canonical.confirmation === 'native'
    ? 'native_review_required'
    : canonical.confirmation === 'explicit' ? 'single_explicit_proposal_only' : 'not_applicable');
});

test('a finalized spoken utterance becomes the same run.send command consumed by typed Chat', () => {
  const message = buildFinalizedConversationRunMessage({
    itemId: 'voice-item-1', transcript: 'Move the dentist appointment to Friday.',
  });
  expect(parseAgentWorkbenchSurfaceMessage(message.payload)).toEqual({
    protocolVersion: 2,
    type: 'surface.command',
    requestId: 'voice:voice-item-1',
    command: { type: 'run.send', prompt: 'Move the dentist appointment to Friday.' },
  });
});
