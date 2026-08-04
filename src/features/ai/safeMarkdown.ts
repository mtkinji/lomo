import { MarkdownIt, type MarkdownItInstance } from 'react-native-markdown-display';

export const MAX_MARKDOWN_INPUT_LENGTH = 20_000;
export const MARKDOWN_TRUNCATION_MARKER = '\n\n… Message shortened for safe display.';

const UNSAFE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const EXPLICIT_WEB_URL = /^https?:\/\/[^\s]+$/i;

export function prepareMarkdownForRender(source: string): string {
  const isTruncated = source.length > MAX_MARKDOWN_INPUT_LENGTH;
  const boundedSource = isTruncated ? source.slice(0, MAX_MARKDOWN_INPUT_LENGTH) : source;
  const sanitizedSource = boundedSource.replace(UNSAFE_CONTROL_CHARACTERS, '');

  return isTruncated
    ? `${sanitizedSource}${MARKDOWN_TRUNCATION_MARKER}`
    : sanitizedSource;
}

export function createSafeMarkdownParser(): MarkdownItInstance {
  return MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
  }).disable(['image', 'table', 'strikethrough']);
}

export function isSafeMarkdownLink(url: string): boolean {
  if (!EXPLICIT_WEB_URL.test(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
