import { parseRuntimeToolCalls, toOpenAiRuntimeTools } from '../../../../src/services/aiRuntimeToolTransport';
import { SERVER_AGENT_TOOL_CATALOG } from '../serverAgentCatalog';
import {
  parseServerAgentModelStep,
  toServerOpenAiTools,
} from '../serverAgentModel';

test('keeps deployed OpenAI tool projection aligned with the mobile transport', () => {
  expect(toServerOpenAiTools(SERVER_AGENT_TOOL_CATALOG)).toEqual(
    toOpenAiRuntimeTools(SERVER_AGENT_TOOL_CATALOG),
  );
});

test('keeps deployed tool-call parsing aligned with mobile and rejects malformed arguments', () => {
  const rawCalls = [{
    id: 'call-1', type: 'function',
    function: { name: 'goals__read', arguments: '{}' },
  }];
  const server = parseServerAgentModelStep({ choices: [{ message: { content: null, tool_calls: rawCalls } }] }, SERVER_AGENT_TOOL_CATALOG);
  expect(server.toolCalls).toEqual(parseRuntimeToolCalls(rawCalls, SERVER_AGENT_TOOL_CATALOG));
  expect(() => parseServerAgentModelStep({
    choices: [{ message: { content: null, tool_calls: [{ ...rawCalls[0], function: { ...rawCalls[0].function, arguments: '{' } }] } }],
  }, SERVER_AGENT_TOOL_CATALOG)).toThrow('model_tool_arguments_malformed');
});
