import {
  KWILT_CAPABILITY_MANIFEST,
  projectAgentToolCatalog,
} from '@kwilt/agent-runtime';
import { MOBILE_TOOL_IMPLEMENTATIONS } from './mobileToolImplementations';

export const UNIFIED_CHAT_TOOL_CATALOG = projectAgentToolCatalog(
  KWILT_CAPABILITY_MANIFEST,
  { runtime: 'mobile', implementations: MOBILE_TOOL_IMPLEMENTATIONS },
);
