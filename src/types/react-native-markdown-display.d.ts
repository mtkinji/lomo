declare module 'react-native-markdown-display' {
  import type { ComponentType } from 'react';
  import type { StyleProp, TextProps, TextStyle, ViewStyle } from 'react-native';

  export interface MarkdownStyles {
    body?: StyleProp<TextStyle>;
    heading1?: StyleProp<TextStyle>;
    heading2?: StyleProp<TextStyle>;
    heading3?: StyleProp<TextStyle>;
    heading4?: StyleProp<TextStyle>;
    heading5?: StyleProp<TextStyle>;
    heading6?: StyleProp<TextStyle>;
    strong?: StyleProp<TextStyle>;
    em?: StyleProp<TextStyle>;
    paragraph?: StyleProp<TextStyle>;
    bullet_list?: StyleProp<ViewStyle>;
    ordered_list?: StyleProp<ViewStyle>;
    list_item?: StyleProp<ViewStyle>;
    code_inline?: StyleProp<TextStyle>;
    code_block?: StyleProp<TextStyle>;
    blockquote?: StyleProp<TextStyle>;
    link?: StyleProp<TextStyle>;
  }

  export interface MarkdownProps extends TextProps {
    children: string;
    style?: MarkdownStyles;
    markdownit?: MarkdownItInstance;
    onLinkPress?: (url: string) => boolean | void;
  }

  export interface MarkdownToken {
    type: string;
    content: string;
    children?: MarkdownToken[] | null;
  }

  export interface MarkdownItInstance {
    options: Record<string, unknown>;
    disable(rules: string | string[]): MarkdownItInstance;
    parse(source: string, environment: Record<string, unknown>): MarkdownToken[];
  }

  export interface MarkdownItConstructor {
    (options?: Record<string, unknown>): MarkdownItInstance;
    new (options?: Record<string, unknown>): MarkdownItInstance;
  }

  export const MarkdownIt: MarkdownItConstructor;

  const Markdown: ComponentType<MarkdownProps>;

  export default Markdown;
}

