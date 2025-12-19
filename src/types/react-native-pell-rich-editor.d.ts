declare module 'react-native-pell-rich-editor' {
  import * as React from 'react';
  import type { ViewStyle } from 'react-native';

  export const actions: {
    setBold: string;
    setItalic: string;
    setUnderline: string;
    insertOrderedList: string;
    insertBulletsList: string;
    insertLink: string;
    undo: string;
    redo: string;
  };

  export class RichEditor extends React.Component<{
    initialContentHTML?: string;
    placeholder?: string;
    initialFocus?: boolean;
    editorInitializedCallback?: () => void;
    useContainer?: boolean;
    initialHeight?: number | string;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    hideKeyboardAccessoryView?: boolean;
    autoCorrect?: boolean;
    style?: ViewStyle | ViewStyle[];
    editorStyle?: any;
    onChange?: (html: string) => void;
  }> {
    focusContentEditor?: () => void;
    setContentHTML?: (html: string) => void;
    insertLink?: (title: string, url: string) => void;
    sendAction?: (type: string, action: string, data?: any, options?: any) => void;
  }

  export class RichToolbar extends React.Component<{
    editor?: any;
    actions?: string[];
    style?: ViewStyle | ViewStyle[];
    iconTint?: string;
    selectedIconTint?: string;
    disabledIconTint?: string;
    iconMap?: Record<string, any>;
  }> {}
}


