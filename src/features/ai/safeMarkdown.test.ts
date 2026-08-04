import { MarkdownIt } from 'react-native-markdown-display';
import {
  MARKDOWN_TRUNCATION_MARKER,
  MAX_MARKDOWN_INPUT_LENGTH,
  createSafeMarkdownParser,
  isSafeMarkdownLink,
  prepareMarkdownForRender,
} from './safeMarkdown';

describe('prepareMarkdownForRender', () => {
  it('removes unsafe control characters while preserving tabs and newlines', () => {
    expect(prepareMarkdownForRender('Hello\u0000\u0008\tKwilt\nWorld\u001f')).toBe(
      'Hello\tKwilt\nWorld'
    );
  });

  it('bounds hostile Markdown inputs deterministically with a visible marker', () => {
    const hostileInputs = [
      '*'.repeat(MAX_MARKDOWN_INPUT_LENGTH * 4),
      '['.repeat(MAX_MARKDOWN_INPUT_LENGTH * 4),
      '[label](https://example.com/'.repeat(MAX_MARKDOWN_INPUT_LENGTH),
      'mailto:'.repeat(MAX_MARKDOWN_INPUT_LENGTH),
      `"'`.repeat(MAX_MARKDOWN_INPUT_LENGTH * 2),
    ];

    for (const input of hostileInputs) {
      const first = prepareMarkdownForRender(input);
      const second = prepareMarkdownForRender(input);

      expect(first).toBe(second);
      expect(first).toHaveLength(MAX_MARKDOWN_INPUT_LENGTH + MARKDOWN_TRUNCATION_MARKER.length);
      expect(first.endsWith(MARKDOWN_TRUNCATION_MARKER)).toBe(true);
    }
  });

  it('preprocesses input in bounded time even when the source is much larger than the render limit', () => {
    const oversizedInput = 'mailto:'.repeat(1_000_000);
    const startedAt = performance.now();

    prepareMarkdownForRender(oversizedInput);

    expect(performance.now() - startedAt).toBeLessThan(100);
  });
});

describe('createSafeMarkdownParser', () => {
  it('disables HTML, automatic links, and typographic quote rewriting', () => {
    const parser = createSafeMarkdownParser();
    const tokens = parser.parse('<script>alert(1)</script> https://example.com "quoted"', {});
    const inlineChildren = tokens.flatMap((token) => token.children ?? []);

    expect(parser.options).toMatchObject({
      html: false,
      linkify: false,
      typographer: false,
    });
    expect(tokens.some((token) => token.type === 'html_block')).toBe(false);
    expect(inlineChildren.some((token) => token.type === 'html_inline')).toBe(false);
    expect(inlineChildren.some((token) => token.type === 'link_open')).toBe(false);
    expect(inlineChildren.find((token) => token.type === 'text')?.content).toContain('"quoted"');
  });

  it('keeps the assistant syntax Kwilt uses while disabling images and tables', () => {
    const parser = createSafeMarkdownParser();
    const source = [
      '# Heading',
      '',
      '- **Bold** and *emphasis* with `code` and [a link](https://example.com)',
      '',
      '![remote image](https://example.com/image.png)',
      '',
      '| a | b |',
      '| - | - |',
      '| c | d |',
    ].join('\n');
    const tokens = parser.parse(source, {});
    const tokenTypes = tokens.flatMap((token) => [token.type, ...(token.children ?? []).map((child) => child.type)]);

    expect(tokenTypes).toEqual(expect.arrayContaining([
      'heading_open',
      'bullet_list_open',
      'strong_open',
      'em_open',
      'code_inline',
      'link_open',
    ]));
    expect(tokenTypes).not.toContain('image');
    expect(tokenTypes).not.toContain('table_open');
  });

  it('parses every bounded hostile class without an unbounded slowdown', () => {
    const parser = createSafeMarkdownParser();
    const hostileInput = prepareMarkdownForRender(
      `${'*'.repeat(50_000)}${'['.repeat(50_000)}${'mailto:'.repeat(50_000)}${`"'`.repeat(50_000)}`
    );
    const startedAt = performance.now();

    parser.parse(hostileInput, {});

    expect(performance.now() - startedAt).toBeLessThan(250);
  });

  it('is backed by the renderer package MarkdownIt export', () => {
    expect(createSafeMarkdownParser()).toBeInstanceOf(MarkdownIt);
  });
});

describe('isSafeMarkdownLink', () => {
  it.each([
    'https://kwilt.app/help',
    'http://localhost:8081/path',
  ])('allows an explicit web URL: %s', (url) => {
    expect(isSafeMarkdownLink(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'mailto:person@example.com',
    'kwilt://goals/123',
    '//example.com/path',
    ' https://example.com',
    'https://example.com/line\nbreak',
  ])('blocks a non-web or malformed URL: %s', (url) => {
    expect(isSafeMarkdownLink(url)).toBe(false);
  });
});
