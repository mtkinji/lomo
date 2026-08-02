import { AGENT_JUDGMENT_RESPONSE_FORMAT } from './agentJudgment';
import { requestAgentJudgment } from './requestAgentJudgment';

const allowedToolIds = new Set(['activities.capture']);
const judgment = {
  schemaVersion: 1,
  userJob: 'Remember to call the dentist',
  desiredOutcome: 'A call Activity exists',
  requestClass: 'capability_action',
  participatingCapabilities: ['todos'],
  usePrivateContext: false,
  informationNeed: 'stable',
  executionMode: 'single_tool',
  constraints: [{ kind: 'title', sourceText: 'Call the dentist', normalizedValue: 'Call the dentist' }],
  steps: [{ sequence: 1, objective: 'Capture the call', toolId: 'activities.capture', dependsOn: null }],
  clarificationQuestion: null,
  confidence: 0.96,
  reason: 'One Activity capture is sufficient.',
};

function responseWith(value: unknown) {
  return {
    output: [{ type: 'message', content: [{ type: 'output_text', text: typeof value === 'string' ? value : JSON.stringify(value) }] }],
  };
}

describe('requestAgentJudgment', () => {
  it('requests ephemeral low-reasoning strict output and parses it', async () => {
    const requestResponse = jest.fn(async () => responseWith(judgment));
    await expect(requestAgentJudgment({
      prompt: 'Bounded judgment prompt',
      allowedToolIds,
    }, { requestResponse })).resolves.toEqual(judgment);

    expect(requestResponse).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-5.6-luna',
      store: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 800,
      input: [{ role: 'user', content: 'Bounded judgment prompt' }],
      text: { format: AGENT_JUDGMENT_RESPONSE_FORMAT },
    }), undefined);
  });

  it.each([
    ['missing output', {}],
    ['refused output', { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] }] }],
    ['invalid JSON', responseWith('{broken')],
    ['invalid tool id', responseWith({
      ...judgment,
      steps: [{ ...judgment.steps[0], toolId: 'unknown.tool' }],
    })],
  ])('returns null for %s', async (_name, response) => {
    await expect(requestAgentJudgment({ prompt: 'Prompt', allowedToolIds }, {
      requestResponse: async () => response,
    })).resolves.toBeNull();
  });

  it.each([
    ['HTTP 429', new Error('HTTP 429')],
    ['HTTP 500', new Error('HTTP 500')],
    ['timeout', Object.assign(new Error('timed out'), { name: 'AbortError' })],
  ])('returns null for recoverable %s failures', async (_name, error) => {
    await expect(requestAgentJudgment({ prompt: 'Prompt', allowedToolIds }, {
      requestResponse: async () => { throw error; },
    })).resolves.toBeNull();
  });

  it('rethrows an explicit caller abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = Object.assign(new Error('aborted'), { name: 'AbortError' });
    await expect(requestAgentJudgment({ prompt: 'Prompt', allowedToolIds, signal: controller.signal }, {
      requestResponse: async () => { throw error; },
    })).rejects.toBe(error);
  });
});
