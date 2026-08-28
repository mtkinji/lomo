import { EXTERNAL_MCP_CONTROL_COVERAGE } from '../supabase/functions/_shared/externalMcp';
import { UI_PARITY_SURFACES } from '../src/capabilities/uiParityInventory';
import { CHAT_CAPABILITY_COVERAGE } from '../src/features/unifiedChat/chatCapabilityCoverage';
import { VOICE_CONFORMANCE_OPERATION_IDS } from '../src/features/liveConversation/voiceOperationConformance';
import {
  buildConversationalParity,
  validateConversationalParity,
} from '../src/features/unifiedChat/conversationalParity';

const rows = buildConversationalParity({
  surfaces: UI_PARITY_SURFACES,
  coverage: CHAT_CAPABILITY_COVERAGE,
  externalCoverage: EXTERNAL_MCP_CONTROL_COVERAGE,
  voiceConformanceOperationIds: VOICE_CONFORMANCE_OPERATION_IDS,
});
const errors = validateConversationalParity({ surfaces: UI_PARITY_SURFACES, rows });

process.stdout.write(JSON.stringify({ rows, errors }));
