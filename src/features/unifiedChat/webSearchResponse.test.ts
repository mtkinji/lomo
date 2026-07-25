import {
  buildCurrentInformationRequest,
  parseCurrentInformationResponse,
} from './webSearchResponse';

describe('current-information web search contract', () => {
  test('requests hosted web search without private Kwilt context', () => {
    expect(buildCurrentInformationRequest({
      model: 'gpt-5.2',
      systemPrompt: 'Be useful and honest.',
      messages: [{ role: 'user', content: 'What is the weather in Lehi tomorrow?' }],
    })).toEqual({
      model: 'gpt-5.2',
      instructions: 'Be useful and honest.',
      input: [{ role: 'user', content: 'What is the weather in Lehi tomorrow?' }],
      tools: [{ type: 'web_search' }],
      tool_choice: 'auto',
      max_output_tokens: 1200,
    });
  });

  test('turns provider annotations into compact inspectable citations', () => {
    const parsed = parseCurrentInformationResponse({
      output: [{
        type: 'message',
        content: [{
          type: 'output_text',
          text: 'Lehi should be cool with a chance of rain.',
          annotations: [
            { type: 'url_citation', start_index: 0, end_index: 44, title: 'Lehi forecast', url: 'https://weather.example/lehi' },
            { type: 'url_citation', start_index: 0, end_index: 44, title: 'Local outlook', url: 'https://forecast.example/lehi' },
          ],
        }],
      }],
    });

    expect(parsed).toEqual({
      text: 'Lehi should be cool with a chance of rain. [1][2]',
      sources: [
        { number: 1, title: 'Lehi forecast', url: 'https://weather.example/lehi' },
        { number: 2, title: 'Local outlook', url: 'https://forecast.example/lehi' },
      ],
      visibleBody: 'Lehi should be cool with a chance of rain. [1][2]\n\nSources: [1] [Lehi forecast](https://weather.example/lehi) · [2] [Local outlook](https://forecast.example/lehi)',
    });
  });

  test('rejects citation-free, malformed, and non-HTTPS freshness claims', () => {
    expect(parseCurrentInformationResponse({ output_text: 'It will rain tomorrow.' })).toBeNull();
    expect(parseCurrentInformationResponse({
      output: [{ type: 'message', content: [{
        type: 'output_text', text: 'It will rain tomorrow.',
        annotations: [{ type: 'url_citation', start_index: 0, end_index: 22, title: 'Unsafe', url: 'http://example.com' }],
      }] }],
    })).toBeNull();
  });
});
