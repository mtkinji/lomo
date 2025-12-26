import React from 'react';
import type { ButtonSizeToken } from './buttonTokens';

export type ButtonContextValue = {
  size: ButtonSizeToken;
};

/**
 * Internal context used so `ButtonLabel` can inherit size from its parent `Button`.
 * This keeps typography + control sizing in sync without requiring every callsite
 * to pass a duplicate size prop.
 */
export const ButtonContext = React.createContext<ButtonContextValue | null>(null);


