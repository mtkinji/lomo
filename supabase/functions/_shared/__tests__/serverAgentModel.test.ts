import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
import { validateKwiltAiRequestShape } from '../aiRequestValidation';
import {
  requestServerAgentModel,
  serverResponsesToolCatalogHash,
  toServerResponsesTools,
} from '../serverAgentModel';

test('keeps the compatibility entrypoint on strict Responses tools', () => {
  const projected = toServerResponsesTools(SERVER_AGENT_TOOL_CATALOG);
  expect(projected).toHaveLength(SERVER_AGENT_TOOL_CATALOG.length);
  expect(projected.every((tool) => tool.strict === true && tool.name.includes('.'))).toBe(true);
  expect(serverResponsesToolCatalogHash(SERVER_AGENT_TOOL_CATALOG)).toMatch(/^fnv1a:[0-9a-f]{8}$/);
  expect(requestServerAgentModel).toEqual(expect.any(Function));
});

test('catalog hashing is deterministic and sensitive to contract changes', () => {
  const first = SERVER_AGENT_TOOL_CATALOG[0];
  expect(serverResponsesToolCatalogHash(SERVER_AGENT_TOOL_CATALOG))
    .toBe(serverResponsesToolCatalogHash([...SERVER_AGENT_TOOL_CATALOG]));
  expect(serverResponsesToolCatalogHash([{ ...first, version: first.version + 1 }]))
    .not.toBe(serverResponsesToolCatalogHash([first]));
});

test('the proxy accepts the complete current server catalog', () => {
  expect(validateKwiltAiRequestShape('/v1/responses', {
    store: false,
    max_output_tokens: 1_200,
    parallel_tool_calls: false,
    input: [{ role: 'user', content: 'What needs my attention?' }],
    tools: toServerResponsesTools(SERVER_AGENT_TOOL_CATALOG),
    policy_context: { currentDate: '2026-08-26', timeZone: 'America/Denver' },
  }, 'unified_chat_agent')).toEqual({ ok: true });
});
